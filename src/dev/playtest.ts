import { useGame } from '../core/store';
import { furnitureDef, FURNITURE, isCookStation } from '../data/furniture';
import { festivalOn } from '../data/calendar';
import { RECIPES, COOKED_PRODUCT_IDS, COOK_UNLOCK } from '../data/recipes';
import { productById, unlockedProducts } from '../data/products';
import { SHOP_TIERS } from '../data/shopTiers';
import { maxStaff } from '../data/staff';
import { startCounter } from '../core/biz';
import { BRANCH_SHIFTS, CONVENIENCE } from '../data/branches';
import { QUAN_NUOC_HIRE_FEE, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_UNLOCK, quanNuocDrinkIds } from '../data/quanNuoc';
import {
  ANIMALS, ANIMAL_ORDER, CROPS, EGG_PER_TRAY, GARDEN_UNLOCK, LAND_TIERS, animalMode, fattenReady, inSeason, penCap, plotReady,
} from '../data/garden';
import { ACCEPT_WINDOW, ONLINE_OPEN_COST, ONLINE_UNLOCK } from '../data/online';
import type { CounterTactic } from '../data/biz';
import type { CustomerManager } from '../agents/customers';
import type { StaffManager } from '../agents/staff';
import type { Player } from '../agents/player';
import type { GroceryShop } from '../shop/groceryShop';

/**
 * Playtest dài (7–10+ ngày mô phỏng): một "người chơi máy" chơi nhiều ngày liền và ghi số liệu nhịp chơi
 * trên TOÀN BỘ hệ thống — bán quầy, đơn nấu/VIP qua điện thoại, giỏ quà lễ, phản công đối thủ, trang trại
 * (tưới/cho ăn/thu/gom trứng sữa/xuất heo), chi nhánh 24/7 (mở, tuyển ca, nhận đơn đêm), đơn app online
 * (nhận mọi đơn khi kho đủ, thiếu thì nhập bù nếu rẻ), quán nước đầu ngõ (mở quán, tuyển đủ người,
 * nhập đồ uống giữ kho luôn đủ ~150 ly) và giữ một mẻ nấu chạy khi có trạm.
 * Gọi từ console: game.playtest(10) (trả về Promise — await để lấy { rows, summary }). In bảng mỗi ngày
 * + bảng tổng kết cuối kỳ; giữa các ngày nhả main thread để trình duyệt/automation không bị chặn.
 */

const BASKET_PREFIX = 'gio_qua_';
/** Nhập bù hàng thiếu cho một đơn app chỉ khi tiền hàng dưới ngưỡng này; đắt quá thì từ chối chủ động. */
const ONLINE_RESTOCK_MAX = 150_000;
/** Khoản tiền mặt giữ lại khi chi cho hệ lớn (mở app, mở chi nhánh). */
const CASH_BUFFER = 2_000_000;
/** Khoản tiền mặt giữ lại cho việc trại hằng ngày (giống, cám, mua con). */
const FARM_BUFFER = 300_000;
/** Mục tiêu tổng ĐỒ UỐNG trong kho cho quán nước (ly): đủ bán một ngày đông khách mà không ôm vốn quá nhiều. */
const QUAN_DRINK_TARGET = 150;

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
  /** Số đơn app giao tới tay khách hôm nay (kể cả giao đêm ở chi nhánh). */
  onlineDone: number;
  /** Số sản phẩm trại thu hoạch hôm nay. */
  farmHarvest: number;
  /** Doanh thu chi nhánh tới 21h30 hôm nay (đoạn bán đêm nằm sẵn trong tổng doanh thu ngày). */
  branchRevenue?: string;
  /** Doanh thu quán nước hôm qua (endDay chạy mô phỏng bán theo ngày; ẩn khi quán chưa mở). */
  quanRev?: string;
  /** Đối thủ đang cạnh tranh / đợt phản công đã chạy hôm nay / sức mạnh đối thủ (0–100). */
  rival: boolean;
  counter?: CounterTactic;
  rivalStrength?: number;
}

