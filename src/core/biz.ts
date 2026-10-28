import { simRng } from './rand';
import {
  ACHIEVEMENTS, adById, activeAds, BREAKFAST, closeMonth, closeWeek, COUNTER_RETAILIATE, COUNTER_RETAILIATE_BUFF, COUNTER_STREAK_MAX,
  counterById, emptyMonth, emptyWeek, HOME_ITEMS, HUI_COLLAPSE, HUI_OPTIONS, HUI_UNLOCK, newRival, RIVAL_BUY_DAYS,
  RIVAL_PERSONALITIES, RIVAL_SHOP_OFFER_DAYS, RIVAL_SHOP_PRICE, rivalNightAI,
  LOAN_DAILY_RATE, LOAN_DAYS, LOAN_UNLOCK, loanInterest, LOAN_OPTIONS_MIN, loanOptions, loanTopUps, petActive, petDef, PETS, PRICE_WAR_MIN_SALES, RIVAL_BEAT_REWARD,
  RIVAL_BEAT_XP, RIVAL_COOLDOWN, RIVAL_SHOPS, RIVAL_START, RIVAL_TREND_DAYS, RIVAL_UNLOCK, rivalNightly, rivalTier, STORIES, SURPRISE_CHANCE, SURPRISES,
  VEHICLES, WEEK_DAYS, type AchievementCtx, type BizState, type CounterTactic, type PetKind, type Vehicle,
} from '../data/biz';
import { CONVENIENCE, newBranch, shelfTotal } from '../data/branches';
import { chapterById, nextChapter, STORY_RIVAL_NAME } from '../data/chapters';
import { monthOf, upcomingFestival, describeDate } from '../data/calendar';
import { closeYear, emptyYear, yearOf } from '../data/yearReport';
import { almanacMilestoneReward, newlyReachedAlmanac } from '../data/seasonAlmanac';
import { prepBonus, prepReadiness } from '../data/festivalPrep';
import { nearestLife } from '../data/freshness';
import { isCookStation } from '../data/furniture';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { formatMoney, productById } from '../data/products';
import { REGULARS } from '../data/regulars';
import { summarizeReviews } from '../data/reviews';
import { reputationOf } from '../data/reputation';
import { serviceById } from '../data/services';
import { monthlyRelRebate, relTier } from '../data/supplierRel';
import { supplierById } from '../data/suppliers';
import { upgradeById, type UpgradeId } from '../data/upgrades';
import { isFairOpen, makeFairOffer } from '../data/fairmerchant';
import { lifetimeRegularVisits, monthlyTriAn, EMOTIONAL_FRIENDSHIP } from '../data/regularTrust';
import { hiepLucPayoff, hiepLucBonus, hiepLucEligible, HIEPLUC_MIN, HIEPLUC_COC } from '../data/hiepLuc';
import { seasonEvent, seasonObjective, seasonEventName, SEASON_REWARD_PER_STAR, seasonOf, type SeasonKey } from '../data/seasonEvent';
import { CLEAN_TIERS, cleanBonus, cleanDayMet } from '../data/cleanOps';
import { arcById, arcReward } from '../data/regularArc';
import {
  arcGoodCount, arcSceneAt, arcReward as surpriseArcReward, findSurprise,
  sceneFor, surpriseArcById, SURPRISE_ARCS, type SurpriseArcState,
} from '../data/surpriseArcs';
import { storageCapacity, storageUsed } from './gameTypes';
import { useGame, type DayStats, type GameState } from './store';
import { copyStock, putStock, takeStock } from './stock';
import { playSfx } from './audio';

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
  const turn = s.day + 2 + Math.floor(simRng()() * (o.members - 2));
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
  if (fresh.length) playSfx('achieve');
}

// ───── Sự kiện bất ngờ ─────

/**
 * Gọi mỗi khi giờ chạy: mỗi ngày tối đa một sự kiện, vào giờ ngẫu nhiên khi tiệm mở.
 * GĐ164: arc sự kiện đang dở thì KHÔNG quay pool — phát cảnh hôm nay ở giờ tất định
 * (10h–11h30, arcSceneAt), cảnh giữ tới 20h (không tự mất 45 phút); trúng id-có-arc
 * trong pool thì mở arc thay vì phát một-phát; arc quá hạn thì khép nhẹ không phạt.
 */
