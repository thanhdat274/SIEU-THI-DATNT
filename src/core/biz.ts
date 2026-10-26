import {
  ACHIEVEMENTS, adById, activeAds, BREAKFAST, closeWeek, COUNTER_RETAILIATE, COUNTER_RETAILIATE_BUFF, COUNTER_STREAK_MAX,
  counterById, emptyWeek, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, newRival, RIVAL_BUY_DAYS,
  RIVAL_PERSONALITIES, RIVAL_SHOP_OFFER_DAYS, RIVAL_SHOP_PRICE, rivalNightAI,
  LOAN_DAILY_RATE, LOAN_DAYS, LOAN_UNLOCK, loanInterest, LOAN_OPTIONS_MIN, loanOptions, loanTopUps, petActive, petDef, PETS, PRICE_WAR_MIN_SALES, RIVAL_BEAT_REWARD,
  RIVAL_BEAT_XP, RIVAL_COOLDOWN, RIVAL_NAMES, RIVAL_START, RIVAL_UNLOCK, rivalNightly, STORIES, SURPRISE_CHANCE, SURPRISES,
  VEHICLES, WEEK_DAYS, type AchievementCtx, type BizState, type CounterTactic, type PetKind, type Vehicle,
} from '../data/biz';
import { CONVENIENCE, newBranch, shelfTotal } from '../data/branches';
import { chapterById, nextChapter, STORY_RIVAL_NAME } from '../data/chapters';
import { nearestLife } from '../data/freshness';
import { isCookStation } from '../data/furniture';
import { formatMoney, productById } from '../data/products';
import { REGULARS } from '../data/regulars';
import { summarizeReviews } from '../data/reviews';
import { reputationOf } from '../data/reputation';
import { serviceById } from '../data/services';
import { upgradeById, type UpgradeId } from '../data/upgrades';
import { useGame, type DayStats, type GameState } from './store';
import { copyStock, takeStock } from './stock';

const S = () => useGame.getState();
const patch = (b: Partial<BizState>) => useGame.setState({ biz: { ...S().biz, ...b } });
/** Trả tiền nếu đủ; không đủ thì báo và trả false. */
function pay(amount: number, what: string) {
  const s = S();
  if (s.money < amount) {
    s.notify(`Không đủ tiền ${what} (cần ${formatMoney(amount)})`);
    return false;
  }
  useGame.setState({ money: s.money - amount, stats: { ...s.stats, spent: s.stats.spent + amount } });
  return true;
}

// ───── Quảng cáo, tích điểm ─────

export function buyAd(id: string) {
  const s = S();
  const def = adById(id);
  if (!def || s.level < def.unlock) return;
  if (activeAds(s.biz.ads, s.day).some((a) => a.id === id)) return s.notify('Quảng cáo này đang chạy rồi');
  if (!pay(def.price, def.name.toLowerCase())) return;
  patch({ ads: [...activeAds(s.biz.ads, s.day), { id, untilDay: s.day + def.days - 1 }] });
  s.notify(`${def.icon} ${def.name}: đông khách thêm ${Math.round((def.traffic - 1) * 100)}% trong ${def.days} ngày`);
}

export function setLoyalty(on: boolean, stamps?: 5 | 10 | 15) {
  const l = S().biz.loyalty;
  patch({ loyalty: { ...l, on, stamps: stamps ?? l.stamps } });
}

// ───── Phản công đối thủ ─────

