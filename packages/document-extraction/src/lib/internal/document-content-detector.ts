export type DetectedDocumentRepresentation = 'jpeg' | 'heif';

const jpegSignature = [0xff, 0xd8, 0xff] as const;
const ftypBoxType = 'ftyp';
const avifBrands = new Set(['avif', 'avis']);
const heifBrands = new Set([
    'heic',
    'heix',
    'hevc',
    'hevx',
    'heim',
    'heis',
    'hevm',
    'hevs',
    'mif1',
    'mif2',
    'msf1',
    'msf2',
]);

export class DocumentContentDetector {
    public detect(content: Uint8Array): DetectedDocumentRepresentation | undefined {
        if (isJpeg(content)) {
            return 'jpeg';
        }

        return detectHeif(content);
    }
}

function isJpeg(content: Uint8Array): boolean {
    return jpegSignature.every((byte, index) => content[index] === byte);
}

function detectHeif(content: Uint8Array): DetectedDocumentRepresentation | undefined {
    if (content.length < 16 || readAscii(content, 4) !== ftypBoxType) {
        return undefined;
    }

    const boxSize = readUint32BigEndian(content, 0);
    const boxLayout = resolveFtypLayout(content, boxSize);

    if (!boxLayout) {
        return undefined;
    }

    const brands = [readAscii(content, boxLayout.majorBrandOffset)];

    for (
        let offset = boxLayout.compatibleBrandsOffset;
        offset + 4 <= boxLayout.boxEnd;
        offset += 4
    ) {
        brands.push(readAscii(content, offset));
    }

    if (brands.some((brand) => avifBrands.has(brand))) {
        return undefined;
    }

    return brands.some((brand) => heifBrands.has(brand)) ? 'heif' : undefined;
}

interface FtypLayout {
    readonly majorBrandOffset: number;
    readonly compatibleBrandsOffset: number;
    readonly boxEnd: number;
}

function resolveFtypLayout(content: Uint8Array, boxSize: number): FtypLayout | undefined {
    if (boxSize === 1) {
        if (content.length < 24) {
            return undefined;
        }

        const high = readUint32BigEndian(content, 8);
        const low = readUint32BigEndian(content, 12);

        if (high !== 0 || low < 24 || low > content.length) {
            return undefined;
        }

        return {
            majorBrandOffset: 16,
            compatibleBrandsOffset: 24,
            boxEnd: low,
        };
    }

    const boxEnd = boxSize === 0 ? content.length : boxSize;

    if (boxEnd < 16 || boxEnd > content.length) {
        return undefined;
    }

    return {
        majorBrandOffset: 8,
        compatibleBrandsOffset: 16,
        boxEnd,
    };
}

function readAscii(content: Uint8Array, offset: number): string {
    return String.fromCharCode(
        content[offset] ?? 0,
        content[offset + 1] ?? 0,
        content[offset + 2] ?? 0,
        content[offset + 3] ?? 0,
    );
}

function readUint32BigEndian(content: Uint8Array, offset: number): number {
    return (
        ((content[offset] ?? 0) * 0x1000000) +
        ((content[offset + 1] ?? 0) << 16) +
        ((content[offset + 2] ?? 0) << 8) +
        (content[offset + 3] ?? 0)
    );
}
