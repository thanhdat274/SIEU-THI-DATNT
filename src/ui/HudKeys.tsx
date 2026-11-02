/** GĐ635: bảng phím tắt trong menu Thêm — tách khỏi Hud để nạp lười (gói tải ban đầu sát trần). */
export const CONTROLS = [
  ['WASD / bấm chuột', 'Đi lại'],
  ['N', 'Đi ngủ (ở giường)'],
  ['B', 'Bày hàng (ở kệ, tủ)'],
  ['K', 'Đặt hàng / xem kho (ở kho)'],
  ['G', 'Giao hàng (ở cửa nhà khách)'],
  ['M', 'Nấu ăn (ở trạm nấu)'],
  ['O', 'Đóng / mở cửa tiệm'],
  ['Kéo chuột trái', 'Nhìn quanh'],
  ['Chuột phải / Q E', 'Xoay camera'],
  ['Cuộn chuột', 'Phóng to, thu nhỏ'],
  ['Esc', 'Đóng bảng'],
];

export function HudKeys() {
  return (
    <div className="hud-help">
      {CONTROLS.map(([k, v]) => (
        <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
      ))}
    </div>
  );
}
