import Tesseract from 'tesseract.js';

import { prepareTesseractLanguageData } from './tesseract-language-data.js';

interface OcrEngine {
    recognize(content: Uint8Array): Promise<string>;
}

export class TesseractOcrEngine implements OcrEngine {
    public async recognize(content: Uint8Array): Promise<string> {
        const languageData = await prepareTesseractLanguageData();

        try {
            const worker = await Tesseract.createWorker(
                languageData.codes,
                Tesseract.OEM.LSTM_ONLY,
                {
                    gzip: languageData.gzip,
                    langPath: languageData.langPath,
                },
            );

            try {
                const result = await worker.recognize(Buffer.from(content));
                return result.data.text;
            } finally {
                await worker.terminate();
            }
        } finally {
            await languageData.cleanup();
        }
    }
}

export type { OcrEngine };
