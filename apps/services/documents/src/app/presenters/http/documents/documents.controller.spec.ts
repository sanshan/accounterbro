jest.mock('@event-driven-platform/intent', () => ({
    IntentFactory: {
        create: jest.fn(({ action }: { action: string }) => ({
            id: `intent-${action}`,
            key: `intent-${action}`,
        })),
    },
}));

import {
    tenantName,
    type DocumentId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';
import { DocumentRegistrationStatus } from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import type { UseCaseExecutor } from '@event-driven-platform/use-case-executor';

import { GetDocumentUseCase } from '../../../application/use-cases/get-document/get-document.use-case';
import { RegisterDocumentUseCase } from '../../../application/use-cases/register-document/register-document.use-case';
import { DocumentsController } from './documents.controller';

const actor = {
    type: 'user',
    id: 'user-1',
    origin: {},
} satisfies Actor;

const tenant = {
    type: tenantName,
    id: 'tenant-1' as TenantId,
} satisfies TenantReference;

function createUseCases() {
    return {
        register: Object.create(RegisterDocumentUseCase.prototype) as RegisterDocumentUseCase,
        get: Object.create(GetDocumentUseCase.prototype) as GetDocumentUseCase,
    };
}

function createExecutor(result: unknown) {
    const execute = jest.fn(async (_request: unknown) => result);

    return {
        executor: {
            execute: execute as UseCaseExecutor['execute'],
        } satisfies UseCaseExecutor,
        execute,
    };
}

describe('DocumentsController', () => {
    it('maps an uploaded file and request identity into RegisterDocumentUseCase execution', async () => {
        const documentId = '3e64a4df-5a82-42d5-98fa-72fb0fde7d4d' as DocumentId;
        const result = {
            id: documentId,
            status: DocumentRegistrationStatus.Registered,
            duplicate: false,
        };
        const { executor, execute } = createExecutor(result);
        const useCases = createUseCases();
        const controller = new DocumentsController(executor, useCases.register, useCases.get);
        const file = Uint8Array.from([1, 2, 3]);

        await expect(controller.registerDocument({ buffer: file }, actor, tenant)).resolves.toEqual({
            id: documentId,
            status: 'REGISTERED',
            duplicate: false,
        });

        expect(execute).toHaveBeenCalledTimes(1);
        const request = execute.mock.calls[0]?.[0];

        expect(request).toEqual(
            expect.objectContaining({
                useCase: useCases.register,
                input: { file },
                context: expect.objectContaining({
                    actor,
                    tenant,
                    correlationId: expect.any(String),
                    intent: expect.any(Object),
                }),
            }),
        );
    });

    it('maps a validated document id and actor into GetDocumentUseCase execution', async () => {
        const documentId = 'c1b2ed5f-13d4-4fbd-aaf0-8999e9774f3b' as DocumentId;
        const result = {
            id: documentId,
            status: DocumentRegistrationStatus.Pending,
        };
        const { executor, execute } = createExecutor(result);
        const useCases = createUseCases();
        const controller = new DocumentsController(executor, useCases.register, useCases.get);

        await expect(controller.getDocument(documentId, actor, tenant)).resolves.toEqual({
            id: documentId,
            status: 'PENDING',
        });

        expect(execute).toHaveBeenCalledTimes(1);
        const request = execute.mock.calls[0]?.[0];

        expect(request).toEqual(
            expect.objectContaining({
                useCase: useCases.get,
                input: { documentId },
                context: expect.objectContaining({
                    actor,
                    correlationId: expect.any(String),
                    intent: expect.any(Object),
                }),
            }),
        );
        expect(request).not.toEqual(
            expect.objectContaining({
                context: expect.objectContaining({ tenant }),
            }),
        );
    });

    it('maps the GetDocumentUseCase not-found result without retesting read behavior', async () => {
        const documentId = '08c721b4-a64b-461b-adb5-bc845de424ac' as DocumentId;
        const { executor } = createExecutor({ kind: 'not-found' });
        const useCases = createUseCases();
        const controller = new DocumentsController(executor, useCases.register, useCases.get);

        await expect(controller.getDocument(documentId, actor, tenant)).resolves.toEqual({
            kind: 'not-found',
        });
    });
});
