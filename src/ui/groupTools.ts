/** Playtest P1 M5: gom nút theo nhóm (giữ thứ tự xuất hiện đầu tiên của nhóm) — mỗi tiêu đề nhóm chỉ hiện một lần. */
export function groupTools<T extends { group?: string }>(tools: readonly T[]): T[] {
  const order: (string | undefined)[] = [];
  for (const t of tools) if (!order.includes(t.group)) order.push(t.group);
  return order.flatMap((g) => tools.filter((t) => t.group === g));
}
