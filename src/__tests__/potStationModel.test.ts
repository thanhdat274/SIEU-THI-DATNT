import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { FurnitureView } from '../shop/furnitureView';
import { STATIONS } from '../data/recipes';

// Môi trường node không có DOM: giả lập canvas 2D để dựng sprite biểu tượng trạm.
const drawn: string[] = [];
const ctx = new Proxy({}, { get: (_t, k) => (k === 'fillText' ? (t: string) => drawn.push(t) : () => {}), set: () => true });
vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });

/** GĐ1394 — mô hình trạm hot_kettle là NỒI (thân rộng + nắp + 2 quai), không còn ấm có vòi. */
describe('GĐ1394 — mô hình bếp nồi nấu', () => {
  it('có thân nồi rộng ≥0.22 m và nắp nằm trên thân', () => {
    const v = new FurnitureView('hot_kettle');
    const cyl = v.group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.geometry instanceof THREE.CylinderGeometry,
    );
    expect(cyl.length).toBe(2);
    const [pot, lid] = [...cyl].sort((a, b) => a.position.y - b.position.y);
    expect((pot.geometry as THREE.CylinderGeometry).parameters.radiusTop).toBeGreaterThanOrEqual(0.22);
    expect(lid.position.y).toBeGreaterThan(pot.position.y);
  });
  it('biểu tượng nổi trên trạm là 🍲 (lấy từ STATIONS)', () => {
    drawn.length = 0;
    new FurnitureView('hot_kettle');
    expect(STATIONS.find((s) => s.id === 'hot_kettle')!.icon).toBe('🍲');
    expect(drawn).toContain('🍲');
  });
});
