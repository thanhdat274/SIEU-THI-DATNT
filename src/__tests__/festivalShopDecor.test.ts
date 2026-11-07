import { beforeEach, describe, expect, it } from 'vitest';
import { festivalOn } from '../data/calendar';
import { festivalShopName, festivalShopOpen } from '../data/festivalDeco';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { useGame } from '../core/store';

/** GĐ1513 — đồ trang trí chỉ bán trong dịp lễ của lịch game; mua rồi giữ. */
const dayOf = (id: string) => { for (let d = 1; d < 800; d++) if (festivalOn(d)?.id === id) return d; throw new Error(id); };
const offDay = () => { for (let d = 1; d < 800; d++) if (!festivalOn(d)) return d; throw new Error('none'); };

describe('festivalShopDecor (GĐ1513)', () => {
  beforeEach(() => useGame.setState({ money: 10_000_000, furniture: [] }));

  it('mỗi món theo dịp trỏ tới lễ có thật trong lịch, có 🩷, unlock > golden 30', () => {
    const fest = FURNITURE.filter((f) => f.festival);
    expect(fest.map((f) => f.type).sort()).toEqual(['den_ong_sao', 'mam_ngu_qua']);
    for (const f of fest) {
      expect(festivalShopName(f)).not.toBe(f.festival);
      expect(f.decor ?? 0).toBeGreaterThan(0);
      expect(f.unlock).toBeGreaterThan(30);
    }
    expect(festivalShopOpen(furnitureDef('kho_dao'), offDay())).toBe(true);
  });

  it('chỉ mở đúng dịp', () => {
    expect(festivalShopOpen(furnitureDef('mam_ngu_qua'), dayOf('tet'))).toBe(true);
    expect(festivalShopOpen(furnitureDef('mam_ngu_qua'), dayOf('trung_thu'))).toBe(false);
    expect(festivalShopOpen(furnitureDef('den_ong_sao'), dayOf('trung_thu'))).toBe(true);
    expect(festivalShopOpen(furnitureDef('den_ong_sao'), offDay())).toBe(false);
  });

  it('placeFurniture: ngoài dịp từ chối không trừ tiền; trong dịp mua được, hết dịp vẫn giữ', () => {
    useGame.setState({ day: offDay() });
    expect(useGame.getState().placeFurniture('mam_ngu_qua', 0, 0, 0)).toBe(false);
    expect(useGame.getState().money).toBe(10_000_000);
    useGame.setState({ day: dayOf('tet') });
    expect(useGame.getState().placeFurniture('mam_ngu_qua', 0, 0, 0)).toBe(true);
    expect(useGame.getState().money).toBe(10_000_000 - 700_000);
    useGame.setState({ day: offDay() });
    expect(useGame.getState().furniture.some((f) => f.type === 'mam_ngu_qua')).toBe(true);
  });
});
