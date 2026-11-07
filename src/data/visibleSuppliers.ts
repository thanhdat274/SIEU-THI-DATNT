/**
 * Playtest P2 T7: tab mối nhập chỉ hiện các mối đã mở + 1 mối khóa gần nhất; mối khóa xa gộp
 * thành một dòng "+N mối nữa từ cấp X" (cùng kiểu Sổ nấu GĐ1433) — ngày đầu bớt 5–6 tab xám.
 */
export function visibleSuppliers<T extends { unlock: number }>(all: T[], level: number) {
  const open = all.filter((s) => s.unlock <= level);
  const locked = all.filter((s) => s.unlock > level).sort((a, b) => a.unlock - b.unlock);
  return { visible: [...open, ...locked.slice(0, 1)], hiddenCount: Math.max(0, locked.length - 1), nextHiddenUnlock: locked[1]?.unlock };
}
