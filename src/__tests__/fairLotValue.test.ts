/**
 * GĐ221 "Lô chợ phiên đáng múc không?" — định giá mua lô theo tồn kho + sức bán. Thuần đọc, không RNG.
 */
import { describe, expect, it } from 'vitest';
import { fairLotValue } from '../data/fairLotValue';
import type { FairOffer } from '../data/fairmerchant';
import type { ItemHealth } from '../data/analytics';

const offer: FairOffer = {
  month: 1,
  // tổng mua lẻ 300.000 → lô 260.000 (tiết kiệm 40.000)
  lines: [{ id: 'nuoc', qty: 20 }, { id: 'vo', qty: 10 }],
  totalBuy: 300_000,
  dealPrice: 260_000,
};

const h = (id: string, dailyQty: number): ItemHealth => ({
  id, name: id, profit30: 0, revenue30: 0, profit21: 0, margin: 0, qty30: 0,
  dailyQty, daysLeft: null, spoilShare: 0, lostShare: 0, abc: 'C',
});

describe('GĐ221 fairLotValue — lô chợ phiên đáng múc?', () => {
  it('tiết kiệm = mua lẻ − giá lô, savePct đúng', () => {
    const v = fairLotValue(offer, {}, {}, []);
    expect(v.savings).toBe(40_000);
    expect(v.savePct).toBeCloseTo(40_000 / 300_000, 5);
    expect(v.dealPrice).toBe(260_000);
  });

  it('có món bán nhanh đang thiếu → grab', () => {
    // nuoc bán 10/ngày, đang có 5 → còn nửa ngày (bán nhanh); vo bán 1/ngày, có 20 → dư
    const v = fairLotValue(offer, { nuoc: 5, vo: 20 }, {}, [h('nuoc', 10), h('vo', 1)]);
    expect(v.beneficialCount).toBe(1);
    expect(v.verdict).toBe('grab');
  });

  it('chủ yếu là hàng đã dư → hold (mua sẽ chôn vốn)', () => {
    // cả hai món bán chậm, cầm nhiều
    const v = fairLotValue(offer, { nuoc: 100, vo: 50 }, {}, [h('nuoc', 1), h('vo', 1)]);
    expect(v.overstockCount).toBe(2);
    expect(v.verdict).toBe('hold');
  });

  it('không rõ sức bán → không phán bán nhanh/dư, verdict maybe', () => {
    const v = fairLotValue(offer, {}, {}, []);
    expect(v.beneficialCount).toBe(0);
    expect(v.overstockCount).toBe(0);
    expect(v.verdict).toBe('maybe');
  });

  it('hàng đang bày kệ được tính vào "đang có"', () => {
    // kệ có nuoc 60, bán 10/ngày → đủ 6 ngày (<7) → không dư, cũng không "cần" (>=3)
    const v = fairLotValue(offer, {}, { nuoc: 60 }, [h('nuoc', 10)]);
    expect(v.lines[0].have).toBe(60);
    expect(v.lines[0].daysOfStock).toBe(6);
    expect(v.overstockCount).toBe(0);
  });
});
