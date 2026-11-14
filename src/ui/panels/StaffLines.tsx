import { formatMoney } from '../../data/products';
import { STAFF_POACH_STRENGTH } from '../../data/rivals';
import type { staffShiftSummary } from '../../data/staffValue';
import type { StaffIdleRow } from '../../data/staffIdle';
import type { branchShiftSummary } from '../../data/branchStaffValue';
import { BRANCH_SHIFTS } from '../../data/branches';
import { t } from '../../core/i18n';

/** GĐ141: dòng giá trị hôm nay của một nhân viên so với lương — thuần đọc, ẩn khi chưa có dữ liệu/ca đêm. */
export const VERDICT_META: Record<string, { color: string; label: string }> = {
  ok: { color: '#2ecc71', label: t('panels_staff.dang_luong') },
  warn: { color: '#f1c40f', label: t('panels_staff.vua_du') },
  low: { color: '#e74c3c', label: t('panels_staff.dang_lo') },
  nodata: { color: '', label: '' },
};
export function StaffValueLine({ sv }: { sv?: import('../../data/staffValue').StaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title={t('panels_staff.uoc_tinh_doanh_thu_cac_gio')} >
      {t('panels_staff.hom_nay_2')}{formatMoney(sv.value)}{' '}{t('panels_staff.luong')}{' '}{formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ144: dòng giá trị ĐÊM QUA của một nhân viên CA ĐÊM tiệm chính so với lương thực trả (×1.5; good_boss −10%) — thuần đọc sổ giờ ≥22, ẩn khi chưa mở/bán đêm. */
export function NightStaffLine({ sv }: { sv?: import('../../data/nightStaffValue').NightStaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title={t('panels_staff.uoc_tinh_doanh_thu_cac_gio_2')}>
      {t('panels_staff.dem_qua')}{formatMoney(sv.value)}{' '}{t('panels_staff.luong')}{' '}{formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ1181 + GĐ1183: dòng giá trị người giao (🛵) — doanh thu ĐIỆN THOẠI họ mở + chở + phí GRAB tiết kiệm
 *  nhờ họ chở đơn app, so lương ngày. Người giao không ghi doanh thu quầy (byHour chia đều sẽ ra âm lệch),
 *  nên thay StaffValueLine bằng dòng này: thu nhập thật của họ = stats.phone (đơn điện thoại) +
 *  stats.onlineOwnGrabSaved (phí Grab không phải trả vì họ tự chở app). THUẦN đọc. */
export function CourierValueLine({ sv }: { sv?: import('../../data/staffValue').StaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  const ph = sv.phoneValue ?? 0;
  const saved = sv.onlineSaved ?? 0;
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title={t('panels_staff.gia_tri_nguoi_giao_hom_nay')}>
      {t('panels_staff.dien_thoai')}{' '}{formatMoney(ph)}{saved ? t('panels_staff.tiet_kiem_phi_grab', { v0: formatMoney(saved) }) : ''} → ~{formatMoney(sv.value)}{' '}{t('panels_staff.luong')}{' '}{formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ1185: cảnh báo nhân viên giỏi nhất đang bị rival máu liều "để mắt" (sẽ bị móc sang). Thuần đọc,
 *  first-class view — hiện khi helper staffAtRiskOfPoach trả về đúng id này. */
export function StaffPoachWarn({ rival, poachRiskId }: { rival?: { name?: string; personality?: string } | null; poachRiskId?: number | undefined }) {
  if (!rival || poachRiskId === undefined) return null;
  const isAggressive = rival.personality === 'aggressive';
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: '#e74c3c' }} title={`${rival.name ?? ''} ${isAggressive ? 'máu liều' : 'đối thủ'} mạnh — móc người giỏi nhất về đêm. Hạ sức mạnh rival dưới ${STAFF_POACH_STRENGTH} để giữ.`}>
      ⚠️ {rival.name ?? t('panels_staff.doi_thu')}{isAggressive ? t('panels_staff.mau_lieu') : ''}{' '}{t('panels_staff.dang_de_mat_co_the_moc')}{' '}{STAFF_POACH_STRENGTH}{' '}{t('panels_staff.de_giu')}
    </div>
  );
}

/** GĐ246: dòng % rảnh hôm nay của một nhân viên (dữ liệu transient agent đếm) — ẩn khi chưa vào ca hôm nay.
 *  Màu theo bậc: xanh dương = bận liền tay (cân nhắc thêm người), vàng = vừa sức, cam = rảnh nhiều nên xử lý. */
export function StaffIdleLine({ row }: { row?: StaffIdleRow }) {
  if (!row) return null;
  const color = row.verdict === 'idle_heavy' ? '#e67e22' : row.verdict === 'balanced' ? '#f1c40f' : '#3498db';
  const label = row.verdict === 'idle_heavy' ? t('panels_staff.ranh_nhieu_du_nguoi_vai_nay') : row.verdict === 'busy' ? t('panels_staff.ban_lien_tay_can_nhac_them') : t('panels_staff.vua_suc');
  return (
    <div style={{ fontSize: 12, marginTop: 2, color }} title={t('panels_staff.do_tu_agent_trong_ca_hom')}>
      {t('panels_staff.sang_den_gio_ranh')}{row.idlePct}{t('panels_staff.ca_lam_2')}{' '}{row.workMin}{t('panels_staff.m_nghi')}{' '}{row.idleMin}m — {label}
    </div>
  );
}

/** GĐ141: thanh tóm tắt từng ca ngày (sáng/chiều/cả ngày): doanh thu ca · lương · net — để người chơi thấy ca nào đang nguồn lợi. */
export const SHIFT_LABEL: Record<string, string> = { morning: t('panels_staff.ca_sang'), afternoon: t('panels_staff.ca_chieu'), full: t('panels_staff.ca_ngay') };
export function ShiftValueStrip({ sum, hasData }: { sum: ReturnType<typeof staffShiftSummary>; hasData: boolean }) {
  const rows = (['morning', 'afternoon', 'full'] as const).filter((k) => sum[k].count > 0);
  if (!rows.length || !hasData) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 8 }}>
      {rows.map((k) => {
        const r = sum[k];
        const net = r.net;
        const color = net > 0 ? '#2ecc71' : net < 0 ? '#e74c3c' : '#f1c40f';
        return (
          <div key={k} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
            <div style={{ opacity: 0.75 }}>{SHIFT_LABEL[k]} · {r.count}{' '}{t('panels_staff.nguoi_doanh_thu')}{' '}{formatMoney(r.revenue)}</div>
            <div style={{ color }}><b>{t('panels_staff.loi_lo')}{' '}{net >= 0 ? '+' : ''}{formatMoney(net)}</b>{' '}{t('panels_staff.vs_luong')}{' '}{formatMoney(r.wages)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** GĐ144: thanh tóm tắt CA ĐÊM tiệm chính — doanh thu đêm · lương đêm (×1.5) · lời/lỗ — để người chơi thấy ca đêm đang nguồn lợi hay rò tiền. Ẩn khi chưa mở/bán đêm. */
export function NightStrip({ p }: { p: import('../../data/nightReport').NightPnl }) {
  if (p.verdict === 'idle') return null;
  const color = p.net > 0 ? '#2ecc71' : p.net < 0 ? '#e74c3c' : '#f1c40f';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
      <div style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
        <div style={{ opacity: 0.75 }}>{t('panels_staff.ca_dem_doanh_thu')}{' '}{formatMoney(p.revenue)}</div>
        <div style={{ color }}><b>{t('panels_staff.loi_lo')}{' '}{p.net >= 0 ? '+' : ''}{formatMoney(p.net)}</b>{' '}{t('panels_staff.vs_luong')}{' '}{formatMoney(p.wages)} (×1,5)</div>
      </div>
    </div>
  );
}

/** GĐ142: dòng giá trị hôm nay của một nhân viên CHI NHÁNH so với lương — thuần đọc branch.hourly, ẩn khi chưa có dữ liệu. */
export function BranchValueLine({ sv }: { sv?: import('../../data/branchStaffValue').BranchStaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title={t('panels_staff.uoc_tinh_doanh_thu_cac_gio_3')}>
      {t('panels_staff.chi_nhanh_hom_nay')}{formatMoney(sv.value)}{' '}{t('panels_staff.luong')}{' '}{formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ142: thanh tóm tắt từng ca chi nhánh (sáng/chiều/đêm · đêm ×1.5 lương): doanh thu ca · lương · net — để người chơi thấy ca nào đang nguồn lợi ở tiện lợi. */
export const BRANCH_SHIFT_LABEL: Record<string, string> = { morning: t('panels_staff.ca_sang'), afternoon: t('panels_staff.ca_chieu'), night: t('panels_staff.ca_dem') };
export function BranchShiftStrip({ sum, hasData, hasStaff }: { sum: ReturnType<typeof branchShiftSummary>; hasData: boolean; hasStaff: boolean }) {
  const rows = BRANCH_SHIFTS.filter((k) => sum[k].count > 0);
  if (!rows.length || !hasData || !hasStaff) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 8 }}>
      {rows.map((k) => {
        const r = sum[k];
        const net = r.net;
        const color = net > 0 ? '#2ecc71' : net < 0 ? '#e74c3c' : '#f1c40f';
        return (
          <div key={k} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
            <div style={{ opacity: 0.75 }}>{BRANCH_SHIFT_LABEL[k]} · {r.count}{' '}{t('panels_staff.nguoi_doanh_thu')}{' '}{formatMoney(r.revenue)}</div>
            <div style={{ color }}><b>{t('panels_staff.loi_lo')}{' '}{net >= 0 ? '+' : ''}{formatMoney(net)}</b>{' '}{t('panels_staff.vs_luong')}{' '}{formatMoney(r.wages)}</div>
          </div>
        );
      })}
    </div>
  );
}
