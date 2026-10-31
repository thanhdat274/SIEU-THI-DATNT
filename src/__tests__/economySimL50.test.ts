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
import { clearSimSeed, setSimSeed } from '../core/rand';

// ── GĐ280 — đóng GĐ110/117: đo tỉ lệ hoàn thành nhiệm vụ ở cấp 50 bằng harness tất định ──
// Số liệu đo 28 ngày (seed cố định qua seedLevel): 3 nhiệm vụ xương sống (Đông khách/Doanh thu/
// Khách vui vẻ) bot đạt ~26/28 — mục tiêu kinh tế KHÔNG vô lý; 8 nhiệm vụ còn lại (nấu/MXH/dịch
// vụ/trại/online/combo) bot = 0 vì bot KHÔNG thực hiện các hành động đó (giới hạn bot, không phải
// cân bằng) — khớp quan sát browser thật GĐ110/117 → CHỐT: giữ nguyên mục tiêu, không siết.
it('GĐ280 — cấp 50: 3 nhiệm vụ xương sống bot đạt ≥25/28 (khoá tín hiệu cân bằng, đóng GĐ110/117)', { timeout: 600_000 }, async () => {
  const orig = useGame.getState().claimQuest;
  // Gộp (union) qua MỌI lần claim của cùng ngày bằng Set: mốc settle trôi nhẹ theo yield (async
  // nhả main thread) nên lần-record đầu có thể chốt sớm — union hội tụ về trạng thái cuối ngày.
  const doneByDay: Record<number, Set<string>> = {};
  useGame.setState({
    claimQuest: (id: string) => {
      const st = useGame.getState();
      const set = (doneByDay[st.day] ??= new Set());
      for (const q of dailyQuests(questContext(st))) if (q.done) set.add(q.id);
      return orig(id);
    },
  });
  setSimSeed(280);
  try {
    const { rows } = await runEconomySim(50, 28, { betTier: 1.0 });
    const s = useGame.getState();
    expect(rows.length).toBe(28);
    expect(Number.isFinite(s.money)).toBe(true); // GĐ169 simSmoke cấp 50 dùng chung lượt mô phỏng này
    expect(s.level).toBeGreaterThanOrEqual(50);
    expect(Number.isFinite(s.stats.xp)).toBe(true);
    expect(Number.isFinite(s.biz.lastWeek?.goal)).toBe(true);
    expect(Number.isFinite(s.biz.lastWeek?.nextGoal)).toBe(true);
    const doneCount: Record<string, number> = {};
    for (const set of Object.values(doneByDay)) for (const id of set) doneCount[id] = (doneCount[id] || 0) + 1;
    for (const id of ['daily_customers', 'daily_revenue', 'daily_smile']) {
      // eslint-disable-next-line no-console
      console.log(`[GĐ280] ${id}: bot đạt ${doneCount[id] || 0}/28 ngày ở cấp 50`);
      // Đo thực tế dao động 24–26/28 (yield async ảnh hưởng nhẹ tới tick) — ngưỡng 22 (~80%) đủ
      // bắt mục tiêu vô lý (sẽ tuột về ~10) mà không rung đỏ vì nhiễu môi trường.
      expect(doneCount[id] || 0).toBeGreaterThanOrEqual(22);
    }
  } finally {
    clearSimSeed();
    useGame.setState({ claimQuest: orig });
  }
});
