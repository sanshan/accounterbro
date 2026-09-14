import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { DocumentRegisteredEventContract } from '@accounterbro/documents';
import {
    getEventValueSubject,
    provisionEventContractSchema,
    renderEventPayloadAvroSchema,
    SchemaRegistryAvroEventCodec,
} from '@accounterbro/runtime-messaging/redpanda';

const SCHEMA_ID = 17;
const SUBJECT = 'documents.registered-value';

interface RegistryRequest {
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly body: unknown;
}

async function withSchemaRegistryStub<T>(
    run: (host: string, requests: RegistryRequest[]) => Promise<T>,
): Promise<T> {
    const requests: RegistryRequest[] = [];
    const schema = renderEventPayloadAvroSchema(DocumentRegisteredEventContract);
    const schemaJson = JSON.stringify(schema);
    let subjectExists = false;

    const server = createServer((request, response) => {
        void handleRegistryRequest(
            request,
            response,
            requests,
            schemaJson,
            () => subjectExists,
            () => {
                subjectExists = true;
            },
        ).catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            writeJson(response, 500, { message });
        });
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address() as AddressInfo;

    try {
        return await run(`http://127.0.0.1:${address.port}`, requests);
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error === undefined) {
                    resolve();
                } else {
                    reject(error);
                }
            });
        });
    }
}

async function handleRegistryRequest(
    request: IncomingMessage,
    response: ServerResponse,
    requests: RegistryRequest[],
    schemaJson: string,
    subjectExists: () => boolean,
    markSubjectExists: () => void,
): Promise<void> {
    const body = await readJsonBody(request);
    requests.push({ method: request.method, url: request.url, body });

    if (request.method === 'GET' && request.url === `/config/${SUBJECT}`) {
        if (!subjectExists()) {
            writeJson(response, 404, { error_code: 40401, message: 'Subject not found' });
            return;
        }

        writeJson(response, 200, { compatibilityLevel: 'BACKWARD_TRANSITIVE' });
        return;
    }

    if (request.method === 'POST' && request.url === `/subjects/${SUBJECT}/versions`) {
        markSubjectExists();
        writeJson(response, 200, { id: SCHEMA_ID });
        return;
    }

    if (request.method === 'PUT' && request.url === `/config/${SUBJECT}`) {
        writeJson(response, 200, { compatibility: 'BACKWARD_TRANSITIVE' });
        return;
    }

    if (request.method === 'POST' && request.url === `/subjects/${SUBJECT}`) {
        writeJson(response, 200, { id: SCHEMA_ID });
        return;
    }

    if (request.method === 'GET' && request.url === `/schemas/ids/${SCHEMA_ID}`) {
        writeJson(response, 200, { schema: schemaJson });
        return;
    }

    writeJson(response, 404, { error_code: 40403, message: 'Schema not found' });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
        return undefined;
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.statusCode = statusCode;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(body));
}

describe('DocumentRegistered Redpanda Avro boundary', () => {
    it('pre-registers the EDP-rendered schema and round-trips a Registry-framed payload', async () => {
        await withSchemaRegistryStub(async (host, requests) => {
            const expectedSchema = renderEventPayloadAvroSchema(DocumentRegisteredEventContract);
            const provisioned = await provisionEventContractSchema({
                contract: DocumentRegisteredEventContract,
                schemaRegistry: { host },
            });

            expect(getEventValueSubject(DocumentRegisteredEventContract.name)).toBe(SUBJECT);
            expect(provisioned).toEqual({ subject: SUBJECT, schemaId: SCHEMA_ID });

            const registration = requests.find(
                (request) =>
                    request.method === 'POST' && request.url === `/subjects/${SUBJECT}/versions`,
            );
            expect(registration?.body).toEqual({ schema: JSON.stringify(expectedSchema) });
            expect(
                requests.find(
                    (request) => request.method === 'PUT' && request.url === `/config/${SUBJECT}`,
                )?.body,
            ).toEqual({ compatibility: 'BACKWARD_TRANSITIVE' });

            requests.length = 0;

            const payload = {
                documentId: 'document-1',
                storageReference: 'objects/document-1.pdf',
            };
            const writer = new SchemaRegistryAvroEventCodec({ host });
            const value = await writer.encode(DocumentRegisteredEventContract, payload);

            expect(value[0]).toBe(0);
            expect(value.readUInt32BE(1)).toBe(SCHEMA_ID);

            const reader = new SchemaRegistryAvroEventCodec({ host });
            await expect(reader.decode(value)).resolves.toEqual(payload);

            expect(
                requests.some(
                    (request) =>
                        request.method === 'POST' &&
                        request.url === `/subjects/${SUBJECT}/versions`,
                ),
            ).toBe(false);
            expect(requests.some((request) => request.method === 'PUT')).toBe(false);
            expect(
                requests.filter(
                    (request) => request.method === 'GET' && request.url === `/schemas/ids/${SCHEMA_ID}`,
                ),
            ).toHaveLength(2);
        });
    });
});
