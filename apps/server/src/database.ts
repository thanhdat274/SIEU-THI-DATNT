import { ServiceUnavailableException } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import { readRuntimeConfig } from './runtime-config.js';

let client: MongoClient | undefined;
let connecting: Promise<MongoClient> | undefined;

/** Reuse one pool; failed connection attempts can be retried without exposing URI. */
export async function connectDatabase() {
  const settings = readRuntimeConfig();
  if (!settings.mongoUri) throw new ServiceUnavailableException('MONGO_URI is not configured');
  if (!connecting) {
    const candidate = new MongoClient(settings.mongoUri, {
      serverSelectionTimeoutMS: 8000, maxPoolSize: 5, minPoolSize: 0,
    });
    connecting = candidate.connect().then(() => {
      client = candidate;
      return candidate;
    }).catch(async (err: unknown) => {
      connecting = undefined;
      await candidate.close();
      // Ghi nguyên nhân thật (tên lỗi + thông điệp, đã gỡ chuỗi kết nối) để chẩn đoán trên log server.
      const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('[mongo] connect failed:', reason.replace(/mongodb(\+srv)?:\/\/\S+/gi, 'mongodb://<redacted>'));
      throw new ServiceUnavailableException('MongoDB connection failed; check configuration and network access');
    });
  }
  const activeClient = await connecting;
  return activeClient.db(settings.databaseName);
}

export async function closeDatabase() {
  const pending = connecting;
  connecting = undefined;
  const active = client ?? await pending?.catch(() => undefined);
  client = undefined;
  await active?.close();
}
