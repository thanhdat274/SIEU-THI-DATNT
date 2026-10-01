import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });

/** Database name from the URI path (mongodb://host/<name>?...), if any. */
export function databaseNameFromUri(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]*\/([^?]+)/.exec(uri);
  if (!match) return undefined;
  try { return decodeURIComponent(match[1]) || undefined; } catch { return undefined; }
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const mongoUri = env.MONGO_URI ?? env.MONGODB_URI;
  return {
    port,
    host: env.HOST ?? '127.0.0.1',
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    mongoUri,
    // Explicit MONGODB_DATABASE wins, then the name in the URI path, so a URI that names a
    // database is never silently ignored in favour of a different default.
    databaseName: env.MONGODB_DATABASE ?? databaseNameFromUri(mongoUri) ?? 'sieu_thi_datnt_dev',
  };
}
