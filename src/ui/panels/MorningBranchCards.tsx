import { useGame } from '../../core/store';
import { signHiepLuc } from '../../core/biz';
import { formatMoney } from '../../data/products';
import { HIEPLUC_COC, HIEPLUC_MIN, HIEPLUC_CAP, HIEPLUC_RATE, HIEPLUC_STREAK_PCT, HIEPLUC_STREAK_MAX, hiepLucPayoff } from '../../data/hiepLuc';
import { monthOf } from '../../data/calendar';
import type { BizState } from '../../data/biz';
import { Callout, styles } from './shared';

/** GĐ928: tách khỏi MorningPanel (nguyên văn thẻ việc chi nhánh + thẻ đối tác chi nhánh × quán nước). */
export function BranchChoresCard({ branchChores }: { branchChores: { icon: string; text: string; danger?: boolean }[] }) {
  const openPanel = useGame((s) => s.openPanel);
  return (
    <Callout tone="warn" title="🏪 Tiện lợi 24/7: việc hôm nay" style={{ marginBottom: 8 }}>
      {branchChores.map((c, i) => (
        <button key={i} onClick={() => openPanel({ type: 'branch' })}
          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: c.danger ? '#e74c3c' : '#f1c40f', fontSize: 12, marginTop: 2, cursor: 'pointer', padding: 0 }}>
          {c.icon} {c.text}
        </button>
      ))}
    </Callout>
  );
}

export function HiepLucCard({ biz, day }: { biz: Pick<BizState, 'hiepLuc' | 'hiepLucMonth' | 'hiepLucStreak'>; day: number }) {
  const active = !!biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day);
  const combined = biz.hiepLucMonth ?? 0;
  const streak = biz.hiepLucStreak ?? 0;
  // GĐ1276: soi THƯỞNG hiệp lực — trước đây chỉ nói "được thưởng" không nói BAO NHIÊU. hiepLucMonth là doanh
  // thu chung người chơi tự tích lũy trong tháng (không phải nhu cầu khách), hiepLucPayoff = min(4%·gom, trần)
  // × chuỗi đơn điệu tăng theo gom → thưởng hiện tại là CẬN DƯỚI của thưởng cuối tháng ("tới ít nhất ~"). THUẦN đọc.
  const streakMul = Math.min(streak * HIEPLUC_STREAK_PCT, HIEPLUC_STREAK_MAX);
  return (
    <Callout tone="event" title="🤝 Đối tác chi nhánh × quán nước" style={{ marginBottom: 8 }}>
      {active ? (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Đang hiệp lực tháng này: gom {formatMoney(combined)}/{formatMoney(HIEPLUC_MIN)} doanh thu chung{streak ? ` · chuỗi ${streak} tháng` : ''}. Cọc {formatMoney(HIEPLUC_COC)} hoàn lại cuối tháng.
          {combined >= HIEPLUC_MIN ? (
            <div style={{ marginTop: 2 }}>
              Đủ ngưỡng ✓ — thưởng đang tiến tới ít nhất ~{formatMoney(hiepLucPayoff(combined, streak))} ({Math.round(HIEPLUC_RATE * 100)}% doanh thu, trần {formatMoney(HIEPLUC_CAP)}; chuỗi +{Math.round(streakMul * 100)}%).
            </div>
          ) : (
            <div style={{ marginTop: 2 }}>
              Còn kém {formatMoney(HIEPLUC_MIN - combined)} nữa đủ ngưỡng — đủ rồi thưởng {Math.round(HIEPLUC_RATE * 100)}% doanh thu gom (trần {formatMoney(HIEPLUC_CAP)}/tháng){streak ? `, chuỗi +${Math.round(streakMul * 100)}%` : ''}.
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Cả 2 cơ sở đang mở — lập đối tác để gom doanh thu chung mỗi tháng: đủ {formatMoney(HIEPLUC_MIN)} được thưởng {Math.round(HIEPLUC_RATE * 100)}% doanh thu (trần {formatMoney(HIEPLUC_CAP)}), chuỗi mỗi tháng liên tiếp +{Math.round(HIEPLUC_STREAK_PCT * 100)}% (tối đa +{Math.round(HIEPLUC_STREAK_MAX * 100)}%). Cọc {formatMoney(HIEPLUC_COC)} hoàn lại.
          <button onClick={signHiepLuc} style={{ display: 'block', marginTop: 4, ...styles.btn }}>
            🤝 Lập đối tác (cọc {formatMoney(HIEPLUC_COC)}, hoàn cuối tháng)
          </button>
        </div>
      )}
    </Callout>
  );
}
