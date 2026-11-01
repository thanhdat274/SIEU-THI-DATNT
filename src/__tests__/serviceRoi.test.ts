import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { newGameData } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';
import { earnService } from '../core/biz';
import { roiOf } from '../data/serviceRoi';
import { serviceById } from '../data/services';

const topup = () => serviceById('topup')!;
const lottery = () => serviceById('lottery')!;

describe('GĐ66 — Hoàn vốn dịch vụ (serviceRoi + earnService ghi sổ)', () => {
  beforeEach(() => {
    useGame.setState(newGameData());
    // biz mặc định phải có serviceLife {} (save-safe)
    useGame.setState({ biz: { ...useGame.getState().biz, services: ['topup'] } });
  });

  describe('roiOf (helper thuần)', () => {
    it('chưa hoàn vốn: deficit = price − life, ghi rõ còn thiếu', () => {
      const r = roiOf(topup(), { topup: 120000 }, { topup: 30000 });
      expect(r.paidBack).toBe(false);
      expect(r.life).toBe(120000);
      expect(r.deficit).toBe(300000 - 120000); // 180k
      expect(r.daysToRecoup).toBe(Math.ceil(180000 / 30000)); // 6
    });
    it('đã hoàn vốn khi life ≥ price → ✓, deficit 0, daysToRecoup 0', () => {
      const r = roiOf(topup(), { topup: 320000 }, {});
      expect(r.paidBack).toBe(true);
      expect(r.deficit).toBe(0);
      expect(r.daysToRecoup).toBe(0);
    });
    it('hôm nay không lời (0) → không ước ngày (tránh chia 0)', () => {
      const r = roiOf(topup(), { topup: 100000 }, { topup: 0 });
      expect(r.daysToRecoup).toBe(0);
    });
    it('thiếu dữ liệu (life/today undefined) → coi 0, vẫn trả shape đầy đủ', () => {
      const r = roiOf(topup(), undefined, undefined);
      expect(r).toEqual({ id: 'topup', icon: '📱', name: 'Nạp tiền điện thoại', life: 0, price: 300000, paidBack: false, deficit: 300000, today: 0, daysToRecoup: 0 });
    });
    it('dịch vụ khác không bị trộn vào (key phân biệt)', () => {
      const r = roiOf(lottery(), { topup: 999999 }, { topup: 50 });
      expect(r.life).toBe(0); // lottery chưa lời dù topup nhiều
    });
  });

  describe('earnService ghi sổ theo dịch vụ', () => {
    it('cộng biz.serviceLife + stats.byService + tổng cho đúng dịch vụ', () => {
      earnService('topup', 6000);
      earnService('topup', 3000);
      earnService('bills', 3000);
      const s = useGame.getState();
      expect(s.biz.serviceLife).toEqual({ topup: 9000, bills: 3000 });
      expect(s.stats.byService).toEqual({ topup: 9000, bills: 3000 });
      expect(s.stats.services).toBe(12000);
      expect(s.money).toBe(newGameData().money + 12000);
    });
    it('fee âm (vé số trả thưởng) trừ vào life theo đúng dịch vụ', () => {
      earnService('lottery', -400000);
      const s = useGame.getState();
      expect(s.biz.serviceLife.lottery).toBe(-400000);
      expect(s.stats.byService?.['lottery']).toBe(-400000);
    });
    it('không id → chỉ cộng tổng, không viết sổ theo dịch vụ (đường cũ an toàn)', () => {
      earnService(undefined, 7000);
      const s = useGame.getState();
      expect(s.stats.services).toBe(7000);
      expect(s.biz.serviceLife).toEqual({});
      expect(s.stats.byService).toBeUndefined();
    });
  });

  describe('save-safe (save cũ tự bù, không SAVE_VERSION)', () => {
    it('newBiz có serviceLife mặc định {}', () => {
      expect(useGame.getState().biz.serviceLife).toEqual({});
    });
    it('round-trip: ghi sổ rồi snapshot → applySnapshot giữ serviceLife/byService', () => {
      earnService('topup', 50000);
      earnService('parking', 3000);
      const raw = snapshot();
      applySnapshot(raw);
      const s = useGame.getState();
      expect(s.biz.serviceLife.topup).toBe(50000);
      expect(s.biz.serviceLife.parking).toBe(3000);
    });
    it('bản lưu cũ thiếu serviceLife → tự bù {} và vẫn chơi tiếp', () => {
      // giả lập save cũ: biz không có trường serviceLife (đã có trong MERGE_DEEP, bù từ mặc định)
      const old = snapshot();
      delete (old.biz as unknown as Record<string, unknown>).serviceLife;
      applySnapshot(old);
      expect(useGame.getState().biz.serviceLife).toEqual({});
      // vẫn earnService được sau nạp cũ
      earnService('topup', 6000);
      expect(useGame.getState().biz.serviceLife.topup).toBe(6000);
    });
  });
});
