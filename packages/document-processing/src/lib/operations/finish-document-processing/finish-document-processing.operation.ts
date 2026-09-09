import type { DocumentProcessingReference, TenantReference } from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';

import type { FinishedDocumentProcessingStatus } from '../../document-processing/document-processing-status.js';
import type { DocumentProcessingCompletedEvent } from '../../events/document-processing-completed/document-processing-completed.event.js';
import type { documentProcessingOperationNames } from '../names.js';

export type FinishDocumentProcessingPayload =
    | {
          readonly outcome: 'completed';
          readonly extractedText: string;
      }
    | {
          readonly outcome: 'failed';
          readonly failureReason: string;
      };

export interface FinishDocumentProcessingOutcome {
    readonly id: DocumentProcessingReference['id'];
    readonly status: FinishedDocumentProcessingStatus;
}

export type FinishDocumentProcessingOperation = Operation<
    typeof documentProcessingOperationNames.finishProcessing,
    1,
    TenantReference,
    DocumentProcessingReference,
    FinishDocumentProcessingPayload,
    SuccessfulOperationResult<FinishDocumentProcessingOutcome, DocumentProcessingCompletedEvent>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
