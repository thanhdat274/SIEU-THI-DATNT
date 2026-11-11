import { useGame, questContext } from '../core/store';
import { setSurpriseSuppressed } from '../core/bizStory';
import { dailyQuests, betStatus } from '../data/quests';
import { furnitureDef, FURNITURE } from '../data/furniture';
import { FEATURES } from '../data/levels';
import { unlockedProducts, productById } from '../data/products';
import { crisisDefById } from '../data/crisis';
import { takeLoan } from '../core/biz';
import { LOAN_OPTIONS_MIN } from '../data/biz';
import { SHOP_TIERS } from '../data/shopTiers';
import { maxStaff } from '../data/staff';
import { referenceSell } from '../data/pricing';
import { isSpecialtyProduct, STANCE_TIER_DAYS } from '../data/stance';
import { SERVICES } from '../data/services';
import { brandDealerById, brandDealersAvail, brandDealValue } from '../data/brand';
import type { CustomerManager } from '../agents/customers';
import type { StaffManager } from '../agents/staff';
import type { Player } from '../agents/player';
import type { GroceryShop } from '../shop/groceryShop';

/**
 * Hệ 4 L7 (SPEC §4.8) — bộ gom thu-chi của NHÃN RIÊNG trong một lần sim (bot cộng dồn khi ký/giao/nhận
 *  rival/bỏ xưởng chạy đêm). Reset đầu mỗi runEconomySim có `brand`. Test brandBalance đọc để tính
 *  "lãi ròng từ nhãn" làm tỉ số với tổng lãi ngày (§4.8).
 */
export const brandSim = {
  /** Thu nhập thật từ nhãn: tiền kỳ đại lý + rival (chưa trừ chi). */
  income: 0,
  /** Chi phí vận hành nhãn: lương thợ + phí bao bì (đã trừ khỏi két trong endDay). */
  cost: 0,
  reset() { this.income = 0; this.cost = 0; },
};

/**
 * Hệ 3 L2 (SPEC §3.8) — bot Đặc sản "ưu tiên bày hàng đặc sản": xếp các ứng viên bày kệ theo thứ tự
 * đặc sản đứng đầu. Ở L2 hiệu ứng = 0 nên chỉ ĐO ưu tiên này; lát L4 sẽ nối đặc sản (món nấu/hàng xóm/
 * vùng) vào kênh nhập thật để so sánh doanh thu.
 */
export function orderDacSanCandidates<T extends { id: string }>(cands: T[]): T[] {
  return [...cands].sort((a, b) => (isSpecialtyProduct(b.id) ? 1 : 0) - (isSpecialtyProduct(a.id) ? 1 : 0));
}

export interface AutoplayOptions {
  /** Mức kèo chốt mỗi sáng (xem BET_TIERS); 0 = không chốt kèo. Mặc định tier 2 "Kèo vừa ×1.5". */
  betTier?: number;
  /** Số tick giữa các lần nhả main thread (chỉ dùng ở biến thể async, để worker test đáp ứng RPC). */
  yieldEvery?: number;
  /** Tốc độ game mỗi tick (mặc định 4). Cao hơn = ít tick/ngày hơn, chạy nhanh hơn nhưng bước mô phỏng thô hơn. */
  speed?: number;
  /** L4 — bot "biết chuẩn bị": khi có đợt biến cố dài, mỗi sáng mua các việc chuẩn bị vừa túi tiền (doCrisisPrep). */
  crisisPrep?: boolean;
  /** Bắt đầu mô phỏng từ ngày này (seedLevel gieo sẵn tiệm cấp cao rồi tua tới đây) — dùng cho test cân bằng. */
  startDay?: number;
  /** Bật "Năm yên ả" (tắt biến cố dài) — dùng làm mốc đối chứng trong crisisBalance. */
  calm?: boolean;
  /** Hệ 3 L2 (SPEC §3.8) — chính sách bot theo hướng biển: binh_dan hạ giá ~95% thị trường,
   *  dac_san ưu tiên bày hàng đặc sản, tien_loi mở ca đêm + đủ dịch vụ. Ở L2 hiệu ứng = 0 (chỉ lệch
   *  do hành vi bot), framework đo để lát sau bật hiệu ứng so sánh. */
  stance?: 'binh_dan' | 'dac_san' | 'tien_loi';
  /** Hệ 4 L7 (SPEC §4.8) — bật bot NHÃN RIÊNG: ký đại lý khả dụng, giao các kỳ đủ hàng, nhận chào rival.
   *  Dùng cho brandBalance.test. (Cần mẻ Hệ-1 làm sẵn → test seed brand trực tiếp vào sim.) */
  brand?: boolean;
  /** Chạy sau khi seedLevel xong, trước khi autoplay — để test gieo trạng thái (nhãn, rival). */
  inject?: () => void;
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
  const crisisPrepOpt = opts.crisisPrep ?? false;
  const yieldEvery = opts.yieldEvery ?? 0;
  const speed = opts.speed ?? 4;
  const stance = opts.stance ?? null;
  const st = () => useGame.getState();
  /** Đổi đ thành 'k' như các cột tiền cũ của autoplay. */
  const k = (v: number) => `${Math.round(v / 1000)}k`;
  /** Tổng lãi gộp cộng dồn của mọi kệ (giá bán − giá vốn) — chênh trong ngày = lãi gộp bán hàng hôm nay. */
  const shelfMarginTotal = () => Object.values(st().shelfProfit ?? {}).reduce((n, p) => n + p.profit, 0);

