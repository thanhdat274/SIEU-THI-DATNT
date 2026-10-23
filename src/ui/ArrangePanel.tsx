import { useEffect, useMemo, useRef, useState } from 'react';
import { shopLayout } from '../core/actions';
import { SELL_BACK, useGame, type Furniture } from '../core/store';
import { FURNITURE, footprint, frontDir, furnitureDef, type FurnitureType } from '../data/furniture';
import { formatMoney } from '../data/products';
import { ExpandTab, PaintTab } from './Panels';
import './arrange.css';

/** Bước dời bằng nút mũi tên / phím, và độ bám khi kéo (m). */
const STEP = 0.25;
const SNAP = 0.05;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

const COLORS: Record<FurnitureType, string> = {
  shelf: '#a0703f', bigShelf: '#7f8c99', fridge: '#4aa3df', freezer: '#76c7e8', produce: '#5fa846',
  checkout: '#c0504d', cartStation: '#8e7cc3', plant: '#3f9d5a', wall: '#c9bfa6',
};
const ICONS: Record<FurnitureType, string> = {
  shelf: '🗄️', bigShelf: '🏬', fridge: '🧊', freezer: '❄️', produce: '🥬', checkout: '🧾', cartStation: '🛒', plant: '🪴', wall: '🧱',
};

type Tab = 'furniture' | 'paint' | 'expand';

/**
 * Màn sắp xếp cửa hàng (theo game Siêu Thị tham khảo): bản vẽ tiệm nhìn từ trên xuống,
 * kéo thả / chọn rồi xoay, dời, bán; mua món mới từ danh mục bên phải.
 * Mọi thay đổi nằm trong bản nháp, bấm "Áp dụng" mới trả tiền và dọn đồ thật.
 */
