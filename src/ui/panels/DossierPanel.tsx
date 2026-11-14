import { useGame } from '../../core/store';
import { useState } from 'react';
import { relTier } from '../../data/supplierRel';
import { lifetimeRegularVisits, vipTierOf, EMOTIONAL_FRIENDSHIP } from '../../data/regularTrust';
import { serviceById } from '../../data/services';
import { MASTER_BADGES, badgeEarned, type DossierInput } from '../../data/dossier';
import { CRISIS_DEFS } from '../../data/crisis';
import { Footer, styles } from './shared';
import { t } from '../../core/i18n';

/** Hồ sơ tiệm + Huy hiệu thâm niên (GĐ71): chân dung dài hạn gộp mọi bể tiệm. Thuần đọc, không sửa state. */
export function DossierPanel({ closePanel }: { closePanel: () => void }) {
  const { level, biz, regulars } = useGame.getState();
  const [calmLocal, setCalmLocal] = useState<boolean | undefined>(undefined);
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
    [t('branch.cap_tiem'), t('branch.cap', { level })],
    [t('branch.moi_quen_cao_nhat'), t('branch.bac', { supplierTier: d.supplierTier })],
    [t('branch.bac_tiem_khach_quen'), t('branch.bac_luot', { regularTier: d.regularTier, v1: lifetimeRegularVisits(regulars ?? {}) })],
    [t('branch.lo_cho_phien'), d.fairTaken ? t('branch.da_lay') : t('branch.chua')],
    [t('branch.don_le_thuong_mua'), d.prepClaimed ? t('branch.da_nhan') : t('branch.chua')],
    [t('branch.dich_vu_quay'), t('branch.mo_thu_hoi_von', { servicesOwned: d.servicesOwned, servicesPaidBack: d.servicesPaidBack })],
    [t('branch.phan_khuc_khach'), t('branch.nhom', { demographicsCount: d.demographicsCount })],
    [t('branch.cong_trinh_hem'), t('branch.gop', { landmarkContrib: d.landmarkContrib })],
    [t('branch.tai_sinh_ng'), d.prestigeLevel ? t('branch.bac_2', { prestigeLevel: d.prestigeLevel }) : t('branch.chua')],
    ['⚔️ Arc rival', t('branch.da_qua', { rivalArcs: d.rivalArcs })],
    [t('branch.ngay_hoan_hao'), t('branch.ngay_5', { perfectDays: d.perfectDays })],
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <h2 style={styles.title}>{t('branch.ho_so_tiem')}</h2>
      <p style={styles.sub}>
        {t('branch.ca_mot_doi_cua_cua_tiem')}
      </p>

      <div style={{ ...styles.card, display: 'block' }}>
        <b>{t('branch.chan_dung_dai_han')}</b>
        <div style={{ display: 'grid', gap: 3, marginTop: 6 }}>
          {facts.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.92 }}>
              <span>{k}</span><b>{v}</b>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
        {/* Hệ8-L4 — huy hiệu "vượt khó": từng đợt biến cố dài đã vượt qua. Không cho Năm yên ả (đã tắt). */}
        <div style={{ ...styles.card, display: 'block' }}>
          <b>{t('branch.huy_hieu_vuot_kho_bien_co')}</b>
          {CRISIS_DEFS.length === 0 ? null : (
            <div style={{ display: 'grid', gap: 3, marginTop: 6 }}>
              {CRISIS_DEFS.map((d) => {
                const on = (biz.crisisBadges ?? []).includes(d.id);
                return (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: on ? 1 : 0.55 }}>
                    <span>{on ? `${d.icon} ${d.name}` : `○ ${d.name}`}</span>
                    <b>{on ? t('branch.vuot_qua') : t('branch.chua_trai_qua')}</b>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>
            {t('branch.moi_dot_bien_co_dai_binh')}
          </p>
          {/* Hệ8-L8 (SPEC-CHIEU-RONG §8.3) — tuỳ chọn "Năm yên ả": tắt hẳn biến cố dài, đổi lại không huy hiệu. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.12)' }}>
            <span style={{ fontSize: 12 }}>
              🌿 <b>{t('branch.nam_yen_a')}</b>{' '}{t('branch.tam_ngung_bien_co_dai_cho')}
            </span>
            <button
              style={styles.btn}
              onClick={() => {
                const next = !(biz.calmYears ?? false);
                useGame.getState().setCalmYears(next);
                setCalmLocal(next);
              }}
            >
              {(calmLocal ?? biz.calmYears ?? false) ? t('branch.dang_bat') : t('branch.dang_tat')}
            </button>
          </div>
        </div>

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
        <p style={styles.sub}>{t('branch.da_dat')}{' '}{earned.length}{t('branch.4_huy_hieu_tham_nien_danh')}{' '}{earned.length === 4 ? t('branch.huyen_thoai_hem') : t('branch.con_cho_ban_vun_dap_nhieu')}.</p>
      </div>

      <Footer onClose={closePanel} />
    </div>
  );
}
