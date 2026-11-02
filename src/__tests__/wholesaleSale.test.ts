import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { productById } from '../data/products';
import { wholesaleTotal, type VendorOffer } from '../data/wholesale';
import { maxActiveCombos } from '../data/combos';

/**
 * GĐ694 — phủ logic bán sỉ cho người bán rong (sales.ts 134-160) và combo (193-199),
 * hai khối chưa có test theo covlines GĐ693. acceptWholesale là DOANH THU thật của người chơi:
 * nhận đơn sỉ → trừ kho, cộng tiền theo giá sỉ (không dưới giá nhập + 5%), cộng thống kê.
 */

const offer = (items: Record<string, number>): VendorOffer => ({
  vendorId: 'xe_nuoc', items, expiresAt: 600, // Cô Bảy xe nước mía lấy 'nuoc'
});

const wholesaleMsgs = () => {
  const msgs: string[] = [];
  useGame.setState({ notify: (m: string) => msgs.push(m) });
  return msgs;
};

beforeEach(() => useGame.setState(newGameData()));

describe('acceptWholesale — bán sỉ cho người bán rong (GĐ694)', () => {
  it('nhận đơn sỉ đủ hàng: trừ kho, cộng tiền theo giá sỉ, cộng thống kê, xoá đề nghị', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 9 }), storage: { nuoc: 12 } });
    const before = useGame.getState();
    const expectedPay = wholesaleTotal({ nuoc: 9 }, before.priceOf);
    // Giá sỉ không được dưới giá nhập + 5%
    const buy = 3000; // giá nhập 'nuoc' (productById('nuoc').buy)
    expect(expectedPay).toBeGreaterThanOrEqual(Math.round(buy * 1.05) * 9);
    const msgs = wholesaleMsgs();
    const ok = useGame.getState().acceptWholesale();
    const st = useGame.getState();
    expect(ok).toBe(true);
    expect(st.money).toBe(before.money + expectedPay);
    expect(st.storage.nuoc).toBe(3);
    expect(st.vendorOffer).toBeNull();
    expect(st.stats.itemsSold).toBe(9);
    expect(st.stats.revenue).toBe(before.stats.revenue + expectedPay);
    expect(st.totals.revenue).toBe(before.totals.revenue + expectedPay);
    expect(st.stats.byItem!.nuoc.qty).toBe(9);
    expect(msgs.join(' ')).toContain('Bán sỉ');
  });

  it('kho thiếu hàng: từ chối, báo món thiếu, giữ đề nghị và không cộng tiền', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 9 }), storage: { nuoc: 3 }, money: 50_000 });
    const msgs = wholesaleMsgs();
    const ok = useGame.getState().acceptWholesale();
    const st = useGame.getState();
    expect(ok).toBe(false);
    expect(msgs.join(' ')).toContain('Kho còn thiếu');
    expect(msgs.join(' ')).toContain(`6 ${productById('nuoc').name}`); // thiếu 9-3=6 món
    expect(st.money).toBe(50_000);
    expect(st.vendorOffer).not.toBeNull();
    expect(st.storage.nuoc).toBe(3);
  });

  it('không có đề nghị nào: trả false, không đổi gì', () => {
    useGame.setState({ vendorOffer: null, money: 7_000 });
    expect(useGame.getState().acceptWholesale()).toBe(false);
    expect(useGame.getState().money).toBe(7_000);
  });

  it('declineWholesale: xoá đề nghị (từ chối lịch sự)', () => {
    useGame.setState({ vendorOffer: offer({ nuoc: 6 }) });
    useGame.getState().declineWholesale();
    expect(useGame.getState().vendorOffer).toBeNull();
  });
});

describe('toggleCombo — bật/tắt combo đang chạy (GĐ694)', () => {
  it('bật combo: thêm vào activeCombos + báo; bật lại thì tắt', () => {
    const msgs = wholesaleMsgs();
    useGame.getState().toggleCombo('mi_nuoc');
    expect(useGame.getState().activeCombos).toContain('mi_nuoc');
    expect(msgs.join(' ')).toContain('Bắt đầu chạy combo');
    useGame.getState().toggleCombo('mi_nuoc');
    expect(useGame.getState().activeCombos).not.toContain('mi_nuoc');
  });

  it('đủ số chỗ combo theo cấp thì chặn bật thêm và báo rõ', () => {
    const max = maxActiveCombos(useGame.getState().level);
    const ids = ['mi_nuoc', 'banh_ngot', 'sua_banhmi', 'mi_trung', 'gao_dauan', 'giavi_dauan'].slice(0, max);
    useGame.setState({ activeCombos: ids });
    const extra = ['mi_nuoc', 'banh_ngot', 'sua_banhmi', 'mi_trung', 'gao_dauan', 'giavi_dauan'].find((c) => !ids.includes(c))!;
    const msgs = wholesaleMsgs();
    useGame.getState().toggleCombo(extra);
    expect(useGame.getState().activeCombos.length).toBe(max);
    expect(useGame.getState().activeCombos).not.toContain(extra);
    expect(msgs.join(' ')).toContain(`Chỉ chạy được ${max} combo`);
  });
});
