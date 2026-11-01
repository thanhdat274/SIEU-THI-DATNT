import { useGame } from '../../core/store';
import { relTier } from '../../data/supplierRel';
import { lifetimeRegularVisits, vipTierOf, EMOTIONAL_FRIENDSHIP } from '../../data/regularTrust';
import { serviceById } from '../../data/services';
import { MASTER_BADGES, badgeEarned, type DossierInput } from '../../data/dossier';
import { styles } from './shared';

/** Hồ sơ tiệm + Huy hiệu thâm niên (GĐ71): chân dung dài hạn gộp mọi bể tiệm. Thuần đọc, không sửa state. */
export function DossierPanel({ closePanel }: { closePanel: () => void }) {
  const { level, biz, regulars } = useGame.getState();
  const d: DossierInput = {
    supplierTier: Math.max(0, ...Object.values(biz.supplierRel ?? {}).map((r) => relTier(r.spent).level)),
    regularTier: vipTierOf(lifetimeRegularVisits(regulars ?? {})).level,
    closeRegulars: Object.values(regulars ?? {}).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length,
    fairTaken: biz.fairTaken !== undefined,
    prepClaimed: biz.prepClaimed !== undefined,
    servicesOwned: (biz.services ?? []).length,
    servicesPaidBack: Object.entries(biz.serviceLife ?? {}).filter(([sid, life]) => (serviceById(sid)?.price ?? Infinity) <= life).length,
    demographicsCount: Object.keys(biz.demographics ?? {}).length,
    landmarkContrib: biz.landmark?.contributions ?? 0,
    prestigeLevel: biz.prestige?.level ?? 0,
    rivalArcs: (biz.rivalTrend ?? []).length,
    perfectDays: biz.perfectDays ?? 0,
  };
  const earned = MASTER_BADGES.filter((b) => badgeEarned(d, b));

  const facts: [string, string][] = [
    ['🔝 Cấp tiệm', `Cấp ${level}`],
    ['🤝 Mối quen cao nhất', `Bậc ${d.supplierTier}`],
    ['💛 Bậc Tiệm (khách quen)', `Bậc ${d.regularTier} · ${lifetimeRegularVisits(regulars ?? {})} lượt`],
    ['🛒 Lô chợ phiên', d.fairTaken ? 'Đã lấy' : 'Chưa'],
    ['🎊 Đón lễ (thưởng mùa)', d.prepClaimed ? 'Đã nhận' : 'Chưa'],
    ['🧾 Dịch vụ quầy', `${d.servicesOwned} mở · ${d.servicesPaidBack} thu hồi vốn`],
    ['👥 Phân khúc khách', `${d.demographicsCount} nhóm`],
    ['🏗️ Công trình hẻm', `${d.landmarkContrib} góp`],
    ['♻️ Tái sinh NG+', d.prestigeLevel ? `Bậc ${d.prestigeLevel}` : 'Chưa'],
    ['⚔️ Arc rival', `${d.rivalArcs} đã qua`],
    ['🌟 Ngày hoàn hảo', `${d.perfectDays} ngày`],
  ];

  return (
    <div style={{ width: '100%', maxWidth: 620 }}>
      <h2 style={styles.title}>📖 Hồ sơ tiệm</h2>
      <p style={styles.sub}>
        Cả một đời của cửa tiệm gom về một trang. Những dấu ấn dài hạn bạn đã gây được — và 4 huy hiệu thâm niên,
        mỗi cái chỉ đạt khi giữ nhiều hệ cùng sống. Huy hiệu là danh dự, không đổi tiền — đích để nâng cấp xuyên cả ván.
      </p>

      <div style={styles.card}>
        <b>🖼️ Chân dung dài hạn</b>
        <div style={{ display: 'grid', gap: 3, marginTop: 6 }}>
          {facts.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.92 }}>
              <span>{k}</span><b>{v}</b>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
        {MASTER_BADGES.map((b) => {
          const on = badgeEarned(d, b);
          return (
            <div key={b.id} style={{ ...styles.card, display: 'block', border: `1px solid ${on ? 'rgba(46,204,113,0.5)' : 'rgba(255,255,255,0.07)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b>{b.icon} {b.name} {on && '✅'}</b>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{b.criteria.filter((c) => c.ok(d)).length}/{b.criteria.length}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{b.desc}</div>
              <div style={{ fontSize: 11, marginTop: 4, display: 'grid', gap: 1 }}>
                {b.criteria.map((c, i) => (
                  <span key={i} style={{ color: c.ok(d) ? '#2ecc71' : '#f1c40f' }}>
                    {c.ok(d) ? '✓' : '○'} {c.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <p style={styles.sub}>Đã đạt {earned.length}/4 huy hiệu thâm niên — danh hiệu {earned.length === 4 ? 'Huyền Thoại Hẻm 🏆' : 'còn chờ bạn vun đắp nhiều hệ hơn'}.</p>
      </div>

      <button style={styles.btn} onClick={closePanel}>Đóng</button>
    </div>
  );
}
