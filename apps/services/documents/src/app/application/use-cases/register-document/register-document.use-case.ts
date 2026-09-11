import { createHash, randomUUID } from 'node:crypto';

import {
    documentName,
    type DocumentId,
    type DocumentReference,
} from '@accounterbro/core';
import {
    documentOperationNames,
    type DocumentRegistrationStatus,
    type FinishDocumentRegistrationOperation,
    type FinishDocumentRegistrationOutcome,
    type FinishDocumentRegistrationPayload,
    type PrepareDocumentRegistrationOperation,
    type PrepareDocumentRegistrationOutcome,
} from '@accounterbro/documents';
import { ObjectStorage } from '@accounterbro/object-storage';
import { Runner } from '@accounterbro/runtime-executions';
import { IntentFactory } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';
import { Injectable } from '@nestjs/common';

import type { RegisterDocumentUseCaseContext } from './register-document.use-case.context';

const prepareRegistrationIntentSlot = 'prepare-registration';
const finishRegistrationIntentSlot = 'finish-registration';

export interface RegisterDocumentInput {
    readonly file: Uint8Array;
}

export interface RegisterDocumentResult {
    readonly id: DocumentId;
    readonly status: DocumentRegistrationStatus;
    readonly duplicate: boolean;
}

function storageFailureReason(error: unknown): string {
    return error instanceof Error && error.message.length > 0
        ? error.message
        : 'Object storage failed.';
}

@Injectable()
export class RegisterDocumentUseCase
    implements UseCase<RegisterDocumentInput, RegisterDocumentResult, RegisterDocumentUseCaseContext>
{
    public readonly name = `${documentName}.register`;

    public constructor(
        private readonly runner: Runner,
        private readonly objectStorage: ObjectStorage,
    ) {}

    public async execute(
        input: RegisterDocumentInput,
        context: RegisterDocumentUseCaseContext,
    ): Promise<RegisterDocumentResult> {
        const preparation = await this.prepareRegistration(input.file, context);

        if (preparation.kind === 'duplicate') {
            return {
                id: preparation.document.id,
                status: preparation.document.status,
                duplicate: true,
            };
        }

        const storageOutcome = await this.storeDocument(
            preparation.document.id,
            input.file,
            context,
        );
        const registration = await this.finishRegistration(
            preparation.document.id,
            storageOutcome,
            context,
        );

        return {
            id: registration.id,
            status: registration.status,
            duplicate: false,
        };
    }

    private async prepareRegistration(
        file: Uint8Array,
        context: RegisterDocumentUseCaseContext,
    ): Promise<PrepareDocumentRegistrationOutcome> {
        const documentId = randomUUID() as DocumentId;
        const documentReference = {
            type: documentName,
            id: documentId,
        } satisfies DocumentReference;
        const operation: PrepareDocumentRegistrationOperation = {
            name: documentOperationNames.prepareRegistration,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: prepareRegistrationIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: documentReference,
            aggregate: documentReference,
            payload: {
                documentId,
                contentHash: createHash('sha256').update(file).digest('hex'),
            },
        };

        const result = await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result.data;
    }

    private async storeDocument(
        documentId: DocumentId,
        file: Uint8Array,
        context: RegisterDocumentUseCaseContext,
    ): Promise<FinishDocumentRegistrationPayload> {
        try {
            const stored = await this.objectStorage.put({
                key: `documents/${context.tenant.id}/${documentId}/original`,
                content: file,
            });

            return {
                outcome: 'registered',
                storageReference: stored.reference,
            };
        } catch (error: unknown) {
            return {
                outcome: 'failed',
                failureReason: storageFailureReason(error),
            };
        }
    }

    private async finishRegistration(
        documentId: DocumentId,
        payload: FinishDocumentRegistrationPayload,
        context: RegisterDocumentUseCaseContext,
    ): Promise<FinishDocumentRegistrationOutcome> {
        const documentReference = {
            type: documentName,
            id: documentId,
        } satisfies DocumentReference;
        const operation: FinishDocumentRegistrationOperation = {
            name: documentOperationNames.finishRegistration,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: finishRegistrationIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: documentReference,
            aggregate: documentReference,
            payload,
        };

        const result = await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result.data;
    }
}
