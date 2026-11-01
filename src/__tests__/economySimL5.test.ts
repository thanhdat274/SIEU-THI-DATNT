import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';

// GĐ669: tách khỏi economySim.test.ts — bài sim cấp 5 × 30 ngày là bài dài nhất (~170s), tách ra
// chạy song song với các file sim khác để `npm run test` không sát trần 5 phút. Số mốc & trần GIỮ NGUYÊN.

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

let prevDoc: typeof globalThis.document | undefined;
let prevWin: typeof globalThis.window | undefined;

// Lô hàng thật (autoplay real customers) dùng `window` cho keydown của Player — cần stub add/remove.
const windowStub = {
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (f: FrameRequestCallback) => f(0),
  devicePixelRatio: 1,
} as unknown as Window & typeof globalThis;

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261031)); // GĐ321: sim tất định → tỉ số đo được chính xác
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
import { mulberry32 } from '../core/rand';

describe('khảo sát kinh tế vòng ngày — cấp 5, 30 ngày', () => {
  it('level 5 — chạy 30 ngày không crash, số hữu hạn & in bảng trung bình', { timeout: 900_000 }, async () => {
    const { rows, averages } = await runEconomySim(5, 30, { betTier: 1.5 });

    expect(rows.length).toBeGreaterThanOrEqual(15); // ghi rõ: ≥15 ngày, thực tế chạy days
    expect(rows.length).toBe(30);

    // ── Assert mềm: mọi số hữu hạn, không NaN ──
    for (const r of rows) {
      expect(Number.isNaN(r.operationalProfit), `day ${r.day} profit NaN`).toBe(false);
      expect(Number.isFinite(r.operationalProfit), `day ${r.day} profit không hữu hạn`).toBe(true);
      expect(Number.isNaN(r.quest)).toBe(false);
      expect(Number.isNaN(r.bet)).toBe(false);
      expect(Number.isFinite(r.quest)).toBe(true);
      expect(Number.isFinite(r.bet)).toBe(true);
    }
    expect(Number.isNaN(averages.professionPerDay)).toBe(false);
    expect(Number.isFinite(averages.professionPerDay)).toBe(true);
    expect(Number.isNaN(averages.questPerDay)).toBe(false);
    expect(Number.isNaN(averages.betPerDay)).toBe(false);
    expect(Number.isFinite(averages.questPerDay)).toBe(true);
    expect(Number.isFinite(averages.betPerDay)).toBe(true);
    if (averages.ratio !== null) {
      expect(Number.isNaN(averages.ratio)).toBe(false);
      expect(Number.isFinite(averages.ratio)).toBe(true);
    }

    // Tiền két thật không NaN, hàng hoá không vỡ (guồng chạy ổn định)
    const s = useGame.getState();
    expect(Number.isFinite(s.money)).toBe(true);
    expect(Number.isNaN(s.money)).toBe(false);
    expect(s.level).toBeGreaterThanOrEqual(5); // không thụt cấp

    // ── Bán hàng phải là nghề chính (luật cứng kinh tế trong promt_game.md) ──
    const sales = rows.reduce((n0, r) => n0 + r.salesProfit, 0);
    const bonus = rows.reduce((n0, r) => n0 + r.quest + r.bet, 0);
    // eslint-disable-next-line no-console
    console.log(`[bán hàng] level=5 · lãi bán hàng/ngày=${fmt(sales / rows.length)} · (nhiệm vụ+kèo)/lãi bán = ${(bonus / Math.max(1, sales)).toFixed(2)}`);
    expect(sales, 'lãi bán hàng cộng dồn phải dương').toBeGreaterThan(0);
    expect(bonus / sales, 'thưởng lấn lãi bán hàng quá trần ở cấp 5').toBeLessThanOrEqual(BONUS_TO_SALES_CEILING[5]);

    // ── In BẢNG TRUNG BÌNH ra stdout cho Leader ──
    // eslint-disable-next-line no-console
    console.log(
      `[khảo sát] level=5 days=${rows.length} · lãi bán/ngày=${fmt(averages.professionPerDay)}` +
        ` · nhiệm vụ/ngày=${fmt(averages.questPerDay)} · kèo/ngày=${fmt(averages.betPerDay)}` +
        ` · tỉ số (nhiệm vụ+kèo)/lãi=${averages.ratio === null ? 'N/A' : averages.ratio.toFixed(2)}` +
        ` · kết thúc cấp=${averages.finalLevel}`,
    );
    // eslint-disable-next-line no-console
    console.log(
      rows
        .map((r) => `  d${r.day}[lv${r.level}] profit=${fmt(r.operationalProfit)} quest=${fmt(r.quest)} bet=${fmt(r.bet)}`)
        .join('\n'),
    );
  });
});

const fmt = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

/**
 * Trần tỉ số (thưởng nhiệm vụ + kèo) / lãi bán hàng thật, đo ngày 2026-10-31: mô phỏng KHÔNG tất định
 * giữa các lần chạy (đo được 5.1–7.5 / 18–20 / 3.1–5.2) nên trần = mức cao nhất +25%.
 * Mục tiêu dài hạn trong promt_game.md: tỉ số ≤ 1 (bán hàng là nguồn thu chính). Cân bằng lại xong thì
 * HẠ trần này theo số đo mới — không bao giờ nâng lên.
 */
// GĐ332: hạ phần trăm kèo 25/40/65% → đo cấp 5 0.99 · cấp 10 0.89 · cấp 20 0.64. GĐ321: sim TẤT ĐỊNH (Math.random seed 20261031) đo cấp 5 1.13 · cấp 10 1.02 · cấp 20 0.71 (sau GĐ322; trước 1.53/1.29/0.96); trần = đo + đệm nhỏ. Chỉ được hạ.
const BONUS_TO_SALES_CEILING: Record<number, number> = { 5: 1.0 };
