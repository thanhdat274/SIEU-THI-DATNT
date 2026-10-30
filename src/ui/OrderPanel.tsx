import { ProductIcon } from './ProductIcon';
import { useMemo, useState } from 'react';
import { Dropdown } from './Dropdown';
import { lastActionResult } from '../net/coop';
import { storageCapacity, storageUsed, useGame, wagesDue } from '../core/store';
import { caseSize, casesFor, CATEGORIES, describeUnits, formatMoney, productById, unlockedProducts, type Category } from '../data/products';
import { shelfLife } from '../data/freshness';
import { furnitureDef } from '../data/furniture';
import { dayTraffic, describeDay } from '../data/weather';
import { bulkDiscount, orderTotal, SUPPLIERS, supplierSells, trending, unitCost, type Supplier } from '../data/suppliers';
import { guideActiveOn, guideInCart, guideIdsOf, guideProducts } from '../data/onboarding';
import { buyCostTone, cheapestSupplier, orderAssessment, tomorrowCostDir, type AssessLevel, type AssessLine, type AssessLineOut, type BuyTone, type Dir } from '../data/procure';
import { monthlyRelRebate, PARTNER_TIERS, tierProgress } from '../data/supplierRel';
import { cheapestSupplierFor, commitRebateAdvice, type CheapestProductResult } from '../data/supplierValue';
import { isFairOpen, makeFairOffer } from '../data/fairmerchant';
import { fairLotValue } from '../data/fairLotValue';
import { itemHealthList, shelfCount } from '../data/analytics';
import { prodSuggestToday } from '../data/prodSuggest';
import { quanNuocRestockTip } from '../data/quanNuoc';
import { supplyRestockManifest, supplyNetworkOrderVisible } from '../data/supplyChain';
import { teahouseFillPlan } from '../data/teahouseHaul';
import { quanNuocDrinkIds } from '../data/quanNuoc';
import { festivalRestockPlan } from '../data/festivalRestock';
import { PREP_MIN_QTY } from '../data/festivalPrep';
import { Callout } from './panels/shared';
import { acceptFairOffer } from '../core/biz';
import { monthOf } from '../data/calendar';
import { weekendPullOf, weekendSellingDays } from '../data/weekendRestock';

/** Món mở khóa trong vòng chừng này cấp gần đây được gắn nhãn "Mới". */
const NEW_WITHIN = 4;
/** Món mới mở ở cấp này hoặc cấp trước, chưa ai hỏi mua: gợi ý nhập thử chừng này (thùng). */
const TRIAL_CASES = 1;

/** Tiệm có kệ/tủ bày được món này không (không có chỗ bày thì nhập về chỉ nằm kho). */
function displayable(productId: string) {
  const cat = productById(productId).category;
  return useGame.getState().furniture.some((f) => furnitureDef(f.type).categories.includes(cat));
}

/** Số món đang có: trong kho + trên kệ. */
function onHand(productId: string) {
  const s = useGame.getState();
  let n = s.storage[productId] ?? 0;
  for (const f of s.furniture) for (const t of f.tiers) if (t.productId === productId) n += t.count;
  return n;
}

const incoming = (productId: string) =>
  useGame.getState().deliveries.reduce((sum, d) => sum + (d.items[productId] ?? 0), 0);

/** Sức bày của món: tổng số món kệ/tủ tiệm đang chứa được cho ngành hàng của món này. */
function displayCapacityFor(productId: string) {
  const cat = productById(productId).category;
  const s = useGame.getState();
  let slots = 0;
  for (const f of s.furniture) {
    const def = furnitureDef(f.type);
    if (!def.categories.includes(cat)) continue;
    slots += f.tiers.length * def.capacity;
  }
  return slots;
}

/**
 * Gợi ý nhập (số thùng): đủ bán ~2 ngày theo nhu cầu (hàng giao sáng mai thì cần dự phòng nhiều hơn),
 * hàng hot tính dư 50%, món mới chưa ai hỏi thì nhập thử một thùng.
 * Thông minh hơn: tính cả lượt khách hỏi hôm nay (kể cả lượt bị từ chối vì hết hàng — món đang "hụt hơi"),
 * và không nhập quá sức bày của món (nhập về thừa chỉ nằm kho chết hạn).
 */
function suggestQty(productId: string, supplier: Supplier, hot: boolean, isNew: boolean) {
  const s = useGame.getState();
  // Không có chỗ bày thì khỏi nhập (nhập về chỉ nằm kho)
  if (!displayable(productId)) return 0;
  // Nhu cầu = trung bình nhiều ngày, hoặc hôm nay nếu hôm nay khách hỏi nhiều hơn (món đang hụt hơi)
  const demand = Math.max(s.demand[productId] ?? 0, s.demandToday[productId] ?? 0);
  // Hàng dễ hỏng thì chỉ nhập đủ bán trước khi hết hạn
  const days = Math.min(supplier.delayDays ? 2.5 : 1.5, shelfLife(productId) * 0.8);
  const fresh = isNew && s.level - productById(productId).unlock <= 1;
  const size = caseSize(productId);
  let target = demand ? Math.ceil(demand * days * (hot ? 1.5 : 1) * forecastTraffic(supplier)) : fresh || hot ? TRIAL_CASES * size : 0;
  // GĐ266: lô bán vào cuối tuần mà món thuộc nhóm ăn vặt (khách thèm thật — GĐ255) → nhân thêm
  // hệ số kéo cầu, để chiều thứ Sáu gợi ý đã biết trữ nhiều hơn (chỉ khi có cầu thật, không nhân món nhập thử)
  target = Math.ceil(target * weekendPullOf(productId, demand, weekendSellingDays(s.day, supplier.delayDays)));
  // Chặn trên: sức bày của món + một thùng dự phòng kho, để không nhập về nằm ứ
  target = Math.min(target, displayCapacityFor(productId) + size);
  const need = target - onHand(productId) - incoming(productId);
  return need > 0 ? Math.ceil(need / size) : 0;
}

/** Khách dự kiến so với ngày thường trong những ngày lô hàng này sẽ bán (hàng giao sáng mai thì tính từ mai). */
function forecastTraffic(supplier: Supplier) {
  const s = useGame.getState();
  if (!supplier.delayDays) return dayTraffic(s.weatherSeed, s.day, s.weather);
  return (dayTraffic(s.weatherSeed, s.day + 1, s.forecast[0]) + dayTraffic(s.weatherSeed, s.day + 2, s.forecast[1])) / 2;
}

type Filter = 'suggest' | 'all' | Category;

// ─── GĐ57 "Mua khi rẻ": tóm tắt giá của một mối hôm nay / mai (thuần đọc, không đổi kinh tế) ───

const BUY_TONE_LABEL: Record<BuyTone, string> = { cheap: 'nửa rẻ', normal: 'giữa khung', pricey: 'nửa đắt' };
const BUY_TONE_ICON: Record<BuyTone, string> = { cheap: '📉 rẻ', normal: '• thường', pricey: '📈 đắt' };
const BUY_TONE_COLOR: Record<BuyTone, string> = { cheap: '#55efc4', normal: '#dfe6e9', pricey: '#ff7675' };
const DIR_WORD: Record<Dir, string> = { cheaper: 'mai rẻ hơn', pricier: 'mai đắt hơn', flat: 'mai tương đương' };

