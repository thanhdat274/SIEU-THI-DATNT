import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { newGameData } from '../core/store';
import { bizEndOfDay } from '../core/biz';
import { upcomingFestival, FESTIVALS } from '../data/calendar';
import { prepItems, prepReadiness, prepBonus, PREP_MIN_QTY, PREP_NOTICE } from '../data/festivalPrep';
import { emptyMonth } from '../data/biz';
import { productById } from '../data/products';

const valentine = FESTIVALS.find((f) => f.id === 'valentine')!;

describe('GĐ70 — Đón lễ: trữ sẵn trước mùa (festivalPrep, trục seasonal)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 43, level: 10, money: 50_000_000 });
  });

  describe('helper thuần', () => {
    it('prepItems = hàng hot của dịp đã mở khóa (đều nhập kho được)', () => {
      // valentine hot: banh(1) ngot(2) mypham(34) sua(5) ruou(35) — mở khóa ≤ 10
      const ids = prepItems(valentine, 10);
      expect(ids.sort()).toEqual(['banh', 'ngot', 'sua']);
      for (const id of ids) expect(productById(id).unlock).toBeLessThanOrEqual(10);
    });
    it('prepReadiness: đủ hết → ready, thiếu món nào → missing kèm món thiếu', () => {
      const empty = prepReadiness({}, valentine, 10);
      expect(empty.ready).toBe(false);
      expect(empty.missing.sort()).toEqual(['banh', 'ngot', 'sua']);
      const partial = prepReadiness({ banh: PREP_MIN_QTY, ngot: 1, sua: PREP_MIN_QTY }, valentine, 10);
      expect(partial.ready).toBe(false);
      expect(partial.missing).toEqual(['ngot']);
      const ready = prepReadiness({ banh: PREP_MIN_QTY, ngot: PREP_MIN_QTY, sua: PREP_MIN_QTY }, valentine, 10);
      expect(ready.ready).toBe(true);
      expect(ready.missing).toEqual([]);
    });
    it('prepBonus: dương, determinist, là bội của nghìn, scale theo cấp', () => {
      const days = valentine.to - valentine.from + 1;
      const a = prepBonus(valentine, 10);
      expect(a).toBe((Math.floor((15000 + 10 * 1500) * Math.min(days, 3) * valentine.traffic) / 1000) * 1000);
      expect(a).toBeGreaterThan(0);
      expect(a % 1000).toBe(0);
      expect(prepBonus(valentine, 20)).toBeGreaterThan(a);
    });
    it('PREP_NOTICE dương và dịp Valentine bắt đầu sau 43 (Feb 12)', () => {
      expect(PREP_NOTICE).toBe(3);
      expect(upcomingFestival(43, 1)?.festival.id).toBe('valentine');
    });
  });

  describe('bizEndOfDay — thưởng đón lễ khi trữ sẵn trước ngày đầu dịp', () => {
    // day 43 = 12/2, ngày mai 44 = 13/2 là ngày đầu Valentine. event như GĐ67/GĐ69:
    // diff 2 run (đủ vs thiếu hàng) chỉ khác phần thưởng đón lễ.
    function runPrep(storage: Record<string, number>, prepClaimed?: number) {
      const base = { ...useGame.getState(), day: 43, level: 10, money: 50_000_000, storage };
      base.biz = { ...base.biz, month: emptyMonth(2, 2, 1000000), prepClaimed };
      return bizEndOfDay(base, base.stats);
    }
    it('trữ đủ hàng hot → cộng thưởng đón lễ vào money, news nhắc, ghi prepClaimed', () => {
      const full = { banh: PREP_MIN_QTY, ngot: PREP_MIN_QTY, sua: PREP_MIN_QTY };
      const withPrep = runPrep(full).money;
      const noPrep = runPrep({ banh: 1, ngot: 1, sua: 1 }).money;
      expect(withPrep - noPrep).toBe(prepBonus(valentine, 10));
      const out = runPrep(full);
      expect(out.news.some((n) => n.includes('thưởng đón lễ') && n.includes('Valentine'))).toBe(true);
      expect(out.biz.prepClaimed).toBe(44);
    });
    it('chưa trữ đủ → không thưởng, không news, không ghi prepClaimed', () => {
      const out = runPrep({ banh: PREP_MIN_QTY, ngot: 1, sua: PREP_MIN_QTY });
      expect(out.news.some((n) => n.includes('thưởng đón lễ'))).toBe(false);
      expect(out.biz.prepClaimed).toBeUndefined();
    });
    it('đã nhận cho dịp này (prepClaimed = ngày đầu) → không nhận lại', () => {
      const full = { banh: PREP_MIN_QTY, ngot: PREP_MIN_QTY, sua: PREP_MIN_QTY };
      const already = runPrep(full, 44);
      expect(already.news.some((n) => n.includes('thưởng đón lễ'))).toBe(false);
    });
    it('lượt khác của tháng không ảnh hưởng (không gói theo mốc tuần)', () => {
      const full = { banh: PREP_MIN_QTY, ngot: PREP_MIN_QTY, sua: PREP_MIN_QTY };
      // chạy 2 lần cùng hàng đủ: phải khác nhau đúng 0 (không nhận kép khi cùng ngày)
      const a = runPrep(full, 44).money;
      const b = runPrep(full, 44).money;
      expect(b - a).toBe(0);
    });
  });
});
