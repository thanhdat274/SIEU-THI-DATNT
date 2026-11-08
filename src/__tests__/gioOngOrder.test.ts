import { describe, expect, it } from 'vitest';
import { PARTY_ORDERS, offerForDay } from '../data/orders';
import { RECIPES } from '../data/recipes';

// GĐ1788 — đơn "Đám giỗ ông": mâm cơm nhà 2 món (thịt kho trứng + canh chua cá).
describe('đơn dam_gio_ong (GĐ1788)', () => {
  const o = PARTY_ORDERS.find((x) => x.id === 'dam_gio_ong')!;
  it('2 món nấu, mở không sớm hơn món, có thưởng', () => {
    expect(Object.keys(o.items).sort()).toEqual(['canh_chua_ca', 'thit_kho_trung']);
    for (const id of Object.keys(o.items)) {
      const r = RECIPES.find((x) => x.outputId === id)!;
      expect(r).toBeTruthy();
      expect(o.unlock).toBeGreaterThanOrEqual(r.unlock);
    }
    expect(o.bonus).toBeGreaterThan(0);
  });
  it('quét 30 seed × 140 ngày ở cấp 60: xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === 'dam_gio_ong') n++;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

// GĐ1796 — đơn "Họp lớp cấp 3": gỏi cuốn + bánh xèo.
describe('đơn hop_lop_cap3 (GĐ1796)', () => {
  const o = PARTY_ORDERS.find((x) => x.id === 'hop_lop_cap3')!;
  it('2 món nấu, mở không sớm hơn món', () => {
    expect(Object.keys(o.items).sort()).toEqual(['banh_xeo', 'goi_cuon']);
    for (const id of Object.keys(o.items)) expect(o.unlock).toBeGreaterThanOrEqual(RECIPES.find((x) => x.outputId === id)!.unlock);
  });
  it('quét seed cấp 60: xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === 'hop_lop_cap3') n++;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

describe('đơn doan_tu_thien_pho (GĐ1797)', () => {
  const o = PARTY_ORDERS.find((x) => x.id === 'doan_tu_thien_pho')!;
  it('2 món nấu, mở không sớm hơn món', () => {
    expect(Object.keys(o.items).sort()).toEqual(['bun_bo_hue', 'pho_bo']);
    for (const id of Object.keys(o.items)) expect(o.unlock).toBeGreaterThanOrEqual(RECIPES.find((x) => x.outputId === id)!.unlock);
  });
  it('quét seed cấp 60: xuất hiện ≥1 lần', () => {
    let n = 0;
    for (let seed = 0; seed < 30; seed++) for (let day = 2; day <= 140; day++)
      if (offerForDay(seed, day, 60, {})?.id === 'doan_tu_thien_pho') n++;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});
