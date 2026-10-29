import { useGame } from '../core/store';
import { describeRep, meetsRep, repScore, reputationOf } from '../data/reputation';
import { CONTRACT_STREAK_BONUS, CONTRACT_STREAK_EVERY, CONTRACT_COMMIT_BONUS, SUPPLY_CONTRACTS, supplyContractById, missingForContract, contractValue, commitBonusValue, commitDeposit, contractStreakProgress, contractAcceptRoi, type SupplyContract } from '../data/contracts';
import { formatMoney, productById } from '../data/products';
import { Callout } from './panels/shared';
import { commitTry } from '../data/commitTry';
import { contractPortfolio } from '../data/contractPortfolio';

/** Panel Hợp đồng — xem, chấp nhận và giao hợp đồng cung cấp dài hạn. */
export function ContractsPanel() {
  const { level, money, contracts, storage, day, acceptContract, deliverContract } = useGame();
  const all = SUPPLY_CONTRACTS;
  const available = all.filter((c) => c.unlock <= level);
  const locked = all.filter((c) => c.unlock > level);
  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>📋 Hợp đồng</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 }}>
        Hợp đồng cung cấp dài hạn: giao hàng định kỳ, mỗi kỳ được trả theo giá đã thỏa thuận.
        Tiền về nhanh nhưng thấp hơn bán lẻ — bù lại số lượng lớn và đều đặn.
      </p>

      {Object.keys(contracts).length > 0 && <ActiveContracts />}

      <h3 style={head}>📦 Hợp đồng đang có</h3>
      {available.length === 0 ? (
        <p style={{ opacity: 0.75, fontSize: 13 }}>Chưa có hợp đồng nào khả dụng.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {available.map((c) => (
            <ContractRow key={c.id} contract={c} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <h3 style={head}>🔒 Hợp đồng khóa</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {locked.map((c) => (
              <LockedContract key={c.id} contract={c} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Các hợp đồng đang hoạt động: đã chấp nhận, chờ giao. */
function ActiveContracts() {
  const { contracts, deliverContract, commitContract, releaseContract, money, day } = useGame();
  const active = Object.entries(contracts).filter(([, cs]) => !cs.pending || cs.dueDay);
  if (!active.length) return null;
  return (
    <>
      <h3 style={head}>⚡ Đang hoạt động</h3>
      <div style={{ fontSize: 12, opacity: 0.75, margin: '0 0 6px' }}>
        🎯 Giao mỗi kỳ đúng hạn để giữ chuỗi; đủ {CONTRACT_STREAK_EVERY} kỳ liên tiếp được +{Math.round(CONTRACT_STREAK_BONUS * 100)}% thưởng mốc.
        · 🤝 <b>Cam kết kỳ</b>: trữ sẵn đúng hàng kỳ này để giao đúng hạn được thưởng tin cậy +{Math.round(CONTRACT_COMMIT_BONUS * 100)}%.
      </div>
      {(() => {
        const pf = contractPortfolio(active.map(([id]) => id));
        if (pf.count === 0) return null;
        return (
          <Callout tone={pf.verdict === 'ok' ? 'ok' : 'warn'} style={{ marginBottom: 8 }} title={`📋 ${pf.count} hợp đồng đang đóng góp ~${formatMoney(pf.netPerDayTotal)}/ngày`}>
            <div style={{ marginTop: 2, fontSize: 12 }}>
              Mỗi kỳ cần trữ ~{formatMoney(pf.capitalPerPeriod)} vốn hàng để giao đủ cả chùm
              {pf.anyLosing ? ' · ⚠️ có hợp đồng đang lỗ thật — cân nhắc thả.' : ' — đối chiếu với kho và dòng tiền.'}
            </div>
          </Callout>
        );
      })()}
      <div style={{ display: 'grid', gap: 8 }}>
        {active.map(([id, cs]) => {
          const def = supplyContractById(id);
          if (!def) return null;
          const left = cs.dueDay - useGame.getState().day;
          const committed = cs.committed === true;
          const deposit = commitDeposit(def);
          const bonus = commitBonusValue(def);
          return (
            <div key={id} style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                <div style={{ flex: 1 }}>
                  <b>{def.title}</b>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {cs.delivered} kỳ đã giao · mỗi {def.periodDays} ngày
                    {left > 0 && ` · còn ${left} ngày nữa`}
                    {(cs.streak ?? 0) > 0 && ` · chuỗi đúng hẹn ${cs.streak}`}
                    {cs.overdue && <span style={{ color: '#e74c3c' }}> · ⚠️ quá hạn — giao lần này sẽ mất chuỗi</span>}
                  </div>
                </div>
                <button
                  style={{ ...btn, background: left > 0 ? '#2ecc71' : '#e74c3c', color: '#fff' }}
                  onClick={() => deliverContract(id)}
                >
                  🚚 Giao
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8, fontSize: 12, background: committed ? 'rgba(241,196,15,0.10)' : 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px' }}>
                {committed ? (
                  <>
                    <span style={{ color: '#f1c40f' }}>🤝 Đã cam kết — trữ {Object.values(cs.locked ?? {}).reduce((n, q) => n + q, 0)} món riêng, cọc {formatMoney(deposit)} (hoàn khi giao).</span>
                    <button style={{ ...btn, background: 'transparent', border: '1px solid #e17055', color: '#e17055' }} onClick={() => releaseContract(id)}>↩️ Hủy cam kết</button>
                  </>
                ) : (
                  <>
                    <span style={{ opacity: 0.75 }}>🤝 Cam kết kỳ: cọc {formatMoney(deposit)} (hoàn), trữ hàng riêng → giao đúng hạn được <b style={{ color: '#f1c40f' }}>+{formatMoney(bonus)} tin cậy</b>.</span>
                    {(() => {
                      const ct = commitTry(def, money);
                      const line = ct.verdict === 'skip'
                        ? { c: '#e74c3c', t: `không đủ cọc (cần ${formatMoney(ct.deposit)})` }
                        : ct.verdict === 'tight'
                          ? { c: '#f1c40f', t: `cọc/${formatMoney(ct.reservedValue)} vốn khóa chiếm phần lớn tiền mặt — tiền còn mỏng thì để thoáng hơn` }
                          : { c: '#2ecc71', t: `đáng: cọc ${formatMoney(ct.deposit)} hoàn khi giao, lấy +${formatMoney(ct.bonus)}` };
                      return <span style={{ color: line.c, width: '100%' }}>{line.t}.</span>;
                    })()}
                    <button style={{ ...btn, background: money < deposit ? '#777' : '#f1c40f', color: '#222' }} disabled={money < deposit} onClick={() => commitContract(id)}>🤝 Cam kết</button>
                  </>
                )}
              </div>
              {(() => {
                const p = contractStreakProgress(cs, day);
                const pct = Math.min(100, (p.cycle / CONTRACT_STREAK_EVERY) * 100);
                const barColor = p.cycle >= CONTRACT_STREAK_EVERY - 1 || p.atMilestone ? '#f1c40f' : '#3498db';
                const riskColor = p.risk === 'overdue' ? '#e74c3c' : '#f1c40f';
                return (
                  <div style={{ fontSize: 12, marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#3498db' }}>🎯 {p.cycle}/{CONTRACT_STREAK_EVERY} kỳ · còn {p.toMilestone} kỳ nữa tới mốc +{Math.round(CONTRACT_STREAK_BONUS * 100)}%</span>
                      <span style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
                      </span>
                    </div>
                    {p.risk !== 'ok' && (
                      <div style={{ color: riskColor, marginTop: 3 }}>
                        {p.overdue
                          ? (p.streak > 0
                              ? `⚠️ Đã quá hạn — giao bây giờ sẽ đứt chuỗi ${p.streak} kỳ về 0`
                              : '⚠️ Đã quá hạn — giao lần này sẽ tính muộn')
                          : `⏳ Còn ${p.daysLeft} ngày nữa tới hạn · giao đúng hẹn để giữ chuỗi — sắp tới mốc +${Math.round(CONTRACT_STREAK_BONUS * 100)}%`}
                      </div>
                    )}
                    <div style={{ marginTop: 3, opacity: 0.85 }}>
                      {p.overdue && p.streak > 0
                        ? '💡 Đánh đổi: giao giữ doanh thu kỳ này nhưng mất chuỗi — hoặc bỏ qua để xả hàng bán lẻ.'
                        : p.risk === 'due_soon'
                          ? `💡 Giao đúng hạn kỳ này đưa chuỗi lên ${p.streak + 1} — gần hơn mốc thưởng.`
                          : `💡 Giữ nhịp: giao mỗi ${def.periodDays} ngày để chuỗi tiến đều tới mốc +${Math.round(CONTRACT_STREAK_BONUS * 100)}%.`}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Một hợp đồng: hiển thị chi tiết, nút chấp nhận. */
function ContractRow({ contract }: { contract: SupplyContract }) {
  const { level, money, contracts, acceptContract, repLog } = useGame();
  const rep = reputationOf(repLog);
  const trusted = meetsRep(rep, contract.rep);
  const alreadyAccepted = !!contracts[contract.id];
  const canAfford = money >= contractValue(contract) * 0.3; // chỉ kiểm tra sơ bộ
  return (
    <div style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px', opacity: alreadyAccepted ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>{contract.icon}</span>
        <div style={{ flex: 1 }}>
          <b>{contract.title}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{contract.from} · {contract.description}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>📅 Chu kỳ: {contract.periodDays} ngày</span>
          <span>💰 {formatMoney(contractValue(contract))}/kỳ</span>
          <span>⭐ {contract.xp} XP</span>
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 6 }}>
        {Object.entries(contract.items).map(([id, q]) => (
          <span key={id} style={{ marginRight: 12, color: '#3498db' }}>
            {productById(id).name} ×{q}
          </span>
        ))}
      </div>
      {(() => {
        const roi = contractAcceptRoi(contract);
        const chipColor = roi.verdict === 'worth' ? '#2ecc71' : roi.verdict === 'tight' ? '#f1c40f' : '#e74c3c';
        const chipText = roi.verdict === 'worth' ? 'Đáng ký' : roi.verdict === 'tight' ? 'Cân nhắc' : 'Suy nghĩ lại';
        return (
          <div style={{ fontSize: 13, marginTop: 4 }}>
            💸 Lời thật ~{formatMoney(roi.contractNet)}/kỳ (~{formatMoney(roi.netPerDay)}/ngày){' '}
            <span style={{ color: chipColor, border: `1px solid ${chipColor}`, borderRadius: 10, padding: '0 7px', fontSize: 11 }}>{chipText}</span>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              So với bán lẻ hết lô, giá sỉ nhượng {Math.round(roi.giveUpPct * 100)}% — đổi lại đầu ra chắc, giao đều, giữ chuỗi thưởng.
            </div>
          </div>
        );
      })()}
      {alreadyAccepted ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>✅ Đã chấp nhận hợp đồng này</div>
      ) : (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {contract.rep && (
            <span style={{ fontSize: 12, color: trusted ? '#2ecc71' : '#e17055' }}>
              {trusted ? '✅' : '🔒'} {describeRep(contract.rep)} (đang {repScore(rep, contract.rep).toFixed(1)}★)
            </span>
          )}
          <button
            style={{ ...btn, background: trusted ? '#f1c40f' : '#777' }}
            disabled={!trusted}
            onClick={() => acceptContract(contract.id)}
          >
            📋 Chấp nhận hợp đồng
          </button>
        </div>
      )}
    </div>
  );
}

/** Hợp đồng chưa mở khóa — chỉ hiện thông tin khóa. */
function LockedContract({ contract }: { contract: SupplyContract }) {
  return (
    <div style={{ background: '#2b2b3a', borderRadius: 8, padding: '8px 12px', opacity: 0.5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 22 }}>🔒</span>
        <div>
          <b>{contract.title}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Cần cấp {contract.unlock}{contract.rep ? ` · ${describeRep(contract.rep)}` : ''}</div>
        </div>
      </div>
    </div>
  );
}

const head: React.CSSProperties = { margin: '14px 0 8px', fontSize: 15 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 };
