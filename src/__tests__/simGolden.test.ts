import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';

// World 3D headless (pattern economySim.test.ts): three.js không cần WebGL, TextCanvas cần canvas giả.
vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'measureText') return () => ({ width: 0 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true,
});
beforeEach(() => {
  globalThis.document = {
    createElement: (tag: string) => (tag === 'canvas'
      ? { width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {} }
      : {}) as unknown as HTMLElement,
    createElementNS: () => ({} as Element),
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  } as unknown as Document;
  (globalThis as { window?: unknown }).window = {
    addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
  };
});

/**
 * Số mốc cân bằng — sim có seed là TẤT ĐỊNH (mọi rẽ ngẫu nhiên của logic đi qua simRng, chờ quầy
 * đếm theo tick khi seed), nên cùng seed luôn ra cùng số. Test này bắt hai loại lỗi:
 *  1. Tất định vỡ: ai đó thêm Math.random/Date.now vào logic game → 2 lần chạy ra số khác nhau.
 *  2. Lệch cân bằng: một giai đoạn vô tình làm tiền/XP/lãi lệch quá ±TOL so với mốc.
 * Đổi kinh tế CÓ CHỦ Ý (đã duyệt) → chạy lại, chép số mới in ở stdout vào GOLDEN, ghi lý do vào PROGRESS.md.
 */
const SEED = 169;
const TOL = 0.05;

interface Snap { money: number; level: number; xp: number; profit: number[]; quest: number[] }

const GOLDEN: Record<number, Snap> = {
  // Mốc lấy lại GĐ325 (trần thưởng 0,37× / sàn 66k), trước đó 31/10/2026: trần thưởng nhiệm vụ neo vào lãi bán hàng (salesProfit) — từ ngày 2 quest co lại.
  30: { money: 24_810_717, level: 31, xp: 1917, profit: [-16_989_000, -11_669_000, -1_860_000], quest: [2_145_000, 84_779, 172_283] },
};

async function run(level: number, days: number): Promise<Snap> {
  const { runEconomySim } = await import('../dev/simEconomy');
  setSimSeed(SEED);
  try {
    const { rows } = await runEconomySim(level, days, { betTier: 1.5 });
    const s = useGame.getState();
    return {
      money: Math.round(s.money), level: s.level, xp: s.xp,
      profit: rows.map((r) => r.operationalProfit), quest: rows.map((r) => r.quest),
    };
  } finally {
    clearSimSeed();
  }
}

const near = (actual: number, golden: number) => {
  const band = Math.max(Math.abs(golden) * TOL, 50_000); // sàn 50k để số gần 0 không đỏ vì vài nghìn đồng
  expect(Math.abs(actual - golden), `thực tế ${actual} so mốc ${golden} (±${Math.round(band)})`).toBeLessThanOrEqual(band);
};

describe('sim số mốc cân bằng (seed cố định, tất định)', () => {
  it('cấp 30 · 3 ngày: chạy 2 lần ra số giống hệt + nằm trong ±5% so với mốc', { timeout: 600_000 }, async () => {
    const a = await run(30, 3);
    const b = await run(30, 3);
    // eslint-disable-next-line no-console
    console.log('[GOLDEN 30]', JSON.stringify(a));
    expect(b, 'cùng seed phải ra cùng số — có Math.random/Date.now lọt vào logic game?').toEqual(a);
    const g = GOLDEN[30];
    expect(a.level).toBe(g.level);
    near(a.money, g.money);
    near(a.xp, g.xp);
    a.profit.forEach((p, i) => near(p, g.profit[i]));
    a.quest.forEach((q, i) => near(q, g.quest[i]));
  });
});
