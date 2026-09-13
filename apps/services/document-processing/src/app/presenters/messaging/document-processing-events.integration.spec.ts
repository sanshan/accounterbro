import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { DocumentExtractor } from '@accounterbro/document-extraction';
import { DocumentProcessingStatus } from '@accounterbro/document-processing';
import { DocumentRegisteredEventContract } from '@accounterbro/documents';
import { ObjectStorage } from '@accounterbro/object-storage';
import { EventHandlerRegistry, EventIngress } from '@accounterbro/runtime-messaging';
import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ZodError } from 'zod';

import { AppModule } from '../../app.module';
import { AppDataSource } from '../../infrastructure/persistence/typeorm/data-source';

class FixtureObjectStorage extends ObjectStorage {
    public getCalls = 0;

    public async put(): Promise<never> {
        throw new Error('ObjectStorage.put is not used by document processing.');
    }

    public async get(): Promise<{ readonly content: Uint8Array }> {
        this.getCalls += 1;
        return { content: new TextEncoder().encode('fixture document') };
    }

    public reset(): void {
        this.getCalls = 0;
    }
}

class FixtureDocumentExtractor extends DocumentExtractor {
    public extractCalls = 0;

    public async extract(): Promise<{ readonly text: string }> {
        this.extractCalls += 1;
        return { text: 'fixture extracted text' };
    }

    public reset(): void {
        this.extractCalls = 0;
    }
}

interface ProcessingRow {
    readonly tenant_id: string;
    readonly document_id: string;
    readonly status: string;
    readonly extracted_text: string | null;
}

interface UseCaseExecutionRow {
    readonly intent_id: string;
    readonly parent_intent_id: string | null;
    readonly correlation_id: string;
    readonly status: string;
}

interface ExecutionLogRow {
    readonly operation_name: string;
    readonly tenant_type: string;
    readonly tenant_id: string;
    readonly actor_type: string;
    readonly actor_id: string;
    readonly parent_intent_id: string | null;
}

function createEnvelope(overrides: Readonly<Record<string, unknown>> = {}) {
    const documentId = randomUUID();

    return {
        eventId: `event-${randomUUID()}`,
        eventName: DocumentRegisteredEventContract.name,
        schemaVersion: DocumentRegisteredEventContract.schemaVersion,
        occurredAt: '2026-09-13T20:00:00.000Z',
        intentId: `documents-register-${randomUUID()}`,
        correlationId: `correlation-${randomUUID()}`,
        operationName: 'documents.register',
        tenant: { type: 'tenant', id: `tenant-${randomUUID()}` },
        actor: {
            type: 'service',
            id: `documents-service-${randomUUID()}`,
            origin: {
                ipAddress: null,
                countryCode: 'RS',
                region: null,
                city: null,
                latitude: null,
                longitude: null,
                timezone: null,
                environment: 'test',
                host: null,
                instance: null,
            },
        },
        subject: { type: 'document', id: documentId },
        aggregate: { type: 'document', id: documentId },
        payload: {
            documentId,
            storageReference: `fixture://${documentId}`,
        },
        ...overrides,
    };
}