  // ───── Hệ 3 L2 (SPEC §3.8): ba chính sách bot theo hướng biển ─────
  // Giá Bot Bình dân: hạ món ĐỦ BIÊN (thị trường ≥ 1.2× giá vốn) xuống ~0.95 để khớp biển (≤97%) và
  // kích "rẻ kéo khách" (biển Bình dân khuếch đại độ dốc hút giá rẻ, §3.4); món biên mỏng GIỮ giá thị
  // trường kẻo bán dưới giá vốn. (GĐ2254: cày 95% MỌI món làm tiệm cạn margin → chỉ cày món đủ biên.)
  const cheapPrice = (id: string) => {
    const p = productById(id);
    const ref = referenceSell(id);
    if (ref < p.buy * 1.2) return ref; // biên mỏng → giữ giá thị trường
    const floor = Math.round((p.buy * 1.15) / 100) * 100;
    return Math.max(floor, Math.round((ref * 0.95) / 100) * 100);
  };
  /** Bot Bình dân — hạ giá món đủ biên đang bày kệ về 95% giá thị trường. */
  function priceBinhDan() {
    if (stance !== 'binh_dan') return;
    const s = st();
    for (const f of s.furniture) {
      if (f.type !== 'shelf') continue;
      for (const t of f.tiers) if (t.productId) s.setPrice(t.productId, cheapPrice(t.productId));
    }
  }
  /** Bot Tiện lợi — bật ca đêm + đủ dịch vụ (mở cửa 24h, dịch vụ đầy đủ). */
  function ensureTienLoi() {
    if (stance !== 'tien_loi') return;
    const s = st();
    const up = s.biz.upgrades ?? [];
    const wantSv = SERVICES.map((sv) => sv.id);
    const haveSv = s.biz.services ?? [];
    if (!up.includes('night') || haveSv.length < wantSv.length) {
      useGame.setState({
        biz: {
          ...s.biz,
          upgrades: up.includes('night') ? up : [...up, 'night'],
          services: wantSv,
        },
      });
    }
  }
  /** Hệ 3 (SPEC §3.8) — bot TREO BIỂN Ở BẬC 3: khi có tuỳ chọn stance, giữ biển ở bậc 3 (21 ngày khớp)
   *  để test cân bằng đo ĐÚNG hiệu ứng của hướng suốt kỳ đo. Không có tuỳ chọn → không treo (mốc). */
  function ensureStance() {
    if (!stance) return;
    const s = st();
    const cur = s.biz.stance;
    // Test cân bằng đo hiệu ứng ở BẬC 3 → mỗi sáng neo lại bậc 3 / xoá miss (nếu chưa đúng) để biển
    // không tụt bậc trong kỳ đo (người chơi thật phải tự giữ khớp; bot ở đây là "tiệm đã bậc 3").
    if (!cur || cur.id !== stance) {
      useGame.setState({ biz: { ...s.biz, stance: { id: stance, since: s.day, fitDays: STANCE_TIER_DAYS[2], missStreak: 0 } } });
    } else if ((cur.fitDays ?? 0) !== STANCE_TIER_DAYS[2] || (cur.missStreak ?? 0) !== 0) {
      useGame.setState({ biz: { ...s.biz, stance: { ...cur, fitDays: STANCE_TIER_DAYS[2], missStreak: 0 } } });
    }
  }

