import { documentName } from './document/name.js';
import { tenantName } from './tenant/name.js';

describe('core identities', () => {
    it('exposes stable domain names', () => {
        expect(documentName).toBe('document');
        expect(tenantName).toBe('tenant');
    });
});
