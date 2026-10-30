import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { newGameData } from '../core/store';
import { acceptFairOffer } from '../core/biz';
import {
  FAIR_DAYS, FAIR_DISCOUNT, FAIR_QTY_MIN, FAIR_QTY_MAX, FAIR_ITEMS,
  isFairOpen, makeFairOffer, fairMerchantAction,
} from '../data/fairmerchant';
import { unlockedProducts, productById } from '../data/products';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { monthOf } from '../data/calendar';

describe('GĐ68 — Chợ phiên nhà cung cấp đặc biệt (fairmerchant)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 1, level: 10, money: 20_000_000 });
  });

  describe('isFairOpen — chỉ đầu tháng (ngày 1–2)', () => {
    it('ngày 1, 2 của tháng → mở', () => {
      expect(isFairOpen(1)).toBe(true);
      expect(isFairOpen(2)).toBe(true);
    });
    it('ngày 3 trở đi → đóng', () => {
      expect(isFairOpen(3)).toBe(false);
      expect(isFairOpen(29)).toBe(false);
    });
    it('đầu tháng sau (ngày 32 = mùng 1 tháng 2) cũng mở', () => {
      expect(monthOf(32)).toBe(2);
      expect(isFairOpen(32)).toBe(true);
      expect(isFairOpen(34)).toBe(false);
    });
  });

  describe('makeFairOffer — lô xác định theo (tháng, cấp)', () => {
    it('ngày không có phiên → undefined', () => {
      expect(makeFairOffer(10, 3)).toBeUndefined();
    });
    it('lô đầy đủ: đúng số món, số lượng trong khung, giá = chiết khấu', () => {
      const o = makeFairOffer(10, 1)!;
      expect(o.lines.length).toBe(FAIR_ITEMS);
      for (const l of o.lines) {
        expect(l.qty).toBeGreaterThanOrEqual(FAIR_QTY_MIN);
        expect(l.qty).toBeLessThanOrEqual(FAIR_QTY_MAX);
        expect(unlockedProducts(10).map((p) => p.id)).toContain(l.id);
        expect(COOKED_PRODUCT_IDS.has(l.id)).toBe(false);
      }
      const total = o.lines.reduce((n, l) => n + productById(l.id).buy * l.qty, 0);
      expect(o.totalBuy).toBe(total);
      expect(o.dealPrice).toBe(Math.floor((total * FAIR_DISCOUNT) / 1000) * 1000);
      expect(o.dealPrice).toBeLessThanOrEqual(total);
      expect(o.month).toBe(1);
    });
    it('cùng tháng → cùng lô (cùng ngày tháng nào cũng y hệt)', () => {
      expect(makeFairOffer(10, 1)).toEqual(makeFairOffer(10, 2));
    });
    it('khác tháng → lô khác (xáo theo tháng)', () => {
      const a = makeFairOffer(10, 1)!;
      const b = makeFairOffer(10, 32)!; // mùng 1 tháng 2
      expect(a.lines).not.toEqual(b.lines);
    });
    it('khác cấp → lô khác (tháng sau khi lên cấp đổi hàng)', () => {
      const a = makeFairOffer(1, 1)!;
      const b = makeFairOffer(10, 1)!;
      expect(a.lines).not.toEqual(b.lines);
    });
  });

  describe('acceptFairOffer — nhận lô vào kho', () => {
    it('đầu tháng nhận được: trừ tiền, thêm hàng, ghi fairTaken, cộng chi phí', () => {
      const offer = makeFairOffer(10, 1)!;
      const before = useGame.getState();
      expect(acceptFairOffer()).toBeUndefined();
      const s = useGame.getState();
      expect(s.money).toBe(before.money - offer.dealPrice);
      expect(s.stats.spent).toBe(before.stats.spent + offer.dealPrice);
      expect(s.totals.spent).toBe(before.totals.spent + offer.dealPrice);
      expect(s.biz.fairTaken).toBe(1);
      for (const l of offer.lines) expect(s.storage[l.id] ?? 0).toBe(l.qty);
    });
    it('chỉ nhận được một lần mỗi tháng — lần hai không đổi gì', () => {
      acceptFairOffer();
      const after = useGame.getState();
      acceptFairOffer();
      const s = useGame.getState();
      expect(s.money).toBe(after.money);
      expect(s.biz.fairTaken).toBe(1);
    });
    it('sang tháng mới nhận lại được', () => {
      acceptFairOffer();
      useGame.setState({ day: 32 }); // mùng 1 tháng 2
      const offer = makeFairOffer(10, 32)!;
      const before = useGame.getState();
      acceptFairOffer();
      const s = useGame.getState();
      expect(s.biz.fairTaken).toBe(2);
      expect(s.money).toBe(before.money - offer.dealPrice);
    });
    it('không đủ tiền → từ chối, không đổi gì', () => {
      useGame.setState({ money: 1 });
      const offer = makeFairOffer(10, 1)!;
      const before = useGame.getState();
      acceptFairOffer();
      const s = useGame.getState();
      expect(s.money).toBe(1);
      expect(s.storage).toEqual(before.storage);
      expect(s.biz.fairTaken).toBeUndefined();
    });
    it('ngày không có phiên → không làm gì', () => {
      useGame.setState({ day: 5 });
      acceptFairOffer();
      expect(useGame.getState().biz.fairTaken).toBeUndefined();
    });
    it('kho không đủ chỗ → từ chối, không trừ tiền', () => {
      useGame.setState({ warehouseTier: 0, storage: { mi: 999 } }); // tràn sẵn so với 20 thùng kho nhỏ
      const before = useGame.getState();
      acceptFairOffer();
      const s = useGame.getState();
      expect(s.money).toBe(before.money);
      expect(s.biz.fairTaken).toBeUndefined();
    });
  });

  describe('fairMerchantAction — việc hôm nay nhắc phiên chợ đầu tháng (GĐ293)', () => {
    it('ngày 1 hoặc ngày 2 chưa lấy lô tháng này → sinh việc sáng ưu tiên 3 trỏ đến order', () => {
      const act1 = fairMerchantAction(1, undefined);
      expect(act1).toEqual({
        icon: '🛒',
        text: 'Thương lái ghé đầu ngõ (ngày 1–2): xem lô hàng sỉ chiết khấu trong Nhập hàng',
        panel: 'order',
        danger: false,
        priority: 3,
      });

      const act2 = fairMerchantAction(2, 0);
      expect(act2).not.toBeNull();
      expect(act2?.panel).toBe('order');
    });

    it('ngày ngoài phiên chợ (ngày 3 trở đi) → null', () => {
      expect(fairMerchantAction(3, undefined)).toBeNull();
      expect(fairMerchantAction(15, undefined)).toBeNull();
    });

    it('đã lấy lô phiên chợ tháng này (fairTaken === monthOf(day)) → null, không nhắc thừa', () => {
      // ngày 1 tháng 1 (month 1), đã lấy tháng 1
      expect(fairMerchantAction(1, 1)).toBeNull();
      // ngày 32 (mùng 1 tháng 2), mới chỉ lấy tháng 1 → vẫn hiện
      expect(fairMerchantAction(32, 1)).not.toBeNull();
      // ngày 32 lấy tháng 2 rồi → null
      expect(fairMerchantAction(32, 2)).toBeNull();
    });
  });
});