/** Chạy một đợt phản công đối thủ hôm nay: mỗi ngày một đợt, mỗi chiến thuật có thời gian hồi. */
export function startCounter(tactic: CounterTactic) {
  const s = S();
  const def = counterById(tactic);
  if (!s.biz.rival) return s.notify('Chưa có đối thủ nào mở cạnh tranh');
  if (s.biz.counter?.day === s.day) return s.notify('Hôm nay đã chạy một đợt phản công rồi, mai tính tiếp');
  if (s.day < (s.biz.counterReady[tactic] ?? 0)) return s.notify(`${def.name} đang hồi, dùng lại được từ ngày ${s.biz.counterReady[tactic]}`);
  if (def.cost && !pay(def.cost, def.name.toLowerCase())) return;
  patch({
    counter: { tactic, day: s.day },
    counterReady: { ...s.biz.counterReady, [tactic]: s.day + def.cooldown },
  });
  const note = tactic === 'price'
    ? '💸 Đối đầu giá: hôm nay mọi món bán rẻ hơn 10% niêm yết — bán được 30 món thì đêm nay đối thủ mất sức mạnh!'
    : tactic === 'ad'
      ? '📢 Quảng cáo xuyên hẻm đang chạy: hôm nay khách đông thêm, đêm nay đối thủ mất sức mạnh'
      : '🎁 Tri ân khách quen: khách quen ghé hôm nay được tặng quà (+2 thân thiết)';
  s.notify(note);
}

/** Khách vừa đủ tem: tặng món rẻ nhất trong giỏ; trả về số tiền giảm. */
export function redeemLoyalty(prices: number[]) {
  if (!prices.length) return 0;
  const gift = Math.min(...prices);
  const l = S().biz.loyalty;
  patch({ loyalty: { ...l, redeemed: l.redeemed + 1, given: l.given + gift } });
  return gift;
}

/** Mua lại mặt bằng rival vừa đóng cửa: thành chi nhánh luôn, hoặc khách cũ của họ ghé đông hơn nếu đã có chi nhánh. */
export function buyRivalShop() {
  const s = S();
  const offer = s.biz.rivalForSale;
  if (!offer) return s.notify('Hiện không có mặt bằng rival nào chào bán');
  if (!pay(offer.price, `mua lại mặt bằng ${offer.name}`)) return;
  patch({ rivalForSale: undefined, rivalBuyUntil: s.day + RIVAL_BUY_DAYS });
  if (!s.branch) {
    useGame.setState({ branch: { ...newBranch(), simAt: s.minutes } });
    s.notify(`🏢 Đã mua lại ${offer.name} làm chi nhánh mới! Kệ sẵn hàng, khách cũ của họ nửa đầu quen đường sang mình — thuê nhân viên rồi mở cửa.`);
  } else {
    // Đã có chi nhánh: mặt bằng mua về thành một chuyến hàng chuyển từ kho chung sang kệ chi nhánh
    const k = copyStock(s);
    const shelf = { ...s.branch!.shelf };
    let moved = 0;
    for (const [id, q] of Object.entries(k.storage)) {
      if (q <= 0 || moved >= CONVENIENCE.shelfCap) continue;
      const take = Math.min(q, CONVENIENCE.shelfCap - shelfTotal(shelf), 40);
      if (take <= 0) break;
      takeStock(k, id, take);
      shelf[id] = (shelf[id] ?? 0) + take;
      moved += take;
    }
    useGame.setState({ ...k, branch: { ...s.branch!, shelf } });
    s.notify(`🏢 Đã mua lại ${offer.name}: khách cũ của rival ghé tiệm mình đông hơn trong ${RIVAL_BUY_DAYS} ngày, chi nhánh nhận thêm ${moved} món từ kho chung`);
  }
}

// ───── Vay vốn, hụi ─────

