import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let memoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(uriOverride?: string): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  let uri = uriOverride ?? env.MONGODB_URI;

  if (!uriOverride && (env.USE_IN_MEMORY_MONGO || env.NODE_ENV === 'test')) {
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: env.MONGODB_DB_NAME },
    });
    uri = memoryServer.getUri();
    logger.warn({ uri }, 'Using in-memory MongoDB server (development/test fallback)');
  }

  await mongoose.connect(uri, {
    dbName: env.MONGODB_DB_NAME,
    autoIndex: true,
  });

  logger.info({ dbName: env.MONGODB_DB_NAME }, 'Connected to MongoDB');
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
