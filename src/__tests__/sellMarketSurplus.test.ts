import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

// GĐ136: "🧺 Bán chợ phiên" — action bán hàng DƯ thật sự (mirror acceptWholesale).
// Đổi money/stats/totals/stock, đánh dấu ngày đã bán (chặn bán lại cùng phiên).
// Chỉ thêm field scalar `marketClearedDay` (tự bù mặc định khi nạp save cũ — KHÔNG đụng SAVE_VERSION).

const recs = (idQty: number) => {
  const out = [];
  for (let i = 1; i <= 14; i++) out.push({ day: i, qty: idQty, revenue: 5000, cost: 3000, spoiled: 0, lost: 0 });
  return out;
};

beforeEach(() => useGame.setState(newGameData()));

describe('sellMarketSurplus', () => {
  it('bán đúng hàng DƯ ra chợ, cộng tiền + thống kê, trừ kho', () => {
    // ngày chợ (7), mi dư 20 món bán chậm (analytics bán 1/ngày → daysLeft ~20)
    useGame.setState({
      day: 7, marketClearedDay: 0,
      storage: { mi: 20 }, storageLots: {},
      furniture: [],
      demand: { mi: 1 },
      analytics: { items: { mi: recs(1) }, flags: {} },
      money: 0,
      stats: newGameData().stats,
      totals: newGameData().totals,
    });
    const before = useGame.getState().storage.mi;
    const ret = useGame.getState().sellMarketSurplus();
    const st = useGame.getState();
    expect(ret.ok).toBe(true);
    expect(st.marketClearedDay).toBe(7);
    // GĐ138: ghi bản chợ hôm nay để tổng kết cuối ngày
    expect(st.marketLast).toEqual({ day: 7, units: 15, revenue: ret.pay });
    // bán hết 15 (trần) trong 20 món dư
    expect(st.storage.mi).toBe(before - 15);
    expect(st.money).toBe(ret.pay);
    expect(st.stats.itemsSold).toBe(15);
    expect(st.stats.revenue).toBe(ret.pay);
    expect(st.totals.revenue).toBe(ret.pay);
  });

  it('chặn bán lại cùng một ngày chợ (already)', () => {
    useGame.setState({
      day: 7, marketClearedDay: 7,
      storage: { mi: 20 }, furniture: [],
      analytics: { items: { mi: recs(1) }, flags: {} },
    });
    const ret = useGame.getState().sellMarketSurplus();
    expect(ret).toEqual({ ok: false, reason: 'already' });
  });

  it('không bán khi không phải ngày chợ (no-surplus) và không trừ tiền', () => {
    useGame.setState({
      day: 5, marketClearedDay: 0,
      storage: { mi: 20 }, furniture: [],
      analytics: { items: { mi: recs(1) }, flags: {} },
      money: 1000,
    });
    const ret = useGame.getState().sellMarketSurplus();
    expect(ret.ok).toBe(false);
    expect(useGame.getState().money).toBe(1000);
  });

  it('không bán khi chưa có món DƯ (hàng bán nhanh)', () => {
    useGame.setState({
      day: 7, marketClearedDay: 0,
      storage: { mi: 4 }, furniture: [],
      analytics: { items: { mi: recs(20) }, flags: {} }, // bán 20/ngày → daysLeft ~0.2
      money: 500,
    });
    const ret = useGame.getState().sellMarketSurplus();
    expect(ret.ok).toBe(false);
    expect(useGame.getState().money).toBe(500);
  });

  it('save cũ (thiếu marketClearedDay) vẫn chạy được bán chợ — mặc định 0', () => {
    // newGameData có marketClearedDay:0; giả lập save cũ không có field
    const st = newGameData() as Record<string, unknown>;
    delete st.marketClearedDay;
    useGame.setState(st);
    useGame.setState({ day: 7, storage: { mi: 20 }, furniture: [],
      analytics: { items: { mi: recs(1) }, flags: {} } });
    const ret = useGame.getState().sellMarketSurplus();
    expect(ret.ok).toBe(true);
  });
});
