export type DetectedDocumentRepresentation = 'jpeg';

const jpegSignature = [0xff, 0xd8, 0xff] as const;

export class DocumentContentDetector {
    public detect(content: Uint8Array): DetectedDocumentRepresentation | undefined {
        return isJpeg(content) ? 'jpeg' : undefined;
    }
}

function isJpeg(content: Uint8Array): boolean {
    return jpegSignature.every((byte, index) => content[index] === byte);
}
