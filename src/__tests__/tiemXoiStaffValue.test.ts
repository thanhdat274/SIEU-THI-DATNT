import { describe, expect, it } from 'vitest';
import { newTiemXoi, TIEM_XOI_UNLOCK, TIEM_XOI_WAGE, tiemXoiStaffValues } from '../data/tiemXoi';
import { productById } from '../data/products';

/** GĐ1246 — Tiệm xôi: "từng thợ đáng đồng lương?" (song song quán nước GĐ188). Thuần đọc — không đổi save/kinh tế. */

const XOI_IDS = ['xoi_dau_xanh', 'xoi_man', 'xoi_trung', 'xoi_dua', 'xoi_thap_cam', 'xoi_vo', 'xoi_bap', 'xoi_mit'];
const EMPTY: Record<string, number> = {};

describe('tiemXoiStaffValues — giá trị biên từng thợ', () => {
  it('chưa mở / chưa có thợ / không món xôi → []', () => {
    expect(tiemXoiStaffValues(newTiemXoi(), TIEM_XOI_UNLOCK, EMPTY)).toEqual([]);
    expect(tiemXoiStaffValues({ open: true, staff: 0 }, TIEM_XOI_UNLOCK, EMPTY)).toEqual([]);
    // cấp 30 chưa mở món xôi nào (all unlock 36)
    expect(tiemXoiStaffValues({ open: true, staff: 1 }, 30, EMPTY)).toEqual([]);
  });

  it("kho đầy (need=0): mọi thợ marginal 0 → 'low' (cho nghỉ đỡ lương)", () => {
    const full = Object.fromEntries(XOI_IDS.map((id) => [id, 80]));
    const v = tiemXoiStaffValues({ open: true, staff: 3 }, TIEM_XOI_UNLOCK, full);
    expect(v).toHaveLength(3);
    for (const x of v) {
      expect(x.marginalValue).toBe(0);
      expect(x.marginNet).toBe(-TIEM_XOI_WAGE);
      expect(x.verdict).toBe('low');
    }
  });

  it("kho trống: thợ nấu thêm xôi bán lời — marginal > 0 và không đáng vội giữ, verdict warn (không false-equan)",
    () => {
      const v = tiemXoiStaffValues({ open: true, staff: 3 }, TIEM_XOI_UNLOCK, EMPTY);
      expect(v).toHaveLength(3);
      for (const x of v) {
        expect(x.marginalValue).toBeGreaterThan(0); // có lợi nhuận bán thực
        expect(x.ratio).toBeGreaterThan(0.5);       // nhưng dưới lương → cảnh báo xem lại
        expect(x.verdict).toBe('warn');
      }
      // giá trị biên khớp đúng lợi nhuận bán (sell − cost nấu) của xôi nấu thêm so với ít hơn 1 thợ:
      // nấu thêm 60 phần (chủ nấu 60, thợ tăng sức 60/thợ) → sum lợi nhuận ≈ 131–133k như đã đo.
      expect(v[0].marginalValue).toMatchInlineSnapshot('133080');
      expect(v[1].marginalValue).toMatchInlineSnapshot('131820');
      expect(v[2].marginalValue).toMatchInlineSnapshot('133080');
    });

  it("kho quá nửa: thợ thêm vẫn nấu được (need còn) — không phải 'low'", () => {
    const half = Object.fromEntries(XOI_IDS.map((id) => [id, 40]));
    const v = tiemXoiStaffValues({ open: true, staff: 3 }, TIEM_XOI_UNLOCK, half);
    expect(v.every((x) => x.marginalValue > 0)).toBe(true);
    expect(v.every((x) => x.verdict !== 'low')).toBe(true);
  });

  it('lợi nhuận bán = (sell − buy×0.6) × số phần nấu thêm — khớp công thức (test bắt lỗi đổi thước đo)', () => {
      // Cách tính thủ công: nấu thêm 60 phần từ mốc 0 thợ, mỗi phần đáng sell − 0.6*buy.
      const manual60 = XOI_IDS.reduce((n, id) => n + 60 / XOI_IDS.length * (productById(id).sell - productById(id).buy * 0.6), 0);
      // giá trị biên thợ đầu tiên gần đúng 60 phần lợi nhuận (chủ nấu 60, thợ 1 thêm 60) — sai lệch do chia đều nguyên phần
      const v = tiemXoiStaffValues({ open: true, staff: 1 }, TIEM_XOI_UNLOCK, EMPTY);
      expect(Math.abs(v[0].marginalValue - Math.round(manual60))).toBeLessThanOrEqual(productById('xoi_mit').sell);
    });

  it('xác định: cùng đầu vào chạy hai lần ra cùng kết quả', () => {
    expect(tiemXoiStaffValues({ open: true, staff: 2 }, TIEM_XOI_UNLOCK, EMPTY))
      .toEqual(tiemXoiStaffValues({ open: true, staff: 2 }, TIEM_XOI_UNLOCK, EMPTY));
  });
});
