import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { eveningPrepFor, weakYesterdayCombos } from '../ui/panels/morningCalc';

const price = (id: string) => ({ mi: 5000, nuoc: 5000, banh: 6000, ngot: 8000 } as Record<string, number>)[id] ?? 5000;
describe('GĐ944 — weakYesterdayCombos', () => {
  it('bỏ combo không có dữ liệu hôm qua hoặc bán tốt', () => {
    expect(weakYesterdayCombos({}, ['mi_nuoc'], price)).toEqual([]);
    expect(weakYesterdayCombos({ mi_nuoc: { count: 50, discount: 0 } }, ['mi_nuoc'], price)).toHaveLength(0);
  });
  it('combo ít bán (≤3) được nhắc, tối đa 2 dòng', () => {
    const snap = { mi_nuoc: { count: 2, discount: 0 }, banh_ngot: { count: 1, discount: 0 } };
    const r = weakYesterdayCombos(snap, ['mi_nuoc', 'banh_ngot'], price);
    expect(r.map((x) => x.def.id).sort()).toEqual(['banh_ngot', 'mi_nuoc']);
    expect(r.length).toBeLessThanOrEqual(2);
  });
});
describe('GĐ944 — eveningPrepFor', () => {
  const rec = RECIPES.filter((r) => !r.festival).sort((a, b) => a.unlock - b.unlock)[0];
  const base = { level: 99, furniture: [{ type: rec.station }], storage: Object.fromEntries(rec.inputs.map((i) => [i.productId, i.quantity])), cSpeed: 1, bBoost: 1 };
  it('ngoài khung 13–17h thì null', () => {
    expect(eveningPrepFor({ ...base, nowMinutes: 9 * 60 })).toBeNull();
    expect(eveningPrepFor({ ...base, nowMinutes: 17 * 60 })).toBeNull();
  });
  it('13h + đủ nguyên liệu và trạm thì ra gợi ý có tên món; thiếu trạm thì null', () => {
    const p = eveningPrepFor({ ...base, nowMinutes: 13 * 60 });
    expect(p?.name).toBeTruthy();
    expect(eveningPrepFor({ ...base, furniture: [], nowMinutes: 13 * 60 })).toBeNull();
  });
});
