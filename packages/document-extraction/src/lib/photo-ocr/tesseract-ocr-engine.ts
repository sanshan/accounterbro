import { createRequire } from 'node:module';

import Tesseract from 'tesseract.js';

interface TesseractLanguageData {
    readonly code: string;
    readonly gzip: boolean;
    readonly langPath: string;
}

interface OcrEngine {
    recognize(content: Uint8Array): Promise<string>;
}

const require = createRequire(import.meta.url);
const englishLanguageData = require('@tesseract.js-data/eng') as TesseractLanguageData;

export class TesseractOcrEngine implements OcrEngine {
    public async recognize(content: Uint8Array): Promise<string> {
        const worker = await Tesseract.createWorker(
            englishLanguageData.code,
            Tesseract.OEM.LSTM_ONLY,
            {
                gzip: englishLanguageData.gzip,
                langPath: englishLanguageData.langPath,
            },
        );

        try {
            const result = await worker.recognize(Buffer.from(content));
            return result.data.text;
        } finally {
            await worker.terminate();
        }
    }
}

export type { OcrEngine };
