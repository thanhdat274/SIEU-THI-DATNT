import { describe, it, expect } from 'vitest';
import { supplyRestockValue } from '../data/supplyRestockValue';
import { supplyRestockManifest } from '../data/supplyChain';
import type { QuanNuocState } from '../data/quanNuoc';
import { productById } from '../data/products';
import { quanNuocDrinkIds } from '../data/quanNuoc';

// Dùng manifest thật (GĐ202) để khóa: chỉ đọc, không đổi state.
const quan = { open: false, staff: 0, price: {} } as unknown as QuanNuocState;
const manifest = (storage: Record<string, number>, branch?: { open: boolean; shelf: Record<string, number> }) =>
  supplyRestockManifest(storage, branch, quan, 30, null, undefined, 1);

describe('supplyRestockValue — giá trị doanh thu treo của phiếu nạp kho', () => {
  it('rỗng: headline báo không cần nạp', () => {
    const p = supplyRestockValue([], 30);
    expect(p.rows).toHaveLength(0);
    expect(p.headline).toContain('Không có món nào');
  });

  it('chi nhánh thiếu món cụ thể: worth = sell × need', () => {
    const branch = { open: true, shelf: { mi: 0 } };
    const lines = manifest({}, branch).lines.filter((l) => l.outlet === 'branch');
    expect(lines.length).toBeGreaterThan(0);
    const p = supplyRestockValue(lines, 30);
    for (const r of p.rows) {
      // shelf {mi:0} trống → toàn bộ need là mua; worth theo giá sell của mi (nếu có dòng mi).
      if (r.id) expect(r.worth).toBe(r.need * (productById(r.id)?.sell ?? 0));
    }
    expect(p.total).toBe(p.rows.reduce((n, r) => n + r.worth, 0));
  });

  it('quán nước (nhóm không mã món): perUnit = bình quân giá món nước mở', () => {
    const lines = [{ outlet: 'teahouse' as const, id: undefined, label: 'Đồ uống', need: 8, inWarehouse: 0, source: 'buy' as const }];
    const p = supplyRestockValue(lines, 30);
    const ids = quanNuocDrinkIds(30);
    const avg = Math.round(ids.reduce((s, id) => s + (productById(id)?.sell ?? 0), 0) / ids.length);
    expect(p.rows[0].perUnit).toBe(avg);
    expect(p.rows[0].worth).toBe(8 * avg);
  });

  it('tất định: cùng input → cùng kết quả', () => {
    const lines = manifest({ mi: 3 }, { open: true, shelf: { mi: 0, nuoc: 2 } }).lines;
    expect(supplyRestockValue(lines, 30)).toEqual(supplyRestockValue(lines, 30));
  });
});
