import { useGame } from '../../core/store';
import { signHiepLuc } from '../../core/biz';
import { formatMoney } from '../../data/products';
import { HIEPLUC_COC, HIEPLUC_MIN } from '../../data/hiepLuc';
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
  return (
    <Callout tone="event" title="🤝 Đối tác chi nhánh × quán nước" style={{ marginBottom: 8 }}>
      {biz.hiepLuc?.active && biz.hiepLuc.m === monthOf(day) ? (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Đang hiệp lực tháng này: gom {formatMoney(biz.hiepLucMonth ?? 0)}/{formatMoney(HIEPLUC_MIN)} doanh thu chung{biz.hiepLucStreak ? ` · chuỗi ${biz.hiepLucStreak} tháng` : ''}. Cuối tháng đủ ngưỡng được thưởng (cọc {formatMoney(HIEPLUC_COC)} hoàn lại).
        </div>
      ) : (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Cả 2 cơ sở đang mở — lập đối tác để gom doanh thu chung mỗi tháng, đủ {formatMoney(HIEPLUC_MIN)} được thưởng + chuỗi tháng.
          <button onClick={signHiepLuc} style={{ display: 'block', marginTop: 4, ...styles.btn }}>
            🤝 Lập đối tác (cọc {formatMoney(HIEPLUC_COC)}, hoàn cuối tháng)
          </button>
        </div>
      )}
    </Callout>
  );
}
