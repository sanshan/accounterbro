import { randomUUID } from 'node:crypto';

import {
    documentProcessingName,
    type DocumentId,
    type DocumentProcessingId,
    type DocumentProcessingReference,
} from '@accounterbro/core';
import {
    DocumentExtractionError,
    DocumentExtractor,
} from '@accounterbro/document-extraction';
import {
    documentProcessingOperationNames,
    documentProcessingReadNames,
    DocumentProcessingStatus,
    type FinishDocumentProcessingOperation,
    type FinishDocumentProcessingPayload,
    type GetDocumentProcessingRead,
    type GetDocumentProcessingResult,
    type PrepareDocumentProcessingOperation,
    type PrepareDocumentProcessingOutcome,
} from '@accounterbro/document-processing';
import { ObjectStorage } from '@accounterbro/object-storage';
import { Reader, Runner } from '@accounterbro/runtime-executions';
import { ExecutionFailureError } from '@event-driven-platform/execution';
import { IntentFactory } from '@event-driven-platform/intent';
import type { UseCase } from '@event-driven-platform/use-case';
import { Injectable } from '@nestjs/common';

import type { ProcessDocumentUseCaseContext } from './process-document.use-case.context';

const prepareProcessingIntentSlot = 'prepare-processing';
const finishProcessingIntentSlot = 'finish-processing';

export interface ProcessDocumentUseCaseInput {
    readonly documentId: DocumentId;
    readonly storageReference: string;
}

export type ProcessDocumentUseCaseResult = GetDocumentProcessingResult;

function isTerminalProcessing(processing: GetDocumentProcessingResult): boolean {
    return processing.status !== DocumentProcessingStatus.Pending;
}

function documentProcessingInProgress(): ExecutionFailureError {
    return new ExecutionFailureError({
        code: 'document-processing-in-progress',
        message: 'Document processing is already in progress.',
        retryable: true,
    });
}

@Injectable()
export class ProcessDocumentUseCase
    implements
        UseCase<
            ProcessDocumentUseCaseInput,
            ProcessDocumentUseCaseResult,
            ProcessDocumentUseCaseContext
        >
{
    public readonly name = `${documentProcessingName}.process`;

    public constructor(
        private readonly runner: Runner,
        private readonly reader: Reader,
        private readonly objectStorage: ObjectStorage,
        private readonly documentExtractor: DocumentExtractor,
    ) {}

    public async execute(
        input: ProcessDocumentUseCaseInput,
        context: ProcessDocumentUseCaseContext,
    ): Promise<ProcessDocumentUseCaseResult> {
        const preparation = await this.prepareProcessing(input.documentId, context);
        const current = await this.getProcessing(input.documentId, context);

        if (isTerminalProcessing(current)) {
            return current;
        }

        if (preparation.kind === 'existing') {
            throw documentProcessingInProgress();
        }

        const outcome = await this.extractDocument(input.storageReference);

        await this.finishProcessing(preparation.processing.id, outcome, context);

        return this.getProcessing(input.documentId, context);
    }

    private async prepareProcessing(
        documentId: DocumentId,
        context: ProcessDocumentUseCaseContext,
    ): Promise<PrepareDocumentProcessingOutcome> {
        const processingId = randomUUID() as DocumentProcessingId;
        const processingReference = {
            type: documentProcessingName,
            id: processingId,
        } satisfies DocumentProcessingReference;

        const operation: PrepareDocumentProcessingOperation = {
            name: documentProcessingOperationNames.prepareProcessing,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: prepareProcessingIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: processingReference,
            aggregate: processingReference,
            payload: {
                processingId,
                documentId,
            },
        };

        const result = await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result.data;
    }

    private async getProcessing(
        documentId: DocumentId,
        context: ProcessDocumentUseCaseContext,
    ): Promise<GetDocumentProcessingResult> {
        const read: GetDocumentProcessingRead = {
            name: documentProcessingReadNames.getDocumentProcessing,
            actor: context.actor,
            tenant: context.tenant,
            parameters: {
                documentId,
            },
        };

        const current = await this.reader.execute<GetDocumentProcessingRead>({
            read,
            context: {
                correlationId: context.correlationId,
            },
        });

        if (!current) {
            throw new Error('Document Processing could not be read in the current tenant.');
        }

        return current;
    }

    private async extractDocument(
        storageReference: string,
    ): Promise<FinishDocumentProcessingPayload> {
        const stored = await this.objectStorage.get({
            reference: storageReference,
        });

        try {
            const extraction = await this.documentExtractor.extract(stored.content);

            return {
                outcome: 'completed',
                extractedText: extraction.text,
            };
        } catch (error: unknown) {
            if (!(error instanceof DocumentExtractionError)) {
                throw error;
            }

            return {
                outcome: 'failed',
                failureReason: error.message.length > 0 ? error.message : error.code,
            };
        }
    }

    private async finishProcessing(
        processingId: DocumentProcessingId,
        payload: FinishDocumentProcessingPayload,
        context: ProcessDocumentUseCaseContext,
    ): Promise<void> {
        const processingReference = {
            type: documentProcessingName,
            id: processingId,
        } satisfies DocumentProcessingReference;
        const operation: FinishDocumentProcessingOperation = {
            name: documentProcessingOperationNames.finishProcessing,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: finishProcessingIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: processingReference,
            aggregate: processingReference,
            payload,
        };

        await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });
    }
}