// ─── GĐ103-2 "Dự phóng trước khi chốt đơn": ước ngày bán hết / thùng kho / nguy cơ hỏng hàng ───
// Chỉ ĐỌC dữ liệu có sẵn (orderAssessment thuần) — nhãn luôn kèm "chừng/ước", không đổi kinh tế.
// GD103-2b hotfix theo spec UI/UX: đỏ "nhập dư" chỉ khi bán không kịp hạn VÀ ước hỏng ≥ 2 món;
// bán chậm hỏng ít → vàng; cầu thấp/chưa bán lần nào → xám "theo dõi thêm" (không ước ngày vô nghĩa).

/** Dòng dự phóng trong ô tên món: ổn/chưa dữ liệu → chữ mờ; bán chậm → vàng #f1c40f; nhập dư → đỏ nổi nền. */
const ASSESS_STYLE: Record<AssessLevel, React.CSSProperties> = {
  ok: { color: '#bbb', opacity: 0.8 },
  near: { color: '#f1c40f' },
  over: { color: '#ff7675', background: 'rgba(231, 76, 60, 0.12)', borderRadius: 4, padding: '1px 6px' },
};

/** Text dự phóng của một dòng: gọn ≤ ~70 ký tự để ô tên món giữ tối đa 2 dòng. */
function assessText(a: AssessLineOut, capacity: number): string {
  const share = `chiếm ${a.caseUse}/${capacity} thùng kho`;
  if (a.level === 'over') {
    if (a.overWhy === 'kho') return `⚠️ kho không đủ chỗ: ${share}`;
    const d = Math.max(1, Math.round(a.sellDays ?? 0));
    return `⚠️ nhập dư: chừng ${d} ngày hết hàng > hạn ${Math.round(a.shelfDays)} ngày, ước hỏng ${a.spoil} món`;
  }
  if (a.level === 'near') {
    const d = Math.max(1, Math.round(a.sellDays ?? 0));
    return `⏳ bán chậm — chừng ${d} ngày hết hàng, cân nhắc bớt`;
  }
  // Chưa có dữ liệu bán (cầu < 0.5/ngày hoặc chưa bán lần nào) → xám, không ước ngày vô nghĩa.
  return a.sellDays !== null ? `📦 chừng ${Math.max(1, Math.round(a.sellDays))} ngày hết hàng · ${share}` : `📦 chưa có dữ liệu bán — theo dõi thêm`;
}

/** Tóm tắt tone giá một mối hôm nay: độ lệch pct trung bình + nhãn rẻ/đắt theo đa số các món bán được đã mở khóa. */
function supplierTone(s: Supplier, level: number, day: number): { pct: number; tone: BuyTone } | null {
  const rows = unlockedProducts(level).filter((p) => supplierSells(s, p.id));
  if (!rows.length) return null;
  const pct = Math.round(rows.reduce((a, p) => a + buyCostTone(s, p.id, day).pct, 0) / rows.length);
  const cheap = rows.filter((p) => buyCostTone(s, p.id, day).tone === 'cheap').length;
  const pricey = rows.filter((p) => buyCostTone(s, p.id, day).tone === 'pricey').length;
  const tone: BuyTone = pricey > cheap ? 'pricey' : cheap > pricey ? 'cheap' : 'normal';
  return { pct, tone };
}

/** Hướng giá mai của một mối theo đa số món (chỉ hướng, giữ phán đoán). */
function supplierTomorrow(s: Supplier, level: number, day: number): Dir {
  const rows = unlockedProducts(level).filter((p) => supplierSells(s, p.id));
  if (!rows.length) return 'flat';
  const cheaper = rows.filter((p) => tomorrowCostDir(s, p.id, day) === 'cheaper').length;
  const pricier = rows.filter((p) => tomorrowCostDir(s, p.id, day) === 'pricier').length;
  return pricier > cheaper ? 'pricier' : cheaper > pricier ? 'cheaper' : 'flat';
}

