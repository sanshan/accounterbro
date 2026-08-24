import { createHash } from 'node:crypto';

import {
    documentName,
    tenantName,
    type DocumentId,
    type TenantId,
    type TenantReference,
} from '@accounterbro/core';
import {
    DocumentRegistrationStatus,
    documentOperationNames,
    type PrepareDocumentRegistrationOperation,
} from '@accounterbro/documents';
import type { Actor } from '@event-driven-platform/actor';
import { IntentFactory, type Intent } from '@event-driven-platform/intent';
import type { Runner } from '@event-driven-platform/runner';
import type { UseCaseContext } from '@event-driven-platform/use-case';

import { RegisterDocumentUseCase } from './register-document.use-case';

jest.mock('@event-driven-platform/intent', () => ({
    IntentFactory: {
        derive: jest.fn(),
    },
}));

type PrepareRegistrationCommand = {
    readonly operation: PrepareDocumentRegistrationOperation;
    readonly context: {
        readonly correlationId: string;
    };
};

const actor = {
    type: 'user',
    id: 'user-1',
    origin: {},
} satisfies Actor;

const tenant = {
    type: tenantName,
    id: 'tenant-1' as TenantId,
} satisfies TenantReference;

const context = {
    intent: {
        id: 'parent-intent-id',
        key: 'parent-intent-key',
    },
    correlationId: 'correlation-1',
} satisfies UseCaseContext;

const childIntent = {
    id: 'child-intent-id',
    key: 'child-intent-key',
} satisfies Intent;

const deriveIntent = jest.mocked(IntentFactory.derive);

function asRunner(execute: (command: PrepareRegistrationCommand) => Promise<unknown>): Runner {
    return {
        execute,
        executeDetailed: jest.fn(),
    } as unknown as Runner;
}

describe('RegisterDocumentUseCase', () => {
    beforeEach(() => {
        deriveIntent.mockReset();
        deriveIntent.mockReturnValue(childIntent);
    });

    it('DOC-REG-001 maps a created PENDING result to initial registration success', async () => {
        const file = Uint8Array.from([0, 1, 2, 3, 255]);
        let capturedCommand: PrepareRegistrationCommand | undefined;
        const execute = jest.fn(async (command: PrepareRegistrationCommand) => {
            capturedCommand = command;

            return {
                status: 'success' as const,
                data: {
                    kind: 'created' as const,
                    document: {
                        id: command.operation.payload.documentId,
                        status: DocumentRegistrationStatus.Pending,
                    },
                },
                events: [],
            };
        });
        const useCase = new RegisterDocumentUseCase(asRunner(execute), actor, tenant);

        const result = await useCase.execute({ file }, context);

        expect(result).toEqual({
            id: expect.any(String),
            status: DocumentRegistrationStatus.Pending,
            duplicate: false,
        });
        expect(execute).toHaveBeenCalledTimes(1);

        if (capturedCommand === undefined) {
            throw new Error('RegisterDocumentUseCase did not execute the prepare registration command');
        }

        expect(capturedCommand.operation).toMatchObject({
            name: documentOperationNames.prepareRegistration,
            schemaVersion: 1,
            intent: childIntent,
            actor,
            tenant,
            aggregate: {
                type: documentName,
                id: result.id,
            },
            subject: {
                type: documentName,
                id: result.id,
            },
            payload: {
                documentId: result.id,
                contentHash: createHash('sha256').update(file).digest('hex'),
            },
        });
        expect(deriveIntent).toHaveBeenCalledTimes(1);
        expect(deriveIntent).toHaveBeenCalledWith({
            parent: { id: context.intent.id },
            slot: 'prepare-registration',
        });
        expect(capturedCommand.context).toEqual({ correlationId: context.correlationId });
    });

    it('DOC-REG-001 propagates initial registration failure instead of returning success', async () => {
        const failure = new Error('initial registration failed');
        const execute = jest.fn(async (_command: PrepareRegistrationCommand): Promise<never> => {
            throw failure;
        });
        const useCase = new RegisterDocumentUseCase(asRunner(execute), actor, tenant);

        await expect(useCase.execute({ file: Uint8Array.from([1]) }, context)).rejects.toBe(failure);
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it.each([
        DocumentRegistrationStatus.Pending,
        DocumentRegistrationStatus.Registered,
        DocumentRegistrationStatus.Failed,
    ])('DOC-REG-002 maps an existing %s result to a successful duplicate', async (status) => {
        const existingDocumentId = 'existing-document-id' as DocumentId;
        const execute = jest.fn(async (_command: PrepareRegistrationCommand) => ({
            status: 'success' as const,
            data: {
                kind: 'duplicate' as const,
                document: {
                    id: existingDocumentId,
                    status,
                },
            },
            events: [],
        }));
        const useCase = new RegisterDocumentUseCase(asRunner(execute), actor, tenant);

        const result = await useCase.execute({ file: Uint8Array.from([4, 5, 6]) }, context);

        expect(result).toEqual({
            id: existingDocumentId,
            status,
            duplicate: true,
        });
        expect(execute).toHaveBeenCalledTimes(1);
    });
});

// DOC-REG-003 remains owned by the PostgreSQL concurrency evidence in
// packages/documents/src/lib/persistence/typeorm/typeorm-document-persistence.integration.spec.ts.
