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

  // Lệnh mở thùng (open_case) được ghi và phát lại xác định; lệnh có tác dụng thật lên trạng thái (hash khác khi bỏ lệnh)
  {
    const caseStart = structuredClone(DEFAULT_INITIAL_SAVE);
    caseStart.inventory = caseStart.inventory.filter((item) => item.productId !== 'mi_hao_hao');
    caseStart.inventory.push({ productId: 'mi_hao_hao', quantity: 80, lots: [{ quantity: 80, expiresOnDay: 99, unitCost: 2488, provenance: 'known', caseCount: 2 }] });
    const withCase = recordDayReplay(caseStart, 60, 0.5, [{ step: 3, command: { type: 'open_case', productId: 'mi_hao_hao', count: 1 } }]);
    const without = recordDayReplay(caseStart, 60, 0.5, []);
    assert.ok(!('error' in withCase) && !('error' in without), 'Ghi replay có lệnh mở thùng');
    if (!('error' in withCase) && !('error' in without)) {
      const replayed = runDayReplay(withCase);
      assert.ok(replayed.ok && replayed.matches === true, 'Phát lại lệnh mở thùng khớp hash đã ghi');
      assert.notEqual(withCase.endHash, without.endHash, 'Lệnh mở thùng đổi trạng thái (không bị bỏ qua khi phát lại)');
    }
  }

  // Từ chối schema/phiên bản/tham số sai
  assert.equal(runDayReplay({ ...rec, schema: REPLAY_SCHEMA + 1 }).ok, false);
  assert.equal(runDayReplay({ ...rec, simulationVersion: 'old' }).ok, false);
  assert.equal(runDayReplay({ ...rec, steps: -1 }).ok, false);
  assert.equal(runDayReplay({ ...rec, dt: 0 }).ok, false);
  assert.equal(runDayReplay(rec, SIMULATION_VERSION + 'x').ok, false);
}
