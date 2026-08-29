import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import axios from 'axios';

interface RegisterDocumentResponse {
    readonly id: string;
    readonly status: string;
    readonly duplicate: boolean;
}

interface GetDocumentResponse {
    readonly id: string;
    readonly status: string;
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
        const response = await axios.get(`/documents/${randomUUID()}`, {
            headers: trustedIdentityHeaders,
        });

        expect(response.status).toBe(200);
        expect(response.data).toEqual({ kind: 'not-found' });
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
            axios.get(`/documents/${createdByTenantA.data.id}`, {
                headers: tenantBHeaders,
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
        expect(hiddenFromTenantB.status).toBe(200);
        expect(hiddenFromTenantB.data).toEqual({ kind: 'not-found' });
    });
});
