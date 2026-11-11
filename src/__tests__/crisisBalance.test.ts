import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';

// World 3D chạy headless trong node (cùng pattern economySimL50): three.js không cần WebGL để thao
// tác đồ thị, nhưng TextCanvas dùng document.createElement('canvas') + 2d context → trả canvas/context
// giả (không render thật), chỉ cần cấu trúc để không vỡ.

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
import { seedCrisisOverride, clearCrisisOverride, crisisDefById, crisisTotalDays } from '../data/crisis';

// ── Hệ8-L4 — crisisBalance.test.ts ───────────────────────────────────────────────
// Khoá luật cân bằng chung (SPEC-CHIEU-RONG §8.3): chạy simEconomy cấp 45 qua TRỌN đợt Đào đường
// (đợt đại diện — chỉ toàn hệ số khách/kênh), so với cùng quãng không có biến cố.
//  - ép đợt vào slot cố định (seedCrisisOverride) để hai lượt chạy so được "cùng quãng";
//  - "không chuẩn bị": bot không mua prep; "chuẩn bị đủ": bot mua prep (crisisPrep).
// Điểm mốc (sau khi đo) ước: không chuẩn bị hụt rõ, chuẩn bị đủ hồi phục về gần mốc, không phá sản.
const DEF = 'dao_duong';
const START = 100; // năm 0, ngoài 30 ngày đầu & ngoài Tết (do có override nên không bị eligibleDay chặn)
const DEF_DAYS = crisisTotalDays(crisisDefById(DEF)!); // 4 + 10 + 4 = 18

const sumSales = (rows: { salesProfit: number }[]) => rows.reduce((n, r) => n + r.salesProfit, 0);

describe('Hệ8-L4 — crisisBalance: đào đường qua sim cấp 45', () => {
  it('không chuẩn bị hụt hơn mốc, chuẩn bị đủ hồi phục, không phá sản (khoá luật cân bằng)', { timeout: 900_000 }, async () => {
    setSimSeed(7031); // seed tất định → lịch sim cố định, tái lập được
    try {
      // 1) Mốc đối chứng: cùng quãng, Năm yên ả (tắt biến cố).
      const ctrl = await runEconomySim(45, DEF_DAYS, { calm: true, startDay: START });
      // 2) Có đợt, người chơi không làm gì.
      seedCrisisOverride({ defId: DEF, startDay: START });
      const noPrep = await runEconomySim(45, DEF_DAYS, { startDay: START });
      // 3) Có đợt, người chơi chuẩn bị đủ (bot tự mua prep).
      const prep = await runEconomySim(45, DEF_DAYS, { startDay: START, crisisPrep: true });
      clearCrisisOverride();

      const c = sumSales(ctrl.rows), n0 = sumSales(noPrep.rows), n1 = sumSales(prep.rows);
      // eslint-disable-next-line no-console
      console.log(`[crisisBalance] mốc=${Math.round(c)} · không chuẩn bị=${Math.round(n0)} (${((n0 / c - 1) * 100).toFixed(1)}%) · chuẩn bị=${Math.round(n1)} (${((n1 / c - 1) * 100).toFixed(1)}%)`);

      // Luật §8.3 — khoá theo các bất biến bền (không ép bot khớp ±5% chính xác — bot chỉ bán
      // trực tiếp, MÀY MÒ bỏ kênh online/điện thoại mà đào đường cố ý thưởng ×1,4/×1,5 nên phần
      // "không chuẩn bị" của bot tệ hơn người chơi thật; "chuẩn bị đủ" đại diện cho người chơi khá):
      expect(n0).toBeLessThan(c * 0.85);              // có đợt, không làm gì → hụt rõ (ít nhất ~15%)
      expect(n1).toBeGreaterThan(n0);                 // chuẩn bị đủ tốt hơn không làm gì
      expect(n1).toBeGreaterThan(c * 0.9);            // chuẩn bị đủ về gần mốc (hụt < 10%)
      expect(n1).toBeLessThan(c * 1.15);              // không quá đỉnh (không làm bóp méo tiền)
      expect(n0).toBeGreaterThan(c * 0.3);            // không bao giờ phá sản (số sàn thật là 0, nới cho bot)
    } finally {
      clearCrisisOverride();
      clearSimSeed();
    }
  });

  it('bot "biết chuẩn bị": khi có đợt, tự mua việc chuẩn bị vừa túi tiền', { timeout: 400_000 }, async () => {
    setSimSeed(104);
    try {
      seedCrisisOverride({ defId: DEF, startDay: START });
      // Chạy 5 ngày đầu đợt (Báo trước + đầu Cao điểm) — đợt chưa kết thúc nên đọc được preps.
      await runEconomySim(45, 5, { startDay: START, crisisPrep: true });
      clearCrisisOverride();
      const preps = useGame.getState().biz.crisis?.preps ?? [];
      // 3 việc chuẩn bị của đào đường đều vừa túi tiền → bot nên mua được, ít nhất 2.
      expect(preps.length).toBeGreaterThanOrEqual(2);
    } finally {
      clearCrisisOverride();
      clearSimSeed();
    }
  });
});
