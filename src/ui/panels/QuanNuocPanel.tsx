import type * as React from 'react';
import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import {
  QUAN_NUOC_HIRE_FEE, QUAN_NUOC_MAX_STAFF, QUAN_NUOC_PRICE, QUAN_NUOC_UNLOCK, QUAN_NUOC_WAGE,
  QUAN_PRICE_OPTIONS, QUAN_WEATHER_MUL, quanNuocProjection, quanNuocCupSupply, quanNuocRestockTip, quanNuocBuildPayback, type QuanNuocPrice,
} from '../../data/quanNuoc';
import { quanNuocStaffValues } from '../../data/quanNuocStaffValue';
import { teahouseHaulRead } from '../../data/teahouseHaul';
import { Callout, Footer, styles } from './shared';
import { TiemXoiSection } from './TiemXoiSection';
import { QuanMenuSection } from './QuanMenuSection';
import { WEATHER } from '../../data/weather';

/** Thứ tự hiển thị 3 mức giờ bán: bình dân → vừa phải → đắt hơn. */
const PRICE_ORDER: readonly QuanNuocPrice[] = ['re', 'vua', 'cao'];

/** Nút pill chọn mức: đang chọn nền vàng giống Tabs trong shared để UI nhất quán. */
const pill = (on: boolean): React.CSSProperties => ({
  ...styles.btn, marginLeft: 0, borderRadius: 999,
  background: on ? '#f1c40f' : '#fff', fontWeight: on ? 700 : undefined,
});

/** Chú giải nút mức giá từ hệ số dữ liệu: "Giá ×1.3 nhưng khách −25%". */
const priceTip = (mul: number, traffic: number) => {
  const pct = Math.round(Math.abs(traffic - 1) * 100);
  const khach = traffic === 1 ? 'khách như cũ' : `khách ${traffic > 1 ? '+' : '−'}${pct}%`;
  return `Giá ×${mul} nhưng ${khach}`;
};

