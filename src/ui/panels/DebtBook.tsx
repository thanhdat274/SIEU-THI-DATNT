import { useGame } from '../../core/store';
import { formatMoney } from '../../data/products';
import { debtLedger, debtRowsByUrgency } from '../../data/debtLedger';
import { regularById } from '../../data/regulars';
import { CREDIT_FRIENDSHIP, CREDIT_UNLOCK, creditLeft, creditLimit, DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../../data/credit';
import { CHANGE_OPTS, counterPolicySummary, defaultCounterPolicy, HAGGLE_OPTS } from '../../data/counterDeals';
import { styles } from './shared';

/** Sổ nợ: khách quen ghi sổ, nhắc nợ hoặc xoá nợ; bật/tắt cho ghi sổ. */
export function DebtBook() {
  const { level, day, debts, regulars, allowCredit, setAllowCredit, remindDebt, forgiveDebt, counterPolicy, setCounterPolicy } = useGame();
  if (level < CREDIT_UNLOCK) return null;
  const rows = Object.entries(debts).filter(([, d]) => d.amount > 0);
  const total = rows.reduce((n, [, d]) => n + d.amount, 0);
  const ledger = debtLedger(debts, day);
  const policy = counterPolicy ?? defaultCounterPolicy();
  const summ = counterPolicySummary(policy);
  return (
    <>
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b>📒 Sổ nợ {rows.length ? `· ${formatMoney(total)}` : ''}</b>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={allowCredit} onChange={(e) => setAllowCredit(e.target.checked)} /> Cho ghi sổ
        </label>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Khách quen từ {CREDIT_FRIENDSHIP} 💛 có lúc quên ví, xin ghi sổ (hạn mức theo độ thân). Thường lần ghé sau sẽ trả.
        Quá {DEBT_LATE_DAYS} ngày nên nhắc nợ; quá {DEBT_WRITE_OFF_DAYS} ngày coi như mất.
      </div>
      {ledger.count > 0 && (
        <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: ledger.writeOffTonightAmount > 0 ? '#e74c3c' : ledger.lateAmount > 0 ? '#e67e22' : '#3498db' }}>
          {ledger.lockedTotal > 0 && <>Tổng nợ đang khóa <b>{formatMoney(ledger.lockedTotal)}</b> tiền mặt.</>}
          {ledger.writeOffTonightAmount > 0
            ? <> <b>{formatMoney(ledger.writeOffTonightAmount)}</b> quá {DEBT_WRITE_OFF_DAYS} ngày — <b>sẽ mất hẳn tối nay</b> nếu không nhắc/xoá!</>
            : ledger.lateAmount > 0
              ? <> {ledger.lateCount} món quá hạn ({formatMoney(ledger.lateAmount)}) — còn {Math.min(...ledger.rows.filter((r) => r.late && !r.writeOffTonight).map((r) => r.daysLeft), DEBT_WRITE_OFF_DAYS)} ngày nữa là mất hẳn. Hãy nhắc/xoá.</>
              : <> Còn trong hạn — nhớ nhắc/xoá khi tới hạn.</>}
        </div>
      )}
      {!rows.length && <div style={{ fontSize: 12, marginTop: 4 }}>Chưa ai nợ.</div>}
      {debtRowsByUrgency(debts, day).map((row) => {
        const id = row.regularId;
        const d = debts[id]!;
        const r = regularById(id);
        const age = row.age;
        const daysLeft = row.daysLeft;
        const aboutToLose = row.writeOffTonight;
        const left = creditLeft(regulars[id], d);
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, background: aboutToLose ? 'rgba(231,76,60,0.10)' : undefined, borderRadius: 4 }}>
            <span style={{ flex: 1 }}>
              {r?.name}: <b>{formatMoney(d.amount)}</b>
              <span style={{ opacity: 0.7, fontSize: 12, color: aboutToLose ? '#e74c3c' : age >= DEBT_LATE_DAYS ? '#e67e22' : undefined }}>
                {' '}· {age} ngày · hạn mức {formatMoney(creditLimit(regulars[id]))} · {left > 0 ? `còn ghi ${formatMoney(left)}` : 'hết hạn mức'}{d.reminded ? ' · đã nhắc' : ''}
                {aboutToLose
                  ? <b style={{ color: '#e74c3c' }}> — MẤT HẲN tối nay!</b>
                  : age >= DEBT_LATE_DAYS
                    ? ` — còn ${daysLeft} ngày nữa mất hẳn`
                    : ''}
              </span>
            </span>
            <button style={styles.btn} disabled={d.reminded} onClick={() => remindDebt(id)} title="Lần ghé tới chắc chắn trả, nhưng khách hơi ngại">Nhắc nợ</button>
            <button style={styles.btn} onClick={() => forgiveDebt(id)} title="Mất tiền nhưng khách thân hơn">Xoá nợ</button>
          </div>
        );
      })}
    </div>
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ fontSize: 13 }}><b>🧾 Chính sách quầy</b> <span style={{ opacity: 0.7, fontSize: 11 }}>thái độ mặc cả & tiền lẻ</span></div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{summ.haggleText} {summ.changeText}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        👥 Có thu ngân trực ở quầy thì thu ngân tự quyết mặc cả/tiền lẻ theo tay nghề — người giỏi hay trả nửa và thối kẹo, người kém hay bớt luôn. Chính sách bên dưới chỉ áp dụng khi chính bạn đứng quầy.
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>🙏 Mặc cả</div>
        {HAGGLE_OPTS.map((o) => (
          <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, marginTop: 3, cursor: 'pointer' }}>
            <input type="radio" name="counter-haggle" checked={policy.haggle === o.value} onChange={() => setCounterPolicy({ haggle: o.value })} style={{ marginTop: 2 }} />
            <span>
              <b>{o.label}</b>
              <span style={{ display: 'block', opacity: 0.7 }}>{o.note}</span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>🪙 Tiền lẻ</div>
        {CHANGE_OPTS.map((o) => (
          <label key={o.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, marginTop: 3, cursor: 'pointer' }}>
            <input type="radio" name="counter-change" checked={policy.change === o.value} onChange={() => setCounterPolicy({ change: o.value })} style={{ marginTop: 2 }} />
            <span>
              <b>{o.label}</b>
              <span style={{ display: 'block', opacity: 0.7 }}>{o.note}</span>
            </span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>Nhắc mỗi lần = như trước (bạn quyết từng đơn). Luôn/không/thối kẹo = tự xử lý mãi, khỏi hỏi lại.</div>
    </div>
    </>
  );
}
