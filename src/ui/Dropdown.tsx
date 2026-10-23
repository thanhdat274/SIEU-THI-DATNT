import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** Chữ nhỏ mờ bên phải (vd. số trong kho). */
  hint?: string;
}

interface Props<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

/** Danh sách dài hơn chừng này thì có ô tìm kiếm. */
const SEARCH_FROM = 10;
const MAX_LIST_H = 300;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

/**
 * Ô chọn tự vẽ thay cho <select>: danh sách thả xuống của trình duyệt không đổi kiểu được.
 * Danh sách nổi (position: fixed) để không bị bảng cuộn cắt mất; thiếu chỗ bên dưới thì mở lên trên.
 * Bàn phím: ↑ ↓ chọn, Enter xác nhận, Esc đóng.
 */
export function Dropdown<T extends string>({ value, options, onChange, ariaLabel, style }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);
  const searchable = options.length > SEARCH_FROM;
  const shown = query ? options.filter((o) => fold(o.label).includes(fold(query))) : options;

  const close = () => {
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  };
  const pick = (o: DropdownOption<T> | undefined) => {
    if (o) onChange(o.value);
    close();
  };

  // Đặt danh sách ngay dưới (hoặc trên) ô chọn
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const up = below < Math.min(MAX_LIST_H, 160) && r.top > below;
    setPos({
      left: r.left, minWidth: r.width, maxWidth: Math.max(r.width, Math.min(360, window.innerWidth - r.left - 8)),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(MAX_LIST_H, (up ? r.top : below) - 8),
    });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open]);

  // Bấm ra ngoài thì đóng; bảng cuộn hoặc đổi cỡ cửa sổ cũng đóng cho khỏi lệch chỗ
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!list.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    const away = (e: Event) => !list.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', away, true);
    window.addEventListener('resize', away);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', away, true);
      window.removeEventListener('resize', away);
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    // Esc chỉ đóng danh sách, không đóng cả bảng
    e.stopPropagation();
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') setActive((i) => Math.min(shown.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Enter') pick(shown[active]);
    else return;
    e.preventDefault();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`dd-trigger${open ? ' open' : ''}`}
        style={style}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKey}
      >
        <span className="dd-value">{current?.label ?? '—'}</span>
        <svg className="dd-arrow" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div ref={list} className="dd-list" style={pos} onKeyDown={onKey}>
          {searchable && (
            <input
              className="dd-search"
              autoFocus
              placeholder="Tìm…"
              aria-label="Tìm trong danh sách"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          )}
          <div id={listId} role="listbox" className="dd-options">
            {shown.map((o, i) => (
              <div
                key={o.value}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                className={`dd-option${i === active ? ' active' : ''}${o.value === value ? ' selected' : ''}`}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                <span>{o.label}</span>
                {o.hint && <span className="dd-hint">{o.hint}</span>}
              </div>
            ))}
            {shown.length === 0 && <div className="dd-empty">Không có kết quả</div>}
          </div>
        </div>
      )}
    </>
  );
}
