import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { missingForContract, reservedMissing, commitBonusValue, contractStreakProgress, CONTRACT_STREAK_BONUS, type SupplyContract } from '../../data/contracts';
import type { ContractState } from '../../core/gameTypes';
import { styles } from './shared';
import { t } from '../../core/i18n';

/** GĐ935: tách khỏi MorningPanel (nguyên văn thẻ "Hợp đồng tới kỳ giao"). */
export function DueContractsCard({ dueContracts, day, storage }: {
  dueContracts: { cs: ContractState; def: SupplyContract | undefined }[]; day: number; storage: Record<string, number>;
}) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>{t('trip.hop_dong_toi_ky_giao')}</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        {dueContracts.map(({ cs, def }) => def && (
          // GĐ2352 — flexWrap: dòng chuỗi kỳ phía dưới mang `width: '100%'`; trong flex nowrap nó
          // đòi nguyên bề rộng container → ép cột chữ trái co về min-content, mỗi từ rơi một dòng
          // (QA người chơi: thẻ "Hợp đồng tới kỳ giao" vỡ chữ). Cho phép xuống dòng là xong.
          <div key={cs.defId} style={{ ...styles.card, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 240, fontSize: 13 }}>
              <b>{def.title}</b>
              {cs.dueDay === day
                ? <span style={{ color: '#f1c40f', fontWeight: 600 }}>{' '}{t('trip.han_hom_nay')}</span>
                : cs.dueDay < day
                  ? <span style={{ color: '#e74c3c', fontWeight: 600 }}>{' '}{t('trip.qua_han_han_ngay')}{' '}{cs.dueDay})</span>
                  : <span>{' '}{t('trip.han_ngay_mai')}{cs.dueDay})</span>}
              {cs.committed ? (() => {
                const lm = reservedMissing(def, cs.locked);
                return lm.length
                  ? <span style={{ color: '#ff7675' }}>{' '}{t('trip.cam_ket_ngan_thieu')}{' '}{lm.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                  : <span style={{ color: '#2ecc71', marginLeft: 6 }}>{t('trip.da_cam_ket_hang_tru_rieng')}</span>;
              })() : (() => {
                const missing = missingForContract(def, storage);
                return missing.length
                  ? <span style={{ color: '#ff7675' }}>{' '}{t('trip.thieu')}{' '}{missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                  : <span style={{ color: '#f1c40f' }}>{' '}{t('trip.kho_du_nen_cam_ket_de')}{' '}{formatMoney(commitBonusValue(def))}{' '}{t('trip.tin_cay')}</span>;
              })()}
            </span>
            <button style={styles.btn} onClick={() => openPanel({ type: 'contracts' })}>Xem</button>
          {(() => {
            const p = contractStreakProgress(cs, day);
            const riskColor = p.risk === 'overdue' ? '#e74c3c' : '#f1c40f';
            return (
              <div style={{ fontSize: 12, marginTop: 4, width: '100%' }}>
                {p.streak > 0 && (
                  <span style={{ color: '#3498db' }}>{t('trip.chuoi')}{' '}{p.streak}{' '}{t('trip.con_3')}{' '}{p.toMilestone}{' '}{t('trip.ky_nua_toi_moc')}{Math.round(CONTRACT_STREAK_BONUS * 100)}% </span>
                )}
                {p.risk === 'overdue' && p.streak > 0 && (
                  <span style={{ color: riskColor, fontWeight: 600 }}>{t('trip.giao_se_dut_chuoi')}{' '}{p.streak}{' '}{t('trip.ky_ve_0')}</span>
                )}
                {p.risk === 'overdue' && p.streak === 0 && (
                  <span style={{ color: riskColor, fontWeight: 600 }}>{t('trip.da_qua_han_giao_se_tinh')}</span>
                )}
                {p.risk === 'due_soon' && p.streak > 0 && (
                  <span style={{ color: riskColor }}>{t('trip.con_4')}{' '}{p.daysLeft}{' '}{t('trip.ngay_nua_giao_dung_hen_de')}{' '}{p.streak}</span>
                )}
              </div>
            );
          })()}
        </div>
        ))}
      </div>
    </>
  );
}
