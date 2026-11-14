import { useEffect, useState } from 'react';
import { WHATS_NEW, whatsNewMarkSeen } from '../data/whatsNew';

/** Định dạng ngày ISO → dd/mm/yyyy cho gọn mắt. */
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Một gạch đầu dòng: hỗ trợ chủ đề in đậm "**Chủ đề**: mô tả" ở bất kỳ đâu trong dòng. */
function Line({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return <li>{text}</li>;
  return <li>{parts.map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : p))}</li>;
}

const card: React.CSSProperties = {
  border: '1px solid rgba(0,0,0,.14)', borderRadius: 10, padding: '10px 12px',
  marginBottom: 10, background: 'rgba(255,255,255,.65)',
};
const pill = { borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' } as const;

/** Danh sách "Có gì mới" dùng chung (Sheet đăng nhập + tab Cài đặt).
 *  Chống quá tải: chỉ mở sẵn `visibleCount` mục mới nhất, bản cũ gom sau nút mở rộng. */
export function WhatsNewList({ visibleCount = 2 }: { visibleCount?: number }) {
  useEffect(() => { whatsNewMarkSeen(); }, []);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? WHATS_NEW : WHATS_NEW.slice(0, visibleCount);
  const hidden = WHATS_NEW.length - shown.length;
  return (
    <div>
      {shown.map((e, i) => (
        <section key={e.date + e.title} style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 14 }}>{e.title}</b>
            <span style={{ ...pill, background: '#2e7d4f', color: '#fff' }}>{fmtDate(e.date)}</span>
            {i === 0 && <span style={{ ...pill, background: '#ffe3e3', color: '#c92a2a' }}>MỚI</span>}
          </div>
          <ul style={{ margin: '6px 0 0', paddingLeft: 20, display: 'grid', gap: 4, fontSize: 13, lineHeight: 1.45 }}>
            {e.lines.map((l) => <Line key={l} text={l} />)}
          </ul>
        </section>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ width: '100%', padding: 8, borderRadius: 10, border: '1px dashed rgba(0,0,0,.3)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 13 }}
        >
          Xem {hidden} bản cập nhật cũ hơn ↓
        </button>
      )}
    </div>
  );
}
