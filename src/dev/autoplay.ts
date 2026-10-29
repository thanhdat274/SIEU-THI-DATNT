import { useGame, questContext } from '../core/store';
import { dailyQuests, betStatus } from '../data/quests';
import { furnitureDef, FURNITURE } from '../data/furniture';
import { FEATURES } from '../data/levels';
import { unlockedProducts } from '../data/products';
import { SHOP_TIERS } from '../data/shopTiers';
import { maxStaff } from '../data/staff';
import type { CustomerManager } from '../agents/customers';
import type { StaffManager } from '../agents/staff';
import type { Player } from '../agents/player';
import type { GroceryShop } from '../shop/groceryShop';

export interface AutoplayOptions {
  /** Mức kèo chốt mỗi sáng (xem BET_TIERS); 0 = không chốt kèo. Mặc định tier 2 "Kèo vừa ×1.5". */
  betTier?: number;
  /** Số tick giữa các lần nhả main thread (chỉ dùng ở biến thể async, để worker test đáp ứng RPC). */
  yieldEvery?: number;
  /** Tốc độ game mỗi tick (mặc định 4). Cao hơn = ít tick/ngày hơn, chạy nhanh hơn nhưng bước mô phỏng thô hơn. */
  speed?: number;
}

/**
 * Chỉ dùng khi phát triển: một "người chơi tự động" chơi nhiều ngày liền (không cần vẽ hình)
 * để đo nhịp độ tiền và cấp độ khi cân bằng game. Gọi từ console: game.autoplay(30)
 *
 * GĐ105 — khảo sát kinh tế vòng ngày: mỗi ngày còn ghi thêm 2 cột nguồn thu từ nhiệm vụ:
 *  - `quest`: tổng tiền thưởng nhiệm vụ NGÀY được nhận hôm đó (tổng q.money của các việc daily
 *    đã claim cuối ngày; KHÔNG nằm trong stats.revenue — thưởng này cộng thẳng vào money qua claimQuest).
 *  - `bet`: tiền thưởng kèo hôm đó NẾU kèo TRÚNG (0 nếu không đặt/không trúng). Kèo chốt buổi sáng
 *    theo `betTier`, trả khi claim đủ TRỌN BỘ nhiệm vụ ngày (claimQuest nhả bonus khi allDone&allClaimed).
 *  Mỗi cuối ngày (trước khi ngủ/endDay) harness claim hết các việc daily `done && !claimed`.
 *  Công thức kinh tế/giá/thưởng KHÔNG đổi — chỉ thêm ĐO + claim.
 */
