import * as THREE from 'three';
import { simRng } from '../core/rand';
import { MINUTES_PER_SECOND, useGame, type CartItem } from '../core/store';
import { furnitureDef, isCookStation } from '../data/furniture';
import { customersPerDay, FEATURES } from '../data/levels';
import { WEEKEND_SNACKS, formatMoney, productById, unlockedProducts } from '../data/products';
import { trending } from '../data/suppliers';
import { skyAt } from '../data/weather';
import { marketTrafficFactor } from '../data/chophien';
import { tierMarkdown, fitLots, nearestLife, nearExpiryRefuseChance } from '../data/freshness';
import { demandPriceFactor, keepChance } from '../data/pricing';
import { CUNG_GOODS, CUNG_PULL, isXoiCungDay } from '../data/tiemXoi';
import { dayEffects, isWeekend, OFF_SEASON_CLEARANCE, OFF_SEASON_HUNT, offSeason } from '../data/calendar';
import { chooseSubstitute } from '../data/substitute';
import { COOKED_PRODUCT_IDS, RECIPES } from '../data/recipes';
import { NEIGHBOR_ONLY_IDS } from '../data/homemade';
import { REGION_IDS } from '../data/regionSpecialty';
import { happyHourActive, happyTraffic, timeBandAt } from '../data/rhythm';
import { hasSkill } from '../data/titles';
import { RISK_RULES } from '../data/risks';
import { isNight, NIGHT_SPAN, nightTrafficAt } from '../data/night';
import { COMBO_PULL, comboDiscount, comboPartners } from '../data/combos';
import { noteComboDay } from '../core/slices/comboDay';
import { bulkExtra, festivalVisit, perkValue, pickRegular, referFriends, regularById, reserveAsk, INFLUENCER_ID, unlockedFavorites, type RegularDef } from '../data/regulars';
import { influencerActive } from '../data/social';
import { pickProfession, PROFESSIONS, type ProfessionDef } from '../data/professions';
import { DEBT_PARTIAL_CHANCE, DEBT_PARTIAL_MIN, installmentNow, CREDIT_UNLOCK, repaysToday, wantsCredit, creditLeft, creditAskText } from '../data/credit';
import { askQueuedPatience, ASK_MINUTES, CANDY_ANNOY, CHANGE_CHANCE, CHANGE_UNLOCK, CREDIT_REFUSE_FRIEND_LOSS, changeChoice, defaultCounterPolicy, HAGGLE_CHANCE, HAGGLE_CHANCE_REG, HAGGLE_MIN_TOTAL, HAGGLE_UNLOCK, haggleChoice, haggleCounterOff, haggleOff, haggleSettle, oddChange, pricematchSettle } from '../data/counterDeals';
import { rollService, SERVICE_BUY_ALONG, type ServiceDef } from '../data/services';
import { earnService, earnTip } from '../core/biz';
import { paymentById, pickPayment } from '../data/payments';
import { askAtCounter, askPending, clearAsk, expireAsk, answerAsk, askWallElapsed, useCounterAsk } from '../core/counterAsk';
import { cashierRng } from '../core/rand';
import { cashierHaggleChoice, cashierChangeChoice } from '../data/counterDeals';
import { VENDOR_CHANCE, VENDOR_FROM, VENDOR_UNTIL, WHOLESALE_UNLOCK } from '../data/wholesale';
import { isBigBasket, bigBasketCount, bigBasketAbandons } from '../data/bigBasket';
import { meatDemandFactor } from '../data/meat';
import {
  bestSkillOnDuty, DIRT_MAX, DIRT_PER_VISIT, dirtVisitFactor,
} from '../data/staff';
import {
  CRITIC_CHANCE, CRITIC_HARD_UNLOCK, CRITIC_PENALTY_REVIEWS, CRITIC_UNLOCK, CRITIC_WINDOW_MINUTES,
  criticReward, pickCriticDish, criticPraiseReviews, criticCallText, criticCookFits,
} from '../data/critic';
import { metaRng } from '../core/rand';
import { theftCatchChance, theftSpawnChance } from '../data/theftRisk';
import { socialTraffic } from '../data/social';
import { adTargets, bizTraffic, LOYALTY_UNLOCK, loyaltyRedeemChance, petActive, rivalPriceGap, rivalUndercuts } from '../data/biz';
import { landmarkCustomerFactor } from '../data/landmark';
import { redeemLoyalty, storyOnVisit } from '../core/biz';
import { hasUpgrade } from '../data/upgrades';
import {
  impulseChance, impulseOptions, impulseWeight, shelfAttention, stockedAttention, weightedPick, decorScoreOf, decorVisitBoost, type ShopGeom,
} from '../data/layout';
import { regionFlagDecorBonus, stockedProductIds } from '../data/regionFlags';
import { vietSetDecorBonus } from '../data/decorSets';
import { playSfx } from '../core/audio';

/** Tỉ lệ món khách chọn trong số hàng đang giảm giá (nếu có). */
const SALE_HUNT = 0.2;
import { REVIEW_CHANCE, type ReviewReason } from '../data/reviews';
import { reputationOf, repVisitBonus, sampleVisit } from '../data/reputation';
import { OPENING_TRAFFIC } from '../data/community';
import type { Counter, GroceryShop } from '../shop/groceryShop';
import type { NavGrid } from '../world/navGrid';
import { CoinPopFX } from '../render/fx/coinPop';
import {
  DINE_UNLOCK, DINE_WAIT_SECONDS, EAT_SECONDS, TOILET_NEED_CHANCE, TOILET_STRICT_UNLOCK, TOILET_USE_SECONDS,
  dineTip, freeSeat, freeToilet, isToilet, toiletFee, wantsDineIn, type SeatInfo, menuTipMul,
} from '../data/dineIn';
import { MACHINE_VISIT_CHANCE, MACHINE_USE_SECONDS, MACHINE_TYPES, freeMachine, isMachine, machineFeeAt, machineImpulse, MACHINE_IMPULSE_LEVEL, clawWin, type MachineId } from '../data/machines';
import {
  Customer, FRANTIC_AT, IMPATIENT_AT, PATIENCE_MINUTES, SIDEWALK_Z, impatienceEmoji, patienceMultiplier, counterQueueScore, leastScore, reviewStars, type Deal,
} from './customerEntity';

export { FRANTIC_AT, IMPATIENT_AT, impatienceEmoji };

const pick = <T,>(list: T[]) => list[Math.floor(simRng()() * list.length)];

