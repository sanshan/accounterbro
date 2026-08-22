import type { Actor } from '@event-driven-platform/actor';
import type { AggregateReference } from '@event-driven-platform/aggregate-reference';
import type { Intent } from '@event-driven-platform/intent';
import type { Operation } from '@event-driven-platform/operation';
import type { SuccessfulOperationResult } from '@event-driven-platform/operation-result';
import type { Subject } from '@event-driven-platform/subject';
import type { TenantReference } from '@event-driven-platform/tenant-reference';

import type { DocumentRegistered } from '../events/document-registered.js';
import type { FINISH_DOCUMENT_REGISTRATION_OPERATION } from './document-operation-names.js';

type StringBrand = string & { readonly __brand: string };

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
    readonly id: string;
    readonly status: 'REGISTERED' | 'FAILED';
}

export type FinishDocumentRegistrationOperation = Operation<
    typeof FINISH_DOCUMENT_REGISTRATION_OPERATION,
    1,
    TenantReference<string, StringBrand>,
    AggregateReference<'document', StringBrand>,
    FinishDocumentRegistrationPayload,
    SuccessfulOperationResult<FinishDocumentRegistrationOutcome, DocumentRegistered>
> & {
    readonly intent: Intent;
    readonly actor: Actor;
    readonly subject: Subject;
};
