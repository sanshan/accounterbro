import { describe, expect, it } from 'vitest';

import * as documents from './index.js';
import { FinishDocumentRegistrationHandler } from './lib/operations/finish-document-registration/finish-document-registration.handler.js';
import { PrepareDocumentRegistrationHandler } from './lib/operations/prepare-document-registration/prepare-document-registration.handler.js';
import { DocumentPersistence } from './lib/ports/document-persistence.js';
import { documentsOperationHandlerProviders } from './execution.js';

const persistence: DocumentPersistence = {
    createOrGetExisting: async (document) => ({ kind: 'created', document }),
    findById: async () => null,
    update: async () => undefined,
};

describe('@accounterbro/documents/execution', () => {
    it('exposes package-owned provider descriptors for Documents Operation handlers', () => {
        const [prepareProvider, finishProvider] = documentsOperationHandlerProviders;

        expect(prepareProvider.provide).toBe(PrepareDocumentRegistrationHandler);
        expect(prepareProvider.inject).toEqual([DocumentPersistence]);
        expect(prepareProvider.useFactory(persistence)).toBeInstanceOf(
            PrepareDocumentRegistrationHandler,
        );

        expect(finishProvider.provide).toBe(FinishDocumentRegistrationHandler);
        expect(finishProvider.inject).toEqual([DocumentPersistence]);
        expect(finishProvider.useFactory(persistence)).toBeInstanceOf(
            FinishDocumentRegistrationHandler,
        );
    });

    it('keeps concrete Operation handler implementations out of the business entrypoint', () => {
        expect(documents).not.toHaveProperty('PrepareDocumentRegistrationHandler');
        expect(documents).not.toHaveProperty('FinishDocumentRegistrationHandler');
    });
});
