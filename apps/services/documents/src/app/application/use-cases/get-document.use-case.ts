import type { DocumentId } from '@accounterbro/core';
import {
    documentReadNames,
    type GetDocumentRead,
    type GetDocumentResult,
} from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import type { Reader } from '@event-driven-platform/reader';
import type { UseCase, UseCaseContext } from '@event-driven-platform/use-case';

export interface GetDocumentUseCaseInput {
    readonly documentId: DocumentId;
}

export interface GetDocumentNotFoundResult {
    readonly kind: 'not-found';
}

export type GetDocumentUseCaseResult = GetDocumentResult | GetDocumentNotFoundResult;

export class GetDocumentUseCase
    implements UseCase<GetDocumentUseCaseInput, GetDocumentUseCaseResult>
{
    public constructor(
        private readonly reader: Reader,
        private readonly actor: Actor,
    ) {}

    public async execute(
        input: GetDocumentUseCaseInput,
        context: UseCaseContext,
    ): Promise<GetDocumentUseCaseResult> {
        const read = {
            name: documentReadNames.getDocument,
            actor: this.actor,
            parameters: {
                documentId: input.documentId,
            },
        } satisfies GetDocumentRead;

        const result = await this.reader.execute({
            read,
            context: {
                correlationId: context.correlationId,
            },
        });

        return result ?? { kind: 'not-found' };
    }
}
