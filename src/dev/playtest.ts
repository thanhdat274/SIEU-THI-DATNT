import { useGame } from '../core/store';
import { furnitureDef, FURNITURE } from '../data/furniture';
import { festivalOn } from '../data/calendar';
import { RECIPES, COOKED_PRODUCT_IDS } from '../data/recipes';
import { unlockedProducts } from '../data/products';
import { SHOP_TIERS } from '../data/shopTiers';
import { maxStaff } from '../data/staff';
import { startCounter } from '../core/biz';
import type { CounterTactic } from '../data/biz';
import type { CustomerManager } from '../agents/customers';
import type { StaffManager } from '../agents/staff';
import type { Player } from '../agents/player';
import type { GroceryShop } from '../shop/groceryShop';

/**
 * Playtest dài (7–10+ ngày mô phỏng): một "người chơi máy" chơi nhiều ngày liền
 * và ghi số liệu nhịp chơi — đơn nấu/VIP có xuất hiện đủ đều không, giỏ quà có
 * "phá" kinh tế lễ không, phản công đối thủ có tạo khác biệt không.
 * Gọi từ console: game.playtest(10). In bảng mỗi ngày + trả về mảng dòng.
 */

const BASKET_PREFIX = 'gio_qua_';

export interface PlaytestRow {
  day: number;
  level: number;
  money: string;
  revenue: string;
  profit: string;
  customers: number;
  unhappy: number;
  rating?: number;
  festival?: string;
  /** Cuộc gọi điện hôm nay: tổng / đơn nấu / đơn VIP / nấu giao xong kịp. */
  calls: number;
  cookCalls: number;
  vipCalls: number;
  cookDone: number;
  /** Giỏ quà đã bán hôm nay (số giỏ và doanh thu) — chỉ khác 0 trong dịp lễ. */
  basketQty: number;
  basketRevenue: string;
  /** Đối thủ đang cạnh tranh / đợt phản công đã chạy hôm nay / sức mạnh đối thủ (0–100). */
  rival: boolean;
  counter?: CounterTactic;
  rivalStrength?: number;
}

