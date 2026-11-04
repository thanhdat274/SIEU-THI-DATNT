import { formatMoney } from '../../data/products';
import type { staffShiftSummary } from '../../data/staffValue';
import type { StaffIdleRow } from '../../data/staffIdle';
import type { branchShiftSummary } from '../../data/branchStaffValue';
import { BRANCH_SHIFTS } from '../../data/branches';

/** GĐ141: dòng giá trị hôm nay của một nhân viên so với lương — thuần đọc, ẩn khi chưa có dữ liệu/ca đêm. */
export const VERDICT_META: Record<string, { color: string; label: string }> = {
  ok: { color: '#2ecc71', label: 'đáng lương' },
  warn: { color: '#f1c40f', label: 'vừa đủ' },
  low: { color: '#e74c3c', label: 'đang lỗ' },
  nodata: { color: '', label: '' },
};
export function StaffValueLine({ sv }: { sv?: import('../../data/staffValue').StaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title="Ước tính: doanh thu các giờ ca mình trực chia cho số người cùng ca, so với lương ngày (thuần đọc sổ giờ)" >
      💸 Hôm nay ~{formatMoney(sv.value)} · lương {formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ144: dòng giá trị ĐÊM QUA của một nhân viên CA ĐÊM tiệm chính so với lương thực trả (×1.5; good_boss −10%) — thuần đọc sổ giờ ≥22, ẩn khi chưa mở/bán đêm. */
export function NightStaffLine({ sv }: { sv?: import('../../data/nightStaffValue').NightStaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title="Ước tính: doanh thu các giờ đêm (≥22h) chia cho số người cùng ca đêm, so với lương thực trả ×1,5 (thuần đọc sổ giờ)">
      🌙 Đêm qua ~{formatMoney(sv.value)} · lương {formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
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
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title="Giá trị người giao hôm nay = doanh thu đơn điện thoại (stats.phone) + phí Grab tiết kiệm nhờ tự chở đơn app (stats.onlineOwnGrabSaved), chia đều số người giao, so với lương ngày (thuần đọc)">
      📞 Điện thoại {formatMoney(ph)}{saved ? ` · 🛵 tiết kiệm phí Grab ${formatMoney(saved)}` : ''} → ~{formatMoney(sv.value)} · lương {formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ246: dòng % rảnh hôm nay của một nhân viên (dữ liệu transient agent đếm) — ẩn khi chưa vào ca hôm nay.
 *  Màu theo bậc: xanh dương = bận liền tay (cân nhắc thêm người), vàng = vừa sức, cam = rảnh nhiều nên xử lý. */
export function StaffIdleLine({ row }: { row?: StaffIdleRow }) {
  if (!row) return null;
  const color = row.verdict === 'idle_heavy' ? '#e67e22' : row.verdict === 'balanced' ? '#f1c40f' : '#3498db';
  const label = row.verdict === 'idle_heavy' ? 'rảnh nhiều — dư người vai này?' : row.verdict === 'busy' ? 'bận liền tay — cân nhắc thêm người' : 'vừa sức';
  return (
    <div style={{ fontSize: 12, marginTop: 2, color }} title="Đo từ agent trong ca hôm nay: 'rảnh' là đứng không chờ việc; trực quầy/canh bếp có mẻ tính là đang làm. Thu ngân/bảo vệ/chăm khách là vai hiện diện (%rảnh ~0) và phụ trại không đo.">
      🧍 Sáng đến giờ: rảnh ~{row.idlePct}% ca · làm {row.workMin}m · nghỉ {row.idleMin}m — {label}
    </div>
  );
}

/** GĐ141: thanh tóm tắt từng ca ngày (sáng/chiều/cả ngày): doanh thu ca · lương · net — để người chơi thấy ca nào đang nguồn lợi. */
export const SHIFT_LABEL: Record<string, string> = { morning: 'Ca sáng', afternoon: 'Ca chiều', full: 'Cả ngày' };
export function ShiftValueStrip({ sum, hasData }: { sum: ReturnType<typeof staffShiftSummary>; hasData: boolean }) {
  const rows = (['morning', 'afternoon', 'full'] as const).filter((k) => sum[k].count > 0);
  if (!rows.length || !hasData) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 8 }}>
      {rows.map((k) => {
        const r = sum[k];
        const net = r.net;
        const color = net > 0 ? '#2ecc71' : net < 0 ? '#e74c3c' : '#f1c40f';
        return (
          <div key={k} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
            <div style={{ opacity: 0.75 }}>{SHIFT_LABEL[k]} · {r.count} người · doanh thu {formatMoney(r.revenue)}</div>
            <div style={{ color }}><b>lời/lỗ {net >= 0 ? '+' : ''}{formatMoney(net)}</b> vs lương {formatMoney(r.wages)}</div>
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
        <div style={{ opacity: 0.75 }}>🌙 Ca đêm · doanh thu {formatMoney(p.revenue)}</div>
        <div style={{ color }}><b>lời/lỗ {p.net >= 0 ? '+' : ''}{formatMoney(p.net)}</b> vs lương {formatMoney(p.wages)} (×1,5)</div>
      </div>
    </div>
  );
}

/** GĐ142: dòng giá trị hôm nay của một nhân viên CHI NHÁNH so với lương — thuần đọc branch.hourly, ẩn khi chưa có dữ liệu. */
export function BranchValueLine({ sv }: { sv?: import('../../data/branchStaffValue').BranchStaffValue }) {
  if (!sv || sv.verdict === 'nodata') return null;
  const m = VERDICT_META[sv.verdict];
  return (
    <div style={{ fontSize: 12, marginTop: 2, color: m.color }} title="Ước tính: doanh thu các giờ ca mình trực ở chi nhánh chia cho số người cùng ca, so với lương ngày (thuần đọc sổ giờ tiện lợi)">
      💸 Chi nhánh hôm nay ~{formatMoney(sv.value)} · lương {formatMoney(sv.wage)} → <b>{sv.net >= 0 ? '+' : ''}{formatMoney(sv.net)}</b> · {m.label}
    </div>
  );
}

/** GĐ142: thanh tóm tắt từng ca chi nhánh (sáng/chiều/đêm · đêm ×1.5 lương): doanh thu ca · lương · net — để người chơi thấy ca nào đang nguồn lợi ở tiện lợi. */
export const BRANCH_SHIFT_LABEL: Record<string, string> = { morning: 'Ca sáng', afternoon: 'Ca chiều', night: 'Ca đêm' };
export function BranchShiftStrip({ sum, hasData, hasStaff }: { sum: ReturnType<typeof branchShiftSummary>; hasData: boolean; hasStaff: boolean }) {
  const rows = BRANCH_SHIFTS.filter((k) => sum[k].count > 0);
  if (!rows.length || !hasData || !hasStaff) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${rows.length}, 1fr)`, gap: 8 }}>
      {rows.map((k) => {
        const r = sum[k];
        const net = r.net;
        const color = net > 0 ? '#2ecc71' : net < 0 ? '#e74c3c' : '#f1c40f';
        return (
          <div key={k} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
            <div style={{ opacity: 0.75 }}>{BRANCH_SHIFT_LABEL[k]} · {r.count} người · doanh thu {formatMoney(r.revenue)}</div>
            <div style={{ color }}><b>lời/lỗ {net >= 0 ? '+' : ''}{formatMoney(net)}</b> vs lương {formatMoney(r.wages)}</div>
          </div>
        );
      })}
    </div>
  );
}
