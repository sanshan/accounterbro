export interface GetDocumentResponseDto {
    readonly id: string;
    readonly status: 'PENDING' | 'REGISTERED' | 'FAILED';
}
