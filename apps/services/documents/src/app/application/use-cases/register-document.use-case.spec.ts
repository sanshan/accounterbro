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
    type FinishDocumentRegistrationOperation,
    type PrepareDocumentRegistrationOperation,
} from '@accounterbro/documents';
import type { ObjectStorage } from '@accounterbro/object-storage';
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

type RegistrationCommand = {
    readonly operation: PrepareDocumentRegistrationOperation | FinishDocumentRegistrationOperation;
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

const prepareIntent = {
    id: 'prepare-intent-id',
    key: 'prepare-intent-key',
} satisfies Intent;

const finishIntent = {
    id: 'finish-intent-id',
    key: 'finish-intent-key',
} satisfies Intent;

const deriveIntent = jest.mocked(IntentFactory.derive);

function createRunner(execute: (command: RegistrationCommand) => Promise<unknown>): Runner {
    const executeDetailed: Runner['executeDetailed'] = async () => {
        throw new Error('RegisterDocumentUseCase must not call executeDetailed.');
    };

    return {
        execute: execute as Runner['execute'],
        executeDetailed,
    };
}

function createObjectStorage(
    put: ObjectStorage['put'] = async ({ key }) => ({ reference: `local://${key}` }),
): ObjectStorage {
    return { put };
}

function mockChildIntents(): void {
    deriveIntent.mockImplementation((request) => {
        if (request.slot === 'prepare-registration') {
            return prepareIntent;
        }

        if (request.slot === 'finish-registration') {
            return finishIntent;
        }

        throw new Error(`Unexpected Intent slot: ${request.slot}`);
    });
}

describe('RegisterDocumentUseCase', () => {
    beforeEach(() => {
        deriveIntent.mockReset();
        mockChildIntents();
    });

    it('DOC-REG-001/DOC-REG-004 stores a new file and returns REGISTERED after Finish', async () => {
        const file = Uint8Array.from([0, 1, 2, 3, 255]);
        const preparedDocumentId = 'prepared-document-id' as DocumentId;
        const commands: RegistrationCommand[] = [];
        const execute = jest.fn(async (command: RegistrationCommand) => {
            commands.push(command);

            if (command.operation.name === documentOperationNames.prepareRegistration) {
                return {
                    status: 'success' as const,
                    data: {
                        kind: 'created' as const,
                        document: {
                            id: preparedDocumentId,
                            status: DocumentRegistrationStatus.Pending,
                        },
                    },
                    events: [],
                };
            }

            return {
                status: 'success' as const,
                data: {
                    id: preparedDocumentId,
                    status: DocumentRegistrationStatus.Registered,
                },
                events: [],
            };
        });
        const put = jest.fn(async () => ({ reference: 'opaque-storage-reference' }));
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(put),
            actor,
            tenant,
        );

        const result = await useCase.execute({ file }, context);

        expect(result).toEqual({
            id: preparedDocumentId,
            status: DocumentRegistrationStatus.Registered,
            duplicate: false,
        });
        expect(execute).toHaveBeenCalledTimes(2);
        expect(put).toHaveBeenCalledTimes(1);
        expect(put).toHaveBeenCalledWith({
            key: `documents/${tenant.id}/${preparedDocumentId}/original`,
            content: file,
        });

        const [prepareCommand, finishCommand] = commands;
        if (
            prepareCommand?.operation.name !== documentOperationNames.prepareRegistration ||
            finishCommand?.operation.name !== documentOperationNames.finishRegistration
        ) {
            throw new Error('Expected Prepare followed by Finish.');
        }

        expect(prepareCommand.operation).toMatchObject({
            schemaVersion: 1,
            intent: prepareIntent,
            actor,
            tenant,
            aggregate: {
                type: documentName,
            },
            subject: {
                type: documentName,
            },
            payload: {
                contentHash: createHash('sha256').update(file).digest('hex'),
            },
        });
        expect(prepareCommand.operation.payload.documentId).not.toBe(preparedDocumentId);
        expect(finishCommand.operation).toEqual({
            name: documentOperationNames.finishRegistration,
            schemaVersion: 1,
            intent: finishIntent,
            actor,
            tenant,
            subject: {
                type: documentName,
                id: preparedDocumentId,
            },
            aggregate: {
                type: documentName,
                id: preparedDocumentId,
            },
            payload: {
                outcome: 'registered',
                storageReference: 'opaque-storage-reference',
            },
        });
        expect(prepareCommand.context).toEqual({ correlationId: context.correlationId });
        expect(finishCommand.context).toEqual({ correlationId: context.correlationId });
        expect(deriveIntent).toHaveBeenNthCalledWith(1, {
            parent: { id: context.intent.id },
            slot: 'prepare-registration',
        });
        expect(deriveIntent).toHaveBeenNthCalledWith(2, {
            parent: { id: context.intent.id },
            slot: 'finish-registration',
        });
    });

    it('DOC-REG-004 records storage failure through Finish and returns FAILED', async () => {
        const preparedDocumentId = 'prepared-document-id' as DocumentId;
        const commands: RegistrationCommand[] = [];
        const execute = jest.fn(async (command: RegistrationCommand) => {
            commands.push(command);

            if (command.operation.name === documentOperationNames.prepareRegistration) {
                return {
                    status: 'success' as const,
                    data: {
                        kind: 'created' as const,
                        document: {
                            id: preparedDocumentId,
                            status: DocumentRegistrationStatus.Pending,
                        },
                    },
                    events: [],
                };
            }

            return {
                status: 'success' as const,
                data: {
                    id: preparedDocumentId,
                    status: DocumentRegistrationStatus.Failed,
                },
                events: [],
            };
        });
        const storageFailure = new Error('storage unavailable');
        const put: ObjectStorage['put'] = async () => {
            throw storageFailure;
        };
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(put),
            actor,
            tenant,
        );

        const result = await useCase.execute({ file: Uint8Array.from([1, 2, 3]) }, context);

        expect(result).toEqual({
            id: preparedDocumentId,
            status: DocumentRegistrationStatus.Failed,
            duplicate: false,
        });
        expect(execute).toHaveBeenCalledTimes(2);

        const finishCommand = commands[1];
        if (finishCommand?.operation.name !== documentOperationNames.finishRegistration) {
            throw new Error('Expected Finish after storage failure.');
        }

        expect(finishCommand.operation.payload).toEqual({
            outcome: 'failed',
            failureReason: storageFailure.message,
        });
    });

    it('DOC-REG-001 propagates Prepare failure without calling storage', async () => {
        const failure = new Error('initial registration failed');
        const execute = jest.fn(async (): Promise<never> => {
            throw failure;
        });
        const put = jest.fn(async () => ({ reference: 'unused' }));
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(put),
            actor,
            tenant,
        );

        await expect(useCase.execute({ file: Uint8Array.from([1]) }, context)).rejects.toBe(failure);
        expect(execute).toHaveBeenCalledTimes(1);
        expect(put).not.toHaveBeenCalled();
    });

    it.each([
        DocumentRegistrationStatus.Pending,
        DocumentRegistrationStatus.Registered,
        DocumentRegistrationStatus.Failed,
    ])('DOC-REG-002 returns an existing %s duplicate without storage or Finish', async (status) => {
        const existingDocumentId = 'existing-document-id' as DocumentId;
        const execute = jest.fn(async () => ({
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
        const put = jest.fn(async () => ({ reference: 'unused' }));
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(put),
            actor,
            tenant,
        );

        const result = await useCase.execute({ file: Uint8Array.from([4, 5, 6]) }, context);

        expect(result).toEqual({
            id: existingDocumentId,
            status,
            duplicate: true,
        });
        expect(execute).toHaveBeenCalledTimes(1);
        expect(put).not.toHaveBeenCalled();
        expect(deriveIntent).toHaveBeenCalledTimes(1);
    });

    it('DOC-REG-004 propagates Finish failure instead of returning success', async () => {
        const preparedDocumentId = 'prepared-document-id' as DocumentId;
        const finishFailure = new Error('finish registration failed');
        let calls = 0;
        const execute = jest.fn(async () => {
            calls += 1;

            if (calls === 1) {
                return {
                    status: 'success' as const,
                    data: {
                        kind: 'created' as const,
                        document: {
                            id: preparedDocumentId,
                            status: DocumentRegistrationStatus.Pending,
                        },
                    },
                    events: [],
                };
            }

            throw finishFailure;
        });
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(),
            actor,
            tenant,
        );

        await expect(useCase.execute({ file: Uint8Array.from([9]) }, context)).rejects.toBe(
            finishFailure,
        );
        expect(execute).toHaveBeenCalledTimes(2);
    });
});

// DOC-REG-003 remains owned by the PostgreSQL concurrency evidence in
// packages/documents/src/lib/persistence/typeorm/typeorm-document-persistence.integration.spec.ts.
