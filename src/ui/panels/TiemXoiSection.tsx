import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import {
  TIEM_XOI_COST_MUL, TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_TARGET, TIEM_XOI_UNLOCK,
  TIEM_XOI_WAGE, tiemXoiCapacity, tiemXoiHandQty, tiemXoiTarget, TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL, tiemXoiDineCap, tiemXoiRainMul,
} from '../../data/tiemXoi';
import { styles } from './shared';

/** Tiệm xôi (GĐ412): mục riêng trong bảng Quán nước — không thêm nút HUD. Hiện từ cấp mở khoá. */
export function TiemXoiSection() {
  const { biz, level, money, day, weather, buyTiemXoi, hireTiemXoi, fireTiemXoi, steamXoiHand, expandTiemXoi } = useGame();
  const t = biz.tiemXoi;
  const last = biz.tiemXoiLast;
  if (!t.open && level < TIEM_XOI_UNLOCK) return null;
  const off = Math.round((1 - TIEM_XOI_COST_MUL) * 100);
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10 }}>
      <b>🍚 Tiệm xôi</b>
      {!t.open ? (
        <>
          <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Nấu xôi số lượng lớn, rẻ hơn nhập lẻ {off}% — mỗi đêm bù kho tới {TIEM_XOI_TARGET} phần/món</li>
            <li>Quây xôi trong tiệm vẫn dùng bình thường</li>
            <li>Giá {formatMoney(TIEM_XOI_PRICE)} · thợ {formatMoney(TIEM_XOI_WAGE)}/ngày, tối đa {TIEM_XOI_MAX_STAFF}</li>
          </ul>
          <button style={{ ...styles.btn, marginLeft: 0, marginTop: 6 }} disabled={money < TIEM_XOI_PRICE} onClick={buyTiemXoi}>
            Mở tiệm xôi ({formatMoney(TIEM_XOI_PRICE)})
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            👩‍🍳 Thợ {t.staff}/{TIEM_XOI_MAX_STAFF} · nấu tối đa {tiemXoiCapacity(t.staff, !!t.big)} phần/đêm · giữ {tiemXoiTarget(t)} phần/món
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>🪑 Khách ngồi ăn tại tiệm tối đa {tiemXoiDineCap(t.staff, !!t.big)} suất/ngày (lấy xôi trong kho, bán giá lẻ) · đã phục vụ {t.dineTotal ?? 0} suất{tiemXoiRainMul(weather) > 1 ? ' · 🌧️ mưa: khách vào trú, ×1.2 suất' : ''}</div>
          {last && (
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Hôm qua: {last.total} phần · chi {formatMoney(last.cost + last.wages)} · rẻ hơn nhập lẻ {formatMoney(last.saved)}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <button style={{ ...styles.btn, marginLeft: 0 }} disabled={t.staff >= TIEM_XOI_MAX_STAFF || money < TIEM_XOI_HIRE_FEE} onClick={hireTiemXoi}>
              Tuyển thợ ({formatMoney(TIEM_XOI_HIRE_FEE)})
            </button>
            <button style={styles.btn} disabled={t.staff <= 0} onClick={fireTiemXoi}>Cho nghỉ 1 thợ</button>
            <button style={styles.btn} disabled={t.handDay === day} onClick={() => steamXoiHand()} title="Phím J ở sạp xôi cũng được">
              🍚 Tự đồ {tiemXoiHandQty(t.staff)} phần{t.handDay === day ? ' (mai đồ tiếp)' : ''}
            </button>
            {!t.big && (
              <button style={styles.btn} disabled={level < TIEM_XOI_BIG_LEVEL || money < TIEM_XOI_BIG_COST} onClick={() => expandTiemXoi()}>
                {level < TIEM_XOI_BIG_LEVEL ? `Mở rộng bếp: cấp ${TIEM_XOI_BIG_LEVEL}` : `Mở rộng bếp ${formatMoney(TIEM_XOI_BIG_COST)} (120 phần, nấu ×1.5)`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