export function createAutoplay(
  shop: GroceryShop,
  customers: CustomerManager,
  staff: StaffManager,
  player: Player,
  opts: AutoplayOptions = {},
) {
  const betTier = opts.betTier ?? 1.5;
  const yieldEvery = opts.yieldEvery ?? 0;
  const speed = opts.speed ?? 4;
  const st = () => useGame.getState();
  /** Đổi đ thành 'k' như các cột tiền cũ của autoplay. */
  const k = (v: number) => `${Math.round(v / 1000)}k`;

  /** Bày hàng: mỗi tầng một mặt hàng hợp ngành, nhập đủ để bày đầy rồi để dư một ít. */
  function restock() {
    const s = st();
    const unlocked = unlockedProducts(s.level);
    let kk = 0;
    for (const f of s.furniture) {
      const def = furnitureDef(f.type);
      const ok = unlocked.filter((p) => def.categories.includes(p.category));
      if (!ok.length) continue;
      f.tiers.forEach((tier, i) => {
        const id = tier.productId ?? ok[kk++ % ok.length].id;
        const need = def.capacity * 2 - tier.count - (st().storage[id] ?? 0);
        if (need > 0 && st().money > 200000) st().buy(id, Math.min(need, 50));
        // Tầng đã đầy đúng món: bỏ qua — stockTier không đổi gì nhưng vẫn kích dựng lại 3D cả kệ (~40% thời gian sim)
        if (tier.productId === id && tier.count >= def.capacity) return;
        st().stockTier(f.uid, i, id);
      });
    }
  }

  /** Mua thêm kệ khi dư tiền, mở rộng tiệm khi đủ cấp và tiền. */
  function invest() {
    const s = st();
    const next = SHOP_TIERS[s.shopTier + 1];
    if (next && !s.pendingUpgrade && s.level >= next.unlock && s.money > next.price * 1.3) {
      s.buyUpgrade();
      return;
    }
    const shelfType = s.level >= 26 ? 'bigShelf' : 'shelf';
    const def = FURNITURE.find((f) => f.type === shelfType)!;
    if (s.money < def.price * 4) return;
    for (let z = -shop.depth / 2 + 0.6; z < shop.depth / 2 - 1.5; z += 1.6) {
      for (let x = -shop.width / 2 + 1.4; x < shop.width / 2 - 1.4; x += 0.5) {
        if (!shop.fullCheck(shelfType, x, z, 0)) {
          s.placeFurniture(shelfType, x, z, 0);
          return;
        }
      }
    }
  }

  function hire() {
    const s = st();
    if (s.level < FEATURES.staff || s.staff.length >= maxStaff(s.level)) return;
    const cashiers = s.staff.filter((x) => x.role === 'cashier').length;
    const want = cashiers <= s.staff.length - cashiers ? 'cashier' : 'stocker';
    const c = s.candidates.filter((x) => x.role === want).sort((a, b) => b.skill - a.skill)[0];
    if (c) {
      s.hire(c.id);
      s.setShift(c.id, 'full');
    }
  }

  /** Chốt 1 kèo cho NGÀY HÔM NAY (mỗi sáng một kèo, như người chơi thật). */
  function lockBet() {
    const s = st();
    if (betTier <= 0) return;
    if (betStatus(s.day, s.questLog.bet) !== 'none') return;
    s.placeBet(betTier);
  }

  /** Claim hết nhiệm vụ ngày `done && !claimed` (cuối ngày, trước endDay); trả {quest, bet}. */
  function settleDaily(): { quest: number; bet: number } {
    const qs = dailyQuests(questContext(st())).filter((q) => q.done && !q.claimed);
    let quest = 0;
    for (const q of qs) {
      if (st().claimQuest(q.id)) quest += q.money;
    }
    return { quest, bet: st().questLog.bet?.bonus ?? 0 };
  }

  /** Chơi ĐÚNG 1 ngày. `yieldHook` (nếu có) chạy sau mỗi batch tick để nhả main thread cho worker. */
  async function playOneDay(yieldHook: (() => Promise<void>) | null): Promise<Record<string, number | string>> {
    const step = yieldEvery > 0 ? yieldEvery : 40;
    st().closePanel();
    hire();
    invest();
    restock();
    // Người chơi đứng quầy chính cả ngày
    const main = shop.counters()[0];
    player.teleport(main.center.x - 0.6, main.center.z - 0.9);
    if (!st().shopOpen) st().toggleShop();
    const day = st().day;
    // Chốt kèo buổi sáng trước khi chơi: mục tiêu cả bộ theo ×betTier
    lockBet();
    let questDay = 0;
    let betDay = 0;
    for (let i = 0; i < 20000 && st().day === day; i++) {
      useGame.setState({ speed });
      st().tick(0.1);
      staff.update(0.1 * speed, true);
      customers.update(0.1 * speed, (c) => Math.max(player.position.distanceTo(c.center) < 2 ? 1 : 0, staff.cashierSpeed(c)));
      // Giữa ngày bày lại hàng
      if (i % 150 === 0) restock();
      if (st().minutes >= 21.5 * 60) {
        // Cuối ngày (tua hết giờ): claim nhiệm vụ + ghi quest/bet rồi đi ngủ
        const acc = settleDaily();
        questDay = acc.quest;
        betDay = acc.bet;
        useGame.setState({ minutes: 20 * 60 });
        st().sleep();
      }
      if (yieldHook && i % step === 0) await yieldHook();
    }
    const s = st();
    const sum = s.panel?.type === 'summary' ? s.panel.stats : null;
    return {
      day,
      level: s.level,
      money: k(s.money),
      revenue: sum ? k(sum.revenue) : '-',
      // Lãi vận hành (operationalProfit) = doanh thu − chi − lương − tiền nhà (như bảng tổng kết)
      profit: sum ? k(sum.revenue - sum.spent - sum.wages - (sum.rent ?? 0)) : '-',
      quest: questDay,
      bet: betDay,
      customers: sum?.customers ?? 0,
      unhappy: sum?.unhappy ?? 0,
      shelves: s.furniture.length,
      staff: s.staff.length,
      tier: s.shopTier,
    };
  }

  /** Chơi n ngày ĐỒNG BỘ như cũ; trả về bảng nhật ký (thêm cột quest/bet). Gọi: game.autoplay(30). */
  function autoplay(days: number): Record<string, number | string>[] {
    const log: Record<string, number | string>[] = [];
    for (let d = 0; d < days; d++) {
      log.push(runOneDaySync());
    }
    st().closePanel();
    return log;
  }

  function runOneDaySync(): Record<string, number | string> {
    st().closePanel();
    hire();
    invest();
    restock();
    const main = shop.counters()[0];
    player.teleport(main.center.x - 0.6, main.center.z - 0.9);
    if (!st().shopOpen) st().toggleShop();
    const day = st().day;
    lockBet();
    let questDay = 0;
    let betDay = 0;
    for (let i = 0; i < 20000 && st().day === day; i++) {
      useGame.setState({ speed });
      st().tick(0.1);
      staff.update(0.1 * speed, true);
      customers.update(0.1 * speed, (c) => Math.max(player.position.distanceTo(c.center) < 2 ? 1 : 0, staff.cashierSpeed(c)));
      if (i % 150 === 0) restock();
      if (st().minutes >= 21.5 * 60) {
        const acc = settleDaily();
        questDay = acc.quest;
        betDay = acc.bet;
        useGame.setState({ minutes: 20 * 60 });
        st().sleep();
      }
    }
    const s = st();
    const sum = s.panel?.type === 'summary' ? s.panel.stats : null;
    return {
      day,
      level: s.level,
      money: k(s.money),
      revenue: sum ? k(sum.revenue) : '-',
      profit: sum ? k(sum.revenue - sum.spent - sum.wages - (sum.rent ?? 0)) : '-',
      quest: questDay,
      bet: betDay,
      customers: sum?.customers ?? 0,
      unhappy: sum?.unhappy ?? 0,
      shelves: s.furniture.length,
      staff: s.staff.length,
      tier: s.shopTier,
    };
  }

  /** Chơi n ngày BẤT ĐỒNG BỘ, nhả main thread mỗi `yieldEvery` tick — cho worker test/automation. */
  async function autoplayAsync(days: number): Promise<Record<string, number | string>[]> {
    const log: Record<string, number | string>[] = [];
    for (let d = 0; d < days; d++) {
      log.push(await playOneDay(() => new Promise((r) => setTimeout(r, 0))));
    }
    st().closePanel();
    return log;
  }

  // Giữ hợp đồng cũ: createAutoplay trả về hàm autoplay(days) đồng bộ (game.autoplay = createAutoplay(...)).
  // Biến thể async (nhả main thread) treo sẵn ở autoplay.async — dùng cho test/automation headless.
  (autoplay as unknown as { async: typeof autoplayAsync }).async = autoplayAsync;
  return autoplay;
}

export type AutoplayRunner = ReturnType<typeof createAutoplay> & { async: (days: number) => Promise<Record<string, number | string>[]> };
