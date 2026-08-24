import { createHash, randomUUID } from 'node:crypto';

import {
    documentName,
    type DocumentId,
    type DocumentReference,
    type TenantReference,
} from '@accounterbro/core';
import {
    documentOperationNames,
    type DocumentRegistrationStatus,
    type PrepareDocumentRegistrationOperation,
} from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import { DefaultIntentFactory, type IntentFactory } from '@event-driven-platform/intent';
import type { Runner } from '@event-driven-platform/runner';
import type { UseCase, UseCaseContext } from '@event-driven-platform/use-case';

const prepareRegistrationIntentSlot = 'prepare-registration';

export interface RegisterDocumentInput {
    readonly file: Uint8Array;
}

export interface RegisterDocumentResult {
    readonly id: DocumentId;
    readonly status: DocumentRegistrationStatus;
    readonly duplicate: boolean;
}

export class RegisterDocumentUseCase implements UseCase<RegisterDocumentInput, RegisterDocumentResult> {
    public constructor(
        private readonly runner: Runner,
        private readonly actor: Actor,
        private readonly tenant: TenantReference,
        private readonly intentFactory: IntentFactory = new DefaultIntentFactory(),
    ) {}

    public async execute(
        input: RegisterDocumentInput,
        context: UseCaseContext,
    ): Promise<RegisterDocumentResult> {
        const documentId = randomUUID() as DocumentId;
        const documentReference = {
            type: documentName,
            id: documentId,
        } satisfies DocumentReference;

        const operation = {
            name: documentOperationNames.prepareRegistration,
            schemaVersion: 1,
            intent: this.intentFactory.derive({
                parent: { id: context.intent.id },
                slot: prepareRegistrationIntentSlot,
            }),
            actor: this.actor,
            tenant: this.tenant,
            subject: documentReference,
            aggregate: documentReference,
            payload: {
                documentId,
                contentHash: createHash('sha256').update(input.file).digest('hex'),
            },
        } satisfies PrepareDocumentRegistrationOperation;

        const result = await this.runner.execute({
            operation,
            context: {
                correlationId: context.correlationId,
            },
        });

        return {
            id: result.data.document.id,
            status: result.data.document.status,
            duplicate: result.data.kind === 'duplicate',
        };
    }
}
