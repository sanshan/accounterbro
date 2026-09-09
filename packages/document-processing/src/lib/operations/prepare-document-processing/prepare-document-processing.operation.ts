import type {
    DocumentId,
    DocumentProcessingId,
    DocumentProcessingReference,
    TenantReference,
} from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';

import type { DocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import type { documentProcessingOperationNames } from '../names.js';

export interface PrepareDocumentProcessingPayload {
    readonly processingId: DocumentProcessingId;
    readonly documentId: DocumentId;
}

interface PrepareDocumentProcessingState {
    readonly id: DocumentProcessingId;
    readonly documentId: DocumentId;
    readonly status: DocumentProcessingStatus;
}

export type PrepareDocumentProcessingOutcome =
    | {
          readonly kind: 'created';
          readonly processing: PrepareDocumentProcessingState;
      }
    | {
          readonly kind: 'existing';
          readonly processing: PrepareDocumentProcessingState;
      };

export type PrepareDocumentProcessingOperation = Operation<
    typeof documentProcessingOperationNames.prepareProcessing,
    1,
    TenantReference,
    DocumentProcessingReference,
    PrepareDocumentProcessingPayload,
    SuccessfulOperationResult<PrepareDocumentProcessingOutcome>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
