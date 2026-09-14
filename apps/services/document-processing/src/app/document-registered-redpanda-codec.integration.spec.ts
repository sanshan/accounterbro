import { DocumentRegisteredEventContract } from '@accounterbro/documents';
import {
    getEventValueSubject,
    provisionEventContractSchema,
    renderEventPayloadAvroSchema,
    SchemaRegistryAvroEventCodec,
    type SchemaRegistryAvroCodecClient,
    type SchemaRegistrySchemaProvisioningClient,
} from '@accounterbro/runtime-messaging/redpanda';

const SCHEMA_ID = 17;
const SUBJECT = 'documents.registered-value';
const ENCODED_VALUE = Buffer.from('registry-framed-value-fixture');
const UNUSED_REGISTRY_CONNECTION = { host: 'http://schema-registry.invalid' };

describe('DocumentRegistered Schema Registry boundary', () => {
    it('derives the EDP schema and keeps Registry mutation in explicit provisioning', async () => {
        const expectedSchema = renderEventPayloadAvroSchema(DocumentRegisteredEventContract);
        const payload = {
            documentId: 'document-1',
            storageReference: 'objects/document-1.pdf',
        };

        let registrationCount = 0;
        let registeredSchema: unknown;
        let registrationOptions: unknown;
        let lookupSubject: string | undefined;
        let lookupSchema: unknown;
        let encodedSchemaId: number | undefined;
        let encodedPayload: unknown;
        let decodedValue: Buffer | undefined;

        const registryClient: SchemaRegistryAvroCodecClient & SchemaRegistrySchemaProvisioningClient = {
            async register(schema, options) {
                registrationCount += 1;
                registeredSchema = schema;
                registrationOptions = options;
                return { id: SCHEMA_ID };
            },
            async getRegistryIdBySchema(subject, schema) {
                lookupSubject = subject;
                lookupSchema = schema;
                return SCHEMA_ID;
            },
            async encode(schemaId, value) {
                encodedSchemaId = schemaId;
                encodedPayload = value;
                return ENCODED_VALUE;
            },
            async decode(value) {
                decodedValue = value;
                return payload;
            },
        };

        const provisioned = await provisionEventContractSchema(
            {
                contract: DocumentRegisteredEventContract,
                schemaRegistry: UNUSED_REGISTRY_CONNECTION,
            },
            registryClient,
        );

        expect(getEventValueSubject(DocumentRegisteredEventContract.name)).toBe(SUBJECT);
        expect(provisioned).toEqual({ subject: SUBJECT, schemaId: SCHEMA_ID });
        expect(registeredSchema).toEqual(expectedSchema);
        expect(registrationOptions).toEqual({
            subject: SUBJECT,
            compatibility: 'BACKWARD_TRANSITIVE',
            updateConfig: true,
        });

        const codec = new SchemaRegistryAvroEventCodec(
            UNUSED_REGISTRY_CONNECTION,
            registryClient,
        );
        const encoded = await codec.encode(DocumentRegisteredEventContract, payload);

        expect(encoded).toEqual(ENCODED_VALUE);
        expect(lookupSubject).toBe(SUBJECT);
        expect(lookupSchema).toEqual(expectedSchema);
        expect(encodedSchemaId).toBe(SCHEMA_ID);
        expect(encodedPayload).toEqual(payload);

        await expect(codec.decode(encoded)).resolves.toEqual(payload);
        expect(decodedValue).toEqual(ENCODED_VALUE);
        expect(registrationCount).toBe(1);
    });
});
