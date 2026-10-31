import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

// World 3D headless như economySim.test: canvas/context giả, không render thật
const ctx = new Proxy({}, {
  get: (_t, p) => (p === 'measureText' ? () => ({ width: 0 })
    : p === 'createLinearGradient' || p === 'createRadialGradient' || p === 'createPattern' ? () => ({ addColorStop: () => {} })
    : () => {}),
  set: () => true,
});
const g = globalThis as unknown as Record<string, unknown>;
g.document = {
  createElement: (t: string) => (t === 'canvas' ? { width: 0, height: 0, style: {}, getContext: () => ctx, toDataURL: () => '', addEventListener: () => {} } : {}),
  createElementNS: () => ({}), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
};
g.window = { addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: (n: number) => void) => f(0), devicePixelRatio: 1 };

/**
 * Chơi lâu không rò rỉ (luật hiệu năng): game chạy nhiều ngày liền trong một phiên, khách sinh ra
 * rồi đi mất liên tục. Số object trong scene và số nhân vật còn sống phải ổn định — tăng mãi theo
 * ngày là rò rỉ (máy yếu sẽ chậm dần rồi sập sau vài giờ chơi).
 */
describe('phiên chơi dài không rò rỉ', () => {
  it('8 ngày liền: số object trong scene và nhân vật còn sống không tăng theo ngày', { timeout: 300_000 }, async () => {
    const { seedLevel, buildEconomyWorld } = await import('../dev/simEconomy');
    const { createAutoplay } = await import('../dev/autoplay');
    const { liveWalkerCount, liveWalkerMeshes } = await import('../agents/walker');
    seedLevel(5);
    const world = buildEconomyWorld();
    const autoplay = createAutoplay(world.shop, world.customers, world.staff, world.player);
    // Đếm mọi object KHÔNG thuộc nhân vật (số khách đứng trong tiệm lúc chốt ngày lên xuống tự nhiên)
    // và không thuộc toà tiệm (bot nâng tier: tiệm dựng lại to hơn, nhóm cũ đã dọn — tăng hợp lệ)
    const sceneObjs = () => {
      const walkers = liveWalkerMeshes();
      let n = 0;
      for (const c of world.scene.children) if (!walkers.has(c) && c !== world.shop.building.group) c.traverse(() => n++);
      return n;
    };
    autoplay(2); // khởi động: thuê người, bày kệ...
    const objs0 = sceneObjs();
    const walkers0 = liveWalkerCount();
    const objs: number[] = [];
    const walkers: number[] = [];
    for (let d = 0; d < 6; d++) {
      autoplay(1);
      objs.push(sceneObjs());
      walkers.push(liveWalkerCount());
    }
    // eslint-disable-next-line no-console
    console.log(`[rò rỉ] object ngoài nhân vật: ${objs0} → ${objs.join(' → ')} · nhân vật sống: ${walkers0} → ${walkers.join(' → ')}`);
    // Ngoài tiệm và nhân vật thì cảnh gần như cố định: phình quá 2% sau 6 ngày (đo thực tế: 0%) là có thứ không được dọn
    expect(Math.max(...objs)).toBeLessThanOrEqual(objs0 * 1.02);
    // Toà tiệm cũ khi nâng tier phải được gỡ khỏi scene (chỉ còn đúng một toà)
    expect(world.scene.children.filter((c) => c === world.shop.building.group)).toHaveLength(1);
    // Nhân vật bị dispose đúng khi rời đi: không tích luỹ theo ngày
    // Số khách đang ở ngoài lúc chốt ngày dao động 13–33 (đo +9 sau 6 ngày); rò rỉ thật (quên dispose) tăng hàng trăm mỗi ngày
    expect(Math.max(...walkers)).toBeLessThanOrEqual(walkers0 + 20);
  });
});
