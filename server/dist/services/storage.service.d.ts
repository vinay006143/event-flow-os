export interface StorageAdapter {
    putObject(key: string, body: Buffer, contentType: string): Promise<string>;
    getObject(key: string): Promise<Buffer>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
    deleteObject(key: string): Promise<void>;
}
export declare class MongoStorageAdapter implements StorageAdapter {
    putObject(key: string, body: Buffer, contentType: string): Promise<string>;
    getObject(key: string): Promise<Buffer>;
    getSignedUrl(_key: string): Promise<string | null>;
    deleteObject(key: string): Promise<void>;
}
export declare const storageService: StorageAdapter;
//# sourceMappingURL=storage.service.d.ts.map