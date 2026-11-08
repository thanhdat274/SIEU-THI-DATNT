import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { useGame, newGameData } from '../core/store';

// GĐ1827/1828 — review người chơi R2: ngày 1 với vốn mới người mới vẫn mất khách vì hết hàng
// hay không. Khoá trần theo mức đo: chỉ được giảm, tăng phải kèm lý do trong PROGRESS.md.

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

/** Chạy đúng 1 ngày save trắng với vốn `cap`, trả về số liệu tổng kết ngày (lastSummary). */
async function day1With(cap: number) {
  useGame.setState({ ...newGameData(), money: cap, shopOpen: false, panel: null, buildMode: false, placing: null });
  const world = buildEconomyWorld();
  const run = createAutoplay(world.shop, world.customers, world.staff, world.player, { betTier: 1.0 }) as ReturnType<typeof createAutoplay> & { async: (days: number) => Promise<Record<string, number | string | Record<string, number>>[]> };
  await run.async(1);
  return useGame.getState().lastSummary?.stats;
}

describe('review R2 — ngày 1 vốn mới không được để khách rơi rụng vì hết hàng', () => {
  it('ngày 1 save trắng: lỡ vì hết hàng dưới trần khoá — chỉ được giảm', async () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261108));
    const s = await day1With(newGameData().money);
    const stock = s?.missed?.stock ?? 0;
    // eslint-disable-next-line no-console
    console.log(`[R2] ngày 1 vốn ${newGameData().money}: khách=${s?.customers} · bán=${s?.itemsSold} · doanh thu=${s?.revenue} · lỡ: hết hàng=${stock} chờ lâu=${s?.missed?.wait} chê đắt=${s?.missed?.price}`);
    expect(Number.isFinite(stock)).toBe(true);
    // Trần = mức đo GĐ1827 (vốn 360k, bot châm kệ tối ưu): 17 — trước vốn 280k đo 28/55 lượt. Chỉ được giảm.
    // GĐ1828: đo 5 mức vốn 360→480k — lỡ-bán KHÔNG giảm đều theo vốn (16/17/12/9/25, phi tuyến do
    // bot mua hỗn hợp món khác đi) ⇒ tăng vốn không phải đòn bẩy; giữ 360k. Muốn sâu hơn phải làm
    // cơ chế thay-món khi hết hàng / chỉnh cầu-mix — đề xuất thiết kế riêng, không tune theo 1 lần chạy.
    expect(stock, 'ngày 1 mất quá nhiều khách vì hết hàng — xem lại vốn/cầu ngày đầu (review R2)').toBeLessThanOrEqual(17);
  }, 600_000);

  it('GĐ1828 — đo nhiều mức vốn để chọn vốn ngày đầu (in bảng, không assert cứng)', async () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261108));
    const out: string[] = [];
    for (const cap of [360_000, 400_000, 420_000, 450_000, 480_000]) {
      const s = await day1With(cap);
      out.push(`vốn ${cap}: khách=${s?.customers} bán=${s?.itemsSold} doanh thu=${s?.revenue} lỡ_hết_hàng=${s?.missed?.stock ?? 0} chờ_lâu=${s?.missed?.wait ?? 0}`);
    }
    // eslint-disable-next-line no-console
    console.log('[R2-đo]\n' + out.join('\n'));
    expect(out.length).toBe(5);
  }, 600_000);
});
