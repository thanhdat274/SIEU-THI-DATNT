import { useMemo, useState } from 'react';
import { Dropdown } from './Dropdown';
import { useGame, type Furniture } from '../core/store';
import { furnitureDef, type FurnitureType } from '../data/furniture';
import { fitLots, nearestLife, tierMarkdown } from '../data/freshness';
import { describeUnits, productById, unlockedProducts } from '../data/products';
import { Footer } from './panels/shared';

/** Ô còn ít hơn chừng này phần sức chứa thì coi là sắp hết. */
const LOW = 0.5;

type Filter = 'all' | 'need' | FurnitureType;

/** Món bày được ở một kệ/tủ theo cấp hiện tại — dùng cache từ component để không tính lại mỗi slot. */
const allowed = (f: Furniture, cache: ReadonlyMap<string, import('../data/products').Product[]>) => {
  const def = furnitureDef(f.type);
  return cache.get(def.name) ?? [];
};

/** Tự chọn món cho ô trống: món kho còn nhiều nhất, ưu tiên món chưa bày ở kệ này. */
function autoPick(f: Furniture, storage: Record<string, number>, cache: ReadonlyMap<string, import('../data/products').Product[]>): string | null {
  const shown = new Set(f.tiers.map((t) => t.productId));
  const products = cache.get(furnitureDef(f.type).name) ?? [];
  const options = products.filter((p) => (storage[p.id] ?? 0) > 0);
  options.sort((a, b) => Number(shown.has(a.id)) - Number(shown.has(b.id)) || (storage[b.id] ?? 0) - (storage[a.id] ?? 0));
  return options[0]?.id ?? null;
}

/** Bày đầy một kệ: ô đã gán món thì châm thêm, ô chưa gán thì tự chọn món từ kho. */
function fillFixture(uid: number, furniture: Furniture[], storage: Record<string, number>, stockTier: (uid: number, i: number, id: string | null) => void, autoPickFn: (f: Furniture, storage: Record<string, number>, cache: ReadonlyMap<string, import('../data/products').Product[]>) => string | null, cache: ReadonlyMap<string, import('../data/products').Product[]>) {
  const fixture = furniture.find((f) => f.uid === uid);
  if (!fixture) return;
  const tiers = fixture.tiers;
  tiers.forEach((_, i) => {
    const f = furniture.find((it) => it.uid === uid)!;
    const t = f.tiers[i];
    const id = t.productId ?? autoPickFn(f, storage, cache);
    if (id && (storage[id] ?? 0) > 0 && t.count < furnitureDef(f.type).capacity) stockTier(uid, i, id);
  });
}

