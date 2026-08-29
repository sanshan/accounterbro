import type { GetDocumentUseCaseResult } from '../../../../application/use-cases/get-document/get-document.use-case';
import type { GetDocumentResponseDto } from '../dto/get-document.response.dto';

export function mapGetDocumentResponse(result: GetDocumentUseCaseResult): GetDocumentResponseDto {
    if ('kind' in result) {
        return { kind: 'not-found' };
    }

    return {
        id: result.id,
        status: result.status,
    };
}
