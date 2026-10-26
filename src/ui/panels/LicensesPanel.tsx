import { useGame } from '../../core/store';
import { INSPECTION_EVERY, INSPECTION_UNLOCK } from '../../data/biz';
import { isCookStation } from '../../data/furniture';
import { LICENSE_FINE, LICENSE_GRACE, LICENSES, licenseStatus, requiredLicenses, SUSPEND_AFTER } from '../../data/licenses';
import { formatMoney } from '../../data/products';
import { Footer, styles } from './shared';

const STATUS = {
  none: { label: 'Chưa có', color: '#e74c3c' },
  valid: { label: 'Còn hạn', color: '#2ecc71' },
  expiring: { label: 'Sắp hết hạn', color: '#f1c40f' },
  expired: { label: 'Hết hạn', color: '#e74c3c' },
} as const;

export function LicensesPanel() {
  const { licenses, inspection, furniture, level, day, money, branch, buyLicense, closePanel } = useGame();
  const shelved = [...new Set([...furniture.flatMap((f) => f.tiers.filter((t) => t.productId && t.count > 0).map((t) => t.productId!)), ...Object.keys(branch?.shelf ?? {})])];
  const need = requiredLicenses({ level, hasCookStation: furniture.some((f) => isCookStation(f.type)), shelved });
  const nextPeriodic = Math.ceil(day / INSPECTION_EVERY) * INSPECTION_EVERY;
  return (
    <>
      <h2 style={styles.title}>📜 Giấy phép & thanh tra</h2>
      <p style={styles.sub}>
        Thanh tra định kỳ mỗi {INSPECTION_EVERY} ngày (từ cấp {INSPECTION_UNLOCK}), và ghé đột xuất khi khách phản ánh nhiều. Thiếu giấy phép bắt buộc
        quá {LICENSE_GRACE} ngày ân hạn thì phạt {formatMoney(LICENSE_FINE)} mỗi tờ. Trượt {SUSPEND_AFTER} lần liền là bị đình chỉ một ngày.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ ...styles.card, display: 'block' }}>
          <small style={{ opacity: 0.7 }}>📋 Đợt định kỳ tới</small>
          <div><b>{level >= INSPECTION_UNLOCK ? `ngày ${nextPeriodic}` : `từ cấp ${INSPECTION_UNLOCK}`}</b></div>
        </div>
        <div style={{ ...styles.card, display: 'block' }}>
          <small style={{ opacity: 0.7 }}>⚠️ Trượt liên tiếp</small>
          <div><b style={{ color: inspection.strikes ? '#e74c3c' : undefined }}>{inspection.strikes}/{SUSPEND_AFTER}</b>
            {inspection.lastDay !== undefined && <small> · lần gần nhất ngày {inspection.lastDay}: {inspection.lastPass ? 'đạt' : 'trượt'}</small>}</div>
        </div>
      </div>
      {inspection.suspendedDay === day && <div style={{ ...styles.card, background: '#5a2d2d', marginBottom: 10, fontSize: 13 }}>⛔ Hôm nay tiệm bị đình chỉ kinh doanh, mai mới mở cửa lại được.</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {LICENSES.map((l) => {
          const status = licenseStatus(licenses, l.id, day);
          const required = need.includes(l.id);
          const until = licenses[l.id];
          const deadline = inspection.noticed?.[l.id];
          return (
            <div key={l.id} style={{ ...styles.card, opacity: level < l.unlock ? 0.55 : 1 }}>
              <span style={{ fontSize: 22 }}>{l.icon}</span>
              <div style={{ flex: 1, fontSize: 13 }}>
                <b>{l.name}</b>{' '}
                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: STATUS[status].color, color: '#222' }}>{STATUS[status].label}</span>
                {required && <span style={{ fontSize: 11, marginLeft: 6, color: '#f1c40f' }}>bắt buộc</span>}
                <div style={{ opacity: 0.75 }}>
                  {l.desc} · {l.days} ngày/lần{level < l.unlock ? ` · bắt buộc từ cấp ${l.unlock}` : ''}
                  {until !== undefined && ` · hiệu lực tới ngày ${until}`}
                  {required && (status === 'none' || status === 'expired') && deadline !== undefined && ` · hạn chót ngày ${deadline + LICENSE_GRACE}`}
                </div>
              </div>
              <button style={{ ...styles.btn, background: '#f1c40f' }} disabled={money < l.cost} onClick={() => buyLicense(l.id)}>
                {status === 'none' ? 'Xin cấp' : 'Gia hạn'} {formatMoney(l.cost)}
              </button>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
