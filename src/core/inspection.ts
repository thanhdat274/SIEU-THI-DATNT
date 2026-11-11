import { useGame } from './store';
import { askAtCounter, askPending } from './counterAsk';
import { metaRng } from './rand';
import { formatMoney } from '../data/products';
import {
  DIRT_FAIL_AT, HYGIENE_UNLOCK, INSPECTION_CHANCE, INSPECTION_NOTES, INSPECTION_PRAISE, INSPECTION_ROLL_EVERY,
  inspectionFine, inspectionOutcome, pickNote, finePaidXp, praiseXp,
} from '../data/inspection';

/**
 * GĐ1506 — điều phối Đoàn kiểm tra vệ sinh: chạy TRONG tick ở máy chạy (khách hẻm online
 * không tick đồng hồ — GĐ786), gieo metaRng theo phút game tích luỹ (độc lập chuỗi kinh tế).
 * Hỏi quầy đi qua cơ chế askAtCounter — hẻm online tự chia sẻ cho mọi máy, ai bấm trước thì chốt.
 */

let accMinutes = 0;
let firedDay = -1;
let seenDay = -1;

/** Điều kiện ghé kiểm tra (tách ra để test): tiệm đang mở, đủ cấp, trong giờ bán. */
export const inspectionDue = (level: number, shopOpen: boolean, minutes: number, askWaiting: boolean): boolean =>
  level >= HYGIENE_UNLOCK && shopOpen && !askWaiting && minutes >= 9 * 60 && minutes <= 20 * 60;

export function maybeInspection(dtMinutes: number) {
  const s = useGame.getState();
  if (s.day !== seenDay) {
    seenDay = s.day;
    accMinutes = 0;
    if (firedDay !== s.day && firedDay >= 0 && s.day - firedDay > 1) firedDay = -1; // cách ngày xa thì mở lại cơ hội
  }
  if (firedDay === s.day || !inspectionDue(s.level, s.shopOpen, s.minutes, askPending())) return;
  accMinutes += dtMinutes;
  if (accMinutes < INSPECTION_ROLL_EVERY) return;
  accMinutes = 0;
  if (metaRng() > INSPECTION_CHANCE) return;
  firedDay = s.day;
  if (s.dirt < DIRT_FAIL_AT) {
    const px = praiseXp(s.level);
    s.notify(pickNote(INSPECTION_PRAISE, metaRng) + (px ? ` +${px} XP` : ''));
    if (px) s.addXp(px);
    return;
  }
  const fine = inspectionFine(s.stats.revenue);
  const note = pickNote(INSPECTION_NOTES, metaRng);
  askAtCounter({
    icon: '🧹',
    who: 'Đoàn kiểm tra vệ sinh',
    text: note,
    options: [`Nhận phạt −${formatMoney(fine)}`, 'Vệ sinh gấp (rẻ hơn, có rủi ro)'],
    fallback: 0,
    expiresAt: s.minutes + 45,
    resolve: (choice) => {
      const st = useGame.getState();
      const out = inspectionOutcome(choice as 0 | 1, fine, st.dirt, metaRng);
      useGame.setState({ money: Math.max(0, st.money - out.money), dirt: Math.max(0, Math.min(st.dirt, out.dirt)) });
      st.notify(out.message);
      const xp = finePaidXp(choice as 0 | 1, fine, st.level);
      if (xp > 0) { st.addXp(xp); st.notify(`📜 Nộp phạt đàng hoàng: +${xp} XP`); }
    },
  });
}
