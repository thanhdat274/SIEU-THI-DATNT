import { ProductIcon } from './ProductIcon';
import { useState } from 'react';
import { Dropdown } from './Dropdown';
import { storageCapacity, storageUsed, useGame, wagesDue } from '../core/store';
import { caseSize, CATEGORIES, describeUnits, formatMoney, productById, unlockedProducts, type Category } from '../data/products';
import { shelfLife } from '../data/freshness';
import { furnitureDef } from '../data/furniture';
import { dayTraffic, describeDay } from '../data/weather';
import { bulkDiscount, orderTotal, SUPPLIERS, supplierSells, trending, unitCost, type Supplier } from '../data/suppliers';

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

export function OrderPanel() {
  const { level, day, money, demand, demandToday, deliveries, placeOrder, closePanel, notify, weatherSeed, forecast, storage, warehouseTier, priceOf } = useGame();
  const unlockedSuppliers = SUPPLIERS.filter((s) => s.unlock <= level);
  const [supplierId, setSupplierId] = useState(SUPPLIERS[0].id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>('suggest');
  const supplier = SUPPLIERS.find((s) => s.id === supplierId)!;
  const hot = trending(day, level);

  const rows = unlockedProducts(level)
    .filter((p) => supplierSells(supplier, p.id))
    .map((p) => {
      const isNew = level - p.unlock < NEW_WITHIN && p.unlock > 1;
      const isHot = hot.includes(p.id);
      return {
        p, isNew, isHot,
        have: onHand(p.id),
        coming: incoming(p.id),
        demand: demand[p.id] ?? 0,
        asked: demandToday[p.id] ?? 0,
        cost: unitCost(supplier, p.id, day),
        size: caseSize(p.id),
        suggest: suggestQty(p.id, supplier, isHot, isNew),
      };
    });

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
    if (cut) notify(`Đã điền vừa ${wages ? `tiền đang có sau khi chừa ${formatMoney(wages)} lương` : 'tiền đang có'} và chỗ kho; vài món ít hơn gợi ý`);
  };
  const categories = [...new Set(rows.map((r) => r.p.category))];

  const order = () => {
    if (needConfirm) {
      setConfirmedTotal(total);
      notify(`⚠️ Sau đơn này chỉ còn ${formatMoney(Math.max(0, moneyLeft))}, chưa đủ ${formatMoney(wages)} lương cuối ngày. Bấm lần nữa nếu vẫn nhập.`);
      return;
    }
    if (placeOrder(supplierId, lines)) setCart({});
  };

  return (
    <div style={{ width: 'min(860px, calc(100vw - 76px))' }}>
      <h2 style={{ margin: '0 0 4px' }}>📦 Nhập hàng</h2>
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

      <div style={st.tabs}>
        {SUPPLIERS.map((s) => {
          const locked = s.unlock > level;
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
                <span style={st.tabMeta}>
                  {locked ? `🔒 Cấp ${s.unlock}` : `${s.discount > 0 ? `−${s.discount * 100}%` : s.discount < 0 ? `+${-s.discount * 100}%` : 'Giá chuẩn'} · ${s.delayDays ? 'giao sáng mai' : 'có ngay'}`}
                </span>
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
        🌦️ Dự báo: {forecast.map((w, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            <b>{i ? 'Ngày kia' : 'Mai'}</b> {describeDay(weatherSeed, day + 1 + i, w)} · khách {Math.round(dayTraffic(weatherSeed, day + 1 + i, w) * 100)}% ngày thường
          </span>
        ))}
        <span style={{ opacity: 0.75 }}> · Số gợi ý đã tính theo thời tiết. Hàng mát, đông lạnh, tươi để trong kho hỏng nhanh: nên bày vào tủ.</span>
      </div>

      {hot.length > 0 && (
        <div style={st.banner}>
          🔥 Tuần này khách săn: <b>{hot.map((id) => productById(id).name).join(', ')}</b>
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
          return (
            <div key={r.p.id} className="or-row" style={st.row}>
              <span className="or-name">
                <ProductIcon product={r.p} size={26} tile />{r.p.name}
                {Number.isFinite(shelfLife(r.p.id)) && shelfLife(r.p.id) <= 14 && (
                  <span style={{ ...st.badge, background: shelfLife(r.p.id) <= 3 ? '#d63031' : '#636e72' }} title="Hạn dùng khi mới nhập">⏳ {shelfLife(r.p.id)} ngày</span>
                )}
                {r.isHot && <span style={{ ...st.badge, background: '#e17055' }}>🔥 Hot</span>}
                {r.isNew && <span style={{ ...st.badge, background: '#00b894' }}>Mới</span>}
                {r.demand > 0 && r.have > 0 && r.have < r.demand && <span style={{ ...st.badge, background: '#e17055' }} title={`Còn ${r.have} món, khách mua ~${r.demand.toFixed(1)}/ngày — sắp hết`}>⚠️ Gần hết</span>}
                {r.asked > 0 && r.have === 0 && <span style={{ ...st.badge, background: '#d63031' }}>Khách hỏi {r.asked} lần, hết hàng</span>}
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
                <input style={st.qty} inputMode="numeric" value={qty || ''} placeholder={r.suggest ? String(r.suggest) : '0'}
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
          {wageShort && <span style={{ color: '#fdcb6e' }}> · còn lại không đủ {formatMoney(wages)} lương cuối ngày</span>}
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
        <div style={{ position: 'absolute', inset: 0, width: pct(used), background: over ? '#e17055' : '#fdcb6e' }} />
        <div style={{ position: 'absolute', inset: 0, width: pct(base), background: '#00b894' }} />
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
  tabOn: { borderColor: '#f1c40f', background: '#4a4a60' },
  tabMeta: { display: 'block', fontSize: 11, opacity: 0.75 },
  banner: { background: 'rgba(225, 112, 85, 0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8 },
  toolbar: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  btn: { border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  list: { maxHeight: '45vh', overflow: 'auto', borderRadius: 8, background: '#232330' },
  row: {
    display: 'grid', gap: 8, alignItems: 'center',
    padding: '6px 10px', borderBottom: '1px solid #ffffff10', fontSize: 13,
  },
  head: { position: 'sticky', top: 0, background: '#2b2b3a', fontSize: 11, opacity: 0.8, zIndex: 1 },
  badge: { marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 10, color: '#fff', whiteSpace: 'nowrap' },
  step: { width: 24, height: 24, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 14, padding: 0 },
  qty: { width: 48, height: 26, padding: 0, textAlign: 'center' },
  // Dính đáy panel: cuộn danh sách tới đâu vẫn luôn thấy tổng tiền + nút nhập
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap',
    position: 'sticky', bottom: -18, margin: '12px -22px -18px', padding: '10px 22px 18px',
    background: '#2b2b3a', borderTop: '1px solid #ffffff14', zIndex: 2,
  },
};
