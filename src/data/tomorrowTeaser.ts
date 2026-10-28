/**
 * 🔮 "Mai tiệm có gì" (GĐ126) — mồi quay lại ngày mai ở cuối ngày (SummaryPanel).
 *
 * Thuần dữ liệu, chỉ ĐỌC: ghép các helper đã có (thời tiết, lễ, khách quen, mốc,
 * quà điểm danh) để các con số không bao giờ lệch khỏi Sổ đầu ngày / GiftPanel.
 * SummaryPanel nhận `day` là NGÀY VỪA KẾT THÚC (N), trong khi store đã sang ngày
 * mới (N+1). Vì thế input.day ở đây phải là `useGame(s => s.day)` = N+1 = MAI.
 */
import { WEATHER, describeDay } from './weather';
import type { Weather } from './weather';
import { upcomingFestival } from './calendar';
import { regularsExpectedToday } from './regulars';
import type { RegularProgress } from './regulars';
import { reputationOf } from './reputation';
import type { RepSample } from './reputation';
import { nearestMilestones } from './goals';
import type { MilestoneDossier } from './goals';
import { DAILY_GIFTS, scaledGiftEco, giftText, recentAvgProfit } from './gifts';

/**
 * Panel mà một dòng mồi sẽ mở khi bấm. Chỉ gồm 3 panel lá (không có trường bắt buộc),
 * nên `{ type: row.panel }` luôn hợp lệ với `openPanel` — đây là tập con của `Panel['type']`.
 */
export type TeaserPanel = 'gifts' | 'morning' | 'business';

export interface TeaserInput {
  /** NGÀY MAI (N+1), lấy từ store sau khi endDay đã sang ngày mới — KHÔNG dùng prop `day`. */
  day: number;
  level: number;
  weatherSeed: number;
  /** Thời tiết NGÀY MAI: `useGame(s => s.weather)` (store đã ở N+1). */
  weather: Weather;
  regulars: Record<string, RegularProgress>;
  repLog: RepSample[];
  totals: { revenue: number; itemsSold: number; customers: number };
  history: { profit: number }[];
  giftStreak: number;
  giftLastDay: number;
  giftGraceDay: number;
}

export interface TeaserRow {
  id: 'gift' | 'weather' | 'festival' | 'regulars' | 'milestone';
  icon: string;
  text: string;
  hint?: string;
  hintColor?: string;
  panel: TeaserPanel;
}

/** Tên đơn vị hiển thị theo loại mốc. */
const UNIT = { level: 'cấp', day: 'ngày', revenue: 'đồng', itemsSold: 'món', customers: 'khách' } as const;

/** Chồng mốc gần đạt nhất (các mốc tiệm còn cách không xa). */
const topMilestone = (input: TeaserInput): MilestoneDossier => ({
  level: input.level,
  day: input.day,
  revenue: input.totals.revenue,
  itemsSold: input.totals.itemsSold,
  customers: input.totals.customers,
});

/** Các dòng mồi cho MAI, theo thứ tự R0..R4; ẩn dòng không thoả điều kiện. */
export function tomorrowTeaser(input: TeaserInput): TeaserRow[] {
  const rows: TeaserRow[] = [];

  // R0 — Quà điểm danh (chỉ người chơi mới 7 ngày đầu). Mirror claimGift để số chuỗi không lệch.
  const nowDay = input.day;
  const grace = nowDay - input.giftLastDay === 2 && input.giftStreak >= 3 && nowDay - input.giftGraceDay >= 7;
  const tomorrowStreak = input.giftLastDay === nowDay - 1 || grace ? input.giftStreak + 1 : 1;
  const chest = scaledGiftEco(DAILY_GIFTS[6], input.level, recentAvgProfit(input.history));
  if (nowDay <= 7 && tomorrowStreak >= 2 && tomorrowStreak <= 7) {
    rows.push({
      id: 'gift',
      icon: '🎁',
      text: tomorrowStreak === 7
        ? `🎁 Mai đủ 7 ngày — tới ${chest.icon} ${chest.label} (${giftText(chest)})!`
        : `🎁 Mai điểm danh ngày ${tomorrowStreak} — còn ${7 - tomorrowStreak} ngày nữa là tới ${chest.icon} ${giftText(chest)}`,
      panel: 'gifts',
    });
  }

  // R1 — Thời tiết mai trừ khi "nhiều mây" (trung tính ≈ không mồi).
  if (input.weather !== 'cloudy') {
    const low = input.weather === 'rain' || input.weather === 'storm' || input.weather === 'fog';
    rows.push({
      id: 'weather',
      icon: WEATHER[input.weather].icon,
      text: `Mai ${describeDay(input.weatherSeed, nowDay, input.weather).replace(/^\S+\s/, '')}`,
      hint: low ? 'ít khách hơn' : input.weather === 'sunny' ? 'đông khách hơn' : undefined,
      hintColor: low ? '#e74c3c' : input.weather === 'sunny' ? '#2ecc71' : undefined,
      panel: 'morning',
    });
  }

  // R2 — Lễ sắp tới.
  const soon = upcomingFestival(nowDay);
  if (soon) {
    rows.push({
      id: 'festival',
      icon: soon.festival.icon,
      text: `${soon.festival.name} ${soon.inDays === 1 ? 'ngày mai' : `còn ${soon.inDays} ngày nữa`}`,
      hint: `+${Math.round((soon.festival.traffic - 1) * 100)}% khách`,
      panel: 'morning',
    });
  }

  // R3 — Khách quen dự kiến ghé mai.
  const expected = regularsExpectedToday(nowDay, input.weatherSeed, input.level, input.regulars, reputationOf(input.repLog));
  if (expected.length) {
    const cut = expected.length > 3;
    const names = expected.slice(0, 3).map((r) => r.name).join(', ') + (cut ? '…' : '');
    rows.push({
      id: 'regulars',
      icon: '💛',
      text: `Mai ${names} ghé`,
      hint: `${expected.length} khách quen`,
      panel: 'morning',
    });
  }

  // R4 — Mốc gần đạt.
  const top = nearestMilestones(topMilestone(input), 3)[0];
  if (top) {
    rows.push({
      id: 'milestone',
      icon: top.m.icon,
      text: `Sắp tới ${top.m.name} — còn ${top.remaining.toLocaleString('vi-VN')} ${UNIT[top.m.key]}`,
      panel: 'business',
    });
  }

  return rows;
}
