import * as THREE from 'three';
import { MINUTES_PER_SECOND, useGame, type CartItem } from '../core/store';
import { furnitureDef } from '../data/furniture';
import { customersPerDay, FEATURES } from '../data/levels';
import { formatMoney, productById, unlockedProducts } from '../data/products';
import { trending } from '../data/suppliers';
import { skyAt } from '../data/weather';
import { tierMarkdown } from '../data/freshness';
import { demandPriceFactor, keepChance } from '../data/pricing';
import { dayEffects } from '../data/calendar';
import { timeBandAt } from '../data/rhythm';
import { hasSkill } from '../data/titles';
import { RISK_RULES } from '../data/risks';
import { COMBO_PULL, comboDiscount, comboPartners } from '../data/combos';
import { bulkExtra, festivalVisit, perkValue, pickRegular, referFriends, unlockedFavorites, type RegularDef } from '../data/regulars';
import { pickProfession, PROFESSIONS, type ProfessionDef } from '../data/professions';
import { CREDIT_UNLOCK, repaysToday, wantsCredit } from '../data/credit';
import { ASK_MINUTES, CANDY_ANNOY, CHANGE_CHANCE, CHANGE_UNLOCK, CREDIT_REFUSE_FRIEND_LOSS, HAGGLE_CHANCE, HAGGLE_MIN_TOTAL, HAGGLE_REFUSE_OK, HAGGLE_UNLOCK, haggleOff, oddChange } from '../data/counterDeals';
import { askAtCounter, askPending, clearAsk, expireAsk } from '../core/counterAsk';
import { VENDOR_CHANCE, VENDOR_FROM, VENDOR_UNTIL, WHOLESALE_UNLOCK } from '../data/wholesale';
import { DIRT_PER_VISIT, dirtVisitFactor, GUARD_DETECT } from '../data/staff';
import { adTargets, bizTraffic, LOYALTY_UNLOCK, loyaltyRedeemChance, petActive } from '../data/biz';
import { redeemLoyalty, storyOnVisit, theftFactor } from '../core/biz';

/** Tỉ lệ món khách chọn trong số hàng đang giảm giá (nếu có). */
const SALE_HUNT = 0.2;
import { REVIEW_CHANCE, reputationBonus, type ReviewReason } from '../data/reviews';
import { createCart } from '../shop/furnitureView';
import type { Counter, GroceryShop } from '../shop/groceryShop';
import type { NavGrid } from '../world/navGrid';
import { Walker } from './walker';

const SIDEWALK_Z = 2.2;
const EDGE_X = 38;
/** Khách chờ ở quầy tối đa bao nhiêu phút game. */
const PATIENCE_MINUTES = 45;
const OPEN_FROM = 6 * 60;
const OPEN_UNTIL = 22 * 60;
/** Tỉ lệ khách muốn mua món đang có trên kệ (còn lại là món ngẫu nhiên, có thể tiệm không bán). */
const WANTS_STOCKED = 0.8;

type State = 'walkBy' | 'toShop' | 'shopping' | 'toQueue' | 'queued' | 'leaving';

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Chuyện ở quầy đã chốt: choice là phương án được chọn (0 = phương án đầu). */
interface Deal { kind: 'none' | 'credit' | 'haggle' | 'change'; amount: number; choice: number }

class Customer extends Walker {
  state: State = 'walkBy';
  wants: string[] = [];
  basket: CartItem[] = [];
  missing = 0;
  /** Món không mua được và lý do, để khách nhận xét. */
  missed: { id: string; why: ReviewReason }[] = [];
  waitedMinutes = 0;
  exitX: number;
  /** Quầy đang xếp hàng. */
  counterKey: string | null = null;
  /** Khách quen (null = khách vãng lai). */
  regular: RegularDef | null;
  patience: number;
  /** Nhân với độ nhạy giá của món. */
  sensitivity: number;
  /** Kẻ trộm: lấy hàng rồi đi thẳng ra cửa, không xếp hàng trả tiền. */
  thief = false;

  /** Nghề của khách vãng lai (null = dân thường hoặc khách quen). */
  profession: ProfessionDef | null;
  /** Người bán rong ghé lấy sỉ: tới quầy đưa đề nghị rồi chờ chủ tiệm trả lời. */
  wholesale = false;
  /** Đã đưa đề nghị lấy sỉ, đang đứng chờ. */
  offered = false;
  /** Chuyện ở quầy lúc tính tiền (xin ghi sổ, mặc cả, thiếu lẻ): 'waiting' = đang chờ chủ tiệm chọn. */
  deal?: Deal | 'waiting';

