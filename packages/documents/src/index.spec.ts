import { describe, expect, it } from 'vitest';

import * as documents from './index.js';

describe('@accounterbro/documents', () => {
    it('exposes only the root business contracts and runtime values', () => {
        expect(Object.keys(documents).sort()).toEqual([
            'Document',
            'DocumentRegisteredEvent',
            'DocumentRegistrationStatus',
            'documentEventNames',
            'documentOperationNames',
            'documentReadNames',
        ]);
    });
});
