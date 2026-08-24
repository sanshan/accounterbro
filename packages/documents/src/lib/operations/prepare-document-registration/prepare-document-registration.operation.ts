import type { DocumentId, DocumentReference, TenantReference } from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';

import type { DocumentRegistrationStatus } from '../../document/document-registration-status.js';
import type { documentOperationNames } from '../names.js';

export interface PrepareDocumentRegistrationPayload {
    readonly documentId: DocumentId;
    readonly contentHash: string;
}

export interface PrepareDocumentRegistrationOutcome {
    readonly kind: 'created' | 'duplicate';
    readonly document: {
        readonly id: DocumentId;
        readonly status: DocumentRegistrationStatus;
    };
}

export type PrepareDocumentRegistrationOperation = Operation<
    typeof documentOperationNames.prepareRegistration,
    1,
    TenantReference,
    DocumentReference,
    PrepareDocumentRegistrationPayload,
    SuccessfulOperationResult<PrepareDocumentRegistrationOutcome>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
