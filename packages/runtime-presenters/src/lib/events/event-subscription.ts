import { tenantName, type TenantId, type TenantReference } from '@accounterbro/core';
import type {
    EventHandler,
    EventHandlerOutcome,
    EventIdentity,
    EventValidationFailure,
} from '@accounterbro/runtime-messaging';
import {
    DefaultActorFactory,
    type Actor,
    type ActorOrigin,
    type ActorType,
} from '@event-driven-platform/actor';
import type { AnyEventEnvelope, EventActor } from '@event-driven-platform/event';
import { IntentFactory } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';
import type { UseCaseExecutor } from '@event-driven-platform/use-case-executor';
import { ZodError } from 'zod';

import type { EventSubscriptionContext } from './event-subscription-context.js';

export interface EventContractLike<TEvent = unknown> {
    readonly name: string;
    readonly schemaVersion: number;
    parse(value: unknown): TEvent;
}

export type ParsedEvent<TContract extends EventContractLike> = ReturnType<TContract['parse']>;

type EventSubscriptionUseCase<TInput, TResult> = Omit<
    UseCase<TInput, TResult, EventSubscriptionContext>,
    'execute'
> & {
    readonly execute: (
        input: TInput,
        context: EventSubscriptionContext,
    ) => Promise<TResult>;
};

export type CreateSubscriptionArgument<
    TContract extends EventContractLike,
    TInput,
    TResult,
> = {
    readonly contract: TContract;
    readonly useCase: EventSubscriptionUseCase<TInput, TResult>;
    readonly intentSlot: string;
    readonly mapInput: (event: ParsedEvent<TContract>) => NoInfer<TInput>;
};

export interface EventSubscription {
    readonly identity: EventIdentity;
    readonly intentSlot: string;
    createHandler(executor: UseCaseExecutor): EventHandler;
}

const actorFactory = new DefaultActorFactory();

function createValidationFailure(
    path: readonly string[],
    message: string,
): EventValidationFailure {
    return {
        kind: 'event-validation',
        issues: [{ path, message }],
    };
}

function createZodValidationFailure(
    error: ZodError,
    prefix: readonly string[],
): EventValidationFailure {
    return {
        kind: 'event-validation',
        issues: error.issues.map((issue) => ({
            path: [...prefix, ...issue.path.map(String)],
            message: issue.message,
        })),
    };
}

function invalid(failure: EventValidationFailure): EventHandlerOutcome {
    return {
        status: 'invalid',
        failure,
    };
}

function isActorType(value: string): value is ActorType {
    return value === 'user' || value === 'service' || value === 'system' || value === 'scheduler';
}

function adaptActorOrigin(origin: EventActor['origin']): ActorOrigin {
    return {
        ...(origin.ipAddress === null ? {} : { ipAddress: origin.ipAddress }),
        ...(origin.countryCode === null ? {} : { countryCode: origin.countryCode }),
        ...(origin.region === null ? {} : { region: origin.region }),
        ...(origin.city === null ? {} : { city: origin.city }),
        ...(origin.latitude === null ? {} : { latitude: origin.latitude }),
        ...(origin.longitude === null ? {} : { longitude: origin.longitude }),
        ...(origin.timezone === null ? {} : { timezone: origin.timezone }),
        ...(origin.environment === null ? {} : { environment: origin.environment }),
        ...(origin.host === null ? {} : { host: origin.host }),
        ...(origin.instance === null ? {} : { instance: origin.instance }),
    };
}

type ActorAdaptation =
    | {
          readonly status: 'valid';
          readonly value: Actor;
      }
    | {
          readonly status: 'invalid';
          readonly failure: EventValidationFailure;
      };

function adaptActor(actor: EventActor): ActorAdaptation {
    if (!isActorType(actor.type)) {
        return {
            status: 'invalid',
            failure: createValidationFailure(
                ['actor', 'type'],
                'Expected an application Actor type.',
            ),
        };
    }

    try {
        return {
            status: 'valid',
            value: actorFactory.create({
                type: actor.type,
                id: actor.id,
                origin: adaptActorOrigin(actor.origin),
            }),
        };
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                status: 'invalid',
                failure: createZodValidationFailure(error, ['actor']),
            };
        }

        throw error;
    }
}

