import { useGame } from '../../core/store';
import { formatMoney, productById } from '../../data/products';
import { missingForContract, reservedMissing, commitBonusValue, contractStreakProgress, CONTRACT_STREAK_BONUS, type SupplyContract } from '../../data/contracts';
import type { ContractState } from '../../core/gameTypes';
import { styles } from './shared';

/** GĐ935: tách khỏi MorningPanel (nguyên văn thẻ "Hợp đồng tới kỳ giao"). */
export function DueContractsCard({ dueContracts, day, storage }: {
  dueContracts: { cs: ContractState; def: SupplyContract | undefined }[]; day: number; storage: Record<string, number>;
}) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <>
      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🚚 Hợp đồng tới kỳ giao</h3>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {dueContracts.map(({ cs, def }) => def && (
          <div key={cs.defId} style={{ ...styles.card }}>
            <span style={{ flex: 1, fontSize: 13 }}>
              <b>{def.title}</b>
              {cs.dueDay === day
                ? <span style={{ color: '#f1c40f', fontWeight: 600 }}> · HẠN HÔM NAY</span>
                : cs.dueDay < day
                  ? <span style={{ color: '#e74c3c', fontWeight: 600 }}> · QUÁ HẠN (hạn ngày {cs.dueDay})</span>
                  : <span> · hạn ngày mai ({cs.dueDay})</span>}
              {cs.committed ? (() => {
                const lm = reservedMissing(def, cs.locked);
                return lm.length
                  ? <span style={{ color: '#ff7675' }}> 🤝 cam kết — ⚠️ ngăn thiếu {lm.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                  : <span style={{ color: '#2ecc71', marginLeft: 6 }}>🤝 đã cam kết — hàng trữ riêng sẵn sàng ✓</span>;
              })() : (() => {
                const missing = missingForContract(def, storage);
                return missing.length
                  ? <span style={{ color: '#ff7675' }}> · thiếu: {missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                  : <span style={{ color: '#f1c40f' }}> · kho đủ · nên 🤝 Cam kết để giao được thêm {formatMoney(commitBonusValue(def))} tin cậy</span>;
              })()}
            </span>
            <button style={styles.btn} onClick={() => openPanel({ type: 'contracts' })}>Xem</button>
          {(() => {
            const p = contractStreakProgress(cs, day);
            const riskColor = p.risk === 'overdue' ? '#e74c3c' : '#f1c40f';
            return (
              <div style={{ fontSize: 12, marginTop: 4, width: '100%' }}>
                {p.streak > 0 && (
                  <span style={{ color: '#3498db' }}>🎯 Chuỗi {p.streak} · còn {p.toMilestone} kỳ nữa tới mốc +{Math.round(CONTRACT_STREAK_BONUS * 100)}% </span>
                )}
                {p.risk === 'overdue' && p.streak > 0 && (
                  <span style={{ color: riskColor, fontWeight: 600 }}>⚠️ Giao sẽ đứt chuỗi {p.streak} kỳ về 0</span>
                )}
                {p.risk === 'overdue' && p.streak === 0 && (
                  <span style={{ color: riskColor, fontWeight: 600 }}>⚠️ Đã quá hạn — giao sẽ tính muộn</span>
                )}
                {p.risk === 'due_soon' && p.streak > 0 && (
                  <span style={{ color: riskColor }}>⏳ Còn {p.daysLeft} ngày nữa — giao đúng hẹn để giữ chuỗi {p.streak}</span>
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
