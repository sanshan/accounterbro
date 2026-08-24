export interface ObjectStoragePutRequest {
    readonly key: string;
    readonly content: Uint8Array;
}

export interface ObjectStoragePutResult {
    readonly reference: string;
}

export abstract class ObjectStorage {
    public abstract put(request: ObjectStoragePutRequest): Promise<ObjectStoragePutResult>;
}