export function createPlaytest(shop: GroceryShop, customers: CustomerManager, staff: StaffManager, player: Player) {
  const st = () => useGame.getState();

  function restock() {
    const s = st();
    const unlocked = unlockedProducts(s.level);
    // Trong dịp lễ: bày nửa kệ bằng hàng mùa (giỏ quà, bánh Tết...) để đo kinh tế lễ
    const fest = festivalOn(s.day);
    const seasonal = fest ? unlocked.filter((p) => (fest.goods ?? []).includes(p.id)) : [];
    let k = 0;
    for (const f of s.furniture) {
      const def = furnitureDef(f.type);
      const ok = unlocked.filter((p) => def.categories.includes(p.category));
      if (!ok.length) continue;
      f.tiers.forEach((tier, i) => {
        // Trong dịp lễ: các tầng đầu tiên của mỗi kệ ép bày hàng mùa (kể cả thay món cũ)
        const forceSeasonal = fest && seasonal.length && i < seasonal.length;
        const id = forceSeasonal ? seasonal[i].id : (tier.productId ?? ok[k++ % ok.length].id);
        // Món nhà làm không nhập được: phải mua nguyên liệu đứng nấu
        if (COOKED_PRODUCT_IDS.has(id)) {
          const recipe = RECIPES.find((r) => r.outputId === id && r.unlock <= st().level);
          const have = st().storage[id] ?? 0;
          if (recipe && have < def.capacity && !st().cookJobs.some((j) => j.recipeId === recipe.id)) {
            for (const inp of recipe.inputs) {
              const need = inp.quantity * 2;
              if ((st().storage[inp.productId] ?? 0) < need) st().buy(inp.productId, need - (st().storage[inp.productId] ?? 0));
            }
            st().startCook(recipe.id);
          }
          st().stockTier(f.uid, i, id);
          return;
        }
        const need = def.capacity * 2 - tier.count - (st().storage[id] ?? 0);
        if (need > 0 && st().money > 200000) st().buy(id, Math.min(need, 50));
        st().stockTier(f.uid, i, id);
      });
    }
  }

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
    if (s.level < 12 || s.staff.length >= maxStaff(s.level)) return;
    // Có điện thoại đơn hàng là nhờ shipper: thiếu thì ưu tiên thuê trước
    const roles: ('cashier' | 'stocker' | 'courier')[] = s.staff.some((x) => x.role === 'courier')
      ? (s.staff.filter((x) => x.role === 'cashier').length <= s.staff.length - s.staff.filter((x) => x.role === 'cashier').length ? ['cashier', 'stocker'] : ['stocker', 'cashier'])
      : ['courier', 'cashier', 'stocker'];
    for (const want of roles) {
      const c = s.candidates.filter((x) => x.role === want).sort((a, b) => b.skill - a.skill)[0];
      if (c) {
        s.hire(c.id);
        s.setShift(c.id, 'full');
        return;
      }
    }
  }

  const money = (v: number) => `${Math.round(v / 1000)}k`;

  return function playtest(days: number) {
    const rows: PlaytestRow[] = [];
    // Xoay vòng 3 chiến thuật phản công khi có đối thủ, để đo cả ba qua đợt chơi dài
    const tactics: CounterTactic[] = ['price', 'ad', 'gift'];
    let tacticIdx = 0;
    let calls = 0, cookCalls = 0, vipCalls = 0, cookDone = 0;
    let basketQtyDay = 0, basketRevDay = 0;

    for (let d = 0; d < days; d++) {
      st().closePanel();
      hire();
      invest();
      restock();
      const main = shop.counters()[0];
      player.teleport(main.center.x - 0.6, main.center.z - 0.9);
      if (!st().shopOpen) st().toggleShop();
      const day = st().day;
      const speed = 4;
      for (let i = 0; i < 20000 && st().day === day; i++) {
        useGame.setState({ speed });
        st().tick(0.1);
        staff.update(0.1 * speed, true);
        customers.update(0.1 * speed, (c) => Math.max(player.position.distanceTo(c.center) < 2 ? 1 : 0, staff.cashierSpeed(c)));
        // Nghe máy mọi cuộc gọi để đo đơn nấu/VIP, xong giao luôn (bot không mất công đi bộ)
        for (const o of st().phoneOrders) {
          if (o.status !== 'ringing') continue;
          if (st().minutes > o.answerBy) continue;
          if (o.premium && !o.vip) {
            // Đơn nấu: bot đứng bếp luôn — mua nguyên liệu, nấu, xong thì nghe máy giao
            const recipe = RECIPES.find((r) => r.outputId === Object.keys(o.items)[0] && r.unlock <= st().level);
            const already = st().cookJobs.some((j) => j.recipeId === recipe?.id);
            const enough = Object.entries(o.items).every(([pid, q]) => (st().storage[pid] ?? 0) >= q);
            if (recipe && !already && !enough) {
              for (const inp of recipe.inputs) {
                const have = st().storage[inp.productId] ?? 0;
                const need = inp.quantity * (Object.values(o.items)[0] / recipe.outputQty);
                if (have < need) st().buy(inp.productId, Math.ceil(need - have));
              }
              st().startCook(recipe.id);
            }
            if (!enough) continue; // chờ nấu xong rồi nghe máy ở vòng sau
          }
          if (st().restockAndAnswerPhone(o.id)) {
            calls++;
            if (o.vip) vipCalls++;
            else if (o.premium) cookCalls++;
            if (st().deliverPhone(o.id) && o.premium && !o.vip) cookDone++;
          } else {
            st().declinePhone(o.id);
          }
        }
        if (i % 150 === 0) restock();
        if (st().minutes >= 21.5 * 60) {
          // Chụp số bán trong ngày trước khi endDay xoá stats (giỏ quà bán bao nhiêu hôm nay)
          const byItem = st().stats.byItem ?? {};
          for (const [id, v] of Object.entries(byItem)) {
            if (!id.startsWith(BASKET_PREFIX)) continue;
            basketQtyDay += v.qty;
            basketRevDay += v.revenue;
          }
          useGame.setState({ minutes: 20 * 60 });
          st().sleep();
        }
      }
      const s = st();
      const sum = s.panel?.type === 'summary' ? s.panel.stats : null;
      const fest = festivalOn(s.day - 1);
      const rating = s.history.at(-1)?.rating;
      rows.push({
        day: s.day - 1,
        level: s.level,
        money: money(s.money),
        revenue: sum ? money(sum.revenue) : '-',
        profit: sum ? money(sum.revenue - sum.spent - sum.wages) : '-',
        customers: sum?.customers ?? 0,
        unhappy: sum?.unhappy ?? 0,
        ...(rating !== undefined ? { rating: Math.round(rating * 10) / 10 } : {}),
        ...(fest ? { festival: fest.name } : {}),
        calls, cookCalls, vipCalls, cookDone,
        basketQty: basketQtyDay,
        basketRevenue: money(basketRevDay),
        rival: !!s.biz.rival,
        ...(s.biz.counter?.day === s.day - 1 ? { counter: s.biz.counter.tactic } : {}),
        ...(s.biz.rival ? { rivalStrength: Math.round(s.biz.rival.strength) } : {}),
      });
      calls = 0; cookCalls = 0; vipCalls = 0; cookDone = 0;
      basketQtyDay = 0; basketRevDay = 0;
      console.table(rows);
      // Có đối thủ thì chạy phản công cho ngày mai xoay vòng 3 chiến thuật
      if (s.biz.rival) {
        startCounter(tactics[tacticIdx++ % tactics.length]);
      }
    }
    st().closePanel();
    return rows;
  };
}