export function maybeSurprise(elapsedMinutes: number) {
  const s = S();
  const b = s.biz;
  if (b.surprise && s.minutes > b.surprise.expiresAt) return patch({ surprise: null });
  // Arc quá hạn (hôm qua là ngày cuối mà vẫn để dở) → khép nhẹ, kể cả khi tiệm chưa mở cửa.
  if (b.surpriseArc && !b.surpriseArc.done && s.day > b.surpriseArc.expiresDay) {
    const arc = surpriseArcById(b.surpriseArc.arcId);
    patch({ surpriseArc: { ...b.surpriseArc, done: true } });
    s.notify(`📖 Chuyện ${arc?.title ?? 'hẻm'} để dở — không sao, hẻm nào chẳng có chuyện, dịp khác kể tiếp.`);
    return;
  }
  if (b.surpriseDay === s.day || !s.shopOpen || s.minutes < 9 * 60 || s.minutes > 20 * 60) return;
  // Arc đang dở: hôm nay thuộc arc → phát cảnh hôm nay (một cảnh/ngày, tái dùng surpriseDay).
  const arcSt = b.surpriseArc && !b.surpriseArc.done ? b.surpriseArc : null;
  if (arcSt) {
    const arc = surpriseArcById(arcSt.arcId);
    const scene = arc ? sceneFor(arc, arcSt) : null;
    if (arc && scene && s.minutes >= arcSceneAt(s.weatherSeed, s.day)) {
      // Cảnh arc giữ tới 20h — lỡ hôm nay vẫn quay lại ngày mai, tới khi hết hạn đợt.
      patch({ surprise: { id: arc.id, expiresAt: 20 * 60 }, surpriseDay: s.day });
      s.notify(`📖 ${arc.icon} ${scene.teaser ?? arc.title}`);
    }
    return; // đang có arc → không quay pool hôm nay
  }
  // Cơ hội tỉ lệ với số phút game vừa trôi: cộng dồn cả khung 9h–20h ra khoảng SURPRISE_CHANCE mỗi ngày
  if (simRng()() > (SURPRISE_CHANCE * elapsedMinutes) / (11 * 60)) return;
  // GĐ164: pool = def một-phát + arc CHƯA kể (arc thay def cũ cùng band mật độ; kể xong/khép sớm
  // đều vào surpriseArcsTold → không lặp). Arc đang chiếm slot cũng đã nằm trong told.
  const told = b.surpriseArcsTold ?? [];
  const pool = [
    ...SURPRISES.filter((e) => e.unlock <= s.level).map((e) => ({ id: e.id, unlock: e.unlock })),
    ...SURPRISE_ARCS.filter((a) => a.unlock <= s.level && !told.includes(a.id)).map((a) => ({ id: a.id, unlock: a.unlock })),
  ];
  const pick = pool[Math.floor(simRng()() * pool.length)];
  if (!pick) return;
  // Trúng arc → mở arc (2–3 ngày) thay cho một-phát.
  const arcDef = surpriseArcById(pick.id);
  if (arcDef) {
    const opened: SurpriseArcState = {
      arcId: arcDef.id, step: 0, choices: [], startedDay: s.day, expiresDay: s.day + arcDef.days - 1,
    };
    patch({
      surprise: { id: arcDef.id, expiresAt: s.minutes + 45 },
      surpriseDay: s.day,
      surpriseArc: opened,
      surpriseArcsTold: [...told, arcDef.id],
    });
    s.notify(`📖 ${arcDef.icon} ${arcDef.title}`);
    return;
  }
  const ev = SURPRISES.find((e) => e.id === pick.id)!;
  patch({ surprise: { id: ev.id, expiresAt: s.minutes + 45 }, surpriseDay: s.day });
  s.notify(`${ev.icon} ${ev.title}`);
}

