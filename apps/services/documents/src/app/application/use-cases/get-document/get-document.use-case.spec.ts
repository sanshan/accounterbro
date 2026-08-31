import {
    tenantName,
    type DocumentId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';
import { DocumentRegistrationStatus, type GetDocumentResult } from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import type { Reader } from '@event-driven-platform/reader';

import type { GetDocumentUseCaseContext } from './get-document.use-case.context';
import { GetDocumentUseCase } from './get-document.use-case';

const actor = {
    type: 'user',
    id: 'user-1',
    origin: {},
} satisfies Actor;

const tenant = {
    type: tenantName,
    id: 'tenant-1' as TenantId,
} satisfies TenantReference;

const context = {
    intent: {
        id: 'parent-intent-id',
        key: 'parent-intent-key',
    },
    correlationId: 'correlation-1',
    actor,
    tenant,
} satisfies GetDocumentUseCaseContext;

type GetDocumentExecute = (query: unknown) => Promise<GetDocumentResult | null>;

function createReader(execute: GetDocumentExecute): Reader {
    return {
        execute: execute as Reader['execute'],
    };
}

describe('GetDocumentUseCase', () => {
    it('DOC-GET-001 returns the current Document state', async () => {
        const documentId = 'document-1' as DocumentId;
        const execute = jest.fn(async () => ({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        }));
        const useCase = new GetDocumentUseCase(createReader(execute));

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        });
    });

    it('DOC-GET-002 returns not-found for an unknown Document', async () => {
        const documentId = 'missing-document' as DocumentId;
        const execute = jest.fn(async () => null);
        const useCase = new GetDocumentUseCase(createReader(execute));

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual({
            kind: 'not-found',
        });
    });

    it('does not map a read failure to DOC-GET-002 not-found', async () => {
        const failure = new Error('reader failed');
        const execute = jest.fn(async () => {
            throw failure;
        });
        const useCase = new GetDocumentUseCase(createReader(execute));

        await expect(
            useCase.execute({ documentId: 'document-1' as DocumentId }, context),
        ).rejects.toBe(failure);
    });
});
