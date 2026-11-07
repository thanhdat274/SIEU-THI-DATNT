import { describe, expect, it } from 'vitest';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { decorScoreOf, decorVisitBoost } from '../data/layout';
import type { Furniture } from '../core/store';

const DECOR_IDS = ['kho_dao', 'ke_gia_vi', 'ke_chen', 'thung_rac', 'tham_chan', 'den_long', 'tranh_dong_ho', 'bon_rua'] as const;

describe('kitchenDecor — đồ dùng bếp & trang trí Việt (GĐ1504)', () => {
  it('8 món đều có trong FURNITURE, khai điểm 🩷 > 0, giá rẻ–trung (≤150k)', () => {
    for (const id of DECOR_IDS) {
      const def = furnitureDef(id);
      expect(def.decor ?? 0, `${id} thiếu điểm decor`).toBeGreaterThan(0);
      expect(def.price).toBeLessThanOrEqual(150_000);
      expect(def.tiers).toBe(0);
      expect(def.categories).toHaveLength(0);
    }
  });

  it('thang unlock trải từ tạp hóa nhỏ (5) tới trước khu ăn uống (18) — không đụng mốc 30', () => {
    const unlocks = DECOR_IDS.map((id) => furnitureDef(id).unlock).sort((a, b) => a - b);
    expect(unlocks[0]).toBe(5);
    expect(unlocks[unlocks.length - 1]).toBe(18);
    expect(unlocks).not.toContain(30);
  });

  it('decorScoreOf cộng dồn trọn bộ 8 món (bỏ đồ hỏng)', () => {
    const full = DECOR_IDS.map((id) => ({ uid: 1, type: id, x: 0, z: 0, rot: 0, tiers: [] } as unknown as Furniture));
    const total = DECOR_IDS.reduce((n, id) => n + (furnitureDef(id).decor ?? 0), 0);
    expect(decorScoreOf(full)).toBe(total);
    expect(total).toBe(49); // 6+8+8+2+3+7+10+5
  });

  it('kinh tế: trọn bộ 8 món giá 580k, tại 5★ tăng thêm ~49% khách — chỉ nhỏ hơn hẳn landmark đắt tiền', () => {
    const total = DECOR_IDS.reduce((n, id) => n + furnitureDef(id).price, 0);
    expect(total).toBe(580_000);
    const boost = decorVisitBoost(49, 5);
    expect(boost).toBeCloseTo(0.49);
    // Ở 3★ (khách bình thường) chỉ còn ~60% hiệu lực — đúng cơ chế "đẹp chỉ phát huy khi phục vụ tốt"
    expect(decorVisitBoost(49, 3)).toBeCloseTo(0.294);
  });
});
