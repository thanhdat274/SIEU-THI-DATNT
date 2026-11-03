import { formatMoney } from '../../data/products';
import { alleySignalsToday } from '../../data/alleySignals';
import { seasonEvent, seasonObjective, seasonEventName, SEASON_EVENT_DAYS, SEASON_REWARD_PER_STAR } from '../../data/seasonEvent';
import type { BizState } from '../../data/biz';
import { Callout } from './shared';

/** GĐ933: tách khỏi MorningPanel (nguyên văn thẻ "Con hẻm hôm nay" GĐ198 + thẻ sự kiện mùa). */
export function AlleyTodayCard({ weatherSeed, day, level }: { weatherSeed?: number; day: number; level: number }) {
  const sigs = alleySignalsToday(weatherSeed ?? 0, day, level);
  const busy = sigs.filter((s) => s.active);
  return (
    <Callout tone={busy.length ? 'accent' : 'info'} style={{ marginBottom: 8 }}
      title={<>🌇 Con hẻm hôm nay{busy.length ? `: ${busy.map((s) => `${s.icon} ${s.name}`).join(' · ')}` : ''}</>}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {busy.length === 0
          ? <div style={{ fontSize: 12, opacity: 0.78 }}>Hẻm thường vắng — vài chậu cây trước hiên, đèn ấm lên lúc chập tối. Ngày có chợ phiên / lễ hội / sửa đường thì cảnh đổi liền theo.</div>
          : busy.map((s) => <div key={s.id} style={{ fontSize: 12 }}>{s.icon} <b>{s.name}</b>: {s.desc}</div>)}
      </div>
    </Callout>
  );
}

export function SeasonEventCard({ day, weatherSeed, biz }: { day: number; weatherSeed?: number; biz: BizState }) {
  const ev = seasonEvent(day);
  if (!ev) return null;
  const obj = seasonObjective(weatherSeed ?? 0, day);
  const stars = biz.seasonEvt?.season === ev.season ? (biz.seasonEvt?.stars ?? 0) : 0;
  const claimedToday = biz.seasonEvt?.claimedDay === ev.dayIndex;
  const name = seasonEventName(ev.season);
  return (
    <Callout tone="ok" title={`🌟 ${name} · ngày ${ev.dayIndex + 1}/${SEASON_EVENT_DAYS}`} style={{ marginBottom: 8 }}>
      {obj && (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {obj.icon} Mục tiêu hôm nay: <b>{obj.title}</b> ({obj.detail})
          {claimedToday ? ' ✓ xong' : ' — làm để +1 sao'}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>⭐ {stars} sao mùa · mỗi mục tiêu thưởng {formatMoney(SEASON_REWARD_PER_STAR)}</div>
    </Callout>
  );
}
