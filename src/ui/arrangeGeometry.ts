import { shopLayout } from '../core/actions';
import type { Furniture } from '../core/store';
import { footprint, frontDir, furnitureDef, type FurnitureType } from '../data/furniture';

/** Hình học thuần của ArrangePanel (GĐ958): tách nguyên văn, không đổi hành vi. */
/** Bước dời bằng nút mũi tên / phím, và độ bám khi kéo (m). */
export const STEP = 0.25;
export const SNAP = 0.05;
export const snap = (v: number) => Math.round(v / SNAP) * SNAP;
export const MAIN_UID = 0;

/** Đoạn thẳng mặt trước của một món (toạ độ trong tiệm). */
export function frontLine(x: number, z: number, w: number, d: number, fx: number, fz: number) {
  if (fz !== 0) return { x1: x - w / 2 + 0.06, x2: x + w / 2 - 0.06, y1: z + (fz * d) / 2, y2: z + (fz * d) / 2 };
  return { x1: x + (fx * w) / 2, x2: x + (fx * w) / 2, y1: z - d / 2 + 0.06, y2: z + d / 2 - 0.06 };
}

export type Rect = { x0: number; z0: number; x1: number; z1: number };
export const box = (f: Furniture): Rect => {
  const [w, d] = footprint(f.type, f.rot);
  return { x0: f.x - w / 2, z0: f.z - d / 2, x1: f.x + w / 2, z1: f.z + d / 2 };
};
/** Lối đi rộng 1m trước mặt kệ (chỗ khách đứng lấy hàng); đồ không bày hàng thì không cần. */
export const aisle = (f: Furniture): Rect => {
  if (!furnitureDef(f.type).tiers && f.type !== 'checkout') return { x0: 0, z0: 0, x1: 0, z1: 0 };
  const b = box(f);
  const [fx, fz] = frontDir(f.rot);
  return {
    x0: fx > 0 ? b.x1 : fx < 0 ? b.x0 - 1 : b.x0, x1: fx > 0 ? b.x1 + 1 : fx < 0 ? b.x0 : b.x1,
    z0: fz > 0 ? b.z1 : fz < 0 ? b.z0 - 1 : b.z0, z1: fz > 0 ? b.z1 + 1 : fz < 0 ? b.z0 : b.z1,
  };
};
export const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

/** Chỗ trống đầu tiên cho món mới (không chắn lối đi), quét từ góc trong cùng ra. */
export function findSpot(type: FurnitureType, draft: Furniture[]) {
  const plan = shopLayout.plan();
  const list = draft.filter((f) => f.uid !== MAIN_UID);
  const main = draft.find((f) => f.uid === MAIN_UID);
  for (const rot of [0, 1]) {
    for (let z = -plan.depth / 2 + 0.5; z < plan.depth / 2; z += STEP) {
      for (let x = -plan.width / 2 + 0.5; x < plan.width / 2; x += STEP) {
        const sx = snap(x);
        const sz = snap(z);
        if (shopLayout.check(type, sx, sz, rot, undefined, list, main)) continue;
        const me = { uid: -999, type, x: sx, z: sz, rot, tiers: [] };
        if (draft.some((f) => overlap(aisle(f), box(me)) || overlap(aisle(me), box(f)))) continue;
        // Chỗ này không được chắn lối tới kệ, quầy khác
        if (!shopLayout.layoutCheck([...list, { uid: -999, type, x: sx, z: sz, rot, tiers: [] }], main)) return { x: sx, z: sz, rot };
      }
    }
  }
  return null;
}
