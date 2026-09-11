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
    type FinishDocumentProcessingOutcome,
    type FinishDocumentProcessingPayload,
    type GetDocumentProcessingRead,
    type GetDocumentProcessingResult,
    type PrepareDocumentProcessingOperation,
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
        const processingId = randomUUID() as DocumentProcessingId;
        const candidateReference = {
            type: documentProcessingName,
            id: processingId,
        } satisfies DocumentProcessingReference;

        const prepareOperation: PrepareDocumentProcessingOperation = {
            name: documentProcessingOperationNames.prepareProcessing,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: prepareProcessingIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: candidateReference,
            aggregate: candidateReference,
            payload: {
                processingId,
                documentId: input.documentId,
            },
        };

        const prepareResult = await this.runner.execute({
            operation: prepareOperation,
            context: {
                correlationId: context.correlationId,
            },
        });

        const current = await this.readProcessing(input.documentId, context);

        if (current.status !== DocumentProcessingStatus.Pending) {
            return current;
        }

        if (prepareResult.data.kind === 'existing') {
            throw new ExecutionFailureError({
                code: 'document-processing-in-progress',
                message: 'Document processing is already in progress.',
                retryable: true,
            });
        }

        const processingReference = {
            type: documentProcessingName,
            id: prepareResult.data.processing.id,
        } satisfies DocumentProcessingReference;

        const stored = await this.objectStorage.get({
            reference: input.storageReference,
        });

        let extractedText: string;

        try {
            const extraction = await this.documentExtractor.extract(stored.content);
            extractedText = extraction.text;
        } catch (error: unknown) {
            if (!(error instanceof DocumentExtractionError)) {
                throw error;
            }

            const failureReason = error.message.length > 0 ? error.message : error.code;
            await this.finishProcessing(
                processingReference,
                {
                    outcome: 'failed',
                    failureReason,
                },
                context,
            );

            return this.readProcessing(input.documentId, context);
        }

        await this.finishProcessing(
            processingReference,
            {
                outcome: 'completed',
                extractedText,
            },
            context,
        );

        return this.readProcessing(input.documentId, context);
    }

    private async readProcessing(
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

    private async finishProcessing(
        processing: DocumentProcessingReference,
        payload: FinishDocumentProcessingPayload,
        context: ProcessDocumentUseCaseContext,
    ): Promise<FinishDocumentProcessingOutcome> {
        const operation: FinishDocumentProcessingOperation = {
            name: documentProcessingOperationNames.finishProcessing,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: finishProcessingIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: processing,
            aggregate: processing,
            payload,
        };

        const result = await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result.data;
    }
}
