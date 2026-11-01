import { describe, expect, it } from 'vitest';
import { branchMissSummary, type VenueDay } from '../data/venueTrend';

/** GĐ155 — "Chi nhánh 24/7 bỏ lỡ bao nhiêu tiền mỗi tối?": helper thuần đọc branchMissSummary. */

const day = (n: number, revenue: number, customers: number, missed?: number): VenueDay => ({
  day: n, branchRevenue: revenue, branchProfit: 0, branchCustomers: customers, quanRevenue: 0, quanProfit: 0,
  ...(missed !== undefined ? { branchMissed: missed } : {}),
});

describe('branchMissSummary — khách bỏ về của chi nhánh quy ra tiền', () => {
  it('cửa sổ rỗng → toàn null/0', () => {
    expect(branchMissSummary([])).toEqual({ last: null, totalMissed: 0, totalEstMoney: 0, worst: null });
  });

  it('bộ ngày hỗn hợp: có lãi, có lỗ, có ngày 0 khách, có ngày save cũ thiếu field', () => {
    const vt = [
      day(1, 30000, 30, 4),  // avg 1.000đ/khách → bỏ lỡ 4 khách = 4.000đ
      day(2, 10000, 25, 3),  // avg 400đ → 1.200đ
      day(3, 1000, 3, 2),    // avg 333,33đ → làm tròn 667đ
      day(4, 0, 0, 5),       // quầy không ai trực cả ngày: không quy ra tiền được → 0đ
      day(5, 20000, 20),     // ngày save cũ chưa ghi field → coi như 0
    ];
    const s = branchMissSummary(vt);
    expect(s.totalMissed).toBe(14);
    expect(s.totalEstMoney).toBe(4000 + 1200 + 667);
    expect(s.last).toEqual({ day: 4, missed: 5, estMoney: 0 }); // ngày 5 không có field → không phải "có dữ liệu"
    expect(s.worst).toEqual({ day: 1, missed: 4, estMoney: 4000 });
  });

  it('chia 0 sạch: có thu mà 0 khách (hoặc 0 thu mà có khách bỏ về) → 0đ, không NaN', () => {
    const vt = [day(1, 5000, 0, 2), day(2, 0, 0, 7)];
    const s = branchMissSummary(vt);
    expect(s.totalMissed).toBe(9);
    expect(s.totalEstMoney).toBe(0);
    expect(Number.isNaN(s.totalEstMoney)).toBe(false);
    expect(s.worst).toBeNull(); // không ngày nào quy ra tiền được
    expect(s.last).toEqual({ day: 2, missed: 7, estMoney: 0 });
  });

  it('save cũ toàn bộ thiếu field → coi như chưa có số liệu bỏ lỡ', () => {
    const vt = [day(1, 20000, 20), day(2, 30000, 30), day(3, 25000, 25)];
    const s = branchMissSummary(vt);
    expect(s.totalMissed).toBe(0);
    expect(s.totalEstMoney).toBe(0);
    expect(s.last).toBeNull();
    expect(s.worst).toBeNull();
  });

  it('last là ngày gần NHẤT có dữ liệu: field có mặt nhưng 0 khách bỏ về vẫn tính', () => {
    const vt = [day(1, 30000, 30, 5), day(2, 30000, 30, 0)];
    const s = branchMissSummary(vt);
    expect(s.last).toEqual({ day: 2, missed: 0, estMoney: 0 });
    expect(s.totalMissed).toBe(5);
  });

  it('ngày không hoạt động (chi nhánh 0 thu) kẹt giữa các ngày có bỏ lỡ: tổng vẫn gom đủ, tiền không đội', () => {
    const vt = [day(1, 30000, 30, 4), day(2, 0, 0, 0), day(3, 12000, 24, 6)];
    const s = branchMissSummary(vt);
    expect(s.totalMissed).toBe(10);
    expect(s.totalEstMoney).toBe(4000 + 3000); // 6 × 500đ
    expect(s.worst).toEqual({ day: 1, missed: 4, estMoney: 4000 });
  });

  it('làm tròn từng ngày: missed × (thu/khách) lẻ → Math.round', () => {
    const s = branchMissSummary([day(1, 1000, 3, 2)]);
    expect(s.totalEstMoney).toBe(667); // 2 × 333,33… = 666,67
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const vt = [day(1, 30000, 30, 4), day(2, 0, 0, 5), day(3, 10000, 25, 3)];
    expect(branchMissSummary(vt)).toEqual(branchMissSummary(vt));
  });
});
