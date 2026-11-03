import type { CSSProperties } from 'react';

export const st: Record<string, CSSProperties> = {
  meters: { display: 'flex', gap: 16, flexWrap: 'wrap', margin: '4px 0 10px' },
  sub: { margin: '0 0 10px', opacity: 0.75, fontSize: 13 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tab: {
    display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: '6px 10px', borderRadius: 8,
    border: '2px solid transparent', background: '#3a3a4d', color: '#fff', cursor: 'pointer', fontSize: 13,
  },
  tabOn: { border: '2px solid #f1c40f', background: '#4a4a60' },
  tabMeta: { display: 'block', fontSize: 11, opacity: 0.75 },
  banner: { background: 'rgba(225, 112, 85, 0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 13, marginBottom: 8 },
  toolbar: { display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  btn: { border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  list: { maxHeight: '45vh', overflow: 'auto', borderRadius: 8, background: '#232330' },
  // Lớp hướng dẫn ngày đầu (GĐ38): banner + khối 3 món thiết yếu nổi bật, chỉ hiện khi guideOn
  guideBox: { display: 'grid', gap: 6, margin: '0 0 10px', padding: 6, borderRadius: 8, background: 'rgba(52, 152, 219, 0.06)', border: '1px solid #3498db55' },
  guideRow: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 10px',
    border: '1px solid #3498db', borderRadius: 6, background: 'rgba(52, 152, 219, 0.10)', fontSize: 13,
  },
  guideRowOn: { border: '1px solid #2ecc71', background: 'rgba(46, 204, 113, 0.10)' },
  row: {
    display: 'grid', gap: 8, alignItems: 'center',
    padding: '6px 10px', borderBottom: '1px solid #ffffff10', fontSize: 13,
  },
  head: { position: 'sticky', top: 0, background: '#2b2b3a', fontSize: 11, opacity: 0.8, zIndex: 1 },
  badge: { marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 11, color: '#fff', whiteSpace: 'nowrap' },
  step: { width: 24, height: 24, border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 14, padding: 0 },
  qty: { width: 48, height: 26, padding: 0, textAlign: 'center' },
  // Dính đáy panel: cuộn danh sách tới đâu vẫn luôn thấy tổng tiền + nút nhập.
  // GD104: bỏ tràn viền NGANG (margin âm từng đẩy footer qua mép content-box khi panel có
  // thanh cuộn dọc mỏng ~10px — margin âm chỉ recovering được padding, không recovering được
  // chỗ thanh cuộn chiếm: đo @320 footer right 298 > contentR 294). Giữ dính đáy (GĐ95),
  // footer nằm gọn trong content-box ở mọi width 320–1280; nền footer trùng nền panel nên
  // chỉ khác biệt thị giác là đường kẻ trên thụt vào theo lề nội dung.
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap',
    position: 'sticky', bottom: -18, margin: '12px 0 -18px', padding: '10px 0 18px',
    background: '#2b2b3a', borderTop: '1px solid #ffffff14', zIndex: 2,
  },
};
