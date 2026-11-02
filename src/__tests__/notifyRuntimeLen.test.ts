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
 * Thông báo thật khi chạy (GĐ868): audit tĩnh chỉ đọc được literal, bỏ sót notify(cond ? a : b),
 * chuỗi ghép và fitList. Test này cho bot chơi vài ngày, gom MỌI toast đã hiện và kiểm ≤ 90 ký tự.
 */
describe('độ dài thông báo lúc chạy', () => {
  it.each([3, 8, 15, 30, 50])('bot chơi 6 ngày từ cấp %i: mọi toast ≤ 90 ký tự (code point)', { timeout: 300_000 }, async (lv) => {
    const { seedLevel, buildEconomyWorld } = await import('../dev/simEconomy');
    const { createAutoplay } = await import('../dev/autoplay');
    const { useGame } = await import('../core/store');
    seedLevel(lv);
    const world = buildEconomyWorld();
    const autoplay = createAutoplay(world.shop, world.customers, world.staff, world.player);
    const seen = new Set<string>();
    const unsub = useGame.subscribe((s) => { if (s.message) seen.add(s.message); });
    autoplay(6);
    unsub();
    // eslint-disable-next-line no-console
    console.log(`[toast] ${seen.size} thông báo khác nhau, dài nhất ${Math.max(...[...seen].map((m) => [...m].length))}`);
    const over = [...seen].filter((m) => [...m.normalize('NFC')].length > 90);
    expect(seen.size, "bot phải gây ra vài thông báo thật").toBeGreaterThan(3);
    expect(over, `${over.length} toast dài hơn 90 ký tự:\n${over.join('\n')}`).toEqual([]);
  });
});
