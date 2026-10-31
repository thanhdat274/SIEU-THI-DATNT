import { describe, expect, it } from 'vitest';
import { alleySignalsToday, alleyBusyToday } from '../data/alleySignals';
import { isMarketDay } from '../data/chophien';
import { isRoadworks } from '../data/roadwork';
import { isFestivalDeco } from '../data/festivalDeco';

/**
 * GĐ198 — "Đọc con hẻm": thẻ Sổ đầu ngày liệt kê tín hiệu 3D hẻm đang bật (chợ phiên / sửa đường /
 * lễ hội). Helper là THUẦN gộp đúng từng nguồn chân lý mà bên dựng cảnh dùng — test soi nó đồng nhất
 * với từng predicate trên một loạt ngày (không hardcode số).
 */
describe('GĐ198 — Đọc con hẻm', () => {
  const seed = 12345;
  it('mỗi tín hiệu khớp tuyệt đối nguồn chân lý của nhịp dựng cảnh (chợ/sửa đường/dịp)', () => {
    for (let day = 1; day <= 100; day++) {
      const sigs = alleySignalsToday(seed, day, 20);
      expect(sigs.find((s) => s.id === 'market')!.active).toBe(isMarketDay(day));
      expect(sigs.find((s) => s.id === 'roadwork')!.active).toBe(isRoadworks(seed, day, 20));
      expect(sigs.find((s) => s.id === 'festival')!.active).toBe(isFestivalDeco(day));
    }
  });

  it('đủ 3 tín hiệu, mỗi tín hiệu có tên + mô tả', () => {
    const sigs = alleySignalsToday(seed, 14, 20);
    expect(sigs.map((s) => s.id).sort()).toEqual(['festival', 'market', 'roadwork']);
    for (const s of sigs) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.desc.length).toBeGreaterThan(0);
    }
  });

  it('alleyBusyToday đúng = có ít nhất 1 tín hiệu bật (ngày chợ phiên day=7 đúng)', () => {
    expect(isMarketDay(7)).toBe(true);
    expect(alleyBusyToday(seed, 7, 20)).toBe(alleySignalsToday(seed, 7, 20).some((s) => s.active));
  });
});
