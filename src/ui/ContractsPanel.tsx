import { useGame } from '../core/store';
import { describeRep, meetsRep, repScore, reputationOf } from '../data/reputation';
import { SUPPLY_CONTRACTS, supplyContractById, missingForContract, contractValue, type SupplyContract } from '../data/contracts';
import { formatMoney, productById } from '../data/products';

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
  const { contracts, deliverContract } = useGame();
  const active = Object.entries(contracts).filter(([, cs]) => !cs.pending || cs.dueDay);
  if (!active.length) return null;
  return (
    <>
      <h3 style={head}>⚡ Đang hoạt động</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {active.map(([id, cs]) => {
          const def = supplyContractById(id);
          if (!def) return null;
          const left = cs.dueDay - useGame.getState().day;
          return (
            <div key={id} style={{ background: '#3a3a4d', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{def.icon}</span>
                <div style={{ flex: 1 }}>
                  <b>{def.title}</b>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {cs.delivered} kỳ đã giao · mỗi {def.periodDays} ngày
                    {left > 0 && ` · còn ${left} ngày nữa`}
                  </div>
                </div>
                <button
                  style={{ ...btn, background: left > 0 ? '#2ecc71' : '#e74c3c', color: '#fff' }}
                  onClick={() => deliverContract(id)}
                >
                  🚚 Giao
                </button>
              </div>
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
          <span key={id} style={{ marginRight: 12, color: '#74b9ff' }}>
            {productById(id).name} ×{q}
          </span>
        ))}
      </div>
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