describe('Document Processing event ingress composition', () => {
    const objectStorage = new FixtureObjectStorage();
    const documentExtractor = new FixtureDocumentExtractor();
    let moduleRef: TestingModule;
    let dataSource: DataSource;
    let ingress: EventIngress;

    beforeAll(async () => {
        await AppDataSource.initialize();
        try {
            await AppDataSource.runMigrations();
        } finally {
            await AppDataSource.destroy();
        }

        moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ObjectStorage)
            .useValue(objectStorage)
            .overrideProvider(DocumentExtractor)
            .useValue(documentExtractor)
            .compile();
        await moduleRef.init();

        dataSource = moduleRef.get(DataSource);
        ingress = moduleRef.get(EventIngress);
    });

    beforeEach(() => {
        objectStorage.reset();
        documentExtractor.reset();
    });

    afterAll(async () => {
        await moduleRef.close();
    });

    it('processes DocumentRegistered through the sealed production registry and durably replays the same event', async () => {
        const registry = moduleRef.get(EventHandlerRegistry);
        const envelope = createEnvelope();
        const payload = envelope.payload as { readonly documentId: string };
        const tenant = envelope.tenant as { readonly id: string };
        const actor = envelope.actor as { readonly id: string };

        expect(registry.isSealed).toBe(true);
        expect(
            registry.resolve({
                eventName: DocumentRegisteredEventContract.name,
                schemaVersion: DocumentRegisteredEventContract.schemaVersion,
            }),
        ).toMatchObject({ status: 'resolved' });

        const first = await ingress.dispatch(envelope);

        expect(first).toMatchObject({
            status: 'handled',
            result: {
                documentId: payload.documentId,
                status: DocumentProcessingStatus.Completed,
                extractedText: 'fixture extracted text',
            },
        });
        expect(objectStorage.getCalls).toBe(1);
        expect(documentExtractor.extractCalls).toBe(1);

        const processingRows = await dataSource.query<ProcessingRow[]>(
            `SELECT tenant_id, document_id, status, extracted_text
             FROM document_processing
             WHERE document_id = $1`,
            [payload.documentId],
        );
        expect(processingRows).toEqual([
            {
                tenant_id: tenant.id,
                document_id: payload.documentId,
                status: DocumentProcessingStatus.Completed,
                extracted_text: 'fixture extracted text',
            },
        ]);

        const useCaseExecutions = await dataSource.query<UseCaseExecutionRow[]>(
            `SELECT intent_id, parent_intent_id, correlation_id, status
             FROM use_case_execution
             WHERE correlation_id = $1`,
            [envelope.correlationId],
        );
        expect(useCaseExecutions).toHaveLength(1);
        const useCaseExecution = useCaseExecutions[0];
        expect(useCaseExecution).toBeDefined();
        expect(useCaseExecution).toMatchObject({
            parent_intent_id: envelope.intentId,
            correlation_id: envelope.correlationId,
            status: 'completed',
        });

        const operationExecutions = await dataSource.query<ExecutionLogRow[]>(
            `SELECT
                 operation_name,
                 tenant_type,
                 tenant_id,
                 actor_type,
                 actor_id,
                 operation #>> '{intent,parent,id}' AS parent_intent_id
             FROM execution_log
             WHERE actor_id = $1
             ORDER BY operation_name`,
            [actor.id],
        );
        expect(operationExecutions).toHaveLength(2);
        expect(operationExecutions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    operation_name: 'document-processing.prepare-processing',
                    tenant_type: 'tenant',
                    tenant_id: tenant.id,
                    actor_type: 'service',
                    actor_id: actor.id,
                    parent_intent_id: useCaseExecution?.intent_id,
                }),
                expect.objectContaining({
                    operation_name: 'document-processing.finish-processing',
                    tenant_type: 'tenant',
                    tenant_id: tenant.id,
                    actor_type: 'service',
                    actor_id: actor.id,
                    parent_intent_id: useCaseExecution?.intent_id,
                }),
            ]),
        );

        const replay = await ingress.dispatch(envelope);

        expect(replay).toEqual(first);
        expect(objectStorage.getCalls).toBe(1);
        expect(documentExtractor.extractCalls).toBe(1);
        await expect(
            dataSource.query<UseCaseExecutionRow[]>(
                `SELECT intent_id, parent_intent_id, correlation_id, status
                 FROM use_case_execution
                 WHERE correlation_id = $1`,
                [envelope.correlationId],
            ),
        ).resolves.toHaveLength(1);
    });

    it('rejects an invalid wire DocumentId before UseCase execution', async () => {
        const envelope = createEnvelope({
            payload: {
                documentId: 'not-a-uuid',
                storageReference: 'fixture://invalid',
            },
        });

        await expect(ingress.dispatch(envelope)).rejects.toBeInstanceOf(ZodError);
        expect(objectStorage.getCalls).toBe(0);
        expect(documentExtractor.extractCalls).toBe(0);
        await expect(
            dataSource.query<UseCaseExecutionRow[]>(
                'SELECT intent_id, parent_intent_id, correlation_id, status FROM use_case_execution WHERE correlation_id = $1',
                [envelope.correlationId],
            ),
        ).resolves.toHaveLength(0);
    });

    it('keeps invalid and unhandled envelopes away from the service UseCase', async () => {
        const invalid = createEnvelope({ payload: { storageReference: 'fixture://missing-id' } });
        const unhandled = createEnvelope({ eventName: 'documents.unknown' });

        await expect(ingress.dispatch(invalid)).resolves.toMatchObject({ status: 'invalid' });
        await expect(ingress.dispatch(unhandled)).resolves.toMatchObject({ status: 'unhandled' });
        expect(objectStorage.getCalls).toBe(0);
        expect(documentExtractor.extractCalls).toBe(0);

        for (const correlationId of [invalid.correlationId, unhandled.correlationId]) {
            await expect(
                dataSource.query<UseCaseExecutionRow[]>(
                    'SELECT intent_id, parent_intent_id, correlation_id, status FROM use_case_execution WHERE correlation_id = $1',
                    [correlationId],
                ),
            ).resolves.toHaveLength(0);
        }
    });
});
