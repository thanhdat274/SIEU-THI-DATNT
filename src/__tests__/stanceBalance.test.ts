import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { referenceSell } from '../data/pricing';
import { SERVICES } from '../data/services';
import { orderDacSanCandidates } from '../dev/autoplay';
import { isSpecialtyProduct } from '../data/stance';

// Hệ 3 L2 (SPEC-CHIEU-SAU §3.8) — dựng khung ĐO cân bằng hướng biển trước khi bật hiệu ứng.
// Chạy sim cấp 65 (≥ STANCE_UNLOCK 60), 10 ngày, cùng seed, BỐN kịch bản: không biển + ba chính sách
// bot (Bình dân / Đặc sản / Tiện lợi). L2 HIỆU ỨNG = 0 (công thức kinh tế chưa đổi) → không ép dải
// ±5-20% lợi nhuận; chỉ khoá rằng khung chạy được và 3 chính sách tạo HÀNH VI khác biệt để lát L3-L5
// so sánh khi bật hiệu ứng.

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
  useGame.setState({ ...useGame.getState(), panel: null, buildMode: false, placing: null } as never);
});

afterAll(() => {
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  (globalThis as { window?: unknown }).window = prevWin;
});

import { runEconomySim } from '../dev/simEconomy';
import { setSimSeed, clearSimSeed } from '../core/rand';

const LV = 65;
const DAYS = 10;
const sumSales = (rows: { salesProfit: number }[]) => rows.reduce((n, r) => n + r.salesProfit, 0);

/** Tỉ lệ giá đang bày / giá thị trường cho từng ô kệ đã định giá (giá bot Bình dân ~0.95). */
function displayedPriceRatios(): number[] {
  const s = useGame.getState();
  const ratios: number[] = [];
  for (const f of s.furniture) {
    if (f.type !== 'shelf') continue;
    for (const t of f.tiers) {
      if (!t.productId) continue;
      const ref = referenceSell(t.productId);
      const shown = (s.prices ?? {})[t.productId] ?? ref;
      if (ref > 0) ratios.push(shown / ref);
    }
  }
  return ratios;
}

describe('Hệ3-L2 — stanceBalance: khung đo chính sách bot (hiệu ứng = 0)', () => {
  it('bốn kịch bản chạy được 10 ngày cấp 65 cùng seed; ba chính sách tạo hành vi khác biệt', { timeout: 900_000 }, async () => {
    setSimSeed(7257); // seed tất định cho cả sim và RNG ngẫu nhiên khác
    try {
      // 1) Mốc: không biển.
      const base = await runEconomySim(LV, DAYS, {});
      const baseRatios = displayedPriceRatios();
      const baseHasNight = (useGame.getState().biz.upgrades ?? []).includes('night');
      const baseServices = (useGame.getState().biz.services ?? []).length;

      // 2) Bình dân: hạ giá toàn bộ bày kệ về ~95% thị trường.
      const bd = await runEconomySim(LV, DAYS, { stance: 'binh_dan' });
      const bdRatios = displayedPriceRatios();

      // 3) Đặc sản: ưu tiên bày hàng đặc sản (khung đo; hiệu ứng bật ở L4).
      const ds = await runEconomySim(LV, DAYS, { stance: 'dac_san' });

      // 4) Tiện lợi: ca đêm + đủ dịch vụ.
      const tl = await runEconomySim(LV, DAYS, { stance: 'tien_loi' });
      const tlHasNight = (useGame.getState().biz.upgrades ?? []).includes('night');
      const tlServices = (useGame.getState().biz.services ?? []).length;

      // eslint-disable-next-line no-console
      console.log(
        `[stanceBalance] mốc=${Math.round(sumSales(base.rows))} · bình_dân=${Math.round(sumSales(bd.rows))}` +
          ` · đặc_sản=${Math.round(sumSales(ds.rows))} · tiện_lợi=${Math.round(sumSales(tl.rows))}`,
      );

      // Khung chạy được: mọi kịch bản đủ 10 ngày.
      expect(base.rows).toHaveLength(DAYS);
      expect(bd.rows).toHaveLength(DAYS);
      expect(ds.rows).toHaveLength(DAYS);
      expect(tl.rows).toHaveLength(DAYS);

      // Bình dân: hành vi khác biệt — hạ giá bày kệ về ~95% thị trường; trung bình rõ rẻ hơn mốc
      // và có món thật rẻ (L2 hiệu ứng = 0, 1-2 tầng giữ giá cũ không làm hỏng khung đo).
      expect(bdRatios.length).toBeGreaterThan(0);
      const avg = (rs: number[]) => rs.reduce((n, r) => n + r, 0) / rs.length;
      expect(Math.min(...bdRatios)).toBeLessThanOrEqual(0.96);
      if (baseRatios.length) expect(avg(bdRatios)).toBeLessThan(avg(baseRatios));
      // Không biển không cố tình hạ (ít nhất không toàn bộ ≤ 97%).
      if (baseRatios.length) expect(baseRatios.some((r) => r > 0.97)).toBe(true);

      // Tiện lợi: hành vi khác biệt — bật ca đêm + đủ dịch vụ; mốc không chắc đã full.
      expect(tlHasNight).toBe(true);
      expect(tlServices).toBe(SERVICES.length);
      if (!baseHasNight && baseServices < SERVICES.length) {
        expect(baseHasNight).not.toBe(tlHasNight);
      }

      // Đặc sản: khung chạy được (hiệu ứng thật bật ở L4).
      expect(ds.rows.length).toBeGreaterThan(0);
    } finally {
      clearSimSeed();
    }
  });
});

describe('orderDacSanCandidates — bot Đặc sản ưu tiên bày hàng đặc sản', () => {
  it('xếp ứng viên đặc sản lên trước ứng viên thường', () => {
    const cands = [
      { id: 'mi' },              // mì gói — hàng thường
      { id: 'hx_ca_kho' },       // cá kho nhà làm — đặc sản (hàng xóm)
      { id: 'gao_nd' },          // gạo nương — hàng thường
      { id: 'hx_khoai_say' },    // khoai sấy nhà làm — đặc sản (hàng xóm)
    ];
    const sorted = orderDacSanCandidates(cands);
    // ít nhất 1 ứng viên đặc sản phải đứng TRƯỚC ứng viên thường đầu tiên
    const specPos = sorted.findIndex((c) => isSpecialtyProduct(c.id));
    const firstNormal = sorted.findIndex((c) => !isSpecialtyProduct(c.id));
    expect(specPos).toBeGreaterThanOrEqual(0);
    expect(specPos).toBeLessThan(firstNormal);
  });
});
