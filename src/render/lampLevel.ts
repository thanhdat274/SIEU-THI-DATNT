/**
 * Độ sáng đèn theo giờ trong ngày (0–24): 0 = ban ngày, 1 = đêm. Bật từ chập tối (17h), tắt trước khi
 * trời sáng hẳn (5h30) — chủ thường thức dậy 6h, tắt muộn hơn thì đèn còn sáng lửng giữa trời sáng.
 * Một công thức chung cho đèn đường, đèn nhà, lồng và đèn ấm.
 */
export function lampLevel(hour: number): number {
  return Math.min(1, Math.max(0, Math.max(hour - 17, 5.5 - hour)));
}

/** Như lampLevel nhưng nhận số phút game (an toàn với giá trị âm / quá 24h). */
export function lampLevelAt(minutes: number): number {
  return lampLevel((((minutes / 60) % 24) + 24) % 24);
}
