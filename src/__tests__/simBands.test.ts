import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { installHeadless, near, readGolden, UPDATING, writeGolden, type Snap } from './goldenFile';

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));
beforeEach(installHeadless);

/**
 * DẢI CÂN BẰNG (SPEC-TOI-UU §T4, trụ thứ hai). simGolden chạy ở KỶ NGUYÊN 0 nên không còn thấy
 * nội dung mới — file này là lưới bù: sim trên NỘI DUNG ĐẦY ĐỦ ở 5 mốc cấp, sai số rộng ±15%.
 * Thêm vài món không làm đỏ; một hệ/nội dung làm lệch kinh tế cả dải thì đỏ.
 * Đỏ vì thay đổi CÓ CHỦ Ý → `npm run golden:update -- "<lý do>"` (ghi docs/GOLDEN-LOG.md).
 */
const SEED = 169;
const DAYS = 3;
const TOL = 0.15;
export const BAND_LEVELS = [10, 30, 50, 65, 100];

async function run(level: number): Promise<Snap> {
  const { runEconomySim } = await import('../dev/simEconomy');
  setSimSeed(SEED);
  try {
    const { rows } = await runEconomySim(level, DAYS, { betTier: 1.5 });
    const s = useGame.getState();
    return { money: Math.round(s.money), level: s.level, xp: s.xp, profit: rows.map((r) => r.operationalProfit), quest: rows.map((r) => r.quest) };
  } finally {
    clearSimSeed();
  }
}

describe('dải cân bằng — nội dung đầy đủ, 5 mốc cấp, ±15%', () => {
  for (const level of BAND_LEVELS) {
    it(`cấp ${level} · ${DAYS} ngày`, { timeout: 600_000 }, async () => {
      const a = await run(level);
      // eslint-disable-next-line no-console
      console.log(`[BAND ${level}]`, JSON.stringify(a));
      if (UPDATING) { writeGolden((g) => { g.bands[String(level)] = a; }); return; }
      const g = readGolden().bands[String(level)];
      expect(g, `chưa có mốc cấp ${level} — chạy npm run golden:update -- "<lý do>"`).toBeTruthy();
      // Tiền cuối kỳ và tổng lãi 3 ngày: sàn = 1 triệu × (cấp/10) để ván nhỏ không đỏ vì vài trăm nghìn.
      const floor = 1_000_000 * Math.max(1, level / 10);
      near(a.money, g.money, TOL, floor, 'tiền cuối kỳ');
      near(a.profit.reduce((x, y) => x + y, 0), g.profit.reduce((x, y) => x + y, 0), TOL, floor, 'tổng lãi vận hành');
      expect(Math.abs(a.level - g.level), 'cấp cuối kỳ').toBeLessThanOrEqual(1);
    });
  }
});
