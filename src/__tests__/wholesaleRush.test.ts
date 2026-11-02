import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { WHOLESALE_RUSH_MARKUP, wholesaleRush, wholesaleTotal, type VendorOffer } from '../data/wholesale';
import { productById } from '../data/products';

/** GĐ929 — kho thiếu thì nhập gấp phần thiếu (giá nhập × 1,15) rồi giao đơn sỉ: thêm doanh thu, không bán lỗ. */
const offer = (items: Record<string, number>): VendorOffer => ({ vendorId: 'xe_nuoc', items, expiresAt: 600 });
const silent = () => { const m: string[] = []; useGame.setState({ notify: (x: string) => m.push(x) }); return m; };

beforeEach(() => useGame.setState(newGameData()));

describe('wholesaleRush — tính phần nhập gấp', () => {
  it('đủ hàng: không thiếu, không tốn', () => {
    const r = wholesaleRush({ nuoc: 5 }, { nuoc: 9 }, useGame.getState().priceOf);
    expect(r.missing).toEqual({});
    expect(r.cost).toBe(0);
  });
  it('thiếu 6: tốn đúng giá nhập × hệ số × 6, lời ròng = tiền sỉ − tốn', () => {
    const p = useGame.getState().priceOf;
    const r = wholesaleRush({ nuoc: 9 }, { nuoc: 3 }, p);
    expect(r.missing).toEqual({ nuoc: 6 });
    expect(r.cost).toBe(Math.round(productById('nuoc').buy * WHOLESALE_RUSH_MARKUP) * 6);
    expect(r.net).toBe(wholesaleTotal({ nuoc: 9 }, p) - r.cost);
  });
});

describe('acceptWholesale(true) — nhập gấp & giao', () => {
  it('kho thiếu, đủ tiền: giao cả đơn, tiền = +tiền sỉ − nhập gấp, kho về 0, chi tiêu tăng', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 9 }), storage: { nuoc: 3 }, money: 100_000 });
    const b = useGame.getState();
    const r = wholesaleRush(b.vendorOffer!.items, b.storage, b.priceOf);
    expect(r.net).toBeGreaterThan(0); // nước: giá sỉ cao hơn giá nhập gấp
    silent();
    expect(useGame.getState().acceptWholesale(true)).toBe(true);
    const st = useGame.getState();
    expect(st.money).toBe(100_000 + wholesaleTotal({ nuoc: 9 }, b.priceOf) - r.cost);
    expect(st.storage.nuoc ?? 0).toBe(0);
    expect(st.stats.spent).toBe(b.stats.spent + r.cost);
    expect(st.stats.itemsSold).toBe(9);
    expect(st.vendorOffer).toBeNull();
  });
  it('không đủ tiền nhập gấp: từ chối, giữ đề nghị, không đổi tiền/kho', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 9 }), storage: { nuoc: 3 }, money: 1 });
    const m = silent();
    expect(useGame.getState().acceptWholesale(true)).toBe(false);
    expect(useGame.getState().money).toBe(1);
    expect(useGame.getState().storage.nuoc).toBe(3);
    expect(useGame.getState().vendorOffer).not.toBeNull();
    expect(m.join(' ')).toContain('nhập gấp');
  });
  it('gọi không tham số vẫn từ chối khi kho thiếu (hành vi cũ giữ nguyên)', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 9 }), storage: { nuoc: 3 }, money: 100_000 });
    silent();
    expect(useGame.getState().acceptWholesale()).toBe(false);
    expect(useGame.getState().money).toBe(100_000);
  });
});
