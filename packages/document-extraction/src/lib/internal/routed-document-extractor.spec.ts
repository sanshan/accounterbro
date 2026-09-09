import { describe, expect, it, vi } from 'vitest';

import { DocumentExtractionError } from '../document-extraction-error.js';
import { DocumentContentDetector } from './document-content-detector.js';
import {
    RoutedDocumentExtractor,
    type DetectedContentExtractor,
} from './routed-document-extractor.js';

describe('RoutedDocumentExtractor', () => {
    it('routes detected content to a private matching extractor', async () => {
        const extraction = vi.fn(async () => ({ text: 'recognized' }));
        const extractor: DetectedContentExtractor = {
            supports: (representation) => representation === 'jpeg',
            extract: extraction,
        };
        const content = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);
        const routed = new RoutedDocumentExtractor(
            new DocumentContentDetector(),
            [extractor],
        );

        await expect(routed.extract(content)).resolves.toEqual({ text: 'recognized' });
        expect(extraction).toHaveBeenCalledWith(content, 'jpeg');
    });

    it('reports unsupported content through the package-owned failure', async () => {
        const routed = new RoutedDocumentExtractor(new DocumentContentDetector(), []);

        await expect(routed.extract(Uint8Array.from([1, 2, 3]))).rejects.toMatchObject({
            name: 'DocumentExtractionError',
            code: 'unsupported-content',
        });
    });

    it('normalizes implementation failures while retaining the original cause', async () => {
        const cause = new Error('third-party failure');
        const extractor: DetectedContentExtractor = {
            supports: () => true,
            extract: vi.fn(async () => {
                throw cause;
            }),
        };
        const routed = new RoutedDocumentExtractor(
            new DocumentContentDetector(),
            [extractor],
        );

        try {
            await routed.extract(Uint8Array.from([0xff, 0xd8, 0xff]));
            expect.unreachable('expected extraction to fail');
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(DocumentExtractionError);
            expect(error).toMatchObject({ code: 'extraction-failed', cause });
        }
    });
});
