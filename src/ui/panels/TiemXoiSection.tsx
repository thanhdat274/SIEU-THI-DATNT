import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { shortLabel } from '../shortLabel';
import {
  TIEM_XOI_COST_MUL, TIEM_XOI_HIRE_FEE, TIEM_XOI_MAX_STAFF, TIEM_XOI_PRICE, TIEM_XOI_TARGET, TIEM_XOI_UNLOCK,
  TIEM_XOI_WAGE, tiemXoiCapacity, tiemXoiHandQty, tiemXoiTarget, TIEM_XOI_BIG_COST, TIEM_XOI_BIG_LEVEL, tiemXoiDineCap, tiemXoiRainMul, tiemXoiWeekendMul, tiemXoiLastLine, isXoiCungDay, tiemXoiCungMul, tiemXoiStaffValues, tiemXoiExpandPayback,
} from '../../data/tiemXoi';
import { Callout, styles } from './shared';

/** Tiệm xôi (GĐ412): mục riêng trong bảng Quán nước — không thêm nút HUD. Hiện từ cấp mở khoá. */
export function TiemXoiSection() {
  const { biz, level, money, day, weather, storage, buyTiemXoi, hireTiemXoi, fireTiemXoi, steamXoiHand, expandTiemXoi } = useGame();
  const t = biz.tiemXoi;
  const last = biz.tiemXoiLast;
  // GĐ1246 — "từng thợ xôi đáng đồng lương?" (thuần đọc, song song quán nước GĐ188). Chỉ khi tiệm đang chạy có thợ.
  const staffValues = t.open && t.staff > 0 ? tiemXoiStaffValues(t, level, storage, day) : [];
  // GĐ1247 — "Mở rộng bếp 20tr hồi vốn bao lâu?" (thuần đọc, song song quán nước GĐ193). Chỉ khi chưa mở rộng.
  const expandPay = t.open && !t.big ? tiemXoiExpandPayback(t, level, storage, day) : null;
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
            {shortLabel(`Mở tiệm xôi (${formatMoney(TIEM_XOI_PRICE)})`, TIEM_XOI_PRICE, money)}
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            👩‍🍳 Thợ {t.staff}/{TIEM_XOI_MAX_STAFF} · nấu tối đa {tiemXoiCapacity(t.staff, !!t.big)} phần/đêm · giữ {Math.round(tiemXoiTarget(t) * tiemXoiCungMul(day))} phần/món{isXoiCungDay(day) ? ' 🙏' : ''}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>🪑 Khách ngồi ăn tại tiệm tối đa {tiemXoiDineCap(t.staff, !!t.big)} suất/ngày (lấy xôi trong kho, bán giá lẻ) · đã phục vụ {t.dineTotal ?? 0} suất{tiemXoiRainMul(weather) > 1 ? ' · 🌧️ mưa: khách vào trú, ×1,2 suất' : ''}{tiemXoiWeekendMul(day) > 1 ? ' · 👨‍👩‍👧 cuối tuần ×1,15 suất' : ''}{isXoiCungDay(day) ? ' · 🙏 ngày cúng ×1,3 suất' : ''}</div>
          {!isXoiCungDay(day) && isXoiCungDay(day + 1) && <div style={{ fontSize: 12, opacity: 0.85 }}>🙏 Mai là ngày cúng: khách mua xôi ×1,3 — thợ tự nấu đầy kho ×1,3</div>}
          {last && (
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {tiemXoiLastLine(last)}
            </div>
          )}
          {staffValues.length > 0 && (
            <Callout
              tone={staffValues.some((v) => v.verdict !== 'ok') ? 'warn' : 'ok'}
              title="🧑‍🍳 Từng thợ đáng đồng lương?"
              style={{ marginTop: 6 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {staffValues.map((v) => (
                  <div key={v.index} style={{ fontSize: 12 }}>
                    <b style={{ color: v.verdict === 'ok' ? '#2ecc71' : '#e67e22' }}>
                      {v.verdict === 'ok' ? '✔' : v.verdict === 'warn' ? '◑' : '✖'} Thợ thứ {v.index}
                    </b>
                    {' · '}{formatMoney(v.marginalValue)}/ngày lợi nhuận bán xôi nấu thêm —{v.marginNet >= 0
                      ? ` đáng lương ${formatMoney(v.wage)} (lãi +${formatMoney(v.marginNet)})`
                      : v.ratio >= 0.5
                        ? ` chưa đáng ${formatMoney(v.wage)} (lỗ ${formatMoney(-v.marginNet)}/ngày)`
                        : ` nên cho nghỉ — kho xôi gần đủ, chủ tự nấu 60 phần`}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                Giá trị biên = lợi nhuận bán của xôi thợ này nấu thêm so với ít hơn 1 thợ, trừ lương. Kho xôi đã đủ thì thợ thêm không nấu thêm.
              </div>
            </Callout>
          )}
          <div style={{ marginTop: 6 }}>
            <button style={{ ...styles.btn, marginLeft: 0 }} disabled={t.staff >= TIEM_XOI_MAX_STAFF || money < TIEM_XOI_HIRE_FEE} onClick={hireTiemXoi}>
              {t.staff >= TIEM_XOI_MAX_STAFF ? `Tuyển thợ (${formatMoney(TIEM_XOI_HIRE_FEE)})` : shortLabel(`Tuyển thợ (${formatMoney(TIEM_XOI_HIRE_FEE)})`, TIEM_XOI_HIRE_FEE, money)}
            </button>
            <button style={styles.btn} disabled={t.staff <= 0} onClick={fireTiemXoi}>Cho nghỉ 1 thợ</button>
            <button style={styles.btn} disabled={t.handDay === day} onClick={() => steamXoiHand()} title="Phím J ở sạp xôi cũng được">
              🍚 Tự đồ {tiemXoiHandQty(t.staff)} phần{t.handDay === day ? ' (mai đồ tiếp)' : ''}
            </button>
            {!t.big && (() => {
              const seg = [];
              if (level >= TIEM_XOI_BIG_LEVEL && expandPay) {
                const c = expandPay.verdict === 'worth' ? '#2ecc71' : expandPay.verdict === 'slow' ? '#e67e22' : '#e74c3c';
                seg.push(
                  <div key="p" style={{ fontSize: 12, color: c, marginTop: 6 }}>
                    {expandPay.verdict === 'full'
                      ? <span>🔻 Mở rộng bếp chưa giúp gì: kho xôi hầu như đã đủ, bếp lớn không nấu thêm — nhập/giữ món xôi khan trước.</span>
                      : <span>💸 Ước hồi vốn {formatMoney(expandPay.cost)}: mở rộng giúp bán thêm ~{formatMoney(expandPay.netPerDay)}/đêm → ~{expandPay.paybackDays} ngày{expandPay.verdict === 'worth' ? ' (đáng)' : ' (chậm — cân nhắc)'}{' '}· nếu kho thiếu đủ để nấu thêm</span>}
                  </div>
                );
              }
              seg.push(
                <button key="b" style={styles.btn} disabled={level < TIEM_XOI_BIG_LEVEL || money < TIEM_XOI_BIG_COST} onClick={() => expandTiemXoi()}>
                  {level < TIEM_XOI_BIG_LEVEL ? `Mở rộng bếp: cấp ${TIEM_XOI_BIG_LEVEL}` : shortLabel(`Mở rộng bếp ${formatMoney(TIEM_XOI_BIG_COST)} (120 phần, nấu ×1,5)`, TIEM_XOI_BIG_COST, money)}
                </button>
              );
              return seg;
            })()}
          </div>
        </>
      )}
    </div>
  );
}
