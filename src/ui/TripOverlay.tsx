import { useMemo, useState } from 'react';
import { useClock, useGame } from '../core/store';
import { ROUTES, HAULERS, COOL_BOX, haulerById, routeById, haulerUnlocked, routeUnlocked, routeBuyPrice, routeDiscountFor } from '../data/routes';
import {
  routeStockResolve, routeStockLeft, cartCases, cartBuyCost, cartBuyCostDiscounted, cartSavings, tripProgress, tripRemaining, weekOfDay, routeRelTier, debtOverdue, TRIP_DEBT_DUE_DAYS, TRIP_DEBT_PCT, tripPayoff, type TripState,
} from '../data/trip';
import { haggleFloor, haggleDiscount, HAGGLE_MAX_ROUNDS, HAGGLE_MAX_OFFER } from '../data/haggle';
import { roadEventDraw } from '../data/roadEvents';
import { tripCtx } from '../core/slices/trip';
import { relTier } from '../data/supplierRel';
import { productById, formatMoney, caseSize, casesFor } from '../data/products';
import { t } from '../core/i18n';
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
            <b>{route?.icon ?? '🚚'} {hauler?.name ?? 'Xe'}{' '}{t('trip.di')}{' '}{route?.name ?? ''}</b>
            <span className="trip-ov-when">{t('trip.ve')}{' '}{fmt(trip.returnAt)}</span>
          </div>
          <div className="trip-bar"><div className="trip-bar-fill" style={{ width: `${Math.round(p * 100)}%` }} /></div>
          <p className="trip-ov-note">
            {trip.by === 'self'
              ? (remain > 0 ? <>{t('trip.con')}{' '}{Math.ceil(remain / 60)}{t('trip.h_nua_xe_ve_dang_vang')}</> : t('trip.xe_vua_ve_toi'))
              : (remain > 0 ? <>{t('trip.con')}{' '}{Math.ceil(remain / 60)}{t('trip.h_nua_nguoi_giao_ve_chu')}</> : t('trip.nguoi_giao_vua_ve_toi'))}
            {' '}Mang theo <b>{formatMoney(trip.cash)}</b>{' '}{t('trip.mua_hang')}
          </p>
        </div>
        {trip.by === 'self' && (
          <>
            <CartEditor key={trip.routeId} trip={trip} />
            <RoadEvents trip={trip} />
            <HaggleEditor trip={trip} />
          </>
        )}
        <DebtEditor />
      </div>
    );
  }

  const unlocked = ROUTES.filter((r) => routeUnlocked(r, level));
  if (unlocked.length === 0) return null;

  if (!open) {
    return (
      <div className="trip-ov">
        <DebtEditor />
        <button className="trip-ov-launch" onClick={() => setOpen(true)}>{t('trip.di_tinh')}</button>
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
        <div className="trip-ov-head"><b>{t('trip.chon_chuyen_di_tinh')}</b></div>
        {unlocked.map((r) => {
          const sel = picked === r.id;
          return (
            <button key={r.id} className={`trip-ov-route ${sel ? 'sel' : ''}`} onClick={() => setPicked(r.id)}>
              <span className="trip-ov-route-name">{r.icon} {r.name}</span>
              <span className="trip-ov-route-meta">{r.hours}{t('trip.h_khu_hoi_mo_cap')}{' '}{r.unlock}</span>
            </button>
          );
        })}
        <label className="trip-ov-cash">
          {t('trip.tien_mang_theo_d')}
          <input type="number" value={cash} min={1} onChange={(e) => setCash(e.target.value)} />
        </label>
        <Garage />
        <DebtEditor />
        {picked && <PayoffCard routeId={picked} />}
        <CourierSender routeId={picked} cash={cash} />
        <div className="trip-ov-actions">
          <button className="mini-btn" onClick={() => setOpen(false)}>{t('trip.bo_qua')}</button>
          <button className="mini-btn primary" disabled={!picked} onClick={go}>{t('trip.len_duong')}</button>
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
  const tier = routeRelTier(biz.supplierRel?.[`route:${route?.id ?? ''}`]);
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

  const stock = routeStockResolve(biz.routeStock, route, trip.day, tier);
  const used = cartCases(draft);
  const tr = { ...trip, cart: draft };
  const paid = cartBuyCost(tr, route);
  const savings = cartSavings(tr, route);
  const debtLimit = tier >= 3 ? Math.floor(trip.cash * TRIP_DEBT_PCT) : 0;
  const moneyLbl = paid > trip.cash
    ? t('trip.no', { v0: formatMoney(paid - trip.cash) })
    : tier >= 3 ? t('trip.moi_ruot_ghi_no_duoc') : '';

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
        <span className="trip-ov-route-name">{t('trip.gio_hang_cho_ve')}</span>
        <span className="trip-ov-route-meta">
          {Object.keys(draft).length ? t('trip.mon', { v0: Object.values(draft).reduce((n, q) => n + q, 0), v1: formatMoney(paid) }) : t('trip.chua_chot')}
          {savings > 0 ? t('trip.tiet_kiem', { v0: formatMoney(savings) }) : ''}
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
            const cashRoom = trip.cash + debtLimit;
            const maxByCash = price > 0 ? Math.floor((cashRoom - (paid - price * q)) / price) : 0;
            const maxQ = Math.max(0, Math.min(maxByCap, maxByLeft, maxByCash));
            return (
              <div key={pid} className="trip-shop-row">
                <div className="trip-shop-info">
                  <span className="trip-shop-name">{p.name}</span>
                  <span className="trip-shop-meta">{formatMoney(price)}{t('trip.mon_con')}{' '}{left}{' '}{t('trip.tuan_nay')}{' '}{size}{t('trip.thung')}</span>
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
            <span>{t('trip.cho')}{' '}{used}/{hauler.cases}{' '}{t('trip.thung_2')}{' '}{formatMoney(paid)}/{formatMoney(trip.cash)}{t('trip.d')}{moneyLbl}</span>
            {savings > 0 && <span className="trip-shop-save">+{formatMoney(savings)}{' '}{t('trip.so_moi_lai')}</span>}
          </div>
          <div className="trip-ov-actions">
            <button className="mini-btn" onClick={() => setOpen(false)}>{t('trip.dong')}</button>
            <button className="mini-btn primary" onClick={commit}>{t('trip.chot_gio')}</button>
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
        <span className="trip-ov-route-name">{t('trip.mac_ca_voi_nguoi_ban')}</span>
        <span className="trip-ov-route-meta">
          {done
            ? (discount > 0 ? t('trip.chot', { v0: Math.round(discount * 100), v1: formatMoney(paid) }) : t('trip.mua_gia_niem_yet'))
            : t('trip.gia_niem_yet_con_luot', { v0: formatMoney(listed), v1: HAGGLE_MAX_ROUNDS - round })}
        </span>
      </div>

      {!done && (
        <div className="trip-haggle">
          <div className="trip-haggle-face">
            {mood} {grudge ? t('trip.nguoi_ban_van_con_phat_y') : (tier > 0 ? t('trip.moi_quen_bac_de_mac_ca', { tier }) : t('trip.tra_gia_nhe_nhe_dung_ep'))}
          </div>
          <div className="trip-haggle-row">
            <span>{t('trip.giam_them')}{' '}{pct}% → {formatMoney(paid)}</span>
            <input className="trip-haggle-range" type="range" min={0} max={Math.round(HAGGLE_MAX_OFFER * 100)} step={1}
              value={pct} onChange={(e) => setOffer(Number(e.target.value) / 100)} />
          </div>
          <div className="trip-ov-actions">
            <button className="mini-btn" onClick={() => tripAcceptPrice()}>{t('trip.thoi_gia_do_duoc_roi')}</button>
            <button className="mini-btn primary" onClick={() => tripHaggle(offer)}>{t('trip.tra_gia')}</button>
          </div>
        </div>
      )}
      {done && discount > 0 && (
        <div className="trip-ov-actions">
          <button className="mini-btn" onClick={() => tripAcceptPrice()}>{t('trip.chot_xe_hang')}</button>
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
  if (o.friend) return t('trip.than_thiet', { friend: o.friend, minutes: o.minutes });
  if (o.sell) return t('trip.ban_bot_hang');
  if (o.wet) return t('trip.hang_de_uot');
  return o.minutes > 0 ? `+${o.minutes}′` : '';
}

/** Hệ 5-L7 — thẻ nợ mối ruột tại nguồn (SPEC §5.7): chưa trả nổi thì bấm trả; quá hạn đỏ + mất ưu đãi. */
function DebtEditor() {
  const s = useGame();
  const day = s.day;
  const d = s.biz.routeDebt;
  const tripRepayDebt = useGame((x) => x.tripRepayDebt);
  if (!d) return null;
  const overdue = debtOverdue(d, day);
  const route = routeById(d.routeId);
  return (
    <div className="trip-ov-card">
      <div className="trip-ov-head">
        <b>{overdue ? t('trip.no_moi_ruot_qua_han') : t('trip.ghi_no_chuyen_di')}</b>
        <span className={`trip-debt-due ${overdue ? 'late' : ''}`}>
          {formatMoney(d.amount)} · {overdue ? t('trip.qua_han_ngay', { v0: day - d.dueDay }) : t('trip.han', { dueDay: d.dueDay })}
        </span>
      </div>
      <p className="trip-ov-note">{route?.name ?? ''}{' '}{t('trip.con_2')}{' '}{formatMoney(d.amount)}{' '}{t('trip.tra_trong')}{' '}{TRIP_DEBT_DUE_DAYS}{' '}{t('trip.ngay_keo_mat_uu_dai_moi')}</p>
      <div className="trip-ov-actions">
        <button className="mini-btn primary" disabled={s.money < d.amount} onClick={() => tripRepayDebt()}>{t('trip.tra_no')}{' '}{formatMoney(d.amount)}</button>
      </div>
    </div>
  );
}

/** Hệ 5-L8 — thẻ tripPayoff (SPEC §5.8): so "tự đi / sai người / mua mối lái" bằng tiền thật cho
 *  một giỏ tham chiếu (một chuyến ba gác đầy). Dữ liệu thuần, chỉ hiện khi đã chọn tuyến. */
function PayoffCard({ routeId }: { routeId: string }) {
  const route = routeById(routeId);
  if (!route) return null;
  const p = useMemo(() => tripPayoff(route), [route]);
  return (
    <div className="trip-ov-route" style={{ cursor: 'default' }}>
      <span className="trip-ov-route-name">{t('trip.so_sanh_mot_chuyen')}{' '}{route.icon} {route.name}</span>
      <span className="trip-ov-route-meta">{t('trip.gio_uoc')}{p.cases}{' '}{t('trip.thung_cung_weeklycap_tuan')}</span>
      {p.rows.map((r) => (
        <div key={r.id} className="trip-payoff-row">
          <span className="trip-payoff-name">{r.icon} {r.name}</span>
          <span className={r.id === p.best ? 'trip-payoff-cost best' : 'trip-payoff-cost'}>
            {formatMoney(r.cost)} <em>{r.savings > 0 ? `−${formatMoney(r.savings)}` : `+${formatMoney(-r.savings)}`}</em>
          </span>
          <span className="trip-payoff-note">{r.note}</span>
        </div>
      ))}
      <span className="trip-payoff-note">{t('trip.so_uoc_luong_de_chon_cach')}</span>
    </div>
  );
}

/** Hệ 5-L8 — sai người giao hàng (vai 🛵) đi thay (SPEC §5.8): lập sẵn giỏ theo trần tiền + sức xe,
 *  người đi không mặc cả tay (bậc ≥4★ tự mặc cả −6%), chủ ở lại tiệm. Giỏ tự động: ưu tiên món tiết kiệm nhất/thùng. */
function CourierSender({ routeId, cash }: { routeId: string; cash: string }) {
  const s = useGame();
  const level = s.level;
  const couriers = s.staff.filter((w) => w.role === 'courier');
  const bizH = s.biz.hauler;
  const hauler = haulerById(bizH ?? 'moto');
  const hasCargo = bizH === 'ba_gac' || bizH === 'xe_tai';
  const startTrip = useGame((x) => x.startTrip);
  const [courierId, setCourierId] = useState<number | ''>('');
  const route = routeById(routeId);
  const cashN = parseInt(cash, 10) || 0;
  if (!route || couriers.length === 0) return null;
  const tier = routeRelTier(s.biz.supplierRel?.[`route:${route.id}`]);
  const stock = routeStockResolve(s.biz.routeStock, route, s.day, tier);
  const disabled = !hasCargo || !hauler || courierId === '' || cashN <= 0;

  const buildCart = (): Record<string, number> => {
    const cart: Record<string, number> = {};
    if (!hauler) return cart;
    let spend = 0; let cases = 0;
    const cands = route.goods
      .map((g) => ({ g, p: productById(g.productId) }))
      .filter((x): x is { g: (typeof route.goods)[number]; p: NonNullable<ReturnType<typeof productById>> } => !!x.p && x.p.unlock <= level)
      .map(({ g, p }) => {
        const price = routeBuyPrice(p.buy, routeDiscountFor(route, g.productId, p.category));
        const size = caseSize(g.productId);
        return { pid: g.productId, p, price, size, savePerBox: (p.buy - price) / Math.max(1, size) };
      })
      .sort((a, b) => b.savePerBox - a.savePerBox);
    for (const c of cands) {
      const left = routeStockLeft(stock, route, c.pid, c.p.category);
      const maxQty = Math.floor(Math.min(left, (hauler.cases - cases) * c.size, c.price > 0 ? (cashN - spend) / c.price : 0));
      if (maxQty > 0) { cart[c.pid] = maxQty; spend += c.price * maxQty; cases += c.size * maxQty; }
    }
    return cart;
  };

  return (
    <div className="trip-garage">
      <div className="trip-garage-title">{t('trip.sai_nguoi_giao_hang_di_thay')}</div>
      <div className="trip-garage-row">
        {couriers.map((w) => (
          <button key={w.id} className={`trip-garage-btn ${courierId === w.id ? 'trip-garage-sel' : ''}`}
            onClick={() => setCourierId(w.id)}>
            {`🛵 ${w.name.slice(0, 12)} · ${w.skill}★`}
            <span className="trip-garage-sub">{w.skill >= 4 ? t('trip.tu_mac_ca_6') : t('trip.chua_mac_ca_duoc')}</span>
          </button>
        ))}
      </div>
      {!hasCargo && <span className="trip-garage-sub">{t('trip.can_xe_cho_hang_ba_gac')}</span>}
      <div className="trip-ov-actions">
        <button className="mini-btn primary" disabled={disabled}
          onClick={() => {
            const c = buildCart();
            if (Object.keys(c).length) startTrip(route.id, courierId as number, cashN, c);
          }}>
          {t('trip.giao_cho_nguoi_gio_tu_dong')}
        </button>
      </div>
    </div>
  );
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
              {has ? `✓ ${h.name}` : `${h.icon} ${h.name} ${h.price ? formatMoney(h.price) : t('trip.mien_phi')}`}
              <span className="trip-garage-sub">{h.cases}{' '}{t('trip.thung_con_mo_cap')}{' '}{h.unlock}</span>
            </button>
          );
        })}
        <button className="trip-garage-btn" disabled={coolBox || open || !can(COOL_BOX.price)}
          onClick={() => buyCoolBox()}>
          {coolBox ? t('trip.thung_da') : t('trip.thung_da_2', { icon: COOL_BOX.icon, v1: formatMoney(COOL_BOX.price) })}
          <span className="trip-garage-sub">{t('trip.hang_tuoi_khong_mat_han')}</span>
        </button>
      </div>
    </div>
  );
}
