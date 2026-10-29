/**
 * GĐ222 "Bao giờ nên nâng kho?" — sức chứa/giữ lạnh vs hàng + tiền rủi ro khi tràn. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { warehouseUpgradeValue } from '../data/warehouseUpgrade';

// nuoc không cần lạnh (nước suối); suachua cần lạnh (cold, giá lẻ 8000); vo (gà) giá 25000.
const priceOf = (id: string) => (id === 'nuoc' ? 4000 : id === 'suachua' ? 8000 : 25000);
const cash = 5_000_000;

describe('GĐ222 warehouseUpgradeValue — sức chứa kho vs hàng', () => {
  it('cấp 0: 20 thùng / 40 chỗ lạnh; đếm thùng = Σ casesFor; affordable với tiền mặt đủ', () => {
    const v = warehouseUpgradeValue(0, { nuoc: 50, vo: 10 }, priceOf, cash);
    expect(v.tierName).toBe('Nhà kho nhỏ');
    expect(v.capacity).toBe(20);
    expect(v.coldCapacity).toBe(40);
    expect(v.affordable).toBe(true);
    expect(v.next?.name).toBe('Nhà kho vừa');
    expect(v.next?.price).toBe(600000);
  });

  it('chưa tràn → ok', () => {
    const v = warehouseUpgradeValue(0, { vo: 10 }, priceOf, cash);
    expect(v.overflow).toBe(0);
    expect(v.overflowValue).toBe(0);
    expect(v.verdict).toBe('ok');
  });

  it('tràn chỗ lạnh → upgrade + giá trị tràn lẻ', () => {
    // cấp 0 giữ lạnh 40; suachua 60 → tràn 20, giá trị 20×8000 = 160.000
    const v = warehouseUpgradeValue(0, { suachua: 60 }, priceOf, cash);
    expect(v.coldUsed).toBe(60);
    expect(v.overflow).toBe(20);
    expect(v.overflowValue).toBe(160_000);
    expect(v.verdict).toBe('upgrade');
  });

  it('đụng trần thùng (casePct≥95) → upgrade', () => {
    const v = warehouseUpgradeValue(0, { vo: 100000 }, priceOf, cash);
    expect(v.casePct).toBeGreaterThanOrEqual(95);
    expect(v.verdict).toBe('upgrade');
  });

  it('đầy vừa phải → soon (coldPct≥80)', () => {
    // suachua 32/40 chỗ lạnh = 80%, chưa tràn thùng
    const v = warehouseUpgradeValue(0, { suachua: 32 }, priceOf, cash);
    expect(v.coldPct).toBe(80);
    expect(v.verdict).toBe('soon');
  });
});
