// ============================================================================
// Data: Cook schedule — "Kịch bản nấu theo giờ" (GĐ161)
// ----------------------------------------------------------------------------
// Audit trải nghiệm 28/10: khung vắng 8:30–11h và 13–17h (×0.6) là "ca trực
// không quyết định". Nguyên lý Hay Day: mẻ nấu chạy TRONG phiên, nên bắt đầu
// mẻ TRƯỚC khung đông để kịp châm kệ đúng giờ vàng — quyết định THỜI ĐIỂM
// bắt đầu có kỹ năng, có hồi phục hình trong cùng ngày.
//
// Thuần đọc 100%: chỉ đọc RECIPE_MAP + TIME_BANDS (rhythm.ts), KHÔNG đụng
// cookJobs state, không đổi kinh tế nấu, không SAVE_VERSION/persist.
// Câu khuyến nghị chỉ nói về THỜI ĐIỂM XONG + KHUNG BÁN — không hứa doanh số.
// ============================================================================

import { RECIPE_MAP, type Recipe } from './recipes';
import { timeBandAt } from './rhythm';

/** Khung giờ vàng tối (TIME_BANDS 'toi'): đông nhất trong ngày (traffic 1.7). */
const TOI_FROM = 17 * 60;
const TOI_TO = 20 * 60;
/** Giờ vàng trưa (TIME_BANDS 'trua', traffic 1.35) — đích châm kệ cho ca giữa buổi. */
const TRUA_FROM = 11 * 60;
const TRUA_TO = 13 * 60;
/** Hết khung vàng sáng (8h30) — đích châm kệ cho mẻ nấu từ khuya sáng. */
const SANG_TO = 8 * 60 + 30;

export interface CookTiming {
  recipeId: string;
  /** Phút game cần để xong 1 mẻ ở tốc độ trạm hiện tại. */
  durationMin: number;
  /** Phút game sẽ xong nếu bắt đầu NGAY tại `nowMinutes`. */
  readyBy: number;
}

/** Mốc thời gian trong ngày (phút game) → chữ kiểu Việt Nam: "17h", "15h30". */
export const fmtHour = (m: number) => {
  const mm = Math.round(((m % 1440) + 1440) % 1440);
  const h = Math.floor(mm / 60);
  const p = mm % 60;
  return p ? `${h}h${String(p).padStart(2, '0')}` : `${h}h`;
};

/** Thời điểm 1 mẻ nếu bắt đầu ngay.
 *  `stationMinutes` — số PHÚT TRẠM THẬT cho 1 mẻ ở tốc độ trạm hiện tại (đã chia
 *  cookSpeed/bartenderBoost — xem clock.ts tick); bỏ qua/lệch = chủ tự nấu,
 *  dùng `durationMin` gốc của công thức. Không đổi bất kỳ state nào. */
export function cookTiming(recipeId: string, nowMinutes: number, stationMinutes?: number): CookTiming | null {
  const r: Recipe | undefined = RECIPE_MAP[recipeId];
  if (!r) return null;
  const custom = Number.isFinite(stationMinutes) ? Math.round(stationMinutes as number) : NaN;
  const durationMin = Number.isFinite(custom) && custom > 0 ? custom : r.durationMin;
  return { recipeId, durationMin, readyBy: nowMinutes + durationMin };
}

/** Câu khuyến nghị THỜI ĐIỂM cho 1 mẻ — ngắn, cương quyết, đúng sự thật:
 *  chỉ nói lúc nào xong và kịp khung bán nào, không hứa doanh số.
 *  Trả null khi không áp dụng: công thức lạ, đã quá 17h, hoặc mẻ xong sau giờ vàng tối. */
