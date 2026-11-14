import type { ReactNode } from 'react';
import { formatMoney } from '../../data/products';
import { describeDay, WEATHER } from '../../data/weather';
import { trafficForecast, todayTrafficNote } from '../../data/trafficForecast';
import { styles } from './shared';
import { t } from '../../core/i18n';

type W = keyof typeof WEATHER;

/** GĐ943: tách khỏi MorningPanel (nguyên văn phụ đề: thời tiết, lịch tự động, tiền nhà, dự báo khách mai). */
export function MorningSubtitle({ weatherSeed, day, weather, tomorrow, level, rent, autoNote }: {
  weatherSeed: number; day: number; weather: W; tomorrow: W; level: number; rent: number; autoNote?: ReactNode;
}) {
  const tf = trafficForecast({ weather, tomorrow, level, day, seed: weatherSeed });
  return (
    <p style={styles.sub}>
      {WEATHER[weather].icon}{' '}{t('panels_morning.hom_nay_2')}{' '}{describeDay(weatherSeed, day, weather)} · mai {WEATHER[tomorrow].icon} {describeDay(weatherSeed, day + 1, tomorrow)}.
      {todayTrafficNote(tf)}{' '}
      {autoNote ? <div style={{ marginTop: 2 }}>{autoNote}</div> : null}{' '}
      {t('panels_morning.doc_xong_nen_nhap_hang_bay')}{' '}<b>{formatMoney(rent)}</b>.
      <> Mai {WEATHER[tomorrow].icon}{t('panels_morning.khach_ghe')}{Math.round(tf.tomorrowTraffic * 100)}{t('panels_morning.muc_thuong')}{Math.round(tf.tomorrowKhach)}{' '}{t('panels_morning.khach_2')}{tf.cause ? ` · ${tf.cause}` : ''}).
        {tf.verdict === 'hot' ? t('panels_morning.troi_dong_nen_tru_them_mon') : tf.verdict === 'slow' ? t('panels_morning.troi_vang_dung_chat_them_hang') : ''}</>
    </p>
  );
}
