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
});
