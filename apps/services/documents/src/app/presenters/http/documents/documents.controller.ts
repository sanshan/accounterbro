import { randomUUID } from 'node:crypto';

import type { DocumentId, TenantReference } from '@accounterbro/core';
import { Actor, Tenant } from '@accounterbro/runtime-presenters/http';
import type { Actor as ActorValue } from '@event-driven-platform/actor';
import { IntentFactory } from '@event-driven-platform/intent';
import type { UseCaseExecutor } from '@event-driven-platform/use-case-executor';
import {
    Controller,
    Get,
    Inject,
    Param,
    ParseFilePipeBuilder,
    ParseUUIDPipe,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DOCUMENTS_USE_CASE_EXECUTOR } from '../../../application/application.tokens';
import {
    GetDocumentUseCase,
    type GetDocumentUseCaseInput,
} from '../../../application/use-cases/get-document.use-case';
import type { GetDocumentUseCaseContext } from '../../../application/use-cases/get-document.use-case.context';
import {
    RegisterDocumentUseCase,
    type RegisterDocumentInput,
} from '../../../application/use-cases/register-document.use-case';
import type { RegisterDocumentUseCaseContext } from '../../../application/use-cases/register-document.use-case.context';
import type { GetDocumentResponseDto } from './dto/get-document.response.dto';
import type { RegisterDocumentResponseDto } from './dto/register-document.response.dto';
import { mapGetDocumentResponse } from './mappers/get-document.response.mapper';
import { mapRegisterDocumentResponse } from './mappers/register-document.response.mapper';

const httpIntentNamespace = 'documents-http';

interface UploadedDocumentFile {
    readonly buffer: Uint8Array;
}

function createInvocationContext(action: string, tenant: TenantReference) {
    const correlationId = randomUUID();

    return {
        correlationId,
        intent: IntentFactory.create({
            namespace: httpIntentNamespace,
            action,
            version: 1,
            tenant,
            components: {
                invocationId: correlationId,
            },
        }),
    };
}

@Controller('documents')
export class DocumentsController {
    public constructor(
        @Inject(DOCUMENTS_USE_CASE_EXECUTOR)
        private readonly useCaseExecutor: UseCaseExecutor,
        private readonly registerDocumentUseCase: RegisterDocumentUseCase,
        private readonly getDocumentUseCase: GetDocumentUseCase,
    ) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    public async registerDocument(
        @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
        file: UploadedDocumentFile,
        @Actor() actor: ActorValue,
        @Tenant() tenant: TenantReference,
    ): Promise<RegisterDocumentResponseDto> {
        const input = {
            file: file.buffer,
        } satisfies RegisterDocumentInput;
        const context = {
            ...createInvocationContext('register-document', tenant),
            actor,
            tenant,
        } satisfies RegisterDocumentUseCaseContext;

        const result = await this.useCaseExecutor.execute({
            useCase: this.registerDocumentUseCase,
            input,
            context,
        });

        return mapRegisterDocumentResponse(result);
    }

    @Get(':documentId')
    public async getDocument(
        @Param('documentId', new ParseUUIDPipe({ version: '4' })) documentId: string,
        @Actor() actor: ActorValue,
        @Tenant() tenant: TenantReference,
    ): Promise<GetDocumentResponseDto> {
        const input = {
            documentId: documentId as DocumentId,
        } satisfies GetDocumentUseCaseInput;
        const context = {
            ...createInvocationContext('get-document', tenant),
            actor,
        } satisfies GetDocumentUseCaseContext;

        const result = await this.useCaseExecutor.execute({
            useCase: this.getDocumentUseCase,
            input,
            context,
        });

        return mapGetDocumentResponse(result);
    }
}
