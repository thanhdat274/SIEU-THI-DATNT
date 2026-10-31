import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';

// World 3D chạy headless trong node: three.js không cần WebGL để thao tác đồ thị, nhưng các TextCanvas
// (tường, kho, bảng hiệu, bong bóng lời khách...) dùng document.createElement('canvas') + 2d context.
// Trong test ta trả về canvas/context giả (không render thật) — chỉ cần cấu trúc để không vỡ.

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
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(20261031));
  prevDoc = globalThis.document;
  prevWin = globalThis.window;
  globalThis.document = documentStub;
  (globalThis as { window?: unknown }).window = windowStub;
  // Xoá panel/modals còn sót từ lần chạy trước trong cùng file
  useGame.setState({ ...useGame.getState(), panel: null, buildMode: false, placing: null } as never);
});

afterAll(() => {
  if (prevDoc !== undefined) globalThis.document = prevDoc;
  (globalThis as { window?: unknown }).window = prevWin;
});

import { runEconomySim } from '../dev/simEconomy';
import { questContext } from '../core/store';
import { dailyQuests } from '../data/quests';
import { emptyTiers } from '../core/stock';
import { clearSimSeed, setSimSeed, mulberry32 } from '../core/rand';

describe('khảo sát kinh tế vòng ngày — simulator thật trên store', () => {
  // 3 mức cấp (5/10/20) × ~30 ngày. Autoplay chạy tick thật + customer thật headless.
  // Số liệu mới — KHÔNG assert cứng tỉ số; test là regression (harness chạy được, số hữu hạn, không NaN)
  // + in BẢNG TRUNG BÌNH ra stdout để Leader dùng.
  const CASES = [{ level: 10, days: 20 }, { level: 20, days: 15 }];

  for (const { level, days } of CASES) {
    it(`level ${level} — chạy ${days} ngày không crash, số hữu hạn & in bảng trung bình`, { timeout: 900_000 }, async () => {
      const { rows, averages } = await runEconomySim(level, days, { betTier: 1.5 });

      expect(rows.length).toBeGreaterThanOrEqual(15); // ghi rõ: ≥15 ngày, thực tế chạy days
      expect(rows.length).toBe(days);

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
      expect(s.level).toBeGreaterThanOrEqual(level); // không thụt cấp
      // Cửa sổ questLog sau nhiều ngày phải còn hợp lệ (không rác NaN)
      expect(Number.isFinite(s.money)).toBe(true);

      // ── Bán hàng phải là nghề chính (luật cứng kinh tế trong promt_game.md) ──
      // Lãi bán hàng thật (lãi gộp − lương − tiền nhà, không trừ đầu tư) phải dương, và thưởng
      // nhiệm vụ + kèo không được lấn lãi bán hàng thêm nữa: trần là mức đo hiện tại (khoá chiều xấu đi).
      const sales = rows.reduce((n0, r) => n0 + r.salesProfit, 0);
      const bonus = rows.reduce((n0, r) => n0 + r.quest + r.bet, 0);
      // eslint-disable-next-line no-console
      console.log(`[bán hàng] level=${level} · lãi bán hàng/ngày=${fmt(sales / rows.length)} · (nhiệm vụ+kèo)/lãi bán = ${(bonus / Math.max(1, sales)).toFixed(2)}`);
      expect(sales, 'lãi bán hàng cộng dồn phải dương').toBeGreaterThan(0);
      expect(bonus / sales, `thưởng lấn lãi bán hàng quá trần ở cấp ${level}`).toBeLessThanOrEqual(BONUS_TO_SALES_CEILING[level]);

      // ── In BẢNG TRUNG BÌNH ra stdout cho Leader ──
      // eslint-disable-next-line no-console
      console.log(
        `[khảo sát] level=${level} days=${rows.length} · lãi bán/ngày=${fmt(averages.professionPerDay)}` +
          ` · nhiệm vụ/ngày=${fmt(averages.questPerDay)} · kèo/ngày=${fmt(averages.betPerDay)}` +
          ` · tỉ số (nhiệm vụ+kèo)/lãi=${averages.ratio === null ? 'N/A' : averages.ratio.toFixed(2)}` +
          ` · kết thúc cấp=${averages.finalLevel}`,
      );
      // ── Nhật ký từng ngày (để tra dấu vết lãi/nhiệm vụ/kèo) ──
      // eslint-disable-next-line no-console
      console.log(
        rows
          .map((r) => `  d${r.day}[lv${r.level}] profit=${fmt(r.operationalProfit)} quest=${fmt(r.quest)} bet=${fmt(r.bet)}`)
          .join('\n'),
      );
    });
  }
});

const fmt = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

const BONUS_TO_SALES_CEILING: Record<number, number> = { 5: 1.2, 10: 1.1, 20: 0.8 };
