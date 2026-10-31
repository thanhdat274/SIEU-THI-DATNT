import { describe, expect, it } from 'vitest';
import { venueTrendSummary, type VenueDay } from '../data/venueTrend';

/** Xu hướng cơ sở: tóm tắt nhật ký ngày của chi nhánh + quán nước — thuần đọc. */

const day = (n: number, branchRevenue: number, branchProfit: number, quanProfit: number): VenueDay => ({
  day: n, branchRevenue, branchProfit, branchCustomers: branchRevenue > 0 ? 10 : 0, quanRevenue: quanProfit > 0 ? quanProfit : 0, quanProfit,
});

describe('venueTrendSummary — xu hướng 14 ngày cơ sở', () => {
  it('chưa có dữ liệu → rỗng (không hiện gì)', () => {
    expect(venueTrendSummary([])).toEqual([]);
  });

  it('tăng dần → direction up (+%)', () => {
    const vt = [1, 2, 3, 4].map((n) => day(n, 100 * n, 10 * n, 0));
    const lines = venueTrendSummary(vt);
    const branch = lines.find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch).toBeDefined();
    expect(branch!.direction).toBe('up');
    expect(branch!.recent).toBeGreaterThan(branch!.earlier);
    expect(branch!.delta).toBeGreaterThan(0);
    expect(branch!.best).toEqual({ day: 4, value: 40 });
    expect(branch!.last).toBe(40);
  });

  it('giảm dần → direction down', () => {
    const vt = [1, 2, 3, 4].map((n) => day(n, 0, 400 - 100 * n, 0)); // 300,200,100,0
    const lines = venueTrendSummary(vt);
    const branch = lines.find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch!.direction).toBe('down');
    expect(branch!.best).toEqual({ day: 1, value: 300 });
  });

  it('dao động nhỏ (≤3%) → flat, không báo lên/xuống', () => {
    const vt = [day(1, 0, 100, 0), day(2, 0, 102, 0)];
    const branch = venueTrendSummary(vt).find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch!.direction).toBe('flat');
  });

  it('chỉ quán nước mở → chỉ trả dòng quán nước, chi nhánh loại bỏ (toàn 0)', () => {
    const vt = [day(1, 0, 0, 50), day(2, 0, 0, 60), day(3, 0, 0, 70)];
    const lines = venueTrendSummary(vt);
    expect(lines.length).toBe(1);
    expect(lines[0].label).toContain('Quán nước');
    expect(lines[0].direction).toBe('up');
  });

  it('chi nhánh lỗ mọi ngày vẫn hiện xu hướng lãi thô âm', () => {
    const vt = [day(1, 100, -40, 0), day(2, 120, -60, 0), day(3, 90, -80, 0)];
    const lines = venueTrendSummary(vt);
    const branch = lines.find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch).toBeDefined();
    expect(branch!.last).toBe(-80);
    expect(branch!.best).toBeNull();
    expect(branch!.direction).toBe('down');
  });

  it('cửa sổ lăn: nửa gần = vài ngày mới nhất, not cả chuỗi cũ', () => {
    // 6 ngày: 3 ngày đầu cao (100), 3 ngày sau thấp (10) → xu hướng giảm dù tuyệt đối vẫn dương
    const vt = [day(1, 0, 100, 0), day(2, 0, 100, 0), day(3, 0, 100, 0), day(4, 0, 10, 0), day(5, 0, 10, 0), day(6, 0, 10, 0)];
    const branch = venueTrendSummary(vt).find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch!.recent).toBeCloseTo(10);
    expect(branch!.earlier).toBeCloseTo(100);
    expect(branch!.direction).toBe('down');
  });

  it('giữ đúng ngày đỉnh (max) có chọn lọc — bỏ ngày giá trị 0', () => {
    const vt = [day(1, 0, 0, 0), day(2, 0, 15, 0), day(3, 0, 0, 0)];
    const branch = venueTrendSummary(vt).find((l) => l.label.startsWith('Chi nhánh 24/7 (lãi'));
    expect(branch!.best).toEqual({ day: 2, value: 15 });
    expect(branch!.last).toBe(0);
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const vt = [day(1, 0, 50, 0), day(2, 0, 60, 0), day(3, 0, 70, 0)];
    expect(venueTrendSummary(vt)).toEqual(venueTrendSummary(vt));
  });
});

describe('GĐ423 — dòng Tiệm xôi trong xu hướng cơ sở', () => {
  const base = { branchRevenue: 0, branchProfit: 0, branchCustomers: 0, quanRevenue: 0, quanProfit: 0 };
  it('có xoiNet thì hiện dòng 🍚; save cũ thiếu field thì ẩn', () => {
    const withXoi = venueTrendSummary([{ day: 1, ...base, xoiNet: 100 }, { day: 2, ...base, xoiNet: 200 }]);
    expect(withXoi.some((l) => l.label.startsWith('Tiệm xôi'))).toBe(true);
    expect(venueTrendSummary([{ day: 1, ...base }]).some((l) => l.label.startsWith('Tiệm xôi'))).toBe(false);
  });
});
