import { suggestBudget } from '../data/suggestBudget';
import { ProductIcon } from './ProductIcon';
import { st } from './orderPanelStyles';
import { useEffect, useMemo, useState } from 'react';
import { orderSlowdown } from '../data/orderSlowdown';
import { useSession } from '../net/session';
import { Dropdown } from './Dropdown';
import { lastActionResult } from '../net/coop';
import { storageCapacity, storageUsed, useClock, useGame, wagesDue } from '../core/store';
import { caseSize, casesFor, CATEGORIES, describeUnits, formatMoney, productById, unlockedProducts, type Category } from '../data/products';
import { shortLabel } from './shortLabel';
import { shelfLife } from '../data/freshness';
import { visibleSuppliers } from '../data/visibleSuppliers';
import { bulkDiscount, orderTotal, SUPPLIERS, supplierSells, trending, unitCost } from '../data/suppliers';
import { goldenShortfall, nextGoldenPrep } from '../data/rhythm';
import { guideActiveOn, guideInCart, guideIdsOf, guideProducts } from '../data/onboarding';
import { cheapestSupplier, orderAssessment, type AssessLevel, type AssessLine, type BuyTone, type Dir } from '../data/procure';
import { PARTNER_TIERS, deliversInstantly } from '../data/supplierRel';
import { NEW_UNLOCK_WINDOW, newUnlockMark } from '../data/advice';
import { cheapestSupplierFor, type CheapestProductResult } from '../data/supplierValue';
import { isFairOpen, makeFairOffer } from '../data/fairmerchant';
import { showRestockExtras } from '../data/onboarding';
import { fairLotValue } from '../data/fairLotValue';
import { itemHealthList, shelfCount } from '../data/analytics';
import { prodSuggestToday } from '../data/prodSuggest';
import { quanNuocRestockTip } from '../data/quanNuocInsights';
import { supplyRestockManifest, supplyNetworkOrderVisible } from '../data/supplyChain';
import { teahouseFillPlan } from '../data/teahouseHaul';
import { quanNuocDrinkIds } from '../data/quanNuoc';
import { festivalRestockPlan } from '../data/festivalRestock';
import { SupplierRelLine, ForecastLine, GuideBanner, QuanDrinkTipCallout, FestivalPrepCallout, NetworkFillCallout } from './OrderBanners';
import { ProdSuggCard, HotWeekBanner, UrgentCard } from './OrderCards';
import { commitNote, urgentReasonOf, displayable, onHand, incoming, suggestQty, assessText, supplierTone, supplierTomorrow, commitmentNote } from './orderHelpers';
import { acceptFairOffer } from '../core/biz';
import { CUNG_GOODS, isXoiCungDay } from '../data/tiemXoi';
import { festivalOn, festivalStock, monthOf, upcomingFestival } from '../data/calendar';
import { weekendPullOf, weekendSellingDays } from '../data/weekendRestock';

/** Món mở khóa trong vòng chừng này cấp gần đây được gắn nhãn "Mới". */
// GĐ1151: một nguồn sự thật với dấu 🆕 — cửa sổ 'mới' 4 cấp định nghĩa ở advice.ts
const NEW_WITHIN = NEW_UNLOCK_WINDOW;
type Filter = 'suggest' | 'all' | Category;

import { ASSESS_STYLE, BUY_TONE_COLOR, BUY_TONE_ICON, BUY_TONE_LABEL, DIR_WORD, Meter } from './orderPanelParts';

