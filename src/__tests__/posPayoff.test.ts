import { describe, it, expect } from 'vitest';
import {
  posPayoff,
  POS_UNLOCK,
  POS_PRICE,
  POS_SPEED_MUL,
  POS_RECOVER,
} from '../data/posPayoff';

describe('posPayoff — Máy POS quét mã có đáng? (GĐ1304)', () => {
  it('chưa mở khóa cấp → verdict locked, chưa có hoàn vốn/tiết kiệm', () => {
    const p = posPayoff({ level: POS_UNLOCK - 1, hasPos: false, waitMissed: 8, avgRevenuePerBuyer: 30000 });
    expect(p.verdict).toBe('locked');
    expect(p.paybackDays).toBeNull();
    expect(p.savingPerDay).toBe(0);
    expect(p.waitMissed).toBe(8);
  });

  it('đã lắp POS → không nói hoàn vốn (không có phản chứng); tổn thất còn lại do nguyên nhân khác', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: true, waitMissed: 3, avgRevenuePerBuyer: 20000 });
    expect(p.paybackDays).toBeNull();
    expect(p.savingPerDay).toBe(0);
    // Vẫn còn khách chờ dù đã lắp → lưu tổn thất thật (chờ vì lý do khác), nhưng không quy cho POS.
    expect(p.estRevenueLostPerDay).toBe(60000);
    expect(p.verdict).toBe('modest');
  });

  it('đã lắp POS & hôm nay không ai bỏ vì chờ → im, không bịa', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: true, waitMissed: 0, avgRevenuePerBuyer: 20000 });
    expect(p.verdict).toBe('none');
    expect(p.estRevenueLostPerDay).toBe(0);
    expect(p.savingPerDay).toBe(0);
    expect(p.paybackDays).toBeNull();
  });

  it('chưa lắp & không có khách bỏ vì chờ → không ồn (quick_hands/hirePayoff im khi wait=0)', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 0, avgRevenuePerBuyer: 30000 });
    expect(p.verdict).toBe('none');
    expect(p.savingPerDay).toBe(0);
    expect(p.paybackDays).toBeNull();
  });

  it('chưa lắp & avgRevenuePerBuyer = 0 → không bịa con số tiền', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 5, avgRevenuePerBuyer: 0 });
    expect(p.verdict).toBe('none');
    expect(p.estRevenueLostPerDay).toBe(0);
    expect(p.paybackDays).toBeNull();
  });

  it('ước lượng doanh thu-lỡ = count × avgPerVisit (GĐ1221) × POS_RECOVER → hoàn vốn', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 5, avgRevenuePerBuyer: 20000 });
    // doanh thu lỡ = 5 × 20k = 100k ; tiết kiệm = 100k × 0.8 = 80k ; hoàn vốn = ceil(1.5tr / 80k) = 19
    expect(p.estRevenueLostPerDay).toBe(100000);
    expect(p.savingPerDay).toBe(Math.round(100000 * POS_RECOVER));
    expect(p.savingPerDay).toBe(80000);
    expect(p.paybackDays).toBe(19);
    expect(p.verdict).toBe('modest');
  });

  it('tổn thất lớn → mức high, hoàn vốn nhanh', () => {
    const p = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 10, avgRevenuePerBuyer: 50000 });
    expect(p.estRevenueLostPerDay).toBe(500000);
    expect(p.savingPerDay).toBe(Math.round(500000 * POS_RECOVER)); // 400k
    expect(p.paybackDays).toBe(Math.ceil(POS_PRICE / 400000)); // 4
    expect(p.verdict).toBe('high');
  });

  it('THUẦN deterministic — cùng input cùng output, không đổi state', () => {
    const a = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 7, avgRevenuePerBuyer: 15000 });
    const b = posPayoff({ level: POS_UNLOCK, hasPos: false, waitMissed: 7, avgRevenuePerBuyer: 15000 });
    expect(a).toEqual(b);
    expect(POS_SPEED_MUL).toBe(1.5); // khớp literal main.tsx:674
  });
});
