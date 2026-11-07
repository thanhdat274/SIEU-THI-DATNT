/** GĐ1535 — Xóm #12 "menu quạt trên vật thể" (bản gọn): vị trí các nút xếp hình quạt
 *  quanh một tâm. n nút trải đều trên cung `spread` độ, tâm hướng lên trên. Trả toạ độ px (x phải, y xuống). */
export function radialPositions(n: number, radius = 72, spread = 160): { x: number; y: number }[] {
  if (n <= 0) return [];
  if (n === 1) return [{ x: 0, y: -radius }];
  const start = -90 - spread / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (spread * i) / (n - 1)) * Math.PI) / 180;
    return { x: Math.round(Math.cos(a) * radius), y: Math.round(Math.sin(a) * radius) };
  });
}