export function OrderPanel() {
  const { level, day, money, demand, demandToday, deliveries, placeOrder, closePanel, notify, weatherSeed, forecast, storage, warehouseTier, priceOf, furniture, openPanel, analytics } = useGame();
  const unlockedSuppliers = SUPPLIERS.filter((s) => s.unlock <= level);
  // GĐ57: lớp minh bạch giá mua chỉ bật khi đã mở mối dao động mạnh (Chợ đầu mối, cấp 3) — cấp <3 chưa thấy gì mới.
  const showCost = level >= 3;
  const [supplierId, setSupplierId] = useState(SUPPLIERS[0].id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('suggest');
  const supplier = SUPPLIERS.find((s) => s.id === supplierId)!;
  const hot = trending(day, level);
  // GĐ273: tối Chủ nhật (ngày cuối khối tuần Thứ 2→CN) báo trước hàng hot TUẦN MAI — người chơi
  // nhập sáng Thứ 2 không phải đoán. trending(day + 1) đổi khối đúng ở ranh giới này.
  const hotNextWeek = (day % 7 === 0) ? trending(day + 1, level) : [];
  // Lớp hướng dẫn ngày đầu Mua đơn đầu tiên (GĐ38): chỉ bật cho người mới thật (ngày 1, chưa ẩn hướng dẫn,
  // chưa đặt đơn & chưa bán gì). Người chơi cũ (tutorialOff / ngày > 1 / đã đặt hoặc đã bán) không thấy.
  const tutorialOff = useGame((s) => s.biz.tutorialOff);
  const biz = useGame((s) => s.biz);
  const branch = useGame((s) => s.branch);
  const prodSugg = prodSuggestToday({
    level, day, hot,
    storage,
    quanNuocOpen: !!biz.quanNuoc?.open,
    quanNuocShort: !!biz.quanNuocLast && biz.quanNuocLast.served < biz.quanNuocLast.wanted,
    stationOpen: (st) => furniture.some((f) => f.type === st),
    branch,
  });
  const itemsSold = useGame((s) => s.totals.itemsSold);
  // GĐ190b: thấy được ngay chỗ nhập — quán nước tối nay cần thêm bao nhiêu ly đồ uống (chỉ khi quán mở + thiếu).
  const restockTip = biz.quanNuoc?.open
    ? quanNuocRestockTip(biz.quanNuoc, level, storage, biz.quanNuocLast)
    : null;
  // GĐ204: nối GĐ191 (quán nước) thành cả mạng lưới — rốn kho chung có điểm bán nào cần nhập/chở
  // hôm nay (supplyRestockManifest, GĐ202). Chỉ hiện khi có nhu cầu NGOÀI phần quán nước đã báo trên
  // (chi nhánh thiếu kệ hoặc cần chở từ kho) — không lặp cái thẻ quán nước bên trên.
  const netManifest = supplyRestockManifest(storage, branch ?? undefined, biz.quanNuoc, level, biz.quanNuocLast);
  const netNeeds = supplyNetworkOrderVisible(netManifest);
  const guideItems = guideProducts(level);
  const guideIds = guideIdsOf(guideItems);
  const guideOn = guideActiveOn(day, tutorialOff, deliveries, itemsSold);
  const guideIn = guideInCart(guideIds, cart);

  // Memo: quét toàn bộ kệ/kho mỗi lần gõ số lượng (setCart) là tốn — chỉ tính lại khi dữ liệu nguồn thay đổi
  const rows = useMemo(() => {
    const isHot = trending(day, level);
    return unlockedProducts(level)
      .filter((p) => supplierSells(supplier, p.id))
      .map((p) => {
        const isNew = level - p.unlock < NEW_WITHIN && p.unlock > 1;
        const hotP = isHot.includes(p.id);
        return {
          p, isNew, isHot: hotP,
          have: onHand(p.id),
          coming: incoming(p.id),
          demand: demand[p.id] ?? 0,
          asked: demandToday[p.id] ?? 0,
          cost: unitCost(supplier, p.id, day),
          size: caseSize(p.id),
          suggest: suggestQty(p.id, supplier, hotP, isNew),
          weekendPull: (demand[p.id] ?? 0) > 0 && weekendPullOf(p.id, demand[p.id] ?? 0, weekendSellingDays(day, supplier.delayDays)) > 1,
        };
      });
  }, [level, day, supplierId, demand, demandToday, deliveries, storage, warehouseTier, weatherSeed, forecast, priceOf]);

  const shown = rows
    .filter((r) => filter === 'all' || (filter === 'suggest' ? r.suggest > 0 || (cart[r.p.id] ?? 0) > 0 : r.p.category === filter))
    // Món khách đang hỏi nhiều nhất (kể cả hôm nay) lên đầu, rồi tới thiếu hàng nhất
    .sort((a, b) => b.asked - a.asked || b.demand - a.demand || Number(b.suggest > 0) - Number(a.suggest > 0) || Number(b.isHot) - Number(a.isHot) || a.p.unlock - b.p.unlock);

  // "Cần nhập gấp": món đang hụt hơi nhất — hết hàng mà khách hỏi, hoặc còn ít hơn một ngày bán
  const urgent = rows
    .filter((r) => r.suggest > 0 && displayable(r.p.id))
    .sort((a, b) => b.asked - a.asked || b.demand - a.demand || a.have - b.have)
    .slice(0, 5);
  const urgentReason = (r: (typeof rows)[number]) => {
    if (r.asked > 0 && r.have === 0) return `hôm nay ${r.asked} khách hỏi mà hết hàng`;
    if (r.have === 0) return 'đã hết hàng';
    if (r.demand > 0 && r.have < r.demand) return `còn ${r.have} món, ít hơn một ngày bán (${r.demand.toFixed(1)}/ngày)`;
    if (r.asked > 0) return `hôm nay ${r.asked} khách hỏi mua`;
    if (r.isHot) return 'hàng hot tuần này';
    return `bán ${r.demand.toFixed(1)}/ngày, đang có ${r.have}`;
  };

  // Giỏ đặt tính theo thùng; đơn gửi đi tính theo món
  const toLines = (c: Record<string, number>) => Object.fromEntries(
    Object.entries(c).filter(([id, q]) => q > 0 && rows.some((r) => r.p.id === id)).map(([id, q]) => [id, q * caseSize(id)]),
  );
  const lines = toLines(cart);
  const total = orderTotal(supplier, lines, day);
  // GĐ57: tóm tắt giá từng mối (badge tab + dòng tiêu đề) — chỉ tính khi showCost để khỏi tốn ở ván mới.
  const supSummary = useMemo(() => {
    const m = new Map<string, { pct: number; tone: BuyTone; dir: Dir }>();
    if (!showCost) return m;
    for (const s of unlockedSuppliers) {
      const t = supplierTone(s, level, day);
      if (!t) continue;
      m.set(s.id, { ...t, dir: supplierTomorrow(s, level, day) });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCost, level, day]);
  // Mối rẻ nhất cho giỏ hiện tại (+ độ lệch so mối kế) — chỉ so khi có giỏ trong showCost.
  const cheapest = showCost && Object.keys(lines).length > 0 ? cheapestSupplier(lines, day, level) : null;
  const before = Object.entries(lines).reduce((sum, [id, q]) => sum + unitCost(supplier, id, day) * q, 0);
  const count = Object.values(lines).reduce((a, b) => a + b, 0);
  const cases = Object.entries(lines).reduce((n, [id, q]) => n + q / caseSize(id), 0);
  const tooSmall = count > 0 && total < supplier.minOrder;
  // Kho: hàng đang có + hàng chờ giao + đơn này
  const pending = deliveries.map((d) => d.items);
  const capacity = storageCapacity(warehouseTier);
  const usedNow = storageUsed(storage, ...pending);
  const tooBig = storageUsed(storage, ...pending, lines) > capacity;
  const spaceLeft = capacity - storageUsed(storage, ...pending, lines);
  // GĐ103-2: dự phóng từng dòng giỏ (chỉ món đã đặt qty > 0) — ước ngày bán hết, thùng kho, nguy cơ hỏng.
  // Thuần đọc orderAssessment; dùng số bán trung bình (demand) + kho đang có + hạn dùng của món.
  const assessById = useMemo(() => {
    const assessLines: AssessLine[] = rows.map((r) => ({
      productId: r.p.id,
      cases: cart[r.p.id] ?? 0,
      dailyQty: r.demand,
      stockCases: casesFor(r.p.id, r.have),
      shelfDays: shelfLife(r.p.id),
    }));
    return new Map(orderAssessment(assessLines, capacity, usedNow).lines.map((l) => [l.productId, l]));
  }, [rows, cart, capacity, usedNow]);
  // GĐ143 "Mối nào rẻ THẬT": mỗi món đang hiển thị, mối mở khóa KHÁC mối đang chọn có đơn giá hiệu lực
  // rẻ hơn hôm nay (so theo bulk của số thùng đang đặt) — để đánh dấu món nên xẻ sang mối khác.
  // Thuần đọc supplierValue; dùng để vẽ badge ⇄ mỗi dòng (chỉ khi có giỏ showCost để khỏi tốn ván mới).
  const cheapById = useMemo(() => {
    const m = new Map<string, CheapestProductResult | null>();
    if (!showCost) return m;
    const curId = supplier.id;
    for (const r of shown) {
      const qty = cart[r.p.id] ?? 0;
      m.set(r.p.id, cheapestSupplierFor(r.p.id, qty, day, level, curId, null));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCost, shown, cart, day, level, supplier.id]);
  const moneyLeft = money - total;
  // Tiền còn sau đơn không đủ trả lương cuối ngày: bấm lần đầu chỉ cảnh báo, bấm lần nữa mới nhập
  const wages = wagesDue(useGame.getState());
  const wageShort = count > 0 && wages > 0 && moneyLeft < wages;
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const needConfirm = wageShort && confirmedTotal !== total;

  /** Giỏ có vừa tiền đang có và chỗ trống nhà kho không. */
  const fits = (c: Record<string, number>, budget = money) => {
    const l = toLines(c);
    return orderTotal(supplier, l, day) <= budget && storageUsed(storage, ...pending, l) <= capacity;
  };
  /** Số thùng lớn nhất (≤ muốn) của một món mà giỏ vẫn vừa tiền (hoặc ngân sách) và kho. */
  const maxFit = (c: Record<string, number>, id: string, want: number, budget = money) => {
    let q = want;
    while (q > 0 && !fits({ ...c, [id]: q }, budget)) q--;
    return q;
  };
  const setQty = (id: string, qty: number) => {
    const want = Math.max(0, Math.min(99, Math.round(qty) || 0));
    const q = want > (cart[id] ?? 0) ? maxFit(cart, id, want) : want;
    if (q < want) notify(moneyLeft < unitCost(supplier, id, day) * caseSize(id) ? '💰 Không đủ tiền cho thêm thùng nữa' : '📦 Nhà kho hết chỗ, nâng cấp nhà kho để nhập thêm');
    setCart((c) => ({ ...c, [id]: q }));
  };
  // Điền gợi ý theo thứ tự ưu tiên (món thiếu, bán chạy trước), mỗi món lấy tối đa phần còn vừa ngân sách và kho.
  // Ngân sách: hết tiền đang có khi chưa thuê nhân viên, có nhân viên thì chừa đúng khoản lương cuối ngày.
  // Bỏ qua món tiệm chưa có chỗ bày.
  const fillSuggest = () => {
    const c: Record<string, number> = {};
    const wages = wagesDue(useGame.getState());
    const budget = Math.max(0, money - wages);
    let cut = false;
    for (const r of shown.filter((it) => it.suggest > 0 && displayable(it.p.id))) {
      c[r.p.id] = maxFit(c, r.p.id, r.suggest, budget);
      if (c[r.p.id] < r.suggest) cut = true;
    }
    setCart(c);
    if (cut) notify('💰/📦 Điền tới hết tiền hoặc hết chỗ kho — nâng cấp để nhập thêm');
  };
  // GĐ205: điền giỏ đúng thứ mà rốn kho chung đang cần cho CHI NHÁNH (phiếu nạp kho GĐ202). Khác
  // fillSuggest (đặt theo nhu cầu tiệm chính): ưu tiên đúng kệ chi nhánh đang trống, quy theo thùng.
  // Chỉ thêm món nhà cung cấp hiện tại bán + còn vừa ngân sách (chừa lương) và chỗ kho.
  const fillBranchSheet = () => {
    const wages = wagesDue(useGame.getState());
    const budget = Math.max(0, money - wages);
    let c = { ...cart };
    for (const l of netManifest.lines.filter((ll) => ll.outlet === 'branch')) {
      if (!l.id || !rows.some((r) => r.p.id === l.id)) continue;
      const casesWant = Math.ceil(l.need / caseSize(l.id));
      if (casesWant > 0) c[l.id] = maxFit(c, l.id, casesWant, budget);
    }
    setCart(c);
    notify('🧾 Đã thêm món chi nhánh thiếu vào giỏ (theo phiếu nạp kho)');
  };
  // GĐ209: một-chạm nạp ĐỒ UỐNG cho quán nước — quán rút đồ uống từ kho CHUNG nên "chở" = đặt đồ uống
  // về kho đủ tối nay. Dùng helper THUẦN teahouseFillPlan (phân bổ thiếu vào món quán bán mà supplier
  // hiện có, quy thùng), lọc qua rows như fillBranchSheet, vẫn tôn trọng ngân sách (chừa lương) + kho.
  const fillQuanNuocDrinks = () => {
    const wages = wagesDue(useGame.getState());
    const budget = Math.max(0, money - wages);
    const drinkUnits = quanNuocDrinkIds(level).reduce((n, id) => n + (storage[id] ?? 0), 0);
    const plan = teahouseFillPlan(biz.quanNuoc, level, drinkUnits, (id) => (rows.some((r) => r.p.id === id) ? caseSize(id) : 0));
    if (plan.topup <= 0) return notify('🥤 Quán nước tối nay đã đủ đồ uống — không cần nạp.');
    let c = { ...cart };
    let filled = 0;
    for (const ln of plan.lines) {
      c[ln.id] = maxFit(c, ln.id, ln.cases, budget);
      filled += c[ln.id] * caseSize(ln.id);
    }
    setCart(c);
    notify(filled > 0
      ? `🧾 Đã thêm ${filled} ly đồ uống thiếu cho quán nước vào giỏ (${plan.lines.map((l) => `${l.id}×${l.cases}`).join(', ')})`
      : '💰/📦 Đủ tiền hay chỗ kho không vừa thêm thùng nào — nâng cấp kho/nhập ít hơn');
  };
  // GĐ247: phiếu trữ lễ — lễ sắp tới (≤3 ngày) còn món chưa trữ đủ trong kho → một chạm vào giỏ.
  // Món mối này không bán thì liệt kê ở skipped để gợi ý đổi mối (helper thuần, giỏ điền qua maxFit).
  // Đặt SAU `rows` (useMemo) — QA mắt 30/10 bắt lỗi "Cannot access 'rows' before initialization".
  const festivalPlan = festivalRestockPlan({
    day, level, storage,
    sells: (id) => rows.some((r) => r.p.id === id),
    caseSizeOf: caseSize,
  });
  // GĐ247: một chạm trữ lễ — thêm món thiếu cho dịp sắp tới vào giỏ (quy thùng, đúng mẫu
  // fillBranchSheet/fillQuanNuocDrinks: vẫn tôn trọng ngân sách chừa lương + chỗ nhà kho).
  const fillFestivalPrep = () => {
    if (!festivalPlan) return;
    const wages = wagesDue(useGame.getState());
    const budget = Math.max(0, money - wages);
    let c = { ...cart };
    let added = 0;
    for (const l of festivalPlan.lines) {
      c[l.id] = maxFit(c, l.id, l.cases, budget);
      added += c[l.id] * caseSize(l.id);
    }
    setCart(c);
    notify(added > 0
      ? `🧾 Đã thêm trữ lễ ${festivalPlan.festival.name} vào giỏ (${festivalPlan.lines.map((l) => `${productById(l.id).name} ${c[l.id]} thùng`).join(', ')})`
      : '💰/📦 Đủ tiền hay chỗ kho không vừa thêm thùng nào — nâng cấp kho/nhập ít hơn');
  };
  const categories = [...new Set(rows.map((r) => r.p.category))];

  const order = () => {
    if (needConfirm) {
      setConfirmedTotal(total);
      notify(`⚠️ Sau đơn này chỉ còn ${formatMoney(Math.max(0, moneyLeft))}, chưa đủ ${formatMoney(wages)} lương cuối ngày. Bấm lần nữa nếu vẫn nhập.`);
      return;
    }
    // Hẻm online, máy khách: placeOrder trả `true` tạm — chỉ xoá giỏ khi máy chạy báo đặt được thật
    if (placeOrder(supplierId, lines)) void lastActionResult().then((ok) => ok && setCart({}));
  };

  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <h2 style={{ margin: '0 0 4px' }}>📦 Nhập hàng</h2>
      {guideOn && (
        <div style={{ ...st.guideBanner, ...(guideIn.length ? st.guideBannerReady : {}) }}>
          <div style={{ fontWeight: 700 }}>🧭 Ngày đầu tiên: nhập 3 món trước</div>
          <div style={{ marginTop: 3, fontSize: 12 }}>
            {guideItems.map((g, gi) => (
              <span key={g.id}>
                {guideIn.includes(g.id) ? '✅' : '⬜'} {g.name}
                {gi < guideItems.length - 1 && <span style={{ opacity: 0.6 }}> · </span>}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: guideIn.length ? '#2ecc71' : '#f1c40f' }}>
            {guideIn.length ? 'Sẵn sàng đặt hàng!' : 'Mỗi món một thùng là đủ cho ngày đầu.'}
          </div>
        </div>
      )}
      {restockTip && (
        <Callout
          tone={restockTip.verdict}
          title={restockTip.verdict === 'danger' ? '🚨 Nạp thêm đồ uống cho quán nước' : '🥤 Quán nước sắp ăn khô kho chung'}
          style={{ margin: '8px 0 6px' }}
        >
          <div style={{ fontSize: 12 }}>
            {restockTip.verdict === 'danger'
              ? `Hôm qua quán nước bỏ lỡ ~${restockTip.missedRevenue.toLocaleString('vi-VN')}đ vì kho thiếu đồ uống. `
              : 'Quán nước chung kho với kệ tiệm chính — '}
            tối nay quán cần ~{restockTip.wanted} ly mà kho chỉ còn {restockTip.have}{restockTip.shortfall > 0
              ? <> — nhập thêm ít nhất <b>{restockTip.shortfall} ly</b> nước/ngọt/cà phê</>
              : ' (đã đủ, chỉ nhắc lại tín hiệu hôm qua)'}.
          </div>
          {restockTip.shortfall > 0 && (
            <button style={{ ...st.btn, fontSize: 11, marginTop: 6, padding: '2px 8px' }} onClick={fillQuanNuocDrinks}>
              ➕ Nạp đồ uống quán nước vào giỏ
            </button>
          )}
        </Callout>
      )}
      {festivalPlan && (
        <Callout tone="accent" title={`⏳ ${festivalPlan.festival.icon} ${festivalPlan.festival.name} ${festivalPlan.inDays === 1 ? 'ngày mai' : `sau ${festivalPlan.inDays} ngày`} — trữ lễ còn thiếu ${festivalPlan.lines.length} món`} style={{ margin: '8px 0 6px' }}>
          <div style={{ fontSize: 12 }}>
            Trữ đủ mỗi món ≥ {PREP_MIN_QTY} trong kho trước khi lễ bắt đầu → thưởng đón lễ <b style={{ color: '#2ecc71' }}>+{formatMoney(festivalPlan.bonus)}</b>.
            {festivalPlan.skipped.length > 0 && <> Món mối này không bán: {festivalPlan.skipped.map((id) => productById(id).name).join(', ')} — đổi mối để trữ nốt.</>}
          </div>
          <button style={{ ...st.btn, fontSize: 11, marginTop: 6, padding: '2px 8px' }} onClick={fillFestivalPrep}>
            ➕ Trữ lễ vào giỏ
          </button>
        </Callout>
      )}
      {netNeeds && (
        <Callout tone={netManifest.buyNeed > 0 ? 'warn' : 'info'} title="🔗 Nạp liền mạng lưới (rốn kho chung)" style={{ margin: '8px 0 6px' }}>
          <div style={{ fontSize: 12 }}>
            <div>{netManifest.line}.</div>
            {netManifest.lines.filter((l) => l.outlet === 'branch').length > 0 && (
              <div style={{ marginTop: 3, fontSize: 11, opacity: 0.9 }}>
                Chi nhánh kệ cần: {netManifest.lines.filter((l) => l.outlet === 'branch').map((l) => `${l.label} ${l.need}${l.source === 'buy' ? ' (mua)' : ''}`).join(' · ')}
              </div>
            )}
            {netManifest.lines.some((l) => l.outlet === 'branch') && (
              <button style={{ ...st.btn, fontSize: 11, marginTop: 6, padding: '2px 8px' }} onClick={fillBranchSheet}>
                ➕ Điền kệ chi nhánh vào giỏ
              </button>
            )}
          </div>
        </Callout>
      )}
      <div style={st.meters}>
        <Meter
          label="💰 Tiền"
          used={total} max={money}
          text={`Đơn ${formatMoney(total)} · còn ${formatMoney(Math.max(0, moneyLeft))}`}
        />
        <Meter
          label="📦 Nhà kho"
          used={capacity - spaceLeft} max={capacity} base={usedNow}
          text={`${capacity - spaceLeft}/${capacity} thùng · còn trống ${Math.max(0, spaceLeft)}${deliveries.length ? ` (tính cả ${deliveries.length} đơn chờ giao)` : ''}`}
        />
      </div>

      {(() => {
        const open = isFairOpen(day);
        const taken = biz.fairTaken === monthOf(day);
        if (!open) return null;
        const offer = makeFairOffer(level, day);
        if (!offer) return null;
        return (
          <div style={{ ...st.banner, marginTop: 8, background: 'rgba(155, 89, 182, 0.10)', border: '1px solid rgba(155,89,182,0.45)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <b style={{ color: '#d6a2ff' }}>🛒 Chợ phiên đầu tháng</b>
                <span style={{ opacity: 0.8 }}> — thương lái ghé bán cả lô rẻ hơn mua lẻ</span>
                {taken ? (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#2ecc71', fontWeight: 600 }}>✅ Đã nhận lô chợ phiên tháng này — tháng sau quay lại nhé</div>
                ) : (
                  <>
                    <div style={{ marginTop: 5, fontSize: 12, opacity: 0.95 }}>
                      {offer.lines.map((l) => `${productById(l.id).name} ×${l.qty}`).join(' · ')}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      <span style={{ textDecoration: 'line-through', opacity: 0.55 }}>lẻ {formatMoney(offer.totalBuy)}</span>{' '}
                      → <b style={{ color: '#2ecc71' }}>{formatMoney(offer.dealPrice)}</b>{' '}
                      <span style={{ color: '#f1c40f' }}>tiết kiệm {formatMoney(offer.totalBuy - offer.dealPrice)}</span>
                    </div>
                    {(() => {
                      const fv = fairLotValue(offer, storage, shelfCount(furniture), itemHealthList(analytics, level, storage, shelfCount(furniture), demand), day);
                      const tone = fv.verdict === 'grab' ? '#2ecc71' : fv.verdict === 'hold' ? '#e67e22' : 'rgba(255,255,255,0.7)';
                      return (
                        <div style={{ marginTop: 4, fontSize: 12, color: tone, fontWeight: 600 }}>
                          {fv.verdict === 'grab' && `Đáng múc: ${fv.beneficialCount} món đang bán nhanh, cầm ít — lô giúp đỡ thiếu hàng.`}
                          {fv.verdict === 'hold' && `Cân nhắc: ${fv.overstockCount} món bạn đã có đủ lâu (${fv.overstockCount} món dư thừa) — mua sẽ chôn thêm vốn.`}
                          {fv.verdict === 'maybe' && 'Chưa rõ sức bán — đang tiết kiệm ~' + Math.round(fv.savePct * 100) + '%, xem nhịp bán rồi quyết.'}
                          {fv.weekendSnacksCount > 0 && (
                            <div style={{ marginTop: 3, color: '#f1c40f', fontWeight: 500 }}>
                              🍬 Lô có {fv.weekendSnacksCount} món ăn vặt cuối tuần{fv.isWeekendFair ? ' — hôm nay cuối tuần khách mua nhiều!' : ' — trữ sẵn cho cuối tuần'} (GĐ291)
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
              {!taken && (
                <button
                  onClick={acceptFairOffer}
                  disabled={money < offer.dealPrice}
                  style={{ ...st.btn, flexShrink: 0, background: money < offer.dealPrice ? 'rgba(255,255,255,0.08)' : 'rgba(155,89,182,0.5)' }}
                >
                  {money < offer.dealPrice ? 'Thiếu tiền' : 'Nhận lô'}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div style={st.tabs}>
        {SUPPLIERS.map((s) => {
          const locked = s.unlock > level;
          const relHot = (biz.supplierRel?.[s.id]?.spent ?? 0) >= (PARTNER_TIERS.find((t) => t.level === 3)?.threshold ?? Infinity);
          return (
            <button
              key={s.id}
              disabled={locked}
              onClick={() => setSupplierId(s.id)}
              style={{ ...st.tab, ...(s.id === supplierId ? st.tabOn : {}), opacity: locked ? 0.45 : 1 }}
            >
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span>
                <b>{s.name}</b>
                {!locked && showCost && (() => {
                  const sm = supSummary.get(s.id);
                  if (!sm) return null;
                  return <span style={{ ...st.badge, marginLeft: 5, background: 'transparent', color: BUY_TONE_COLOR[sm.tone], border: `1px solid ${BUY_TONE_COLOR[sm.tone]}` }}>{BUY_TONE_ICON[sm.tone]}</span>;
                })()}
                <span style={st.tabMeta}>
                  {locked ? `🔒 Cấp ${s.unlock}` : `${s.discount > 0 ? `−${s.discount * 100}%` : s.discount < 0 ? `+${-s.discount * 100}%` : 'Giá chuẩn'} · ${s.delayDays ? 'giao sáng mai' : 'có ngay'}`}
                </span>
                {relHot && <span style={{ ...st.badge, marginLeft: 5, background: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.5)' }}>🔥 Mối ruột</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p style={st.sub}>
        {supplier.desc}
        {supplier.minOrder > 0 && ` Đơn tối thiểu ${formatMoney(supplier.minOrder)}.`}
        {supplier.bulk && ` Mua nhiều: ${supplier.bulk.map((b) => `từ ${b.minCases} thùng một món bớt ${b.discount * 100}%`).join(', ')}.`}
        {' '}Hàng nhập theo thùng, về kho rồi khui ra bày lẻ.
      </p>
      <div style={st.banner}>
        {(() => {
          const life = biz.supplierRel?.[supplier.id]?.spent ?? 0;
          const { cur, next, pct } = tierProgress(life);
          const monthSpent = biz.supplierRelMonth?.[supplier.id] ?? 0;
          const rebate = monthlyRelRebate(life, monthSpent);
          const monthLeft = Math.max(0, cur.commit - monthSpent);
          return (
            <span>
              🤝 Mối quen: <b style={{ color: cur.level >= 3 ? '#e74c3c' : '#fff' }}>{cur.icon} {cur.name}</b>
              {next ? ` · ${pct}% tới ${next.icon} ${next.name}` : ' · đã tối đa'}
              {" "}· tháng này mua <b>{formatMoney(monthSpent)}</b>
              {cur.level > 0 && (rebate > 0
                ? <span style={{ color: '#2ecc71' }}> → sẽ hoàn {formatMoney(rebate)} cuối tháng ✓</span>
                : <span style={{ opacity: 0.8 }}> · còn {formatMoney(monthLeft)} nữa đạt cam kết ({Math.round(cur.rate * 100)}% hoàn)</span>)}
            </span>
          );
        })()}
      </div>

      {showCost && count > 0 && (() => {
        // GĐ143 "Mối nào rẻ THẬT" — mồi gom cam kết tháng: nối zoom của banner Mối quen (bộ đếm tháng)
        // thành QUYẾT ĐỊNH với giỏ hiện tại: gom doanh tháng về mối này lấy hoàn hay xẻ giỏ sang mối rẻ.
        const life = biz.supplierRel?.[supplier.id]?.spent ?? 0;
        const monthSpent = biz.supplierRelMonth?.[supplier.id] ?? 0;
        const advice = commitRebateAdvice(life, monthSpent, total);
        if (!advice.eligible) return null; // mối chưa đủ bậc mối quen → không lừa có hoàn
        const rivalBest = cheapest && cheapest.best;
        const curIsCheapest = rivalBest && rivalBest.id === supplier.id;
        const committed = monthSpent >= advice.tier.commit;
        const bridges = !committed && advice.projectedSpent >= advice.tier.commit;
        const tailRival = rivalBest && !curIsCheapest && total > cheapest.total
          ? ` · nhưng giỏ này mua ở ${rivalBest.name} chỉ ${formatMoney(cheapest.total)}, rẻ hơn ${formatMoney(total - cheapest.total)} so với mối ${supplier.name} — cân với hoàn tháng nếu chưa đạt cam kết`
          : '';
        let icon = '🤝'; let body: string;
        if (committed) {
          body = `mối ${supplier.name} đã đạt cam kết tháng ${formatMoney(advice.tier.commit)} → giỏ ${formatMoney(total)} này góp thêm, cuối tháng hoàn ~${formatMoney(advice.rebateIf)} (${Math.round(advice.tier.rate * 100)}%)`;
        } else if (bridges) {
          icon = '🎯';
          body = `giỏ ${formatMoney(total)} này đẩy doanh tháng lên ${formatMoney(advice.projectedSpent)} → ĐẠT cam kết ${formatMoney(advice.tier.commit)}: hoàn ~${formatMoney(advice.rebateIf)} (${Math.round(advice.tier.rate * 100)}%) cuối tháng`;
        } else {
          icon = '🧲';
          body = `còn ${formatMoney(advice.gapAfter)} nữa đạt cam kết tháng ${formatMoney(advice.tier.commit)} (${Math.round(advice.tier.rate * 100)}% hoàn) — giỏ này góp ${formatMoney(total)}, gom doanh tháng về mối ${supplier.name} để lấy hoàn`;
        }
        return (
          <div style={{ ...st.banner, background: 'rgba(46, 204, 113, 0.07)', border: '1px solid rgba(85,239,196,0.25)' }}>
            <span>{icon} Gom cam kết: {body}{tailRival}</span>
          </div>
        );
      })()}

      {showCost && (() => {
        const sm = supSummary.get(supplier.id);
        if (!sm) return null;
        return (
          <div style={{ ...st.banner, background: 'rgba(46, 204, 113, 0.08)', border: '1px solid rgba(255,255,255,0.07)' }}>
            💹 Hôm nay giá {supplier.name} đang ở <b style={{ color: BUY_TONE_COLOR[sm.tone] }}>{BUY_TONE_LABEL[sm.tone]}</b> khung giá (±{Math.round(supplier.volatility * 100)}%)<span style={{ opacity: 0.7 }}> · trung bình {sm.pct > 0 ? '+' : ''}{sm.pct}%</span> · <b>{DIR_WORD[sm.dir]}</b>
          </div>
        );
      })()}
      {cheapest && cheapest.rival && cheapest.delta > 0 && (
        <div style={{ ...st.banner, background: 'rgba(241, 196, 15, 0.09)', border: '1px solid rgba(255,255,255,0.07)' }}>
          🧮 Với giỏ này <b>{cheapest.best.name}</b> rẻ hơn <b>{cheapest.rival.name}</b> {formatMoney(cheapest.delta)} hôm nay
        </div>
      )}

      <div style={st.banner}>
        🌦️ Dự báo: {forecast.map((w, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            <b>{i ? 'Ngày kia' : 'Mai'}</b> {describeDay(weatherSeed, day + 1 + i, w)} · khách {Math.round(dayTraffic(weatherSeed, day + 1 + i, w) * 100)}% ngày thường
          </span>
        ))}
        <span style={{ opacity: 0.75 }}> · Số gợi ý đã tính theo thời tiết. Hàng mát, đông lạnh, tươi để trong kho hỏng nhanh: nên bày vào tủ.</span>
      </div>

      {/* 🌾 Nên hôm nay — chuỗi sản xuất hội tụ (GĐ73) */}
      {prodSugg.length > 0 && (
        <div style={{ ...st.banner, background: 'rgba(46, 204, 113, 0.12)', outline: '1px solid rgba(46,204,113,0.35)' }}>
          <b>🌾 Nên hôm nay — tự làm khi nên</b>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {prodSugg.map((s, i) => (
              <button key={i} onClick={() => openPanel({ type: s.panel })}
                style={{ display: 'flex', gap: 8, alignItems: 'baseline', background: 'transparent', border: 'none', color: 'inherit', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                <span style={{ minWidth: 130 }}>{s.icon} {s.label} →</span>
                <span style={{ opacity: 0.85 }}>{s.detail}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hot.length > 0 && (
        <div style={st.banner}>
          🔥 Tuần này khách săn: <b>{hot.map((id) => productById(id).name).join(', ')}</b>
          {hotNextWeek.length > 0 && (
            <span style={{ opacity: 0.85 }} title="Tuần mới bắt đầu Thứ 2 — nhập sẵn hôm nay để không lỡ nhịp">
              {' '}· 🔮 Tuần mai: <b>{hotNextWeek.map((id) => productById(id).name).join(', ')}</b>
            </span>
          )}
          {unlockedSuppliers.length < SUPPLIERS.length && (
            <span style={{ opacity: 0.75 }}> · Mối mới mở ở cấp {SUPPLIERS.find((s) => s.unlock > level)!.unlock}</span>
          )}
        </div>
      )}

      {filter === 'suggest' && urgent.length > 0 && (
        <div style={{ ...st.banner, background: 'rgba(214, 48, 49, 0.16)' }}>
          <b>🚨 Cần nhập gấp</b>
          <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
            {urgent.map((r) => (
              <div key={r.p.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ minWidth: 130 }}>{productById(r.p.id).name}</span>
                <span style={{ opacity: 0.85 }}>{urgentReason(r)}</span>
                <span style={{ marginLeft: 'auto', opacity: 0.75 }}>✨ nên nhập {r.suggest} thùng</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={st.toolbar}>
        <Dropdown<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Lọc mặt hàng"
          options={[
            { value: 'suggest', label: '✨ Nên nhập' },
            { value: 'all', label: 'Tất cả mặt hàng' },
            ...categories.map((c) => ({ value: c as Filter, label: CATEGORIES[c] })),
          ]}
        />
        <button style={st.btn} onClick={fillSuggest}>✨ Điền theo gợi ý</button>
        <button style={st.btn} onClick={() => setCart({})} disabled={!count}>Xoá đơn</button>
      </div>

      {guideOn && (
        <div style={st.guideBox}>
          {guideItems.map((g) => {
            const inCart = (cart[g.id] ?? 0) > 0;
            const row = rows.find((r) => r.p.id === g.id);
            const cost = row ? row.cost : unitCost(supplier, g.id, day);
            const caseCost = cost * caseSize(g.id);
            return (
              <div key={g.id} style={{ ...st.guideRow, ...(inCart ? st.guideRowOn : {}) }}>
                <span className="or-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProductIcon product={g} size={26} tile />
                  <b>{g.name}</b>
                  <span style={{ ...st.badge, background: '#3498db' }}>Nên mua</span>
                  {inCart && <span style={{ ...st.badge, background: '#2ecc71' }}>✓ trong giỏ</span>}
                </span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{formatMoney(caseCost)}/thùng</span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  <button style={st.btn} onClick={() => setQty(g.id, (cart[g.id] ?? 0) + 1)}>+1 thùng</button>
                  {(cart[g.id] ?? 0) > 0 && <span style={{ marginLeft: 8, fontSize: 12 }}>{cart[g.id]} thùng</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={st.list}>
        <div className="or-row or-head" style={{ ...st.row, ...st.head }}>
          <span>Mặt hàng</span><span>Khách mua/ngày</span><span>Đang có (món)</span><span>Giá thùng</span><span>Lãi/thùng</span><span>Số thùng</span><span>Thành tiền</span>
        </div>
        {shown.length === 0 && (
          <p style={{ ...st.sub, padding: 12 }}>
            {filter === 'suggest' ? 'Hàng đang đủ bán. Chọn "Tất cả mặt hàng" để nhập thêm.' : 'Mối này không bán ngành hàng này.'}
          </p>
        )}
        {shown.map((r) => {
          const qty = cart[r.p.id] ?? 0;
          const base = productById(r.p.id).buy;
          const diff = r.cost / base - 1;
          const bulk = bulkDiscount(supplier, qty);
          const caseCost = r.cost * r.size;
          // Lãi dự kiến mỗi thùng ở giá bán hiện tại (chưa tính giảm giá cận hạn/combo)
          const margin = (priceOf(r.p.id) - r.cost) * r.size;
          // GĐ103-2: dự phóng dòng này (chỉ khi đã đặt qty > 0) — gắn trong ô tên món, không thêm cột
          const assess = assessById.get(r.p.id);
          return (
            <div key={r.p.id} className="or-row" style={st.row}>
              <span className="or-name">
                <ProductIcon product={r.p} size={26} tile />{r.p.name}
                {Number.isFinite(shelfLife(r.p.id)) && shelfLife(r.p.id) <= 14 && (
                  <span style={{ ...st.badge, background: shelfLife(r.p.id) <= 3 ? '#e74c3c' : '#636e72' }} title="Hạn dùng khi mới nhập">⏳ {shelfLife(r.p.id)} ngày</span>
                )}
                {r.isHot && <span style={{ ...st.badge, background: '#e67e22' }}>🔥 Hot</span>}
                {r.weekendPull && <span style={{ ...st.badge, background: '#f1c40f', color: '#222' }} title="Lô này bán vào Thứ 7/Chủ nhật — khách hay ghé mua ăn vặt (GĐ255), gợi ý đã nhân thêm">🍬 Cuối tuần</span>}
                {r.isNew && <span style={{ ...st.badge, background: '#2ecc71' }}>Mới</span>}
                {r.demand > 0 && r.have > 0 && r.have < r.demand && <span style={{ ...st.badge, background: '#e67e22' }} title={`Còn ${r.have} món, khách mua ~${r.demand.toFixed(1)}/ngày — sắp hết`}>⚠️ Gần hết</span>}
                {r.asked > 0 && r.have === 0 && <span style={{ ...st.badge, background: '#e74c3c' }}>Khách hỏi {r.asked} lần, hết hàng</span>}
                {cheapById.get(r.p.id) && cheapById.get(r.p.id)!.delta > 0 && (
                  <button
                    onClick={() => setSupplierId(cheapById.get(r.p.id)!.supplier.id)}
                    style={{ ...st.badge, background: 'rgba(85, 239, 196, 0.16)', color: '#55efc4', border: '1px solid #55efc433', cursor: 'pointer' }}
                    title={`${cheapById.get(r.p.id)!.supplier.name} rẻ hơn ${formatMoney(cheapById.get(r.p.id)!.delta)}/món hôm nay (sau bớt số thùng) — bấm để sang mối này`}
                  >
                    ⇄ {cheapById.get(r.p.id)!.supplier.name} rẻ hơn {formatMoney(cheapById.get(r.p.id)!.delta)}
                  </button>
                )}
                {assess && (
                  <span style={{ display: 'block', width: '100%', marginTop: 2, fontSize: 11, lineHeight: 1.35, ...ASSESS_STYLE[assess.level] }}>
                    {assessText(assess, capacity)}
                  </span>
                )}
              </span>
              <span data-label="Mua/ngày">{r.demand ? r.demand.toFixed(1) : '—'}</span>
              <span data-label="Đang có" title={`Trong kho: ${describeUnits(r.p.id, storage[r.p.id] ?? 0)}`}>{r.have}{r.coming > 0 && <span style={{ opacity: 0.7 }}> +{r.coming}</span>}</span>
              <span data-label="Giá thùng" title={`Thùng ${r.size} món, ${formatMoney(r.cost)}/món (giá chuẩn ${formatMoney(base)})`}>
                {formatMoney(caseCost)}
                <span style={{ opacity: 0.6, fontSize: 11 }}> ×{r.size}</span>
                {Math.abs(diff) >= 0.01 && <span style={{ color: diff > 0 ? '#ff7675' : '#55efc4', fontSize: 11 }}> {diff > 0 ? '▲' : '▼'}{Math.round(Math.abs(diff) * 100)}%</span>}
              </span>
              <span data-label="Lãi/thùng" title={`Giá bán đang đặt ${formatMoney(priceOf(r.p.id))} − giá nhập ${formatMoney(r.cost)} = ${formatMoney(priceOf(r.p.id) - r.cost)}/món, nhân ${r.size} món/thùng`} style={{ color: margin > 0 ? '#55efc4' : '#ff7675' }}>
                {margin > 0 ? '+' : ''}{formatMoney(margin)}
              </span>
              <span className="or-qty" style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <button style={st.step} onClick={() => setQty(r.p.id, qty - 1)} aria-label={`Bớt một thùng ${r.p.name}`}>−</button>
                <input style={assess?.level === 'over' ? { ...st.qty, border: '1px solid #ff7675' } : st.qty} inputMode="numeric" value={qty || ''} placeholder={r.suggest ? String(r.suggest) : '0'}
                  onChange={(e) => setQty(r.p.id, Number(e.target.value))} aria-label={`Số thùng ${r.p.name}`} />
                <button style={st.step} disabled={!fits({ ...cart, [r.p.id]: qty + 1 })} onClick={() => setQty(r.p.id, qty + 1)}
                  title={fits({ ...cart, [r.p.id]: qty + 1 }) ? undefined : 'Hết tiền hoặc hết chỗ kho'} aria-label={`Thêm một thùng ${r.p.name}`}>+</button>
                {r.suggest > 0 && qty !== r.suggest && (
                  <button style={{ ...st.step, width: 'auto', padding: '0 6px' }} onClick={() => setQty(r.p.id, r.suggest)} title="Lấy số gợi ý">✨{r.suggest}</button>
                )}
              </span>
              <span className="or-total">
                {qty ? formatMoney(caseCost * qty * (1 - bulk)) : '—'}
                {bulk > 0 && <span style={{ color: '#55efc4', fontSize: 11 }}> −{bulk * 100}%</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div style={st.footer}>
        <span>
          {cases} thùng ({count} món) · <b style={{ fontSize: 17 }}>{formatMoney(total)}</b>
          {before - total > 0 && <span style={{ color: '#55efc4' }}> (bớt {formatMoney(before - total)})</span>}
          {tooSmall && <span style={{ color: '#ff7675' }}> · cần thêm {formatMoney(supplier.minOrder - total)} cho đủ đơn tối thiểu</span>}
          {total > money && <span style={{ color: '#ff7675' }}> · không đủ tiền</span>}
          {wageShort && <span style={{ color: '#f1c40f' }}> · còn lại không đủ {formatMoney(wages)} lương cuối ngày</span>}
          {tooBig && <span style={{ color: '#ff7675' }}> · nhà kho không đủ chỗ (còn trống {Math.max(0, capacity - usedNow)} thùng), nâng cấp nhà kho</span>}
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button style={st.btn} onClick={closePanel}>Đóng</button>
          <button style={{ ...st.btn, background: '#f1c40f', fontWeight: 700 }} disabled={!count || tooSmall || tooBig || total > money} onClick={order}>
            {wageShort && !needConfirm ? '⚠️ Vẫn nhập' : supplier.delayDays ? '🚚 Đặt giao sáng mai' : '📦 Nhập ngay'}
          </button>
        </span>
      </div>
    </div>
  );
}


/** Thanh đo: phần đã có (base, đậm) + phần của đơn này (sáng), đỏ khi vượt. */
function Meter({ label, used, max, base = 0, text }: { label: string; used: number; max: number; base?: number; text: string }) {
  const pct = (v: number) => `${Math.min(100, max > 0 ? (v / max) * 100 : 100)}%`;
  const over = used > max;
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <b>{label}</b><span style={{ opacity: 0.8, color: over ? '#ff7675' : undefined }}>{text}</span>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#ffffff22', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: pct(used), background: over ? '#e67e22' : '#f1c40f' }} />
        <div style={{ position: 'absolute', inset: 0, width: pct(base), background: '#2ecc71' }} />
      </div>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  meters: { display: 'flex', gap: 16, flexWrap: 'wrap', margin: '4px 0 10px' },
  sub: { margin: '0 0 10px', opacity: 0.75, fontSize: 13 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tab: {
    display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: '6px 10px', borderRadius: 8,
    border: '2px solid transparent', background: '#3a3a4d', color: '#fff', cursor: 'pointer', fontSize: 13,
  },
  tabOn: { border: '2px solid #f1c40f', background: '#4a4a60' },
  tabMeta: { display: 'block', fontSize: 11, opacity: 0.75 },
  banner: { background: 'rgba(225, 112, 85, 0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8 },
  toolbar: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  btn: { border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  list: { maxHeight: '45vh', overflow: 'auto', borderRadius: 8, background: '#232330' },
  // Lớp hướng dẫn ngày đầu (GĐ38): banner + khối 3 món thiết yếu nổi bật, chỉ hiện khi guideOn
  guideBanner: { background: 'rgba(52, 152, 219, 0.14)', border: '1px solid #3498db', borderRadius: 8, padding: '10px 12px', margin: '6px 0 10px', fontSize: 13 },
  guideBannerReady: { border: '1px solid #2ecc71', background: 'rgba(46, 204, 113, 0.12)' },
  guideBox: { display: 'grid', gap: 6, margin: '0 0 10px', padding: 6, borderRadius: 8, background: 'rgba(52, 152, 219, 0.06)', border: '1px solid #3498db55' },
  guideRow: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 10px',
    border: '1px solid #3498db', borderRadius: 6, background: 'rgba(52, 152, 219, 0.10)', fontSize: 13,
  },
  guideRowOn: { border: '1px solid #2ecc71', background: 'rgba(46, 204, 113, 0.10)' },
  row: {
    display: 'grid', gap: 8, alignItems: 'center',
    padding: '6px 10px', borderBottom: '1px solid #ffffff10', fontSize: 13,
  },
  head: { position: 'sticky', top: 0, background: '#2b2b3a', fontSize: 11, opacity: 0.8, zIndex: 1 },
  badge: { marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, color: '#fff', whiteSpace: 'nowrap' },
  step: { width: 24, height: 24, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 14, padding: 0 },
  qty: { width: 48, height: 26, padding: 0, textAlign: 'center' },
  // Dính đáy panel: cuộn danh sách tới đâu vẫn luôn thấy tổng tiền + nút nhập.
  // GD104: bỏ tràn viền NGANG (margin âm từng đẩy footer qua mép content-box khi panel có
  // thanh cuộn dọc mỏng ~10px — margin âm chỉ recovering được padding, không recovering được
  // chỗ thanh cuộn chiếm: đo @320 footer right 298 > contentR 294). Giữ dính đáy (GĐ95),
  // footer nằm gọn trong content-box ở mọi width 320–1280; nền footer trùng nền panel nên
  // chỉ khác biệt thị giác là đường kẻ trên thụt vào theo lề nội dung.
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap',
    position: 'sticky', bottom: -18, margin: '12px 0 -18px', padding: '10px 0 18px',
    background: '#2b2b3a', borderTop: '1px solid #ffffff14', zIndex: 2,
  },
};
