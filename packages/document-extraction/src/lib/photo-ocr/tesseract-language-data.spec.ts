import { access } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    configuredTesseractLanguageCodes,
    prepareTesseractLanguageData,
} from './tesseract-language-data.js';

describe('Tesseract language data', () => {
    it('configures Russian and both Serbian writing systems', () => {
        expect(configuredTesseractLanguageCodes).toEqual(['rus', 'srp', 'srp_latn']);
    });

    it('prepares every configured traineddata file from local packages', async () => {
        const languageData = await prepareTesseractLanguageData();
        const suffix = languageData.gzip ? '.traineddata.gz' : '.traineddata';

        try {
            await Promise.all(
                languageData.codes.map(async (code) => {
                    await expect(
                        access(join(languageData.langPath, `${code}${suffix}`)),
                    ).resolves.toBeUndefined();
                }),
            );
        } finally {
            await languageData.cleanup();
        }
    });
});
