import { documentName } from './document/name.js';
import { documentProcessingName } from './document-processing/name.js';
import { tenantName } from './tenant/name.js';

describe('core identities', () => {
    it('exposes stable domain names', () => {
        expect(documentName).toBe('document');
        expect(documentProcessingName).toBe('document-processing');
        expect(tenantName).toBe('tenant');
    });
});
