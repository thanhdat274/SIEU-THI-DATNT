import { describe, expect, it } from 'vitest';
import { quanNuocRestockTip, quanNuocProjection, quanNuocDrinkIds, type QuanNuocState } from '../data/quanNuoc';

/**
 * GĐ190 — "Nạp bao nhiêu để bán đủ tối nay?": companion nạp kho của GĐ189. Sổ đầu ngày nhắc quán thiếu
 * đồ uống, nhưng người chơi cần biết NHẬP THÊM BAO NHIÊU ly và ấn ở đâu. Helper thuần `quanNuocRestockTip`
 * trả shortfall (chênh nhu cầu tối nay − tồn kho) + verdict theo bảng ngữ cảnh, cùng chân lý
 * `quanNuocHealth`/`quanNuocProjection`. KHÔNG đổi state/save — chỉ đọc storage.
 */
const L = 30; // cấp có đủ thực đơn đồ uống
const q: QuanNuocState = { open: true, staff: 1, price: 'vua' };

/** Kho để mỗi món đồ uống có `per` đơn vị (hoặc bỏ trống nếu per<=0). */
const makeStorage = (level: number, per: number): Record<string, number> => {
  const s: Record<string, number> = {};
  if (per > 0) for (const id of quanNuocDrinkIds(level)) s[id] = per;
  return s;
};
const haveAt = (level: number, storage: Record<string, number>) =>
  quanNuocDrinkIds(level).reduce((n, id) => n + (storage[id] ?? 0), 0);

describe('GĐ190 — thanh nạp kho quán nước', () => {
  it('kho đủ cho đêm nay + hôm qua bán đủ → không có tip (ngày sạch không nhiễu)', () => {
    const tip = quanNuocRestockTip(q, L, makeStorage(L, 500), { served: 50, wanted: 50 });
    expect(tip).toBeNull();
  });

  it('kho cạn nhưng hôm qua bán đủ → verdict warn + shortfall đúng theo projection', () => {
    const storage = makeStorage(L, 0);
    const have = haveAt(L, storage);
    const proj = quanNuocProjection(q, L, have);
    const tip = quanNuocRestockTip(q, L, storage, { served: 20, wanted: 20 });
    expect(tip).not.toBeNull();
    expect(tip!.verdict).toBe('warn');
    expect(tip!.have).toBe(0);
    expect(tip!.wanted).toBe(proj.wanted);
    expect(tip!.shortfall).toBe(proj.wanted);
    expect(tip!.missedRevenue).toBe(0);
  });

  it('hôm qua bán thiếu ly → verdict danger (đang mất tiền thật) dù kho hiện tại vẫn thiếu', () => {
    const storage = makeStorage(L, 0);
    const have = haveAt(L, storage);
    const proj = quanNuocProjection(q, L, have);
    const tip = quanNuocRestockTip(q, L, storage, { served: 10, wanted: 78 });
    expect(tip).not.toBeNull();
    expect(tip!.verdict).toBe('danger');
    expect(tip!.missedRevenue).toBeGreaterThan(0);
    expect(tip!.shortfall).toBe(Math.max(0, proj.wanted - have));
    expect(tip!.shortfall).toBeGreaterThan(0);
  });

  it('hôm qua thiếu nhưng kho đã đủ kịp → vẫn danger (báo rỉ máu) nhưng shortfall=0', () => {
    const storage = makeStorage(L, 500);
    const have = haveAt(L, storage);
    const proj = quanNuocProjection(q, L, have);
    const tip = quanNuocRestockTip(q, L, storage, { served: 10, wanted: 78 });
    expect(tip).not.toBeNull();
    expect(tip!.verdict).toBe('danger');
    expect(tip!.shortfall).toBe(Math.max(0, proj.wanted - have));
    expect(tip!.shortfall).toBe(0);
  });

  it('quán chưa mở → không có tip', () => {
    expect(quanNuocRestockTip({ open: false, staff: 0, price: 'vua' }, L, makeStorage(L, 50), null)).toBeNull();
  });

  it('consistency: shortfall = max(0, wanted − have) trên nhiều mức tồn; có tip ⇔ thiếu or hôm qua thiếu', () => {
    for (const per of [0, 30, 60, 500]) {
      const storage = makeStorage(L, per);
      const have = haveAt(L, storage);
      const proj = quanNuocProjection(q, L, have);
      const tip = quanNuocRestockTip(q, L, storage, { served: 78, wanted: 78 }); // hôm qua bán đủ
      if (tip) {
        expect(tip.shortfall).toBe(Math.max(0, proj.wanted - have));
        expect(tip.have).toBe(have);
        expect(tip.verdict).toBe('warn'); // bán đủ hôm qua, không danger
        expect(tip.shortfall).toBeGreaterThan(0);
      } else {
        expect(have).toBeGreaterThanOrEqual(proj.wanted);
      }
    }
  });
});
