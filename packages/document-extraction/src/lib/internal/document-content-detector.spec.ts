import { describe, expect, it } from 'vitest';

import { DocumentContentDetector } from './document-content-detector.js';

describe('DocumentContentDetector', () => {
    const detector = new DocumentContentDetector();

    it('detects JPEG by its content signature', () => {
        expect(detector.detect(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    });

    it('rejects unsupported content', () => {
        expect(detector.detect(Uint8Array.from([1, 2, 3, 4]))).toBeUndefined();
    });
});
