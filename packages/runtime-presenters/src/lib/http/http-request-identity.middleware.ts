import { tenantName, type TenantId, type TenantReference } from '@accounterbro/core';
import type { Actor, ActorType } from '@event-driven-platform/actor';
import { UnauthorizedException } from '@nestjs/common';

import { HTTP_REQUEST_IDENTITY_HEADERS } from './http-request-identity.headers.js';

interface MutableHttpIdentityRequest {
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    readonly rawHeaders?: readonly string[];
    actor?: Actor;
    tenant?: TenantReference;
}

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

export function httpRequestIdentityMiddleware(
    request: MutableHttpIdentityRequest,
    _response: unknown,
    next: () => void,
): void {
    request.actor = Object.freeze({
        type: readRequiredIdentityHeader(
            request,
            HTTP_REQUEST_IDENTITY_HEADERS.actorType,
        ) as ActorType,
        id: readRequiredIdentityHeader(request, HTTP_REQUEST_IDENTITY_HEADERS.actorId),
        origin: Object.freeze({}),
    }) satisfies Actor;
    request.tenant = Object.freeze({
        type: tenantName,
        id: readRequiredIdentityHeader(
            request,
            HTTP_REQUEST_IDENTITY_HEADERS.tenantId,
        ) as TenantId,
    }) satisfies TenantReference;

    next();
}
