/** Playtest M3: cùng một món ở kho và trên kệ gộp thành một dòng (cộng số lượng), không lặp tên. */
export function mergeByName<T extends { name: string; qty: number }>(items: readonly T[]): T[] {
  const out: T[] = [];
  for (const i of items) {
    const same = out.find((o) => o.name === i.name);
    if (same) same.qty += i.qty;
    else out.push({ ...i });
  }
  return out;
}
