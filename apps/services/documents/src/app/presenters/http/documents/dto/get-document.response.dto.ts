export interface FoundDocumentResponseDto {
    readonly id: string;
    readonly status: 'PENDING' | 'REGISTERED' | 'FAILED';
}

export interface DocumentNotFoundResponseDto {
    readonly kind: 'not-found';
}

export type GetDocumentResponseDto = FoundDocumentResponseDto | DocumentNotFoundResponseDto;
