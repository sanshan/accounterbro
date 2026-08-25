export interface RegisterDocumentResponseDto {
    readonly id: string;
    readonly status: 'PENDING' | 'REGISTERED' | 'FAILED';
    readonly duplicate: boolean;
}
