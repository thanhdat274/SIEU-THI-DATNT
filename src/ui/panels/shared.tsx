import { CATEGORIES, type Product } from '../../data/products';
import type * as React from 'react';

export const CATEGORY_ORDER = Object.keys(CATEGORIES);

export const byCategory = (a: Product, b: Product) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

/** Hạn gần nhất của hàng đang bày: đỏ khi còn 1 ngày, cam khi còn 2–3 ngày. */
export function LifeBadge({ life, sale }: { life: number | null; sale: number }) {
  if (life === null) return <span style={{ width: 64 }} />;
  const color = life <= 1 ? '#e74c3c' : life <= 3 ? '#e67e22' : undefined;
  return (
    <span style={{ minWidth: 64, fontSize: 12, color, opacity: color ? 1 : 0.7, whiteSpace: 'nowrap' }} title={sale ? `Lô cận hạn, tự bán giảm ${sale * 100}%` : 'Hạn dùng còn lại của lô cũ nhất'}>
      ⏳ {life} ngày{sale > 0 && <b> −{sale * 100}%</b>}
    </span>
  );
}

export function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ ...styles.card, display: 'block', padding: '6px 10px' }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{icon} {label}</div>
      <b style={{ fontSize: 13 }}>{value}</b>
    </div>
  );
}

export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const starColor = (n: number) => (n >= 4 ? '#2ecc71' : n === 3 ? '#f1c40f' : '#e74c3c');

/** GĐ2349 — `pin`: ghim hàng nút xuống ĐÁY khung khi nội dung ngắn (marginTop:'auto' trong flex
 *  column của panel bọc ngoài; nội dung dài thì auto-margin tự về 0 như thường) — hết cảnh panel
 *  Sổ đầu ngày kết thúc giữa panel rồi trống nửa khung dưới (QA người chơi). */
export function Footer({ onClose, closeLabel = 'Đóng', children, pin }: { onClose: () => void; closeLabel?: string; children?: React.ReactNode; pin?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: pin ? 'auto' : 16, ...(pin ? { paddingTop: 16 } : {}) }}>
      {children}
      <button style={{ ...styles.btn, background: '#f1c40f' }} onClick={onClose}>{closeLabel}</button>
    </div>
  );
}

