import { documentName, type DocumentId } from '@accounterbro/core';
import {
    documentReadNames,
    type GetDocumentRead,
    type GetDocumentResult,
} from '@accounterbro/documents';
import { Reader } from '@accounterbro/runtime-executions';
import type { UseCase } from '@event-driven-platform/use-case';
import { Injectable } from '@nestjs/common';

import type { GetDocumentUseCaseContext } from './get-document.use-case.context';

export interface GetDocumentUseCaseInput {
    readonly documentId: DocumentId;
}

export interface GetDocumentNotFoundResult {
    readonly kind: 'not-found';
}

export type GetDocumentUseCaseResult = GetDocumentResult | GetDocumentNotFoundResult;

@Injectable()
export class GetDocumentUseCase
    implements UseCase<GetDocumentUseCaseInput, GetDocumentUseCaseResult, GetDocumentUseCaseContext>
{
    public readonly name = `${documentName}.get`;

    public constructor(private readonly reader: Reader) {}

    public async execute(
        input: GetDocumentUseCaseInput,
        context: GetDocumentUseCaseContext,
    ): Promise<GetDocumentUseCaseResult> {
        const read = {
            name: documentReadNames.getDocument,
            actor: context.actor,
            tenant: context.tenant,
            parameters: {
                documentId: input.documentId,
            },
        } satisfies GetDocumentRead;

        const result = await this.reader.execute<GetDocumentRead>({
            read,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result ?? { kind: 'not-found' };
    }
}
