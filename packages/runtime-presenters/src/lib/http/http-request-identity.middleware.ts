import { tenantName, type TenantId, type TenantReference } from '@accounterbro/core';
import { DefaultActorFactory, type Actor, type ActorType } from '@event-driven-platform/actor';
import { Injectable, type NestMiddleware, UnauthorizedException } from '@nestjs/common';

import { HTTP_REQUEST_IDENTITY_HEADERS } from './http-request-identity.headers.js';

interface MutableHttpIdentityRequest {
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    readonly rawHeaders?: readonly string[];
    actor?: Actor;
    tenant?: TenantReference;
}

interface RequestIdentity {
    readonly actor: Actor;
    readonly tenant: TenantReference;
}

const actorFactory = new DefaultActorFactory();
const unauthorizedIdentityMessage = 'Missing or invalid trusted request identity.';

function countRawHeaderOccurrences(rawHeaders: readonly string[], name: string): number {
    let count = 0;

    for (let index = 0; index < rawHeaders.length; index += 2) {
        if (rawHeaders[index]?.toLowerCase() === name) {
            count += 1;
        }
    }

    return count;
}

function readRequiredIdentityHeader(request: MutableHttpIdentityRequest, name: string): string {
    if (
        request.rawHeaders !== undefined &&
        countRawHeaderOccurrences(request.rawHeaders, name) !== 1
    ) {
        throw new UnauthorizedException(unauthorizedIdentityMessage);
    }

    const value = request.headers[name];

    if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
        throw new UnauthorizedException(unauthorizedIdentityMessage);
    }

    return value;
}

function readRequestIdentity(request: MutableHttpIdentityRequest): RequestIdentity {
    try {
        const actor = actorFactory.create({
            type: readRequiredIdentityHeader(
                request,
                HTTP_REQUEST_IDENTITY_HEADERS.actorType,
            ) as ActorType,
            id: readRequiredIdentityHeader(request, HTTP_REQUEST_IDENTITY_HEADERS.actorId),
        });
        const tenantId = readRequiredIdentityHeader(
            request,
            HTTP_REQUEST_IDENTITY_HEADERS.tenantId,
        );
        const tenant = Object.freeze({
            type: tenantName,
            id: tenantId as TenantId,
        }) satisfies TenantReference;

        return {
            actor,
            tenant,
        };
    } catch (error) {
        if (error instanceof UnauthorizedException) {
            throw error;
        }

        throw new UnauthorizedException(unauthorizedIdentityMessage);
    }
}

@Injectable()
export class HttpRequestIdentityMiddleware implements NestMiddleware {
    public use(
        request: MutableHttpIdentityRequest,
        _response: unknown,
        next: () => void,
    ): void {
        const identity = readRequestIdentity(request);

        request.actor = identity.actor;
        request.tenant = identity.tenant;

        next();
    }
}