  constructor(startX: number, regular: RegularDef | null = null, profession: ProfessionDef | null = null) {
    const look = regular?.look;
    super(
      regular ? regular.color : new THREE.Color().setHSL(Math.random(), 0.5, 0.5),
      look?.hat ? regular!.hatColor : undefined,
      'customer',
      look?.archetype ?? profession?.archetype,
      look && { topColor: regular!.color, hairStyle: look.hairStyle, hairColor: look.hair, props: look.props, hasGlasses: look.glasses },
    );
    this.regular = regular;
    this.profession = profession;
    this.patience = regular?.patienceMinutes ?? PATIENCE_MINUTES * (profession?.patience ?? 1);
    this.sensitivity = regular?.priceSensitivity ?? profession?.sensitivity ?? 1;
    this.exitX = -startX;
    this.mesh.position.set(startX, 0, SIDEWALK_Z + (Math.random() - 0.5) * 1.2);
  }

  pushCart() {
    const cart = createCart();
    cart.position.z = 0.55;
    this.mesh.add(cart);
  }
}

/** Sinh khách đi ngang, quyết định vào tiệm, mua hàng, xếp hàng ở quầy ngắn nhất và trả tiền. */
export class CustomerManager {
  customers: Customer[] = [];
  queues = new Map<string, Customer[]>();
  private spawnIn = 0;
  /** Khách quen đã ghé hôm nay (mỗi người một lần mỗi ngày). */
  private regularsToday: string[] = [];
  /** Khách quen rủ bạn đi cùng: số khách lẻ được kéo thêm còn chờ vào tiệm. */
  private friendsBurst = 0;
  /** Hôm nay có khách quen mở perk "ngày hội": cả khu đông khách hơn. */
  private festivalToday = false;
  /** Phút người bán rong định ghé hôm nay (null = hôm nay không ghé); tính một lần mỗi ngày. */
  private vendorAt: number | null | undefined;
  private checkoutProgress = new Map<string, number>();
  private cashierSpeed: (counter: Counter) => number = () => 0;
  /** Có bảo vệ đang trực cửa không (StaffManager gán). */
  guardOnDuty: () => boolean = () => false;
  /** Người chơi đang đứng quầy này (mới hỏi ý; nhân viên đứng quầy thì tự chọn mặc định). */
  playerAtCounter: (counter: Counter) => boolean = () => false;

  constructor(private scene: THREE.Scene, private grid: NavGrid, private shop: GroceryShop) {}

