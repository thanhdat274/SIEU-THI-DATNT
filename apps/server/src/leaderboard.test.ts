import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { readRuntimeConfig } from './runtime-config.js';

/** Bảng xếp hạng qua `WorldRepository.leaderboard` trên Mongo thật (DB ngẫu nhiên riêng): thứ tự, giới hạn, cờ mine, hạng ngoài top, không lộ ID. */
async function run() {
  const config = readRuntimeConfig();
  if (!config.mongoUri) throw new Error('MONGO_URI is not configured');
  const testDbName = `${config.databaseName}_lb_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const previousDbName = process.env.MONGODB_DATABASE;
  process.env.MONGODB_DATABASE = testDbName;
  const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 8000, maxPoolSize: 2 });
  try {
    await client.connect();
    const { WorldRepository } = await import('./world.repository.js');
    const { closeDatabase } = await import('./database.js');
    const repository = new WorldRepository();
    const collection = client.db(testDbName).collection<{ _id: string }>('game_worlds');

    const owners = Array.from({ length: 5 }, (_, i) => ({ uid: `lb-owner-${i}-${randomUUID()}`, name: `Owner ${i}`, email: null }));
    const worlds: Array<{ id: string; revenue: number }> = [];
    const revenues = [300_000, 9_000_000, 1_500_000, 9_000_000, 0];
    for (const [i, owner] of owners.entries()) {
      const { world } = await repository.create(owner, `Hẻm số ${i}`);
      await collection.updateOne({ _id: world.id }, { $set: { 'businesses.0.save.statistics.totalRevenue': revenues[i], 'businesses.0.save.worldTime.day': 3 + i, 'businesses.0.save.player.level': 2 + i } });
      worlds.push({ id: world.id, revenue: revenues[i] });
    }

    // Top 3 theo doanh thu giảm dần; hòa doanh thu (hai hẻm 9.000.000) xếp ổn định theo _id.
    const top = await repository.leaderboard(owners[0].uid, 3);
    assert.equal(top.entries.length, 3, 'giới hạn số dòng');
    assert.deepEqual(top.entries.map((e) => e.totalRevenue), [9_000_000, 9_000_000, 1_500_000]);
    assert.deepEqual(top.entries.map((e) => e.rank), [1, 2, 3]);
    const tiedIds = [worlds[1].id, worlds[3].id].sort();
    assert.deepEqual(top.entries.slice(0, 2).map((e) => e.name), tiedIds.map((id) => (id === worlds[1].id ? 'Hẻm số 1' : 'Hẻm số 3')), 'hòa thì theo _id, thứ tự ổn định');
    assert.equal(top.entries[2].name, 'Hẻm số 2');
    assert.equal(top.entries[2].day, 5);
    assert.equal(top.entries[2].level, 4);
    assert.equal(top.entries[2].members, 1);

    // Hẻm của owner[0] (300.000, hạng 4) nằm ngoài top 3: cờ mine tắt, hạng vẫn tính đúng.
    assert.equal(top.entries.some((e) => e.mine), false, 'ngoài top thì không có dòng mine');
    assert.equal(top.myRank, 4, 'hạng của người gọi khi ngoài top');

    // Trong top: mine bật đúng dòng, myRank khớp.
    const mine = await repository.leaderboard(owners[2].uid, 3);
    assert.equal(mine.entries.find((e) => e.mine)?.name, 'Hẻm số 2');
    assert.equal(mine.myRank, 3);

    // Người chưa có hẻm nào: không có hạng.
    const stranger = await repository.leaderboard(`stranger-${randomUUID()}`, 10);
    assert.equal(stranger.myRank, null);
    assert.equal(stranger.entries.length, 5);
    assert.equal(stranger.entries.every((e) => !e.mine), true);
    assert.equal(stranger.entries[4].totalRevenue, 0, 'hẻm 0 đồng xếp cuối');

    // Không lộ ID tài khoản hay ID hẻm.
    const serialized = JSON.stringify(stranger);
    for (const owner of owners) assert.equal(serialized.includes(owner.uid), false, 'không chứa uid');
    for (const world of worlds) assert.equal(serialized.includes(world.id), false, 'không chứa id hẻm');
    assert.deepEqual(Object.keys(stranger.entries[0]).sort(), ['day', 'level', 'members', 'mine', 'name', 'rank', 'totalRevenue']);

    // Giới hạn tham số: bị kẹp về [1, 50].
    assert.equal((await repository.leaderboard(owners[0].uid, 0)).entries.length, 1);
    assert.equal((await repository.leaderboard(owners[0].uid, 9999)).entries.length, 5);

    console.log('PASS leaderboard: thứ tự theo doanh thu, hòa ổn định, giới hạn, mine/hạng ngoài top, không lộ ID');
    await closeDatabase();
  } finally {
    await client.db(testDbName).dropDatabase();
    await client.close();
    if (previousDbName === undefined) delete process.env.MONGODB_DATABASE; else process.env.MONGODB_DATABASE = previousDbName;
  }
}

void run().catch((error: unknown) => {
  console.error(`Leaderboard test failed: ${error instanceof Error ? error.stack ?? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
