import { describe, expect, it } from 'vitest';

import { DocumentContentDetector } from './document-content-detector.js';

describe('DocumentContentDetector', () => {
    const detector = new DocumentContentDetector();

    it('detects JPEG by its content signature', () => {
        expect(detector.detect(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    });

    it.each(['heic', 'mif1', 'mif2'])('detects HEIF-family brand %s from the ftyp box', (brand) => {
        expect(detector.detect(createFtypContent(brand))).toBe('heif');
    });

    it('does not classify AVIF as the supported HEIF photo path', () => {
        expect(detector.detect(createFtypContent('avif', ['mif1']))).toBeUndefined();
    });

    it('rejects arbitrary or structurally invalid content', () => {
        expect(detector.detect(new Uint8Array([1, 2, 3, 4]))).toBeUndefined();
        expect(detector.detect(createFtypContent('heic', [], 12))).toBeUndefined();
    });
});

function createFtypContent(
    majorBrand: string,
    compatibleBrands: readonly string[] = [],
    declaredBoxSize?: number,
): Uint8Array {
    const actualBoxSize = 16 + (compatibleBrands.length * 4);
    const content = new Uint8Array(actualBoxSize);
    const view = new DataView(content.buffer);
    view.setUint32(0, declaredBoxSize ?? actualBoxSize);
    writeAscii(content, 4, 'ftyp');
    writeAscii(content, 8, majorBrand);

    compatibleBrands.forEach((brand, index) => {
        writeAscii(content, 16 + (index * 4), brand);
    });

    return content;
}

function writeAscii(content: Uint8Array, offset: number, value: string): void {
    for (let index = 0; index < 4; index += 1) {
        content[offset + index] = value.charCodeAt(index);
    }
}
