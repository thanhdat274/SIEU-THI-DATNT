import { useMemo, useState } from 'react';
import { useClock, useGame } from '../core/store';
import { ROUTES, HAULERS, COOL_BOX, haulerById, routeById, haulerUnlocked, routeUnlocked, routeBuyPrice, routeDiscountFor } from '../data/routes';
import {
  routeStockResolve, routeStockLeft, cartCases, cartBuyCost, cartBuyCostDiscounted, cartSavings, tripProgress, tripRemaining, weekOfDay, type TripState,
} from '../data/trip';
import { haggleFloor, haggleDiscount, HAGGLE_MAX_ROUNDS, HAGGLE_MAX_OFFER } from '../data/haggle';
import { roadEventDraw } from '../data/roadEvents';
import { tripCtx } from '../core/slices/trip';
import { relTier } from '../data/supplierRel';
import { productById, formatMoney, caseSize, casesFor } from '../data/products';
import './trip.css';

/**
 * Hệ 5-L2/L3 — lớp phủ Chuyến đi tỉnh (SPEC-CHIEU-RONG §5.3/§5.10).
 *
 * - Đang có chuyến: thẻ tiến độ xe + bàn Đặt giỏ hàng chở về (L3, nhịp 2 — chọn hàng tại nguồn):
 *   liệt kê hàng tuyến bán, giới hạn bởi tiền mang theo + sức chở xe + lượng còn ở nguồn tuần này (R7),
 *   hiện luôn mức tiết kiệm so với mua mối lái (§5.6).
 * - Chưa có chuyến (đã mở tuyến): nút "🚚 Đi tỉnh" mở bảng chọn tuyến + tiền mang theo để khởi hành
 *   (L2 chỉ dùng xe máy — mua xe chở hàng làm ở L3+; các nhịp mặc cả/chuyện dọc đường ở L4–L5).
 */
const fmt = (m: number): string => {
  const x = Math.floor(m) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};

export function TripOverlay() {
  const level = useGame((s) => s.level);
  const trip = useGame((s) => s.biz.trip);
  const minutes = useClock((s) => s.minutes);
  const startTrip = useGame((s) => s.startTrip);

  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string>('');
  const [cash, setCash] = useState('300000');

  // Đang đi: thẻ tiến độ + bàn chọn hàng (L3).
  if (trip) {
    const route = ROUTES.find((r) => r.id === trip.routeId);
    const hauler = haulerById(trip.hauler);
    const p = tripProgress(trip, minutes);
    const remain = tripRemaining(trip, minutes);
    return (
      <div className="trip-ov">
        <div className="trip-ov-card">
          <div className="trip-ov-head">
            <b>{route?.icon ?? '🚚'} {hauler?.name ?? 'Xe'} đi {route?.name ?? ''}</b>
            <span className="trip-ov-when">về {fmt(trip.returnAt)}</span>
          </div>
          <div className="trip-bar"><div className="trip-bar-fill" style={{ width: `${Math.round(p * 100)}%` }} /></div>
          <p className="trip-ov-note">
            {remain > 0 ? <>Còn {Math.ceil(remain / 60)}h nữa xe về — đang vắng tiệm.</> : 'Xe vừa về tới.'}
            {' '}Mang theo <b>{formatMoney(trip.cash)}</b> mua hàng.
          </p>
        </div>
        <CartEditor key={trip.routeId} trip={trip} />
        <RoadEvents trip={trip} />
        <HaggleEditor trip={trip} />
      </div>
    );
  }

  const unlocked = ROUTES.filter((r) => routeUnlocked(r, level));
  if (unlocked.length === 0) return null;

  if (!open) {
    return (
      <div className="trip-ov">
        <button className="trip-ov-launch" onClick={() => setOpen(true)}>🚚 Đi tỉnh</button>
      </div>
    );
  }

  const go = () => {
    const c = parseInt(cash, 10);
    if (Number.isNaN(c) || c <= 0) return;
    startTrip(picked, 'self', c);
    setOpen(false);
    setPicked('');
  };

  return (
    <div className="trip-ov">
      <div className="trip-ov-card">
        <div className="trip-ov-head"><b>🚚 Chọn chuyến đi tỉnh</b></div>
        {unlocked.map((r) => {
          const sel = picked === r.id;
          return (
            <button key={r.id} className={`trip-ov-route ${sel ? 'sel' : ''}`} onClick={() => setPicked(r.id)}>
              <span className="trip-ov-route-name">{r.icon} {r.name}</span>
              <span className="trip-ov-route-meta">{r.hours}h khứ hồi · mở cấp {r.unlock}</span>
            </button>
          );
        })}
        <label className="trip-ov-cash">
          Tiền mang theo (đ)
          <input type="number" value={cash} min={1} onChange={(e) => setCash(e.target.value)} />
        </label>
        <Garage />
        <div className="trip-ov-actions">
          <button className="mini-btn" onClick={() => setOpen(false)}>Bỏ qua</button>
          <button className="mini-btn primary" disabled={!picked} onClick={go}>Lên đường</button>
        </div>
      </div>
    </div>
  );
}

