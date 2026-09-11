import {
    tenantName,
    type DocumentId,
    type DocumentProcessingId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';
import {
    DocumentExtractionError,
    type DocumentExtractor,
} from '@accounterbro/document-extraction';
import {
    documentProcessingOperationNames,
    documentProcessingReadNames,
    DocumentProcessingStatus,
    type GetDocumentProcessingResult,
} from '@accounterbro/document-processing';
import type { ObjectStorage } from '@accounterbro/object-storage';
import type { Reader, Runner } from '@accounterbro/runtime-executions';
import { ExecutionFailureError } from '@event-driven-platform/execution';
import type { Actor } from '@event-driven-platform/actor';

import type { ProcessDocumentUseCaseContext } from './process-document.use-case.context';
import { ProcessDocumentUseCase } from './process-document.use-case';

jest.mock('@event-driven-platform/intent', () => ({
    IntentFactory: {
        derive: jest.fn(() => ({
            id: 'child-intent-id',
            key: 'child-intent-key',
        })),
    },
}));

jest.mock('@event-driven-platform/execution', () => ({
    ExecutionFailureError: class ExecutionFailureError extends Error {
        public constructor(
            public readonly executionFailure: {
                readonly code: string;
                readonly message: string;
                readonly retryable: boolean;
            },
        ) {
            super(executionFailure.message);
            this.name = 'ExecutionFailureError';
        }
    },
}));

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
} satisfies ProcessDocumentUseCaseContext;

function createRunner(execute: (command: unknown) => Promise<unknown>): Runner {
    return {
        execute: execute as Runner['execute'],
        executeDetailed: jest.fn() as Runner['executeDetailed'],
    };
}

function createReader(execute: (query: unknown) => Promise<unknown>): Reader {
    return {
        execute: execute as Reader['execute'],
    };
}

function createObjectStorage(
    get: (request: { readonly reference: string }) => Promise<{ readonly content: Uint8Array }>,
): ObjectStorage {
    return {
        get: get as ObjectStorage['get'],
        put: jest.fn() as ObjectStorage['put'],
    };
}

function createDocumentExtractor(
    extract: (content: Uint8Array) => Promise<{ readonly text: string }>,
): DocumentExtractor {
    return {
        extract: extract as DocumentExtractor['extract'],
    };
}

