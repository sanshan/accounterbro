import { Controller } from '@nestjs/common';

import { GetDocumentUseCase } from '../../../application/use-cases/get-document.use-case';
import { RegisterDocumentUseCase } from '../../../application/use-cases/register-document.use-case';

@Controller()
export class DocumentsController {
    public constructor(
        registerDocumentUseCase: RegisterDocumentUseCase,
        getDocumentUseCase: GetDocumentUseCase,
    ) {
        void registerDocumentUseCase;
        void getDocumentUseCase;
    }
}
