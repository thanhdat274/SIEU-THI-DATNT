/**
 * GĐ211 "Bán sỉ có đáng không?" — so sánh giá sỉ vs giá lẻ sau giảm cận hạn + độ ứ kho.
 * Thuần đọc, không RNG: craft offer/storage/storageLots trực tiếp, không đụng simRng.
 */
import { describe, expect, it } from 'vitest';
import { wholesaleAdvice, WHOLESALE_SELL_DAYS } from '../data/wholesaleValue';
import { wholesaleTotal, wholesaleUnit } from '../data/wholesale';
import type { VendorOffer } from '../data/wholesale';
import type { Lot } from '../data/freshness';

// nuoc: buy 4000 / sell 6000 / hạn 1 ngày (món nhanh hỏng, dễ bỏ khách). vo: household hạn 36.
const priceOf = (id: string) => (id === 'nuoc' ? 6000 : 25000);
const lot = (life: number, qty = 99): Record<string, Lot[]> => ({ nuoc: [{ life, qty }] });

function offer(items: Record<string, number>): VendorOffer {
  return { vendorId: 'xe_nuoc', items, expiresAt: 30 * 60 };
}

describe('GĐ211 wholesaleAdvice — bán sỉ có đáng không', () => {
  it('offer rỗng → null', () => {
    expect(wholesaleAdvice(offer({}), {}, {}, priceOf)).toBeNull();
  });

  it('kho thiếu đơn sỉ → keep + canFulfill=false (đừng nhận lời)', () => {
    const a = wholesaleAdvice(offer({ nuoc: 6 }), { nuoc: 3 }, {}, priceOf)!;
    expect(a.canFulfill).toBe(false);
    expect(a.lines[0].verdict).toBe('keep');
    expect(a.lines[0].reason).toContain('không đủ');
  });

  it('hàng cận hạn (life <= SELL_DAYS) + đủ hàng → sell, clearEmerging', () => {
    const a = wholesaleAdvice(offer({ nuoc: 6 }), { nuoc: 12 }, lot(1), priceOf)!;
    const l = a.lines[0];
    expect(l.life).toBe(1);
    expect(l.verdict).toBe('sell');
    expect(l.reason).toContain('Cận hạn');
    expect(a.sells).toBe(1);
    expect(a.clearEmerging).toBe(true);
    expect(a.canFulfill).toBe(true);
  });

  it('cận hạn nhưng kho cũng thiếu → keep (thiếu thắng)', () => {
    const a = wholesaleAdvice(offer({ nuoc: 10 }), { nuoc: 4 }, lot(1), priceOf)!;
    expect(a.lines[0].verdict).toBe('keep');
    expect(a.canFulfill).toBe(false);
  });

  it('giá sỉ >= giá lẻ sau giảm cận hạn (hàng hạn dài, lô 3 ngày, markdown 20%) → sell', () => {
    // vo hạn 36: lô 3 ngày → markdown 0.2 → giá lẻ còn 80% = 20000; giá sỉ 21300 ≥ đó.
    const lots: Record<string, Lot[]> = { vo: [{ life: 3, qty: 99 }] };
    const a = wholesaleAdvice(offer({ vo: 4 }), { vo: 12 }, lots, priceOf)!;
    const l = a.lines[0];
    expect(l.life).toBe(3);
    expect(l.wholesaleUnit).toBeGreaterThanOrEqual(l.markedRetailUnit);
    expect(l.verdict).toBe('sell');
    expect(l.reason).toContain('giá lẻ sau giảm cận hạn');
  });

  it('hàng tươi còn hạn dài nhưng kho ứ nhiều (>= 3× đơn) → sell giải phóng chỗ', () => {
    // vo không có lô (life null, không giảm giá), giá sỉ 21300 < giá lẻ 25000 → không rơi vào nhánh giá.
    const a = wholesaleAdvice(offer({ vo: 4 }), { vo: 30 }, {}, priceOf)!;
    expect(a.lines[0].verdict).toBe('sell');
    expect(a.lines[0].reason).toContain('Kho còn nhiều');
  });

  it('hàng tươi + kho vừa + giá sỉ thấp hơn giá lẻ → neutral (giữ bán lẻ)', () => {
    // nuoc không lô: no markdown, giá sỉ 5100 < giá lẻ 6000, kho 10 < 6×3 → neutral.
    const a = wholesaleAdvice(offer({ nuoc: 6 }), { nuoc: 10 }, {}, priceOf)!;
    expect(a.lines[0].verdict).toBe('neutral');
    expect(a.lines[0].reason).toContain('bán lẻ');
  });

  it('wholesaleUnit là nguồn chân lý: tổng = Σ unit×qty, không dưới nhập+5%', () => {
    const items = { nuoc: 6, vo: 4 };
    const total = wholesaleTotal(items, priceOf);
    let expectTotal = 0;
    for (const [id, q] of Object.entries(items)) {
      const unit = wholesaleUnit(id, priceOf);
      expect(unit).toBeGreaterThanOrEqual(Math.round(4000 * 1.05)); // nuoc nhập 4000
      expectTotal += unit * q;
    }
    expect(total).toBe(expectTotal);
    const a = wholesaleAdvice(offer(items), { nuoc: 20, vo: 20 }, {}, priceOf)!;
    expect(a.total).toBe(total);
    // nuoc hết hạn sau 1 ngày nhưng không có lô → life null → giữ khỏi nhánh sai.
    expect(a.lines.length).toBe(2);
  });

  it('threshold WHOLESALE_SELL_DAYS khớp ngưỡng cận hạn (2)', () => {
    expect(WHOLESALE_SELL_DAYS).toBe(2);
  });
});
