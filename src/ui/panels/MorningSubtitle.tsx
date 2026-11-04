import type { ReactNode } from 'react';
import { formatMoney } from '../../data/products';
import { describeDay, WEATHER } from '../../data/weather';
import { trafficForecast } from '../../data/trafficForecast';
import { styles } from './shared';

type W = keyof typeof WEATHER;

/** GĐ943: tách khỏi MorningPanel (nguyên văn phụ đề: thời tiết, lịch tự động, tiền nhà, dự báo khách mai). */
export function MorningSubtitle({ weatherSeed, day, weather, tomorrow, level, rent, autoNote }: {
  weatherSeed: number; day: number; weather: W; tomorrow: W; level: number; rent: number; autoNote?: ReactNode;
}) {
  const tf = trafficForecast({ weather, tomorrow, level, day, seed: weatherSeed });
  return (
    <p style={styles.sub}>
      {WEATHER[weather].icon} Hôm nay {describeDay(weatherSeed, day, weather)} · mai {WEATHER[tomorrow].icon} {describeDay(weatherSeed, day + 1, tomorrow)}.
      {autoNote ? <div style={{ marginTop: 2 }}>{autoNote}</div> : null}{' '}
      Đọc xong nên nhập hàng bày kệ trước khi mở cửa — khách quen ghé đúng giờ quen.
      🏠 Tiền nhà trả cuối ngày: <b>{formatMoney(rent)}</b>.
      <> Mai {WEATHER[tomorrow].icon}: khách ghé ~{Math.round(tf.tomorrowTraffic * 100)}% mức thường (~{Math.round(tf.tomorrowKhach)} khách).
        {tf.verdict === 'hot' ? ' Trời đông, nên trữ thêm món bán chạy.' : tf.verdict === 'slow' ? ' Trời vắng — đừng chất thêm hàng kẻo tồn.' : ''}</>
    </p>
  );
}