  /**
   * @param gameDt giây đã nhân tốc độ game
   * @param cashierSpeed tốc độ tính tiền ở một quầy (1 = người chơi); 0 = không ai đứng quầy đó
   */
  update(gameDt: number, cashierSpeed: (counter: Counter) => number) {
    const s = useGame.getState();
    const gameMinutes = gameDt * MINUTES_PER_SECOND;
    this.cashierSpeed = cashierSpeed;
    expireAsk(s.minutes);
    const counters = this.shop.counters();
    this.rehomeQueues(counters);

    // Ban ngày người đi đường nhiều hơn
    const daytime = s.minutes >= OPEN_FROM && s.minutes < OPEN_UNTIL;
    this.spawnIn -= gameMinutes;
    if (this.spawnIn <= 0) {
      // Khách quen rủ bạn đi cùng: ngay khi có suất sinh, ưu tiên cho bạn vào tiệm
      if (this.friendsBurst > 0 && daytime && s.shopOpen) {
        this.friendsBurst--;
        this.spawn(true);
      } else {
        const perDay = customersPerDay(s.level) * 2; // một nửa chỉ đi ngang qua
        // Giờ cao điểm, ngày lễ, sửa đường, ngày hội của khách quen nữa
        const festival = this.festivalToday ? 1.35 : 1;
        const eventTraffic = s.event?.traffic ?? 1;
        const rush = (timeBandAt(s.minutes)?.traffic ?? 1) * dayEffects(s.weatherSeed, s.day, s.level).traffic
          * (hasSkill(s.skills, 'local_legend') ? 1.1 : 1) * festival * eventTraffic;
        this.spawnIn = (daytime ? (OPEN_UNTIL - OPEN_FROM) / perDay / rush : 60) * (0.5 + Math.random());
        // Mỗi chậu cây +5% khách ghé, tối đa +25%
        const plants = s.furniture.filter((f) => f.type === 'plant').length;
        // Đang mưa thì ít người ra đường, tạnh mưa lại đông như thường
        const traffic = skyAt(s.weatherSeed, s.day, s.weather, s.minutes).traffic * festival * eventTraffic;
        // Bày hàng rẻ hơn giá gợi ý thì tiếng lành đồn xa, thêm người ghé; sàn bẩn thì ngại vào
        const visit = (0.5 + Math.min(plants * 0.05, 0.25) + reputationBonus(s.reviews)) * traffic * this.priceAppeal() * dirtVisitFactor(s.dirt)
          * bizTraffic(s.biz, s.day);
        const open = daytime && s.shopOpen;
        // Khách quen tới đúng giờ quen, không phụ thuộc người đi đường
        const regular = open ? pickRegular(s.day, s.minutes, s.weatherSeed, s.level, s.regulars, this.regularsToday) : undefined;
        if (regular) {
          this.regularsToday.push(regular.id);
          if (festivalVisit(regular, s.regulars[regular.id])) this.festivalToday = true;
          this.spawn(true, regular);
        } else this.spawn(open && Math.random() < visit);
      }
    }

    // Người bán rong: sáng sớm ghé lấy sỉ, mỗi ngày tối đa một người
    if (this.vendorAt === undefined) {
      this.vendorAt = s.level >= WHOLESALE_UNLOCK && Math.random() < VENDOR_CHANCE
        ? VENDOR_FROM + Math.random() * (VENDOR_UNTIL - VENDOR_FROM - 20)
        : null;
    }
    if (this.vendorAt !== null && s.minutes >= this.vendorAt && s.shopOpen && s.vendorDay !== s.day && s.minutes < VENDOR_UNTIL) {
      this.vendorAt = null;
      this.spawnVendor();
    }

    for (const c of this.customers) {
      c.step(gameDt);
      // Người bán rong đứng chờ: chủ tiệm đã trả lời (hoặc họ hết kiên nhẫn) thì đi
      if (c.wholesale && c.offered && c.state === 'shopping' && !useGame.getState().vendorOffer) {
        c.say('👋', 2);
        this.vendorLeave(c);
      }
      if (c.state === 'queued') {
        c.waitedMinutes += gameMinutes;
        if (c.waitedMinutes > c.patience) {
          c.say('😠');
          s.noteMiss('wait');
          this.leave(c, false);
        }
      }
    }

    for (const counter of counters) this.updateCheckout(counter, gameDt, cashierSpeed(counter));

    // Xoá khách đã đi khỏi bản đồ
    this.customers = this.customers.filter((c) => {
      const gone = c.state !== 'queued' && !(c.wholesale && c.offered) && c.idle;
      if (gone) this.scene.remove(c.mesh);
      return !gone;
    });

    const waiting = [...this.queues.values()].reduce((sum, q) => sum + q.length, 0);
    if (s.waiting !== waiting) useGame.setState({ waiting });
  }

