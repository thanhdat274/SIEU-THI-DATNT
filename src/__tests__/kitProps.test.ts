import { describe, expect, it } from 'vitest';
import {
  KIT_MODULES,
  KIT_PLACEMENTS,
  KIT_MARKET_PLACEMENTS,
  kitPlacementProblems,
} from '../world/kitProps';
import { isMarketDay } from '../data/chophien';

/**
 * GĐ172 — Kit prop GLB trang trí (pipeline kiểu Xóm Nông Trại): model sinh bằng script ra
 * GLB + manifest, đặt điểm xuyết quanh hẻm cho đỡ trống. Kit là ảnh trang trí KHÔNG chặn
 * lưới đi lại (convention quán nước), nên rủi ro duy nhất là ĐẶT SAI CHỖ — soi bảng toạ độ
 * bằng test thuần (không cần DOM/three tải gì).
 */
describe('GĐ172 — kit prop GLB', () => {
  it('bảng vị trí đặt không vi phạm chỗ cấm (nhà, lòng đường, ngoài thế giới, chèn nhau)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('mọi placement trỏ vào module mà script sinh ra', () => {
    for (const p of KIT_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
    }
  });

  it('đủ 6 module của kit đều được dùng ít nhất một chỗ', () => {
    const used = new Set(KIT_PLACEMENTS.map((p) => p.module));
    for (const m of KIT_MODULES) expect(used.has(m)).toBe(true);
  });

  it('mỗi module gắn tỉ lệ hợp lý (không âm, không phóng to vô lý)', () => {
    for (const p of KIT_PLACEMENTS) {
      expect(p.scale ?? 1).toBeGreaterThan(0.5);
      expect(p.scale ?? 1).toBeLessThanOrEqual(2);
    }
  });

  it('cửa nhà vẫn đi lại thoáng: không món nào đè ngay tâm cửa (x=−12, z=1)', () => {
    for (const p of KIT_PLACEMENTS) {
      const d = Math.hypot(p.pos[0] - -12, p.pos[2] - 1);
      expect(d).toBeGreaterThan(0.8);
    }
  });
});

/**
 * GĐ181 — Chợ phiên: vài gánh hàng (`xe_day`) dựng thêm dọc hẻm khi isMarketDay (mỗi 7 ngày),
 * tái dùng module kit có sẵn — vẫn không chặn lưới. Rủi ro duy nhất là đặt sai chỗ, soi bằng test.
 */
describe('GĐ181 — gánh hàng chợ phiên', () => {
  it('bảng vị trí chợ phiên không vi phạm chỗ cấm (đã gộp vào kitPlacementProblems)', () => {
    expect(kitPlacementProblems()).toEqual([]);
  });

  it('chỉ dùng module xe_day có trong kit, tựa vỉa hè sát lòng đường (z 1.5..3)', () => {
    for (const p of KIT_MARKET_PLACEMENTS) {
      expect(KIT_MODULES).toContain(p.module);
      expect([...new Set(KIT_MARKET_PLACEMENTS.map((x) => x.module))]).toEqual(['xe_day']);
      expect(p.pos[2]).toBeGreaterThan(1.4);
      expect(p.pos[2]).toBeLessThanOrEqual(3);
    }
  });

  it('không chèn sát món nào trong bảng hay chính nó (<0.55 m)', () => {
    const all = [...KIT_PLACEMENTS, ...KIT_MARKET_PLACEMENTS];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]);
        expect(d).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it('không chắn cửa tiệm (cửa x=4, z=1) mà chỉ bày dọc mép đường', () => {
    for (const p of KIT_MARKET_PLACEMENTS) {
      const d = Math.hypot(p.pos[0] - 4, p.pos[2] - 1);
      expect(d).toBeGreaterThan(1.2);
    }
  });

  it('họp đúng nhịp 7 ngày của chợ phiên (GĐ135 isMarketDay)', () => {
    expect(isMarketDay(7)).toBe(true);
    expect(isMarketDay(14)).toBe(true);
    expect(isMarketDay(6)).toBe(false);
    expect(isMarketDay(8)).toBe(false);
  });
});