/** Bảng tổng kết cuối kỳ — đọc được từ console: game.playtest(10).summary */
export interface PlaytestSummary {
  /** Số ngày mô phỏng trong đợt chạy. */
  days: number;
  /** Cấp và tiền mặt cuối kỳ. */
  level: number;
  money: number;
  /** Tổng doanh thu/lãi cả kỳ (đ) và trung bình mỗi ngày. Lãi = doanh thu − chi − lương − tiền nhà. */
  revenue: number;
  profit: number;
  revenuePerDay: number;
  profitPerDay: number;
  /** Số đơn app giao tới tay khách cả kỳ. */
  onlineDelivered: number;
  /** Số sản phẩm trại thu hoạch cả kỳ. */
  farmHarvest: number;
  /** Tổng doanh thu chi nhánh đóng góp cả kỳ (chỉ tính phần tới 21h30 mỗi ngày). */
  branchRevenue: number;
  /** Tổng doanh thu quán nước cả kỳ (bán đồ uống rút từ kho chung, mô phỏng trong endDay). */
  quanRevenue: number;
  /** Ngày bắt đầu đo được từng hệ: mở app / mở chi nhánh / mở quán nước / ngày đầu trại thu hoạch (0 = cả kỳ chưa có). */
  onlineDay: number;
  branchDay: number;
  quanDay: number;
  farmDay: number;
}

export interface PlaytestResult {
  rows: PlaytestRow[];
  summary: PlaytestSummary;
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

  // ── Bán online qua app ──

  /** Mở gian hàng app khi đủ cấp và còn thừa tiền mặt; trả true nếu vừa mở xong. */
  function maybeOpenOnline(): boolean {
    const s = st();
    if (s.online.open || s.level < ONLINE_UNLOCK) return false;
    if (s.money > ONLINE_OPEN_COST + CASH_BUFFER) return s.openOnline();
    return false;
  }

  // ── Chi nhánh tiện lợi 24/7 ──

  /** Mở chi nhánh khi đủ cấp và tiền mặt dư khá nhiều (mua đứt 5 triệu + vốn hàng); trả true nếu vừa mở. */
  function maybeOpenBranch(): boolean {
    const s = st();
    if (s.branch || s.level < CONVENIENCE.unlock) return false;
    if (s.money > CONVENIENCE.openCost + CASH_BUFFER * 2) return s.openBranch();
    return false;
  }

  /** Chi nhánh: tuyển đủ 3 ca (ưu tiên thu ngân để mở được cửa) rồi bật cửa, có app thì nhận đơn đêm. */
  function branchStaffUp() {
    const s = st();
    if (!s.branch || s.branch.staff.length >= CONVENIENCE.maxStaff) return;
    const crew = s.branch.staff;
    const want: ('cashier' | 'courier' | 'stocker' | 'guard' | 'manager')[] = [];
    for (let i = crew.filter((x) => x.role === 'cashier').length; i < 3; i++) want.push('cashier');
    if (!crew.some((x) => x.role === 'courier')) want.push('courier');
    if (!crew.some((x) => x.role === 'stocker')) want.push('stocker');
    if (!crew.some((x) => x.role === 'guard')) want.push('guard');
    if (!crew.some((x) => x.role === 'manager')) want.push('manager');
    for (const role of want) {
      const now = st();
      const c = now.candidates.find((x) => x.role === role);
      if (!c || !now.branch || now.branch.staff.length >= CONVENIENCE.maxStaff) break;
      // Xoay ca theo thứ tự vào việc: người vào trước nhận ca sáng, sau đó chiều, đêm
      now.hireForBranch(c.id, BRANCH_SHIFTS[now.branch.staff.length % BRANCH_SHIFTS.length]);
    }
    const s2 = st();
    if (s2.branch && !s2.branch.open && s2.branch.staff.some((x) => x.role === 'cashier')) s2.toggleBranch();
    if (s2.branch?.open && s2.online.open && !s2.branch.nightDelivery && s2.branch.staff.some((x) => x.role === 'courier')) {
      s2.toggleNightDelivery();
    }
  }

  // ── Quán nước đầu ngõ ──

  /**
   * Mở quán nước khi đủ cấp và tiền mặt dư khá nhiều (mua đứt mặt bằng 25 triệu); trả true nếu vừa mở.
   * Mức giá quán giữ mặc định 'vua' (newQuanNuoc) — bot cố tình không đổi: số đo kinh tế quán phải phản
   * chiếu đúng một biến độc lập (mở quán/tuyển người/nhập hàng); thử nghiệm mức 're'/'cao' dành cho
   * người chơi thật qua panel Quán Nước.
   */
  function maybeOpenQuanNuoc(): boolean {
    const s = st();
    if (s.biz.quanNuoc.open || s.level < QUAN_NUOC_UNLOCK) return false;
    if (s.money > QUAN_NUOC_PRICE + CASH_BUFFER * 2) return s.buyQuanNuoc();
    return false;
  }

