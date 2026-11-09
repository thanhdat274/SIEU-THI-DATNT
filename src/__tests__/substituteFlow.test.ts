import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { useGame, newGameData } from '../core/store';
import { snapshot, applySnapshot } from '../core/save';

// GĐ1829 — OpenSpec khach-thay-mon-het-hang: luồng thật trên store + agent khách.

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => {
  const noop = () => {};
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop: noop });
      }
      return noop;
    },
    set: () => true,
  });
};
const stubCanvas = () => ({
  width: 0,
  height: 0,
  style: {},
  getContext: () => stub2d(),
  toDataURL: () => '',
  addEventListener: () => {},
});
const documentStub = {
  createElement: (tag: string) => (tag === 'canvas' ? (stubCanvas() as unknown as HTMLElement) : ({} as HTMLElement)),
  createElementNS: () => ({} as Element),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
} as unknown as Document;
const windowStub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (f: FrameRequestCallback) => f(0),
  devicePixelRatio: 1,
} as unknown as Window & typeof globalThis;

let prevDoc: typeof globalThis.document | undefined;
let prevWin: typeof globalThis.window | undefined;

beforeAll(() => {
  prevDoc = globalThis.document;
  prevWin = globalThis.window;
  globalThis.document = documentStub;
  (globalThis as { window?: unknown }).window = windowStub;
});
afterAll(() => {
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  (globalThis as { window?: unknown }).window = prevWin;
});

import { buildEconomyWorld } from '../dev/simEconomy';
import { createAutoplay } from '../dev/autoplay';
import { mulberry32 } from '../core/rand';

describe('thay món khi hết hàng — luồng thật (GĐ1829)', () => {
  it('ngày 1 save trắng: có lượt thay món thành công và lỡ-bán không tăng so với trần cũ', async () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261108));
    useGame.setState({ ...newGameData(), shopOpen: false, panel: null, buildMode: false, placing: null });
    const world = buildEconomyWorld();
    // Dùng autoplay ĐỒNG BỘ (không nhả thread) — bất biến với tải máy; biến thể async rung tick
    // khi chạy chung full suite làm đổi nhánh rng (đã bắt được: standalone 12 lượt thay, dưới tải 0).
    const run = createAutoplay(world.shop, world.customers, world.staff, world.player, { betTier: 1.0 });
    run(1);
    const s = useGame.getState().lastSummary?.stats;
    // eslint-disable-next-line no-console
    console.log(`[GĐ1829] ngày 1: khách=${s?.customers} bán=${s?.itemsSold} lỡ_hết_hàng=${s?.missed?.stock} thay_món=${s?.substituted} doanh thu=${s?.revenue}`);
    expect((s?.substituted ?? 0), 'cơ chế thay món phải nổ ít nhất 1 lượt trong ngày 1').toBeGreaterThan(0);
    expect((s?.missed?.stock ?? 0), 'lỡ-bán phải không tệ hơn trần cũ (17)').toBeLessThanOrEqual(17);
  }, 600_000);

  it('save cũ không có substituted nạp bình thường; snapshot khép vòng giữ được bộ đếm', () => {
    useGame.setState({ ...newGameData(), stats: { ...newGameData().stats, substituted: 7 } });
    const snap = snapshot();
    applySnapshot(JSON.parse(JSON.stringify(snap)) as never);
    expect(useGame.getState().stats.substituted).toBe(7);
    // save cũ (không có field) → undefined, game vẫn chạy
    const old = JSON.parse(JSON.stringify(snap)) as Record<string, unknown>;
    (old.stats as Record<string, unknown>).substituted = undefined;
    applySnapshot(old as never);
    expect(useGame.getState().stats.substituted).toBeUndefined();
  });
});