/** Sơ đồ kệ: mọi kệ và tủ trong tiệm, từng ô đang bày gì, còn bao nhiêu, bày nhanh từ kho. */
export function PlanogramPanel() {
  // Chọn từng field riêng (không gom vào object) — object selector tạo reference mới mỗi
  // render, khiến React 19 + zustand rơi vào "Maximum update depth exceeded" và sập cả UI.
  const furniture = useGame((s) => s.furniture);
  const storage = useGame((s) => s.storage);
  const shelfHeat = useGame((s) => s.shelfHeat);
  const shelfProfit = useGame((s) => s.shelfProfit);
  const stockTier = useGame((s) => s.stockTier);
  const unstockTier = useGame((s) => s.unstockTier);
  const openPanel = useGame((s) => s.openPanel);
  const closePanel = useGame((s) => s.closePanel);
  const autoSwap = useGame((s) => s.autoSwap);
  const replaceEmptySlots = useGame((s) => s.replaceEmptySlots);
  const notify = useGame((s) => s.notify);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const fixtures = furniture.filter((f) => furnitureDef(f.type).tiers > 0);

  // Cache unlocked products và allowed per type — chỉ tính 1 lần mỗi level thay đổi
  const level = useGame((s) => s.level);
  const unlocked = useMemo(() => unlockedProducts(level), [level]);
  const typeProducts = useMemo(() => {
    const map = new Map<string, import('../data/products').Product[]>();
    // Cache allowed per type name
    fixtures.forEach((f) => {
      const def = furnitureDef(f.type);
      if (!map.has(def.name)) {
        map.set(def.name, unlocked.filter((p) => def.categories.includes(p.category)));
      }
    });
    return map;
  }, [fixtures.length, unlocked]);

  const slotNeeds = (f: Furniture, i: number) => {
    const t = f.tiers[i];
    return !t.productId || t.count <= furnitureDef(f.type).capacity * LOW;
  };
  const canFill = (f: Furniture, i: number) => {
    const t = f.tiers[i];
    if (t.count >= furnitureDef(f.type).capacity) return false;
    return t.productId ? (storage[t.productId] ?? 0) > 0 : !!autoPick(f, storage, typeProducts);
  };

  const all = fixtures.flatMap((f) => f.tiers.map((t, i) => ({ f, t, i })));
  const stats = {
    slots: all.length,
    empty: all.filter(({ t }) => !t.productId || t.count === 0).length,
    low: all.filter(({ f, t }) => t.productId && t.count > 0 && t.count <= furnitureDef(f.type).capacity * LOW).length,
    fillable: all.filter(({ f, i }) => canFill(f, i)).length,
  };

  const q = query.trim().toLowerCase();
  const shown = fixtures.filter((f) => {
    if (filter === 'need' && !f.tiers.some((_, i) => slotNeeds(f, i))) return false;
    if (filter !== 'all' && filter !== 'need' && f.type !== filter) return false;
    if (!q) return true;
    return furnitureDef(f.type).name.toLowerCase().includes(q)
      || f.tiers.some((t) => t.productId && productById(t.productId).name.toLowerCase().includes(q));
  });
  const types = [...new Set(fixtures.map((f) => f.type))];
  // Số thứ tự trong cùng loại, để phân biệt "Kệ gỗ 1", "Kệ gỗ 2"
  const label = (f: Furniture) => {
    const same = fixtures.filter((it) => it.type === f.type);
    return same.length > 1 ? `${furnitureDef(f.type).name} ${same.indexOf(f) + 1}` : furnitureDef(f.type).name;
  };

  // GD104: đưa dữ liệu "kệ đang chạy thế nào" về tại chỗ ra quyết định bày hàng — chỉ ĐỌC
  // shelfHeat/shelfProfit đã có trong store (như AnalyticsPanel/ArrangePanel dùng), không thêm
  // action mới. Tối đa ~5 kệ bán được nhất + kệ kém nhất (dưới nửa mức trung bình → gợi ý đổi chỗ).
  const heatRows = (() => {
    const heatOf = (f: Furniture) => shelfHeat[f.uid] ?? 0;
    const sold = fixtures.filter((f) => heatOf(f) > 0).sort((a, b) => heatOf(b) - heatOf(a));
    if (!sold.length) return [];
    const k = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(Math.abs(v) / 1000)}k` : `${Math.round(Math.abs(v))}đ`);
    const rows = sold.slice(0, 5).map((f) => ({
      uid: f.uid,
      text: `🟡 ${label(f)}: đã bán ${heatOf(f)} món · lời ~${k(shelfProfit[f.uid]?.profit ?? 0)}`,
      cold: false,
    }));
    const total = fixtures.reduce((n, f) => n + heatOf(f), 0);
    const avg = total / Math.max(1, fixtures.length);
    const rest = fixtures.filter((f) => !sold.slice(0, 5).includes(f));
    const cold = rest.length && fixtures.length >= 2
      ? rest.reduce((min, f) => (heatOf(f) < heatOf(min) ? f : min), rest[0])
      : null;
    if (cold && heatOf(cold) < avg * 0.5) {
      rows.push({ uid: cold.uid, text: `⚠️ ${label(cold)}: chỉ ${heatOf(cold)} món — vắng khách, đổi chỗ?`, cold: true });
    }
    return rows;
  })();

  return (
    <div style={{ width: '100%', maxWidth: 900 }}>
      <h2 style={{ margin: '0 0 4px' }}>🗺️ Sơ đồ kệ</h2>
      <p style={st.sub}>Xem mọi kệ và tủ trong tiệm, ô nào đang bày gì, còn bao nhiêu. Bày hàng nhanh từ kho, ô trống tự chọn món kho đang có.</p>

      <div style={st.stats}>
        <Stat label="Ô hàng" value={stats.slots} />
        <Stat label="Ô trống" value={stats.empty} warn={stats.empty > 0} />
        <Stat label="Sắp hết" value={stats.low} warn={stats.low > 0} />
        <Stat label="Bày được từ kho" value={stats.fillable} />
        <span style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button style={{ ...st.btn, background: '#f1c40f', fontWeight: 700 }} disabled={!stats.fillable}
            onClick={() => fillFixture(fixtures[0]?.uid, furniture, storage, stockTier, autoPick, typeProducts)}
            title="Châm mọi ô, ô trống tự chọn món kho đang có">
            📥 Bày đầy cả tiệm
          </button>
          <button style={st.btn} onClick={() => openPanel({ type: 'storage' })}>🗃️ Kho</button>
          <button style={st.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
        </span>
      </div>

      {heatRows.length > 0 && (
        <div style={st.heatBox}>
          <b style={{ fontSize: 12 }}>📊 Kệ đang chạy thế nào</b>
          {heatRows.map((r) => (
            <div key={r.uid} title={r.text}
              style={{ fontSize: 12, lineHeight: 1.5, color: r.cold ? '#fdcb6e' : undefined, opacity: r.cold ? 1 : 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.text}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
        <Dropdown<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Lọc kệ"
          options={[
            { value: 'all', label: 'Tất cả kệ, tủ' },
            { value: 'need', label: '⚠️ Cần châm hàng' },
            ...types.map((t) => ({ value: t as Filter, label: furnitureDef(t).name })),
          ]}
        />
        <input style={st.search} placeholder="Tìm món hoặc tên kệ…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm món hoặc tên kệ" />
        <label style={st.toggle} title="Khi hàng mới về: ô kệ hết hàng mà kho cũng hết món đó thì tự gỡ, bày món khác đang có trong kho">
          <input type="checkbox" checked={autoSwap} onChange={(e) => useGame.setState({ autoSwap: e.target.checked })} />
          🔄 Tự thay món hết hàng
        </label>
        <button style={st.btn} onClick={() => {
          const done = replaceEmptySlots();
          notify(done.length ? `🔄 Đã thay: ${done.join(', ')}` : 'Không có ô nào cần thay (hoặc kho chưa có món phù hợp)');
        }}>🔄 Thay ngay</button>
      </div>

      {fixtures.length === 0 && <p style={st.sub}>Tiệm chưa có kệ nào. Vào Xây dựng để mua kệ.</p>}
      {fixtures.length > 0 && shown.length === 0 && <p style={st.sub}>Không có kệ nào khớp bộ lọc.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map((f) => {
          const def = furnitureDef(f.type);
          const products = allowed(f, typeProducts);
          return (
            <div key={f.uid} style={st.fixture}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <b>{label(f)}</b>
                <span style={{ opacity: 0.6, fontSize: 12 }}>{def.tiers} tầng × {def.slots} ô · mỗi ô {def.capacity} món</span>
                <button style={{ ...st.btn, marginLeft: 'auto' }} disabled={!f.tiers.some((_, i) => canFill(f, i))} onClick={() => fillFixture(f.uid, furniture, storage, stockTier, autoPick, typeProducts)}>
                  📥 Bày đầy kệ này
                </button>
              </div>
              {/* Tầng trên cùng ở trên, như nhìn vào kệ thật */}
              {Array.from({ length: def.tiers }, (_, r) => def.tiers - 1 - r).map((row) => (
                <div key={row} style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
                  <span style={st.rowLabel}>T{row + 1}</span>
                  {Array.from({ length: def.slots }, (_, c) => row * def.slots + c).map((i) => {
                    // Dự phòng dữ lệch (kit cũ chưa qua migrateTiers): ô thiếu coi như trống, không để sập cả UI
                    const t = f.tiers[i] ?? { productId: null, count: 0 };
                    const p = t.productId ? productById(t.productId) : null;
                    const life = p ? nearestLife(fitLots(t.lots, t.count, p.id)) : null;
                    const sale = tierMarkdown(t.productId, t.lots, t.count);
                    const fill = t.count / def.capacity;
                    const kho = p ? storage[p.id] ?? 0 : 0;
                    return (
                      <div key={i} style={{ ...st.slot, borderColor: !p || t.count === 0 ? '#e17055' : fill <= LOW ? '#fdcb6e' : '#ffffff22' }}>
                        <div style={{ height: 4, borderRadius: 2, background: p ? `#${p.color.toString(16).padStart(6, '0')}` : '#ffffff22' }} />
                        <Dropdown
                          value={t.productId ?? ''}
                          onChange={(v) => stockTier(f.uid, i, v || null)}
                          ariaLabel={`${label(f)}, tầng ${row + 1}, ô ${(i % def.slots) + 1}`}
                          style={{ width: '100%' }}
                          options={[
                            { value: '', label: '(Chưa gán món)' },
                            ...products.map((it) => ({ value: it.id, label: it.name, hint: `kho ${storage[it.id] ?? 0}` })),
                          ]}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <div style={st.bar}><div style={{ ...st.barFill, width: `${fill * 100}%`, background: fill <= LOW ? '#fdcb6e' : '#00b894' }} /></div>
                          <b>{t.count}/{def.capacity}</b>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.8, minHeight: 15 }}>
                          {p ? <>Kho: {describeUnits(p.id, kho)}</> : 'Ô trống'}
                          {life !== null && <span style={{ color: life <= 1 ? '#ff7675' : life <= 3 ? '#fab1a0' : undefined }}> · ⏳{life}d</span>}
                          {sale > 0 && <b style={{ color: '#ff7675' }}> −{sale * 100}%</b>}
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button style={st.mini} disabled={!canFill(f, i)}
                            onClick={() => stockTier(f.uid, i, t.productId ?? autoPick(f, storage, typeProducts))}
                            title={t.productId ? 'Bày đầy ô này từ kho' : 'Tự chọn món kho đang có và bày'}>
                            {t.productId ? '＋ Bày' : '✨ Tự chọn'}
                          </button>
                          <button style={st.mini} disabled={!t.count} onClick={() => unstockTier(f.uid, i)} title="Dỡ hàng ô này về kho">↩ Dỡ</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Footer onClose={closePanel} />
    </div>
  );
}

