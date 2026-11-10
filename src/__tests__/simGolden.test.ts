import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { setContentEpoch } from '../data/contentEpoch';
import { installHeadless, near as nearTol, readGolden, UPDATING, writeGolden, type Snap } from './goldenFile';

// World 3D headless (pattern economySim.test.ts): three.js không cần WebGL, TextCanvas cần canvas giả.
vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

beforeEach(installHeadless);

/**
 * Số mốc cân bằng — sim có seed là TẤT ĐỊNH (mọi rẽ ngẫu nhiên của logic đi qua simRng, chờ quầy
 * đếm theo tick khi seed), nên cùng seed luôn ra cùng số. Test này bắt hai loại lỗi:
 *  1. Tất định vỡ: ai đó thêm Math.random/Date.now vào logic game → 2 lần chạy ra số khác nhau.
 *  2. Lệch cân bằng: một giai đoạn vô tình làm tiền/XP/lãi lệch quá ±TOL so với mốc.
 * Đổi kinh tế CÓ CHỦ Ý (đã duyệt) → `npm run golden:update -- "<lý do>"` (ghi golden.json + docs/GOLDEN-LOG.md).
 *
 * KỶ NGUYÊN NỘI DUNG (SPEC-TOI-UU §T4): sim chạy ở `setContentEpoch(0)` — chỉ thấy nội dung gốc. Món/công thức
 * mới ghi `since: 1` nên KHÔNG làm lệch mốc này dù mở ở cấp nào (lưới bù cho nội dung mới: simBands.test.ts).
 */
const SEED = 169;
const TOL = 0.05;

// Mốc nằm ở golden.json (`golden30`). Lịch sử các lần chép lại mốc TRƯỚC khi có docs/GOLDEN-LOG.md:
const _HISTORY = {
  // Mốc lấy lại GĐ325 (trần thưởng 0,37× / sàn 66k), trước đó 31/10/2026: trần thưởng nhiệm vụ neo vào lãi bán hàng (salesProfit) — từ ngày 2 quest co lại.
  // GĐ609: ngày 1 là ngày cúng (mùng 1) — khách hỏi nhang/trái cây (kéo 0,08) → tiền 3 ngày +5,8%.
  // GĐ1253: thu ngân tự quyết mặc cả/tiền lẻ rút DÒNG RIÊNG cashierRng (rand.ts) — chuỗi kinh tế chính
  // giữ nguyên từng nhịp nên mốc KHÔNG đổi (đã đối chiếu: chạy trước/sau GĐ1253 ra số hệt nhau).
  // GĐ1507: sửa bug elapsed=0 của maybeSurprise + GĐ1506 kiểm tra vệ sinh sống lại → pool sự kiện
  // một-phát bắn (thêm lượt gieo pick) + inspect phạt/quét sàn trong sim → chuỗi kinh tế dịch có chủ ý.
  // Bot không chooseSurprise — mọi lệch là gián tiếp qua chuỗi rng + dirt sạch hơn (kéo khách).
  // GĐ1829: cơ chế khách thay món khi hết hàng (OpenSpec khach-thay-mon-het-hang) — doanh thu/XP tăng
  // CÓ CHỦ Ý (thay 12 lượt ngày 1; L30 3 ngày money +8.7%, xp 1260→2379) → chép lại mốc theo quy trình
  // "đổi kinh tế có chủ ý" ghi ở đầu file.
  // 30: { money: 24_363_320, level: 31, xp: 2244, profit: [-16_861_000, -12_200_000, -2_244_000], quest: [2_145_000, 128_595, 189_611] } — re-baseline có chủ ý 09/11: tạp hóa 6:00–22:00 → 8:00–22:30 (money −16,5%) rồi cao điểm sáng dời 8h30 → 9h (money −2,7%)
};
void _HISTORY;

async function run(level: number, days: number): Promise<Snap> {
  const { runEconomySim } = await import('../dev/simEconomy');
  setSimSeed(SEED);
  setContentEpoch(0);
  try {
    const { rows } = await runEconomySim(level, days, { betTier: 1.5 });
    const s = useGame.getState();
    return {
      money: Math.round(s.money), level: s.level, xp: s.xp,
      profit: rows.map((r) => r.operationalProfit), quest: rows.map((r) => r.quest),
    };
  } finally {
    setContentEpoch(Infinity);
    clearSimSeed();
  }
}

const near = (actual: number, golden: number) => nearTol(actual, golden, TOL, 50_000, 'golden 30'); // sàn 50k để số gần 0 không đỏ vì vài nghìn đồng

describe('sim số mốc cân bằng (seed cố định, tất định)', () => {
  it('cấp 30 · 3 ngày: chạy 2 lần ra số giống hệt + nằm trong ±5% so với mốc', { timeout: 600_000 }, async () => {
    const a = await run(30, 3);
    const b = await run(30, 3);
    // eslint-disable-next-line no-console
    console.log('[GOLDEN 30]', JSON.stringify(a));
    expect(b, 'cùng seed phải ra cùng số — có Math.random/Date.now lọt vào logic game?').toEqual(a);
    if (UPDATING) { writeGolden((f) => { f.golden30 = a; }); return; }
    const g = readGolden().golden30;
    expect(a.level).toBe(g.level);
    near(a.money, g.money);
    near(a.xp, g.xp);
    a.profit.forEach((p, i) => near(p, g.profit[i]));
    a.quest.forEach((q, i) => near(q, g.quest[i]));
  });
});
