import { describe, expect, it } from 'vitest';
import {
  KIT_MODULES,
  KIT_PLACEMENTS,
  kitPlacementProblems,
} from '../world/kitProps';

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