const Stat = ({ label, value, warn }: { label: string; value: number; warn?: boolean }) => (
  <span style={st.stat}>
    <b style={{ fontSize: 18, color: warn ? '#fdcb6e' : undefined }}>{value}</b>
    <span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
  </span>
);

const st: Record<string, React.CSSProperties> = {
  sub: { margin: '0 0 10px', opacity: 0.75, fontSize: 13 },
  heatBox: { margin: '10px 0 0', padding: '6px 10px', background: '#33334a', borderRadius: 8, display: 'grid', gap: 2 },
  stats: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 12px', background: '#3a3a4d', borderRadius: 8, minWidth: 64 },
  btn: { border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 13 },
  toggle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' },
  search: { flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid #ffffff33', background: '#1f1f2b', color: '#fff' },
  fixture: { background: '#33334a', borderRadius: 10, padding: 10 },
  rowLabel: { width: 26, alignSelf: 'center', fontSize: 12, opacity: 0.6, textAlign: 'center' },
  slot: {
    flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, padding: 6,
    background: '#262636', borderRadius: 8, border: '1px solid',
  },
  bar: { flex: 1, height: 6, borderRadius: 3, background: '#ffffff22', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  mini: { flex: 1, border: 'none', borderRadius: 5, padding: '3px 4px', cursor: 'pointer', fontSize: 11 },
};
