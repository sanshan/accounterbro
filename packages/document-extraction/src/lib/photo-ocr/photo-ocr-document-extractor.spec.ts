import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { DocumentExtractionError } from '../document-extraction-error.js';
import { createPhotoOcrDocumentExtractor } from './create-photo-ocr-document-extractor.js';

const expectedMarkers = ['ACCOUNTER BRO', 'AB-305', '42.50 EUR'] as const;

describe('createPhotoOcrDocumentExtractor', () => {
    const extractor = createPhotoOcrDocumentExtractor();

    it.each([
        ['JPEG', 'phone-receipt.jpg'],
        ['HEIF', 'phone-receipt.heif.gz'],
    ])(
        'extracts readable text from a representative %s phone photo',
        async (_format, fixture) => {
            const storedFixture = await readFile(
                resolve(
                    process.cwd(),
                    'src/lib/photo-ocr/fixtures',
                    fixture,
                ),
            );
            const content = fixture.endsWith('.gz')
                ? gunzipSync(storedFixture)
                : storedFixture;
            const result = await extractor.extract(content);

            for (const marker of expectedMarkers) {
                expect(result.text).toContain(marker);
            }
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

    it('normalizes HEIF decoding failures through the package-owned failure boundary', async () => {
        const invalidHeif = createInvalidHeif();

        try {
            await extractor.extract(invalidHeif);
            expect.unreachable('expected HEIF normalization to fail');
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(DocumentExtractionError);
            expect(error).toMatchObject({ code: 'extraction-failed' });
            expect((error as DocumentExtractionError).cause).toBeDefined();
        }
    });
});

function createInvalidHeif(): Uint8Array {
    const content = new Uint8Array(16);
    const view = new DataView(content.buffer);
    view.setUint32(0, content.length);

    for (const [offset, value] of [[4, 'ftyp'], [8, 'heic']] as const) {
        for (let index = 0; index < 4; index += 1) {
            content[offset + index] = value.charCodeAt(index);
        }
    }

    return content;
}
