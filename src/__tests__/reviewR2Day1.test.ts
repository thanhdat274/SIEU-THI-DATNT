import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { useGame, newGameData } from '../core/store';

// GĐ1827 — review người chơi R2: ngày 1 với vốn mới (360k — GĐ1823) người mới vẫn mất khách
// vì hết hàng hay không. Khoá trần theo mức đo: chỉ được giảm, tăng phải kèm lý do trong PROGRESS.md.

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

describe('review R2 — ngày 1 vốn mới (360k) không được để khách rơi rụng vì hết hàng', () => {
  it('ngày 1 save trắng: đo lỡ bán theo lý do — trần khoá theo mức đo GĐ1827', async () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261108));
    // Save trắng ĐÚNG như người chơi mới: newGameData() nguyên vẹn (360k, 2 kệ khai trương, kho 10/10/5)
    useGame.setState({ ...newGameData(), shopOpen: false, panel: null, buildMode: false, placing: null });
    const world = buildEconomyWorld();
    const run = createAutoplay(world.shop, world.customers, world.staff, world.player, { betTier: 1.0 }) as ReturnType<typeof createAutoplay> & { async: (days: number) => Promise<Record<string, number | string | Record<string, number>>[]> };
    const rows = await run.async(1);
    const r = rows[0];
    const missed = (r.missed as Record<string, number>) ?? {};
    const stock = missed.stock ?? 0;
    const sum = useGame.getState().lastSummary;
    const s = sum?.stats;
    // eslint-disable-next-line no-console
    console.log(`[R2] ngày 1 vốn 360k (lastSummary): khách=${s?.customers} · bán=${s?.itemsSold} · doanh thu=${s?.revenue} · lỡ: hết hàng=${s?.missed?.stock} chê đắt=${s?.missed?.price} chờ lâu=${s?.missed?.wait} · hàng lô:${JSON.stringify(r).slice(0, 400)}`);
    expect(Number.isFinite(stock)).toBe(true);
    // Trần khoá theo mức đo — sửa thiết kế, không nâng trần (ngân sách chống phình)
    // Trần = mức đo GĐ1827 (vốn 360k, bot châm kệ tối ưu): 17 — trước vốn 280k đo 28/55 lượt. Chỉ được giảm.
    expect(stock, 'ngày 1 mất quá nhiều khách vì hết hàng — xem lại vốn/cầu ngày đầu (review R2)').toBeLessThanOrEqual(17);
  }, 600_000);
});
