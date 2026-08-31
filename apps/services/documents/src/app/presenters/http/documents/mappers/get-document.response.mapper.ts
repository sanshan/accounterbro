import type { GetDocumentUseCaseResult } from '../../../../application/use-cases/get-document/get-document.use-case';
import type { GetDocumentResponseDto } from '../dto/get-document.response.dto';

type FoundGetDocumentUseCaseResult = Exclude<
    GetDocumentUseCaseResult,
    { readonly kind: 'not-found' }
>;

export function mapGetDocumentResponse(
    result: FoundGetDocumentUseCaseResult,
): GetDocumentResponseDto {
    return {
        id: result.id,
        status: result.status,
    };
}