/** Thanh tab chuyển đổi — dùng chung cho mọi panel; render giống nhau để UI nhất quán. */
export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
      {tabs.map(([id, label]) => (
        <button
          key={id}
          style={{ ...styles.btn, marginLeft: 0, background: value === id ? '#f1c40f' : '#fff', fontWeight: value === id ? 700 : undefined, transition: 'background 0.12s', borderBottom: value === id ? '2px solid #e6b800' : undefined }}
          onClick={() => onChange(id)}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = value === id ? '#f1c40f' : '#fff')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const Swatch = ({ color }: { color: number }) => (
  <span style={{
    display: 'inline-block', width: 12, height: 12, borderRadius: 3, verticalAlign: 'middle',
    background: `#${color.toString(16).padStart(6, '0')}`, border: '1px solid #0004',
  }} />
);

/**
 * Màn hình hẹp (điện thoại, máy tính bảng nhỏ): panel thu gọn vừa vặn với viewport,
 * chừa lề đều các cạnh. Kiểm tra theo chiều rộng thực tế (max-width: 1000px) thay vì chỉ (pointer: coarse)
 * để đảm bảo mọi thiết bị (kể cả máy tính cửa sổ thu nhỏ hay môi trường WebView/IAB) đều nhận layout chuẩn.
 */
/** GĐ1836: mở public để panel nào cần rút gọn văn bản trên màn nhỏ cũng dùng đúng một nguồn chân lý. */
export const IS_MOBILE =
  typeof matchMedia !== 'undefined' &&
  (matchMedia('(max-width: 1000px)').matches || matchMedia('(pointer: coarse) and (max-width: 1000px)').matches);

/** Biến padding ngang panel: footer dính/muốn tràn mép-edge tham chiếu var này thay vì
 * số cứng — panel mobile padding 14px còn desktop 22px, số cứng làm tràn 8px mỗi mép (GĐ95). */
const PANEL_VARS = (px: string) => ({ '--panel-px': px } as React.CSSProperties);

/** GĐ2348 — vệt mờ dần mép trên/dưới của khung panel: dòng bị cắt lửng ở đáy phải ĐỌC RA là
 * "còn nội dung, cuộn được", không phải nội dung gãy (QA người chơi: đáy panel khó chịu).
 * Mẹo background-attachment chuẩn cho vùng cuộn: vệt màu nhạt CUỘN THEO nội dung (`local`,
 * không che chữ vì là nền), bóng mờ ĐỨNG YÊN tại mép (`scroll`) — luôn hiện khi còn cuộn.
 * Nhớ giữ `backgroundColor` riêng (không dùng shorthand `background`) để ảnh nền không bị xoá. */
const PANEL_BG = '#2b2b3a';
const PANEL_FADE = {
  backgroundColor: PANEL_BG,
  backgroundImage: [
    `linear-gradient(${PANEL_BG} 30%, rgba(43,43,58,0))`,
    `linear-gradient(rgba(43,43,58,0), ${PANEL_BG} 70%)`,
    'radial-gradient(farthest-side at 50% 0, rgba(0,0,0,0.4), transparent)',
    'radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,0.4), transparent)',
  ].join(','),
  backgroundSize: '100% 48px, 100% 48px, 100% 20px, 100% 20px',
  backgroundAttachment: 'local, local, scroll, scroll',
  backgroundRepeat: 'no-repeat',
} as React.CSSProperties;

export const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    pointerEvents: 'auto', position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)',
    transition: 'background 0.2s',
  },
  panel: IS_MOBILE
    ? {
        ...PANEL_VARS('14px'),
        ...PANEL_FADE,
        color: '#fff', borderRadius: 12, padding: '12px var(--panel-px)',
        // Màn ngang: panel chiếm gần full chiều ngang như desktop để nhiều thông tin trên
        // một tầm nhìn, đỡ phải cuộn dọc. Desktop giữ nguyên kích thước cũ.
        // GĐ662: khung CỐ ĐỊNH (width lẫn height) — chuyển tab trong hub không làm modal co giãn,
        // nhảy vị trí hay đổi chỗ nút ✕; nội dung dài cuộn BÊN TRONG (overflowY/X).
        width: 'calc(100vw - 24px)', height: 'calc(100dvh - 96px)',
        // GĐ2351 — overflowX AUTO như desktop: bảng rộng (Bảng giá 6 cột…) trên màn hẹp trước đây
        // bị CẮT mất nửa phải mà không cuộn được (QA mobile 390px GĐ2351). Chuẩn GĐ298: bảng rộng
        // hơn khung thì cuộn ngang BÊN TRONG, không cắt nội dung.
        overflowY: 'auto', overflowX: 'auto',
        boxSizing: 'border-box',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }
    : {
        ...PANEL_VARS('22px'),
        ...PANEL_FADE,
        color: '#fff', borderRadius: 12, padding: '18px var(--panel-px)',
        // Chừa đáy màn hình cho dock nút của HUD — hết cảnh dãy nút cuối panel bị dock đè lên.
        // GĐ662: khung cố định min(760, màn−32) × min(688, cao−108) cho MỌI panel — hết tình trạng
        // cùng hub mà khung 658→1160px, cao 243→692 (QA toàn diện GĐ662). Bảng rộng hơn khung
        // cuộn ngang bên trong (chuẩn GĐ298: inScroller là đạt) nên không còn nội dung bị cắt.
        width: 'min(760px, calc(100vw - 32px))', height: 'min(688px, calc(100dvh - 108px))',
        overflowY: 'auto', overflowX: 'auto',
        boxSizing: 'border-box',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      },
  title: { margin: '0 0 4px' },
  sub: { margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 14, textAlign: 'right' },
  left: { textAlign: 'left', padding: '6px 8px 6px 0' },
  row: { display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' },
  select: { flex: 1, minWidth: 0 },
  card: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#3a3a4d', borderRadius: 8 },
  // Tiêu đề thẻ chuẩn (GĐ166): 13px — thống nhất các thẻ đang lẫn lộn <b> trần 16px / 13px cứng
  cardTitle: { fontSize: 13 },
  btn: { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginLeft: 4, fontSize: 13 },
  close: {
    position: 'sticky', top: 0, float: 'right', zIndex: 1, width: 30, height: 30, marginLeft: 8,
    border: '1px solid rgba(255,255,255,0.25)', borderRadius: 15, cursor: 'pointer', fontSize: 15,
    // GĐ1254 — chip nền ĐẶC màu panel: nội dung cuộn dưới ✕ (sticky) không còn "hở số" đè lên nút
    // (QA: bảng tổng kết số tiền phải-căn phải bị ✕ che lửng lơ khi cuộn). Bóng đổ nhẹ tách khỏi nội dung.
    background: '#3a3a4d', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
    transition: 'background 0.12s, transform 0.1s',
  },
};

/** Bảng màu ngữ cảnh của Callout (GĐ166) — trùng bảng màu chuẩn của dự án:
 * đỏ=mất tiền thật · cam=cảnh báo nên xử lý · xanh lá=tốt/đáng giữ ·
 * xanh dương=thông tin trung tính · vàng=nhấn mạnh/cơ hội · tím=sự kiện/meta. */
export const CALLOUT_TONE = {
  danger: '#e74c3c',
  warn: '#e67e22',
  ok: '#2ecc71',
  info: '#3498db',
  accent: '#f1c40f',
  event: '#9b59b6',
} as const;

/** Thẻ nhấn mạnh DUY NHẤT của dự án (GĐ166, theo sketch audit — tinh chỉnh: `title` tuỳ chọn
 * vì vài thẻ không có dòng tiêu đề riêng): viền trái 3px màu ngữ cảnh, tiêu đề 13px màu tone,
 * thân 12px. Trước đây các thẻ kiểu này vẽ tay ~6 biến thể khác nhau — Callout thống nhất vỏ;
 * chữ/câu và nút (truyền qua `actions`) GIỮ NGUYÊN 100%.
 * `strong` + tone 'danger' = đang mất tiền thật (mẫu GĐ149/150): thêm nền đỏ nhạt báo động. */
export function Callout({ tone, strong, title, children, actions, style }: {
  tone: keyof typeof CALLOUT_TONE;
  strong?: boolean;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** Ghi đè thêm (marginTop/marginBottom của từng panel) — không thay thế vỏ chuẩn. */
  style?: React.CSSProperties;
}) {
  const color = CALLOUT_TONE[tone];
  return (
    <div style={{
      ...styles.card, display: 'block',
      borderLeft: `3px solid ${color}`,
      background: strong && tone === 'danger' ? 'rgba(231,76,60,0.12)' : undefined,
      ...style,
    }}>
      {title !== undefined && <b style={{ ...styles.cardTitle, color }}>{title}</b>}
      {children}
      {actions}
    </div>
  );
}