/** `emergency`: vay gấp để nhập hàng giao đơn, được vay gói nhỏ nhất kể cả khi chưa tới cấp mở vay. */
export function takeLoan(amount: number, emergency = false) {
  const s = S();
  if (s.level < LOAN_UNLOCK && !(emergency && !s.biz.loan && amount === LOAN_OPTIONS_MIN)) return;
  if (s.level < LOAN_UNLOCK) {
    patch({ loan: { principal: amount, takenDay: s.day, dueDay: s.day + LOAN_DAYS, interestPaid: 0 } });
    useGame.setState({ money: S().money + amount });
    s.notify(`🏦 Vay gấp ${formatMoney(amount)} để nhập hàng, lãi ${(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày, hạn trả ngày ${s.day + LOAN_DAYS}`);
    return;
  }
  const loan = s.biz.loan;
  if (loan) {
    // Vay thêm: cộng vào gốc, hạn trả tính lại từ hôm nay
    if (!loanTopUps(s.level, loan.principal).includes(amount)) return;
    patch({ loan: { ...loan, principal: loan.principal + amount, dueDay: s.day + LOAN_DAYS } });
    useGame.setState({ money: S().money + amount });
    s.notify(`🏦 Vay thêm ${formatMoney(amount)}, nợ gốc ${formatMoney(loan.principal + amount)}, hạn trả dời tới ngày ${s.day + LOAN_DAYS}`);
    return;
  }
  if (!loanOptions(s.level).includes(amount)) return;
  patch({ loan: { principal: amount, takenDay: s.day, dueDay: s.day + LOAN_DAYS, interestPaid: 0 } });
  useGame.setState({ money: S().money + amount });
  s.notify(`🏦 Vay ${formatMoney(amount)}, lãi ${(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày, hạn trả ngày ${s.day + LOAN_DAYS}`);
}

export function repayLoan(amount?: number) {
  const s = S();
  const loan = s.biz.loan;
  if (!loan) return;
  const n = Math.min(amount ?? loan.principal, loan.principal, s.money);
  if (n <= 0) return s.notify('Không có tiền để trả');
  useGame.setState({ money: s.money - n });
  patch({ loan: loan.principal - n > 0 ? { ...loan, principal: loan.principal - n } : null });
  s.notify(loan.principal - n > 0 ? `🏦 Trả bớt ${formatMoney(n)}, còn nợ ${formatMoney(loan.principal - n)}` : '🏦 Đã trả hết nợ ngân hàng!');
}

