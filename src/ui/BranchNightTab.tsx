import { useGame } from '../core/store';
import { ALCOHOL_BRAWL_CHANCE, NIGHT_DELIVERY_SURCHARGE, NIGHT_GROUPS, POWER_UPGRADES, branchPowerBill, hasAlcohol, hasPower } from '../data/branches';
import { licenseById, licenseStatus } from '../data/licenses';
import { formatMoney } from '../data/products';
import { st } from './branchStyles';

/** Tab "🌙 Ban đêm" của cửa hàng tiện lợi: nhóm khách đêm, rượu bia, giao đêm, điện lạnh. */
export function BranchNightTab() {
  const { branch, level, money, day, online, licenses, toggleNightDelivery, buyBranchPower } = useGame();
  if (!branch) return null;
  const alcLic = licenseStatus(licenses, 'alcohol', day);
  const licOk = alcLic === 'valid' || alcLic === 'expiring';
  const guardNight = branch.staff.some((s) => s.role === 'guard' && s.shift === 'night');
  const groups = branch.groupToday ?? {};
  const bill = branchPowerBill(branch);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ ...st.event, display: 'block', background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.45)' }}>
        <b>👥 Khách đêm theo nhóm</b>
        <div style={st.sub}>Từ 21h khách chia thành các nhóm có giờ cao điểm và món ưa thích riêng — kệ có đúng món thì họ mua nhiều hơn.</div>
        {NIGHT_GROUPS.map((g) => (
          <div key={g.id} style={{ ...st.row, marginBottom: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span>{g.icon} <b>{g.name}</b> · {groups[g.id] ?? 0} khách</span>
            <span style={{ ...st.sub, minWidth: 140 }}>{g.desc}</span>
          </div>
        ))}
      </div>

      <div style={{ ...st.event, display: 'block' }}>
        <b>🍺 Rượu bia ban đêm</b>
        <div style={st.sub}>
          Bán rượu bia giờ đêm lời hơn (×1.15). Cần <b>{licenseById('alcohol').name}</b> (cấp {licenseById('alcohol').unlock}+): công an tuần tra đêm có thể phạt và tịch thu nếu thiếu phép.
          Không có bảo vệ ca đêm thì khách say dễ gây gổ ({Math.round(ALCOHOL_BRAWL_CHANCE * 100)}% mỗi lượt bán).
        </div>
        <div style={st.sub}>
          Giấy phép: <b style={{ color: licOk ? '#2ecc71' : '#e74c3c' }}>{licOk ? 'còn hạn' : alcLic === 'none' ? 'chưa có' : 'hết hạn'}</b>
          {' · '}hôm nay bán {branch.alcoholToday ?? 0} món rượu bia
        </div>
        {hasAlcohol(branch.shelf) && !licOk && level >= licenseById('alcohol').unlock && <p style={st.warn}>⚠️ Kệ đang có rượu bia mà chưa có giấy phép — xin ở bảng Giấy phép trước khi công an ghé.</p>}
        {hasAlcohol(branch.shelf) && !guardNight && <p style={st.warn}>⚠️ Ca đêm chưa có bảo vệ — bán rượu bia dễ xảy ra gây gổ.</p>}
      </div>

      <div style={{ ...st.event, display: 'block' }}>
        <div style={st.row}>
          <b>🛵 Giao hàng đêm qua app</b>
          <button style={st.primary} onClick={toggleNightDelivery}>{branch.nightDelivery ? 'Ngưng nhận đơn đêm' : 'Nhận đơn đêm'}</button>
        </div>
        <div style={st.sub}>
          Đơn app 22h–6h có phụ phí +{Math.round(NIGHT_DELIVERY_SURCHARGE * 100)}% (app giữ hoa hồng). Cần gian hàng app đã mở ({online.open ? 'đã mở' : 'chưa mở'}) và người giao hàng ca đêm không quá mệt; thiếu người giao thì đơn bị hủy, tụt điểm app. Shipper đêm đôi khi gặp sự cố mất đơn.
          {branch.nightDelivery && <> Đêm nay: <b>{branch.deliveryToday ?? 0}</b> đơn, thu <b>{formatMoney(branch.deliveryRevenueToday ?? 0)}</b>.</>}
        </div>
      </div>

      <div style={{ ...st.event, display: 'block' }}>
        <b>⚡ Điện lạnh</b>
        <div style={st.sub}>Tủ mát, tủ đông, bếp đồ nóng chạy suốt 24h: hóa đơn điện hôm nay <b>{formatMoney(bill)}</b> (trừ cuối ngày, nằm trong chi phí vận hành).</div>
        {POWER_UPGRADES.map((u) => (
          <div key={u.id} style={{ ...st.row, marginBottom: 2, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{u.icon} <b>{u.name}</b> <span style={st.sub}>— {u.desc}</span></span>
            {hasPower(branch, u.id)
              ? <span style={{ color: '#2ecc71' }}>✅ Đã lắp</span>
              : <button style={st.btn} disabled={money < u.price} onClick={() => buyBranchPower(u.id)}>Lắp · {formatMoney(u.price)}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