  /** Trung bình hệ số giá rẻ của các món đang bày (1 = giá gợi ý hoặc đắt hơn). */
  private priceAppeal() {
    const s = useGame.getState();
    const ids = [...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!)))];
    if (!ids.length) return 1;
    return ids.reduce((n, id) => n + demandPriceFactor(id, s.priceOf(id)), 0) / ids.length;
  }

  /** Khách quen: chủ yếu mua món ưa thích, perk "mua thêm" cộng món, perk "mua lô" nhân số lượng. */
  private regularWants(def: RegularDef) {
    const s = useGame.getState();
    const favs = unlockedFavorites(def, s.level);
    const count = 1 + Math.floor(Math.random() * 2) + perkValue(def, s.regulars[def.id], 'extra_item');
    const bulk = bulkExtra(def, s.regulars[def.id]); // mua thêm theo lô
    const items = Array.from({ length: count }, (_, i) => (i === 0 || Math.random() < 0.75 ? pick(favs) : this.chooseWants(1)[0]));
    // Mua lô: nhân bản món khoái (loại hàng thật), khách ưa thích mua càng nhiều đơn vị.
    return items.flatMap((id) => {
      const copies = favs.includes(id) && bulk > 0 ? 1 + bulk : 1;
      return Array.from({ length: copies }, () => id);
    });
  }

  /** Khách theo nghề: phần lớn mua đồ nghề mình hay dùng, còn lại như khách thường. */
  private professionWants(def: ProfessionDef, count: number) {
    const level = useGame.getState().level;
    const likes = def.likes.filter((id) => productById(id)?.unlock <= level);
    if (!likes.length) return this.chooseWants(count);
    return Array.from({ length: count }, () => (Math.random() < def.loyalty ? pick(likes) : this.chooseWants(1)[0]));
  }

  /** Món khách muốn mua: phần lớn là hàng đang bày, đôi khi là món tiệm chưa có. */
  private chooseWants(count: number) {
    const s = useGame.getState();
    const all = unlockedProducts(s.level).map((p) => p.id);
    const stocked = [
      ...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!))),
    ];
    // Hàng hot tuần này: khách hay hỏi mua hơn hẳn
    const hot = trending(s.day, s.level);
    // Món của mùa lễ / đang nổi, và món hợp khung giờ (sáng sữa bánh mì, tối rau thịt)
    const unlocked = (id: string) => productById(id).unlock <= s.level;
    const effects = dayEffects(s.weatherSeed, s.day, s.level);
    const seasonal = effects.hot;
    const timely = (timeBandAt(s.minutes)?.wants ?? []).filter(unlocked);
    // Trời mưa/giông: khách hay ghé mua áo mưa, ô, nước, đồ tránh rét khẩn cấp
    const rainy = (s.weather === 'rain' || s.weather === 'storm') ? ['aomua', 'o', 'nuoc'].filter(unlocked) : [];
    // Hàng cận hạn đang giảm giá: có khách chuyên săn đồ giảm
    const onSale = [
      ...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => tierMarkdown(t.productId, t.lots, t.count) > 0).map((t) => t.productId!))),
    ];
    return Array.from({ length: count }, () => {
      if (onSale.length && Math.random() < SALE_HUNT) return pick(onSale);
      if (rainy.length && Math.random() < 0.3) return pick(rainy);
      if (seasonal.length && Math.random() < effects.pull) return pick(seasonal);
      if (timely.length && Math.random() < 0.2) return pick(timely);
      if (Math.random() < 0.15) return pick(hot);
      return stocked.length && Math.random() < WANTS_STOCKED ? pick(stocked) : pick(all);
    });
  }

  private spawn(visit: boolean, regular?: RegularDef) {
    const startX = Math.random() < 0.5 ? -EDGE_X : EDGE_X;
    const st0 = useGame.getState();
    const c = new Customer(startX, regular, regular ? null : pickProfession(st0.minutes, adTargets(st0.biz.ads, st0.day)));
    this.customers.push(c);
    this.scene.add(c.mesh);

    if (!visit) {
      c.path = [new THREE.Vector3(c.exitX, 0, c.position.z)];
      return;
    }

    const s = useGame.getState();
    const station = s.furniture.find((f) => f.type === 'cartStation');
    const withCart = !!station && Math.random() < 0.5;
    const maxItems = s.level >= FEATURES.basket ? 4 : 3;
    const count = (withCart ? 3 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * maxItems))
      + (hasSkill(s.skills, 'big_basket') && Math.random() < 0.5 ? 1 : 0);
    if (hasSkill(s.skills, 'charm')) c.sensitivity *= 0.85;
    c.thief = !regular && s.level >= RISK_RULES.theft.unlock && Math.random() < RISK_RULES.theft.chance * theftFactor(s.biz, s.day);
    // Có mèo ở quầy: khách nhỏ (học sinh, mẹ bỉm) vui hơn, đỡ sốt ruột
    if (petActive(s.biz.pets.cat, s.day) && c.profession && ['student_highschool', 'student_college', 'mom'].includes(c.profession.id)) c.patience *= 1.3;
    c.wants = regular
      ? this.regularWants(regular)
      : c.profession
        ? this.professionWants(c.profession, Math.max(1, count + c.profession.extraItems))
        : this.chooseWants(count);
    c.state = 'toShop';
    c.path = this.pathTo(c.position, this.shop.doorOutside);
    c.plan.push(() => {
      useGame.getState().addDirt(DIRT_PER_VISIT);
      if (regular) c.say('👋', 3);
      else if (c.profession) c.say(c.profession.icon, 2.5);
      this.walk(c, this.shop.doorInside);
    });
    if (station && withCart) {
      c.plan.push(() => this.walk(c, this.shop.spotFor(station)));
      c.plan.push(() => {
        c.pause = 0.8;
        c.pushCart();
      });
    }
    for (const want of c.wants) {
      let shelfUid: number | undefined;
      c.plan.push(() => {
        c.state = 'shopping';
        const shelf = this.shelfWith(want);
        shelfUid = shelf?.uid;
        if (shelf) this.walk(c, this.shop.spotFor(shelf, (Math.random() - 0.5) * 0.8));
      });
      c.plan.push(() => {
        c.pause = 1.5;
        const st = useGame.getState();
        st.noteDemand(want);
        // Giá càng cao so với giá gợi ý thì khách càng ngại mua; món thiết yếu ít bị ảnh hưởng hơn, hàng của mùa lễ cũng vậy
        const tolerance = dayEffects(st.weatherSeed, st.day, st.level).tolerance(want);
        if (Math.random() > keepChance(want, st.priceOf(want), c.sensitivity * tolerance)) {
          c.missing++;
          c.missed.push({ id: want, why: 'price' });
          st.noteMiss('price', want);
          c.say('💸');
          return;
        }
        const price = st.takeFromShelf(want, shelfUid);
        if (price !== null) {
          c.basket.push({ id: want, price });
          this.pullCombo(c, want);
        } else {
          c.missing++;
          c.missed.push({ id: want, why: 'stock' });
          st.noteMiss('stock', want);
          c.say('❓');
        }
      });
    }
    c.plan.push(() => {
      if (!c.basket.length) {
        c.say('😞');
        this.leave(c, false);
        return;
      }
      if (c.thief) return this.sneakOut(c);
      this.joinQueue(c, this.shop.counters());
    });
  }

  /** Xếp vào quầy có hàng ngắn nhất; quầy không có người tính tiền bị tính như dài thêm 3 người. */
  private joinQueue(c: Customer, counters: Counter[]) {
    const score = (ct: Counter) =>
      (this.queues.get(ct.key)?.length ?? 0) + (this.cashierSpeed(ct) > 0 ? 0 : 3) + (ct.key === 'main' ? -0.1 : 0);
    const best = counters.reduce((a, b) => (score(b) < score(a) ? b : a));
    const queue = this.queues.get(best.key) ?? [];
    this.queues.set(best.key, queue);
    queue.push(c);
    c.counterKey = best.key;
    c.state = 'toQueue';
    this.walk(c, this.shop.queueSpot(best, queue.length - 1));
    c.plan = [() => (c.state = 'queued')];
  }

  /** Quầy phụ bị dời/bán: khách đang chờ ở đó chuyển sang quầy khác. */
  private rehomeQueues(counters: Counter[]) {
    const keys = new Set(counters.map((ct) => ct.key));
    for (const [key, queue] of this.queues) {
      if (keys.has(key)) continue;
      this.queues.delete(key);
      for (const c of queue) this.joinQueue(c, counters);
    }
  }

  private updateCheckout(counter: Counter, gameDt: number, speed: number) {
    const queue = this.queues.get(counter.key) ?? [];
    const first = queue[0];
    if (!first || first.state !== 'queued' || speed <= 0) {
      this.checkoutProgress.set(counter.key, 0);
      return;
    }
    const progress = (this.checkoutProgress.get(counter.key) ?? 0) + gameDt * speed;
    this.checkoutProgress.set(counter.key, progress);
    if (progress < 1 + first.basket.length * 0.5) return;
    // Khách xin ghi sổ / mặc cả / thiếu lẻ: đứng chờ chủ tiệm chọn rồi mới tính tiền xong
    if (this.counterDeal(first, counter) === 'waiting') return;
    const deal = first.deal as Deal;

    this.checkoutProgress.set(counter.key, 0);
    this.checkCash(first.basket);
    const combo = comboDiscount(useGame.getState().activeCombos, first.basket);
    if (combo.count) first.say('🎁');
    // Thẻ tích điểm: khách đủ tem được tặng món rẻ nhất trong giỏ
    const lp = useGame.getState();
    if (lp.level >= LOYALTY_UNLOCK && Math.random() < loyaltyRedeemChance(lp.biz.loyalty)) {
      combo.discount += redeemLoyalty(first.basket.map((it) => it.price));
      first.say('🎫', 2);
    }
    const st = useGame.getState();
    const total = first.basket.reduce((n, it) => n + it.price, 0) - combo.discount;
    // Khách quen đủ thân đôi khi quên ví, xin ghi sổ; lần ghé sau trả nợ cũ
    const reg = first.regular;
    if (reg && repaysToday(st.debts[reg.id], st.day, Math.random())) {
      st.collectDebt(reg.id);
      first.say('💵', 2);
    }
    let happy = true;
    if (deal.kind === 'credit' && deal.choice === 1) {
      st.adjustFriendship(reg!.id, -CREDIT_REFUSE_FRIEND_LOSS);
      st.notify(`😔 ${reg!.name}: "Thôi để chạy về nhà lấy tiền vậy..."`);
    }
    if ((deal.kind === 'haggle' || deal.kind === 'change') && deal.choice === 0) {
      combo.discount += Math.min(deal.amount, total);
      first.say('🤝', 2);
    }
    if (deal.kind === 'haggle' && deal.choice === 1 && Math.random() >= HAGGLE_REFUSE_OK) happy = false;
    if (deal.kind === 'change' && deal.choice === 1) {
      first.say('🍬', 2);
      if (Math.random() < CANDY_ANNOY) happy = false;
    }
    const onCredit = deal.kind === 'credit' && deal.choice === 0;
    if (onCredit) st.checkoutOnCredit(reg!.id, first.basket, combo.discount, combo.count);
    else st.checkout(first.basket, combo.discount, combo.count);
    if (first.regular) {
      useGame.getState().regularVisit(first.regular.id, first.basket, true);
      storyOnVisit(first.regular.id);
      // Khách quen có perk giới thiệu bạn bè: rủ thêm khách lẻ vào tiệm
      const friends = referFriends(first.regular, useGame.getState().regulars[first.regular.id]);
      if (friends > 0) this.friendsBurst += friends;
    }
    // Khách quen đã trả tiền rồi thì không tính là bỏ về, chỉ hơi phật ý
    if (!happy && first.regular) {
      useGame.getState().adjustFriendship(first.regular.id, -1);
      happy = true;
    }
    first.say(!happy ? '😒' : onCredit ? '📒' : first.regular ? '💛' : first.missing ? '🙂' : '😊');
    this.leave(first, happy);
  }

  /** Quyết định chuyện ở quầy một lần cho mỗi khách; người chơi đứng quầy thì hỏi, không thì tự chọn mặc định. */
  private counterDeal(c: Customer, counter: Counter): Deal | 'waiting' {
    if (c.deal) return c.deal;
    const st = useGame.getState();
    const total = c.basket.reduce((n, it) => n + it.price, 0);
    const reg = c.regular;
    let ask: { kind: Deal['kind']; amount: number; icon: string; who: string; text: string; options: string[]; fallback: number } | null = null;
    if (reg && st.allowCredit && st.level >= CREDIT_UNLOCK && !st.debts[reg.id]?.reminded
      && wantsCredit(reg, st.regulars[reg.id], st.debts[reg.id], total, Math.random())) {
      const owed = st.debts[reg.id]?.amount ?? 0;
      ask = {
        kind: 'credit', amount: total, icon: '📒', who: reg.name,
        text: `quên ví, xin ghi sổ ${formatMoney(total)}${owed ? ` (đang nợ ${formatMoney(owed)})` : ''}`,
        options: ['📒 Cho ghi sổ', 'Không cho nợ'], fallback: 0,
      };
    } else if (!reg && st.level >= HAGGLE_UNLOCK && total >= HAGGLE_MIN_TOTAL && Math.random() < HAGGLE_CHANCE) {
      const off = haggleOff(total);
      ask = {
        kind: 'haggle', amount: off, icon: '🗣️', who: c.profession?.name ?? 'Khách',
        text: `mặc cả: "${formatMoney(total)} hả? Bớt ${formatMoney(off)} đi cô/chú!"`,
        options: [`🤝 Bớt ${formatMoney(off)}`, 'Giá đúng rồi'], fallback: 1,
      };
    } else if (st.level >= CHANGE_UNLOCK && oddChange(total) && Math.random() < CHANGE_CHANCE) {
      const odd = oddChange(total);
      ask = {
        kind: 'change', amount: total % 5000, icon: '🪙', who: reg?.name ?? 'Khách',
        text: `đưa tờ chẵn, két thiếu ${formatMoney(odd)} tiền lẻ để thối`,
        options: [`Bớt luôn ${formatMoney(total % 5000)} cho tròn`, '🍬 Thối bằng kẹo'], fallback: 0,
      };
    }
    if (!ask) return (c.deal = { kind: 'none', amount: 0, choice: 0 });
    const { kind, amount } = ask;
    if (!this.playerAtCounter(counter) || askPending()) return (c.deal = { kind, amount, choice: ask.fallback });
    c.deal = 'waiting';
    c.say(ask.icon, 3);
    askAtCounter({
      icon: ask.icon, who: ask.who, text: ask.text, options: ask.options, fallback: ask.fallback,
      expiresAt: st.minutes + ASK_MINUTES,
      resolve: (choice) => { c.deal = { kind, amount, choice }; },
    });
    return 'waiting';
  }

  /**
   * Thấy biển combo: vừa lấy một món thì có thể lấy thêm món đi kèm (nếu chưa định mua), bằng cách chen
   * hai bước "tới kệ món kia, lấy món" vào đầu kế hoạch còn lại.
   */
  private pullCombo(c: Customer, taken: string) {
    const st = useGame.getState();
    const partner = comboPartners(st.activeCombos, taken).find((id) => !c.wants.includes(id) && st.furniture.some((f) => !f.broken && f.tiers.some((t) => t.productId === id && t.count > 0)));
    if (!partner || Math.random() >= COMBO_PULL) return;
    c.wants.push(partner);
    let shelfUid: number | undefined;
    c.plan.unshift(
      () => {
        const shelf = this.shelfWith(partner);
        shelfUid = shelf?.uid;
        if (shelf) this.walk(c, this.shop.spotFor(shelf, (Math.random() - 0.5) * 0.8));
      },
      () => {
        c.pause = 1.2;
        const price = useGame.getState().takeFromShelf(partner, shelfUid);
        if (price !== null) c.basket.push({ id: partner, price });
      },
    );
  }

  /** Kẻ trộm đi thẳng ra cửa; có người đứng quầy thì dễ bị bắt hơn. */
  private sneakOut(c: Customer) {
    const st = useGame.getState();
    const r = RISK_RULES.theft;
    const staffed = this.shop.counters().some((ct) => this.cashierSpeed(ct) > 0);
    const dog = petActive(st.biz.pets.dog, st.day) ? 0.25 : 0;
    const chance = dog + (this.guardOnDuty()
      ? GUARD_DETECT
      : (staffed ? r.detectCashier : r.detectNobody) + (hasSkill(st.skills, 'sharp_eye') ? r.sharpEyeBonus : 0));
    const value = c.basket.reduce((n, it) => n + it.price, 0);
    const caught = Math.random() < chance;
    st.recordTheft(value, caught);
    c.say(caught ? '🚨' : '🦹');
    c.basket = [];
    c.state = 'leaving';
    c.plan = [() => this.walk(c, this.shop.doorOutside), () => this.walk(c, new THREE.Vector3(c.exitX, 0, SIDEWALK_Z))];
    this.walk(c, this.shop.doorInside);
  }

  /** Thỉnh thoảng khách trả bằng tiền giả. */
  private checkCash(basket: CartItem[]) {
    const st = useGame.getState();
    const r = RISK_RULES.counterfeit;
    const total = basket.reduce((n, it) => n + it.price, 0);
    if (st.level < r.unlock || total < r.notes[0] || Math.random() >= r.chance) return;
    const notes = r.notes.filter((n) => n <= total);
    const note = notes[Math.floor(Math.random() * notes.length)];
    st.recordCounterfeit(note, Math.random() < r.detect + (hasSkill(st.skills, 'sharp_eye') ? r.sharpEyeBonus : 0));
  }

  private leave(c: Customer, happy: boolean) {
    useGame.getState().recordVisit(happy);
    if (c.regular && !happy) useGame.getState().regularVisit(c.regular.id, c.basket, false);
    this.review(c, happy);
    const queue = c.counterKey ? this.queues.get(c.counterKey) : undefined;
    const i = queue ? queue.indexOf(c) : -1;
    if (queue && i >= 0) {
      queue.splice(i, 1);
      const counter = this.shop.counters().find((ct) => ct.key === c.counterKey);
      // Những người phía sau dịch lên
      if (counter) {
        queue.forEach((q, idx) => {
          if (idx < i) return;
          q.state = 'toQueue';
          q.plan = [() => (q.state = 'queued')];
          this.walk(q, this.shop.queueSpot(counter, idx));
        });
      }
    }
    c.counterKey = null;
    c.state = 'leaving';
    c.plan = [() => this.walk(c, this.shop.doorOutside), () => this.walk(c, new THREE.Vector3(c.exitX, 0, SIDEWALK_Z))];
    this.walk(c, this.shop.doorInside);
  }

  /** Khách chấm sao: mỗi món không mua được −1, chờ lâu −1; bỏ về thì chê đúng lý do. */
  private review(c: Customer, paid: boolean) {
    if (Math.random() > REVIEW_CHANCE) return;
    const st = useGame.getState();
    const firstMiss = c.missed[0];
    if (!paid) {
      // Bỏ về: hoặc chờ quá lâu ở quầy, hoặc không mua được món nào
      const reason: ReviewReason = c.basket.length ? 'wait' : firstMiss?.why ?? 'stock';
      return st.addReview(c.basket.length ? 1 : 1 + Math.floor(Math.random() * 2), reason, reason === 'wait' ? undefined : firstMiss?.id);
    }
    const stars = Math.max(1, Math.min(5, 5 - c.missed.length - (c.waitedMinutes > c.patience / 2 ? 1 : 0)));
    if (stars <= 2 && firstMiss) return st.addReview(stars, firstMiss.why, firstMiss.id);
    const priciest = [...c.basket].sort((a, b) => b.price - a.price)[0];
    st.addReview(stars, undefined, priciest?.id);
  }

  private walk(c: Customer, target: THREE.Vector3) {
    c.path = this.pathTo(c.position, target);
  }

  private pathTo(from: THREE.Vector3, to: THREE.Vector3) {
    const path = this.grid.findPath(from, to);
    return path.length ? path : [to.clone()];
  }

  /** Kệ có món hàng này; không có thì một kệ cùng ngành hàng (khách đi tìm rồi thất vọng). */
  private shelfWith(productId: string) {
    const shelves = useGame.getState().furniture.filter((f) => furnitureDef(f.type).tiers > 0);
    const having = shelves.filter((f) => !f.broken && f.tiers.some((t) => t.productId === productId && t.count > 0));
    if (having.length) return pick(having);
    const sameKind = shelves.filter((f) => furnitureDef(f.type).categories.includes(productById(productId).category));
    return pick(sameKind.length ? sameKind : shelves);
  }

  /** Người bán rong đi vào tới quầy chính, đưa đề nghị lấy sỉ rồi đứng chờ. */
  private spawnVendor() {
    const startX = Math.random() < 0.5 ? -EDGE_X : EDGE_X;
    const c = new Customer(startX, null, PROFESSIONS.find((p) => p.id === 'farmer') ?? null);
    c.wholesale = true;
    this.customers.push(c);
    this.scene.add(c.mesh);
    c.pushCart();
    c.state = 'toShop';
    c.path = this.pathTo(c.position, this.shop.doorOutside);
    c.plan.push(() => this.walk(c, this.shop.doorInside));
    c.plan.push(() => {
      const counter = this.shop.counters()[0];
      this.walk(c, counter ? counter.center.clone().add(new THREE.Vector3(-1.2, 0, 1.1)) : this.shop.doorInside);
    });
    c.plan.push(() => {
      c.state = 'shopping';
      if (!useGame.getState().offerWholesale()) return this.vendorLeave(c);
      c.offered = true;
      c.say('🧺', 4);
    });
  }

  private vendorLeave(c: Customer) {
    c.wholesale = false;
    c.state = 'leaving';
    c.plan = [() => this.walk(c, this.shop.doorOutside), () => this.walk(c, new THREE.Vector3(c.exitX, 0, SIDEWALK_Z))];
    this.walk(c, this.shop.doorInside);
  }

  /** Xoá hết khách (sang ngày mới). */
  reset() {
    clearAsk();
    for (const c of this.customers) this.scene.remove(c.mesh);
    this.customers = [];
    this.queues.clear();
    this.checkoutProgress.clear();
    this.regularsToday = [];
    this.friendsBurst = 0;
    this.festivalToday = false;
    this.vendorAt = undefined;
  }
}