  /** Bày hàng: mỗi tầng một mặt hàng hợp ngành, nhập đủ để bày đầy rồi để dư một ít. */
  function restock() {
    // GĐ847: người chơi thật vay gấp khi quỹ âm để nhập hàng — bot làm như vậy thay vì kẹt xoáy nợ
    if (st().money < 0) takeLoan(LOAN_OPTIONS_MIN, true);
    const s = st();
    // Hệ 3 L2 — bot Đặc sản ưu tiên bày hàng đặc sản: xếp ứng viên để đặc sản lên đầu (về sau nối kênh nhập thật).
    const unlocked = stance === 'dac_san' ? orderDacSanCandidates(unlockedProducts(s.level)) : unlockedProducts(s.level);
    let kk = 0;
    for (const f of s.furniture) {
      const def = furnitureDef(f.type);
      const ok = unlocked.filter((p) => def.categories.includes(p.category));
      if (!ok.length) continue;
      f.tiers.forEach((tier, i) => {
        const id = tier.productId ?? ok[kk++ % ok.length].id;
        const need = def.capacity * 2 - tier.count - (st().storage[id] ?? 0);
        if (need > 0 && st().money > 200000) {
          // GĐ1829: mua lượng VỪA tiền (chừa 100k dự phòng thuê/nhà) — bot cẩn thận như người chơi
          // thật, hết spam "Không đủ tiền!" khi doanh thu thay-món (OpenSpec khach-thay-mon-het-hang)
          // làm bot thử mua nhiều hơn sức tiền.
          const unit = productById(id).buy;
          const qty = Math.min(need, 50, Math.floor((st().money - 50_000) / Math.max(1, unit)));
          if (qty > 0) st().buy(id, qty);
        }
        // Tầng đã đầy đúng món: bỏ qua — stockTier không đổi gì nhưng vẫn kích dựng lại 3D cả kệ (~40% thời gian sim)
        if (tier.productId === id && tier.count >= def.capacity) return;
        st().stockTier(f.uid, i, id);
        // Hệ 3 L2 — bot Bình dân hạ giá món vừa bày về 95% thị trường
        if (stance === 'binh_dan') st().setPrice(id, cheapPrice(id));
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
    if (s.money < 400_000) return; // GĐ817: người chơi thật không thuê thêm khi quỹ cạn (bot từng thuê 10 người rồi âm tiền)
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

  /** L4 — bot "chuẩn bị đủ": khi đang có đợt biến cố dài, sáng nào cũng mua việc chuẩn bị vừa túi tiền. */
  function crisisPrep() {
    if (!crisisPrepOpt) return;
    const s = st();
    const c = s.biz.crisis;
    if (!c) return;
    const def = crisisDefById(c.defId);
    if (!def) return;
    for (const p of def.preps) s.doCrisisPrep(p.id); // doCrisisPrep tự lo tiền/đã làm
  }

  /** Hệ 4 L7 (SPEC §4.8) — bot NHÃN RIÊNG (bật qua opts.brand): mỗi sáng ký đại lý khả dụng, giao kỳ
   *  đủ hàng, nhận chào rival. Cộng dồn thu-chi vào brandSim để test cân bằng đo. */
  function brandMorning() {
    if (!opts.brand) return;
    const s = st();
    const b = s.biz.brand;
    if (!b) return;
    // Xưởng chạy qua đêm đã trừ phí+lương vào endDay; gom chi để so với thu.
    // (Thu/chi đêm của brand nằm trong endDay — không đụng được ở đây, đo qua income đầy đủ bên dưới.)
    // Ký các đại lý đã mở mà còn thiếu dòng có đủ hàng.
    for (const def of brandDealersAvail(s.level, b.rep)) {
      if (b.deals[def.id]) continue;
      if (b.reopenDays?.[def.id] && s.day < b.reopenDays[def.id]) continue;
      const line = b.lines.find((l) => (b.stock[l.productId] ?? 0) >= def.qty);
      if (line && s.acceptBrandDeal) s.acceptBrandDeal(def.id, line.productId);
    }
    // Giao các kỳ đã tới hạn hoặc đủ hàng (bot giao đúng chu kỳ).
    for (const id of Object.keys(b.deals ?? {})) {
      const deal = b.deals[id];
      const def = brandDealerById(id);
      if (!def || !deal || !deal.pending) continue;
      if (s.day >= deal.dueDay || (b.stock[deal.productId] ?? 0) >= def.qty) {
        const ok = s.deliverBrandDeal(id);
        if (ok) brandSim.income += brandDealValue(def, deal.productId);
      }
    }
    // Nhận chào rival (95% — đo hiệu ứng tiền nhanh + sức mạnh rival).
    const b2 = st().biz.brand;
    if (b2?.rivalOffer && b2.rivalSold !== undefined) {
      const offer = b2.rivalOffer;
      const val = Math.round(productById(offer.productId).sell * offer.units * 0.95 / 1000) * 1000;
      if ((b2.stock[offer.productId] ?? 0) >= offer.units && st().acceptRivalSupply) {
        st().acceptRivalSupply();
        brandSim.income += val;
      }
    }
  }

  /** Chơi ĐÚNG 1 ngày. `yieldHook` (nếu có) chạy sau mỗi batch tick để nhả main thread cho worker. */
  async function playOneDay(yieldHook: (() => Promise<void>) | null): Promise<Record<string, number | string | Record<string, number>>> {
    const step = yieldEvery > 0 ? yieldEvery : 40;
    st().closePanel();
    hire();
    invest();
    restock();
    ensureStance(); // Hệ 3 — treo biển ở bậc 3 (SPEC §3.8)
    ensureTienLoi(); // Hệ 3 L2 — bot Tiện lợi: ca đêm + dịch vụ
    priceBinhDan();  // Hệ 3 L2 — bot Bình dân: hạ giá toàn bộ bày kệ
    brandMorning();  // Hệ 4 L7 — bot Nhãn riêng (SPEC §4.8)
    // Người chơi đứng quầy chính cả ngày
    const main = shop.counters()[0];
    player.teleport(main.center.x - 0.6, main.center.z - 0.9);
    if (!st().shopOpen) st().toggleShop();
    const day = st().day;
    const margin0 = shelfMarginTotal();
    // Chốt kèo buổi sáng trước khi chơi: mục tiêu cả bộ theo ×betTier
    lockBet();
    crisisPrep();
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
      // Lãi bán hàng thật = Σ(giá khách trả − giá vốn) của hàng bán ra hôm nay − lương − tiền nhà.
      // Khác `profit` ở chỗ KHÔNG trừ tiền đầu tư (kệ, nâng cấp, giấy phép...) mà bot mua gần như mỗi ngày.
      salesProfit: sum ? k(shelfMarginTotal() - margin0 - sum.wages - (sum.rent ?? 0)) : '-',
      quest: questDay,
      bet: betDay,
      customers: sum?.customers ?? 0,
      unhappy: sum?.unhappy ?? 0,
      missed: sum?.missed ?? {},
      // GĐ779: lỡ bán 'stock' mà KHO vẫn còn hàng (= kệ không được châm) — phân biệt với hết hẳn hàng
      stockInStorage: Object.entries(sum?.missLog ?? {}).reduce((n0, [key, c]) => n0 + (key.startsWith('stock:') && (s.storage[key.slice(6)] ?? 0) > 0 ? c : 0), 0),
      shelves: s.furniture.length,
      staff: s.staff.length,
      tier: s.shopTier,
    };
  }

  /** Chơi n ngày ĐỒNG BỘ như cũ; trả về bảng nhật ký (thêm cột quest/bet). Gọi: game.autoplay(30). */
  function autoplay(days: number): Record<string, number | string | Record<string, number>>[] {
    // GĐ1507 — tắt bắn sự kiện bất ngờ trong bộ đo kinh tế (gieo vẫn chạy giữ chuỗi rng)
    setSurpriseSuppressed(true);
    try {
      const log: Record<string, number | string | Record<string, number>>[] = [];
      for (let d = 0; d < days; d++) {
        log.push(runOneDaySync());
      }
      st().closePanel();
      return log;
    } finally {
      setSurpriseSuppressed(false);
    }
  }

  function runOneDaySync(): Record<string, number | string | Record<string, number>> {
    st().closePanel();
    hire();
    invest();
    restock();
    ensureStance(); // Hệ 3 — treo biển ở bậc 3 (SPEC §3.8)
    ensureTienLoi(); // Hệ 3 L2 — bot Tiện lợi: ca đêm + dịch vụ
    priceBinhDan();  // Hệ 3 L2 — bot Bình dân: hạ giá toàn bộ bày kệ
    brandMorning();  // Hệ 4 L7 — bot Nhãn riêng (SPEC §4.8)
    const main = shop.counters()[0];
    player.teleport(main.center.x - 0.6, main.center.z - 0.9);
    if (!st().shopOpen) st().toggleShop();
    const day = st().day;
    const margin0 = shelfMarginTotal();
    lockBet();
    crisisPrep();
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
      // Lãi bán hàng thật = Σ(giá khách trả − giá vốn) của hàng bán ra hôm nay − lương − tiền nhà.
      // Khác `profit` ở chỗ KHÔNG trừ tiền đầu tư (kệ, nâng cấp, giấy phép...) mà bot mua gần như mỗi ngày.
      salesProfit: sum ? k(shelfMarginTotal() - margin0 - sum.wages - (sum.rent ?? 0)) : '-',
      quest: questDay,
      bet: betDay,
      customers: sum?.customers ?? 0,
      unhappy: sum?.unhappy ?? 0,
      missed: sum?.missed ?? {},
      shelves: s.furniture.length,
      staff: s.staff.length,
      tier: s.shopTier,
    };
  }

  /** Chơi n ngày BẤT ĐỒNG BỘ, nhả main thread mỗi `yieldEvery` tick — cho worker test/automation. */
  async function autoplayAsync(days: number): Promise<Record<string, number | string | Record<string, number>>[]> {
    const log: Record<string, number | string | Record<string, number>>[] = [];
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

export type AutoplayRunner = ReturnType<typeof createAutoplay> & { async: (days: number) => Promise<Record<string, number | string | Record<string, number>>[]> };
