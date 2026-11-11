import { describe, expect, it } from 'vitest';
import { COMBOS, comboById } from '../data/combos';
import { comboMargin, comboPayoff, comboRealizedPayoff, comboMarginLine } from '../data/comboPayoff';

// GĐ2213 — định lượng chi phí combo: chiết khấu ăn bao nhiêu lời, giữ bao nhiêu đồng mỗi lần bán cặp.
describe('GĐ2213 — comboPayoff (chi phí chiết khấu combo)', () => {
  it('combo «Mì gói + nước suối»: giá thật (mì 5k/3k + nước 6k/4k, chiết khấu 10%)', () => {
    // gross = (5000−3000)+(6000−4000)=4000 · discount=0.1×(5000+6000)=1100 · keep=2900 · eaten=0.275≈0.28
    const m = comboMargin(comboById('mi_nuoc')!);
    expect(m.gross).toBe(4000);
    expect(m.discount).toBe(1100);
    expect(m.keep).toBe(2900);
    expect(m.eaten).toBe(0.28);
  });

  it('combo «Gạo + dầu ăn»: giá thật (gạo 100k/80k + dầu 52k/40k, chiết khấu 6%) giữ lời cao', () => {
    // gross=(100000−80000)+(52000−40000)=32000 · discount=round(0.06×152000/100)*100=9100 · keep=22900
    const m = comboMargin(comboById('gao_dauan')!);
    expect(m.gross).toBe(32000);
    expect(m.discount).toBe(9100);
    expect(m.keep).toBe(22900);
  });

  it('mọi combo đều giữ lời dương ở giá THẬT đầu vào (không combo nào base kèo lỗ)', () => {
    for (const c of COMBOS) {
      const m = comboMargin(c);
      expect(m.keep).toBeGreaterThan(0);
      expect(m.gross).toBeGreaterThan(0);
      expect(m.eaten).toBeGreaterThan(0);
      expect(m.eaten).toBeLessThan(1);
    }
  });

  it('xếp combo đang chạy theo đồng lời giữ lại mỗi lần bán cặp (combo đáng giữ slot nhất đầu)', () => {
    const rows = comboPayoff(['mi_nuoc', 'gao_dauan', 'botgiat_daugoi']);
    expect(rows.map((r) => r.id)).toEqual(['gao_dauan', 'botgiat_daugoi', 'mi_nuoc']);
    expect(comboPayoff([])).toEqual([]);
  });

  it('comboRealizedPayoff: đối chiếu trigger thật + chiết khấu đã trả với margin thật → giữ lời hôm nay', () => {
    // gạo+dầu 2 lần (giữ 2×32000−2×9100=45800) · mì+nước 10 lần (giữ 10×4000−10×1100=29000)
    const rows = comboRealizedPayoff(
      { gao_dauan: 2, mi_nuoc: 10 },
      { gao_dauan: 2 * 9100, mi_nuoc: 10 * 1100 },
      ['mi_nuoc', 'gao_dauan'],
    );
    expect(rows.map((r) => r.id)).toEqual(['gao_dauan', 'mi_nuoc']);
    expect(rows[0].count).toBe(2);
    expect(rows[0].keptToday).toBe(45800);
    expect(rows[1].keptToday).toBe(29000);
    expect(rows.every((r) => !r.overrun)).toBe(true);
  });

  it('comboRealizedPayoff: chiết khấu đã trả vượt lời cặp → gắn cờ kèo lấn lãi (Luật cứng)', () => {
    // 10 lần mì+nước mà trả chiết khấu 45.000đ (> 10×4000 lời thật) → kèo lỗ
    const rows = comboRealizedPayoff({ mi_nuoc: 10 }, { mi_nuoc: 45000 }, ['mi_nuoc']);
    expect(rows[0].overrun).toBe(true);
    expect(rows[0].keptToday).toBe(-5000);
  });

  it('comboMarginLine đọc được ", % lời giữ bao đồng"', () => {
    const line = comboMarginLine(comboMargin(comboById('mi_nuoc')!));
    expect(line).toContain('Mì gói');
    expect(line).toContain('28%');
    expect(line).toContain('2.900');
  });
});
