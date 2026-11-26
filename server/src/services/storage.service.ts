import fs from 'fs/promises';
import path from 'path';
import mongoose, { Schema } from 'mongoose';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export interface StorageAdapter {
  putObject(key: string, body: Buffer, contentType: string): Promise<string>;
  getObject(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
  deleteObject(key: string): Promise<void>;
}

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.csv']);

function sanitizeKey(key: string): string {
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

class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolvePath(key: string): string {
    const safeKey = sanitizeKey(key);
    const full = path.resolve(this.baseDir, safeKey);
    if (!full.startsWith(this.baseDir)) {
      throw new BadRequestError('Invalid storage path traversal attempt');
    }
    return full;
  }

  async putObject(key: string, body: Buffer, _contentType: string): Promise<string> {
    const full = this.resolvePath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return sanitizeKey(key);
  }

  async getObject(key: string): Promise<Buffer> {
    const full = this.resolvePath(key);
    return fs.readFile(full);
  }

  async getSignedUrl(_key: string): Promise<string | null> {
    return null;
  }

  async deleteObject(key: string): Promise<void> {
    const full = this.resolvePath(key);
    await fs.unlink(full).catch(() => undefined);
  }
}

class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.S3_BUCKET;
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    const safeKey = sanitizeKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey,
        Body: body,
        ContentType: contentType,
      }),
    );
    return safeKey;
  }

  async getObject(key: string): Promise<Buffer> {
    const safeKey = sanitizeKey(key);
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }));
    const bytes = await out.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string | null> {
    const safeKey = sanitizeKey(key);
    return awsGetSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: safeKey }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteObject(key: string): Promise<void> {
    const safeKey = sanitizeKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey }));
  }
}

interface IStoredAsset extends mongoose.Document {
  key: string;
  contentType: string;
  data: Buffer;
  sizeBytes: number;
}

const storedAssetSchema = new Schema<IStoredAsset>(
  {
    key: { type: String, required: true, unique: true, index: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true },
);

const StoredAssetModel: mongoose.Model<IStoredAsset> =
  (mongoose.models.StoredAsset as mongoose.Model<IStoredAsset> | undefined) ||
  mongoose.model<IStoredAsset>('StoredAsset', storedAssetSchema, 'stored_assets');

export class MongoStorageAdapter implements StorageAdapter {
  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    const safeKey = sanitizeKey(key);
    await StoredAssetModel.findOneAndUpdate(
      { key: safeKey },
      { key: safeKey, contentType, data: body, sizeBytes: body.length },
      { upsert: true, new: true },
    );
    return safeKey;
  }

  async getObject(key: string): Promise<Buffer> {
    const safeKey = sanitizeKey(key);
    const doc = await StoredAssetModel.findOne({ key: safeKey }).lean<{ data: Buffer | { buffer?: Uint8Array } }>();
    if (!doc || !doc.data) {
      throw new NotFoundError('Stored asset not found in MongoDB');
    }
    if (Buffer.isBuffer(doc.data)) return doc.data;
    if (doc.data instanceof Uint8Array) return Buffer.from(doc.data);
    if (doc.data.buffer) return Buffer.from(doc.data.buffer);
    throw new NotFoundError('Invalid stored asset buffer in MongoDB');
  }

  async getSignedUrl(_key: string): Promise<string | null> {
    return null;
  }

  async deleteObject(key: string): Promise<void> {
    const safeKey = sanitizeKey(key);
    await StoredAssetModel.deleteOne({ key: safeKey });
  }
}

export const storageService: StorageAdapter =
  env.STORAGE_PROVIDER_MODE === 's3'
    ? new S3StorageAdapter()
    : env.STORAGE_PROVIDER_MODE === 'mongodb'
      ? new MongoStorageAdapter()
      : new LocalStorageAdapter(env.LOCAL_STORAGE_PATH);
