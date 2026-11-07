/**
 * GĐ1433 — Sổ nấu sau GĐ1404–1431 có ~190 công thức; mỗi trạm liệt kê cả chục món còn khóa xa → cuộn dài.
 * Giữ mọi món đã mở + đúng MỘT món khóa gần nhất (mục tiêu kế), phần khóa còn lại gộp thành một dòng tóm tắt.
 */
export function splitLockedRecipes<T extends { unlock: number }>(recipes: readonly T[], level: number) {
  const sorted = [...recipes].sort((a, b) => a.unlock - b.unlock);
  const open = sorted.filter((r) => r.unlock <= level);
  const locked = sorted.filter((r) => r.unlock > level);
  return { visible: [...open, ...locked.slice(0, 1)], hiddenCount: Math.max(0, locked.length - 1), nextHiddenUnlock: locked[1]?.unlock };
}
