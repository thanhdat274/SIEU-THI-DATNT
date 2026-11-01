// ───── Nếp vận hành: chuỗi ngày sạch (GĐ79) ─────
// Mọi pha meta trước đây khen "bề rộng" (giữ nhiều hệ sống — GĐ71) hay đếm cộng dồn
// (perfectDays), chưa ai khen "discipline dài hạn kiểu streak" — vận hành nhiều ngày liên tiếp
// sạch sẽ (không khách bỏ về vì chờ quầy / hết hàng). Helper này THUẦN ĐỌC xác định một ngày
// có "sạch" không, khung thưởng theo mốc chuỗi, và thưởng additive nhỏ theo cấp (như GĐ75).
// Chỉ tính 2 lý do walkout thuộc về vận hành (wait=chờ quầy→thiếu người, stock=hết hàng→thiếu
// hàng) — KHÔNG tính `price` (đàn kinh tế chủ động) và `expired`. Không import store → no coopGuard.
import type { ReviewReason } from './reviews';

/** Ngày phải đủ đông khách mới tính (chặn "đóng cửa cho sạch" trục lợi). */
export const CLEAN_MIN_CUSTOMERS = 10;
/** Lý do walkout thuộc về vận hành (kể là "không sạch"). */
const OPERATIONAL_REASONS: ReviewReason[] = ['wait', 'stock'];

export type CleanStats = {
  customers: number;
  missed?: Partial<Record<ReviewReason, number>>;
};

/** Một ngày có "sạch" không: đủ đông khách và không ai bỏ vì chờ/hết hàng. */
export function cleanDayMet(s: CleanStats): boolean {
  if (s.customers < CLEAN_MIN_CUSTOMERS) return false;
  return OPERATIONAL_REASONS.every((r) => (s.missed?.[r] ?? 0) === 0);
}

/** Các mốc chuỗi ngày sạch (liên tiếp). */
export const CLEAN_TIERS: { n: number; icon: string; name: string }[] = [
  { n: 3, icon: '🧭', name: '3 ngày sạch' },
  { n: 7, icon: '🧭', name: 'Một tuần sạch' },
  { n: 14, icon: '🧭', name: 'Nửa tháng sạch' },
  { n: 30, icon: '🧭', name: 'Trọn tháng sạch' },
];

/** Thưởng additive nhỏ cho một mốc chuỗi — tách rời, theo cấp (như GĐ75), không lạm phát. */
export function cleanBonus(tier: number, level: number): number {
  return 25000 + level * 2500;
}

/** Mốc chuỗi kế tiếp cần đạt (null khi đã max 30). */
export function nextCleanTier(streak: number): { n: number; icon: string; name: string } | null {
  return CLEAN_TIERS.find((t) => t.n > streak) ?? null;
}
