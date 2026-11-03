import { describe, expect, it } from 'vitest';
import { plotLabel, type Plot } from '../data/garden';

/** Một luống trồng để thử nhãn. */
function plot(p: Partial<Plot>): Plot {
  return { crop: null, wateredDay: 0, growth: 0, ...p };
}

describe('plotLabel — nhãn luống trong bảng trại', () => {
  it('luống trống → "Đất trống"', () => {
    expect(plotLabel(plot({}), 5)).toBe('Đất trống');
  });

  it('đủ ngày thu (growth >= days) → nhãn chờ thu hoạch', () => {
    // rau_cai days 3: growth vừa đủ
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 3, wateredDay: 5 }), 5)).toBe('🥬 Rau cải — chờ thu hoạch');
    // growth vượt (quên thu) vẫn chờ thu
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 4, wateredDay: 6 }), 6)).toBe('🥬 Rau cải — chờ thu hoạch');
  });

  it('còn non + đã tưới hôm nay → nhãn còn ~X ngày (đã tưới)', () => {
    // rau_cai days 3, growth 2 → còn ~1 ngày
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 2, wateredDay: 5 }), 5)).toBe('🥬 Rau cải — còn ~1 ngày (đã tưới)');
  });

  it('còn non + chưa tưới hôm nay → nhãn (chưa tưới)', () => {
    // wateredDay khác day (hôm qua) → chưa tưới
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 2, wateredDay: 4 }), 5)).toBe('🥬 Rau cải — còn ~1 ngày (chưa tưới)');
  });

  it('mới trồng growth 0 → còn ~đủ ngày', () => {
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 0, wateredDay: 1 }), 1)).toBe('🥬 Rau cải — còn ~3 ngày (đã tưới)');
  });

  it('growth lẻ (2.5) → làm tròn lên, còn ~1 ngày', () => {
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 2.5, wateredDay: 5 }), 5)).toBe('🥬 Rau cải — còn ~1 ngày (đã tưới)');
  });

  it('growth âm/0 không cho ngày còn lại âm (clamp 0)', () => {
    // growth vượt nhiều nhưng plot chưa kịp cập nhật → 0 ngày, coi là chờ thu (left=0)
    expect(plotLabel(plot({ crop: 'rau_cai', growth: 99, wateredDay: 5 }), 5)).toBe('🥬 Rau cải — chờ thu hoạch');
  });
});
