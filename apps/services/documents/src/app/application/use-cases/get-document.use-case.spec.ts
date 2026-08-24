import type { DocumentId } from '@accounterbro/core';
import { DocumentRegistrationStatus, documentReadNames } from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import type { Reader } from '@event-driven-platform/reader';
import type { UseCaseContext } from '@event-driven-platform/use-case';

import { GetDocumentUseCase } from './get-document.use-case';

const actor = {
    type: 'user',
    id: 'user-1',
    origin: {},
} satisfies Actor;

const context = {
    intent: {
        id: 'parent-intent-id',
        key: 'parent-intent-key',
    },
    correlationId: 'correlation-1',
} satisfies UseCaseContext;

function createReader(execute: Reader['execute']): Reader {
    return { execute };
}

describe('GetDocumentUseCase', () => {
    it('DOC-GET-001 returns the current public Document state through Reader', async () => {
        const documentId = 'document-1' as DocumentId;
        const execute = jest.fn(async () => ({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        }));
        const useCase = new GetDocumentUseCase(createReader(execute), actor);

        const result = await useCase.execute({ documentId }, context);

        expect(result).toEqual({
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
        });
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({
            read: {
                name: documentReadNames.getDocument,
                actor,
                parameters: {
                    documentId,
                },
            },
            context: {
                correlationId: context.correlationId,
            },
        });
    });

    it('DOC-GET-002 maps a successful null Read result to not-found', async () => {
        const documentId = 'missing-document' as DocumentId;
        const execute: Reader['execute'] = async () => null;
        const useCase = new GetDocumentUseCase(createReader(execute), actor);

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual({
            kind: 'not-found',
        });
    });

    it('propagates Reader failures instead of treating them as not-found', async () => {
        const failure = new Error('reader failed');
        const execute: Reader['execute'] = async () => {
            throw failure;
        };
        const useCase = new GetDocumentUseCase(createReader(execute), actor);

        await expect(
            useCase.execute({ documentId: 'document-1' as DocumentId }, context),
        ).rejects.toBe(failure);
    });
});
