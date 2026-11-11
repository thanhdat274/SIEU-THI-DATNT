import { useState } from 'react';
import { useClock, useGame } from '../core/store';
import { ROUTES, haulerById, routeUnlocked } from '../data/routes';
import { tripProgress, tripRemaining } from '../data/trip';
import { formatMoney } from '../data/products';
import './trip.css';

/**
 * Hệ 5-L2 — lớp phủ TỐI GIẢN cho Chuyến đi tỉnh (SPEC-CHIEU-RONG §5.3/§5.10).
 *
 * - Đang có chuyến: một thẻ nhỏ hiện tiến độ xe (dải đường) + giờ về + trạng thái vắng mặt.
 * - Chưa có chuyến (đã mở tuyến): nút "🚚 Đi tỉnh" mở một bảng chọn tuyến + tiền mang theo để khởi hành
 *   (L2 chỉ dùng xe máy — mua xe chở hàng làm ở L3; các nhịp chọn hàng/mặc cả ở L3–L5).
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

  // Đang đi: thẻ tiến độ tối giản.
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
            {remain > 0 ? <>Còn {Math.ceil(remain / 60)}h nữa xe về — đang vắng tiệm, nhân viên trông giúp.</> : 'Xe vừa về tới.'}
            {trip.cash > 0 && <> Mang theo <b>{formatMoney(trip.cash)}</b> mua hàng.</>}
            {Object.keys(trip.cart).length > 0 && <> Giỏ {Object.values(trip.cart).reduce((n, q) => n + q, 0)} món.</>}
          </p>
        </div>
      </div>
    );
  }

  const unlocked = ROUTES.filter((r) => routeUnlocked(r, level));
  if (unlocked.length === 0) return null;

  // Chưa đi: nút mở launcher (chỉ khi mở được ít nhất một tuyến).
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
            <button
              key={r.id}
              className={`trip-ov-route ${sel ? 'sel' : ''}`}
              onClick={() => setPicked(r.id)}
            >
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
