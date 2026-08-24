import type { DocumentReference, TenantReference } from '@accounterbro/core';
import type { Actor } from '@event-driven-platform/actor';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';

import type { FinishedDocumentRegistrationStatus } from '../../document/document-registration-status.js';
import type { DocumentRegisteredEvent } from '../../events/document-registered/document-registered.event.js';
import type { documentOperationNames } from '../names.js';

export type FinishDocumentRegistrationPayload =
    | {
          readonly outcome: 'registered';
          readonly storageReference: string;
      }
    | {
          readonly outcome: 'failed';
          readonly failureReason: string;
      };

export interface FinishDocumentRegistrationOutcome {
    readonly id: DocumentReference['id'];
    readonly status: FinishedDocumentRegistrationStatus;
}

export type FinishDocumentRegistrationOperation = Operation<
    typeof documentOperationNames.finishRegistration,
    1,
    TenantReference,
    DocumentReference,
    FinishDocumentRegistrationPayload,
    SuccessfulOperationResult<FinishDocumentRegistrationOutcome, DocumentRegisteredEvent>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
