import { describe, expect, it } from 'vitest';
import { isRoadworks } from '../data/roadwork';
import { dayEffects } from '../data/calendar';

/**
 * GĐ184 — "Đang sửa đường": hôm nay con đường trước hẻm có sửa không (sự kiện thị trường
 * `roadworks`, làm ít khách đi ngang hơn ×0.8 — đã nằm trong `dayEffects`). Helper thuần đọc dùng
 * chung nguồn chân lý với sim, để dựng cảnh rào chắn 3D đúng ngày. Không đổi SAVE_VERSION/kinh tế.
 */
describe('GĐ184 — isRoadworks (sự kiện market roadworks)', () => {
  it('thuần định: cùng đối số luôn trả cùng kết quả', () => {
    expect(isRoadworks(12345, 358, 1)).toBe(isRoadworks(12345, 358, 1));
    expect(isRoadworks(99, 7, 40)).toBe(isRoadworks(99, 7, 40));
  });

  it('khớp đúng nguồn chân lý: cùng dayEffects().market.kind === "roadworks"', () => {
    for (const seed of [12345, 99, 7, 88888]) {
      for (const day of [1, 4, 7, 40, 90, 200]) {
        for (const level of [1, 20, 40]) {
          expect(isRoadworks(seed, day, level)).toBe(
            dayEffects(seed, day, level).market?.kind === 'roadworks',
          );
        }
      }
    }
  });

  it('ngày nằm trong cửa sổ 3 ngày của sự kiện là true (anchor seed 12345 — re-anchor GĐ269 khi salt chọn kind đổi để phân phối đều)', () => {
    expect(isRoadworks(12345, 47, 1)).toBe(true);
    expect(isRoadworks(12345, 48, 1)).toBe(true);
  });

  it('ngày ngoài cửa sổ là false (anchor seed 12345)', () => {
    expect(isRoadworks(12345, 50, 1)).toBe(false);
    expect(isRoadworks(12345, 2, 1)).toBe(false);
  });

  it('tín hiệu có đổi: tồn tại cả ngày có sửa và ngày không trong một vòng game', () => {
    const rws = Array.from({ length: 365 }, (_, i) => isRoadworks(12345, i + 1, 20));
    expect(rws.some(Boolean)).toBe(true);
    expect(rws.some((v) => !v)).toBe(true);
  });

  it('ngày sửa đường thật sự hạ hệ số giao thông xuống dưới 1 (trừ khi lễ bù)', () => {
    // Chọn ngày roadworks không trùng lễ (traffic = festival * 0.8 với festival=1 → 0.8)
    // Dò seed để có một ngày traffic < 1 thuần do roadworks.
    let seen = false;
    for (const seed of [3, 42, 123, 5555, 999]) {
      for (let day = 1; day <= 365; day++) {
        if (isRoadworks(seed, day, 20)) {
          const de = dayEffects(seed, day, 20);
          if (de.traffic < 1) { seen = true; break; }
        }
      }
      if (seen) break;
    }
    expect(seen).toBe(true);
  });
});
