import { formatMoney } from '../../data/products';
import { alleySignalsToday } from '../../data/alleySignals';
import { seasonEvent, seasonObjective, seasonEventName, SEASON_EVENT_DAYS, SEASON_REWARD_PER_STAR } from '../../data/seasonEvent';
import type { BizState } from '../../data/biz';
import { Callout } from './shared';
import { t } from '../../core/i18n';

/** GĐ933: tách khỏi MorningPanel (nguyên văn thẻ "Con hẻm hôm nay" GĐ198 + thẻ sự kiện mùa). */
export function AlleyTodayCard({ weatherSeed, day, level }: { weatherSeed?: number; day: number; level: number }) {
  const sigs = alleySignalsToday(weatherSeed ?? 0, day, level);
  const busy = sigs.filter((s) => s.active);
  return (
    <Callout tone={busy.length ? 'accent' : 'info'} style={{ marginBottom: 8 }}
      title={<>{t('panels_morning.con_hem_hom_nay')}{busy.length ? `: ${busy.map((s) => `${s.icon} ${s.name}`).join(' · ')}` : ''}</>}>
      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
        {busy.length === 0
          ? <div style={{ fontSize: 12, opacity: 0.78 }}>{t('panels_morning.hem_thuong_vang_vai_chau_cay')}</div>
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
    <Callout tone="ok" title={t('panels_morning.ngay', { name, v1: ev.dayIndex + 1, SEASON_EVENT_DAYS })} style={{ marginBottom: 8 }}>
      {obj && (
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {obj.icon}{' '}{t('panels_morning.muc_tieu_hom_nay')}{' '}<b>{obj.title}</b> ({obj.detail})
          {claimedToday ? ' ✓ xong' : t('panels_morning.lam_de_1_sao')}
        </div>
      )}
      <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>⭐ {stars}{' '}{t('panels_morning.sao_mua_moi_muc_tieu_thuong')}{' '}{formatMoney(SEASON_REWARD_PER_STAR)}</div>
    </Callout>
  );
}
