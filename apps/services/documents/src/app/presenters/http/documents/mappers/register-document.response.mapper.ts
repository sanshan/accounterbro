import type { RegisterDocumentResult } from '../../../../application/use-cases/register-document.use-case';
import type { RegisterDocumentResponseDto } from '../dto/register-document.response.dto';

export function mapRegisterDocumentResponse(
    result: RegisterDocumentResult,
): RegisterDocumentResponseDto {
    return {
        id: result.id,
        status: result.status,
        duplicate: result.duplicate,
    };
}
