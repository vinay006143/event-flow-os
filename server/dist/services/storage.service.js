import fs from 'fs/promises';
import path from 'path';
import mongoose, { Schema } from 'mongoose';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.csv']);
function sanitizeKey(key) {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.includes('..') || !normalized) {
        throw new BadRequestError('Invalid storage object key');
    }
    const ext = path.extname(normalized).toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
        throw new BadRequestError(`Disallowed file extension: ${ext}`);
    }
    return normalized;
}
class LocalStorageAdapter {
    baseDir;
    constructor(baseDir) {
        this.baseDir = path.resolve(baseDir);
    }
    resolvePath(key) {
        const safeKey = sanitizeKey(key);
        const full = path.resolve(this.baseDir, safeKey);
        if (!full.startsWith(this.baseDir)) {
            throw new BadRequestError('Invalid storage path traversal attempt');
        }
        return full;
    }
    async putObject(key, body, _contentType) {
        const full = this.resolvePath(key);
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, body);
        return sanitizeKey(key);
    }
    async getObject(key) {
        const full = this.resolvePath(key);
        return fs.readFile(full);
    }
    async getSignedUrl(_key) {
        return null;
    }
    async deleteObject(key) {
        const full = this.resolvePath(key);
        await fs.unlink(full).catch(() => undefined);
    }
}
class S3StorageAdapter {
    client;
    bucket;
    constructor() {
        this.bucket = env.S3_BUCKET;
        this.client = new S3Client({
            region: env.S3_REGION,
            ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
            forcePathStyle: env.S3_FORCE_PATH_STYLE,
            credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
                ? {
                    accessKeyId: env.S3_ACCESS_KEY_ID,
                    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
                }
                : undefined,
        });
    }
    async putObject(key, body, contentType) {
        const safeKey = sanitizeKey(key);
        await this.client.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: safeKey,
            Body: body,
            ContentType: contentType,
        }));
        return safeKey;
    }
    async getObject(key) {
        const safeKey = sanitizeKey(key);
        const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }));
        const bytes = await out.Body?.transformToByteArray();
        return Buffer.from(bytes ?? []);
    }
    async getSignedUrl(key, expiresInSeconds = 900) {
        const safeKey = sanitizeKey(key);
        return awsGetSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }), { expiresIn: expiresInSeconds });
    }
    async deleteObject(key) {
        const safeKey = sanitizeKey(key);
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey }));
    }
}
const storedAssetSchema = new Schema({
    key: { type: String, required: true, unique: true, index: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    sizeBytes: { type: Number, required: true },
}, { timestamps: true });
const StoredAssetModel = mongoose.models.StoredAsset ||
    mongoose.model('StoredAsset', storedAssetSchema, 'stored_assets');
export class MongoStorageAdapter {
    async putObject(key, body, contentType) {
        const safeKey = sanitizeKey(key);
        await StoredAssetModel.findOneAndUpdate({ key: safeKey }, { key: safeKey, contentType, data: body, sizeBytes: body.length }, { upsert: true, new: true });
        return safeKey;
    }
    async getObject(key) {
        const safeKey = sanitizeKey(key);
        const doc = await StoredAssetModel.findOne({ key: safeKey }).lean();
        if (!doc || !doc.data) {
            throw new NotFoundError('Stored asset not found in MongoDB');
        }
        if (Buffer.isBuffer(doc.data))
            return doc.data;
        if (doc.data instanceof Uint8Array)
            return Buffer.from(doc.data);
        if (doc.data.buffer)
            return Buffer.from(doc.data.buffer);
        throw new NotFoundError('Invalid stored asset buffer in MongoDB');
    }
    async getSignedUrl(_key) {
        return null;
    }
    async deleteObject(key) {
        const safeKey = sanitizeKey(key);
        await StoredAssetModel.deleteOne({ key: safeKey });
    }
}
export const storageService = env.STORAGE_PROVIDER_MODE === 's3'
    ? new S3StorageAdapter()
    : env.STORAGE_PROVIDER_MODE === 'mongodb'
        ? new MongoStorageAdapter()
        : new LocalStorageAdapter(env.LOCAL_STORAGE_PATH);
//# sourceMappingURL=storage.service.js.map