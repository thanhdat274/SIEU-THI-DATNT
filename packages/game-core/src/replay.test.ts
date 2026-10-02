import assert from 'node:assert/strict';
import { DEFAULT_INITIAL_SAVE } from '@game/data';
import { REPLAY_SCHEMA, SIMULATION_VERSION, recordDayReplay, runDayReplay } from './replay';

export function runReplayTests(): void {
  const start = structuredClone(DEFAULT_INITIAL_SAVE);
  const rec = recordDayReplay(start, 120, 0.5, []);
  assert.ok(!('error' in rec), 'Ghi replay thành công');
  if ('error' in rec) return;
  assert.ok(rec.endHash);

  // Phát lại hai lần cho cùng hash và khớp endHash đã ghi
  const r1 = runDayReplay(rec), r2 = runDayReplay(rec);
  assert.ok(r1.ok && r2.ok);
  if (r1.ok && r2.ok) { assert.equal(r1.endHash, r2.endHash); assert.equal(r1.matches, true); }

  // Không sửa save gốc
  assert.deepEqual(start, DEFAULT_INITIAL_SAVE);

  // endHash sai → matches=false; không có endHash → undefined
  const bad = runDayReplay({ ...rec, endHash: 'deadbeef' });
  assert.ok(bad.ok && bad.matches === false);
  const none = runDayReplay({ ...rec, endHash: undefined });
  assert.ok(none.ok && none.matches === undefined);

  // Từ chối schema/phiên bản/tham số sai
  assert.equal(runDayReplay({ ...rec, schema: REPLAY_SCHEMA + 1 }).ok, false);
  assert.equal(runDayReplay({ ...rec, simulationVersion: 'old' }).ok, false);
  assert.equal(runDayReplay({ ...rec, steps: -1 }).ok, false);
  assert.equal(runDayReplay({ ...rec, dt: 0 }).ok, false);
  assert.equal(runDayReplay(rec, SIMULATION_VERSION + 'x').ok, false);
}
