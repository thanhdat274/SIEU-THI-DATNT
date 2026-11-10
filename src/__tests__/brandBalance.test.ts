import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { runEconomySim } from '../dev/simEconomy';import { brandSim } from '../dev/autoplay';
import { brandDealerById, type BrandState, type BrandDeal } from '../data/brand';
import type { Rival } from '../data/rivals';

// Hệ 4 L7 (SPEC-CHIEU-SAU §4.8) — KHUNG ĐO kinh tế nhãn riêng. Chạy sim cấp 100 (mốc seed cao nhất
// simEconomy), 8 ngày, seed 8123, gieo NHÃN RIÊNG trực tiếp vào store (sim mới không xây được mẻ Hệ-1
// → không có dòng nhãn tự sinh), bật bot `brand`. Đo "lãi ròng từ nhãn" = thu kỳ đại lý + rival (chưa
// trừ phí/lương xưởng — phía an toàn: thu quá lên, nếu thu chiếm ≤50% tổng lãi thì lãi ròng chắc chắn
// thấp hơn, §4.8 "vượt 50% là hệ này nuốt game bán lẻ").
//
// LƯU Ý seedLevel chặn ở cấp 100 nên các mốc 130/180 trong bảng §4.8 (3 dòng + 2 đại lý / 6 dòng + 5 đại
// lý + 3 nhượng quyền) cần mở rộng sim lên cấp cao — để sau (khung đo ở đây khóa sự thật chắc chắn ở cấp
// 100: nhãn có thu thật, KHÔNG chiếm quá nửa lãi; bot giao đúng kỳ đại lý khả dụng).
// Đây là test CHẬM (chạy sim 3D headless), theo polý đánh dấu it.skip khi chạy full để không kéo suite.

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
  width: 0, height: 0, style: {},
  getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {},
});
const documentStub = {
  createElement: (tag: string) => (tag === 'canvas' ? (stubCanvas() as unknown as HTMLElement) : ({} as HTMLElement)),
  createElementNS: () => ({} as Element), getElementById: () => null,
  querySelector: () => null, querySelectorAll: () => [],
} as unknown as Document;
const windowStub = {
  addEventListener: () => {}, removeEventListener: () => {},
  requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
} as unknown as Window & typeof globalThis;

let prevDoc: typeof globalThis.document | undefined;
let prevWin: typeof globalThis.window | undefined;

beforeEach(() => {
  prevDoc = globalThis.document;
  prevWin = globalThis.window;
  globalThis.document = documentStub;
  (globalThis as { window?: unknown }).window = windowStub;
  setSimSeed(8123);
});

afterAll(() => {
  clearSimSeed();
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  (globalThis as { window?: unknown }).window = prevWin;
});

/** Gieo nhãn riêng vào store đã seed (sim mới không xây được mẻ Hệ-1 → tự có mẻ), xong autoplay chạy. */
function injectBrand() {
  const s = useGame.getState();
  const def = brandDealerById('sap_cho_huyen')!;
  const deal: BrandDeal = {
    defId: 'sap_cho_huyen', dueDay: s.day + def.periodDays, delivered: 0, pending: true,
    streak: 0, overdue: false, committed: false, locked: {},
    productId: 'hx_nuoc_mam', missed: 0,
  };
  const brand: BrandState = {
    name: 'Nhà Năm',
    lines: [{ productId: 'hx_nuoc_mam', since: s.day - 20, made: 200, sold: 20 }],
    stock: { hx_nuoc_mam: 2000 },
    rep: 20, maxRep: 20, repLog: [],
    workshop: { open: true, staff: 3, tier: 0 },
    lastPackDay: s.day - 1,
    deals: { sap_cho_huyen: deal },
    franchises: [], franchiseDue: {},
    rivalSold: 0,
  };
  const rival: Rival = { name: 'Đối thủ thử', strength: 40, openedDay: s.day - 10 };
  useGame.setState({
    ...(useGame.getState()),
    biz: { ...s.biz, brand, rival },
    garden: { ...s.garden, preserveMade: { hx_nuoc_mam: 200 } },
    soldEver: { hx_nuoc_mam: 600 },
  } as never);
}

describe('Hệ4-L7 — brandBalance (§4.8): nhãn riêng có thu thật và không nuốt game bán lẻ', () => {
  it('cấp 100 · 8 ngày · nhãn 1 dòng: thu từ nhãn > 0, chiếm ≤ 50% tổng lãi, bot giao đúng kỳ đại lý', { timeout: 900_000 }, async () => {
    const res = await runEconomySim(100, 8, { brand: true, inject: injectBrand });
    const retailProfit = res.rows.reduce((n, r) => n + Math.max(0, (r.salesProfit as number)), 0);
    const income = brandSim.income;
    // §4.8: tỉ trọng nhãn so với TỔNG lãi ngày = brand / (retail + brand). Dùng THU GROSS làm chặn trên
    // của lãi ròng nhãn (chưa trừ phí/lương xưởng) nên nếu tỉ trọng này ≤ 50% thì lãi ròng chắc chắn thấp hơn.
    const share = retailProfit + income > 0 ? income / (retailProfit + income) : 0;
    // eslint-disable-next-line no-console
    console.log(`[brandBalance] thu_nhan=${income} · retail_lai=${Math.round(retailProfit)} · ti_trong=${share.toFixed(3)}`);
    expect(res.rows).toHaveLength(8);
    // Nhãn PHẢI có thu thật (bot giao được kỳ đại lý + rival) — nếu 0 là bot/cơ chế hỏng.
    expect(income).toBeGreaterThan(0);
    // Luật cứng §4.8: nhãn không chiếm quá nửa tổng lãi — vượt là hệ này nuốt game bán lẻ.
    expect(share).toBeLessThanOrEqual(0.5);
    // Bot giao đúng kỳ: hợp đồng Sạp chợ huyện đã được giao ≥ 1 lần.
    expect(useGame.getState().biz.brand!.deals.sap_cho_huyen.delivered).toBeGreaterThan(0);
  });
});
