import { describe, expect, it } from 'vitest';
import { QUAN_NUOC_MAX_STAFF, QUAN_NUOC_WAGE, quanNuocProjection } from '../data/quanNuoc';
import { quanNuocStaffValues, quanNuocNextStaffVerdict, type QuanNuocStaffValue } from '../data/quanNuocStaffValue';

/**
 * GĐ188 — Quán nước "người thứ N đáng đồng lương?" (chiều xuống). Bộ GĐ141–153 đã soi từng nhân viên
 * ca ngày/ca đêm/chi nhánh/trại/bếp, DUY NHẤT quán nước chưa có lời phán về người đang GIỮ. Helper thuần
 * MỘT việc: tái dựng công thức quanNuocProjection, rồi tính GIÁ TRỊ BIÊN của người thứ N = chênh doanh
 * thu thô khi tăng N−1 → N nhân viên (cùng kho), trừ đi lương 150k → "đáng giữ hay nên sa thải".
 *
 * Cách test: KHÔNG hardcode số liệu kinh tế (có thể thay đổi khi cân bằng) mà đối chiếu với
 * `quanNuocProjection` — helper ground-truth GĐ127 — để chứng minh helper TRUNG THỰC với mô hình kinh tế.
 */
describe('GĐ188 — giá trị biên nhân viên quán nước', () => {
  const dbg = (v: QuanNuocStaffValue) => v;

  it('trả mảng rỗng khi không hợp lệ (staff 0, quá max, chưa có món đồ uống)', () => {
    expect(quanNuocStaffValues('vua', 50, 0, 1000)).toEqual([]);
    expect(quanNuocStaffValues('vua', 50, QUAN_NUOC_MAX_STAFF + 1, 1000)).toEqual([]);
    // Mức 0 chưa mở món đồ uống nào → quanNuocAvgSell = 0 → không phán hộp đen.
    expect(quanNuocStaffValues('vua', 0, 1, 1000)).toEqual([]);
  });

  it('giá trị biên từng người khớp chênh lợi nhuận của quanNuocProjection (trung thực với mô hình kinh tế)', () => {
    const level = 50;
    const stock = 10000;
    const list = quanNuocStaffValues('vua', level, QUAN_NUOC_MAX_STAFF, stock);
    for (let i = 0; i < list.length; i++) {
      const n = i + 1;
      const marginNet = quanNuocProjection({ open: true, staff: n, price: 'vua' }, level, stock).profit
        - quanNuocProjection({ open: true, staff: n - 1, price: 'vua' }, level, stock).profit;
      // marginNet của helper = chênh profit (đã trừ lương) giữa mốc n và n−1.
      expect(dbg(list[i]).marginNet).toBe(marginNet);
      expect(dbg(list[i]).wage).toBe(QUAN_NUOC_WAGE);
    }
  });

  it('kho đúng mức kho hỏi: người cuối giá trị biên bằng 0 (kho cạn) → marginNet < 0 → không đáng', () => {
    const level = 50;
    // Chỉ đủ kho cho đúng lượng khách của 2 nhân viên (wanted của staff 2).
    const want2 = Math.ceil(Math.round(45 * (1 + 0.15 * 2)) * 1.5);
    const list = quanNuocStaffValues('vua', level, 3, want2);
    expect(list.length).toBe(3);
    // Người thứ 3 không bán thêm ly nào → giá trị biên 0, net < 0 → không đáng giữ.
    const exp3 = quanNuocProjection({ open: true, staff: 3, price: 'vua' }, level, want2).profit
      - quanNuocProjection({ open: true, staff: 2, price: 'vua' }, level, want2).profit;
    expect(dbg(list[2]).marginNet).toBe(exp3);
    expect(dbg(list[2]).marginalValue).toBe(0);
    expect(dbg(list[2]).marginNet).toBeLessThan(0);
    expect(dbg(list[2]).verdict).not.toBe('ok');
  });

  it('chiều LÊN (tuyển thêm) — cạn kho không đáng, đủ kho tùy kinh tế, đã max thì full', () => {
    const level = 50;
    const stockBig = 10_000;
    const want1 = Math.ceil(Math.round(45 * (1 + 0.15 * 1)) * 1.5);
    // Cạn kho (chỉ đủ 1 người) → tuyển thêm người 2 không bán thêm → không đáng.
    expect(quanNuocNextStaffVerdict('vua', level, 1, want1)).toBe('notworth');
    // Đã đủ max → không tuyển thêm.
    expect(quanNuocNextStaffVerdict('vua', level, QUAN_NUOC_MAX_STAFF, stockBig)).toBe('full');
    // Kho đủ dồi dào → verdict phải khớp với chênh lợi nhuận thật (dương mới worth).
    const gain = quanNuocProjection({ open: true, staff: 3, price: 'vua' }, level, stockBig).profit
      - quanNuocProjection({ open: true, staff: 2, price: 'vua' }, level, stockBig).profit;
    expect(quanNuocNextStaffVerdict('vua', level, 2, stockBig)).toBe(gain >= QUAN_NUOC_WAGE ? 'worth' : 'notworth');
  });
});