export function ArrangePanel() {
  const { furniture: saved, money, level, closePanel, placeFurniture, moveFurniture, sellFurniture, notify } = useGame();
  const plan = useMemo(() => shopLayout.plan(), []);
  // Sàn và tường bản vẽ theo màu tiệm (kể cả màu đang xem thử ở thẻ Sơn sửa)
  const style = useGame((s) => s.style);
  const preview = useGame((s) => s.stylePreview);
  const look = { ...style, ...preview };
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  const [draft, setDraft] = useState<Furniture[]>(saved);
  const [history, setHistory] = useState<Furniture[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('furniture');
  const [error, setError] = useState('');
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ uid: number; dx: number; dz: number; moved: boolean; before: Furniture[] } | null>(null);

  const problems = useMemo(() => {
    const out = new Map<number, string>();
    for (const f of draft) {
      const reason = shopLayout.check(f.type, f.x, f.z, f.rot, f.uid, draft);
      if (reason) out.set(f.uid, reason);
    }
    return out;
  }, [draft]);

  // Tiền: món mới phải trả, món có sẵn bị bỏ thì được nhận lại một nửa
  const added = draft.filter((f) => f.uid < 0);
  const removed = saved.filter((f) => !draft.some((d) => d.uid === f.uid));
  const cost = added.reduce((n, f) => n + furnitureDef(f.type).price, 0);
  const refund = removed.reduce((n, f) => n + Math.round(furnitureDef(f.type).price * SELL_BACK), 0);
  const moved = draft.filter((f) => {
    const o = saved.find((s) => s.uid === f.uid);
    return o && (o.x !== f.x || o.z !== f.z || o.rot !== f.rot);
  });
  const changes = added.length + removed.length + moved.length;
  const sel = draft.find((f) => f.uid === selected) ?? null;

  const commit = (next: Furniture[]) => {
    setHistory((h) => [...h.slice(-49), draft]);
    setDraft(next);
    setError('');
  };
  const update = (uid: number, fn: (f: Furniture) => Furniture) => commit(draft.map((f) => (f.uid === uid ? fn(f) : f)));
  const nudge = (dx: number, dz: number) => sel && update(sel.uid, (f) => ({ ...f, x: snap(f.x + dx), z: snap(f.z + dz) }));
  const rotate = () => sel && update(sel.uid, (f) => ({ ...f, rot: (f.rot + 1) % 4 }));
  const remove = () => {
    if (!sel) return;
    commit(draft.filter((f) => f.uid !== sel.uid));
    setSelected(null);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setDraft(prev);
    setError('');
  };

  /** Mua món mới: tự tìm chỗ trống đầu tiên (từ trong ra ngoài), không có thì đặt giữa tiệm cho người chơi dời. */
  const buy = (type: FurnitureType) => {
    const uid = Math.min(0, ...draft.map((f) => f.uid)) - 1;
    const spot = findSpot(type, draft, plan) ?? { x: 0, z: 0, rot: 0 };
    commit([...draft, { uid, type, ...spot, tiers: [] }]);
    setSelected(uid);
  };

  const apply = () => {
    if (problems.size) return setError(`Còn ${problems.size} món đặt chưa hợp lệ (viền đỏ).`);
    const blocked = shopLayout.layoutCheck(draft);
    if (blocked) return setError(blocked);
    if (cost - refund > money) return setError(`Thiếu ${formatMoney(cost - refund - money)} để áp dụng.`);
    for (const f of removed) sellFurniture(f.uid);
    for (const f of moved) moveFurniture(f.uid, f.x, f.z, f.rot);
    for (const f of added) placeFurniture(f.type, f.x, f.z, f.rot);
    if (changes) notify(`✅ Đã áp dụng bố cục mới (${changes} thay đổi).`);
    closePanel();
  };

  const close = () => {
    if (changes && !confirm('Bỏ các thay đổi chưa áp dụng?')) return;
    closePanel();
  };

  // Phím: mũi tên dời, R xoay, Delete bán, Ctrl+Z hoàn tác, Esc bỏ chọn rồi mới đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        e.stopImmediatePropagation();
        if (selected !== null) setSelected(null);
        else close();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && k === 'z') undo();
      else if (!sel) return;
      else if (k === 'arrowleft') nudge(-STEP, 0);
      else if (k === 'arrowright') nudge(STEP, 0);
      else if (k === 'arrowup') nudge(0, -STEP);
      else if (k === 'arrowdown') nudge(0, STEP);
      else if (k === 'r') rotate();
      else if (k === 'delete' || k === 'backspace') remove();
      else return;
      e.preventDefault();
    };
    // Bắt trước Panels để Esc chỉ bỏ chọn khi đang chọn
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  /** Toạ độ màn hình → toạ độ trong tiệm (m). */
  const toPlan = (e: React.PointerEvent) => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: p.x, z: p.y };
  };

  const onItemDown = (e: React.PointerEvent, f: Furniture) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = toPlan(e);
    setSelected(f.uid);
    drag.current = { uid: f.uid, dx: f.x - p.x, dz: f.z - p.z, moved: false, before: draft };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPlan(e);
    d.moved = true;
    setDraft((list) => list.map((f) => (f.uid === d.uid ? { ...f, x: snap(p.x + d.dx), z: snap(p.z + d.dz) } : f)));
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      setHistory((h) => [...h.slice(-49), d.before]);
      setError('');
    }
  };
  // Chạm vào sàn trống: đang chọn món thì dời món đó tới đây, không thì bỏ chọn
  const onFloor = (e: React.PointerEvent) => {
    if (!sel) return;
    const p = toPlan(e);
    update(sel.uid, (f) => ({ ...f, x: snap(p.x), z: snap(p.z) }));
  };

  const { width: W, depth: D, counter, doorW } = plan;
  const pad = 0.6;
  const gridLines = [];
  for (let x = -W / 2 + 1; x < W / 2; x += 1) gridLines.push(<line key={`x${x}`} x1={x} y1={-D / 2} x2={x} y2={D / 2} />);
  for (let z = -D / 2 + 1; z < D / 2; z += 1) gridLines.push(<line key={`z${z}`} x1={-W / 2} y1={z} x2={W / 2} y2={z} />);

  return (
    <div className="ar-backdrop">
      <section className="ar" role="dialog" aria-modal="true" aria-labelledby="ar-title">
        <header className="ar-head">
          <div>
            <h2 id="ar-title">🏪 Sắp xếp cửa hàng</h2>
            <p>Kéo đồ để dời chỗ, chạm vào món để xoay hoặc bán. Bấm "Áp dụng" mới tính tiền.</p>
          </div>
          <span className="ar-money">💰 {formatMoney(money)}</span>
          <button className="ar-x" aria-label="Đóng" title="Đóng (Esc)" onClick={close}>✕</button>
        </header>

        <div className="ar-body">
          <div className="ar-main">
            <div className={`ar-status${sel ? (problems.has(sel.uid) ? ' bad' : ' sel') : ''}`}>
              {sel ? (
                problems.has(sel.uid)
                  ? <>⚠️ <b>{furnitureDef(sel.type).name}</b>: {problems.get(sel.uid)}</>
                  : <>✥ <b>{furnitureDef(sel.type).name}</b>: kéo để dời, hoặc chạm chỗ sàn trống để đưa tới đó.</>
              ) : (
                <>💡 Chạm vào một món trên bản vẽ để chọn, hoặc mua món mới ở danh mục.</>
              )}
            </div>

            <div className="ar-board">
              <svg
                ref={svg}
                viewBox={`${-W / 2 - pad} ${-D / 2 - pad} ${W + pad * 2} ${D + pad * 2 + 0.5}`}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              >
                {/* Sàn và tường; cửa ở cạnh dưới (phía đường) */}
                <rect className="ar-floor" style={{ fill: hex(look.floor) }} x={-W / 2} y={-D / 2} width={W} height={D} onPointerDown={onFloor} />
                <g className="ar-grid">{gridLines}</g>
                <path
                  className="ar-wall"
                  style={{ stroke: hex(look.wall) }}
                  d={`M ${-doorW / 2} ${D / 2} H ${-W / 2} V ${-D / 2} H ${W / 2} V ${D / 2} H ${doorW / 2}`}
                />
                <text className="ar-door" x={0} y={D / 2 + 0.45}>▼ Cửa ra vào</text>
                <rect className="ar-door-zone" x={-0.9} y={D / 2 - 1} width={1.8} height={1} />

                {/* Quầy chính cố định */}
                <g className="ar-counter">
                  <rect x={counter.x - counter.w / 2} y={counter.z - counter.d / 2} width={counter.w} height={counter.d} rx={0.06} />
                  <text x={counter.x} y={counter.z} transform={`rotate(90 ${counter.x} ${counter.z})`}>Quầy chính</text>
                </g>

                {draft.map((f) => {
                  const [w, d] = footprint(f.type, f.rot);
                  const [fx, fz] = frontDir(f.rot);
                  const bad = problems.has(f.uid);
                  const small = Math.min(w, d) < 0.6;
                  return (
                    <g
                      key={f.uid}
                      className={`ar-item${f.uid === selected ? ' on' : ''}${bad ? ' bad' : ''}${f.uid < 0 ? ' new' : ''}`}
                      onPointerDown={(e) => onItemDown(e, f)}
                    >
                      <rect x={f.x - w / 2} y={f.z - d / 2} width={w} height={d} rx={0.05} fill={COLORS[f.type]} />
                      {/* Vạch sáng ở mặt trước: phía khách đứng lấy hàng */}
                      {furnitureDef(f.type).tiers > 0 || f.type === 'checkout' ? (
                        <line className="ar-front" {...frontLine(f.x, f.z, w, d, fx, fz)} />
                      ) : null}
                      <text x={f.x} y={f.z} className={small ? 'icon-only' : undefined}>
                        {small ? ICONS[f.type] : `${ICONS[f.type]} ${furnitureDef(f.type).name}`}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {sel && (
              <div className="ar-inspect">
                <div className="ar-inspect-name">
                  <b>{ICONS[sel.type]} {furnitureDef(sel.type).name}</b>
                  <small>{sel.uid < 0 ? `Mua mới · ${formatMoney(furnitureDef(sel.type).price)}` : furnitureDef(sel.type).desc}</small>
                </div>
                <div className="ar-pad" aria-label="Dời món đang chọn">
                  <button onClick={() => nudge(0, -STEP)} aria-label="Lên">▲</button>
                  <button onClick={() => nudge(-STEP, 0)} aria-label="Trái">◀</button>
                  <button onClick={() => nudge(STEP, 0)} aria-label="Phải">▶</button>
                  <button onClick={() => nudge(0, STEP)} aria-label="Xuống">▼</button>
                </div>
                <button className="ar-btn" onClick={rotate}>↻ Xoay</button>
                <button className="ar-btn danger" onClick={remove}>
                  {sel.uid < 0 ? '✕ Bỏ món' : `🗑 Bán (+${formatMoney(Math.round(furnitureDef(sel.type).price * SELL_BACK))})`}
                </button>
                <button className="ar-btn ghost" onClick={() => setSelected(null)}>Xong</button>
              </div>
            )}
          </div>

          <aside className="ar-side">
            <div className="ar-tabs" role="tablist">
              {([['furniture', '🪑 Nội thất'], ['paint', '🎨 Sơn sửa'], ['expand', '🏗️ Mở rộng']] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="ar-side-body">
              {tab === 'furniture' && FURNITURE.map((f) => {
                const locked = f.unlock > level;
                return (
                  <button key={f.type} className="ar-card" disabled={locked} onClick={() => buy(f.type)}>
                    <span className="ar-card-icon" style={{ background: COLORS[f.type] }}>{ICONS[f.type]}</span>
                    <span className="ar-card-text">
                      <b>{f.name}</b>
                      <small>{f.desc}</small>
                    </span>
                    <span className="ar-card-price">{locked ? `🔒 Cấp ${f.unlock}` : formatMoney(f.price)}</span>
                  </button>
                );
              })}
              {tab === 'paint' && <PaintTab />}
              {tab === 'expand' && <ExpandTab />}
            </div>
          </aside>
        </div>

        <footer className="ar-foot">
          <span className="ar-sum">
            📝 {changes} thay đổi
            {cost > 0 && <> · Mua <b>{formatMoney(cost)}</b></>}
            {refund > 0 && <> · Bán lại <b>+{formatMoney(refund)}</b></>}
          </span>
          {error && <span className="ar-error">{error}</span>}
          <div className="ar-foot-actions">
            <button className="ar-btn ghost" disabled={!history.length} onClick={undo}>↺ Hoàn tác</button>
            <button className="ar-btn ghost" onClick={close}>Huỷ</button>
            <button className="ar-btn primary" disabled={!changes} onClick={apply}>✓ Áp dụng</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/** Đoạn thẳng mặt trước của một món (toạ độ trong tiệm). */
function frontLine(x: number, z: number, w: number, d: number, fx: number, fz: number) {
  if (fz !== 0) return { x1: x - w / 2 + 0.06, x2: x + w / 2 - 0.06, y1: z + (fz * d) / 2, y2: z + (fz * d) / 2 };
  return { x1: x + (fx * w) / 2, x2: x + (fx * w) / 2, y1: z - d / 2 + 0.06, y2: z + d / 2 - 0.06 };
}

type Rect = { x0: number; z0: number; x1: number; z1: number };
const box = (f: Furniture): Rect => {
  const [w, d] = footprint(f.type, f.rot);
  return { x0: f.x - w / 2, z0: f.z - d / 2, x1: f.x + w / 2, z1: f.z + d / 2 };
};
/** Lối đi rộng 1m trước mặt kệ (chỗ khách đứng lấy hàng); đồ không bày hàng thì không cần. */
const aisle = (f: Furniture): Rect => {
  if (!furnitureDef(f.type).tiers && f.type !== 'checkout') return { x0: 0, z0: 0, x1: 0, z1: 0 };
  const b = box(f);
  const [fx, fz] = frontDir(f.rot);
  return {
    x0: fx > 0 ? b.x1 : fx < 0 ? b.x0 - 1 : b.x0, x1: fx > 0 ? b.x1 + 1 : fx < 0 ? b.x0 : b.x1,
    z0: fz > 0 ? b.z1 : fz < 0 ? b.z0 - 1 : b.z0, z1: fz > 0 ? b.z1 + 1 : fz < 0 ? b.z0 : b.z1,
  };
};
const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

/** Chỗ trống đầu tiên cho món mới (không chắn lối đi), quét từ góc trong cùng ra. */
function findSpot(type: FurnitureType, list: Furniture[], plan: { width: number; depth: number }) {
  for (const rot of [0, 1]) {
    for (let z = -plan.depth / 2 + 0.5; z < plan.depth / 2; z += STEP) {
      for (let x = -plan.width / 2 + 0.5; x < plan.width / 2; x += STEP) {
        const sx = snap(x);
        const sz = snap(z);
        if (shopLayout.check(type, sx, sz, rot, undefined, list)) continue;
        const me = { uid: -999, type, x: sx, z: sz, rot, tiers: [] };
        if (list.some((f) => overlap(aisle(f), box(me)) || overlap(aisle(me), box(f)))) continue;
        // Chỗ này không được chắn lối tới kệ, quầy khác
        if (!shopLayout.layoutCheck([...list, { uid: -999, type, x: sx, z: sz, rot, tiers: [] }])) return { x: sx, z: sz, rot };
      }
    }
  }
  return null;
}