type TenantAdaptation =
    | {
          readonly status: 'valid';
          readonly value: TenantReference;
      }
    | {
          readonly status: 'invalid';
          readonly failure: EventValidationFailure;
      };

function adaptTenant(tenant: AnyEventEnvelope['tenant']): TenantAdaptation {
    if (tenant.type !== tenantName) {
        return {
            status: 'invalid',
            failure: createValidationFailure(
                ['tenant', 'type'],
                `Expected tenant type "${tenantName}".`,
            ),
        };
    }

    if (tenant.id.length === 0 || tenant.id !== tenant.id.trim()) {
        return {
            status: 'invalid',
            failure: createValidationFailure(
                ['tenant', 'id'],
                'Expected a non-empty tenant id without surrounding whitespace.',
            ),
        };
    }

    return {
        status: 'valid',
        value: Object.freeze({
            type: tenantName,
            id: tenant.id as TenantId,
        }) satisfies TenantReference,
    };
}

function createSubscriptionHandler<TEvent, TInput, TResult>(options: {
    readonly identity: EventIdentity;
    readonly intentSlot: string;
    readonly contract: EventContractLike<TEvent>;
    readonly useCase: EventSubscriptionUseCase<TInput, TResult>;
    readonly mapInput: (event: TEvent) => TInput;
    readonly executor: UseCaseExecutor;
}): EventHandler {
    return {
        identity: options.identity,
        async handle(envelope) {
            let event: TEvent;

            try {
                event = options.contract.parse({
                    name: envelope.eventName,
                    schemaVersion: envelope.schemaVersion,
                    payload: envelope.payload,
                });
            } catch (error) {
                if (error instanceof ZodError) {
                    return invalid(createZodValidationFailure(error, ['payload']));
                }

                throw error;
            }

            const actor = adaptActor(envelope.actor);
            if (actor.status === 'invalid') {
                return invalid(actor.failure);
            }

            const tenant = adaptTenant(envelope.tenant);
            if (tenant.status === 'invalid') {
                return invalid(tenant.failure);
            }

            const intent = IntentFactory.derive({
                parent: { id: envelope.intentId },
                slot: options.intentSlot,
                discriminator: envelope.eventId,
            });
            const input = options.mapInput(event);
            const context = Object.freeze({
                intent,
                correlationId: envelope.correlationId,
                actor: actor.value,
                tenant: tenant.value,
            }) satisfies EventSubscriptionContext;

            const result = await options.executor.execute({
                useCase: options.useCase,
                input,
                context,
            });

            return {
                status: 'handled' as const,
                result,
            };
        },
    };
}

export function createSubscription<
    TContract extends EventContractLike,
    TInput,
    TResult,
>(
    options: CreateSubscriptionArgument<TContract, TInput, TResult>,
): EventSubscription {
    const identity = Object.freeze({
        eventName: options.contract.name,
        schemaVersion: options.contract.schemaVersion,
    }) satisfies EventIdentity;

    return Object.freeze({
        identity,
        intentSlot: options.intentSlot,
        createHandler: (executor: UseCaseExecutor) =>
            createSubscriptionHandler({
                identity,
                intentSlot: options.intentSlot,
                contract: options.contract,
                useCase: options.useCase,
                mapInput: options.mapInput,
                executor,
            }),
    });
}

function assertUniqueIntentSlots(subscriptions: readonly EventSubscription[]): void {
    const slots = new Set<string>();

    for (const subscription of subscriptions) {
        if (slots.has(subscription.intentSlot)) {
            throw new Error(`Duplicate event subscription intent slot "${subscription.intentSlot}".`);
        }

        slots.add(subscription.intentSlot);
    }
}

export function createEventHandlers(
    subscriptions: readonly EventSubscription[],
    executor: UseCaseExecutor,
): readonly EventHandler[] {
    assertUniqueIntentSlots(subscriptions);

    return subscriptions.map((subscription) => subscription.createHandler(executor));
}
