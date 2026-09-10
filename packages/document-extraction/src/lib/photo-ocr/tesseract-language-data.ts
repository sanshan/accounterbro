import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface TesseractLanguageData {
    readonly code: string;
    readonly gzip: boolean;
    readonly langPath: string;
}

export interface PreparedTesseractLanguageData {
    readonly codes: string[];
    readonly gzip: boolean;
    readonly langPath: string;
    cleanup(): Promise<void>;
}

const require = createRequire(import.meta.url);
const configuredLanguageData = [
    require('@tesseract.js-data/rus') as TesseractLanguageData,
    require('@tesseract.js-data/srp') as TesseractLanguageData,
    require('@tesseract.js-data/srp_latn') as TesseractLanguageData,
] as const;

export const configuredTesseractLanguageCodes = configuredLanguageData.map(
    ({ code }) => code,
);

export async function prepareTesseractLanguageData(): Promise<PreparedTesseractLanguageData> {
    const gzip = configuredLanguageData[0].gzip;

    if (configuredLanguageData.some((languageData) => languageData.gzip !== gzip)) {
        throw new Error('Configured Tesseract language data must use the same compression format.');
    }

    const langPath = await mkdtemp(join(tmpdir(), 'accounterbro-tesseract-'));
    const suffix = gzip ? '.traineddata.gz' : '.traineddata';

    try {
        await Promise.all(
            configuredLanguageData.map(async ({ code, langPath: sourceLangPath }) => {
                await copyFile(
                    join(sourceLangPath, `${code}${suffix}`),
                    join(langPath, `${code}${suffix}`),
                );
            }),
        );
    } catch (error: unknown) {
        await rm(langPath, { recursive: true, force: true });
        throw error;
    }

    return {
        codes: [...configuredTesseractLanguageCodes],
        gzip,
        langPath,
        cleanup: async () => {
            await rm(langPath, { recursive: true, force: true });
        },
    };
}
