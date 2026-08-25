import { createHash, randomUUID } from 'node:crypto';

import {
    documentName,
    type DocumentId,
    type DocumentReference,
} from '@accounterbro/core';
import {
    documentOperationNames,
    type DocumentRegistrationStatus,
    type FinishDocumentRegistrationOperation,
    type FinishDocumentRegistrationPayload,
    type PrepareDocumentRegistrationOperation,
} from '@accounterbro/documents';
import type { ObjectStorage } from '@accounterbro/object-storage';
import { IntentFactory } from '@event-driven-platform/intent';
import type { Runner } from '@event-driven-platform/runner';
import type { UseCase } from '@event-driven-platform/use-case';
import { Injectable } from '@nestjs/common';

import type { RegisterDocumentUseCaseContext } from './register-document.use-case.context';

const prepareRegistrationIntentSlot = 'prepare-registration';
const finishRegistrationIntentSlot = 'finish-registration';

export interface RegisterDocumentInput {
    readonly file: Uint8Array;
}

export interface RegisterDocumentResult {
    readonly id: DocumentId;
    readonly status: DocumentRegistrationStatus;
    readonly duplicate: boolean;
}

function storageFailureReason(error: unknown): string {
    return error instanceof Error && error.message.length > 0
        ? error.message
        : 'Object storage failed.';
}

@Injectable()
export class RegisterDocumentUseCase
    implements UseCase<RegisterDocumentInput, RegisterDocumentResult, RegisterDocumentUseCaseContext>
{
    public constructor(
        private readonly runner: Runner,
        private readonly objectStorage: ObjectStorage,
    ) {}

    public async execute(
        input: RegisterDocumentInput,
        context: RegisterDocumentUseCaseContext,
    ): Promise<RegisterDocumentResult> {
        const documentId = randomUUID() as DocumentId;
        const candidateReference = {
            type: documentName,
            id: documentId,
        } satisfies DocumentReference;

        const prepareOperation: PrepareDocumentRegistrationOperation = {
            name: documentOperationNames.prepareRegistration,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: prepareRegistrationIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: candidateReference,
            aggregate: candidateReference,
            payload: {
                documentId,
                contentHash: createHash('sha256').update(input.file).digest('hex'),
            },
        };

        const prepareResult = await this.runner.execute({
            operation: prepareOperation,
            context: {
                correlationId: context.correlationId,
            },
        });

        if (prepareResult.data.kind === 'duplicate') {
            return {
                id: prepareResult.data.document.id,
                status: prepareResult.data.document.status,
                duplicate: true,
            };
        }

        const preparedDocument = prepareResult.data.document;
        const documentReference = {
            type: documentName,
            id: preparedDocument.id,
        } satisfies DocumentReference;

        let finishPayload: FinishDocumentRegistrationPayload;

        try {
            const stored = await this.objectStorage.put({
                key: `documents/${context.tenant.id}/${preparedDocument.id}/original`,
                content: input.file,
            });

            finishPayload = {
                outcome: 'registered',
                storageReference: stored.reference,
            };
        } catch (error: unknown) {
            finishPayload = {
                outcome: 'failed',
                failureReason: storageFailureReason(error),
            };
        }

        const finishOperation: FinishDocumentRegistrationOperation = {
            name: documentOperationNames.finishRegistration,
            schemaVersion: 1,
            intent: IntentFactory.derive({
                parent: { id: context.intent.id },
                slot: finishRegistrationIntentSlot,
            }),
            actor: context.actor,
            tenant: context.tenant,
            subject: documentReference,
            aggregate: documentReference,
            payload: finishPayload,
        };

        const finishResult = await this.runner.execute({
            operation: finishOperation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return {
            id: finishResult.data.id,
            status: finishResult.data.status,
            duplicate: false,
        };
    }
}
