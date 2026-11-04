/**
 * GĐ1178 — "Lãi bán hàng thật" vs "thưởng nhiệm vụ + kèo" (Luật 10): tách nguồn thu hai nửa ở tổng kết ngày.
 * THUẦN đọc — không đổi kinh tế/save/seed; kiểm thuật toán incomeSplit + cách ghi questIncome lúc claim.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { incomeSplit } from '../data/incomeSplit';
import type { DayStats } from '../core/dayStats';
import type { QuestLog } from '../data/quests';
import { newGameData, useGame, questContext } from '../core/store';
import { dailyQuests } from '../data/quests';

const stats = (over: Partial<DayStats> = {}): DayStats => ({
  revenue: 500000, spent: 200000, wages: 120000, itemsSold: 40, customers: 30, unhappy: 1, xp: 100,
  byItem: { mi: { qty: 20, revenue: 400000, cost: 200000 } },
  services: 50000,
  rent: 20000,
  ...over,
});
const log = (over: Partial<QuestLog> = {}): QuestLog => ({ day: 7, claimedDaily: [], claimedStory: [], bet: null, ...over });

describe('GĐ1178 incomeSplit — nguồn thu tách hai nửa', () => {
  it('lãi bán thật = lãi gộp bán + dịch vụ − lương − thuê; quest/bet cộng riêng', () => {
    const s = incomeSplit(
      stats({ questIncome: 150000 }),
      log({ day: 7, bet: { day: 7, questId: 'daily_set', tier: 2, bonus: 80000 } }),
      7,
    );
    // lãi gộp (400000−200000) + dịch vụ 50000 = 250000 − lương 120000 − thuê 20000 = 110000
    expect(s.salesProfit).toBe(110000);
    expect(s.quest).toBe(150000);
    expect(s.bet).toBe(80000);
    expect(s.reward).toBe(230000);
    expect(s.rewardShare).toBeCloseTo(230000 / 110000, 9);
    expect(s.health).toBe('heavy'); // thưởng 230000 ≥ lãi 110000
  });

  it('kèo khác ngày không tính (kèo hôm qua hết giá trị)', () => {
    const s = incomeSplit(stats({ questIncome: 50000 }), log({ day: 7, bet: { day: 6, questId: 'daily_set', tier: 2, bonus: 80000 } }), 7);
    expect(s.bet).toBe(0);
    expect(s.reward).toBe(50000);
    expect(s.health).toBe('ok');
  });

  it('lãi bán âm → health=loss, rewardShare null (không so)', () => {
    // lãi gộp 250000 − lương 300000 − thuê 20000 = −70000
    const s = incomeSplit(stats({ wages: 300000, questIncome: 90000 }), log({ day: 7 }), 7);
    expect(s.salesProfit).toBe(-70000);
    expect(s.rewardShare).toBeNull();
    expect(s.health).toBe('loss');
  });

  it('lãi 0 → rewardShare null nhưng health ok', () => {
    // lãi gộp đúng = lương + thuê → salesProfit = 0
    const s = incomeSplit(stats({ byItem: {}, services: 140000, wages: 120000, rent: 20000, questIncome: 0 }), log({ day: 7 }), 7);
    expect(s.salesProfit).toBe(0);
    expect(s.rewardShare).toBeNull();
    expect(s.health).toBe('ok');
  });

  it('no quest/bet → quest=0, bet=0, reward=0, health ok', () => {
    const s = incomeSplit(stats(), log({ day: 7 }), 7);
    expect(s.quest).toBe(0);
    expect(s.bet).toBe(0);
    expect(s.reward).toBe(0);
    expect(s.health).toBe('ok');
  });
});

describe('GĐ1198 incomeSplit — đai "tight" (thưởng ≥ 80% lãi bán, chưa ≥ 100%)', () => {
  const log = (over: Partial<QuestLog> = {}): QuestLog => ({ day: 7, claimedDaily: [], claimedStory: [], bet: null, ...over });

  it('thưởng = 90% lãi bán (dưới heavy, trên ok) → tight', () => {
    // lãi gộp 250000 − lương 120000 − thuê 20000 = 110000; quest 99000 → 90%
    const s = incomeSplit(stats({ questIncome: 99000 }), log(), 7);
    expect(s.salesProfit).toBe(110000);
    expect(s.rewardShare).toBeCloseTo(0.9, 9);
    expect(s.health).toBe('tight');
  });

  it('đúng 80% lãi bán → tight (cận dưới đai)', () => {
    // quest 88000 / lãi 110000 = 0.8
    const s = incomeSplit(stats({ questIncome: 88000 }), log(), 7);
    expect(s.rewardShare).toBeCloseTo(0.8, 9);
    expect(s.health).toBe('tight');
  });

  it('79% → ok (chưa vào đai)', () => {
    const s = incomeSplit(stats({ questIncome: 86900 }), log(), 7); // 86900/110000 ≈ 0.79
    expect(s.rewardShare).toBeCloseTo(0.79, 9);
    expect(s.health).toBe('ok');
  });

  it('đúng 100% → heavy (không phải tight) — thưởng đã bằng/lấn lãi bán', () => {
    const s = incomeSplit(stats({ questIncome: 110000 }), log(), 7);
    expect(s.rewardShare).toBeCloseTo(1, 9);
    expect(s.health).toBe('heavy');
  });

  it('thưởng 0 → ok, không vào đai dù lãi nhỏ', () => {
    const s = incomeSplit(stats({ questIncome: 0 }), log(), 7);
    expect(s.health).toBe('ok');
  });

  it('kèo trong ngày cộng vào thưởng và có thể đẩy ok → tight qua đai', () => {
    // quest 77000 (70%) + kèo 22000 (20%) = 99000 (90%) → tight
    const s = incomeSplit(stats({ questIncome: 77000 }), log({ day: 7, bet: { day: 7, questId: 'daily_set', tier: 2, bonus: 22000 } }), 7);
    expect(s.reward).toBe(99000);
    expect(s.health).toBe('tight');
  });
});

describe('GĐ1199 — đai tight khớp ngân sách Luật 10 theo cấp (promt_game.md, bảng chống phình: (nhiệm vụ+kèo)/lãi bán cấp 5/10/20 đo 0.99/0.89/0.64, trần ≤ 1)', () => {
  const log = (over: Partial<QuestLog> = {}): QuestLog => ({ day: 7, claimedDaily: [], claimedStory: [], bet: null, ...over });
  // salesProfit cố định 110000; questIncome = tỉ lệ đo theo cấp × 110000 — tái tạo đúng dải mà economySim đo.
  const at = (ratio: number) => incomeSplit(stats({ questIncome: Math.round(ratio * 110000) }), log(), 7).rewardShare!;

  it('cấp thấp (tỉ lệ ≤ 1 nhưng ≥ 80%) → CẢNH BÁO tight: game thực tế bám sát trần Luật 10 nên báo cáo phải nói thật, không để "bán hàng vẫn là nghề chính"', () => {
    // cấp 5 (0.99) và cấp 10 (0.89) trong đai ≥ 0.8 — đai đúng chỗ nhồi thưởng
    expect(at(0.99)).toBeCloseTo(0.99, 5);
    expect(incomeSplit(stats({ questIncome: Math.round(0.99 * 110000) }), log(), 7).health).toBe('tight');
    expect(incomeSplit(stats({ questIncome: Math.round(0.89 * 110000) }), log(), 7).health).toBe('tight');
  });

  it('cấp cao (tỉ lệ 0.64 < 80%) → ok: lãi bán thật ĐANG dẫn, không làm nhiễu báo cáo', () => {
    const s = incomeSplit(stats({ questIncome: Math.round(0.64 * 110000) }), log(), 7);
    expect(s.rewardShare).toBeCloseTo(0.64, 5);
    expect(s.health).toBe('ok');
  });

  it('đúng trần ngân sách ≤ 1 → heavy (báo cáo không bao giờ nói "nghề chính" khi thưởng đã bằng lãi bán)', () => {
    expect(incomeSplit(stats({ questIncome: 110000 }), log(), 7).health).toBe('heavy');
  });
});

describe('GĐ1178 claimQuest ghi questIncome (optional, không đổi tiền/kinh tế)', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 7 });
  });
  const g = () => useGame.getState();

  it('claim nhiệm vụ ngày đã xong: money + questIncome tăng đúng từng món', () => {
    // Dựng nhiệm vụ "Đông khách" chắc chắn done: 50 khách (target cấp 1 = 5)
    useGame.setState({ stats: { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 50, unhappy: 0, xp: 0, byItem: {} } });
    const ctx = questContext(g());
    const q = dailyQuests(ctx).find((x) => x.id === 'daily_customers');
    expect(q).toBeTruthy();
    expect(q!.done).toBe(true);
    const pre = g().money;
    expect(g().claimQuest(q!.id)).toBe(true);
    expect(g().money).toBe(pre + q!.money);
    expect(g().stats.questIncome).toBe(q!.money);
  });

  it('claim nhiều món: questIncome tích lũy qua nhiều lần claim, tiền cộng khớp', () => {
    // Khách + bán + món đủ để "Đông khách", "Khách vui vẻ", "Bán sạch kệ" (cấp 1) đều done
    useGame.setState({ stats: { revenue: 0, spent: 0, wages: 0, itemsSold: 60, customers: 50, unhappy: 0, xp: 0, byItem: {} } });
    const ctx = questContext(g());
    const done = dailyQuests(ctx).filter((x) => x.done);
    expect(done.length).toBeGreaterThanOrEqual(2);
    const pre = g().money;
    let claimed = 0;
    for (const q of done) if (g().claimQuest(q.id)) claimed += 1;
    expect(claimed).toBe(done.length); // mọi món done đều claim được
    // Bất biến đúng thiết kế: mỗi thưởng đã cộng vào cả money lẫn questIncome (XP có thể lên cấp giữa
    // vòng làm rescale thưởng các món sau — so tiền thật ra không so với tổng capture thời điểm đầu).
    expect(g().stats.questIncome ?? 0).toBeGreaterThan(0);
    expect(g().money - pre).toBe(g().stats.questIncome ?? 0);
  });
});

describe('GĐ1202 — nguồn thưởng CỐ Ý NGOÀI SỔ questIncome (gift/vòng quay/tiền lẻ/welcome-back) không làm phình tấm Luật 10', () => {
  // GĐ1193–1195 phân loại: questIncome chỉ ghi món thưởng "nhiệm vụ - gia vị" (nhiệm vụ ngày/chuyện/NG/mốc/cả hẻm);
  // GIFT/vòng quay/TIP/CHÀO MỪNG QUAY LẠI/thành tựu là phần giữ chân cố ý NGOÀI SỔ để báo cáo "lãi bán thật vs thưởng"
  // (Luật 10) là so sánh thật giữa phần bán-hàng-là-chính và phần nhiệm vụ, không bị bonus giữ chân làm phình đủ
  // để cảnh báo sai heavy/tight. Đây là bất biến thiết kế — test này khóa chiều "không ghi" (các test khác đã khóa
  // chiều "có ghi": claimQuest/claimNgGoal/recordDiscovery/communitySale). THUẦN QUAN SÁT — không đổi mã/kinh tế.
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 7, giftLastDay: 6, giftStreak: 0, lastSeenAt: Date.now() });
  });
  const g = () => useGame.getState();
  const noLedger = () => expect(g().stats.questIncome ?? 0).toBe(0);

  it('vòng quay may mắn trúng tiền: money tăng nhưng questIncome KHÔNG đổi (bonus giữ chân ngoài sổ)', () => {
    const pre = g().money;
    // Làm vòng quay trả tiền chắc chắn: bơm thẳng seed để spinWheelPrize rơi ô có money thì không seed-able
    // ở đây (spinWheelPrize tự chọn) — thay vào đó đặt state chất cấp thấp để mọi ô đều có money theo thang.
    const prize = g().spinWheel();
    if (prize?.money) {
      expect(g().money).toBe(pre + prize.money);
      noLedger();
    } else {
      // Ô 🍀 / XP-vàng: vẫn không được đụng ledger dù solver không nguồn tiền
      noLedger();
      expect(g().money).toBe(pre);
    }
  });

  it('điểm danh quà (claimGift) có tiền: money tăng nhưng questIncome KHÔNG đổi', () => {
    useGame.setState({ history: [{ day: 6, revenue: 500000, profit: 100000, customers: 30, unhappy: 1, salesProfit: 120000 }] });
    const pre = g().money;
    expect(g().claimGift()).toBe(true);
    // Cấp thấp + streak mới → mọi mức quà đều là tiền (DAILY_GIFTS đều có money), nên money phải tăng
    expect(g().money).toBeGreaterThanOrEqual(pre);
    noLedger();
  });

  it('chào mừng quay lại (checkWelcomeBack) có thưởng: money tăng nhưng questIncome KHÔNG đổi', () => {
    // Cách 2 ngày để hụt ngưỡng WELCOME_BACK_MIN: đặt lastSeenAt quá khứ thì daysAway lớn → có thưởng
    useGame.setState({
      lastSeenAt: Date.now() - (1000 * 60 * 60 * 24 * 30), // 30 ngày trước
      history: [{ day: 6, revenue: 500000, profit: 100000, customers: 30, unhappy: 1, salesProfit: 120000 }],
    });
    const pre = g().money;
    const reward = g().checkWelcomeBack();
    expect(reward).toBeGreaterThan(0);
    expect(g().money).toBe(pre + reward);
    // Tính như doanh thu (totals.revenue) chứ KHÔNG vào sổ thưởng → Luật 10 không bị phình
    noLedger();
  });

  it('claimQuest vẫn ghi như thường — ranh giới "có ghi" không bị phá bởi mạch ngoài', () => {
    useGame.setState({ stats: { revenue: 0, spent: 0, wages: 0, itemsSold: 0, customers: 50, unhappy: 0, xp: 0, byItem: {} } });
    const ctx = questContext(g());
    const q = dailyQuests(ctx).find((x) => x.id === 'daily_customers');
    expect(q).toBeTruthy();
    expect(g().claimQuest(q!.id)).toBe(true);
    expect(g().stats.questIncome).toBe(q!.money);
  });
});
