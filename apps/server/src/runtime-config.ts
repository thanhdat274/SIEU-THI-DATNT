import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env') });

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return {
    port,
    host: env.HOST ?? '127.0.0.1',
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    mongoUri: env.MONGO_URI ?? env.MONGODB_URI,
    databaseName: env.MONGODB_DATABASE ?? 'sieu_thi_datnt_dev',
  };
}
