import { describe, expect, it } from 'vitest';
import { marketEventNear } from '../data/calendar';
import { eventOn, RANDOM_EVENTS } from '../data/events';

// GĐ269 — salt CHỌN biến thiên theo khối/ngày: trước fix roll CHỌN tương quan roll GATE
// (cùng cặp seed, block/day, salt cố định) khiến phân phối lệch nặng — viral/roadworks ~115
// vs shortage/glut ~12 (thị trường), rain 112 vs bad_weather 42 (sự kiện). Sweep tất định
// (seed cố định) nên các ngưỡng dưới không dao động giữa các lần chạy.

describe('phân phối biến động thị trường (GĐ269)', () => {
  it('4 loại đều xuất hiện và không loại nào chiếm quá 40% tổng', () => {
    const kinds: Record<string, number> = {};
    let total = 0;
    for (let seed = 0; seed < 10; seed++) {
      for (let block = 1; block <= 52; block++) {
        const e = marketEventNear(seed, block * 7 + 2, 40);
        if (!e) continue;
        total++;
        kinds[e.kind] = (kinds[e.kind] || 0) + 1;
      }
    }
    expect(total).toBeGreaterThan(150);
    for (const k of ['shortage', 'glut', 'viral', 'roadworks']) {
      expect(kinds[k]).toBeGreaterThan(20); // trước fix shortage/glut ≈ 12/256, viral ≈ 114
      expect(kinds[k] / total).toBeLessThan(0.4);
    }
  });

  it('hàng bị khan hiếm/ế trong biến động thị trường không chèn vào một vài món cố định', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 6; seed++) {
      for (let block = 1; block <= 52; block++) {
        const e = marketEventNear(seed, block * 7 + 2, 40);
        if (e && e.productId) ids.add(e.productId);
      }
    }
    // ~24 biến động có sản phẩm → phải phủ rộng, không dồn vào 2-3 món
    expect(ids.size).toBeGreaterThan(10);
  });
});

describe('phân phối sự kiện bất ngờ (GĐ269)', () => {
  it('mọi sự kiện trong bảng đều xuất hiện trong sweep; không cái nào chiếm quá 25%', () => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (let seed = 0; seed < 30; seed++) {
      for (let day = 2; day <= 140; day++) {
        const e = eventOn(seed, day, 40);
        if (!e) continue;
        total++;
        counts[e.id] = (counts[e.id] || 0) + 1;
      }
    }
    expect(total).toBeGreaterThan(400);
    const min = Math.min(...RANDOM_EVENTS.map((e) => counts[e.id] || 0));
    expect(min).toBeGreaterThan(0); // trước fix bad_weather ≤ 42 nhưng các id ngoài mùa hiếm hoi tuột thấp
    for (const id of Object.keys(counts)) expect(counts[id] / total).toBeLessThan(0.25);
  });
});
