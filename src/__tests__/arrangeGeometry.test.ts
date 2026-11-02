import { describe, expect, it } from 'vitest';
import { snap, SNAP, box, aisle, overlap, frontLine, findSpot, MAIN_UID } from '../ui/arrangeGeometry';
import type { Furniture } from '../core/store';

const mk = (type: string, x: number, z: number, rot = 0): Furniture => ({ uid: 5, type, x, z, rot, tiers: [] } as unknown as Furniture);

describe('arrangeGeometry (GĐ958)', () => {
  it('snap làm tròn về bội của SNAP', () => {
    expect(Math.abs(snap(0.12) - 0.1)).toBeLessThan(1e-9);
    expect(SNAP).toBe(0.05);
    expect(MAIN_UID).toBe(0);
  });
  it('overlap đúng với hai hình chữ nhật', () => {
    expect(overlap({ x0: 0, z0: 0, x1: 2, z1: 2 }, { x0: 1, z0: 1, x1: 3, z1: 3 })).toBe(true);
    expect(overlap({ x0: 0, z0: 0, x1: 1, z1: 1 }, { x0: 1, z0: 0, x1: 2, z1: 1 })).toBe(false);
  });
  it('box có diện tích dương, frontLine trả đoạn thẳng', () => {
    const b = box(mk('shelf', 1, 1));
    expect(b.x1).toBeGreaterThan(b.x0);
    expect(b.z1).toBeGreaterThan(b.z0);
    const l = frontLine(0, 0, 2, 1, 0, 1);
    expect(l.y1).toBe(l.y2);
  });
  it('aisle của đồ không bày hàng rỗng', () => {
    const a = aisle(mk('plant', 0, 0));
    expect(a.x1 - a.x0).toBe(0);
  });
  it('findSpot trả hàm hợp lệ (null hoặc toạ độ)', () => {
    const r = findSpot('shelf' as never, []);
    expect(r === null || typeof r.x === 'number').toBe(true);
  });
});