export function cookAdvice(recipeId: string, nowMinutes: number, stationMinutes?: number): string | null {
  const t = cookTiming(recipeId, nowMinutes, stationMinutes);
  if (!t) return null;
  const now = nowMinutes;
  const dur = t.durationMin;
  const readyBy = t.readyBy;
  // Đã quá 17h thì không còn ý nghĩa "chuẩn bị cho giờ vàng tối" nữa
  if (now >= TOI_FROM) return null;
  // Mẻ xong sau 20h — hết khung vàng tối, gợi ý thời điểm mất nghĩa
  if (readyBy >= TOI_TO) return null;
  const at = (m: number) => fmtHour(m);
  // Trước 6h (tiệm chưa mở, mồi hiếm): coi như chuẩn bị cho khung vàng sáng
  const band = timeBandAt(now)?.id ?? 'sang';
  if (band === 'sang') {
    if (readyBy <= SANG_TO) return `Nấu ngay — xong ${at(readyBy)}, kịp bán trong giờ vàng sáng (đông khách tới 8h30).`;
    if (readyBy <= TRUA_FROM) return `Xong ${at(readyBy)} vào giờ vắng giữa buổi — bày kệ chờ giờ vàng trưa 11h.`;
    if (readyBy <= TRUA_TO) return `Nấu ngay — xong ${at(readyBy)} giữa giờ vàng trưa, bày kệ bán luôn trong khung đông.`;
    return `Xong ${at(readyBy)} vào giờ vắng chiều — bày kệ chờ giờ vàng tối 17h.`;
  }
  if (band === 'giua_sang') {
    if (readyBy <= TRUA_FROM) {
      // Xong trong giờ vắng (mẻ chờ): trễ mốc bắt đầu để xong đúng đầu giờ vàng trưa
      const latest = TRUA_FROM - dur;
      if (latest > now) return `Bắt đầu sau ${at(latest)} thì vừa kịp giờ vàng trưa 11h — giờ này nấu xong cũng vắng khách.`;
      return `Nấu ngay — xong ${at(readyBy)} đầu giờ vàng trưa, bày kệ bán luôn trong khung đông.`;
    }
    if (readyBy <= TRUA_TO) return `Nấu ngay — xong ${at(readyBy)} giữa giờ vàng trưa, bày kệ bán luôn trong khung đông.`;
    return `Nấu ngay — xong ${at(readyBy)} trước giờ vàng tối 17h, bày kệ chờ khung đông.`;
  }
  if (band === 'trua') {
    if (readyBy <= TRUA_TO) return `Nấu ngay — xong ${at(readyBy)} giữa giờ vàng trưa, bày kệ bán luôn trong khung đông.`;
    return `Xong ${at(readyBy)} vào giờ vắng chiều; muốn bán đúng giờ vàng tối thì bắt đầu sau ${at(TOI_FROM - dur)}.`;
  }
  // band 'chieu' (13–17h) — khung vắng chính, nguyên lý Hay Day: dùng giờ vắng nấu cho giờ vàng
  if (readyBy <= TOI_FROM) return `Nấu ngay — xong ${at(readyBy)}, kịp bày kệ trước giờ vàng tối 17h.`;
  return `Bắt đầu muộn — xong ${at(readyBy)} giữa giờ vàng tối, còn bán được phần khung đông.`;
}

export interface EveningPrepPick {
  id: string;
  /** Tên món (đi kèm candidates). */
  name?: string;
  durationMin: number;
  /** Mốc bắt đầu muộn nhất để mẻ xong đúng 17h. */
  startBy: number;
  perMinute?: number;
}

/** Chọn món cho dòng Sổ đầu ngày (13–17h): "món duration dài nhất vẫn kịp"
 *  — mẻ dài nhất định ra mốc bắt đầu muộn nhất còn đúng sự thật (thấp hơn thì
 *  chưa cần vội); hòa duration thì lấy món lời nhất theo phút trạm (GĐ145).
 *  `candidates` do UI dựng (đã lọc trạm/nguyên liệu/dịp lễ); helper chỉ chấm giờ. */
export function pickEveningPrep(
  candidates: { id: string; name?: string; durationMin: number; perMinute?: number }[],
  nowMinutes: number,
): EveningPrepPick | null {
  if (nowMinutes >= TOI_FROM) return null;
  const fit = candidates
    .filter((c) => c.durationMin > 0 && nowMinutes + c.durationMin <= TOI_FROM)
    .sort((a, b) => b.durationMin - a.durationMin || (b.perMinute ?? 0) - (a.perMinute ?? 0));
  const best = fit[0];
  if (!best) return null;
  return { ...best, startBy: TOI_FROM - best.durationMin };
}