import { SHOP_HOURS } from '../data/shopHours';
const EDGE_X = 38;
const OPEN_FROM = SHOP_HOURS.grocery.from;
/** Trần khoảng chờ khách kế tiếp (phút game) khi vừa sang giờ mở — khách đầu ngày không đợi phần dư của đêm. */
const DAYTIME_FIRST_GAP_CAP = 20;
const OPEN_UNTIL = SHOP_HOURS.grocery.to;
/** Tỉ lệ khách muốn mua món đang có trên kệ (còn lại là món ngẫu nhiên, có thể tiệm không bán). */
const WANTS_STOCKED = 0.8;


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
  // ── GĐ1498 — nhà phê bình ẩm thực: ≤1 lần/ngày, gọi 1 món, phục vụ trong khung thì thưởng ──
  /** Phút nhà phê bình định ghé hôm nay (null = hôm nay không ghé). */
  private criticAt: number | null | undefined;
  private criticRolledDay = -1;
  /** Món nhà phê bình đang chờ được phục vụ (null = không có lời hẹn nào). */
  private criticProduct: string | null = null;
  private criticUntil = 0;
  private criticHard = false;
  private checkoutProgress = new Map<string, number>();
  /** GĐ1491 — ghế ăn đang bị khách chiếm (uid ghế); khách trả ghế khi ăn xong hoặc bỏ về. */
  private seatBusy = new Set<number>();
  /** GĐ1493 — máy tự phục vụ đang có khách dùng (uid máy); mỗi máy 1 khách/lúc. */
  private machineBusy = new Set<number>();
  /** GĐ1494 — bồn vệ sinh đang có khách dùng (uid bồn); mỗi bồn 1 khách/lúc. */
  private toiletBusy = new Set<number>();
  private cashierSpeed: (counter: Counter) => number = () => 0;
  /** GĐ1253 — sao tay nghề thu ngân đang trực ở quầy (0 = không có); khách gặp thu ngân thì thu ngân tự quyết. */
  private dutyCashierSkill: (counter: Counter) => number = () => 0;
  /** Có bảo vệ đang trực cửa không (StaffManager gán). */
  guardOnDuty: () => boolean = () => false;
  /** Người chơi đang đứng quầy này (mới hỏi ý; nhân viên đứng quầy thì tự chọn mặc định). */
  playerAtCounter: (counter: Counter) => boolean = () => false;
  /** Bong bóng "+12.000đ" bay lên từ quầy vừa bán xong (main.update bằng giây thật). */
  readonly coinFx: CoinPopFX;

  constructor(private scene: THREE.Scene, private grid: NavGrid, private shop: GroceryShop) {
    this.coinFx = new CoinPopFX(scene);
  }

  /**
   * @param gameDt giây đã nhân tốc độ game
   * @param cashierSpeed tốc độ tính tiền ở một quầy (1 = người chơi); 0 = không ai đứng quầy đó
   * @param dutyCashierSkill sao tay nghề thu ngân đang trực ở quầy (GĐ1253); 0 = không có (mặc định — giữ hành vi cũ)
   */
  update(gameDt: number, cashierSpeed: (counter: Counter) => number, dutyCashierSkill: (counter: Counter) => number = () => 0) {
    const s = useGame.getState();
    const gameMinutes = gameDt * MINUTES_PER_SECOND;
    this.cashierSpeed = cashierSpeed;
    this.dutyCashierSkill = dutyCashierSkill;
    expireAsk(s.minutes);
    this.updateAskRealTime(s);
    const counters = this.shop.counters();
    this.rehomeQueues(counters);

    // Ban ngày người đi đường nhiều hơn; có ca đêm thì "ngày" kéo dài tới 6h sáng hôm sau
    const nightOpen = hasUpgrade(s.biz, 'night');
    const daytime = s.minutes >= OPEN_FROM && (s.minutes < OPEN_UNTIL || (nightOpen && s.minutes < 30 * 60));
    // GĐ806: khoảng chờ ngoài giờ mở là 60–90 phút; sang giờ mở thì không bắt khách đầu ngày đợi hết phần dư đó
    if (daytime && this.spawnIn > DAYTIME_FIRST_GAP_CAP) this.spawnIn = DAYTIME_FIRST_GAP_CAP;
    this.spawnIn -= gameMinutes;
    if (this.spawnIn <= 0) {
      // Khách quen rủ bạn đi cùng: ngay khi có suất sinh, ưu tiên cho bạn vào tiệm
      if (this.friendsBurst > 0 && daytime && s.shopOpen) {
        this.friendsBurst--;
        this.spawn(true);
      } else {
        const perDay = customersPerDay(s.level) * 2; // một nửa chỉ đi ngang qua
        // Giờ cao điểm, ngày lễ, sửa đường, ngày hội của khách quen nữa; trúng vòng quay thì đông thêm
        // Ban đêm người đi đường thưa hẳn (kéo dài nửa ca sinh theo ca đêm nên nhân lại)
        const festival = this.festivalToday ? 1.35 : 1;
        const eventTraffic = (s.event?.traffic ?? 1) * (s.opening?.day === s.day ? OPENING_TRAFFIC : 1) * s.wheelBoost;
        // Ban đêm sinh khách theo khung ca đêm (22h–6h): thưa nhưng đều, giờ nào cũng có người ghé
        const night = nightTrafficAt(s.minutes);
        const bandTraffic = night ?? timeBandAt(s.minutes)?.traffic ?? 1;
        const rush = bandTraffic * dayEffects(s.weatherSeed, s.day, s.level).traffic
          * (hasSkill(s.skills, 'local_legend') ? 1.1 : 1) * festival * eventTraffic * marketTrafficFactor(s.day);
        this.spawnIn = (daytime ? (night ? NIGHT_SPAN : OPEN_UNTIL - OPEN_FROM) / perDay / rush : 60) * (0.5 + simRng()());
        // GĐ1495 — bỏ trần "+25% chậu cây": điểm trang trí 🩷 cộng dồn mọi đồ decor, kéo khách
        // theo sao danh tiếng (quán đẹp chỉ phát huy khi phục vụ tốt); không máy trong sim cũ → 0.
        // GĐ1505 — bảng hiệu đặc sản 4 miền: bày đủ bộ đặc sản miền (mối lái vùng xa) thì +🩷 thêm
        const decorBoost = decorVisitBoost(decorScoreOf(s.furniture) + vietSetDecorBonus(s.furniture) + regionFlagDecorBonus(s.furniture, stockedProductIds(s.furniture), s.servedCounts ?? {}), reputationOf(s.repLog).overall);
        // Đang mưa thì ít người ra đường, tạnh mưa lại đông như thường
        const traffic = skyAt(s.weatherSeed, s.day, s.weather, s.minutes).traffic * festival * eventTraffic;
      // Bày hàng rẻ hơn giá gợi ý thì tiếng lành đồn xa, thêm người ghé; sàn bẩn thì ngại vào; giờ vàng kéo khách về đúng khung
      const happy = happyHourActive(s.happyHour, s.minutes) ? happyTraffic(s.happyHour!.off) : 1;
      const visit = (0.5 + decorBoost + repVisitBonus(reputationOf(s.repLog))) * traffic * this.priceAppeal() * dirtVisitFactor(s.dirt)
      * bizTraffic(s.biz, s.day) * happy * socialTraffic(s.social, s.day)
      // Sân chơi đầu hẻm khánh thành rồi thì hẻm đông khách hơn (×1.06; ván mới = 1 nên không đổi nền kinh tế)
      * landmarkCustomerFactor(s.biz.landmark.contributions);
        const open = daytime && s.shopOpen;
        // Khách quen tới đúng giờ quen, không phụ thuộc người đi đường; người bị rival lôi kéo thì tạm vắng
        const poached = s.biz.rival ? Object.keys(s.biz.rival.poached ?? {}) : [];
        let regular = open ? pickRegular(s.day, s.minutes, s.weatherSeed, s.level, s.regulars, this.regularsToday, reputationOf(s.repLog), poached) : undefined;
        // Bài khen lan truyền gần đây: influencer ghé sớm hơn bình thường, dẫn fan qua ủng hộ
        if (!regular && open && influencerActive(s.social, s.day) && !this.regularsToday.includes(INFLUENCER_ID)
          && !poached.includes(INFLUENCER_ID) && simRng()() < 0.35) {
          regular = regularById(INFLUENCER_ID);
        }
        if (regular) {
          this.regularsToday.push(regular.id);
          if (festivalVisit(regular, s.regulars[regular.id])) this.festivalToday = true;
          this.spawn(true, regular);
        } else {
          // Người đi đường ghé quầy dùng dịch vụ (nạp tiền, đóng tiền điện nước)
          const svc = open ? rollService(s.biz.services ?? [], s.day, simRng()()) : undefined;
          if (svc) this.spawn(true, undefined, svc);
          else this.spawn(open && simRng()() < visit);
        }
      }
    }

    // Người bán rong: sáng sớm ghé lấy sỉ, mỗi ngày tối đa một người
    if (this.vendorAt === undefined) {
      this.vendorAt = s.level >= WHOLESALE_UNLOCK && simRng()() < VENDOR_CHANCE
        ? VENDOR_FROM + simRng()() * (VENDOR_UNTIL - VENDOR_FROM - 20)
        : null;
    }
    if (this.vendorAt !== null && s.minutes >= this.vendorAt && s.shopOpen && s.vendorDay !== s.day && s.minutes < VENDOR_UNTIL) {
      this.vendorAt = null;
      this.spawnVendor();
    }

    // GĐ1498 — nhà phê bình ẩm thực (tiệm đã có khu ăn tại chỗ): gọi 1 món, phục vụ kịp thì thưởng
    this.updateCritic(s);

    for (const c of this.customers) {
      c.step(gameDt);
      // Người bán rong đứng chờ: chủ tiệm đã trả lời (hoặc họ hết kiên nhẫn) thì đi
      if (c.wholesale && c.offered && c.state === 'shopping' && !useGame.getState().vendorOffer) {
        c.say('👋', 2);
        this.vendorLeave(c);
      }
      // GĐ1492 — khách chờ ghế ăn tại chỗ: đếm kiên nhẫn, ghế trống thì dẫn đi ngồi, quá mốc bỏ về
      if (c.state === 'toSeat' && !c.seat) this.updateSeatWaiting(c, gameDt);
      if (c.state === 'queued') {
        c.waitedMinutes += gameMinutes;
        // GĐ119 — dấu hiệu "khách sốt ruột" dẫn dắt (chỉ hiển thị, không đụng state/kinh tế):
        // dùng badge bền (setBadge) đọc từ waited/patience có sẵn; chỉ đổi emoji khi VƯỢT MỐC
        // (không gọi lại mỗi tick → không giật). 😕 bắt đầu sốt ruột → 😤 sắp bỏ đi → 😠 khi bỏ.
        const emo = c.patience > 0 ? impatienceEmoji(c.waitedMinutes / c.patience) : null;
        if (emo && c.badge !== emo) c.setBadge(emo);
        if (c.waitedMinutes > c.patience) {
          c.say('😠 Chờ lâu quá!');
          s.noteMiss('wait');
          this.leave(c, false);
        }
      }
    }

    for (const counter of counters) this.updateCheckout(counter, gameDt, cashierSpeed(counter));

    // Xoá khách đã đi khỏi bản đồ (kèm giải phóng tài nguyên GPU). Không cấp phát mảng mới mỗi khung:
    // chỉ gộp mảng tại chỗ khi thật sự có người rời khỏi.
    let anyGone = false;
    for (const c of this.customers) {
      // Khách đang chờ ghế ăn tại chỗ ('toSeat' chưa có ghế) phải được giữ lại dù đang đứng yên
      if (this.isGone(c)) { anyGone = true; break; }
    }
    if (anyGone) {
      let w = 0;
      for (let r = 0; r < this.customers.length; r++) {
        const c = this.customers[r];
        const gone = this.isGone(c);
        if (gone) { this.scene.remove(c.mesh); c.dispose(); }
        else this.customers[w++] = c;
      }
      this.customers.length = w;
    }

    const waiting = [...this.queues.values()].reduce((sum, q) => sum + q.length, 0);
    // Khách còn trong tiệm: đang chọn hàng / đi tới quầy / đang chờ thanh toán — nhân viên tan ca
    // phải chờ hết đám này mới được về
    const inside = this.customers.filter((c) => c.state === 'shopping' || c.state === 'toQueue' || c.state === 'queued' || c.state === 'toSeat' || c.state === 'dining').length;
    if (s.waiting !== waiting || s.customersInside !== inside) useGame.setState({ waiting, customersInside: inside });
  }

  /** GĐ122 — khách đang bị treo câu hỏi quầy (mặc cả/ghi sổ), thế giới dừng theo GĐ102 nhưng khách
   *  này vẫn mất kiên nhẫn theo GIÂY THỰC (wall-clock) để phá 'AFK vô hạn': bong bóng 😕→😤 cập nhật
   *  đồng bộ với cùng ngân sách thời gian như cửa sổ hội thoại (UI/UX bắt buộc), hết hạn thì TỰ CHỐT
   *  theo phương án mặc định (không 'bỏ về' — phạt nhẹ, công bằng; không ghi missed.wait vì khách
   *  thật sự KHÔNG đi — việc ghi sẽ làm thổi phồng thẻ 'mất khách vì chờ' GĐ120). Chỉ Date.now()
   *  thuần ứng — không thêm state/save (không đụng SAVE_VERSION). */
  private updateAskRealTime(_s: ReturnType<typeof useGame.getState>) {
    if (!askPending()) return;
    const c = this.customers.find((x) => x.deal === 'waiting');
    if (!c) return;
    const st = askQueuedPatience(askWallElapsed());
    if (st === 'resolved') {
      c.setBadge(null);
      const ask = useCounterAsk.getState().ask;
      if (ask) answerAsk(ask.fallback);
      return;
    }
    if (st && c.badge !== st) c.setBadge(st);
  }

  /** Hình dáng tiệm hiện tại (cửa, các chỗ trả tiền) để tính độ được để ý của kệ. */
  private geom(): ShopGeom {
    return {
      width: this.shop.width,
      depth: this.shop.depth,
      paySpots: this.shop.counters().map((ct) => {
        const p = this.shop.toLocal(ct.pay);
        return { x: p.x, z: p.z };
      }),
    };
  }

  /** Trung bình hệ số giá rẻ của các món đang bày (1 = giá gợi ý hoặc đắt hơn); món rival phá giá thì khách e dè. */
  private priceAppeal() {
    const s = useGame.getState();
    const ids = [...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!)))];
    if (!ids.length) return 1;
    const under = rivalUndercuts(s.biz.rival, (id) => s.priceOf(id), s.day);
    return ids.reduce((n, id) => n + demandPriceFactor(id, s.priceOf(id)) * (under.has(id) ? 0.85 : 1), 0) / ids.length;
  }

  /** Khách quen: chủ yếu mua món ưa thích, perk "mua thêm" cộng món, perk "mua lô" nhân số lượng. */
  private regularWants(def: RegularDef) {
    const s = useGame.getState();
    const favs = unlockedFavorites(def, s.level);
    const count = 1 + Math.floor(simRng()() * 2) + perkValue(def, s.regulars[def.id], 'extra_item');
    const bulk = bulkExtra(def, s.regulars[def.id]); // mua thêm theo lô
    const items = Array.from({ length: count }, (_, i) => (i === 0 || simRng()() < 0.75 ? pick(favs) : this.chooseWants(1)[0]));
    // Mua lô: nhân bản món khoái (loại hàng thật), khách ưa thích mua càng nhiều đơn vị.
    return items.flatMap((id) => {
      const copies = favs.includes(id) && bulk > 0 ? 1 + bulk : 1;
      return Array.from({ length: copies }, () => id);
    });
  }

  /** Khách theo nghề: phần lớn mua đồ nghề mình hay dùng, còn lại như khách thường. */
  private professionWants(def: ProfessionDef, count: number) {
    const level = useGame.getState().level;
    const day = useGame.getState().day;
    const likes = def.likes.filter((id) => productById(id)?.unlock <= level && !offSeason(id, day));
    if (!likes.length) return this.chooseWants(count);
    return Array.from({ length: count }, () => (simRng()() < def.loyalty ? pick(likes) : this.chooseWants(1)[0]));
  }

  /** Món khách muốn mua: phần lớn là hàng đang bày, đôi khi là món tiệm chưa có. */
  private chooseWants(count: number) {
    const s = useGame.getState();
    // Hàng của dịp (bánh chưng, lồng đèn...) hết dịp thì không ai hỏi mua
    const inSeason = (id: string) => !offSeason(id, s.day);
    // Đồ độc quyền mối đặc biệt (hàng xóm GĐ1077/1085, đặc sản vùng GĐ1086) chỉ có khách hỏi khi đã bày kệ
    // — không nở rộng bể ngẫu nhiên (giữ cân bằng sim)
    const all = unlockedProducts(s.level).map((p) => p.id).filter((id) => !NEIGHBOR_ONLY_IDS.has(id) && !REGION_IDS.has(id)).filter(inSeason);
    const shelved = [
      ...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!))),
    ];
    const stocked = shelved.filter(inSeason);
    // Hàng của dịp còn tồn: bày giá xả thật thấp thì có khách săn hàng rẻ mua dọn
    const clearance = shelved.filter((id) => !inSeason(id) && s.priceOf(id) <= productById(id).sell * OFF_SEASON_CLEARANCE);
    // Hàng hot tuần này: khách hay hỏi mua hơn hẳn
    const hot = trending(s.day, s.level).filter(inSeason);
    // Món của mùa lễ / đang nổi, và món hợp khung giờ (sáng sữa bánh mì, tối rau thịt)
    const unlocked = (id: string) => productById(id).unlock <= s.level;
    const effects = dayEffects(s.weatherSeed, s.day, s.level);
    const seasonal = effects.hot;
    const timely = (timeBandAt(s.minutes)?.wants ?? []).filter(unlocked);
    // Trời mưa/giông: khách hay ghé mua áo mưa, ô, nước khẩn cấp — và trời lạnh thì thèm đồ nóng
    const rainy = (s.weather === 'rain' || s.weather === 'storm') ? ['aomua', 'o', 'nuoc', 'mi_trung_nong', 'tra_gung_nong', 'banh_bao_hap', 'che_dau_xanh'].filter(unlocked) : [];
    // Nắng đẹp: đồ mát mát lạnh bán bùng nổ
    const sunnyCool = s.weather === 'sunny' ? ['nuoc_mia', 'kem_trai_cay', 'sinh_to_trai_cay', 'tra_dao_cam_sa'].filter(unlocked) : [];
    // Cuối tuần (Thứ 7/CN — GĐ255): nhà bằng nghỉ học, tụi nhỏ rủ nhau ghé mua ăn vặt — nhiệm vụ
    // "Cuối tuần ăn vặt" (GĐ254) dạy trữ đúng nhóm này nên thế giới phải trả lời đúng hứa
    const weekendSnacks = isWeekend(s.day) ? WEEKEND_SNACKS.filter(unlocked) : [];
    // GĐ609: mùng 1/rằm (ngày cúng) bà con ghé mua nhang, trái cây
    const cungGoods = isXoiCungDay(s.day) ? CUNG_GOODS.filter(unlocked) : [];
    // Hàng cận hạn đang giảm giá: có khách chuyên săn đồ giảm
    const onSale = [
      ...new Set(s.furniture.flatMap((f) => f.tiers.filter((t) => tierMarkdown(t.productId, t.lots, t.count) > 0).map((t) => t.productId!))),
    ];
    // Món nhà làm đang bày: mùi thơm kéo khách hỏi mua nhiều hơn hẳn hàng đóng gói
    const homemade = shelved.filter((id) => COOKED_PRODUCT_IDS.has(id));
    // Kệ dễ thấy (gần cửa, sát lối đi chính) thì món trên đó được hỏi mua nhiều hơn
    const attention = stockedAttention(s.furniture, this.geom());
    // Thịt cá tươi: không có người cân cắt trực ca thì khách ít hỏi mua
    const butcher = bestSkillOnDuty(s.staff, 'butcher', s.minutes);
    return Array.from({ length: count }, () => {
      if (onSale.length && simRng()() < SALE_HUNT) return pick(onSale);
      if (homemade.length && simRng()() < 0.25) return pick(homemade);
      if (clearance.length && simRng()() < OFF_SEASON_HUNT) return pick(clearance);
      if (rainy.length && simRng()() < 0.3) return pick(rainy);
      if (sunnyCool.length && simRng()() < 0.25) return pick(sunnyCool);
      if (seasonal.length && simRng()() < effects.pull) return pick(seasonal);
      if (timely.length && simRng()() < 0.2) return pick(timely);
      if (weekendSnacks.length && simRng()() < 0.2) return pick(weekendSnacks);
      if (cungGoods.length && simRng()() < CUNG_PULL) return pick(cungGoods);
      if (hot.length && simRng()() < 0.15) return pick(hot);
      return stocked.length && simRng()() < WANTS_STOCKED
        ? weightedPick(stocked, (id) => (attention[id] ?? 1) * meatDemandFactor(id, butcher), simRng())
        : pick(all);
    });
  }

  private spawn(visit: boolean, regular?: RegularDef, service?: ServiceDef) {
    const startX = simRng()() < 0.5 ? -EDGE_X : EDGE_X;
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
    const hasCart = !!station;
    const hasBigShelf = s.furniture.some((f) => f.type === 'bigShelf');
    // GĐ-B — khách GIỎ LỚN khi ngành "Khu tự chọn" kích hoạt (đủ bậc + cartStation + bigShelf):
    // giỏ 5–8 món trải nhiều ngành; thiếu ≥2 món thì bỏ cả giỏ (xem plan kết).
    c.bigBasket = isBigBasket(simRng(), s.shopTier, hasCart, hasBigShelf);
    const withCart = hasCart && (c.bigBasket || simRng()() < 0.5);
    const maxItems = s.level >= FEATURES.basket ? 4 : 3;
    const count = (c.bigBasket ? bigBasketCount(simRng()) : withCart ? 3 + Math.floor(simRng()() * 5) : 1 + Math.floor(simRng()() * maxItems))
      + (hasSkill(s.skills, 'big_basket') && simRng()() < 0.5 ? 1 : 0);
    if (hasSkill(s.skills, 'charm')) c.sensitivity *= 0.85;
    // GĐ1212 — P sinh trộm thành helper THUẦN theftSpawnChance (chance × đêm×2 × chó×0.45 × camera×0.7): hành vi GIỮ NGUYÊN.
    c.thief = !regular && !service && s.level >= RISK_RULES.theft.unlock && simRng()() < theftSpawnChance({
      isNight: isNight(s.minutes),
      hasNightUpgrade: hasUpgrade(s.biz, 'night'),
      hasDog: petActive(s.biz.pets.dog, s.day),
      hasCamera: hasUpgrade(s.biz, 'camera'),
    });
    // Có mèo ở quầy: khách nhỏ (học sinh, mẹ bỉm) vui hơn, đỡ sốt ruột; nhân viên chăm sóc khách trực ca
    // thì ai cũng chịu chờ lâu hơn theo tay nghề — GĐ1208 tách thành patienceMultiplier (THUẦN, same công
    // thức/hằng) để logic này test được; hành vi giữ nguyên (chỉ đổi chỗ nhân nội tuyến → một lần gọi).
    const care = bestSkillOnDuty(s.staff, 'customer_care', s.minutes);
    c.patience *= patienceMultiplier({ petCat: petActive(s.biz.pets.cat, s.day), professionId: c.profession?.id ?? null, care });
    c.wants = regular
      ? this.regularWants(regular)
      : c.profession
        ? this.professionWants(c.profession, Math.max(1, count + c.profession.extraItems))
        : this.chooseWants(count);
    // Khách quen có lời hẹn giữ món hôm nay: đi lấy đúng món đó trước (kệ trống thì thành mất hẹn)
    if (regular) {
      const res = s.reservations[regular.id];
      if (res && res.day === s.day && productById(res.productId).unlock <= s.level) {
        for (let i = 0; i < res.qty; i++) c.wants.push(res.productId);
        c.say('🤝', 2.5);
      }
    }
    // Khách dịch vụ: đi thẳng tới quầy, đôi khi tiện mua kèm 1–2 món
    if (service) {
      c.service = { def: service, ...service.fee() };
      c.wants = simRng()() < SERVICE_BUY_ALONG ? this.chooseWants(1 + Math.floor(simRng()() * 2)) : [];
    }
    c.state = 'toShop';
    c.path = this.pathTo(c.position, this.shop.doorOutside);
    c.plan.push(() => {
      useGame.getState().addDirt(DIRT_PER_VISIT);
      if (c.service) c.say(c.service.def.icon, 3);
      else if (regular) c.say('👋', 3);
      else if (c.profession) c.say(c.profession.icon, 2.5);
      playSfx('door');
      this.walk(c, this.shop.doorInside);
    });
    // GĐ1493 — tiệm có máy tự phục vụ: 15% khách mới ghé chơi/thử một lượt rồi vẫn vào mua.
    // Chỉ rút vòng quay khi tiệm CÓ máy — không máy thì chuỗi ngẫu nhiên sim giữ nguyên từng nhịp.
    // Kẻ trộm lẻn vào việc, người bán rong vào lấy sỉ — không ai ghé máy.
    if (!c.thief && !c.wholesale && s.furniture.some((f) => isMachine(f.type)) && simRng()() < MACHINE_VISIT_CHANCE) {
      const machine = freeMachine(s.furniture, this.machineBusy);
      if (machine) {
        const machineUid = machine.uid;
        // GĐ1542 — ghi sổ theo loại máy (biz.serviceLife) để biết máy đã thu được bao nhiêu.
        const machineType = machine.type;
        const fee = machineFeeAt(machine.type, s.minutes, s.level, s.day, s.weather);
        const icon = MACHINE_TYPES[machine.type as MachineId].icon;
        this.machineBusy.add(machineUid);
        if (s.level >= MACHINE_IMPULSE_LEVEL && machineImpulse(s.level, simRng()())) c.wants.push(...this.chooseWants(1));
        c.plan.push(() => this.walk(c, this.shop.spotFor(machine)));
        c.plan.push(() => {
          c.pause = MACHINE_USE_SECONDS;
          c.say(icon, 2.5);
        });
        c.plan.push(() => {
          this.machineBusy.delete(machineUid);
          if (fee > 0) {
            earnService(machineType, fee);
            this.coinFx.spawn(c.mesh.position, fee);
          }
          if (clawWin(machineType, s.level, machineUid, s.day, s.minutes)) {
            c.say('🧸 Gắp trúng!', 2.5);
            const g = useGame.getState(); // GĐ1592 — đếm cho tab Dịch vụ
            useGame.setState({ stats: { ...g.stats, clawWins: (g.stats.clawWins ?? 0) + 1 } });
          }
        });
      }
    }
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
        if (shelf) this.walk(c, this.shop.spotFor(shelf, (simRng()() - 0.5) * 0.8));
      });
      c.plan.push(() => {
        c.pause = 1.5;
        const st = useGame.getState();
        st.noteDemand(want);
        const shortName = productById(want).name.replace(/\s*\(.*\)\s*/g, '');
        // Giá càng cao so với giá gợi ý thì khách càng ngại mua; món thiết yếu ít bị ảnh hưởng hơn, hàng của mùa lễ cũng vậy
        const tolerance = dayEffects(st.weatherSeed, st.day, st.level).tolerance(want);
        // Rival đang bán rẻ đúng món này thì khách soi giá kỹ hơn hẳn
        const rivalPress = rivalUndercuts(st.biz.rival, (id) => st.priceOf(id), st.day).has(want) ? 1.35 : 1;
        if (simRng()() > keepChance(want, st.priceOf(want), c.sensitivity * rivalPress * tolerance)) {
          c.missing++;
          c.missed.push({ id: want, why: 'price' });
          st.noteMiss('price', want);
          c.say(`💸 ${shortName} đắt quá!`);
          return;
        }
        // Khách nhìn hạn dùng ngay tại kệ: hàng còn ≤1 ngày thì một số người bỏ món dù đã giảm giá sâu
        const shelfF = shelfUid !== undefined ? st.furniture.find((x) => x.uid === shelfUid) : undefined;
        const shelfTier = shelfF?.tiers.find((x) => x.productId === want && x.count > 0);
        const shelfLife = shelfTier ? nearestLife(fitLots(shelfTier.lots, shelfTier.count, want)) : null;
        if (shelfLife !== null && simRng()() < nearExpiryRefuseChance(shelfLife, productById(want).category)) {
          c.say('⏳ Hàng cận hạn!');
          st.noteMiss('expired', want);
          return;
        }
        const price = st.takeFromShelf(want, shelfUid);
        if (price !== null) {
          c.basket.push({ id: want, price });
          this.pullCombo(c, want);
        } else {
          // GĐ1829 — OpenSpec khach-thay-mon-het-hang: hết món muốn thì khách nhìn trên CÙNG KỆ
          // lấy món khác giá không vượt dung sai (SUBSTITUTE_CHANCE ~60%, tất định simRng).
          // Phải đứng trước một kệ thật (shelfUid hợp lệ) mới "nhìn thấy" hàng để thay.
          const shelfF2 = shelfUid !== undefined ? st.furniture.find((x) => x.uid === shelfUid) : undefined;
          const hotIds = new Set([...trending(st.day, st.level), ...dayEffects(st.weatherSeed, st.day, st.level).hot]);
          const sub = chooseSubstitute(want, shelfF2, st.priceOf, hotIds, simRng());
          const subPrice = sub !== null ? st.takeFromShelf(sub, shelfUid) : null;
          if (sub !== null && subPrice !== null) {
            c.basket.push({ id: sub, price: subPrice });
            this.pullCombo(c, sub);
            c.say('🔄 Lấy món này thay!');
            const g2 = useGame.getState();
            useGame.setState({ stats: { ...g2.stats, substituted: (g2.stats.substituted ?? 0) + 1 } });
          } else {
            c.missing++;
            c.missed.push({ id: want, why: 'stock' });
            st.noteMiss('stock', want);
            c.say(`❓ Hết ${shortName}!`);
          }
        }
      });
    }
    c.plan.push(() => {
      // GĐ-B — khách GIỎ LỚN: thiếu ≥2 món mong muốn → bỏ CẢ GIỎ (ràng buộc "trữ kệ đủ theo ngành").
      if (c.bigBasket && c.basket.length && bigBasketAbandons(c.missing)) {
        c.say('🛒 Thiếu món phải, bỏ cả giỏ!');
        if (c.wants.length) useGame.getState().noteMiss('stock', c.wants[0]);
        c.basket = [];
        this.leave(c, false);
        return;
      }
      if (!c.basket.length && !c.service) {
        c.say('😞 Không có gì ưng');
        this.leave(c, false);
        return;
      }
      if (c.thief) return this.sneakOut(c);
      this.joinQueue(c, this.shop.counters());
    });
  }

  /** Xếp vào quầy có hàng ngắn nhất; quầy không có người tính tiền bị tính như dài thêm 3 người. */
  private joinQueue(c: Customer, counters: Counter[]) {
    // GĐ1213 — tách chọn quầy thành helper THUẦN (counterQueueScore/leastScore, cùng công thức/hằng): hành vi GIỮ NGUYÊN.
    const score = (ct: Counter) => counterQueueScore(this.queues.get(ct.key)?.length ?? 0, this.cashierSpeed(ct) > 0, ct.key === 'main');
    const best = leastScore(counters, score);
    const queue = this.queues.get(best.key) ?? [];
    this.queues.set(best.key, queue);
    queue.push(c);
    c.counterKey = best.key;
    c.state = 'toQueue';
    this.walk(c, this.shop.queueSpot(best, queue.length - 1));
    c.plan = [() => (c.state = 'queued')];
    this.impulseBuy(c, best, queue.length - 1);
  }

  /**
   * Hàng chớp nhoáng: đứng chờ tính tiền, khách với tay mua kẹp thêm một món nhỏ
   * ở kệ đặt trong tầm với quanh quầy — bày kẹo/bánh/nước cạnh quầy thu ngân để tăng giá trị đơn.
   */
  private impulseBuy(c: Customer, counter: Counter, queueAhead: number) {
    const st = useGame.getState();
    if (st.level < FEATURES.impulse || c.wholesale) return;
    if (simRng()() >= impulseChance(queueAhead)) return;
    const pay = this.shop.toLocal(counter.pay);
    const options = impulseOptions(st.furniture, pay);
    if (!options.length) return;
    const buy = weightedPick(options, (o) => impulseWeight(o.productId), simRng());
    const price = st.takeFromShelf(buy.productId, buy.uid);
    if (price === null) return;
    c.basket.push({ id: buy.productId, price });
    c.say('🍬', 2);
    // Đếm cho thành tựu (kệ hàng chớp nhoáng)
    useGame.setState({ totals: { ...st.totals, impulseSold: st.totals.impulseSold + 1 } });
    if (!st.impulseHinted) {
      useGame.setState({ impulseHinted: true });
      st.notify('🍬 Khách xếp hàng hay mua kẹp! Bày kẹo, bánh, nước ≤15k sát quầy để bán thêm.');
    }
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
    // GĐ44: ghi số lần từng combo kích hoạt (cho ComboPanel xoay combo kém hiệu quả)
    if (Object.keys(combo.byCombo).length) useGame.getState().noteComboHits(combo.byCombo);
    // GĐ124: gom hiệu quả combo THEO NGÀY (transient, không persist) — cho ComboPanel/Tổng kết "hôm nay"
    if (Object.keys(combo.byCombo).length) noteComboDay(combo.byCombo, combo.byDiscount);
    // Thẻ tích điểm: khách đủ tem được tặng món rẻ nhất trong giỏ
    const lp = useGame.getState();
    if (first.basket.length && lp.level >= LOYALTY_UNLOCK && simRng()() < loyaltyRedeemChance(lp.biz.loyalty)) {
      combo.discount += redeemLoyalty(first.basket.map((it) => it.price));
      first.say('🎫', 2);
    }
    const st = useGame.getState();
    const total = first.basket.reduce((n, it) => n + it.price, 0) - combo.discount;
    // Khách quen đủ thân đôi khi quên ví, xin ghi sổ; lần ghé sau trả nợ cũ
    const reg = first.regular;
    // GĐ734 — deal trả góp đã hỏi ở counterDeal: chốt tại settle (choice 0 nhận nửa, choice 1 đòi đủ — không rút thêm)
    if (reg && deal.kind === 'installment') {
      if (deal.choice === 0) {
        st.collectDebtPartial(reg.id);
        first.say('🤲', 2);
      } else {
        st.collectDebt(reg.id);
        st.adjustFriendship(reg.id, -1);
        first.say('💵', 2);
      }
    } else if (reg && repaysToday(st.debts[reg.id], st.day, simRng()())) {
      st.collectDebt(reg.id);
      first.say('💵', 2);
    }
    let happy = true;
    if (deal.kind === 'credit' && deal.choice === 1) {
      st.adjustFriendship(reg!.id, -CREDIT_REFUSE_FRIEND_LOSS);
      st.notify(`😔 ${reg!.name}: "Thôi để chạy về nhà lấy tiền vậy..."`);
    }
    // GĐ725 — kèo khớp giá qua helper thuần: choice 0 khớp (không rút) · choice 1 giữ giá (60% vẫn mua, 40% bỏ về)
    if (deal.kind === 'pricematch') {
      const settle = pricematchSettle(deal.choice, deal.amount, total, deal.choice === 0 ? 0 : simRng()());
      if (settle.discount) combo.discount += settle.discount;
      if (!settle.happy) happy = false;
      if (settle.icon) first.say(settle.icon, 2);
    }
    // GĐ721 — chốt deal mặc cả qua helper thuần: 0 bớt luôn · 1 trả giá lại (khách gật giá giữa/mua đầy/bỏ về) · 2 giữ giá
    if (deal.kind === 'haggle') {
      // GĐ1253 — deal do thu ngân chốt thì settle rút dòng riêng cashierRng (giữ chuỗi kinh tế chính nguyên vẹn)
      const settle = haggleSettle(deal.choice, deal.amount, total, deal.choice === 0 ? 0 : deal.cashier ? cashierRng() : simRng()());
      if (settle.discount) combo.discount += settle.discount;
      if (!settle.happy) happy = false;
      if (settle.icon) first.say(settle.icon, 2);
    }
    if (deal.kind === 'change' && deal.choice === 1) {
      first.say('🍬', 2);
      if ((deal.cashier ? cashierRng() : simRng()()) < CANDY_ANNOY) happy = false;
    }
    const onCredit = deal.kind === 'credit' && deal.choice === 0;
    // Khách tự chọn cách trả tiền: đơn càng lớn càng nghiêng chuyển khoản / ví / thẻ
    const method = onCredit ? undefined : pickPayment(total, st.level);
    if (onCredit) st.checkoutOnCredit(reg!.id, first.basket, combo.discount, combo.count);
    else if (first.basket.length) {
      st.checkout(first.basket, combo.discount, combo.count, method, first.profession?.id);
      playSfx('sale');
      // Juice GĐ173: bong bóng tiền bay lên ngay tại quầy vừa thu — phản hồi tức thì bằng mắt
      this.coinFx.spawn(counter.center, total);
    }
    if (first.service) {
      earnService(first.service.def.id, first.service.fee);
      first.say(first.service.def.icon, 2);
    }
    if (first.regular) {
      useGame.getState().regularVisit(first.regular.id, first.basket, true);
      storyOnVisit(first.regular.id);
      // Khách quen có perk giới thiệu bạn bè: rủ thêm khách lẻ vào tiệm
      const friends = referFriends(first.regular, useGame.getState().regulars[first.regular.id]);
      if (friends > 0) this.friendsBurst += friends;
      this.maybeReserve(first, counter);
    }
    // Khách quen đã trả tiền rồi thì không tính là bỏ về, chỉ hơi phật ý
    if (!happy && first.regular) {
      useGame.getState().adjustFriendship(first.regular.id, -1);
      happy = true;
    }
    if (method && method !== 'cash') first.say(paymentById(method).icon, 2);
    first.say(!happy ? '😒' : onCredit ? '📒' : first.regular ? '💛' : first.missing ? '🙂' : '😊');
    // GĐ1491 — mua món nấu tươi xong có thể ngồi lại ăn tại chỗ (nếu còn ghế) thay vì ra về
    if (this.maybeDineIn(first, counter)) return;
    this.leave(first, happy, true);
  }

  /**
   * GĐ1491 — khách vừa trả tiền mang món nấu tươi: trúng vòng quay "ngồi lại ăn" thì dẫn tới
   * bàn/ghế trống, ngồi ăn (pause) rồi mới ra về; hết ghế thì đứng chờ gần quầy (GĐ1492 —
   * chờ được tối đa DINE_WAIT_SECONDS, quá thì bỏ về buồn). Trả true nếu đã tự lo lối ra.
   */
  private maybeDineIn(c: Customer, counter: Counter): boolean {
    const st = useGame.getState();
    const hasCooked = c.basket.some((it) => COOKED_PRODUCT_IDS.has(it.id));
    // Chỉ rút vòng quay khi điều kiện sớm thoả — không ăn tại chỗ thì không dịch chuỗi ngẫu nhiên
    const roll = hasCooked && st.level >= DINE_UNLOCK ? simRng()() : 1;
    if (!wantsDineIn({ level: st.level, hasCooked, roll })) return false;
    const seat = freeSeat(st.furniture, this.seatBusy);
    this.releaseFromQueue(c);
    if (seat) {
      this.seatCustomer(c, seat);
    } else {
      // GĐ1492 — chưa có ghế: đứng né sang một bên chỗ trả tiền, chờ ghế trống trong kiên nhẫn
      c.state = 'toSeat';
      c.say('🪑', 2.5);
      this.walk(c, counter.pay.clone().add(new THREE.Vector3(0, 0, 0.9)));
    }
    return true;
  }

  /** GĐ1491 — giữ ghế cho khách, dẫn đi ngồi; ăn xong trả ghế, trả tip (GĐ1492) rồi ra về. */
  private seatCustomer(c: Customer, seat: SeatInfo) {
    const chair = useGame.getState().furniture.find((f) => f.uid === seat.chairUid);
    if (!chair) return false;
    // Tip tính theo số giây đã chờ ghế (GĐ1511: 2 nấc) — khoá ngay lúc ngồi
    const waitedSec = c.diningWait;
    this.seatBusy.add(seat.chairUid);
    c.seat = seat;
    c.state = 'toSeat';
    this.walk(c, this.shop.local(chair.x, chair.z));
    c.plan = [
      () => {
        c.pause = EAT_SECONDS;
        c.state = 'dining';
        c.say('😋', 3);
      },
      () => {
        if (c.seat) this.seatBusy.delete(c.seat.chairUid);
        c.seat = undefined;
        // GĐ1492 — tip = 10% tiền món tươi (chờ ghế lâu thì còn 60%): tiền sạch vào két + sổ ngày
        const freshTotal = c.basket.filter((it) => COOKED_PRODUCT_IDS.has(it.id)).reduce((n, it) => n + it.price, 0);
        const lv = useGame.getState().level;
        const menuN = [...stockedProductIds(useGame.getState().furniture)].filter((id) => COOKED_PRODUCT_IDS.has(id)).length;
        const tip = Math.round(dineTip(freshTotal, waitedSec) * menuTipMul(lv, menuN)); // GĐ1536
        if (tip > 0) {
          earnTip(tip);
          this.coinFx.spawn(c.mesh.position, tip);
          c.say(`+ ${formatMoney(tip)} tip`, 2.5);
        }
        // GĐ1494 — ăn xong nhường ghế rồi mới nghĩ chuyện vệ sinh (ghế không bị giữ khi đi toilet)
        const need = this.toiletNeed(c);
        if (need === 'handled') return;
        this.leave(c, need === 'happy', true);
      },
    ];
    return true;
  }

  /**
   * GĐ1494 — sau bữa ăn ~20% khách có nhu cầu vệ sinh: ghé bồn trống (4 giây, trả phí) rồi ra về.
   * Không có bồn: dưới mốc nghiêm ngặt thì khách ra về bình thường; siêu thị lớn mà thiếu bồn
   * thì khách nổi giận (tính mất khách vì chờ). Trả 'handled' nếu đã tự dựng lối ra của riêng mình.
   */
  private toiletNeed(c: Customer): 'handled' | 'happy' | 'angry' {
    const s = useGame.getState();
    if (simRng()() >= TOILET_NEED_CHANCE) return 'happy';
    const toilet = freeToilet(s.furniture, this.toiletBusy);
    if (toilet) {
      const toiletUid = toilet.uid;
      const fee = toiletFee(toilet.type);
      this.toiletBusy.add(toiletUid);
      c.say('💧', 2.5);
      this.walk(c, this.shop.spotFor(toilet));
      c.plan = [
        () => {
          c.pause = TOILET_USE_SECONDS;
          c.state = 'dining';
        },
        () => {
          this.toiletBusy.delete(toiletUid);
          if (fee > 0) {
            earnService(undefined, fee);
            this.coinFx.spawn(c.mesh.position, fee);
          }
          this.leave(c, true, true);
        },
      ];
      return 'handled';
    }
    if (s.level < TOILET_STRICT_UNLOCK) {
      c.say('💧', 2);
      return 'happy';
    }
    c.say('😠 Không có nhà vệ sinh!');
    s.noteMiss('wait');
    return 'angry';
  }

  /**
   * GĐ1492 — khách đang đứng chờ ghế ('toSeat' chưa có ghế): đếm kiên nhẫn, ghế vừa trống
   * thì dẫn đi ngồi, quá mốc thì bỏ về buồn (ghi mất khách vì chờ, không tip).
   */
  private updateSeatWaiting(c: Customer, gameDt: number) {
    const s = useGame.getState();
    c.diningWait += gameDt;
    if (c.diningWait > DINE_WAIT_SECONDS) {
      c.say('😠 Chờ mãi không có chỗ!');
      s.noteMiss('wait');
      // GĐ1502 — chẩn đoán nút thắt ĐÚNG LÚC (một lần mỗi ván): khách bỏ về vì hết chỗ
      // thì dạy ngay việc cần làm, thay vì để người chơi tự mò số liệu (tham khảo khu eat-in).
      if (!s.dineSeatHinted) {
        useGame.setState({ dineSeatHinted: true });
        s.notify('🪑 Khách chờ mãi không có chỗ ngồi — mua thêm Bàn ăn và Ghế ở 🛠️ Xây dựng!');
      }
      this.leave(c, false, true);
      return;
    }
    const seat = freeSeat(s.furniture, this.seatBusy);
    if (seat) this.seatCustomer(c, seat);
  }

  /** Sau lần mua hài lòng: khách quen đủ thân có thể nhờ giữ một món ưa thích đến ngày mai. */
  private maybeReserve(c: Customer, counter: Counter) {
    const st = useGame.getState();
    const reg = c.regular!;
    const rng = simRng();
    // Có trạm nấu rồi thì khách quen còn đặt trước suất ngon ("mai ghé lấy, chú nấu sẵn nhé")
    const stations = new Set(st.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type));
    const cookable = stations.size ? RECIPES.filter((r) => r.unlock <= st.level && stations.has(r.station)).map((r) => r.outputId) : [];
    const ask = reserveAsk(reg, st.regulars[reg.id], st.level, !!st.reservations[reg.id], rng, cookable);
    if (!ask || askPending()) return;
    const name = productById(ask.productId).name;
    const cooked = COOKED_PRODUCT_IDS.has(ask.productId);
    const accept = () => useGame.getState().addReservation(reg.id, ask.productId, ask.qty);
    if (!this.playerAtCounter(counter)) {
      // Không có ai ở quầy: khách để lời nhắn, tiệm nhận luôn (mai không giữ được thì khách phật ý)
      accept();
      c.say('🤝', 3);
      return;
    }
    c.say('🤝', 3);
    askAtCounter({
      icon: '🤝', who: reg.name,
      text: cooked
        ? `mai cháu ghé, chú nấu sẵn giúp ${ask.qty} ${name} nhé? (nấu ở trạm rồi bày lên kệ, giữ đúng hẹn thì thân hơn)`
        : `mai cháu ghé, chú giữ giúp ${ask.qty} ${name} nhé? (giữ đúng thì thân hơn, hẹn mà không mua được thì phật ý)`,
      options: ['🤝 Giữ giúp', 'Không giữ được'], fallback: 0,
      expiresAt: st.minutes + ASK_MINUTES,
      resolve: (choice) => { if (choice === 0) accept(); },
    });
  }

  /** Quyết định chuyện ở quầy một lần cho mỗi khách; người chơi đứng quầy thì hỏi, không thì tự chọn mặc định. */
  private counterDeal(c: Customer, counter: Counter): Deal | 'waiting' {
    if (c.deal) return c.deal;
    if (!c.basket.length) return (c.deal = { kind: 'none', amount: 0, choice: 0 });
    const st = useGame.getState();
    const total = c.basket.reduce((n, it) => n + it.price, 0);
    const reg = c.regular;
    let ask: { kind: Deal['kind']; amount: number; icon: string; who: string; text: string; options: string[]; fallback: number } | null = null;
    if (reg && st.allowCredit && st.level >= CREDIT_UNLOCK && !st.debts[reg.id]?.reminded
      && wantsCredit(reg, st.regulars[reg.id], st.debts[reg.id], total, simRng()())) {
      const owed = st.debts[reg.id]?.amount ?? 0;
      ask = {
        kind: 'credit', amount: total, icon: '📒', who: reg.name,
        text: creditAskText(total, owed, creditLeft(st.regulars[reg.id], st.debts[reg.id])),
        options: ['📒 Cho ghi sổ', 'Không cho nợ'], fallback: 0,
      };
    // GĐ734 — kèo trả góp: nợ cũ đến hạn (kể từ hôm qua trở về trước) + đủ lớn + chủ đứng quầy
    // (bài học GĐ722: autoplay không trả lời được thì KHÔNG rút rng — dòng mô phỏng giữ nguyên từng nhịp)
    } else if (reg && st.debts[reg.id] && (st.debts[reg.id]!.since < st.day) && st.debts[reg.id]!.amount >= DEBT_PARTIAL_MIN
      && this.playerAtCounter(counter) && simRng()() < DEBT_PARTIAL_CHANCE) {
      const debt = st.debts[reg.id]!;
      const now = installmentNow(debt.amount);
      ask = {
        kind: 'installment', amount: now, icon: '🤲', who: reg.name,
        text: `xin trả góp: "Tiệm nhận ${formatMoney(now)} trước hôm nay, phần còn lại ${formatMoney(debt.amount - now)} trả trong 7 ngày nhé?"`,
        options: [`🤲 Chấp nhận (nhận ${formatMoney(now)})`, 'Đòi đủ một lần'], fallback: 1,
      };
    // GĐ722: khách quen cũng mặc cả NHƯNG chỉ khi chủ đứng quầy — từ chối bà con là lựa chọn có chủ ý của người chơi,
    // không bao giờ là tai nạn autoplay (không ai ở quầy thì không rút rng — dòng mô phỏng giữ nguyên từng nhịp)
    } else if (st.level >= HAGGLE_UNLOCK && total >= HAGGLE_MIN_TOTAL && (!reg || this.playerAtCounter(counter)) && simRng()() < (reg ? HAGGLE_CHANCE_REG : HAGGLE_CHANCE)) {
      const off = haggleOff(total);
      const counterOff = haggleCounterOff(total);
      ask = {
        kind: 'haggle', amount: off, icon: '🗣️', who: c.profession?.name ?? reg?.name ?? 'Khách',
        text: reg
          ? `mặc cả: "Bà con quen rồi, bớt ${formatMoney(off)} cho nhẹ đi nhé!"`
          : `mặc cả: "${formatMoney(total)} hả? Bớt ${formatMoney(off)} đi cô/chú!"`,
        // GĐ721: thêm nút "trả giá lại" — bớt nửa mức khách xin; khách có thể gật giá giữa (thương lượng thật)
        options: [`🤝 Bớt ${formatMoney(off)}`, `💬 Trả nửa (−${formatMoney(counterOff)})`, 'Giá đúng rồi'], fallback: 2,
      };
    } else if (!reg && st.biz.rival && st.level >= HAGGLE_UNLOCK && total >= 10_000 && this.playerAtCounter(counter)) {
      // GĐ725 — kèo khớp giá: khách soi thấy rival bán rẻ món trong giỏ. Chỉ khi chủ đứng quầy (bài học GĐ722:
      // autoplay không trả lời được thì KHÔNG rút rng — dòng mô phỏng giữ nguyên từng nhịp).
      const gap = rivalPriceGap(st.biz.rival, (id) => st.priceOf(id), st.day, c.basket.map((it) => it.id));
      if (gap > 0) {
        const rivalName = st.biz.rival.name;
        ask = {
          kind: 'pricematch', amount: gap, icon: '🏷️', who: c.profession?.name ?? 'Khách',
          text: `soi giá: "Bên ${rivalName} bán rẻ hơn ${formatMoney(gap)} kìa — khớp giá giúp mình không?"`,
          options: [`🏷️ Khớp giá (−${formatMoney(gap)})`, 'Giữ giá của tiệm'], fallback: 1,
        };
      }
      // gap 0 (vignette không trúng) → rơi qua nhánh tiền lẻ như thường
    } else if (st.level >= CHANGE_UNLOCK && oddChange(total) && simRng()() < CHANGE_CHANCE) {
      const odd = oddChange(total);
      ask = {
        kind: 'change', amount: total % 5000, icon: '🪙', who: reg?.name ?? 'Khách',
        text: `đưa tờ chẵn, két thiếu ${formatMoney(odd)} tiền lẻ để thối`,
        options: [`Bớt luôn ${formatMoney(total % 5000)} cho tròn`, '🍬 Thối bằng kẹo'], fallback: 0,
      };
    }
    // GĐ61 "Chính sách quầy": nếu chủ đã chọn thái độ mặc cả/tiền lẻ (≠ 'ask') thì tự chốt đúng
    // option trong câu hỏi ngay — KHÔNG tạo prompt, KHÔNG qua askPending/'waiting', KHÔNG gọi askAtCounter.
    // Mặc định 'ask' → bỏ qua, giữ nguyên prompt path hôm nay. Flow runtime-local, không action mới.
    if (ask && (ask.kind === 'haggle' || ask.kind === 'change')) {
      const policy = st.counterPolicy ?? defaultCounterPolicy();
      const pc = ask.kind === 'haggle' ? haggleChoice(policy, total) : changeChoice(policy, total);
      if (pc !== null) return (c.deal = { kind: ask.kind, amount: ask.amount, choice: pc });
      // GĐ1253 — có thu ngân đang trực ở quầy thì THU NGÂN tự quyết theo tay nghề (random có trọng số
      // theo sao — cashierHaggleChoice/cashierChangeChoice), KHÔNG dừng game hỏi chủ. Người dùng phản
      // ánh: đã thuê nhân viên rồi mà khách mặc cả vẫn bị hỏi giữa chừng. Chốt NGAY (không prompt),
      // rút từ DÒNG RIÊNG cashierRng — không dịch chuỗi kinh tế chính (Nguyên tắc c, GĐ722 an toàn vì
      // kết quả áp dụng tức thì). Người chơi tự đứng quầy mà KHÔNG có thu ngân → giữ nguyên được hỏi.
      const skill = this.dutyCashierSkill(counter);
      if (skill > 0) {
        const choice = ask.kind === 'haggle' ? cashierHaggleChoice(skill, cashierRng()) : cashierChangeChoice(skill, cashierRng());
        return (c.deal = { kind: ask.kind, amount: ask.amount, choice, cashier: true });
      }
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
    if (!partner || simRng()() >= COMBO_PULL) return;
    c.wants.push(partner);
    let shelfUid: number | undefined;
    c.plan.unshift(
      () => {
        const shelf = this.shelfWith(partner);
        shelfUid = shelf?.uid;
        if (shelf) this.walk(c, this.shop.spotFor(shelf, (simRng()() - 0.5) * 0.8));
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
    const staffed = this.shop.counters().some((ct) => this.cashierSpeed(ct) > 0);
    // GĐ1211 — tách P(bắt trộm) thành helper THUẦN (theftCatchChance, cùng hằng/công thức):
    // dog + camera + (guard ? 0.92 : (cashier?0.55:0.1) + sharpEye?0.3) — hành vi GIỮ NGUYÊN.
    const chance = theftCatchChance({
      hasDog: petActive(st.biz.pets.dog, st.day),
      hasCamera: hasUpgrade(st.biz, 'camera'),
      guardOnDuty: this.guardOnDuty(),
      cashierStaffed: staffed,
      hasSharpEye: hasSkill(st.skills, 'sharp_eye'),
    });
    const value = c.basket.reduce((n, it) => n + it.price, 0);
    const caught = simRng()() < chance;
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
    if (st.level < r.unlock || total < r.notes[0] || simRng()() >= r.chance) return;
    const notes = r.notes.filter((n) => n <= total);
    const note = notes[Math.floor(simRng()() * notes.length)];
    st.recordCounterfeit(note, simRng()() < r.detect + (hasSkill(st.skills, 'sharp_eye') ? r.sharpEyeBonus : 0));
  }

  private leave(c: Customer, happy: boolean, paid = happy) {
    const st = useGame.getState();
    st.recordVisit(happy, sampleVisit({
      // Giá trên giỏ thấp hơn giá niêm yết là lô cận hạn tự giảm giá
      bought: paid ? c.basket.map((it) => ({ id: it.id, nearExpiry: it.price < st.priceOf(it.id) })) : [],
      priceMisses: c.missed.filter((m) => m.why === 'price').length,
      stockMisses: c.missed.filter((m) => m.why === 'stock').length,
      walkedOut: !paid && c.basket.length > 0,
      waitedMinutes: c.waitedMinutes,
      patience: c.patience,
      dirt: st.dirt / DIRT_MAX,
    }));
    // Nhân khẩu học (GĐ62): mỗi lượt khách vãng lai ghi nghề (khách quen profession=null) + có bỏ về không
    if (c.profession) st.tallyDemographics(c.profession.id, { visits: 1, walkouts: paid ? 0 : 1 });
    if (c.regular && !happy) useGame.getState().regularVisit(c.regular.id, c.basket, false, c.missed.find((m) => m.why === 'stock' || m.why === 'price'));
    this.review(c, happy);
    this.releaseFromQueue(c);
    // GĐ1491 — rời tiệm giữa chừng (bất kể đường nào) thì nhường ghế ăn lại
    if (c.seat) {
      this.seatBusy.delete(c.seat.chairUid);
      c.seat = undefined;
    }
    c.state = 'leaving';
    c.plan = [() => this.walk(c, this.shop.doorOutside), () => this.walk(c, new THREE.Vector3(c.exitX, 0, SIDEWALK_Z))];
    this.walk(c, this.shop.doorInside);
  }

  /**
   * GĐ1491 — rút khách khỏi hàng chờ quầy (nếu đang xếp) và cho những người phía sau dịch lên.
   * Tách khỏi leave() để khách đi ăn tại chỗ cũng nhường hàng ngay khi vừa trả tiền xong.
   */
  private releaseFromQueue(c: Customer) {    const queue = c.counterKey ? this.queues.get(c.counterKey) : undefined;
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
  }

  /** GĐ1492 — khách đã xong việc trong tiệm (đi ra ngoài được): chờ ghế ăn tại chỗ thì chưa tính. */
  private isGone(c: Customer) {
    if (c.state === 'queued') return false;
    if (c.wholesale && c.offered) return false;
    if (c.state === 'toSeat' && !c.seat) return false;
    return c.idle;
  }

  /** Khách chấm sao: mỗi món không mua được −1, chờ lâu −1; bỏ về thì chê đúng lý do. */
  private review(c: Customer, paid: boolean) {
    if (simRng()() > REVIEW_CHANCE) return;
    const st = useGame.getState();
    const firstMiss = c.missed[0];
    if (!paid) {
      // Bỏ về: hoặc chờ quá lâu ở quầy, hoặc không mua được món nào
      const reason: ReviewReason = c.basket.length ? 'wait' : firstMiss?.why ?? 'stock';
      return st.addReview(c.basket.length ? 1 : 1 + Math.floor(simRng()() * 2), reason, reason === 'wait' ? undefined : firstMiss?.id);
    }
    // GĐ1216: số sao khách chấm (mỗi món hỏng −1, chờ nửa patience −1) tách ra helper THUẦN — cùng công thức.
    const stars = reviewStars(c.missed.length, c.waitedMinutes, c.patience);
    if (stars <= 2 && firstMiss) return st.addReview(stars, firstMiss.why, firstMiss.id);
    const priciest = [...c.basket].sort((a, b) => b.price - a.price)[0];
    st.addReview(stars, undefined, priciest?.id);
  }

  private walk(c: Customer, target: THREE.Vector3) {
    c.path = this.pathTo(c.position, target);
  }

  private pathTo(from: THREE.Vector3, to: THREE.Vector3) {
    const path = this.grid.findPath(from, to);
    return path.length ? path : this.grid.approach(from, to);
  }

  /** Kệ có món hàng này; không có thì một kệ cùng ngành hàng (khách đi tìm rồi thất vọng).
   *  Nhiều kệ cùng món: khách tới kệ dễ thấy hơn. */
  private shelfWith(productId: string) {
    const shelves = useGame.getState().furniture.filter((f) => furnitureDef(f.type).tiers > 0);
    const having = shelves.filter((f) => !f.broken && f.tiers.some((t) => t.productId === productId && t.count > 0));
    if (having.length === 1) return having[0];
    if (having.length > 1) {
      const attention = shelfAttention(shelves, this.geom());
      return weightedPick(having, (f) => attention.get(f.uid) ?? 1, simRng());
    }
    const sameKind = shelves.filter((f) => furnitureDef(f.type).categories.includes(productById(productId).category));
    return pick(sameKind.length ? sameKind : shelves);
  }

  /** Người bán rong đi vào tới quầy chính, đưa đề nghị lấy sỉ rồi đứng chờ. */
  private spawnVendor() {
    const startX = simRng()() < 0.5 ? -EDGE_X : EDGE_X;
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

  /**
   * GĐ1498 — nhà phê bình ẩm thực: tối đa 1 lần/ngày (rng dòng RIÊNG metaRng — không dịch
   * chuỗi kinh tế chính). Giai đoạn nhẹ (cấp 30+): gọi món đã mở, phục vụ kịp thì thưởng,
   * hụt thì chỉ nhắc. Giai đoạn nghiêm ngặt (cấp 45+): gọi BẤT KỲ món nào trong toàn game,
   * phục vụ kịp thưởng lớn, hụt hẹn ăn mấy đánh giá 1★ (tiếng xấu đồn trong hẻm).
   */
  private updateCritic(s: ReturnType<typeof useGame.getState>) {
    if (s.level < CRITIC_UNLOCK) return;
    if (this.criticRolledDay !== s.day) {
      this.criticRolledDay = s.day;
      this.criticAt = metaRng() < CRITIC_CHANCE ? 8 * 60 + Math.floor(metaRng() * 12 * 60) : null;
    }
    // Đang có lời hẹn phục vụ: món vừa được bày lên kệ thì chiếu đãi ngay, hết khung thì trượt hẹn
    if (this.criticProduct) {
      const served = s.furniture.some((f) => !f.broken && f.tiers.some((t) => t.productId === this.criticProduct && t.count > 0));
      if (served) {
        const reward = criticReward(this.criticHard);
        useGame.setState({ money: s.money + reward, totals: { ...s.totals, revenue: s.totals.revenue + reward } });
        s.notify(`🌟 Nhà phê bình khen ${productById(this.criticProduct).name}! +${formatMoney(reward)}`);
        for (let i = 0; i < criticPraiseReviews(this.criticHard); i++) s.addReview(5, undefined, this.criticProduct);
        playSfx('gift');
        this.criticProduct = null;
        return;
      }
      if (s.minutes > this.criticUntil) {
        if (this.criticHard) {
          for (let i = 0; i < CRITIC_PENALTY_REVIEWS; i++) s.addReview(1, 'stock', this.criticProduct);
          s.notify(`😠 Nhà phê bình hụt hẹn về ${productById(this.criticProduct).name}!`);
        } else {
          s.notify(`😅 Nhà phê bình không thấy ${productById(this.criticProduct).name}, bỏ về.`);
        }
        this.criticProduct = null;
        return;
      }
      return; // còn trong khung chờ phục vụ
    }
    // Ghé lần đầu trong ngày: đặt lời gọi món (chỉ khi tiệm đang mở)
    if (this.criticAt == null || !s.shopOpen || s.minutes < this.criticAt) return;
    this.criticHard = s.level >= CRITIC_HARD_UNLOCK;
    const stations = new Set<string>(s.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type));
    this.criticProduct = pickCriticDish(RECIPES, s.level, this.criticHard, (r) => stations.has(r.station) && criticCookFits(r.durationMin) && !offSeason(r.outputId, s.day));
    this.criticUntil = s.minutes + CRITIC_WINDOW_MINUTES;
    this.criticAt = null;
    const st = RECIPES.find((r) => r.outputId === this.criticProduct && stations.has(r.station))?.station;
    s.notify(criticCallText(productById(this.criticProduct).name, st ? furnitureDef(st).name : null, CRITIC_WINDOW_MINUTES));
    playSfx('door');
  }

  /** Xoá hết khách (sang ngày mới). */
  reset() {
    clearAsk();
    for (const c of this.customers) {
      this.scene.remove(c.mesh);
      c.dispose();
    }
    this.customers = [];
    this.queues.clear();
    this.checkoutProgress.clear();
    this.seatBusy.clear();
    this.machineBusy.clear();
    this.toiletBusy.clear();
    this.criticProduct = null;
    this.criticAt = undefined;
    this.criticRolledDay = -1;
    this.regularsToday = [];
    this.friendsBurst = 0;
    this.festivalToday = false;
    this.vendorAt = undefined;
  }
}
