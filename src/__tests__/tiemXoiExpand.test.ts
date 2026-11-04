import { describe, expect, it } from 'vitest';
import { TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL, tiemXoiExpandPayback } from '../data/tiemXoi';

/** GĐ1247 — Tiệm xôi: "mở rộng bếp 20tr hồi vốn bao lâu?" (song song quán nước GĐ193). Thuần đọc — không đổi save/kinh tế. */

const XOI_IDS = ['xoi_dau_xanh', 'xoi_man', 'xoi_trung', 'xoi_dua', 'xoi_thap_cam', 'xoi_vo', 'xoi_bap', 'xoi_mit'];

describe('tiemXoiExpandPayback — hồi vốn mở rộng bếp', () => {
  it('kho đầy (mục tiêu big = 120/món): bếp lớn không nấu thêm → full (đừng xây)', () => {
    const full = Object.fromEntries(XOI_IDS.map((id) => [id, 120]));
    const r = tiemXoiExpandPayback({ open: true, staff: 3, big: false }, TIEM_XOI_BIG_LEVEL, full);
    expect(r.cost).toBe(TIEM_XOI_BIG_COST);
    expect(r.netPerDay).toBe(0);
    expect(r.paybackDays).toBeNull();
    expect(r.verdict).toBe('full');
  });

  it('kho trống + 3 thợ: bếp lớn nấu thêm ~120 phần/đêm → hồi vốn 76 ngày (slow)', () => {
    const r = tiemXoiExpandPayback({ open: true, staff: 3, big: false }, TIEM_XOI_BIG_LEVEL, {});
    expect(r.cost).toBe(TIEM_XOI_BIG_COST);
    expect(r.netPerDay).toBe(264900);
    expect(r.paybackDays).toBe(76);
    expect(r.verdict).toBe('slow');
  });

  it('càng ít thợ càng nấu thêm ít → hồi vốn càng chậm (cùng kho trống)', () => {
    const r1 = tiemXoiExpandPayback({ open: true, staff: 1, big: false }, TIEM_XOI_BIG_LEVEL, {});
    const r0 = tiemXoiExpandPayback({ open: true, staff: 0, big: false }, TIEM_XOI_BIG_LEVEL, {});
    expect(r1.netPerDay).toBe(131820);
    expect(r0.netPerDay).toBe(67960);
    expect(r1.paybackDays).toBeLessThan(r0.paybackDays as number); // 152 vs 295 ngày — thợ nhiều nấu thêm nhanh hồi vốn
    expect(r1.verdict).toBe('slow');
    expect(r0.verdict).toBe('slow');
  });

  it('xác định: cùng đầu vào chạy hai lần ra cùng kết quả', () => {
    expect(tiemXoiExpandPayback({ open: true, staff: 3, big: false }, TIEM_XOI_BIG_LEVEL, {}))
      .toEqual(tiemXoiExpandPayback({ open: true, staff: 3, big: false }, TIEM_XOI_BIG_LEVEL, {}));
  });

  it('lợi nhuận/đêm = lợi nhuận bán (sell − buy×0.6) của xôi nấu thêm so với không big — khớp công thức', () => {
    // thủ công: với 3 thợ, big tăng sức nấu 240→360 (thêm 120 phần/đêm khi kho khan), mỗi phần ~sell−0.6*buy
    const r = tiemXoiExpandPayback({ open: true, staff: 3, big: false }, TIEM_XOI_BIG_LEVEL, {});
    // netPerDay > 0 và ≤ lợi nhuận tối đa của 120 phần (chặn bởi need)
    expect(r.netPerDay).toBeGreaterThan(0);
    expect(r.netPerDay).toBeLessThan(480_000);
  });
});
