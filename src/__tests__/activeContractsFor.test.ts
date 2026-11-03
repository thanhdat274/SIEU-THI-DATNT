import { describe, expect, it } from 'vitest';
import { activeContractsFor, SUPPLY_CONTRACTS } from '../data/contracts';

/**
 * Bộ test GĐ1041 — `data/contracts.activeContractsFor` (dòng 71–72 TRƯỚC ĐÂY 0%: lọc
 * `SUPPLY_CONTRACTS.filter((c) => c.unlock <= level)` — hợp đồng nào mở khóa theo cấp tiệm).
 * Lõi bán hàng: hợp đồng cung ứng là dòng thu nhập định kỳ niêm yết ở Sổ đối tác — cấp càng cao
 * càng mở thêm, món ở cấp lớn hơn phải bị loại đúng (nhánh false của filter đang chưa chạy).
 *
 * Hợp đồng: trả đúng tập contract có `unlock <= level`, giữ thứ tự gốc của SUPPLY_CONTRACTS.
 */

const unlocks = SUPPLY_CONTRACTS.map((c) => c.unlock); // [14,22,30,38,46,55]
const ids = (level: number) => activeContractsFor(level).map((c) => c.id);

describe('activeContractsFor — mở khóa hợp đồng theo cấp tiệm', () => {
  it('cấp 1 (ngày đầu, dưới mọi contract) → danh sách RỖNG (nhánh false filter)', () => {
    expect(activeContractsFor(1)).toHaveLength(0);
  });

  it('đúng ngưỡng unlock → chỉ hợp đồng đầu tiên (quan_nhau 14)', () => {
    expect(ids(14)).toEqual(['quan_nhau']);
  });

  it('mốc 30 → có 3 hợp đồng mở, chưa có món 38+ (quan_ca_phe/xưởng gỗ bị loại đúng)', () => {
    expect(ids(30)).toEqual(['quan_nhau', 'xuong_go', 'bep_an_cong_nhan']);
    expect(ids(30)).not.toContain('quan_ca_phe'); // unlock 38 > 30
    expect(ids(30)).not.toContain('cho_gia_vi'); // unlock 46 > 30
  });

  it('cấp đủ cao (55) → mở hết mọi hợp đồng, đủ số lượng SUPPLY_CONTRACTS', () => {
    expect(activeContractsFor(55)).toHaveLength(SUPPLY_CONTRACTS.length);
    expect(new Set(ids(55)).size).toBe(SUPPLY_CONTRACTS.length); // không trùng
  });

  it('mọi unlock trong SUPPLY_CONTRACTS đều là số dương (lọc có nghĩa)', () => {
    for (const u of unlocks) expect(u).toBeGreaterThan(0);
  });
});
