import { documentProcessingName, type DocumentId } from '@accounterbro/core';
import {
    documentProcessingReadNames,
    type GetDocumentProcessingRead,
    type GetDocumentProcessingResult,
} from '@accounterbro/document-processing';
import { Reader } from '@accounterbro/runtime-executions';
import type { UseCase } from '@event-driven-platform/use-case';
import { Injectable } from '@nestjs/common';

import type { GetDocumentProcessingUseCaseContext } from './get-document-processing.use-case.context';

export interface GetDocumentProcessingUseCaseInput {
    readonly documentId: DocumentId;
}

export interface GetDocumentProcessingNotFoundResult {
    readonly kind: 'not-found';
}

export type GetDocumentProcessingUseCaseResult =
    | GetDocumentProcessingResult
    | GetDocumentProcessingNotFoundResult;

@Injectable()
export class GetDocumentProcessingUseCase
    implements
        UseCase<
            GetDocumentProcessingUseCaseInput,
            GetDocumentProcessingUseCaseResult,
            GetDocumentProcessingUseCaseContext
        >
{
    public readonly name = `${documentProcessingName}.get`;

    public constructor(private readonly reader: Reader) {}

    public async execute(
        input: GetDocumentProcessingUseCaseInput,
        context: GetDocumentProcessingUseCaseContext,
    ): Promise<GetDocumentProcessingUseCaseResult> {
        const read = {
            name: documentProcessingReadNames.getDocumentProcessing,
            actor: context.actor,
            tenant: context.tenant,
            parameters: {
                documentId: input.documentId,
            },
        } satisfies GetDocumentProcessingRead;

        const result = await this.reader.execute<GetDocumentProcessingRead>({
            read,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result ?? { kind: 'not-found' };
    }
}
