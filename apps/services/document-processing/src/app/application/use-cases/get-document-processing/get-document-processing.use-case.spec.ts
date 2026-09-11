import {
    tenantName,
    type DocumentId,
    type DocumentProcessingId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';
import {
    documentProcessingReadNames,
    DocumentProcessingStatus,
    type GetDocumentProcessingResult,
} from '@accounterbro/document-processing';
import type { Reader } from '@accounterbro/runtime-executions';
import type { Actor } from '@event-driven-platform/actor';

import type { GetDocumentProcessingUseCaseContext } from './get-document-processing.use-case.context';
import { GetDocumentProcessingUseCase } from './get-document-processing.use-case';

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
} satisfies GetDocumentProcessingUseCaseContext;

type GetDocumentProcessingExecute = (query: unknown) => Promise<GetDocumentProcessingResult | null>;

function createReader(execute: GetDocumentProcessingExecute): Reader {
    return {
        execute: execute as Reader['execute'],
    };
}

describe('GetDocumentProcessingUseCase', () => {
    const documentId = 'document-1' as DocumentId;
    const processingId = 'processing-1' as DocumentProcessingId;

    it('DPROC-GET-001 returns the current PENDING processing state', async () => {
        const result = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Pending,
        } satisfies GetDocumentProcessingResult;
        const useCase = new GetDocumentProcessingUseCase(createReader(jest.fn(async () => result)));

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual(result);
    });

    it('DPROC-GET-001 returns the current COMPLETED processing state', async () => {
        const result = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: 'Extracted text',
        } satisfies GetDocumentProcessingResult;
        const useCase = new GetDocumentProcessingUseCase(createReader(jest.fn(async () => result)));

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual(result);
    });

    it('DPROC-GET-001 returns the current FAILED processing state', async () => {
        const result = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Failed,
            failureReason: 'Unsupported content',
        } satisfies GetDocumentProcessingResult;
        const useCase = new GetDocumentProcessingUseCase(createReader(jest.fn(async () => result)));

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual(result);
    });

    it('DPROC-GET-002 returns not-found when processing does not exist', async () => {
        const useCase = new GetDocumentProcessingUseCase(
            createReader(jest.fn(async () => null)),
        );

        await expect(useCase.execute({ documentId }, context)).resolves.toEqual({
            kind: 'not-found',
        });
    });

    it('DPROC-GET-003 forwards the tenant through the tenant-aware Read', async () => {
        const result = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Pending,
        } satisfies GetDocumentProcessingResult;
        const execute = jest.fn(async () => result);
        const useCase = new GetDocumentProcessingUseCase(createReader(execute));

        await useCase.execute({ documentId }, context);

        expect(execute).toHaveBeenCalledWith({
            read: {
                name: documentProcessingReadNames.getDocumentProcessing,
                actor,
                tenant,
                parameters: {
                    documentId,
                },
            },
            context: {
                correlationId: context.correlationId,
            },
        });
    });

    it('does not map a Reader failure to DPROC-GET-002 not-found', async () => {
        const failure = new Error('reader failed');
        const useCase = new GetDocumentProcessingUseCase(
            createReader(
                jest.fn(async () => {
                    throw failure;
                }),
            ),
        );

        await expect(useCase.execute({ documentId }, context)).rejects.toBe(failure);
    });
});
