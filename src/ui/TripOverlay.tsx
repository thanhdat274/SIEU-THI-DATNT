import { useMemo, useState } from 'react';
import { useClock, useGame } from '../core/store';
import { ROUTES, haulerById, routeById, routeUnlocked, routeBuyPrice, routeDiscountFor } from '../data/routes';
import {
  routeStockResolve, routeStockLeft, cartCases, cartBuyCost, cartSavings, tripProgress, tripRemaining, type TripState,
} from '../data/trip';
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
