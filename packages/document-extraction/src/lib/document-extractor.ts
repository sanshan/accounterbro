export interface DocumentExtractionResult {
    readonly text: string;
}

export abstract class DocumentExtractor {
    public abstract extract(content: Uint8Array): Promise<DocumentExtractionResult>;
}
