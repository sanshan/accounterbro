import type { AggregateReference } from '@event-driven-platform/aggregate-reference';

import type { DocumentProcessingId } from './document-processing-id.js';
import type { documentProcessingName } from './name.js';

export type DocumentProcessingReference = AggregateReference<
    typeof documentProcessingName,
    DocumentProcessingId
>;