export function joinHui(option: number) {
  const s = S();
  const o = HUI_OPTIONS[option];
  if (!o || s.level < HUI_UNLOCK || s.biz.hui) return;
  // Hốt hụi vào một ngày ngẫu nhiên trong vòng (ngày 3 tới cuối vòng)
  const turn = s.day + 2 + Math.floor(Math.random() * (o.members - 2));
  patch({ hui: { ...o, startDay: s.day, turnDay: turn, received: false, paidDays: 0 } });
  s.notify(`🤝 Vào hụi ${formatMoney(o.daily)}/ngày, ${o.members} chân. Ngày ${turn} tới lượt bạn hốt ${formatMoney(o.daily * o.members)}`);
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

export const theftFactor = (b: BizState, day: number) => (petActive(b.pets.dog, day) ? 0.45 : 1);
export const spoilFactor = (b: BizState, day: number) => (petActive(b.pets.cat, day) ? 0.8 : 1);

// ───── Thành tựu ─────

export function achievementCtx(s: GameState): AchievementCtx {
  return {
    totals: s.totals, level: s.level, ordersDone: s.ordersDone, phoneOrdersDone: s.phoneOrdersDone,
    closeFriends: Object.values(s.regulars).filter((r) => r.friendship >= 40).length,
    rivalsBeaten: s.biz.rivalsBeaten, petCount: Object.keys(s.biz.pets).length, homeDecor: s.biz.home.length,
    vehicle: s.biz.vehicle, perfectDays: s.biz.perfectDays,
    cookedSold: s.totals.cookedSold,
    cookedStations: new Set(s.furniture.map((f) => f.type).filter(isCookStation)).size,
    qualityStars: reputationOf(s.repLog).factors.quality,
    impulseSold: s.totals.impulseSold,
    cookOrdersDone: s.totals.cookOrdersDone,
    counterKills: s.biz.counterKills,
  };
}

export function checkAchievements() {
  const s = S();
  const ctx = achievementCtx(s);
  const fresh = ACHIEVEMENTS.filter((a) => !s.biz.achievements.includes(a.id) && a.done(ctx));
  if (!fresh.length) return;
  const reward = fresh.reduce((n, a) => n + a.reward, 0);
  patch({ achievements: [...s.biz.achievements, ...fresh.map((a) => a.id)] });
  useGame.setState({ money: S().money + reward });
  for (const a of fresh) s.notify(`🏆 Thành tựu: ${a.icon} ${a.name} · +${formatMoney(a.reward)}`);
}

// ───── Sự kiện bất ngờ ─────

/** Gọi mỗi khi giờ chạy: mỗi ngày tối đa một sự kiện, vào giờ ngẫu nhiên khi tiệm mở. */
export function maybeSurprise(elapsedMinutes: number) {
  const s = S();
  const b = s.biz;
  if (b.surprise && s.minutes > b.surprise.expiresAt) return patch({ surprise: null });
  if (b.surpriseDay === s.day || !s.shopOpen || s.minutes < 9 * 60 || s.minutes > 20 * 60) return;
  // Cơ hội tỉ lệ với số phút game vừa trôi: cộng dồn cả khung 9h–20h ra khoảng SURPRISE_CHANCE mỗi ngày
  if (Math.random() > (SURPRISE_CHANCE * elapsedMinutes) / (11 * 60)) return;
  const pool = SURPRISES.filter((e) => e.unlock <= s.level);
  const ev = pool[Math.floor(Math.random() * pool.length)];
  if (!ev) return;
  patch({ surprise: { id: ev.id, expiresAt: s.minutes + 45 }, surpriseDay: s.day });
  s.notify(`${ev.icon} ${ev.title}`);
}

export function chooseSurprise(index: number) {
  const s = S();
  const ev = s.biz.surprise && SURPRISES.find((e) => e.id === s.biz.surprise!.id);
  const c = ev?.choices[index];
  if (!ev || !c) return;
  patch({ surprise: null });
  if (c.money) useGame.setState({ money: S().money + c.money, ...(c.money < 0 ? { stats: { ...S().stats, spent: S().stats.spent - c.money } } : {}) });
  if (c.minutes) useGame.setState({ minutes: S().minutes + c.minutes });
  if (c.xp) S().addXp(c.xp);
  if (c.rating) S().addReview(c.rating);
  s.notify(`${ev.icon} ${c.result}${c.money ? ` (${c.money > 0 ? '+' : ''}${formatMoney(c.money)})` : ''}`);
}

// ───── Chuyện khách quen ─────

/** Khách quen vừa trả tiền: có chương truyện mới mở theo độ thân thì hiện lên. */
export function storyOnVisit(regularId: string) {
  const s = S();
  const chapters = STORIES[regularId];
  if (!chapters || s.biz.storyPending) return;
  const seen = s.biz.story[regularId] ?? 0;
  const next = chapters[seen];
  if (next && (s.regulars[regularId]?.friendship ?? 0) >= next.at) patch({ storyPending: { regular: regularId, chapter: seen } });
}

export function closeStory() {
  const s = S();
  const p = s.biz.storyPending;
  if (!p) return;
  const ch = STORIES[p.regular]?.[p.chapter];
  patch({ storyPending: null, story: { ...s.biz.story, [p.regular]: p.chapter + 1 } });
  if (ch?.reward?.money) useGame.setState({ money: S().money + ch.reward.money });
  if (ch?.reward?.xp) S().addXp(ch.reward.xp);
}

// ───── Cốt truyện theo chương ─────

/** Có chương mới đủ điều kiện thì xếp chờ hiện hội thoại (gọi thường xuyên, rẻ). */
export function checkChapters() {
  const s = S();
  if (s.biz.chapterPending || s.biz.storyPending || s.panel) return;
  // Mỗi ngày tối đa một chương: lên cấp nhanh không dồn mấy hội thoại liên tiếp
  if (s.biz.chapterDay === s.day) return;
  const ch = nextChapter(s.biz.chapters, {
    day: s.day, level: s.level, customers: s.totals.customers, staffCount: s.staff.length, shopTier: s.shopTier,
    hasRival: !!s.biz.rival, rivalsBeaten: s.biz.rivalsBeaten,
  });
  if (ch) patch({ chapterPending: ch.id });
}

/** Đọc xong hội thoại: ghi đã xem, trao thưởng, chạy hiệu ứng của chương. */
export function closeChapter() {
  const s = S();
  const ch = s.biz.chapterPending ? chapterById(s.biz.chapterPending) : undefined;
  if (!ch) return patch({ chapterPending: null });
  const b: Partial<BizState> = { chapterPending: null, chapters: [...s.biz.chapters, ch.id], chapterDay: s.day };
  if (ch.effect === 'openRival' && !s.biz.rival) {
    b.rival = { ...newRival(STORY_RIVAL_NAME, RIVAL_START, s.day), saleUntil: s.day + 2 };
  }
  patch(b);
  if (ch.reward?.money) useGame.setState({ money: S().money + ch.reward.money });
  if (ch.reward?.xp) S().addXp(ch.reward.xp);
  if (ch.effect === 'openRival') s.notify(`⚔️ ${STORY_RIVAL_NAME} khai trương, giảm giá 2 ngày đầu. Xem sức mạnh của họ ở Kinh doanh`);
}

// ───── Nhắc hàng sắp hết, sắp hỏng ─────

/** Món trên kệ còn ít hơn chừng này (cả kệ lẫn kho) thì nhắc nhập. */
const LOW_STOCK = 4;
let remindedDay = -1;
const reminded = new Set<string>();

/** Nhắc mỗi món một lần mỗi ngày: hàng đang bán sắp hết (kho cũng hết), hàng còn dưới 1 ngày hạn. */
export function stockReminders() {
  const s = S();
  if (remindedDay !== s.day) {
    remindedDay = s.day;
    reminded.clear();
  }
  const shelf: Record<string, number> = {};
  const expiring = new Set<string>();
  for (const f of s.furniture) {
    for (const t of f.tiers) {
      if (!t.productId) continue;
      shelf[t.productId] = (shelf[t.productId] ?? 0) + t.count;
      const life = t.count ? nearestLife(t.lots) : null;
      if (life !== null && life <= 1) expiring.add(t.productId);
    }
  }
  for (const [id, lots] of Object.entries(s.storageLots)) {
    const life = (s.storage[id] ?? 0) > 0 ? nearestLife(lots) : null;
    if (life !== null && life <= 1) expiring.add(id);
  }
  const low = Object.entries(shelf)
    .filter(([id, n]) => n + (s.storage[id] ?? 0) < LOW_STOCK && (s.demand[id] ?? 0) > 0 && !reminded.has(`low:${id}`))
    .map(([id]) => id);
  const spoil = [...expiring].filter((id) => !reminded.has(`exp:${id}`));
  for (const id of low) reminded.add(`low:${id}`);
  for (const id of spoil) reminded.add(`exp:${id}`);
  const names = (ids: string[]) => ids.slice(0, 4).map((id) => productById(id).name).join(', ') + (ids.length > 4 ? '…' : '');
  const parts: string[] = [];
  if (low.length) parts.push(`📉 Sắp hết hàng: ${names(low)} — nhập thêm`);
  if (spoil.length) parts.push(`⏳ Sắp hỏng (còn dưới 1 ngày): ${names(spoil)} — giảm giá bán bớt`);
  if (parts.length) s.notify(parts.join(' · '));
}

export function dismissTutorial() {
  patch({ tutorialOff: true });
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
  s.notify(`${def.icon} Đã mở dịch vụ ${def.name}: khách sẽ ghé quầy dùng dịch vụ, nhiều người mua kèm`);
}

/** Một lượt dịch vụ xong ở quầy: cộng tiền lời vào két và doanh thu hôm nay. */
export function earnService(fee: number) {
  const s = S();
  useGame.setState({
    money: s.money + fee,
    stats: { ...s.stats, revenue: s.stats.revenue + fee, services: (s.stats.services ?? 0) + fee },
  });
}

export function eatBreakfast() {
  const s = S();
  if (s.biz.breakfastDay === s.day) return s.notify('Sáng nay ăn rồi, no lắm');
  if (s.minutes > 11 * 60) return s.notify('Quá giờ ăn sáng rồi');
  if (!pay(BREAKFAST.price, 'ăn sáng')) return;
  patch({ breakfastDay: s.day });
  s.notify(`🍜 Ăn tô phở sáng (${BREAKFAST.price.toLocaleString('vi-VN')}đ): hôm nay đi nhanh hơn, thức khuya thêm ${BREAKFAST.lateMinutes} phút mới ngất`);
}

export function buyVehicle(id: Exclude<Vehicle, 'none'>) {
  const s = S();
  const v = VEHICLES.find((x) => x.id === id);
  const order: Vehicle[] = ['none', 'bike', 'moto'];
  if (!v || s.level < v.unlock || order.indexOf(s.biz.vehicle) >= order.indexOf(id) || !pay(v.price, `mua ${v.name.toLowerCase()}`)) return;
  patch({ vehicle: id });
  s.notify(`${v.icon} Có ${v.name}: ngoài đường đi nhanh hơn, đi lại nhà ↔ tiệm đỡ tốn giờ, giao hàng nhanh`);
  checkAchievements();
}

// ───── Cuối ngày ─────

/**
 * Tổng kết phần kinh doanh thêm khi sang ngày mới: đối thủ, lãi vay, hụi, sổ tuần, thú cưng, thành tựu.
 * `stats` là số liệu của ngày vừa hết; trả về phần cần ghép vào trạng thái và tiền chênh lệch.
 */
export function bizEndOfDay(s: GameState, stats: DayStats): { biz: BizState; money: number; news: string[]; poachedStaffId?: number } {
  const b: BizState = { ...s.biz, ads: activeAds(s.biz.ads, s.day + 1) };
  let poachedStaffId: number | undefined;
  const news: string[] = [];
  let money = 0;
  const day = s.day;

  // Đối thủ
  if (b.rival) {
    const rating = summarizeReviews(s.reviews.slice(-30)).average || 3.5;
    const missed = (stats.missed?.stock ?? 0) + (stats.missed?.price ?? 0) + (stats.missed?.wait ?? 0);
    const missRate = missed / Math.max(1, missed + stats.itemsSold);
    // Đợt phản công hôm nay: tính hiệu quả trước khi đối thủ tự điều chỉnh theo số liệu ngày
    const counter = b.counter?.day === day ? b.counter : null;
    let counterHit = 0;
    if (counter) {
      const def = counterById(counter.tactic);
      if (counter.tactic === 'price' && stats.itemsSold < PRICE_WAR_MIN_SALES) {
        news.push(`💸 Đối đầu giá mà chỉ bán ${stats.itemsSold} món (cần ${PRICE_WAR_MIN_SALES}): khách chưa tin tiệm rẻ hơn, đợt này vô hiệu`);
      } else {
        // Đối đầu nhiều ngày liền: phe mình đang máu lửa, đòn nặng thêm mỗi ngày (tối đa +3)
        const streak = b.counterLastDay === day - 1 ? (b.counterStreak ?? 0) + 1 : 1;
        const streakBonus = Math.min(streak - 1, COUNTER_STREAK_MAX);
        counterHit = def.hit + streakBonus;
        b.counterStreak = streak;
        b.counterLastDay = day;
        news.push(`${def.icon} Đợt "${def.name}" hiệu quả: ${b.rival.name} mất ${counterHit} sức mạnh`);
        if (streakBonus > 0) news.push(`🔥 Đối đầu ngày thứ ${streak} liền, phe mình máu lửa: đòn nặng thêm ${streakBonus} sức mạnh`);
      }
      b.counter = null;
    }
    const priced = Object.keys(s.prices);
    const priceIndex = priced.length ? priced.reduce((n, id) => n + s.prices[id] / productById(id).sell, 0) / priced.length : 1;
    // Đối thủ có não: nhìn sổ bán hôm nay để phá giá đúng món mình bán chạy, lôi kéo khách quen xa lạ
    const ai = rivalNightAI(b.rival, {
      day, byItem: stats.byItem ?? {}, priceOf: (id) => s.priceOf(id),
      friendships: Object.fromEntries(Object.entries(s.regulars).map(([id, r]) => [id, r.friendship])),
      giftCounter: counter?.tactic === 'gift',
      staff: s.staff.map((st) => ({ id: st.id, name: st.name, skill: st.skill })),
    });
    news.push(...ai.news);
    for (const rid of ai.returned) s.adjustFriendship(rid, 5);
    poachedStaffId = ai.poachedStaffId;
    let strength = rivalNightly(b.rival, { rating, missRate, priceIndex, adsActive: activeAds(s.biz.ads, day).length > 0 }) - counterHit;
    let sale = Math.random() < 0.15 ? day + 1 + Math.floor(Math.random() * 2) : b.rival.saleUntil;
    // Bị đánh mà vẫn trụ: đối thủ có khi trả đũa bằng đợt giảm giá ngay ngày mai
    if (counterHit > 0 && strength > 0 && Math.random() < COUNTER_RETAILIATE) {
      strength = Math.min(100, strength + COUNTER_RETAILIATE_BUFF);
      sale = day + 1;
      news.push(`⚔️ ${b.rival.name} trả đũa: xả hàng giảm giá tới ngày ${sale}, gắng kéo khách về phía họ!`);
    }
    if (strength <= 0) {
      news.push(`🏆 ${b.rival.name} đóng cửa! Khách cũ của họ chuyển hết sang tiệm bạn · +${formatMoney(RIVAL_BEAT_REWARD)}`
        + ` · Chủ tiệm đó chào bán lại mặt bằng ${formatMoney(RIVAL_SHOP_PRICE)} trong ${RIVAL_SHOP_OFFER_DAYS} ngày — muốn mở chi nhánh thì xem ở Kinh doanh`);
      if (counterHit > 0) news.push('🎯 Đòn phản công hôm qua chính là giọt nước tràn ly — đối thủ gậy cũ nằm gọn!');
      money += RIVAL_BEAT_REWARD;
      s.addXp(RIVAL_BEAT_XP);
      b.rivalForSale = { name: b.rival.name, price: RIVAL_SHOP_PRICE, until: day + RIVAL_SHOP_OFFER_DAYS };
      b.rival = null;
      b.rivalsBeaten += 1;
      if (counterHit > 0) b.counterKills += 1;
      b.rivalNextDay = day + RIVAL_COOLDOWN;
    } else {
      if (sale !== b.rival.saleUntil && counterHit <= 0) news.push(`⚔️ ${b.rival.name} giảm giá xả hàng tới ngày ${sale}, khách bị hút bớt`);
      b.rival = { ...ai.rival, strength, saleUntil: sale };
    }
  } else if (b.counter) {
    b.counter = null; // đối thủ đóng cửa giữa chừng thì đợt phản công cũng kết thúc
  } else if (s.level >= RIVAL_UNLOCK && b.rivalsBeaten > 0 && day + 1 >= b.rivalNextDay && Math.random() < 0.25) {
    const name = RIVAL_NAMES[b.rivalsBeaten % RIVAL_NAMES.length];
    const fresh = newRival(name, Math.min(95, RIVAL_START + b.rivalsBeaten * 10), day + 1);
    b.rival = fresh;
    const pers = RIVAL_PERSONALITIES[fresh.personality!];
    news.push(`⚔️ ${name} vừa khai trương ở đầu hẻm! Tính cách: ${pers.icon} ${pers.name} — ${pers.desc}. Giữ giá tốt, hàng đầy, khách vui để họ đóng cửa`);
  }
  // Chào bán mặt bằng rival: hết hạn hoặc rival mới mở là người khác thuê mất
  if (b.rivalForSale && (b.rival || day + 1 > b.rivalForSale.until)) {
    if (!b.rival) news.push(`🏢 Mặt bằng "${b.rivalForSale.name}" đã bị người khác thuê mất, tiếc thật`);
    b.rivalForSale = undefined;
  }

  // Lãi vay, quá hạn
  if (b.loan) {
    const interest = loanInterest(b.loan.principal);
    money -= interest;
    b.loan = { ...b.loan, interestPaid: (b.loan.interestPaid ?? 0) + interest };
    if (day + 1 > b.loan.dueDay) {
      // Quá hạn: ngân hàng trừ thẳng vào tài khoản
      money -= b.loan.principal;
      news.push(`🏦 Khoản vay quá hạn, ngân hàng thu ${formatMoney(b.loan.principal)} cùng lãi`);
      b.loan = null;
    } else {
      news.push(`🏦 Trả lãi vay ${formatMoney(interest)} · còn nợ gốc ${formatMoney(b.loan.principal)} · hạn ngày ${b.loan.dueDay} (còn ${b.loan.dueDay - (day + 1)} ngày)`);
      if (b.loan.dueDay - (day + 1) === 3) news.push(`⚠️ Còn 3 ngày tới hạn trả nợ ${formatMoney(b.loan.principal)} — gắng trả bớt gốc!`);
    }
  }

  // Hụi: góp mỗi ngày, tới lượt thì hốt; có khi vỡ hụi
  if (b.hui) {
    const h = { ...b.hui };
    if (Math.random() < HUI_COLLAPSE) {
      news.push(`😱 Vỡ hụi! Chủ hụi ôm tiền bỏ trốn, mất ${formatMoney(h.paidDays * h.daily)} đã góp`);
      b.hui = null;
    } else {
      money -= h.daily;
      h.paidDays += 1;
      if (!h.received && day + 1 >= h.turnDay) {
        money += h.daily * h.members;
        h.received = true;
        news.push(`💰 Tới lượt hốt hụi: +${formatMoney(h.daily * h.members)}`);
      }
      b.hui = h.paidDays >= h.members ? null : h;
      if (!b.hui) news.push('🤝 Mãn vòng hụi, có thể vào vòng mới');
    }
  }

  // Sổ tuần
  const items = { ...b.week.items };
  for (const [id, l] of Object.entries(stats.byItem ?? {})) {
    const o = items[id] ?? { qty: 0, gross: 0 };
    items[id] = { qty: o.qty + l.qty, gross: o.gross + l.revenue - l.cost };
  }
  b.week = {
    ...b.week, items,
    revenue: b.week.revenue + stats.revenue, profit: b.week.profit + stats.revenue - stats.spent - stats.wages - (stats.rent ?? 0),
    customers: b.week.customers + stats.customers, unhappy: b.week.unhappy + stats.unhappy,
  };
  if (day - b.week.startDay + 1 >= WEEK_DAYS) {
    const report = closeWeek(b.week, day);
    if (report.reward) money += report.reward;
    news.push(report.goalMet
      ? `📊 Tuần ${report.week}: đạt mục tiêu doanh thu! Thưởng ${formatMoney(report.reward)}`
      : `📊 Tuần ${report.week} kết thúc, xem báo cáo ở bảng Kinh doanh`);
    b.lastWeek = report;
    b.week = emptyWeek(day + 1, report.nextGoal);
  }

  // Ngày hoàn hảo, thú cưng đói
  if (stats.customers >= 20 && stats.unhappy === 0) b.perfectDays += 1;
  for (const p of PETS) if (b.pets[p.kind] && !petActive(b.pets[p.kind], day + 1)) news.push(`${p.icon} ${p.name} đói rồi, nhớ cho ăn`);

  return { biz: b, money, news, poachedStaffId };
}

export const REGULAR_NAMES = Object.fromEntries(REGULARS.map((r) => [r.id, r.name]));
