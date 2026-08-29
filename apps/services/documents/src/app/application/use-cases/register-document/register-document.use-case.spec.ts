import {
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
import type { Runner } from '@event-driven-platform/runner';

import type { RegisterDocumentUseCaseContext } from './register-document.use-case.context';
import { RegisterDocumentUseCase } from './register-document.use-case';

jest.mock('@event-driven-platform/intent', () => ({
    IntentFactory: {
        derive: jest.fn(() => ({
            id: 'child-intent-id',
            key: 'child-intent-key',
        })),
    },
}));

type RegistrationCommand = {
    readonly operation: PrepareDocumentRegistrationOperation | FinishDocumentRegistrationOperation;
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
    actor,
    tenant,
} satisfies RegisterDocumentUseCaseContext;

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

describe('RegisterDocumentUseCase', () => {
    it('DOC-REG-001/DOC-REG-004 stores a new file and returns REGISTERED after recording success', async () => {
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
        );

        const result = await useCase.execute({ file }, context);

        expect(result).toEqual({
            id: preparedDocumentId,
            status: DocumentRegistrationStatus.Registered,
            duplicate: false,
        });
        expect(put).toHaveBeenCalledTimes(1);

        const finishCommand = commands[1];
        if (finishCommand?.operation.name !== documentOperationNames.finishRegistration) {
            throw new Error('Expected registration success to be recorded before returning.');
        }

        expect(finishCommand.operation.payload).toEqual({
            outcome: 'registered',
            storageReference: 'opaque-storage-reference',
        });
    });

    it('DOC-REG-001/DOC-REG-004 records storage failure and returns FAILED', async () => {
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
        );

        const result = await useCase.execute({ file: Uint8Array.from([1, 2, 3]) }, context);

        expect(result).toEqual({
            id: preparedDocumentId,
            status: DocumentRegistrationStatus.Failed,
            duplicate: false,
        });

        const finishCommand = commands[1];
        if (finishCommand?.operation.name !== documentOperationNames.finishRegistration) {
            throw new Error('Expected registration failure to be recorded before returning.');
        }

        expect(finishCommand.operation.payload).toEqual({
            outcome: 'failed',
            failureReason: storageFailure.message,
        });
    });

    it('DOC-REG-001 does not store a file when initial registration fails', async () => {
        const failure = new Error('initial registration failed');
        const execute = jest.fn(async (): Promise<never> => {
            throw failure;
        });
        const put = jest.fn(async () => ({ reference: 'unused' }));
        const useCase = new RegisterDocumentUseCase(
            createRunner(execute),
            createObjectStorage(put),
        );

        await expect(useCase.execute({ file: Uint8Array.from([1]) }, context)).rejects.toBe(failure);
        expect(put).not.toHaveBeenCalled();
    });

    it.each([
        DocumentRegistrationStatus.Pending,
        DocumentRegistrationStatus.Registered,
        DocumentRegistrationStatus.Failed,
    ])('DOC-REG-002 returns an existing %s duplicate without storing the file again', async (status) => {
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
        );

        const result = await useCase.execute({ file: Uint8Array.from([4, 5, 6]) }, context);

        expect(result).toEqual({
            id: existingDocumentId,
            status,
            duplicate: true,
        });
        expect(put).not.toHaveBeenCalled();
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('DOC-REG-004 does not return success when recording the final outcome fails', async () => {
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
        );

        await expect(useCase.execute({ file: Uint8Array.from([9]) }, context)).rejects.toBe(
            finishFailure,
        );
    });
});

// DOC-REG-003 remains owned by the PostgreSQL concurrency evidence in
// packages/documents/src/lib/persistence/typeorm/typeorm-document-persistence.integration.spec.ts.