  /** Quán nước: tuyển dần tới đủ tối đa 3 người (khách ghé đông hơn) — phí tuyển rẻ, dư tiền là tuyển ngay. */
  function quanNuocStaffUp() {
    while (
      st().biz.quanNuoc.open
      && st().biz.quanNuoc.staff < QUAN_NUOC_MAX_STAFF
      && st().money > QUAN_NUOC_HIRE_FEE + FARM_BUFFER
    ) {
      if (!st().hireQuanNuoc()) break;
    }
  }

  /**
   * Quán nước rút ĐỒ UỐNG từ kho chung: thiếu so với mục tiêu thì nhập bù món drink rẻ nhất đã mở
   * (đồ uống là hàng hoá bình thường, mua qua st().buy như mọi món khác). Các món drink là MÓN NẤU
   * (tra_sua, sinh_to, cà phê... nằm trong COOKED_PRODUCT_IDS) không nhập được — bot đừng mua, luồng
   * ensureCook có sẵn giữ mẻ chạy sẽ tự sản sinh phần đó khi tiệm có trạm pha chế/xay.
   */
  function restockQuanNuoc() {
    const s = st();
    if (!s.biz.quanNuoc.open) return;
    const drinks = quanNuocDrinkIds(s.level);
    const lack = QUAN_DRINK_TARGET - drinks.reduce((n, id) => n + (s.storage[id] ?? 0), 0);
    if (lack <= 0) return;
    const cheap = drinks.filter((id) => !COOKED_PRODUCT_IDS.has(id))
      .sort((a, b) => productById(a).buy - productById(b).buy)[0];
    // Nhà kho đầy thì buy tự chối — vòng 150 tick sau nhập lại, không cần xử lý riêng
    if (cheap && st().money > FARM_BUFFER) st().buy(cheap, lack);
  }

  // ── Trang trại ──

  /** Việc trại đầu ngày: mở đất, trồng luống trống, tưới luống khô, mua cám + cho ăn, gom trứng/sữa,
   *  xuất heo/gà Đông Tảo đủ ngày, dọn cành, giao đơn quán xóm khi đủ nông sản nhà trồng. */
  function farmChores() {
    const s = st();
    if (s.level < GARDEN_UNLOCK) return;
    // Mở đất khi đủ cấp và thừa tiền (đất rộng thêm luống + chỗ nuôi)
    const tier = LAND_TIERS[s.garden.land + 1];
    if (tier && s.level >= tier.unlock && s.money > tier.cost * 1.5) s.expandFarm();
    // Thu luống đã chín trước (cây lâu năm hạ về đầu chu kỳ, luống thường trống lại để trồng mới)
    for (let i = 0; i < st().garden.plots.length; i++) {
      if (plotReady(st().garden.plots[i])) st().harvestPlot(i);
    }
    // Trồng luống trống: ưu tiên cây đúng mùa vụ, lấy cây mới nhất mà tiền giống trả được
    const plantable = CROPS.filter((c) => c.unlock <= s.level && (!c.season || inSeason(c, s.day)));
    for (let i = 0; i < st().garden.plots.length; i++) {
      const plot = st().garden.plots[i];
      if (plot.crop) continue;
      const crop = [...plantable].reverse().find((c) => st().money - c.seedCost > FARM_BUFFER);
      if (!crop) break;
      st().plantCrop(i, crop.id);
    }
    // Tưới cả vườn một lượt (mưa thì trại tự biết khỏi tưới)
    st().waterGarden();
    // Vật nuôi: mua dần theo cấp khi dư tiền; cho ăn đủ (thiếu cám thì nhập bù giá chuẩn),
    // gom trứng đủ vỉ/sữa, xuất chuồng lứa đã béo
    for (const kind of ANIMAL_ORDER) {
      const now = st();
      const def = ANIMALS[kind];
      const pen = now.garden.pens[kind];
      if (pen?.count) {
        const bags = Math.ceil((pen.count * def.feedKgPerDay) / def.feedBagKg) + 1;
        const have = now.storage[def.feedProduct] ?? 0;
        if (have < bags && now.money > FARM_BUFFER) now.buy(def.feedProduct, bags - have);
        now.feedPen(kind);
        const after = st().garden.pens[kind]!;
        const mode = animalMode(def);
        if (mode === 'fatten') {
          if (fattenReady(kind, after)) st().sellFattened(kind);
        } else if (mode === 'milk') {
          if (after.pending > 0) st().collectPen(kind);
        } else if (after.pending >= EGG_PER_TRAY) {
          st().collectPen(kind);
        }
      } else if (
        s.level >= def.unlock && s.garden.land >= def.landTier
        && penCap(s.garden.land, kind) > (pen?.count ?? 0)
        && st().money > def.price * 4 + FARM_BUFFER
      ) {
        st().buyAnimal(kind);
      }
    }
    // Dọn cỏ cành rụng lấy gỗ/đá, giao đơn quán xóm khi kho và nhãn nhà trồng đều đủ
    if (st().garden.debris > 0) st().cleanupFarm();
    const order = st().garden.farmOrder;
    if (order && order.items.every((it) => (st().storage[it.productId] ?? 0) >= it.qty && (st().garden.homegrown[it.productId] ?? 0) >= it.qty)) {
      st().deliverFarmOrder();
    }
  }

