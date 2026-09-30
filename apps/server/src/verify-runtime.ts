import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createServer } from './bootstrap';
import { readRuntimeConfig } from './runtime-config';

async function verify() {
  const app = await createServer();
  try {
    await app.listen(0, '127.0.0.1');
    const response = await fetch(`${await app.getUrl()}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'tap-hoa-server', protocolVersion: 1 });
    console.log('PASS server HTTP health');
    const missingToken = await fetch(`${await app.getUrl()}/api/v1/me`);
    assert.equal(missingToken.status, 401);
    const invalidToken = await fetch(`${await app.getUrl()}/api/v1/me`, { headers: { Authorization: 'Bearer invalid-token' } });
    assert.equal(invalidToken.status, 401);
    console.log('PASS missing/invalid Firebase token rejected');
    const protectedWorlds = await fetch(`${await app.getUrl()}/api/v1/worlds`, { headers: { Authorization: 'Bearer invalid-token' } });
    assert.equal(protectedWorlds.status, 401);
    console.log('PASS protected world route rejects invalid Firebase token');
  } finally { await app.close(); }

  const config = readRuntimeConfig();
  if (!config.mongoUri) throw new Error('Missing MONGO_URI in apps/server/.env');
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  const id = `runtime-check-${randomUUID()}`;
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('PASS MongoDB connection');

    const db = client.db(config.databaseName);
    const states = db.collection<{ _id: string; balance: number }>('runtime_checks');
    try {
      await states.updateOne({ _id: id }, { $set: { balance: 100 } }, { upsert: true });
      const hit = await states.updateOne({ _id: id, balance: 100 }, { $inc: { balance: 50 } });
      const stale = await states.updateOne({ _id: id, balance: 100 }, { $inc: { balance: 999 } });
      assert.equal(hit.modifiedCount, 1);
      assert.equal(stale.modifiedCount, 0);
      assert.equal((await states.findOne({ _id: id }))?.balance, 150);
      console.log('PASS MongoDB single-document conditional update');
    } finally {
      await states.deleteOne({ _id: id });
    }
  } finally { await client.close(); }
}

void verify().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const rawCode = (error as { code?: unknown } | null)?.code;
  const code = typeof rawCode === 'number' || (typeof rawCode === 'string' && /^[A-Z_0-9]+$/.test(rawCode)) ? rawCode : 'unavailable';
  console.error(`Verification error type=${name}, code=${code}`);
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
