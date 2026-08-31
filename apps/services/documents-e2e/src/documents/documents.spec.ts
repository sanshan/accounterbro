import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import axios, { type AxiosResponse } from 'axios';

interface RegisterDocumentResponse {
    readonly id: string;
    readonly status: string;
    readonly duplicate: boolean;
}

interface GetDocumentResponse {
    readonly id: string;
    readonly status: string;
}

interface ProblemDetailsResponse {
    readonly type: string;
    readonly title: string;
    readonly status: number;
    readonly code: string;
    readonly traceId?: string;
}

const trustedIdentityHeaders = {
    'x-accounterbro-actor-type': 'user',
    'x-accounterbro-actor-id': 'documents-e2e-user',
    'x-accounterbro-tenant-id': 'documents-e2e-tenant',
} as const;

function identityHeadersFor(tenantId: string) {
    return {
        ...trustedIdentityHeaders,
        'x-accounterbro-tenant-id': tenantId,
    } as const;
}

const fixturePath = join(__dirname, '../fixtures/document.txt');

async function createFixtureForm(): Promise<FormData> {
    const fixture = await readFile(fixturePath);
    const form = new FormData();

    form.append('file', new Blob([fixture]), 'document.txt');

    return form;
}

function expectProblemDetails(
    response: AxiosResponse<ProblemDetailsResponse>,
    expected: Omit<ProblemDetailsResponse, 'traceId'>,
): void {
    expect(response.status).toBe(expected.status);
    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.data).toMatchObject(expected);
    if (response.data.traceId !== undefined) {
        expect(response.data.traceId).toEqual(expect.any(String));
    }
    expect(response.data).not.toHaveProperty('stack');
    expect(response.data).not.toHaveProperty('cause');
}

describe('Documents HTTP', () => {
    it('covers DOC-REG-001, DOC-REG-002, successful DOC-REG-004, and DOC-GET-001', async () => {
        const created = await axios.post<RegisterDocumentResponse>(
            '/documents',
            await createFixtureForm(),
            { headers: trustedIdentityHeaders },
        );

        expect(created.data).toEqual({
            id: expect.any(String),
            status: 'REGISTERED',
            duplicate: false,
        });

        const duplicate = await axios.post<RegisterDocumentResponse>(
            '/documents',
            await createFixtureForm(),
            { headers: trustedIdentityHeaders },
        );

        expect(duplicate.data).toEqual({
            id: created.data.id,
            status: 'REGISTERED',
            duplicate: true,
        });

        const found = await axios.get<GetDocumentResponse>(`/documents/${created.data.id}`, {
            headers: trustedIdentityHeaders,
        });

        expect(found.data).toEqual({
            id: created.data.id,
            status: 'REGISTERED',
        });
    });

    it('covers DOC-GET-002 for an unknown valid Document id', async () => {
        const response = await axios.get<ProblemDetailsResponse>(`/documents/${randomUUID()}`, {
            headers: trustedIdentityHeaders,
            validateStatus: () => true,
        });

        expectProblemDetails(response, {
            type: 'urn:accounterbro:problem:not-found',
            title: 'Not Found',
            status: 404,
            code: 'not-found',
        });
    });

    it('maps Nest UUID binding failures to the shared Problem Details contract', async () => {
        const response = await axios.get<ProblemDetailsResponse>('/documents/not-a-uuid', {
            headers: trustedIdentityHeaders,
            validateStatus: () => true,
        });

        expectProblemDetails(response, {
            type: 'urn:accounterbro:problem:invalid-request',
            title: 'Invalid Request',
            status: 400,
            code: 'invalid-request',
        });
    });

    it('maps missing file upload failures to the shared Problem Details contract', async () => {
        const form = new FormData();
        form.append('note', 'missing file');

        const response = await axios.post<ProblemDetailsResponse>('/documents', form, {
            headers: trustedIdentityHeaders,
            validateStatus: () => true,
        });

        expectProblemDetails(response, {
            type: 'urn:accounterbro:problem:invalid-request',
            title: 'Invalid Request',
            status: 400,
            code: 'invalid-request',
        });
    });

    it('covers DOC-REG-005 and DOC-GET-003 across two tenants', async () => {
        const tenantAHeaders = identityHeadersFor('documents-e2e-tenant-a');
        const tenantBHeaders = identityHeadersFor('documents-e2e-tenant-b');

        const createdByTenantA = await axios.post<RegisterDocumentResponse>(
            '/documents',
            await createFixtureForm(),
            { headers: tenantAHeaders },
        );
        const createdByTenantB = await axios.post<RegisterDocumentResponse>(
            '/documents',
            await createFixtureForm(),
            { headers: tenantBHeaders },
        );

        expect(createdByTenantA.data).toEqual({
            id: expect.any(String),
            status: 'REGISTERED',
            duplicate: false,
        });
        expect(createdByTenantB.data).toEqual({
            id: expect.any(String),
            status: 'REGISTERED',
            duplicate: false,
        });
        expect(createdByTenantB.data.id).not.toBe(createdByTenantA.data.id);

        const [foundByTenantA, foundByTenantB, hiddenFromTenantB] = await Promise.all([
            axios.get<GetDocumentResponse>(`/documents/${createdByTenantA.data.id}`, {
                headers: tenantAHeaders,
            }),
            axios.get<GetDocumentResponse>(`/documents/${createdByTenantB.data.id}`, {
                headers: tenantBHeaders,
            }),
            axios.get<ProblemDetailsResponse>(`/documents/${createdByTenantA.data.id}`, {
                headers: tenantBHeaders,
                validateStatus: () => true,
            }),
        ]);

        expect(foundByTenantA.data).toEqual({
            id: createdByTenantA.data.id,
            status: 'REGISTERED',
        });
        expect(foundByTenantB.data).toEqual({
            id: createdByTenantB.data.id,
            status: 'REGISTERED',
        });
        expectProblemDetails(hiddenFromTenantB, {
            type: 'urn:accounterbro:problem:not-found',
            title: 'Not Found',
            status: 404,
            code: 'not-found',
        });
    });
});
