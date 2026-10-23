import { useGame } from '../core/store';
import { furnitureDef, FURNITURE } from '../data/furniture';
import { FEATURES } from '../data/levels';
import { unlockedProducts } from '../data/products';
import { SHOP_TIERS } from '../data/shopTiers';
import { maxStaff } from '../data/staff';
import type { CustomerManager } from '../agents/customers';
import type { StaffManager } from '../agents/staff';
import type { Player } from '../agents/player';
import type { GroceryShop } from '../shop/groceryShop';

/**
 * Chỉ dùng khi phát triển: một "người chơi tự động" chơi nhiều ngày liền (không cần vẽ hình)
 * để đo nhịp độ tiền và cấp độ khi cân bằng game. Gọi từ console: game.autoplay(30)
 */
export function createAutoplay(shop: GroceryShop, customers: CustomerManager, staff: StaffManager, player: Player) {
  const st = () => useGame.getState();

  /** Bày hàng: mỗi tầng một mặt hàng hợp ngành, nhập đủ để bày đầy rồi để dư một ít. */
  function restock() {
    const s = st();
    const unlocked = unlockedProducts(s.level);
    let k = 0;
    for (const f of s.furniture) {
      const def = furnitureDef(f.type);
      const ok = unlocked.filter((p) => def.categories.includes(p.category));
      if (!ok.length) continue;
      f.tiers.forEach((tier, i) => {
        const id = tier.productId ?? ok[k++ % ok.length].id;
        const need = def.capacity * 2 - tier.count - (st().storage[id] ?? 0);
        if (need > 0 && st().money > 200000) st().buy(id, Math.min(need, 50));
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
    // Thử đặt theo lưới, chỗ đầu tiên hợp lệ
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

  /** Chơi n ngày; trả về bảng nhật ký mỗi ngày. */
  return function autoplay(days: number) {
    const log: Record<string, number | string>[] = [];
    for (let d = 0; d < days; d++) {
      st().closePanel();
      hire();
      invest();
      restock();
      // Người chơi đứng quầy chính cả ngày
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
        // Giữa ngày bày lại hàng (người chơi chạy ra kệ lúc vắng khách)
        if (i % 150 === 0) restock();
        if (st().minutes >= 21.5 * 60) {
          useGame.setState({ minutes: 20 * 60 });
          st().sleep();
        }
      }
      const s = st();
      const sum = s.panel?.type === 'summary' ? s.panel.stats : null;
      log.push({
        day, level: s.level, money: Math.round(s.money / 1000) + 'k',
        revenue: sum ? Math.round(sum.revenue / 1000) + 'k' : '-',
        profit: sum ? Math.round((sum.revenue - sum.spent - sum.wages) / 1000) + 'k' : '-',
        customers: sum?.customers ?? 0, unhappy: sum?.unhappy ?? 0,
        shelves: s.furniture.length, staff: s.staff.length, tier: s.shopTier,
      });
    }
    st().closePanel();
    return log;
  };
}
