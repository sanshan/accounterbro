export type DocumentExtractionFailureCode =
    | 'unsupported-content'
    | 'extraction-failed';

export class DocumentExtractionError extends Error {
    public constructor(
        public readonly code: DocumentExtractionFailureCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'DocumentExtractionError';
    }
}
