import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { NavGrid } from '../world/navGrid';

/**
 * Nhân vật chính đi theo đường tự động của lịch (ra tiệm / về nhà):
 * tua 3×, 8× phải đi nhanh gấp bấy nhiêu lần để về tới nơi trong cùng số phút game như 1×,
 * nhưng người chơi tự bấm phím thì vẫn đi tốc độ thật và không xuyên tường.
 */

// Player gắn phím qua window; node không có window nên chỉ cần stub tối thiểu
(globalThis as { window?: unknown }).window = { addEventListener() {} };

const { Player } = await import('../agents/player');

/** Lưới đi lại giả: một đường thẳng tới đích, chặn phần x > ngưỡng nếu cần. */
function fakeGrid(wallAtX?: number): NavGrid {
  return {
    findPath: (_from: THREE.Vector3, to: THREE.Vector3) => [to.clone()],
    isBlocked: (x: number) => wallAtX !== undefined && x > wallAtX,
  } as unknown as NavGrid;
}

function makePlayer(grid: NavGrid) {
  const p = new Player(grid);
  p.teleport(0, 0);
  return p;
}

describe('nhân vật đi theo lịch tự động', () => {
  it('tua 8× thì đi xa gấp 8 lần trong cùng số khung hình (cùng số phút game như 1×)', () => {
    const one = makePlayer(fakeGrid());
    const eight = makePlayer(fakeGrid());
    one.walkTo(new THREE.Vector3(10, 0, 0));
    eight.walkTo(new THREE.Vector3(10, 0, 0));
    for (let i = 0; i < 12; i++) {
      one.update(1 / 60, 0, 1);
      eight.update(1 / 60, 0, 8);
    }
    expect(one.position.x).toBeGreaterThan(0.5);
    expect(eight.position.x / one.position.x).toBeCloseTo(8, 5);
    // Đi hết đường thì đứng yên, không trôi quá đích
    expect(eight.position.x).toBeLessThanOrEqual(10);
  });

  it('bước một khung quá dài (tua 8×) không xuyên qua tường', () => {
    const p = makePlayer(fakeGrid(2));
    p.walkTo(new THREE.Vector3(10, 0, 0));
    for (let i = 0; i < 10; i++) p.update(0.1, 0, 8);
    expect(p.position.x).toBeLessThanOrEqual(2);
  });

  it('người chơi tự bấm phím thì không bị tua nhanh làm lao vọt', () => {
    const one = makePlayer(fakeGrid());
    const eight = makePlayer(fakeGrid());
    // giả lập giữ phím W (keys là nội bộ, chỉ test chạm tới)
    (one as unknown as { keys: Set<string> }).keys.add('w');
    (eight as unknown as { keys: Set<string> }).keys.add('w');
    for (let i = 0; i < 12; i++) {
      one.update(1 / 60, 0, 1);
      eight.update(1 / 60, 0, 8);
    }
    expect(one.position.z).toBeLessThan(0);
    expect(eight.position.z).toBeCloseTo(one.position.z, 10);
  });
});
