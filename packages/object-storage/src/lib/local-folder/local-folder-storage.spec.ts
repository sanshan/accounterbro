import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { LocalFolderStorage } from './local-folder-storage.js';

describe('LocalFolderStorage', () => {
    let cleanupDirectory: string | undefined;

    afterEach(async () => {
        if (cleanupDirectory !== undefined) {
            await rm(cleanupDirectory, { recursive: true, force: true });
        }
    });

    async function createStorage(): Promise<{
        readonly storage: LocalFolderStorage;
        readonly rootDirectory: string;
    }> {
        const rootDirectory = await mkdtemp(join(tmpdir(), 'accounterbro-object-storage-'));
        cleanupDirectory = rootDirectory;

        return {
            storage: new LocalFolderStorage({ rootDirectory }),
            rootDirectory,
        };
    }

    it('stores exact bytes below the configured root and creates parent directories', async () => {
        const { storage, rootDirectory } = await createStorage();
        const content = new Uint8Array([0, 1, 2, 3, 255]);

        const result = await storage.put({
            key: 'documents/document-1/original.bin',
            content,
        });

        expect(result.reference).toBe('documents/document-1/original.bin');
        await expect(
            readFile(join(rootDirectory, 'documents', 'document-1', 'original.bin')),
        ).resolves.toEqual(Buffer.from(content));
    });

    it('reads exact bytes using the opaque reference returned by put', async () => {
        const { storage } = await createStorage();
        const content = new Uint8Array([0, 1, 2, 3, 255]);
        const stored = await storage.put({
            key: 'documents/document-1/original.bin',
            content,
        });

        await expect(storage.get({ reference: stored.reference })).resolves.toEqual({
            content: Buffer.from(content),
        });
    });

    it('targets the same stored object when the same key is reused', async () => {
        const { storage, rootDirectory } = await createStorage();
        const key = 'documents/document-1/original.bin';

        const first = await storage.put({ key, content: new Uint8Array([1]) });
        const second = await storage.put({ key, content: new Uint8Array([2]) });

        expect(second.reference).toBe(first.reference);
        await expect(
            readFile(join(rootDirectory, 'documents', 'document-1', 'original.bin')),
        ).resolves.toEqual(Buffer.from([2]));
    });

    it.each([
        '../outside.bin',
        'documents/../../outside.bin',
        '/absolute.bin',
        'documents\\..\\outside.bin',
        'C:/outside.bin',
    ])('rejects an unsafe object key: %s', async (key) => {
        const { storage } = await createStorage();

        await expect(storage.put({ key, content: new Uint8Array([1]) })).rejects.toThrow(
            'Object storage key',
        );
    });

    it.each([
        '../outside.bin',
        'documents/../../outside.bin',
        '/absolute.bin',
        'documents\\..\\outside.bin',
        'C:/outside.bin',
    ])('rejects an unsafe object reference: %s', async (reference) => {
        const { storage } = await createStorage();

        await expect(storage.get({ reference })).rejects.toThrow('Object storage key');
    });
});