describe('ProcessDocumentUseCase', () => {
    const documentId = 'document-1' as DocumentId;
    const processingId = 'processing-1' as DocumentProcessingId;
    const storageReference = 'opaque/source/reference';
    const content = new Uint8Array([1, 2, 3]);
    const pending = {
        id: processingId,
        documentId,
        status: DocumentProcessingStatus.Pending,
    } satisfies GetDocumentProcessingResult;

    function createUseCase(options?: {
        readonly runnerExecute?: jest.Mock;
        readonly readerExecute?: jest.Mock;
        readonly storageGet?: jest.Mock;
        readonly extract?: jest.Mock;
    }) {
        const runnerExecute = options?.runnerExecute ?? jest.fn();
        const readerExecute = options?.readerExecute ?? jest.fn();
        const storageGet = options?.storageGet ?? jest.fn();
        const extract = options?.extract ?? jest.fn();

        return {
            useCase: new ProcessDocumentUseCase(
                createRunner(runnerExecute),
                createReader(readerExecute),
                createObjectStorage(storageGet),
                createDocumentExtractor(extract),
            ),
            runnerExecute,
            readerExecute,
            storageGet,
            extract,
        };
    }

    it('DPROC-PROC-001 processes a new Document and returns COMPLETED extracted text', async () => {
        const completed = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: 'Extracted text',
        } satisfies GetDocumentProcessingResult;
        const runnerExecute = jest
            .fn()
            .mockResolvedValueOnce({
                data: {
                    kind: 'created',
                    processing: pending,
                },
            })
            .mockResolvedValueOnce({
                data: {
                    id: processingId,
                    status: DocumentProcessingStatus.Completed,
                },
            });
        const readerExecute = jest
            .fn()
            .mockResolvedValueOnce(pending)
            .mockResolvedValueOnce(completed);
        const storageGet = jest.fn(async () => ({ content }));
        const extract = jest.fn(async () => ({ text: 'Extracted text' }));
        const { useCase } = createUseCase({
            runnerExecute,
            readerExecute,
            storageGet,
            extract,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).resolves.toEqual(completed);

        expect(readerExecute).toHaveBeenCalledTimes(2);
        expect(storageGet).toHaveBeenCalledWith({ reference: storageReference });
        expect(extract).toHaveBeenCalledWith(content);
        expect(runnerExecute).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                operation: expect.objectContaining({
                    name: documentProcessingOperationNames.prepareProcessing,
                    actor,
                    tenant,
                    payload: expect.objectContaining({ documentId }),
                }),
                context: { correlationId: context.correlationId },
            }),
        );
        expect(runnerExecute).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                operation: expect.objectContaining({
                    name: documentProcessingOperationNames.finishProcessing,
                    actor,
                    tenant,
                    payload: {
                        outcome: 'completed',
                        extractedText: 'Extracted text',
                    },
                }),
                context: { correlationId: context.correlationId },
            }),
        );
    });

    it.each([
        ['unsupported-content', 'Unsupported document content.'],
        ['extraction-failed', 'Document extraction failed.'],
    ] as const)(
        'DPROC-PROC-002 records %s as terminal FAILED processing',
        async (code, failureReason) => {
            const failed = {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Failed,
                failureReason,
            } satisfies GetDocumentProcessingResult;
            const runnerExecute = jest
                .fn()
                .mockResolvedValueOnce({
                    data: {
                        kind: 'created',
                        processing: pending,
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        id: processingId,
                        status: DocumentProcessingStatus.Failed,
                    },
                });
            const readerExecute = jest
                .fn()
                .mockResolvedValueOnce(pending)
                .mockResolvedValueOnce(failed);
            const storageGet = jest.fn(async () => ({ content }));
            const extract = jest.fn(async () => {
                throw new DocumentExtractionError(code, failureReason);
            });
            const { useCase } = createUseCase({
                runnerExecute,
                readerExecute,
                storageGet,
                extract,
            });

            await expect(
                useCase.execute({ documentId, storageReference }, context),
            ).resolves.toEqual(failed);

            expect(readerExecute).toHaveBeenCalledTimes(2);
            expect(runnerExecute).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({
                    operation: expect.objectContaining({
                        name: documentProcessingOperationNames.finishProcessing,
                        actor,
                        tenant,
                        payload: {
                            outcome: 'failed',
                            failureReason,
                        },
                    }),
                }),
            );
        },
    );

    it('propagates ObjectStorage failures without recording a terminal outcome', async () => {
        const storageFailure = new Error('storage unavailable');
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'created',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => pending);
        const storageGet = jest.fn(async () => {
            throw storageFailure;
        });
        const { useCase, extract } = createUseCase({
            runnerExecute,
            readerExecute,
            storageGet,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).rejects.toBe(storageFailure);

        expect(readerExecute).toHaveBeenCalledTimes(1);
        expect(runnerExecute).toHaveBeenCalledTimes(1);
        expect(extract).not.toHaveBeenCalled();
    });

    it('propagates unknown extractor failures without recording a terminal outcome', async () => {
        const extractionFailure = new Error('unexpected extractor failure');
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'created',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => pending);
        const storageGet = jest.fn(async () => ({ content }));
        const extract = jest.fn(async () => {
            throw extractionFailure;
        });
        const { useCase } = createUseCase({
            runnerExecute,
            readerExecute,
            storageGet,
            extract,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).rejects.toBe(extractionFailure);

        expect(readerExecute).toHaveBeenCalledTimes(1);
        expect(runnerExecute).toHaveBeenCalledTimes(1);
    });

    it('DPROC-PROC-003 re-reads and returns existing COMPLETED processing without reprocessing', async () => {
        const completed = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Completed,
            extractedText: 'Stored text',
        } satisfies GetDocumentProcessingResult;
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'existing',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => completed);
        const { useCase, storageGet, extract } = createUseCase({
            runnerExecute,
            readerExecute,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).resolves.toEqual(completed);

        expect(readerExecute).toHaveBeenCalledWith({
            read: {
                name: documentProcessingReadNames.getDocumentProcessing,
                actor,
                tenant,
                parameters: { documentId },
            },
            context: { correlationId: context.correlationId },
        });
        expect(runnerExecute).toHaveBeenCalledTimes(1);
        expect(storageGet).not.toHaveBeenCalled();
        expect(extract).not.toHaveBeenCalled();
    });

    it('DPROC-PROC-004 re-reads and returns existing FAILED processing without retrying extraction', async () => {
        const failed = {
            id: processingId,
            documentId,
            status: DocumentProcessingStatus.Failed,
            failureReason: 'Stored failure',
        } satisfies GetDocumentProcessingResult;
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'existing',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => failed);
        const { useCase, storageGet, extract } = createUseCase({
            runnerExecute,
            readerExecute,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).resolves.toEqual(failed);

        expect(runnerExecute).toHaveBeenCalledTimes(1);
        expect(storageGet).not.toHaveBeenCalled();
        expect(extract).not.toHaveBeenCalled();
    });

    it.each([
        [
            'COMPLETED',
            {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Completed,
                extractedText: 'Durable text',
            } satisfies GetDocumentProcessingResult,
        ],
        [
            'FAILED',
            {
                id: processingId,
                documentId,
                status: DocumentProcessingStatus.Failed,
                failureReason: 'Durable failure',
            } satisfies GetDocumentProcessingResult,
        ],
    ] as const)(
        'returns durable %s state after a replayed created Prepare without reprocessing',
        async (_status, terminal) => {
            const runnerExecute = jest.fn().mockResolvedValueOnce({
                data: {
                    kind: 'created',
                    processing: pending,
                },
            });
            const readerExecute = jest.fn(async () => terminal);
            const { useCase, storageGet, extract } = createUseCase({
                runnerExecute,
                readerExecute,
            });

            await expect(
                useCase.execute({ documentId, storageReference }, context),
            ).resolves.toEqual(terminal);

            expect(readerExecute).toHaveBeenCalledTimes(1);
            expect(runnerExecute).toHaveBeenCalledTimes(1);
            expect(storageGet).not.toHaveBeenCalled();
            expect(extract).not.toHaveBeenCalled();
        },
    );

    it('DPROC-PROC-005 reports existing current PENDING processing as retryable in-progress failure', async () => {
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'existing',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => pending);
        const { useCase, storageGet, extract } = createUseCase({
            runnerExecute,
            readerExecute,
        });

        const execution = useCase.execute({ documentId, storageReference }, context);

        await expect(execution).rejects.toBeInstanceOf(ExecutionFailureError);
        await expect(execution).rejects.toMatchObject({
            executionFailure: {
                code: 'document-processing-in-progress',
                retryable: true,
            },
        });
        expect(readerExecute).toHaveBeenCalledTimes(1);
        expect(runnerExecute).toHaveBeenCalledTimes(1);
        expect(storageGet).not.toHaveBeenCalled();
        expect(extract).not.toHaveBeenCalled();
    });

    it('fails an inconsistent processing read without starting extraction', async () => {
        const runnerExecute = jest.fn().mockResolvedValueOnce({
            data: {
                kind: 'existing',
                processing: pending,
            },
        });
        const readerExecute = jest.fn(async () => null);
        const { useCase, storageGet, extract } = createUseCase({
            runnerExecute,
            readerExecute,
        });

        await expect(
            useCase.execute({ documentId, storageReference }, context),
        ).rejects.toThrow('Document Processing could not be read in the current tenant.');

        expect(runnerExecute).toHaveBeenCalledTimes(1);
        expect(storageGet).not.toHaveBeenCalled();
        expect(extract).not.toHaveBeenCalled();
    });
});