export function OrderPanel() {
  const { level, day, money, demand, demandToday, deliveries, placeOrder, closePanel, notify, weatherSeed, forecast, storage, weather, warehouseTier, priceOf, furniture, openPanel, analytics } = useGame();
  const unlockedSuppliers = SUPPLIERS.filter((s) => s.unlock <= level);
  const coop = useSession((x) => x.coop);
  useEffect(() => {
    const g = useGame.getState();
    const next = orderSlowdown(g.speed, !!coop);
    if (next !== null) { g.setSpeed(next); g.notify('⏱ Đang tua nhanh → hạ về 1× cho bạn chọn hàng thong thả'); }
  }, [coop]);
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
    quanMenu: biz.quanNuoc?.open ? biz.quanNuoc.menu : undefined, // GĐ1101: gợi ý trồng cây mà thực đơn quán đang pha
  });
  const itemsSold = useGame((s) => s.totals.itemsSold);
  // GĐ190b: thấy được ngay chỗ nhập — quán nước tối nay cần thêm bao nhiêu ly đồ uống (chỉ khi quán mở + thiếu).
  const restockTip = biz.quanNuoc?.open
    ? quanNuocRestockTip(biz.quanNuoc, level, storage, biz.quanNuocLast, weather, day)
    : null;
  // GĐ204: nối GĐ191 (quán nước) thành cả mạng lưới — rốn kho chung có điểm bán nào cần nhập/chở
  // hôm nay (supplyRestockManifest, GĐ202). Chỉ hiện khi có nhu cầu NGOÀI phần quán nước đã báo trên
  // (chi nhánh thiếu kệ hoặc cần chở từ kho) — không lặp cái thẻ quán nước bên trên.
  const netManifest = supplyRestockManifest(storage, branch ?? undefined, biz.quanNuoc, level, biz.quanNuocLast, weather, day);
  const netNeeds = supplyNetworkOrderVisible(netManifest);
  const guideItems = guideProducts(level);
  const guideIds = guideIdsOf(guideItems);
  const guideOn = guideActiveOn(day, tutorialOff, deliveries, itemsSold);
  const guideIn = guideInCart(guideIds, cart);

  // Memo: quét toàn bộ kệ/kho mỗi lần gõ số lượng (setCart) là tốn — chỉ tính lại khi dữ liệu nguồn thay đổi
  const rows = useMemo(() => {
    // GĐ657: lễ đang diễn ra hoặc ≤7 ngày nữa — hàng của dịp tính như hàng hot để hiện ở Gợi ý
    const fest = festivalOn(day) ?? upcomingFestival(day, 7)?.festival;
    // GĐ658: ngày cúng và hôm trước — đồ cúng (nhang, trái cây) cũng vào Gợi ý
    const cung = isXoiCungDay(day) || isXoiCungDay(day + 1) ? CUNG_GOODS.filter((id) => productById(id).unlock <= level) : [];
    const isHot = [...trending(day, level), ...(fest ? festivalStock(fest, level) : []), ...cung];
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
  const urgentReason = urgentReasonOf;

  // GĐ1240 — giờ vàng KẾ TIẾP đang THIẾU món thèm nào (hết hàng, chưa có đơn chờ giao): nối từ trạng thái
  // "kho hết — vào Nhập hàng" của thẻ ⏰ Sơ đồ kệ (GĐ1239) thành gợi ý nhập cụ thể ngay tại đây — cùng nguồn
  // nextGoldenPrep, prospective theo nhịp giờ. Chỉ hiện khi có món thèm hết hàng thật (không ồn khi đủ). THUẦN đọc.
  const goldenNeeds = useMemo(() => {
    const prep = nextGoldenPrep(level, useClock.getState().minutes);
    return goldenShortfall(prep, (id) => onHand(id) + incoming(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, storage, deliveries, warehouseTier]);

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
    const g = useGame.getState();
    const cand = shown.filter((it) => it.suggest > 0 && displayable(it.p.id));
    const minCase = Math.min(...cand.map((r) => orderTotal(supplier, { [r.p.id]: caseSize(r.p.id) }, day)), Infinity);
    const budget = suggestBudget(money, wagesDue(g), g.day, Number.isFinite(minCase) ? minCase : 0);
    let cut = false;
    for (const r of cand) {
      c[r.p.id] = maxFit(c, r.p.id, r.suggest, budget);
      if (c[r.p.id] < r.suggest) cut = true;
    }
    setCart(c);
    if (cut) notify(useGame.getState().day <= 1 ? '💰 Ngày đầu chỉ điền ~40% tiền mặt — giữ vốn, bán xong nhập thêm' : '💰/📦 Điền tới hết tiền hoặc hết chỗ kho — nâng cấp để nhập thêm');
  };
  // GĐ1512 (K1) — mở từ nút "📦 Nhập đủ" trên cảnh báo sắp hết hàng: tự điền giỏ gợi ý một lần
  // (người chơi vẫn xem lại và bấm Đặt). Xoá cờ ngay để mở lại bảng không điền lần nữa.
  useEffect(() => {
    const p = useGame.getState().panel;
    if (p?.type === 'order' && p.autofill) {
      useGame.setState({ panel: { type: 'order' } });
      fillSuggest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    const plan = teahouseFillPlan(biz.quanNuoc, level, drinkUnits, (id) => (rows.some((r) => r.p.id === id) ? caseSize(id) : 0), day);
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
      notify(`⚠️ Sau đơn chỉ còn ${formatMoney(Math.max(0, moneyLeft))}, chưa đủ ${formatMoney(wages)} lương cuối ngày. Bấm lại nếu vẫn nhập.`);
      return;
    }
    // Hẻm online, máy khách: placeOrder trả `true` tạm — chỉ xoá giỏ khi máy chạy báo đặt được thật
    if (placeOrder(supplierId, lines)) void lastActionResult().then((ok) => ok && setCart({}));
  };

  return (
    <div style={{ width: '100%', maxWidth: 860 }}>
      <h2 style={{ margin: '0 0 4px' }}>📦 Nhập hàng</h2>
      {guideOn && <GuideBanner guideItems={guideItems} guideIn={guideIn} />}
      {restockTip && <QuanDrinkTipCallout tip={restockTip} onFill={fillQuanNuocDrinks} />}
      {festivalPlan && <FestivalPrepCallout plan={festivalPlan} onFill={fillFestivalPrep} />}
      {netNeeds && <NetworkFillCallout manifest={netManifest} onFillBranch={fillBranchSheet} />}
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
        if (!open || !showRestockExtras(day)) return null;
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
                              🍬 Lô có {fv.weekendSnacksCount} món ăn vặt cuối tuần{fv.isWeekendFair ? ' — hôm nay cuối tuần khách mua nhiều!' : ' — trữ sẵn cho cuối tuần'}
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
                  {shortLabel('Nhận lô', offer.dealPrice, money)}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div style={st.tabs}>
        {visibleSuppliers(SUPPLIERS, level).visible.map((s) => {
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
                <b>{s.name}</b>{newUnlockMark(s.unlock, level)}
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
        {(() => {
          const v = visibleSuppliers(SUPPLIERS, level);
          return v.hiddenCount > 0 ? <span style={{ fontSize: 12, opacity: 0.6, alignSelf: 'center' }}>🔒 +{v.hiddenCount} mối nữa từ cấp {v.nextHiddenUnlock}</span> : null;
        })()}
      </div>
      <p style={st.sub}>
        {supplier.desc}
        {supplier.minOrder > 0 && ` Đơn tối thiểu ${formatMoney(supplier.minOrder)}.`}
        {supplier.bulk && ` Mua nhiều: ${supplier.bulk.map((b) => `từ ${b.minCases} thùng một món bớt ${b.discount * 100}%`).join(', ')}.`}
        {' '}Hàng nhập theo thùng, về kho rồi khui ra bày lẻ.
      </p>
      <div style={{ ...st.banner, ...(showRestockExtras(day) ? null : { display: 'none' }) }}>{/* GĐ319: ngày đầu chỉ dạy nhập-bày-bán */}
        <SupplierRelLine life={biz.supplierRel?.[supplier.id]?.spent ?? 0} monthSpent={biz.supplierRelMonth?.[supplier.id] ?? 0} />
      </div>

      {showCost && count > 0 && (() => {
        const note = commitNote({ life: biz.supplierRel?.[supplier.id]?.spent ?? 0, monthSpent: biz.supplierRelMonth?.[supplier.id] ?? 0, total, supplier, cheapest });
        if (!note) return null; // mối chưa đủ bậc mối quen → không lừa có hoàn
        return (
          <div style={{ ...st.banner, background: 'rgba(46, 204, 113, 0.07)', border: '1px solid rgba(85,239,196,0.25)' }}>
            <span>{note.text}</span>
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
      {cheapest && cheapest.rival && cheapest.delta > 0 && showRestockExtras(day) && (
        <div style={{ ...st.banner, background: 'rgba(241, 196, 15, 0.09)', border: '1px solid rgba(255,255,255,0.07)' }}>
          🧮 Với giỏ này <b>{cheapest.best.name}</b> rẻ hơn <b>{cheapest.rival.name}</b> {formatMoney(cheapest.delta)} hôm nay
        </div>
      )}

      <div style={{ ...st.banner, ...(day <= 1 ? { display: 'none' } : null) }}>
        <ForecastLine forecast={forecast} weatherSeed={weatherSeed} day={day} />
      </div>

      {/* 🌾 Nên hôm nay — chuỗi sản xuất hội tụ (GĐ73) */}
      {prodSugg.length > 0 && <ProdSuggCard items={prodSugg} onOpen={(panel) => openPanel({ type: panel })} />}

      {hot.length > 0 && day > 1 && <HotWeekBanner hot={hot} hotNextWeek={hotNextWeek} nextSupplierUnlock={unlockedSuppliers.length < SUPPLIERS.length ? SUPPLIERS.find((s) => s.unlock > level)!.unlock : undefined} />}

      {filter === 'suggest' && urgent.length > 0 && showRestockExtras(day) && <UrgentCard rows={urgent.map((r) => ({ id: r.p.id, reason: urgentReason(r), suggest: r.suggest }))} />}

      {goldenNeeds && showRestockExtras(day) && (() => {
        const hh = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`;
        return (
          <div style={{ background: 'rgba(52,152,219,0.14)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8, outline: '1px solid rgba(52,152,219,0.35)' }}>
            <b>⏰ Giờ vàng sắp tới ({goldenNeeds.name} {hh(goldenNeeds.from)}–{hh(goldenNeeds.to)}): đang hết món khách thèm</b>
            <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
              {goldenNeeds.short.map((s) => (
                <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ minWidth: 120 }}>{productById(s.id)?.name ?? s.id}</span>
                  <span style={{ opacity: 0.85, flex: 1 }}>hết hàng mà giờ này khách hay mua — nên nhập trước khi đông</span>
                  <span style={{ marginLeft: 'auto', opacity: 0.75 }}>✨ nên nhập {s.qty} món (1 thùng)</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
                {r.weekendPull && <span style={{ ...st.badge, background: '#f1c40f', color: '#222' }} title="Lô này bán vào Thứ 7/Chủ nhật — khách hay ghé mua ăn vặt, gợi ý đã nhân thêm">🍬 Cuối tuần</span>}
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

      {/* GĐ1180: trước khi đặt, thấy tổng vốn ĐANG CHỐT (đơn chờ giao + đơn này) — đừng nhập chồng khi đã ứ */}
      <div style={{ fontSize: 12, opacity: 0.85, margin: '4px 0 2px', textAlign: 'right' }}>
        {commitmentNote(deliveries, total, priceOf)}
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
            {wageShort && !needConfirm ? '⚠️ Vẫn nhập' : !deliversInstantly(supplier, biz.supplierRel?.[supplier.id]?.spent ?? 0) ? '🚚 Đặt giao sáng mai' : '📦 Nhập ngay'}
          </button>
        </span>
      </div>
    </div>
  );
}