/** Nhịp 2 — chọn hàng chở về tại nguồn (L3). Giới hạn: tiền mang theo + sức chở + weeklyCap (R7). */
function CartEditor({ trip }: { trip: TripState }) {
  const level = useGame((s) => s.level);
  const biz = useGame((s) => s.biz);
  const tripSetCart = useGame((s) => s.tripSetCart);

  const route = routeById(trip.routeId);
  const hauler = haulerById(trip.hauler);
  const [draft, setDraft] = useState<Record<string, number>>({ ...trip.cart });
  const [open, setOpen] = useState(false);

  // Hàng tuyến bán mà người chơi ĐÃ MỞ (product.unlock ≤ level).
  const goods = useMemo(() => {
    if (!route) return [];
    return route.goods
      .map((g) => ({ g, p: productById(g.productId) }))
      .filter((x): x is { g: typeof route.goods[number]; p: NonNullable<ReturnType<typeof productById>> } => !!x.p && x.p.unlock <= level)
      .map(({ g, p }) => ({ pid: g.productId, p, price: routeBuyPrice(p.buy, routeDiscountFor(route, p.id, p.category)) }));
  }, [route, level]);

  if (!route || !hauler || goods.length === 0) return null;

  const stock = routeStockResolve(biz.routeStock, route, trip.day);
  const used = cartCases(draft);
  const t = { ...trip, cart: draft };
  const paid = cartBuyCost(t, route);
  const savings = cartSavings(t, route);

  const setQ = (pid: string, q: number) => {
    const next = { ...draft };
    if (q <= 0) delete next[pid];
    else next[pid] = q;
    setDraft(next);
  };

  const commit = () => { tripSetCart(draft); setOpen(false); };

  return (
    <div className="trip-ov-card">
      <button className="trip-ov-route" onClick={() => setOpen(!open)}>
        <span className="trip-ov-route-name">🛒 Giỏ hàng chở về</span>
        <span className="trip-ov-route-meta">
          {Object.keys(draft).length ? `${Object.values(draft).reduce((n, q) => n + q, 0)} món · ${formatMoney(paid)}` : 'chưa chốt'}
          {savings > 0 ? ` (tiết kiệm ${formatMoney(savings)})` : ''}
        </span>
      </button>

      {open && (
        <div className="trip-shop">
          {goods.map(({ pid, p, price }) => {
            const left = routeStockLeft(stock, route, pid, p.category);
            const size = caseSize(pid);
            const q = draft[pid] ?? 0;
            const qCases = casesFor(pid, q);
            const remainingCap = Math.max(0, hauler.cases - (used - qCases));
            const maxByCap = remainingCap * size;
            const maxByLeft = Math.max(0, left);
            const maxByCash = price > 0 ? Math.floor((trip.cash - (paid - price * q)) / price) : 0;
            const maxQ = Math.max(0, Math.min(maxByCap, maxByLeft, maxByCash));
            return (
              <div key={pid} className="trip-shop-row">
                <div className="trip-shop-info">
                  <span className="trip-shop-name">{p.name}</span>
                  <span className="trip-shop-meta">{formatMoney(price)}/món · còn {left} tuần này · {size}/thùng</span>
                </div>
                <div className="trip-shop-step">
                  <button className="trip-shop-btn" disabled={q <= 0} onClick={() => setQ(pid, q - 1)}>−</button>
                  <input className="trip-shop-qty" type="number" min={0} max={maxQ} value={q}
                    onChange={(e) => setQ(pid, Math.max(0, Math.min(maxQ, Math.floor(Number(e.target.value) || 0))))} />
                  <button className="trip-shop-btn" disabled={q >= maxQ} onClick={() => setQ(pid, q + 1)}>+</button>
                </div>
              </div>
            );
          })}
          <div className="trip-shop-total">
            <span>Chở {used}/{hauler.cases} thùng · {formatMoney(paid)}/{formatMoney(trip.cash)}đ</span>
            {savings > 0 && <span className="trip-shop-save">+{formatMoney(savings)} so mối lái</span>}
          </div>
          <div className="trip-ov-actions">
            <button className="mini-btn" onClick={() => setOpen(false)}>Đóng</button>
            <button className="mini-btn primary" onClick={commit}>Chốt giỏ</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Nhịp 3 — Mặc cả với người bán tại nguồn (L4, SPEC §5.6). Trả giá = % giảm thêm so với giá niêm yết tuyến;
 *  sàn ẩn tất định theo seed, 3 lượt; ép quá tay 3 lần liền → phật ý (sàn cao hơn 2 tuần). */
function HaggleEditor({ trip }: { trip: TripState }) {
  const biz = useGame((s) => s.biz);
  const weatherSeed = useGame((s) => s.weatherSeed);
  const tripHaggle = useGame((s) => s.tripHaggle);
  const tripAcceptPrice = useGame((s) => s.tripAcceptPrice);

  const route = routeById(trip.routeId);
  const rel = biz.supplierRel?.[`route:${route?.id ?? ''}`];
  const tier = rel ? relTier(rel.spent).level : 0;
  const grudge = !!biz.routeGrudge && biz.routeGrudge.routeId === route?.id && biz.routeGrudge.untilWeek >= weekOfDay(trip.day);
  const cases = cartCases(trip.cart);
  const floor = route ? haggleFloor(route, weatherSeed, trip.day, tier, cases, 0, grudge) : 0;
  const discount = haggleDiscount(trip.haggle);
  const round = trip.haggle?.round ?? 0;
  const done = discount > 0 || round >= HAGGLE_MAX_ROUNDS;
  const [offer, setOffer] = useState(0);

  if (!route || Object.keys(trip.cart).length === 0) return null;
  const listed = cartBuyCost(trip, route);
  const paid = done ? Math.round(listed * (1 - discount)) : Math.round(listed * (1 - offer));
  const pct = Math.round(offer * 100);
  const mood = discount > 0 ? '😊' : round >= HAGGLE_MAX_ROUNDS ? '😐' : '🙂';

  return (
    <div className="trip-ov-card">
      <div className="trip-ov-route">
        <span className="trip-ov-route-name">🤝 Mặc cả với người bán</span>
        <span className="trip-ov-route-meta">
          {done
            ? (discount > 0 ? `Chốt −${Math.round(discount * 100)}% → ${formatMoney(paid)}` : 'Mua giá niêm yết.')
            : `Giá niêm yết ${formatMoney(listed)} · còn ${HAGGLE_MAX_ROUNDS - round} lượt`}
        </span>
      </div>

      {!done && (
        <div className="trip-haggle">
          <div className="trip-haggle-face">
            {mood} {grudge ? 'Người bán vẫn còn phật ý (giá khó xuống).' : (tier > 0 ? `Mối quen bậc ${tier} — dễ mặc cả hơn.` : 'Trả giá nhẹ nhẹ, đừng ép quá tay.')}
          </div>
          <div className="trip-haggle-row">
            <span>Giảm thêm {pct}% → {formatMoney(paid)}</span>
            <input className="trip-haggle-range" type="range" min={0} max={Math.round(HAGGLE_MAX_OFFER * 100)} step={1}
              value={pct} onChange={(e) => setOffer(Number(e.target.value) / 100)} />
          </div>
          <div className="trip-ov-actions">
            <button className="mini-btn" onClick={() => tripAcceptPrice()}>Thôi, giá đó được rồi</button>
            <button className="mini-btn primary" onClick={() => tripHaggle(offer)}>Trả giá</button>
          </div>
        </div>
      )}
      {done && discount > 0 && (
        <div className="trip-ov-actions">
          <button className="mini-btn" onClick={() => tripAcceptPrice()}>Chốt xe hàng</button>
        </div>
      )}
    </div>
  );
}

/** Hệ 5-L5 — Chuyện dọc đường (nhịp 1 lúc ~20%, nhịp 4 lúc ~80%). Rút TẤT ĐỊNH theo seed;
 *  hiện khi xe vừa qua mốc và chưa xử lý; chọn → tripChoose áp dụng hiệu ứng. */
function RoadEvents({ trip }: { trip: TripState }) {
  const s = useGame();
  const tripChoose = useGame((x) => x.tripChoose);
  const minutes = useClock((x) => x.minutes);
  const hauler = haulerById(trip.hauler);
  const cases = hauler?.cases ?? 0;
  const ctx = tripCtx({ weather: s.weather, regulars: s.regulars }, trip, cases);
  const p = tripProgress(trip, minutes);
  const evtDi = roadEventDraw(s.weatherSeed, trip.day, trip.routeId, 1, ctx);
  const evtVe = roadEventDraw(s.weatherSeed, trip.day, trip.routeId, 4, ctx);
  const flagged = new Set(trip.flags);

  // Nhịp 1: trong khoảng [20%, 45%). Nhịp 4: từ 80% trở đi.
  const showDi = p >= 0.2 && p < 0.45 && evtDi && !flagged.has(evtDi.id);
  const showVe = p >= 0.8 && evtVe && !flagged.has(evtVe.id);
  const evt = showVe ? evtVe : showDi ? evtDi : null;
  if (!evt) return null;

  return (
    <div className="trip-ov-card">
      <div className="trip-ov-head"><b>{evt.icon} {evt.title}</b></div>
      <p className="trip-ov-note">{evt.desc}</p>
      <div className="trip-event">
        {evt.options.map((o, i) => (
          <button key={i} className="trip-event-opt"
            onClick={() => { tripChoose(evt.id, i); }}
          >
            {o.label}
            <span className="trip-event-cost">{fmtCost(o)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtCost(o: { label: string; minutes: number; cost?: number; wet?: boolean; friend?: number; sell?: boolean }) {
  if (o.cost) return `−${formatMoney(o.cost)} · +${o.minutes}′`;
  if (o.friend) return `+${o.friend} thân thiết · +${o.minutes}′`;
  if (o.sell) return 'bán bớt hàng';
  if (o.wet) return 'hàng dễ ướt';
  return o.minutes > 0 ? `+${o.minutes}′` : '';
}

/** Hệ 5-L6 — sắm xe chở hàng & thùng đá giữ lạnh (bảng nhỏ trong bảng chọn chuyến). */
function Garage() {
  const level = useGame((s) => s.level);
  const money = useGame((s) => s.money);
  const hauler = useGame((s) => s.biz.hauler);
  const coolBox = useGame((s) => s.biz.coolBox);
  const buyHauler = useGame((s) => s.buyHauler);
  const buyCoolBox = useGame((s) => s.buyCoolBox);
  const open = useGame((s) => s.biz.trip !== undefined);

  const cars = HAULERS.filter((h) => haulerUnlocked(h, level));
  const can = (price: number) => money >= price;
  return (
    <div className="trip-garage">
      <div className="trip-garage-title">🛠 Xe & thùng đá</div>
      <div className="trip-garage-row">
        {cars.map((h) => {
          const has = hauler === h.id;
          return (
            <button key={h.id} className="trip-garage-btn"
              disabled={has || open || !can(h.price)}
              onClick={() => buyHauler(h.id)}>
              {has ? `✓ ${h.name}` : `${h.icon} ${h.name} ${h.price ? formatMoney(h.price) : 'miễn phí'}`}
              <span className="trip-garage-sub">{h.cases} thùng/con · mở cấp {h.unlock}</span>
            </button>
          );
        })}
        <button className="trip-garage-btn" disabled={coolBox || open || !can(COOL_BOX.price)}
          onClick={() => buyCoolBox()}>
          {coolBox ? '✓ Thùng đá' : `${COOL_BOX.icon} Thùng đá ${formatMoney(COOL_BOX.price)}`}
          <span className="trip-garage-sub">hàng tươi không mất hạn</span>
        </button>
      </div>
    </div>
  );
}
