import { describe, expect, it } from 'vitest';
import { quanNuocDayAction, QUAN_NUOC_UNLOCK } from '../data/quanNuoc';
import { quanNuocDrinkIds } from '../data/quanNuoc';

/**
 * GĐ189 — Quán nước thiếu đồ uống thành "việc sáng" trong Sổ đầu ngày (GĐ76). Trước đây tín hiệu quán
 * thiếu kho chỉ nằm ở thẻ thụ động; giờ thành candidate ưu tiên (danger khi mất tiền thật / cảnh báo khi
 * sắp ăn khô kho chung). Helper THUẦN: đọc health có sẵn → DayAction | null, không đổi state/save.
 */
describe('GĐ189 — quán nước thiếu kho thành việc sáng', () => {
  it('không có health / quán chưa mở → không tạo việc', () => {
    expect(quanNuocDayAction(null)).toBeNull();
    expect(quanNuocDayAction(undefined)).toBeNull();
  });

  it('hôm qua bán thiếu ly (missedRevenue>0) → việc danger "Nạp đồ uống" bỏ lỡ tiền thật', () => {
    const act = quanNuocDayAction({
      drinkUnitsNow: 40,
      consumedYesterday: 10,
      missedRevenue: 250_000,
      shortYesterday: true,
      driesMain: false,
      tonight: { customers: 60, wanted: 90, served: 40, revenue: 400_000, wages: 300_000, profit: 100_000 },
      hire: null,
      hireMarginal: null,
    });
    expect(act).not.toBeNull();
    expect(act!.danger).toBe(true);
    expect(act!.icon).toBe('🧋');
    expect(act!.panel).toBe('quannuoc');
    expect(act!.text).toContain('250.000');
    expect(act!.text).toContain('nạp');
  });

  it('kho đồ uống sắp cạn cho quán (driesMain) nhưng hôm qua bán đủ → cảnh báo nên nạp trước', () => {
    const act = quanNuocDayAction({
      drinkUnitsNow: 5,
      consumedYesterday: 20,
      missedRevenue: 0,
      shortYesterday: false,
      driesMain: true,
      tonight: { customers: 60, wanted: 90, served: 5, revenue: 50_000, wages: 300_000, profit: -250_000 },
      hire: null,
      hireMarginal: null,
    });
    expect(act).not.toBeNull();
    expect(act!.danger).toBe(false);
    expect(act!.icon).toBe('🥤');
    expect(act!.text).toContain('cạn');
    expect(act!.text).toContain('5 ly');
  });

  it('quán khỏe (bán đủ, kho đủ) → không tạo việc (ngày sạch không gây nhiễu)', () => {
    const act = quanNuocDayAction({
      drinkUnitsNow: 200,
      consumedYesterday: 50,
      missedRevenue: 0,
      shortYesterday: false,
      driesMain: false,
      tonight: { customers: 60, wanted: 90, served: 90, revenue: 900_000, wages: 300_000, profit: 600_000 },
      hire: null,
      hireMarginal: null,
    });
    expect(act).toBeNull();
  });

  it('drink helper vẫn liệt kê đồ uống ở cấp mở quán (bảo toàn import path)', () => {
    expect(quanNuocDrinkIds(QUAN_NUOC_UNLOCK).length).toBeGreaterThan(0);
  });
});
