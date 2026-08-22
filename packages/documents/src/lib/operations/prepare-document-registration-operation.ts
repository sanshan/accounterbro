import type { Actor } from '@event-driven-platform/actor';
import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';
import type { TenantReference } from '@event-driven-platform/tenant-reference';
import type { Brand } from '@event-driven-platform/types';

import type { DocumentRegistrationStatus } from '../document.js';
import type { DocumentUploadRequested } from '../events/document-upload-requested.js';
import type { PREPARE_DOCUMENT_REGISTRATION_OPERATION } from './document-operation-names.js';

type StringBrand = Brand<string, string>;

export interface PrepareDocumentRegistrationPayload {
    readonly documentId: string;
    readonly contentHash: string;
}

export interface PrepareDocumentRegistrationOutcome {
    readonly kind: 'created' | 'duplicate';
    readonly document: {
        readonly id: string;
        readonly status: DocumentRegistrationStatus;
    };
}

export type PrepareDocumentRegistrationOperation = Operation<
    typeof PREPARE_DOCUMENT_REGISTRATION_OPERATION,
    1,
    TenantReference<string, StringBrand>,
    AggregateReference<'document', StringBrand>,
    PrepareDocumentRegistrationPayload,
    SuccessfulOperationResult<PrepareDocumentRegistrationOutcome, DocumentUploadRequested>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