  // ── Nấu ──

  /** Giữ luôn một mẻ nấu chạy khi có trạm: hết mẻ thì chọn món nấu được, thiếu nguyên liệu giá rẻ thì nhập bù. */
  function ensureCook() {
    const s = st();
    if (s.cookJobs.length || s.level < COOK_UNLOCK) return;
    const stations = new Set(s.furniture.filter((f) => isCookStation(f.type)).map((f) => f.type));
    if (!stations.size) return;
    const recipes = RECIPES.filter((r) => !r.festival && r.unlock <= s.level && stations.has(r.station));
    for (const r of recipes) {
      const missing = r.inputs.filter((inp) => (st().storage[inp.productId] ?? 0) < inp.quantity);
      const cost = missing.reduce((n, inp) => n + inp.quantity * productById(inp.productId).buy, 0);
      if (cost && st().money < cost + 500_000) continue;
      for (const inp of missing) st().buy(inp.productId, inp.quantity - (st().storage[inp.productId] ?? 0));
      if (st().startCook(r.id)) return;
    }
  }

  const money = (v: number) => `${Math.round(v / 1000)}k`;

  return async function playtest(days: number): Promise<PlaytestResult> {
    const rows: PlaytestRow[] = [];
    // Xoay vòng 3 chiến thuật phản công khi có đối thủ, để đo cả ba qua đợt chơi dài
    const tactics: CounterTactic[] = ['price', 'ad', 'gift'];
    let tacticIdx = 0;
    let calls = 0, cookCalls = 0, vipCalls = 0, cookDone = 0;
    let basketQtyDay = 0, basketRevDay = 0;
    // Số liệu tổng cuối kỳ và ngày bắt đầu từng hệ (0 = cả kỳ chưa mở)
    let sumRevenue = 0, sumProfit = 0, sumOnline = 0, sumFarm = 0, sumBranch = 0, sumQuan = 0;
    let onlineDay = 0, branchDay = 0, quanDay = 0, farmDay = 0;

    for (let d = 0; d < days; d++) {
      st().closePanel();
      // Hệ mới ưu tiên trước khi tiêu tiền vào kệ/nâng cấp
      if (maybeOpenOnline()) onlineDay = st().day;
      if (maybeOpenBranch()) branchDay = st().day;
      if (maybeOpenQuanNuoc()) quanDay = st().day;
      branchStaffUp();
      quanNuocStaffUp();
      hire();
      farmChores();
      invest();
      restock();
      restockQuanNuoc();
      ensureCook();
      const main = shop.counters()[0];
      player.teleport(main.center.x - 0.6, main.center.z - 0.9);
      if (!st().shopOpen) st().toggleShop();
      const day = st().day;
      const onlinePrev = st().online.done;
      let farmHarvestDay = 0, branchRevDay = 0;
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
        // Nhận mọi đơn app mới: thiếu hàng thì nhập bù nếu rẻ (món nhà làm không nhập được thì thôi),
        // còn shipper tiệm thì nhờ chở (miễn phí), hết người mới gọi Grab — nhận sớm nên luôn đúng hẹn
        for (const o of st().online.orders) {
          if (o.status !== 'new' || st().minutes > o.placedAt + ACCEPT_WINDOW) continue;
          let missing = Object.entries(o.items).filter(([pid, q]) => (st().storage[pid] ?? 0) < q);
          if (missing.some(([pid]) => COOKED_PRODUCT_IDS.has(pid))) {
            st().declineOnline(o.id);
            continue;
          }
          const cost = missing.reduce((n, [pid, q]) => n + (q - (st().storage[pid] ?? 0)) * productById(pid).buy, 0);
          if (missing.length && cost <= ONLINE_RESTOCK_MAX) {
            for (const [pid, q] of missing) st().buy(pid, q - (st().storage[pid] ?? 0));
            missing = Object.entries(o.items).filter(([pid, q]) => (st().storage[pid] ?? 0) < q);
          }
          if (missing.length) {
            st().declineOnline(o.id);
            continue;
          }
          const now = st();
          const busy = now.online.orders.filter((it) => it.status === 'shipping' && it.via === 'own').length;
          if (!now.acceptOnline(o.id, busy < now.staff.filter((x) => x.role === 'courier').length ? 'own' : 'grab')) {
            now.declineOnline(o.id);
          }
        }
        // Chi nhánh tung sự kiện đêm lúc 21h: có ca đêm xin nghỉ thì gọi người làm thay kịp trước 22h
        const ev = st().branch?.event;
        if (ev?.kind === 'calloff' && !ev.covered) st().coverCalloff();
        if (i % 150 === 0) {
          restock();
          restockQuanNuoc();
          ensureCook();
        }
        if (st().minutes >= 21.5 * 60) {
          // Chụp số trong ngày trước khi endDay xoá stats (giỏ quà, trại, chi nhánh)
          const byItem = st().stats.byItem ?? {};
          for (const [id, v] of Object.entries(byItem)) {
            if (!id.startsWith(BASKET_PREFIX)) continue;
            basketQtyDay += v.qty;
            basketRevDay += v.revenue;
          }
          farmHarvestDay = st().stats.farmHarvest ?? 0;
          branchRevDay = st().branch?.revenueToday ?? 0;
          useGame.setState({ minutes: 20 * 60 });
          st().sleep();
        }
      }
      const s = st();
      const sum = s.panel?.type === 'summary' ? s.panel.stats : null;
      const fest = festivalOn(s.day - 1);
      const rating = s.history.at(-1)?.rating;
      const onlineDoneDay = s.online.done - onlinePrev;
      // Doanh thu quán nước hôm qua: endDay mô phỏng bán THEO NGÀY và ghi biz.quanNuocLast —
      // chỉ tính khi `day` khớp đúng ngày vừa chơi (kết quả cũ còn sót từ kỳ trước thì bỏ qua)
      const quanLast = s.biz.quanNuocLast;
      const quanRevDay = quanLast && quanLast.day === s.day - 1 ? quanLast.revenue : 0;
      sumQuan += quanRevDay;
      if (sum) {
        sumRevenue += sum.revenue;
        // Lãi trừ cả tiền nhà (endDay tính profit = doanh thu − chi − lương − nhà)
        sumProfit += sum.revenue - sum.spent - sum.wages - (sum.rent ?? 0);
      }
      sumOnline += onlineDoneDay;
      sumFarm += farmHarvestDay;
      sumBranch += branchRevDay;
      if (!farmDay && farmHarvestDay > 0) farmDay = s.day - 1;
      rows.push({
        day: s.day - 1,
        level: s.level,
        money: money(s.money),
        revenue: sum ? money(sum.revenue) : '-',
        profit: sum ? money(sum.revenue - sum.spent - sum.wages - (sum.rent ?? 0)) : '-',
        customers: sum?.customers ?? 0,
        unhappy: sum?.unhappy ?? 0,
        ...(rating !== undefined ? { rating: Math.round(rating * 10) / 10 } : {}),
        ...(fest ? { festival: fest.name } : {}),
        calls, cookCalls, vipCalls, cookDone,
        basketQty: basketQtyDay,
        basketRevenue: money(basketRevDay),
        onlineDone: onlineDoneDay,
        farmHarvest: farmHarvestDay,
        ...(s.branch ? { branchRevenue: money(branchRevDay) } : {}),
        ...(s.biz.quanNuoc.open ? { quanRev: money(quanRevDay) } : {}),
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
      // Nhả main thread sau mỗi ngày: không chặn trình duyệt cả chục giây, automation (evaluate) chạy được giữa các ngày
      await new Promise((r) => setTimeout(r, 0));
    }
    const s = st();
    const played = rows.length;
    const summary: PlaytestSummary = {
      days: played,
      level: s.level,
      money: Math.round(s.money),
      revenue: Math.round(sumRevenue),
      profit: Math.round(sumProfit),
      revenuePerDay: played ? Math.round(sumRevenue / played) : 0,
      profitPerDay: played ? Math.round(sumProfit / played) : 0,
      onlineDelivered: sumOnline,
      farmHarvest: sumFarm,
      branchRevenue: Math.round(sumBranch),
      quanRevenue: Math.round(sumQuan),
      onlineDay,
      branchDay,
      quanDay,
      farmDay,
    };
    console.table(rows);
    console.table([summary]);
    st().closePanel();
    return { rows, summary };
  };
}
