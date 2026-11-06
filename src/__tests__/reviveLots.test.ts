import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { applySnapshot, reviveLots, snapshot } from '../core/save';
import { nearExpiryItems } from '../data/freshness';

/** Playtest M3: hàng không hết hạn (Infinity) qua JSON thành null → báo "Diêm, bật lửa" sắp hết hạn & hỏng qua đêm. */
describe('Playtest M3 — lô hàng không hết hạn sống sót qua lưu/nạp JSON', () => {
  beforeEach(() => useGame.setState(newGameData()));
  it('reviveLots đổi life null → Infinity, giữ nguyên life số', () => {
    const out = reviveLots({ a: [{ qty: 3, life: null }, { qty: 1, life: 2 }] });
    expect(out.a[0].life).toBe(Infinity);
    expect(out.a[1].life).toBe(2);
  });
  it('khứ hồi JSON: diêm trong kho không bị báo cận hạn', () => {
    useGame.setState({ storage: { diem: 10 }, storageLots: { diem: [{ qty: 10, life: Infinity }] } });
    const json = JSON.parse(JSON.stringify(snapshot()));
    applySnapshot(json);
    const s = useGame.getState();
    expect(s.storageLots.diem[0].life).toBe(Infinity);
    expect(nearExpiryItems(s.storage, s.storageLots, []).some((i) => i.id === 'diem')).toBe(false);
  });
});

import { mergeByName } from '../ui/mergeByName';
describe('Playtest M3 — cảnh báo hết hạn không lặp tên', () => {
  it('gộp cùng tên, cộng số lượng', () => {
    const m = mergeByName([{ name: 'Sữa', qty: 2 }, { name: 'Rau', qty: 1 }, { name: 'Sữa', qty: 3 }]);
    expect(m).toEqual([{ name: 'Sữa', qty: 5 }, { name: 'Rau', qty: 1 }]);
  });
});
