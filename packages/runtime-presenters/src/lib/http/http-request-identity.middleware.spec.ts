import { tenantName } from '@accounterbro/core';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HTTP_REQUEST_IDENTITY_HEADERS } from './http-request-identity.headers.js';
import { HttpRequestIdentityMiddleware } from './http-request-identity.middleware.js';

function createRequest() {
    const headers: Record<string, string | string[] | undefined> = {
        [HTTP_REQUEST_IDENTITY_HEADERS.actorType]: 'user',
        [HTTP_REQUEST_IDENTITY_HEADERS.actorId]: 'user-1',
        [HTTP_REQUEST_IDENTITY_HEADERS.tenantId]: 'tenant-1',
    };
    const rawHeaders = Object.entries(headers).flatMap(([name, value]) => [
        name,
        value as string,
    ]);

    return {
        headers,
        rawHeaders,
        actor: undefined,
        tenant: undefined,
    };
}

describe('HttpRequestIdentityMiddleware', () => {
    it('establishes typed actor and tenant identity before continuing', () => {
        const request = createRequest();
        const next = vi.fn();

        new HttpRequestIdentityMiddleware().use(request, {}, next);

        expect(request.actor).toEqual({
            type: 'user',
            id: 'user-1',
            origin: {},
        });
        expect(request.tenant).toEqual({
            type: tenantName,
            id: 'tenant-1',
        });
        expect(next).toHaveBeenCalledOnce();
    });

    it.each(Object.values(HTTP_REQUEST_IDENTITY_HEADERS))(
        'rejects a request missing %s',
        (headerName) => {
            const request = createRequest();
            delete request.headers[headerName];
            request.rawHeaders = request.rawHeaders.filter(
                (_value, index, rawHeaders) =>
                    index % 2 !== 0 || rawHeaders[index] !== headerName,
            );
            const next = vi.fn();

            expect(() => new HttpRequestIdentityMiddleware().use(request, {}, next)).toThrow(
                UnauthorizedException,
            );
            expect(next).not.toHaveBeenCalled();
        },
    );

    it('rejects an actor type outside the published EDP actor contract', () => {
        const request = createRequest();
        request.headers[HTTP_REQUEST_IDENTITY_HEADERS.actorType] = 'robot';
        const next = vi.fn();

        expect(() => new HttpRequestIdentityMiddleware().use(request, {}, next)).toThrow(
            UnauthorizedException,
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects blank or padded identity values', () => {
        const request = createRequest();
        request.headers[HTTP_REQUEST_IDENTITY_HEADERS.tenantId] = ' tenant-1 ';
        const next = vi.fn();

        expect(() => new HttpRequestIdentityMiddleware().use(request, {}, next)).toThrow(
            UnauthorizedException,
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects repeated trusted identity headers', () => {
        const request = createRequest();
        request.rawHeaders.push(
            HTTP_REQUEST_IDENTITY_HEADERS.actorId,
            'user-2',
        );
        const next = vi.fn();

        expect(() => new HttpRequestIdentityMiddleware().use(request, {}, next)).toThrow(
            UnauthorizedException,
        );
        expect(next).not.toHaveBeenCalled();
    });
});
