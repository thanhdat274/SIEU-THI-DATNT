import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../data/products';

// GĐ1694 — chặn mã hàng trùng tên (như x_nuoc_mam ↔ nuocmam, GĐ1693).
describe('GĐ1694 — tên mặt hàng không trùng', () => {
  it('mã hàng duy nhất', () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
// Cặp trùng tên có từ trước (nhiều cặp cố ý: *_tp = hàng làm sẵn nhập về vs món tự nấu). Danh sách chỉ được GIẢM.
const LEGACY_DUP = new Set([
  'x_banh_trang', 'xuc_xich_nuong',
  'banh_trang_nuong', 'hot_vit_lon', 'ca_phe_sua_da', 'tra_sua', 'xoi_dau_xanh', 'xoi_man', 'xoi_trung', 'xoi_dua', 'nuoc_mia',
]);

  it('không có cặp trùng tên MỚI (ngoài danh sách cũ đã khoá)', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const p of PRODUCTS) {
      const k = p.name.trim().toLowerCase();
      if (seen.has(k) && !LEGACY_DUP.has(p.id)) dup.push(`${seen.get(k)} ↔ ${p.id} (${p.name})`);
      else seen.set(k, p.id);
    }
    expect(dup).toEqual([]);
  });
  it('danh sách cũ không chứa mã đã hết trùng (giữ danh sách gọn)', () => {
    const names = PRODUCTS.map((p) => p.name.trim().toLowerCase());
    const stale = [...LEGACY_DUP].filter((id) => {
      const p = PRODUCTS.find((x) => x.id === id);
      return !p || names.filter((n) => n === p.name.trim().toLowerCase()).length < 2;
    });
    expect(stale).toEqual([]);
  });
});
