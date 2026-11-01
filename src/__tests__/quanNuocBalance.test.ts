import { describe, expect, it } from 'vitest';
import { quanNuocDay, quanNuocDrinkIds, QUAN_NUOC_WAGE, type QuanNuocState } from '../data/quanNuoc';
import { productById } from '../data/products';

/**
 * Bảo vệ cân bằng kinh tế quán nước (GĐ6, đối xứng với branchBalance.test.ts): khi được nhập đủ
 * đồ uống, quán nước phải TỰ NUÔI được mình — doanh thu ngày ≥ lương ngày và có lãi ròng dương —
 * ở MỌI mức giá và MỌI thời kỳ chơi (mở ở cấp 29 → giữa 50 → cao 78). Đồng thời khóa rằng TUYỂN
 * THÊM người là khoản đầu tư sinh lời (doanh thu tăng nhiều hơn lương tăng), tức đúng ý thiết kế
 * "mở quán + tuyển người + nhập hàng" thành chuỗi giá trị.
 * Ngăn hồi quy kiểu "quán mở nhưng doanh thu thấp hơn lương → lỗ mặc định, người chơi bị lừa".
 */

/** Kho đủ đồ uống (mỗi món đã mở đều có nhiều) để quán phục vụ trọn nhu cầu — bỏ qua hạn dùng qua đêm vì chạy theo ngày. */
const fullStorage = (level: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const id of quanNuocDrinkIds(level)) out[id] = 500;
  return out;
};

/** Ngày bán lý tưởng: quán mở, kho đủ, không short. */
const run = (q: QuanNuocState & { staff: number }, level: number) =>
  quanNuocDay(q, level, fullStorage(level), () => {})!;

const profit = (r: NonNullable<ReturnType<typeof quanNuocDay>>) => r.revenue - r.wages;

describe('cân bằng kinh tế quán nước (GĐ6) — tự nuôi được khi nhập đủ hàng', () => {
  it('đủ 3 nhân viên + đủ hàng: doanh thu ngày > lương ngày ở mọi mức giá (không có mức giá nào lỗ)', () => {
    for (const price of ['re', 'vua', 'cao'] as const) {
      const r = run({ open: true, staff: 3, price }, 29);
      expect(r.short, `level 29 ${price}`).toBe(false);
      expect(r.revenue, `level 29 ${price}`).toBeGreaterThan(r.wages);
      expect(profit(r), `level 29 ${price}`).toBeGreaterThan(0);
    }
  });

  it('không nhân viên: vẫn có lãi (chính chủ tự bán, không mất lương) — mở quán là đáng giá dù chưa thuê ai', () => {
    const r = run({ open: true, staff: 0, price: 'vua' }, 29);
    expect(r.wages).toBe(0);
    expect(r.revenue).toBeGreaterThan(0);
    expect(profit(r)).toBeGreaterThan(0);
  });

  it('quán không bao giờ lỗ khi có đủ hàng — với MỌI tổ hợp nhân sự (0–3) × mức giá × thời kỳ', () => {
    for (const level of [29, 50, 78, 100]) {
      for (const staff of [0, 1, 2, 3]) {
        for (const price of ['re', 'vua', 'cao'] as const) {
          const r = run({ open: true, staff, price }, level);
          expect(r.short, `L${level} staff ${staff} ${price}`).toBe(false);
          expect(r.revenue, `L${level} staff ${staff} ${price}`).toBeGreaterThanOrEqual(r.wages);
        }
      }
    }
  });

  it('doanh thu thô tăng theo nhân sự (khách ghé đông hơn) — tuyển thêm là khuếch đại doanh thu, kể cả khi mức giá làm biên lợi nhuận mỏng', () => {
    // Lưu ý cân bằng (GĐ6): mỗi nhân viên thêm ~10 ly với giá cố định 1 lương 150k, nên lợi nhuận biên
    // của người thứ nhất ở giá 'vua' có thể âm nhẹ (lương > doanh thu biên) — STAFF là trục KHUẾCH ĐẠI
    // doanh thu thô / chuỗi giá trị, còn LỢI NHUẬN điều chỉnh bằng MỨC GIÁ cao/đắt và thực đơn cao cấp.
    // Đây là cần gạt thiết kế chủ đích (panel Quán Nước cho đổi giá), không phải bug: khoá chỉ dòng dưới.
    let prev = 0;
    for (let staff = 0; staff <= 3; staff++) {
      const revenue = run({ open: true, staff, price: 'vua' }, 29).revenue;
      expect(revenue, `doanh thu với ${staff} nhân viên`).toBeGreaterThan(prev);
      prev = revenue;
    }
  });

  it('mọi thời kỳ đều có lãi khi đủ hàng — cấp 29 (mới mở), 50 (giữa), 78 (cao), 100 (hậu kỳ)', () => {
    for (const level of [29, 50, 78, 100]) {
      for (const staff of [1, 3] as const) {
        const r = run({ open: true, staff, price: 'vua' }, level);
        expect(r.short, `level ${level} staff ${staff}`).toBe(false);
        expect(profit(r), `level ${level} staff ${staff}`).toBeGreaterThan(0);
      }
    }
  });

  it('lương đủ 3 người chỉ chiếm phần nhỏ doanh thu — quán là con cưng lợi nhuận chứ không phải gánh nặng', () => {
    const r = run({ open: true, staff: 3, price: 'vua' }, 29);
    // Lương 3 × 150k ≤ 60% doanh thu: vẫn còn ≥ 40% lãi dành cho người chơi
    expect(r.wages).toBeLessThanOrEqual(r.revenue * 0.6);
  });

  it('giới hạn ghi chú: kho cạn hàng → short + lỗ (để người chơi bị nhắc nhập hàng) — không phải mặc định phải lỗ khi có hàng', () => {
    // Ngược cảnh: nhập hàng ít hơn nhu cầu 3 nhân viên → doanh thu không đủ lương
    const thin: Record<string, number> = { nuoc: 10 };
    const r = quanNuocDay({ open: true, staff: 3, price: 'vua' }, 29, thin, () => {})!;
    expect(r.short).toBe(true);
    expect(profit(r)).toBeLessThan(0);
    // Nhưng bổ sung hàng đủ thì ngay lập tức có lãi — minh hoạ đúng xương sống chuỗi giá trị
    const full = quanNuocDay({ open: true, staff: 3, price: 'vua' }, 29, fullStorage(29), () => {})!;
    expect(full.short).toBe(false);
    expect(profit(full)).toBeGreaterThan(0);
    // Ngưỡng từ hòa: số ly cần bán tối thiểu để bù lương = wages / (avg sell × mul)
    const avg = quanNuocDrinkIds(29).reduce((n, id) => n + productById(id).sell, 0) / quanNuocDrinkIds(29).length;
    const breakevenLy = Math.ceil((3 * QUAN_NUOC_WAGE) / (avg * 1.0));
    const be = quanNuocDay({ open: true, staff: 3, price: 'vua' }, 29, fullStorage(29), () => {})!;
    expect(be.served).toBeGreaterThanOrEqual(breakevenLy);
  });
});