export function chooseSurprise(index: number) {
  const s = S();
  const active = s.biz.surprise;
  if (!active) return;
  // GĐ164: tra arc TRƯỚC rồi mới tới SURPRISES; cảnh arc resolve theo lựa chọn đã ghi.
  const view = findSurprise(active.id, s.biz.surpriseArc?.choices);
  const c = view?.choices[index];
  if (!view || !c) return;
  // Lựa chọn cần hàng kho mà kho không đủ: chặn (UI đã xám lựa chọn), surprise giữ nguyên.
  if (c.needStock && (s.storage[c.needStock.productId] ?? 0) < c.needStock.qty) {
    return s.notify(`Kho hết ${productById(c.needStock.productId).name} rồi`);
  }
  patch({ surprise: null });
  if (c.money) useGame.setState({ money: S().money + c.money, ...(c.money < 0 ? { stats: { ...S().stats, spent: S().stats.spent - c.money } } : {}) });
  if (c.minutes) useGame.setState({ minutes: S().minutes + c.minutes });
  if (c.xp) S().addXp(c.xp);
  if (c.rating) S().addReview(c.rating);
  if (c.friendship) S().adjustFriendship(c.friendship.id, c.friendship.delta);
  const friendNote = (() => {
    if (!c.friendship) return '';
    const name = REGULAR_NAMES[c.friendship.id];
    const sign = c.friendship.delta >= 0 ? '+' : '−';
    return `・💛 ${sign}${c.friendship.delta}${name ? ` ${name}` : ''}`;
  })();
  // GĐ164: nhánh arc — ghi lựa chọn, mở cảnh kế; cảnh cuối (hoặc nhánh khép sớm) thì done.
  if (view.kind === 'arc') {
    const { arc, scene } = view;
    const prev = S().biz.surpriseArc;
    if (!prev || prev.arcId !== arc.id) return;
    const choices = [...prev.choices, index];
    const nextIdx = scene.nextByChoice ? scene.nextByChoice[index] : undefined;
    const finished = nextIdx === undefined || nextIdx < 0; // hết cảnh hoặc "−1" = khép sớm
    let reward: ReturnType<typeof surpriseArcReward> | null = null;
    if (scene.reward) {
      const good = arcGoodCount(arc, { ...prev, choices });
      reward = surpriseArcReward(scene, good, s.level);
      if (reward.rating) S().addReview(reward.rating);
      if (reward.xp) S().addXp(reward.xp);
    }
    const nextArc: SurpriseArcState = { ...prev, choices, step: prev.step + 1, ...(finished || scene.reward ? { done: true } : {}) };
    patch({ surpriseArc: nextArc });
    if (reward) {
      if (reward.money) useGame.setState({ money: S().money + reward.money });
      s.notify(`📖 ${arc.title} khép lại · ${c.result} · +${formatMoney(reward.money)}${friendNote}`);
    } else {
      s.notify(`${view.icon} ${c.result}${c.money ? ` (${c.money > 0 ? '+' : ''}${formatMoney(c.money)})` : ''}${friendNote}`);
    }
    return;
  }
  s.notify(`${view.icon} ${c.result}${c.money ? ` (${c.money > 0 ? '+' : ''}${formatMoney(c.money)})` : ''}${friendNote}`);
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

/** Đầu tháng (ngày 1–2) thương lái bán lô hàng rẻ hơn mua lẻ: nhận lô nguyên tiền,
 *  thêm thẳng vào kho, mỗi tháng một lần (fairTaken). Là hàm độc lập như buyService
 *  (không nằm trên store → khỏi sửa coopGuard). */
export function acceptFairOffer() {  const s = S();
  if (!isFairOpen(s.day)) return s.notify('Hôm nay không có phiên chợ — đầu tháng (ngày 1–2) hẵng ghé');
  const offer = makeFairOffer(s.level, s.day);
  if (!offer) return s.notify('Hôm nay chưa có lô chợ phiên');
  if (s.biz.fairTaken === offer.month) return s.notify('Tháng này đã lấy lô chợ phiên rồi — tháng sau quay lại nhé');
  if (s.money < offer.dealPrice) return s.notify(`Không đủ tiền cho lô chợ phiên (cần ${formatMoney(offer.dealPrice)})`);
  const asStock = Object.fromEntries(offer.lines.map((l) => [l.id, l.qty]));
  if (storageUsed(s.storage, asStock) > storageCapacity(s.warehouseTier)) {
    return s.notify(`Nhà kho không đủ chỗ cho lô chợ phiên — cần thêm ${storageUsed(s.storage, asStock)} thùng mới đủ. Nâng cấp kho trước nhé!`);
  }
  const k = copyStock(s);
  for (const l of offer.lines) putStock(k, l.id, l.qty);
  useGame.setState({
    money: s.money - offer.dealPrice,
    ...k,
    stats: { ...s.stats, spent: s.stats.spent + offer.dealPrice },
    totals: { ...s.totals, spent: s.totals.spent + offer.dealPrice },
    biz: { ...s.biz, fairTaken: offer.month },
  });
  const ls = offer.lines.map((l) => `${productById(l.id).name}×${l.qty}`).join(', ');
  s.notify(`🛒 Đã nhận lô chợ phiên tháng ${offer.month}: ${ls} — tiết kiệm ${formatMoney(offer.totalBuy - offer.dealPrice)} so với mua lẻ`);
}

export function signHiepLuc() {
  const s = S();
  if (!hiepLucEligible(s.branch, s.biz.quanNuoc, s.level)) {
    return s.notify('Để lập đối tác hiệp lực cần mở CẢ chi nhánh 24/7 lẫn quán nước (cấp 29)');
  }
  const m = monthOf(s.day);
  if (s.biz.hiepLuc?.active) {
    return s.notify(s.biz.hiepLuc.m === m ? 'Tháng này đã lập đối tác rồi — cuối tháng xem kết quả' : 'Đối tác tháng trước vừa khép — đầu tháng mới lập lại nhé');
  }
  if (s.money < HIEPLUC_COC) return s.notify(`Không đủ tiền đặt cọc đối tác (cần ${formatMoney(HIEPLUC_COC)})`);
  useGame.setState({
    money: s.money - HIEPLUC_COC,
    stats: { ...s.stats, spent: s.stats.spent + HIEPLUC_COC },
    totals: { ...s.totals, spent: s.totals.spent + HIEPLUC_COC },
    biz: { ...s.biz, hiepLuc: { m, active: true, coc: HIEPLUC_COC }, hiepLucMonth: 0 },
  });
  s.notify(`🤝 Đã lập đối tác hiệp lực (cọc ${formatMoney(HIEPLUC_COC)}, hoàn cuối tháng): cả tháng này gom doanh thu chi nhánh + quán nước, đủ ${formatMoney(HIEPLUC_MIN)} được thưởng`);
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
export function bizEndOfDay(s: GameState, stats: DayStats, hiepLucRevenue = 0): { biz: BizState; money: number; news: string[]; poachedStaffId?: number } {
  const b: BizState = { ...s.biz, ads: activeAds(s.biz.ads, s.day + 1) };
  let poachedStaffId: number | undefined;
  const news: string[] = [];
  let money = 0;
  const day = s.day;

  // Đối thủ
  if (b.rival) {
    const oldStrength = b.rival.strength; // GĐ60: giữ sức mạnh cũ để tính delta xu hướng nhật ký
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
    let sale = simRng()() < 0.15 ? day + 1 + Math.floor(simRng()() * 2) : b.rival.saleUntil;
    // Bị đánh mà vẫn trụ: đối thủ có khi trả đũa bằng đợt giảm giá ngay ngày mai
    if (counterHit > 0 && strength > 0 && simRng()() < COUNTER_RETAILIATE) {
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
      b.lastRivalPers = b.rival.personality; // nhớ tính cách rival vừa đóng cửa để thế hệ sau không lặp
      b.rival = null;
      b.rivalTrend = []; // GĐ60: mỗi rival một "mùa/arc" — rival mới bắt đầu nhật ký sạch
      b.rivalsBeaten += 1;
      if (counterHit > 0) b.counterKills += 1;
      b.rivalNextDay = day + RIVAL_COOLDOWN;
    } else {
      if (sale !== b.rival.saleUntil && counterHit <= 0) news.push(`⚔️ ${b.rival.name} giảm giá xả hàng tới ngày ${sale}, khách bị hút bớt`);
      b.rival = { ...ai.rival, strength, saleUntil: sale };
      // GĐ60: ghi một mốc nhật ký đêm cho rival còn sống — delta = sức mạnh mới − cũ (âm = rival yếu đi).
      b.rivalTrend = [...(b.rivalTrend ?? []), { day: day + 1, strength, delta: strength - oldStrength }].slice(-RIVAL_TREND_DAYS);
    }
  } else if (b.counter) {
    b.counter = null; // đối thủ đóng cửa giữa chừng thì đợt phản công cũng kết thúc
  } else if (s.level >= RIVAL_UNLOCK && b.rivalsBeaten > 0 && day + 1 >= b.rivalNextDay && simRng()() < 0.25) {
    // "Rival đời mới": chọn cửa hàng theo thế hệ trong catalog 12 tên, bậc quy mô càng lúc càng lớn,
    // tính cách rút tránh lặp ngay thế hệ trước (lastRivalPers do nhánh đóng cửa ghi lại).
    const shop = RIVAL_SHOPS[b.rivalsBeaten % RIVAL_SHOPS.length];
    const tier = rivalTier(b.rivalsBeaten + 1);
    const fresh = { ...newRival(shop.name, Math.min(95, RIVAL_START + b.rivalsBeaten * 10), day + 1, simRng(), b.lastRivalPers), blurb: shop.blurb };
    b.rival = fresh;
    const pers = RIVAL_PERSONALITIES[fresh.personality!];
    news.push(`⚔️ ${tier.icon} ${shop.name} (bậc ${tier.label}) vừa khai trương ở đầu hẻm! Tính cách: ${pers.icon} ${pers.name} — ${pers.desc}. "${shop.blurb}" Giữ giá tốt, hàng đầy, khách vui để họ đóng cửa`);
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
    if (simRng()() < HUI_COLLAPSE) {
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
  // Món nhà làm bán hôm nay: đọc từ sổ bán theo món (như nhiệm vụ ngày)
  const cookedSoldDay = Object.entries(stats.byItem ?? {}).reduce((n, [id, l]) => n + (COOKED_PRODUCT_IDS.has(id) ? l.qty : 0), 0);
  b.week = {
    ...b.week, items,
    revenue: b.week.revenue + stats.revenue, profit: b.week.profit + stats.revenue - stats.spent - stats.wages - (stats.rent ?? 0),
    customers: b.week.customers + stats.customers, unhappy: b.week.unhappy + stats.unhappy,
    // Counter tuỳ chọn cho thử thách tuần: ngày nào có thì cộng
    cookedSold: (b.week.cookedSold ?? 0) + cookedSoldDay,
    cookOrders: (b.week.cookOrders ?? 0) + (stats.cookOrders ?? 0),
    onlineDone: (b.week.onlineDone ?? 0) + (stats.onlineDone ?? 0),
    farmHarvest: (b.week.farmHarvest ?? 0) + (stats.farmHarvest ?? 0),
    socialPosts: (b.week.socialPosts ?? 0) + (stats.socialPosts ?? 0),
    services: (b.week.services ?? 0) + (stats.services ?? 0),
    combos: (b.week.combos ?? 0) + (stats.combos ?? 0),
    fiveStars: (b.week.fiveStars ?? 0) + (stats.fiveStars ?? 0),
  };
  if (day - b.week.startDay + 1 >= WEEK_DAYS) {
    const report = closeWeek(b.week, day, s.level, b.weekStreak ?? 0);
    if (report.reward) money += report.reward;
    news.push(report.goalMet
      ? `📊 Tuần ${report.week}: đạt mục tiêu doanh thu! Thưởng ${formatMoney(report.reward)}`
      : `📊 Tuần ${report.week} kết thúc, xem báo cáo ở bảng Kinh doanh`);
    const ch = report.challenge;
    if (ch) {
      if (ch.met) {
        money += ch.reward;
        news.push(`🎯 Thử thách tuần: ${ch.title} xong! +${formatMoney(ch.reward)} (chuỗi ${report.challengeStreak ?? 1} tuần)`);
      } else {
        const fmtCh = (n: number) => (ch.unit === 'đ' ? formatMoney(n) : n.toLocaleString('vi-VN'));
        news.push(`🎯 Thử thách tuần ${ch.title} chưa xong (${fmtCh(ch.current)}/${fmtCh(ch.target)}) — tuần tới thử lại`);
      }
    }
    b.weekStreak = ch?.met ? (b.weekStreak ?? 0) + 1 : 0;
    b.lastWeek = report;
    b.week = emptyWeek(day + 1, report.nextGoal);
  }

  // Sổ tháng vận hành (dương lịch 1–12): cứ vài tuần một lần có mốc lớn — "quay lại trước hết tháng".
  // Save cũ thiếu b.month (chưa có GĐ20) thì tự khởi tạo từ ngày hiện tại.
  b.month = b.month ?? emptyMonth(day, monthOf(day));
  const m = monthOf(day);
  // GĐ74: tích lũy doanh thu chung 2 cơ sở (chi nhánh + quán nước) nếu đang đối tác tháng này.
  // (m === b.month.month: không tích lũy cho tháng cũ vào ngày sang tháng mới.)
  if (b.hiepLuc?.active && b.hiepLuc.m === b.month.month && m === b.month.month) {
    b.hiepLucMonth = (b.hiepLucMonth ?? 0) + hiepLucRevenue;
  }
  if (m !== b.month.month) {
    const closedMonth = b.month.month;
    const report = closeMonth(b.month, day - 1, s.level, b.monthStreak ?? 0);
    if (report.reward) money += report.reward;
    news.push(report.goalMet
      ? `📅 Hết tháng ${report.month}: đạt mục tiêu doanh thu! Thưởng ${formatMoney(report.reward)}`
      : `📅 Hết tháng ${report.month}, xem báo cáo ở bảng Kinh doanh (tab Tháng)`);
    const mch = report.challenge;
    if (mch) {
      if (mch.met) {
        money += mch.reward;
        news.push(`🎯 Thử thách tháng: ${mch.title} xong! +${formatMoney(mch.reward)} (chuỗi ${report.monthStreak ?? 1} tháng)`);
      } else {
        const fmtM = (n: number) => (mch.unit === 'đ' ? formatMoney(n) : n.toLocaleString('vi-VN'));
        news.push(`🎯 Thử thách tháng ${mch.title} chưa xong (${fmtM(mch.current)}/${fmtM(mch.target)}) — tháng tới thử lại`);
      }
    }
    b.monthStreak = mch?.met ? (b.monthStreak ?? 0) + 1 : 0;
    b.lastMonth = report;
    b.month = emptyMonth(day, m, report.nextGoal);
    // Mối quen lâu dài (GĐ67): cuối tháng hoàn tiền mua sỉ theo bậc mối quen nếu mối đạt cam kết tháng.
    // Phụ gia tách rời (không đổi unitCost/orderTotal) — money cộng qua biến `money` rồi `bizEndOfDay` trả về.
    if (b.supplierRelMonth && Object.keys(b.supplierRelMonth).length) {
      for (const [sid, spent] of Object.entries(b.supplierRelMonth)) {
        const life = b.supplierRel?.[sid]?.spent ?? 0;
        const rebate = monthlyRelRebate(life, spent);
        if (rebate > 0) {
          const sup = supplierById(sid);
          const lvl = relTier(life);
          money += rebate;
          news.push(`🤝 ${sup.name} (${lvl.icon} ${lvl.name}): hoàn ${formatMoney(rebate)} vì mua ${formatMoney(spent)} sỉ trong tháng`);
        }
      }
      b.supplierRelMonth = {};
    }
    // Sổ thương mến (GĐ69): cuối tháng quà tri ân cho bể khách quen (phía bán, soi gương GĐ67 bên mua).
    // Bể = tổng lượt khách quen đã phục vụ cả ván → bậc Tiệm quen/thân/ruột/vàng; quà = min(lượt tháng × rate, cap),
    // gated có ít nhất một mối ruột (friendship ≥ EMOTIONAL_FRIENDSHIP). Money cộng qua biến `money` (an toàn ledger).
    const closeFriends = Object.values(s.regulars ?? {}).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length;
    const trian = monthlyTriAn(lifetimeRegularVisits(s.regulars ?? {}), b.triAnMonth ?? 0, closeFriends);
    if (trian.amount > 0 && b.triAnPaidMonth !== m) {
      money += trian.amount;
      news.push(`💝 Sổ thương mến (${trian.tier.icon} ${trian.tier.name}): quà tri ân khách quen cuối tháng +${formatMoney(trian.amount)}`);
      b.triAnPaidMonth = m;
    }
    b.triAnMonth = 0;
    // Đối tác Hiệp lực (GĐ74): cuối tháng, nếu đang đối tác cho tháng vừa khép, gom doanh thu chung
    // 2 cơ sở (chi nhánh + quán nước) đã tích lũy trong tháng. Đủ ngưỡng → thưởng phụ gia (additive qua
    // biến `money`, ledger-stable) + chuỗi tháng; không đủ → chỉ hoàn cọc (không phạt tiền — ethos GĐ55).
    if (b.hiepLuc?.active && b.hiepLuc.m === closedMonth) {
      const combined = b.hiepLucMonth ?? 0;
      const bonus = hiepLucPayoff(combined, b.hiepLucStreak ?? 0);
      if (hiepLucBonus(combined) > 0) {
        money += bonus;
        b.hiepLucStreak = (b.hiepLucStreak ?? 0) + 1;
        news.push(`🤝 Đối tác chi nhánh × quán nước: gom ${formatMoney(combined)} cả tháng — thưởng hiệp lực +${formatMoney(bonus)} (chuỗi ${b.hiepLucStreak} tháng)`);
      } else {
        b.hiepLucStreak = 0;
        news.push(`🤝 Đối tác chi nhánh × quán nước gom ${formatMoney(combined)}/${formatMoney(HIEPLUC_MIN)} chưa đủ ngưỡng — không thưởng tháng này`);
      }
      // Hoàn cọc đối tác (không phạt).
      if (b.hiepLuc.coc > 0) {
        money += b.hiepLuc.coc;
        b.hiepLuc.coc = 0;
      }
      b.hiepLuc.active = false;
      b.hiepLuc.m = 0;
      b.hiepLucMonth = 0;
    }
  } else {
    const mitems = { ...b.month.items };
    for (const [id, l] of Object.entries(stats.byItem ?? {})) {
      const o = mitems[id] ?? { qty: 0, gross: 0 };
      mitems[id] = { qty: o.qty + l.qty, gross: o.gross + l.revenue - l.cost };
    }
    b.month = {
      ...b.month, items: mitems,
      revenue: b.month.revenue + stats.revenue, profit: b.month.profit + stats.revenue - stats.spent - stats.wages - (stats.rent ?? 0),
      customers: b.month.customers + stats.customers, unhappy: b.month.unhappy + stats.unhappy,
      cookedSold: (b.month.cookedSold ?? 0) + cookedSoldDay,
      cookOrders: (b.month.cookOrders ?? 0) + (stats.cookOrders ?? 0),
      onlineDone: (b.month.onlineDone ?? 0) + (stats.onlineDone ?? 0),
      farmHarvest: (b.month.farmHarvest ?? 0) + (stats.farmHarvest ?? 0),
      services: (b.month.services ?? 0) + (stats.services ?? 0),
      combos: (b.month.combos ?? 0) + (stats.combos ?? 0),
      fiveStars: (b.month.fiveStars ?? 0) + (stats.fiveStars ?? 0),
      socialPosts: (b.month.socialPosts ?? 0) + (stats.socialPosts ?? 0),
    };
  }

  // Sổ năm vận hành (GĐ82): khép một năm = 365 ngày → tổng kết + thưởng "chơi trọn một năm".
  // Đồng thời gom sao 4 mùa (sự kiện mùa GĐ75) về cùng một năm — sợi dây nối 4 mùa lại thành con số năm.
  // Save cũ thiếu b.year → tự khởi tạo từ ngày hiện tại (NO SAVE_VERSION, biz trong MERGE_DEEP).
  const yPrev = b.year ?? emptyYear(day, yearOf(day));
  const yy = yearOf(day);
  // Hết một mùa TRONG năm (ngày hôm trước thuộc mùa cũ): gom sao mùa vừa rồi vào năm, tránh đếm lại.
  if (b.year && yy === b.year.year && seasonOf(day - 1) !== seasonOf(day) && b.seasonEvt && seasonOf(day - 1) === b.seasonEvt.season) {
    b.year = { ...b.year, seasonStars: (b.year.seasonStars ?? 0) + (b.seasonEvt.stars ?? 0) };
    b.seasonEvt = { ...b.seasonEvt, stars: 0 };
  }
  if (yy !== yPrev.year) {
    // Hết năm: gom sao mùa đang chạy (thuộc năm vừa khép), khép năm, thưởng tròn năm, reset sang năm mới.
    if (b.seasonEvt && seasonOf(day - 1) === b.seasonEvt.season) {
      yPrev.seasonStars = (yPrev.seasonStars ?? 0) + (b.seasonEvt.stars ?? 0);
      b.seasonEvt = { ...b.seasonEvt, stars: 0 };
    }
    const report = closeYear(yPrev, day - 1, s.level);
    if (report.reward) money += report.reward;
    news.push(`📅 Tròn ${report.year} năm vận hành (${describeDate(day - 1)}): doanh thu ${formatMoney(report.revenue)} · ⭐ ${report.seasonStars} sao 4 mùa — thưởng tròn năm +${formatMoney(report.reward)}`);
    b.lastYear = report;
    b.year = emptyYear(day, yy);
  } else {
    b.year = {
      ...b.year,
      revenue: b.year.revenue + stats.revenue,
      profit: b.year.profit + stats.revenue - stats.spent - stats.wages - (stats.rent ?? 0),
      customers: b.year.customers + stats.customers,
      unhappy: b.year.unhappy + stats.unhappy,
    };
  }

  // Nếp vận hành (GĐ79): chạy mọi ngày — hôm nay "sạch" thì tăng chuỗi, không sạch thì đứt.
  // Chạm mốc chuỗi → thưởng additive một lần (theo cấp). Chỉ tính walkout do vận hành (chờ/hết hàng).
  const cleanMet = cleanDayMet({ customers: stats.customers, missed: stats.missed });
  if (cleanMet) {
    b.cleanStreak = (b.cleanStreak ?? 0) + 1;
    b.cleanBest = Math.max(b.cleanBest ?? 0, b.cleanStreak);
    for (const t of CLEAN_TIERS) {
      if (b.cleanStreak >= t.n && (b.cleanClaimed ?? 0) < t.n) {
        const bon = cleanBonus(t.n, s.level);
        money += bon;
        b.cleanClaimed = t.n;
        news.push(`${t.icon} Nếp vận hành: ${t.n} ngày sạch liên tiếp (${t.name}) — không khách nào bỏ vì chờ/hết hàng · +${formatMoney(bon)}`);
      }
    }
  } else {
    b.cleanStreak = 0;
  }

  // Câu chuyện khách quen (GĐ80): đợt nhờ vả xong đủ bước → trả thưởng additive cuối ngày;
  // hết hạn chưa xong thì khép nhẹ (không phạt — ethos GĐ55). Mỗi đợt chỉ trả một lần (done).
  const arcs = { ...(b.regularArcs ?? {}) };
  let arcChanged = false;
  for (const rid of Object.keys(arcs)) {
    const st = arcs[rid];
    if (st.done) continue;
    const arc = arcById(st.arcId);
    if (!arc) { delete arcs[rid]; arcChanged = true; continue; }
    if (st.waitingReward) {
      const bon = arcReward(arc, s.level);
      money += bon;
      arcs[rid] = { ...st, waitingReward: false, done: true, step: arc.steps.length };
      news.push(`📖 ${REGULAR_NAMES[arc.regularId]} xong "${arc.title}" · +${formatMoney(bon)}`);
      arcChanged = true;
    } else if (st.expiresDay < day) {
      arcs[rid] = { ...st, done: true };
      news.push(`📖 Đợt nhờ "${arc.title}" hết hạn — không sao, lần sau ghé lại nhé.`);
      arcChanged = true;
    }
  }
  if (arcChanged) b.regularArcs = arcs;

  // Ngày hoàn hảo, thú cưng đói
  if (stats.customers >= 20 && stats.unhappy === 0) b.perfectDays += 1;
  for (const p of PETS) if (b.pets[p.kind] && !petActive(b.pets[p.kind], day + 1)) news.push(`${p.icon} ${p.name} đói rồi, nhớ cho ăn`);

  // Đón lễ (GĐ70): mai bắt đầu một dịp lễ — nếu đã trữ sẵn đủ hàng bán trong dịp thì thưởng đón lễ một lần
  // (theo cấp + độ lớn dịp). Chạy mọi ngày (không gói theo mốc tháng) vì dịp lễ không trùng mốc tháng.
  const soon = upcomingFestival(day, 1);
  if (soon && b.prepClaimed !== day + 1) {
    const { ready } = prepReadiness(s.storage, soon.festival, s.level);
    if (ready) {
      const bon = prepBonus(soon.festival, s.level);
      money += bon;
      news.push(`🎊 Đón ${soon.festival.name} ngày mai: trữ sẵn đủ hàng — thưởng đón lễ +${formatMoney(bon)}`);
      b.prepClaimed = day + 1;
    }
  }

  // Sự kiện thử thách theo mùa (GĐ75): trong cửa sổ 5 ngày của mùa → có mục tiêu ngày. Hoàn → +1 sao
  // + thưởng nhỏ (additive qua `money`, ledger-stable). Sang mùa mới thì reset state gom sao.
  const se = seasonEvent(day);
  if (se) {
    if (!b.seasonEvt || b.seasonEvt.season !== se.season) b.seasonEvt = { season: se.season as SeasonKey, stars: 0 };
    const obj = seasonObjective(s.weatherSeed ?? 0, day);
    if (obj && obj.measure(stats) && b.seasonEvt.claimedDay !== se.dayIndex) {
      b.seasonEvt.stars += 1;
      b.seasonEvt.claimedDay = se.dayIndex;
      money += SEASON_REWARD_PER_STAR;
      news.push(`${obj.icon} ${seasonEventName(se.season)} (ngày ${se.dayIndex + 1}/5): "${obj.title}" xong — +${formatMoney(SEASON_REWARD_PER_STAR)}, ${b.seasonEvt.stars} sao mùa`);
      // Sổ Mùa (GĐ83): gom sao dài hạn theo MỌI mùa MỌI năm (không reset khi sang năm như `year.seasonStars`).
      b.seasonAlmanac = { ...(b.seasonAlmanac ?? {}), [se.season]: (b.seasonAlmanac?.[se.season] ?? 0) + 1 };
      const total = Object.values(b.seasonAlmanac).reduce((a, n) => a + (n ?? 0), 0);
      const claimed = b.almanacClaimed ?? [];
      for (const at of newlyReachedAlmanac(total, claimed)) {
        const bon = almanacMilestoneReward(at, s.level);
        money += bon;
        b.almanacClaimed = [...(b.almanacClaimed ?? []), at];
        news.push(`📖 Sổ Mùa: chạm ${at} sao mọi mùa — thưởng +${formatMoney(bon)}`);
      }
    }
  } else if (b.seasonEvt) {
    // Hết sự kiện mùa — giữ seasonEvt để UI tóm tắt, sang mùa mới sẽ reset.
    // (Không reset ở đây để không mất thông tin "mùa vừa gom N sao" kiểu danh dự.)
  }

  return { biz: b, money, news, poachedStaffId };
}
export const REGULAR_NAMES = Object.fromEntries(REGULARS.map((r) => [r.id, r.name]));
