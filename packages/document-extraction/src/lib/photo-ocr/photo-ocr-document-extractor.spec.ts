import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createPhotoOcrDocumentExtractor } from './create-photo-ocr-document-extractor.js';

const fixturePath = resolve(
    process.cwd(),
    'src/lib/photo-ocr/fixtures/IMG_0711.jpeg',
);

describe('createPhotoOcrDocumentExtractor', () => {
    const extractor = createPhotoOcrDocumentExtractor();

    it(
        'extracts substantial text from a real JPEG phone photograph with perspective and background',
        async () => {
            const content = await readFile(fixturePath);
            const result = await extractor.extract(content);
            const text = result.text.trim();

            expect(text.length).toBeGreaterThan(300);
            expect(text.split(/\s+/u).length).toBeGreaterThan(40);
        },
        60_000,
    );

    it('reports unsupported bytes without requiring caller metadata', async () => {
        await expect(
            extractor.extract(Uint8Array.from([1, 2, 3, 4])),
        ).rejects.toMatchObject({
            name: 'DocumentExtractionError',
            code: 'unsupported-content',
        });
    });
});
