import { petDef, HOME_ITEMS, type BizState, type PetKind } from '../data/biz';
import { formatMoney, productById } from '../data/products';
import { serviceById } from '../data/services';
import { upgradeById, type UpgradeId } from '../data/upgrades';
import { checkAchievements } from './bizAchieve';
import { useGame } from './store';

const S = () => useGame.getState();
const patch = (b: Partial<BizState>) => useGame.setState({ biz: { ...S().biz, ...b } });

/** Trả tiền nếu đủ; không đủ thì báo và trả false. */
export function pay(amount: number, what: string) {
  const s = S();
  if (s.money < amount) {
    s.notify(`Không đủ tiền ${what} (cần ${formatMoney(amount)})`);
    return false;
  }
  useGame.setState({ money: s.money - amount, stats: { ...s.stats, spent: s.stats.spent + amount } });
  return true;
}

// ───── Thú cưng ─────

export function buyPet(kind: PetKind) {
  const s = S();
  const def = petDef(kind);
  if (s.biz.pets[kind] || s.level < def.unlock || !pay(def.price, `nuôi ${def.name}`)) return;
  patch({ pets: { ...s.biz.pets, [kind]: { fedDay: s.day } } });
  s.notify(`${def.icon} ${def.name} về tiệm rồi! Nhớ cho ăn mỗi ngày (${productById(def.food).name} trong kho)`);
  checkAchievements();
}

/** Cho ăn bằng 1 gói thức ăn trong kho (không có thì mua lẻ 2 lần giá). */
export function feedPet(kind: PetKind) {
  const s = S();
  const pet = s.biz.pets[kind];
  if (!pet) return;
  if (pet.fedDay === s.day) return s.notify('Hôm nay cho ăn rồi');
  const def = petDef(kind);
  if ((s.storage[def.food] ?? 0) > 0) {
    s.consumeStock(def.food, 1);
  } else if (!pay(productById(def.food).buy * 2, 'mua thức ăn lẻ')) return;
  patch({ pets: { ...S().biz.pets, [kind]: { fedDay: s.day } } });
  s.notify(`${def.icon} ${def.name} ăn no, vẫy đuôi rối rít`);
}

/** Mua thiết bị một lần (camera an ninh, máy POS) — dùng vĩnh viễn sau khi lắp. */
export function buyUpgrade(id: UpgradeId) {
  const s = S();
  const def = upgradeById(id);
  if (!def || s.biz.upgrades?.includes(id)) return;
  if (s.level < def.unlock) return s.notify(`Cần cấp ${def.unlock} để mua ${def.name}`);
  if (!pay(def.price, `lắp ${def.name}`)) return;
  patch({ upgrades: [...(S().biz.upgrades ?? []), id] });
  s.notify(`${def.icon} Đã lắp ${def.name}! ${def.desc}`);
}
// ───── Nhà riêng, bữa sáng, xe ─────

export function buyHomeItem(id: string) {
  const s = S();
  const item = HOME_ITEMS.find((h) => h.id === id);
  if (!item || s.biz.home.includes(id) || s.level < item.unlock || !pay(item.price, `mua ${item.name.toLowerCase()}`)) return;
  patch({ home: [...s.biz.home, id] });
  s.notify(`${item.icon} Đã sắm ${item.name} cho nhà: ngủ ngon hơn, sáng đi nhanh hơn ${Math.round(item.rest * 100)}%`);
  checkAchievements();
}

// ───── Dịch vụ ở quầy ─────

export function buyService(id: string) {
  const s = S();
  const def = serviceById(id);
  const owned = s.biz.services ?? [];
  if (!def || owned.includes(id) || s.level < def.unlock || !pay(def.price, def.name.toLowerCase())) return;
  patch({ services: [...owned, id] });
  s.notify(`${def.icon} Đã mở dịch vụ ${def.name}: khách dùng dịch vụ hay mua kèm hàng`);
}

/** Một lượt dịch vụ xong ở quầy: cộng tiền lời vào két, doanh thu hôm nay, và ghi sổ theo dịch vụ
 *  để xem dịch vụ nào đáng (GĐ66). `id` thiếu (đường cũ) thì chỉ cộng tổng, bỏ qua sổ theo dịch vụ. */
export function earnService(id: string | undefined, fee: number) {
  const s = S();
  const nextStats = {
    ...s.stats, revenue: s.stats.revenue + fee, services: (s.stats.services ?? 0) + fee,
    ...(id ? { byService: { ...(s.stats.byService ?? {}), [id]: (s.stats.byService?.[id] ?? 0) + fee } } : {}),
  };
  const nextBiz = id
    ? { ...s.biz, serviceLife: { ...(s.biz.serviceLife ?? {}), [id]: (s.biz.serviceLife?.[id] ?? 0) + fee } }
    : s.biz;
  useGame.setState({ money: s.money + fee, stats: nextStats, biz: nextBiz });
}
