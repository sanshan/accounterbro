import type { AggregateReference } from '@event-driven-platform/aggregate-reference';

import type { documentName } from './name.js';
import type { DocumentId } from './document-id.js';

export type DocumentReference = AggregateReference<typeof documentName, DocumentId>;