/** Quán Nước Đầu Ngõ: quán nước ở đầu hẻm, nguyên liệu lấy thẳng từ kho tiệm. */
export function QuanNuocPanel() {
  const { biz, level, money, storage, weather, day, buyQuanNuoc, hireQuanNuoc, fireQuanNuoc, setQuanNuocPrice, closePanel, openPanel } = useGame();
  const quan = biz.quanNuoc;
  const last = biz.quanNuocLast;
  const locked = level < QUAN_NUOC_UNLOCK;
  const canBuild = !locked && money >= QUAN_NUOC_PRICE;
  const canHire = quan.staff < QUAN_NUOC_MAX_STAFF && money >= QUAN_NUOC_HIRE_FEE;
  // GĐ127: mồi quyết định — dự phóng ROI thuê thêm (thuần đọc kho hiện tại, chặn bởi tồn đồ uống).
  const drinkUnits = quanNuocCupSupply(quan, level, storage);
  const hireProj = quan.open && quan.staff < QUAN_NUOC_MAX_STAFF ? quanNuocProjection({ ...quan, staff: quan.staff + 1 }, level, drinkUnits, weather, day) : null;
  const tonightProj = quan.open ? quanNuocProjection(quan, level, drinkUnits, weather, day) : null;
  // GĐ188: "người thứ N đáng đồng lương?" — chiều xuống (nên giữ bớt ai / sa thải ai). Thuần đọc.
  const staffValues = quan.open ? quanNuocStaffValues(quan.price, level, quan.staff, drinkUnits) : [];
  // GĐ190: thanh nạp kho — thiếu bao nhiêu ly để bán đủ tối nay + nút nhảy sang Nhập hàng.
  const restockTip = quan.open ? quanNuocRestockTip(quan, level, storage, last, weather) : null;

  return (
    <div style={{ width: '100%', maxWidth: 560 }}>
      <h2 style={styles.title}>🧋 Quán Nước Đầu Ngõ</h2>
      <p style={styles.sub}>Quán chuyên nước ở đầu hẻm — nguyên liệu lấy thẳng từ kho của mình.</p>
      {quan.open && QUAN_WEATHER_MUL[weather] !== 1 && (
        <p style={{ fontSize: 12, margin: '0 0 6px' }}>
          {WEATHER[weather].icon} {WEATHER[weather].name}: khách quán {QUAN_WEATHER_MUL[weather] > 1 ? 'đông' : 'vắng'} hơn ×{QUAN_WEATHER_MUL[weather]} — {QUAN_WEATHER_MUL[weather] > 1 ? 'nạp thêm đồ uống' : 'bớt nhập cho đỡ tồn'}
        </p>
      )}
      {!quan.open ? (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <b>🏗️ Xây quán ở đầu hẻm</b>
            <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Cần cấp <b>{QUAN_NUOC_UNLOCK}</b> · giá xây <b>{formatMoney(QUAN_NUOC_PRICE)}</b> (trả một lần, sở hữu luôn)</li>
              <li>🧃 Bán nước nguyên liệu sẵn trong kho — nước/ngọt/cà phê tồn kho có chỗ tiêu mới</li>
              <li>💰 Phí tuyển {formatMoney(QUAN_NUOC_HIRE_FEE)}/người, lương {formatMoney(QUAN_NUOC_WAGE)}/ngày, tối đa {QUAN_NUOC_MAX_STAFF} nhân viên</li>
              <li>⚙️ Ba mức giờ bán: bình dân kéo khách, đắt hơn lời cao</li>
            </ul>
            {!locked && (() => { // GĐ193: ước hồi vốn — quyết định mua (giá 25tr) có đáng không
              const bp = quanNuocBuildPayback(level);
              if (bp.verdict === 'noMenu') return null;
              const c = bp.verdict === 'worth' ? '#2ecc71' : bp.verdict === 'slow' ? '#e67e22' : '#e74c3c';
              return (
                <div style={{ fontSize: 12, marginTop: 6, color: c }}>
                  💸 Ước hồi vốn 25tr:{' '}
                  {bp.verdict === 'notworth'
                    ? `đang lỗ ~${formatMoney(-bp.netPerDay)}/ngày (1 nhân viên, giá vừa) — chờ lên cấp thêm thực đơn`
                    : `~${bp.paybackDays} ngày (lời ~${formatMoney(bp.netPerDay)}/ngày)`}{' '}
                  · nếu kho đủ
                </div>
              );
            })()}
          </div>
          <button
            style={{
              ...styles.btn, marginLeft: 0, marginTop: 10, padding: '8px 14px', fontWeight: 700,
              background: canBuild ? '#2ecc71' : '#555', color: '#fff',
              opacity: canBuild ? 1 : 0.6, cursor: canBuild ? 'pointer' : 'not-allowed',
            }}
            disabled={!canBuild}
            title={locked ? `Mở ở cấp ${QUAN_NUOC_UNLOCK}` : money < QUAN_NUOC_PRICE ? `Chưa đủ tiền (cần ${formatMoney(QUAN_NUOC_PRICE)})` : 'Xây quán và bắt đầu bán nước'}
            onClick={buyQuanNuoc}
          >
            🏗️ Xây quán ({formatMoney(QUAN_NUOC_PRICE)})
          </button>
          {locked
            ? <p style={{ fontSize: 13, color: '#e67e22', margin: '6px 0 0' }}>🔒 Mở ở cấp {QUAN_NUOC_UNLOCK}.</p>
            : money < QUAN_NUOC_PRICE && <p style={{ fontSize: 13, color: '#e67e22', margin: '6px 0 0' }}>Chưa đủ tiền — có thể vay ở mục Kinh doanh.</p>}
        </>
      ) : (
        <>
          <div style={{ ...styles.card }}>
            <b style={{ flex: 1 }}>👥 Nhân viên: {quan.staff}/{QUAN_NUOC_MAX_STAFF} · lương {formatMoney(quan.staff * QUAN_NUOC_WAGE)}/ngày</b>
            <button
              style={{
                ...styles.btn, background: canHire ? '#2ecc71' : '#555', color: '#fff',
                opacity: canHire ? 1 : 0.6, cursor: canHire ? 'pointer' : 'not-allowed',
              }}
              disabled={!canHire}
              title={quan.staff >= QUAN_NUOC_MAX_STAFF
                ? `Quán chỉ giữ được ${QUAN_NUOC_MAX_STAFF} nhân viên`
                : money < QUAN_NUOC_HIRE_FEE ? `Chưa đủ phí tuyển ${formatMoney(QUAN_NUOC_HIRE_FEE)}` : 'Tuyển thêm nhân viên pha chế'}
              onClick={hireQuanNuoc}
            >
              + Tuyển ({formatMoney(QUAN_NUOC_HIRE_FEE)})
            </button>
            <button
              style={{
                ...styles.btn, background: quan.staff > 0 ? '#e74c3c' : '#555', color: '#fff',
                opacity: quan.staff > 0 ? 1 : 0.6, cursor: quan.staff > 0 ? 'pointer' : 'not-allowed',
              }}
              disabled={quan.staff <= 0}
              title={quan.staff <= 0 ? 'Chưa có nhân viên nào' : 'Sa thải một nhân viên (bớt tiền lương mỗi ngày)'}
              onClick={fireQuanNuoc}
            >
              − Sa thải
            </button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.75, margin: '2px 0 6px' }}>
            👥 Mỗi nhân viên đón thêm khách → bán được nhiều ly hơn (tăng doanh thu thô), nhưng tốn lương mỗi ngày.
            Lợi nhuận ròng mỗi ly điều chỉnh bằng mức <b>Giờ bán</b> bên dưới.
          </p>
          {hireProj && tonightProj && (
            <div style={{ fontSize: 12, margin: '0 0 6px', color: hireProj.served > tonightProj.served && hireProj.profit - tonightProj.profit >= 0 ? '#2ecc71' : '#e67e22' }}>
              {hireProj.served > tonightProj.served && hireProj.profit - tonightProj.profit >= 0
                ? `💰 Dự phóng thuê thêm 1 người: lời ròng ~${formatMoney(hireProj.profit)}/ngày (đang ~${formatMoney(tonightProj.profit)}, +${formatMoney(hireProj.profit - tonightProj.profit)}) — đáng so với lương ${formatMoney(QUAN_NUOC_WAGE)}.`
                : hireProj.served > tonightProj.served
                  ? `💰 Thuê thêm 1 người chưa đáng: bán thêm ${formatMoney(hireProj.served - tonightProj.served)} ly nhưng lương ${formatMoney(QUAN_NUOC_WAGE)}/ngày cao hơn lời tăng (lời ròng ~${formatMoney(hireProj.profit)} vs ~${formatMoney(tonightProj.profit)}).`
                  : `💰 Thuê thêm KHÔNG đáng: kho chỉ còn ${drinkUnits} ly đồ uống, tuyển thêm không bán thêm (lời ròng ~${formatMoney(hireProj.profit)} vs ~${formatMoney(tonightProj.profit)}). Nhập nước/ngọt/cà phê trước.`}
            </div>
          )}
          <div style={{ ...styles.card }}>
            <b style={{ flex: 'none' }}>⏰ Giờ bán</b>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRICE_ORDER.map((id) => {
                const o = QUAN_PRICE_OPTIONS[id];
                return (
                  <button key={id} style={pill(quan.price === id)} title={priceTip(o.mul, o.traffic)} onClick={() => setQuanNuocPrice(id)}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          {last && (
            <div style={{ ...styles.card, display: 'block', borderLeft: `3px solid ${(last.profit ?? last.revenue) < 0 ? '#e74c3c' : '#2ecc71'}` }}>
              <b>🧾 Hôm qua: {last.served}/{last.wanted} ly · doanh thu {formatMoney(last.revenue)}</b>
              {last.wages !== undefined && last.profit !== undefined && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  lương −{formatMoney(last.wages)} · lời ròng <b style={{ color: last.profit >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(last.profit)}</b>
                </div>
              )}
              {last.served < last.wanted && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#e67e22' }}>⚠️ Kho thiếu đồ uống — nhập nước/ngọt/cà phê… để bán đủ.</div>
              )}
            </div>
          )}
          {restockTip && (
            <Callout
              tone={restockTip.verdict}
              title={restockTip.verdict === 'danger' ? '🚨 Thiếu đồ uống tối nay' : '🥤 Sắp ăn khô kho chung'}
              style={{ marginTop: 6 }}
            >
              <div style={{ fontSize: 12 }}>
                {restockTip.verdict === 'danger'
                  ? `Hôm qua đã bỏ lỡ ~${restockTip.missedRevenue.toLocaleString('vi-VN')}đ vì kho thiếu. Đêm nay quán cần ~${restockTip.wanted} ly nhưng kho chỉ còn ${restockTip.have} — cần thêm ${restockTip.shortfall} ly để bán đủ. `
                  : `Đêm nay quán cần ~${restockTip.wanted} ly nhưng kho chỉ còn ${restockTip.have} — quán ăn hết là kệ tiệm chính cạn nước. Cần thêm ${restockTip.shortfall} ly. `}
                <button
                  style={{ ...styles.btn, marginLeft: 0, padding: '2px 10px', background: restockTip.verdict === 'danger' ? '#e74c3c' : '#e67e22', color: '#fff' }}
                  onClick={() => openPanel({ type: 'order' })}
                >
                  → Nhập hàng
                </button>
              </div>
            </Callout>
          )}
          {quan.open && (() => {
            const hr = teahouseHaulRead(drinkUnits, quan, level);
            if (hr.daysLeft >= 3) return null;
            const tone = hr.verdict === 'danger' ? 'danger' : 'warn';
            const nights = hr.daysLeft === Infinity ? 'vô hạn' : `~${Math.ceil(hr.daysLeft)} đêm`;
            return (
              <Callout tone={tone} title={hr.verdict === 'danger' ? '🚨 Kho đồ uống sắp cạn' : '🥤 Quán ăn khô kho chung'} style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12 }}>
                  Kho chung chỉ còn <b>{hr.haveNow} ly</b> đồ uống, quán tiêu ~<b>{hr.needPerNight} ly/đêm</b> → còn {nights}.
                  {hr.haulNow
                    ? ' Nên chở thêm đồ uống về kho sớm (cửa sổ vài đêm), đừng chờ cạn đúng một đêm mới nhập.'
                    : ' Quán đang đóng, không đụng kho.'}{' '}
                  <button
                    style={{ ...styles.btn, marginLeft: 0, padding: '2px 10px', background: '#e67e22', color: '#fff' }}
                    onClick={() => openPanel({ type: 'order' })}
                  >
                    → Nhập đồ uống
                  </button>
                </div>
              </Callout>
            );
          })()}
          {staffValues.length > 0 && (            <Callout
              tone={staffValues.some((v) => v.verdict !== 'ok') ? 'warn' : 'ok'}
              title="🧑‍🤝‍🧑 Từng người đáng đồng lương?"
              style={{ marginTop: 6 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {staffValues.map((v) => (
                  <div key={v.index} style={{ fontSize: 12 }}>
                    <b style={{ color: v.verdict === 'ok' ? '#2ecc71' : '#e67e22' }}>
                      {v.verdict === 'ok' ? '✔' : v.verdict === 'warn' ? '◑' : '✖'} Người thứ {v.index}
                    </b>
                    {' · '}{v.marginalValue >= 0 ? '+' : ''}{formatMoney(v.marginalValue)} /ngày —
                    {v.marginNet >= 0
                      ? ` đáng lương ${formatMoney(v.wage)} (lãi +${formatMoney(v.marginNet)})`
                      : v.ratio >= 0.5
                        ? ` chưa đáng ${formatMoney(v.wage)} (lỗ ${formatMoney(-v.marginNet)}/ngày)`
                        : ` nên sa thải — kho chỉ còn ${drinkUnits} ly`}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
                Giá trị biên = doanh thu người này mang thêm so với ít hơn 1 người, trừ lương. Kho cạn đồ uống thì người cuối không bán thêm được.
              </div>
            </Callout>
          )}
          <p style={{ fontSize: 12, opacity: 0.7, margin: '8px 0 0' }}>🧃 Nguyên liệu lấy thẳng từ kho: kho hết nước là quán bán không được.</p>
        </>
      )}
      {quan.open && <QuanMenuSection />}
      <TiemXoiSection />
      <Footer onClose={closePanel} />
    </div>
  );
}
