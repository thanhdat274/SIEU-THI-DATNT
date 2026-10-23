import { fitLots, nearestLife, tierMarkdown } from '../data/freshness';
import { useEffect, useState } from 'react';
import { ArrangePanel } from './ArrangePanel';
import { Dropdown } from './Dropdown';
import { OrderPanel } from './OrderPanel';
import { PlanogramPanel } from './PlanogramPanel';
import { QuestPanel } from './QuestPanel';
import { ContractsPanel } from './ContractsPanel';
import { CostumePanel } from './CostumePanel';
import { BusinessPanel } from './BusinessPanel';
import { storageCapacity, storageUsed, useGame } from '../core/store';
import { warehouseTier, WAREHOUSE_TIERS } from '../data/warehouse';
import { dailyWage, maxStaff, ROLES, SHIFTS, type Shift, type Staff } from '../data/staff';
import { FLOOR_COLORS, PAINT_PRICE, ROOF_COLORS, SHOP_TIERS, WALL_COLORS, type ShopStyle } from '../data/shopTiers';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { customersPerDay, MAX_LEVEL, unlocksAt, xpToNext } from '../data/levels';
import { caseSize, CATEGORIES, describeUnits, formatMoney, productById, unlockedProducts, type Product } from '../data/products';
import { REASON_LABEL, summarizeReviews, type Review } from '../data/reviews';
import { formatClock, type DayRecord, type ItemLine } from '../core/store';
import { COMBO_PULL, COMBO_UNLOCK, MAX_ACTIVE_COMBOS, unlockedCombos } from '../data/combos';
import { suggestPrice } from '../data/pricing';
import { nextPerk, regularById, REGULARS, type PerkEffect } from '../data/regulars';
import { CREDIT_FRIENDSHIP, CREDIT_UNLOCK, creditLimit, DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../data/credit';
import { walkoutAdvice } from '../data/advice';
import { SKILLS, skillPoints, TITLES } from '../data/titles';
import { repairCost, RISK_RULES, wears } from '../data/risks';

export function Panels() {
  const panel = useGame((s) => s.panel);
  const closePanel = useGame((s) => s.closePanel);
  // Esc để đóng bảng đang mở
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, closePanel]);
  if (!panel) return null;
  // Màn sắp xếp chiếm cả màn hình, có khung riêng
  if (panel.type === 'arrange') return <ArrangePanel />;
  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && closePanel()}>
      <div style={styles.panel}>
        <button style={styles.close} title="Đóng (Esc)" aria-label="Đóng" onClick={closePanel}>✕</button>
        {panel.type === 'order' && <OrderPanel />}
        {panel.type === 'shelf' && <ShelfPanel uid={panel.uid} />}
        {panel.type === 'build' && <BuildPanel />}
        {panel.type === 'prices' && <PricePanel />}
        {panel.type === 'staff' && <StaffPanel />}
        {panel.type === 'summary' && <SummaryPanel day={panel.day} />}
        {panel.type === 'levels' && <LevelsPanel />}
        {panel.type === 'reviews' && <ReviewsPanel />}
        {panel.type === 'storage' && <StoragePanel />}
        {panel.type === 'planogram' && <PlanogramPanel />}
        {panel.type === 'quests' && <QuestPanel />}
        {panel.type === 'regulars' && <RegularsPanel />}
        {panel.type === 'skills' && <SkillsPanel />}
        {panel.type === 'combos' && <ComboPanel />}
        {panel.type === 'contracts' && <ContractsPanel />}
        {panel.type === 'costume' && <CostumePanel />}
        {panel.type === 'business' && <BusinessPanel />}
      </div>
    </div>
  );
}

const CATEGORY_ORDER = Object.keys(CATEGORIES);
const byCategory = (a: Product, b: Product) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);

function ShelfPanel({ uid }: { uid: number }) {
  const { level, storage, storageLots, furniture, stockTier, openPanel, closePanel } = useGame();
  const f = furniture.find((it) => it.uid === uid);
  if (!f) return null;
  const def = furnitureDef(f.type);
  const products = unlockedProducts(level).filter((p) => def.categories.includes(p.category));
  return (
    <>
      <h2 style={styles.title}>🗄️ {def.name}</h2>
      <p style={styles.sub}>
        Mỗi tầng có {def.slots} ô, mỗi ô bày một món (tối đa {def.capacity}), nên một tầng bày được nhiều loại. Bày được: {def.categories.map((c) => CATEGORIES[c]).join(', ')}. Hàng lấy từ kho, lô gần hết hạn bày trước và tự giảm giá khi cận hạn.
        {def.priceBonus ? ` Khách trả thêm ${def.priceBonus * 100}% khi mua ở đây.` : ''}
      </p>
      <WearRow uid={uid} />
      {/* Tầng trên cùng ở trên; trong mỗi tầng ô 1 trước */}
      {f.tiers.map((tier, i) => ({ tier, i })).sort((a, b) => Math.floor(b.i / def.slots) - Math.floor(a.i / def.slots) || a.i - b.i).map(({ tier, i }) => (
        <div key={i} style={{ ...styles.row, ...(i % def.slots === 0 ? { marginTop: 8 } : {}) }}>
          <b style={{ width: 92, fontSize: 13 }}>
            {i % def.slots === 0 ? `Tầng ${Math.floor(i / def.slots) + 1}` : ''}
            <span style={{ opacity: 0.6, fontWeight: 400 }}> · ô {(i % def.slots) + 1}</span>
          </b>
          <Dropdown
            value={tier.productId ?? ''}
            onChange={(v) => stockTier(uid, i, v || null)}
            style={styles.select}
            ariaLabel={`Hàng bày ở tầng ${Math.floor(i / def.slots) + 1}, ô ${(i % def.slots) + 1}`}
            options={[
              { value: '', label: '(Trống)' },
              ...products.map((p) => {
                const life = nearestLife(fitLots(storageLots[p.id], storage[p.id] ?? 0, p.id));
                return { value: p.id, label: p.name, hint: `kho: ${storage[p.id] ?? 0}${life ? ` · ⏳${life}d` : ''}` };
              }),
            ]}
          />
          <span style={{ width: 50 }}>{tier.count}/{def.capacity}</span>
          <LifeBadge
            life={tier.productId ? nearestLife(fitLots(tier.lots, tier.count, tier.productId)) : null}
            sale={tierMarkdown(tier.productId, tier.lots, tier.count)}
          />
          <button
            style={styles.btn}
            disabled={!tier.productId || tier.count >= def.capacity || !(storage[tier.productId] > 0)}
            onClick={() => stockTier(uid, i, tier.productId)}
          >
            Bày đầy
          </button>
        </div>
      ))}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => f.tiers.forEach((t, i) => t.productId && stockTier(uid, i, t.productId))}>
          Bày đầy cả kệ
        </button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>🗺️ Sơ đồ kệ</button>
      </Footer>
    </>
  );
}

/** Độ mòn và nút sửa/bảo trì của một kệ (mở từ cấp hao mòn). */
function WearRow({ uid }: { uid: number }) {
  const { level, furniture, repairFurniture } = useGame();
  const f = furniture.find((it) => it.uid === uid);
  if (!f || level < RISK_RULES.wear.unlock || !wears(f.type)) return null;
  const wear = f.wear ?? 0;
  const canService = f.broken || wear >= RISK_RULES.wear.serviceFrom;
  return (
    <div style={{ ...styles.card, gap: 10, marginBottom: 8, outline: f.broken ? '2px solid #e74c3c' : undefined }}>
      <span>{f.broken ? '❌ Đang hỏng: khách không lấy được hàng' : `🔧 Độ mòn ${wear}%`}</span>
      <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
        <div style={{ width: `${wear}%`, height: '100%', borderRadius: 3, background: wear >= RISK_RULES.wear.breakFrom ? '#e74c3c' : '#f39c12' }} />
      </div>
      <button style={styles.btn} disabled={!canService} title={canService ? '' : `Mòn từ ${RISK_RULES.wear.serviceFrom}% mới cần bảo trì`} onClick={() => repairFurniture(uid)}>
        {f.broken ? 'Sửa' : 'Bảo trì'} {formatMoney(repairCost(f.type))}
      </button>
    </div>
  );
}

/** Danh hiệu đã đạt và cây kỹ năng chủ tiệm. */
function SkillsPanel() {
  const { level, skills, titles, learnSkill, closePanel } = useGame();
  const left = skillPoints(level) - skills.length;
  return (
    <>
      <h2 style={styles.title}>🏅 Danh hiệu & kỹ năng</h2>
      <p style={styles.sub}>Cứ 5 cấp được 1 điểm kỹ năng. Còn {left} điểm.</p>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {SKILLS.map((k) => {
          const learned = skills.includes(k.id);
          const can = !learned && left > 0 && level >= k.unlock;
          return (
            <div key={k.id} style={{ ...styles.card, gap: 10, opacity: learned || level >= k.unlock ? 1 : 0.5 }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              <div style={{ flex: 1 }}>
                <b>{k.name}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{k.description}</div>
              </div>
              {learned ? <span style={{ color: '#2ecc71' }}>✔ Đã học</span> : level < k.unlock ? <span style={{ opacity: 0.7 }}>🔒 Cấp {k.unlock}</span> : (
                <button style={styles.btn} disabled={!can} onClick={() => learnSkill(k.id)}>Học</button>
              )}
            </div>
          );
        })}
      </div>
      <h3 style={{ margin: '14px 0 8px', fontSize: 15 }}>Danh hiệu ({titles.length}/{TITLES.length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6, maxWidth: 560 }}>
        {TITLES.map((t) => {
          const got = titles.includes(t.id);
          return (
            <div key={t.id} style={{ ...styles.card, display: 'block', opacity: got ? 1 : 0.45 }} title={t.description}>
              <b>{got ? t.icon : '🔒'} {t.name}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{t.description}</div>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}

/** Kho hàng: thùng nguyên + hàng lẻ đã khui, hạn gần nhất, chỗ trống. */
function StoragePanel() {
  const { storage, storageLots, deliveries, warehouseTier: tierIndex, level, money, upgradeWarehouse, openPanel, closePanel } = useGame();
  const tier = warehouseTier(tierIndex);
  const next = WAREHOUSE_TIERS[tierIndex + 1];
  const capacity = storageCapacity(tierIndex);
  const used = storageUsed(storage);
  const coming = storageUsed({}, ...deliveries.map((d) => d.items));
  const items = Object.entries(storage)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ id, q, life: nearestLife(fitLots(storageLots[id], q, id)) }))
    .sort((a, b) => (a.life ?? Infinity) - (b.life ?? Infinity));
  return (
    <>
      <h2 style={styles.title}>🏭 {tier.name}</h2>
      <p style={styles.sub}>
        Đang chứa <b>{used}/{capacity} thùng</b>{coming > 0 && ` · ${coming} thùng sẽ về sáng mai`}. Thùng đã khui vẫn chiếm một chỗ.
        {' '}Bày kệ dùng hàng lẻ trước rồi mới khui thùng mới. Tủ lạnh kho giữ lạnh {tier.cold} món hàng mát, đông lạnh, tươi; phần dư để ngoài hỏng nhanh.
      </p>
      <div style={{ height: 8, borderRadius: 4, background: '#ffffff22', margin: '6px 0 10px' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (used / capacity) * 100)}%`, background: used >= capacity ? '#e17055' : '#00b894' }} />
      </div>
      {items.length === 0 ? <p style={styles.sub}>Kho trống. Vào Nhập hàng để đặt thêm.</p> : (
        <table style={styles.table}>
          <tbody>
            {items.map(({ id, q, life }) => (
              <tr key={id}>
                <td style={styles.left}>{productById(id).name}</td>
                <td>{describeUnits(id, q)}</td>
                <td style={{ opacity: 0.7 }}>{q} món · thùng {caseSize(id)}</td>
                <td><LifeBadge life={life} sale={0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {next && (
        <div style={{ ...styles.card, marginTop: 12 }}>
          <span style={{ flex: 1, fontSize: 13 }}>
            <b>Nâng lên {next.name}</b>: chứa {next.cases} thùng, giữ lạnh {next.cold} món, {next.racks} kệ, {next.fridges} tủ lạnh.
          </span>
          <button style={styles.btn} disabled={level < next.unlock || money < next.price} onClick={upgradeWarehouse}>
            {level < next.unlock ? `🔒 Cấp ${next.unlock}` : formatMoney(next.price)}
          </button>
        </div>
      )}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'planogram' })}>🗺️ Sơ đồ kệ</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
      </Footer>
    </>
  );
}

/** Hạn gần nhất của hàng đang bày: đỏ khi còn 1 ngày, cam khi còn 2–3 ngày. */
function LifeBadge({ life, sale }: { life: number | null; sale: number }) {
  if (life === null) return <span style={{ width: 64 }} />;
  const color = life <= 1 ? '#d63031' : life <= 3 ? '#e17055' : undefined;
  return (
    <span style={{ minWidth: 64, fontSize: 12, color, opacity: color ? 1 : 0.7, whiteSpace: 'nowrap' }} title={sale ? `Lô cận hạn, tự bán giảm ${sale * 100}%` : 'Hạn dùng còn lại của lô cũ nhất'}>
      ⏳ {life} ngày{sale > 0 && <b> −{sale * 100}%</b>}
    </span>
  );
}

function BuildPanel() {
  const [tab, setTab] = useState<'furniture' | 'paint' | 'expand'>('furniture');
  const setBuildMode = useGame((s) => s.setBuildMode);
  const tabs = [
    { id: 'furniture', label: '🪑 Nội thất' },
    { id: 'paint', label: '🎨 Sơn sửa' },
    { id: 'expand', label: '🏗️ Mở rộng tiệm' },
  ] as const;
  return (
    <>
      <h2 style={styles.title}>🛠️ Xây dựng</h2>
      <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{ ...styles.btn, marginLeft: 0, background: tab === t.id ? '#f1c40f' : '#fff' }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'furniture' && <FurnitureTab />}
      {tab === 'paint' && <PaintTab />}
      {tab === 'expand' && <ExpandTab />}
      <Footer onClose={() => useGame.setState({ panel: null })} closeLabel="Di chuyển đồ có sẵn">
        <button style={styles.btn} onClick={() => setBuildMode(false)}>Thoát chế độ xây</button>
      </Footer>
    </>
  );
}

function FurnitureTab() {
  const { level, money, furniture, setPlacing, demolishAll } = useGame();
  return (
    <>
      <p style={styles.sub}>
        Chọn món để đặt vào tiệm. Bấm "Di chuyển đồ có sẵn" rồi bấm vào đồ để dời chỗ hoặc bán (nhận lại 50%).
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {FURNITURE.map((f) => {
          const locked = f.unlock > level;
          return (
            <div key={f.type} style={{ ...styles.card, opacity: locked ? 0.5 : 1 }}>
              <div style={{ flex: 1 }}>
                <b>{f.name}</b> · {formatMoney(f.price)}
                <div style={{ fontSize: 12, opacity: 0.75 }}>{f.desc}</div>
              </div>
              {locked ? (
                <span style={{ fontSize: 12 }}>🔒 Cấp {f.unlock}</span>
              ) : (
                <button style={styles.btn} disabled={money < f.price} onClick={() => setPlacing({ type: f.type, rot: 0 })}>
                  Chọn
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          style={{ ...styles.btn, marginLeft: 0, background: '#e74c3c', color: '#fff' }}
          disabled={!furniture.length}
          onClick={() => confirm('Đập hết nội thất trong tiệm? Nhận lại 50% tiền, hàng trên kệ về kho.') && demolishAll()}
        >
          🔨 Đập hết, xây lại từ đầu
        </button>
      </div>
    </>
  );
}

/** Sơn sửa: chọn màu thì chỉ xem thử (cả trên tiệm 3D), bấm "Xác nhận sơn" mới trả tiền. */
export function PaintTab() {
  const { style, money, paint } = useGame();
  const [pick, setPick] = useState<Partial<ShopStyle>>({});
  const rows = [
    { part: 'wall', label: 'Màu tường', swatches: WALL_COLORS },
    { part: 'floor', label: 'Sàn nhà', swatches: FLOOR_COLORS },
    { part: 'roof', label: 'Màu mái', swatches: ROOF_COLORS },
  ] as const;
  const look = { ...style, ...pick };
  const changed = rows.filter((r) => pick[r.part] !== undefined && pick[r.part] !== style[r.part]).map((r) => r.part);
  const cost = changed.length * PAINT_PRICE;

  // Màu xem thử hiện luôn lên tiệm 3D; rời bảng thì trả về màu cũ
  useEffect(() => {
    useGame.setState({ stylePreview: Object.keys(pick).length ? pick : null });
  }, [pick]);
  useEffect(() => () => useGame.setState({ stylePreview: null }), []);

  const choose = (part: keyof ShopStyle, color: number) =>
    setPick((p) => {
      const next = { ...p };
      if (color === style[part]) delete next[part];
      else next[part] = color;
      return next;
    });
  const confirmPaint = () => {
    for (const part of changed) paint(part, look[part]);
    setPick({});
  };

  return (
    <>
      <p style={styles.sub}>Chọn màu để xem thử, ưng thì bấm "Xác nhận sơn". Mỗi phần sơn lại: {formatMoney(PAINT_PRICE)}.</p>
      <ShopPreview style={look} />
      {rows.map((row) => (
        <div key={row.part} style={{ margin: '10px 0' }}>
          <b>{row.label}</b>
          {pick[row.part] !== undefined && <span style={{ fontSize: 12, color: '#f1c40f' }}> · đang xem thử</span>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {row.swatches.map((sw) => {
              const current = style[row.part] === sw.color;
              const chosen = look[row.part] === sw.color;
              return (
                <button
                  key={sw.color}
                  title={current ? `${sw.name} (đang dùng)` : sw.name}
                  aria-pressed={chosen}
                  onClick={() => choose(row.part, sw.color)}
                  style={{
                    ...styles.btn, marginLeft: 0, display: 'flex', alignItems: 'center', gap: 6,
                    outline: chosen ? '3px solid #f1c40f' : 'none',
                  }}
                >
                  <Swatch color={sw.color} /> {sw.name}{current ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
        <span style={{ flex: 1, fontSize: 13, opacity: 0.8 }}>
          {changed.length ? `Sơn lại ${changed.length} phần: ${formatMoney(cost)}` : 'Chưa đổi màu nào'}
          {cost > money && <b style={{ color: '#ff8a7a' }}> · không đủ tiền</b>}
        </span>
        <button style={{ ...styles.btn, marginLeft: 0 }} disabled={!Object.keys(pick).length} onClick={() => setPick({})}>Về màu cũ</button>
        <button
          style={{ ...styles.btn, marginLeft: 0, background: '#f1c40f', color: '#222', fontWeight: 700 }}
          disabled={!changed.length || cost > money}
          onClick={confirmPaint}
        >
          ✓ Xác nhận sơn
        </button>
      </div>
    </>
  );
}

/** Hình tiệm nhìn chính diện để xem thử màu mái, tường, sàn. */
function ShopPreview({ style }: { style: ShopStyle }) {
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  return (
    <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '4px auto 8px', borderRadius: 10, background: '#8ec5ea' }} aria-label="Xem thử màu tiệm">
      <rect x="0" y="100" width="200" height="20" fill="#7cb05a" />
      <polygon points="30,52 100,18 170,52" fill={hex(style.roof)} stroke="rgba(0,0,0,0.25)" />
      <rect x="40" y="52" width="120" height="50" fill={hex(style.wall)} stroke="rgba(0,0,0,0.2)" />
      <rect x="86" y="68" width="28" height="34" fill={hex(style.floor)} stroke="#6d4c33" strokeWidth="2" />
      <rect x="52" y="64" width="22" height="18" fill="#bfe3f5" stroke="#fff" strokeWidth="2" />
      <rect x="126" y="64" width="22" height="18" fill="#bfe3f5" stroke="#fff" strokeWidth="2" />
      <rect x="66" y="40" width="68" height="12" rx="2" fill="#1d4f91" />
      <text x="100" y="49" fontSize="8" fontWeight="700" textAnchor="middle" fill="#ffd23f">TẠP HÓA</text>
    </svg>
  );
}

export function ExpandTab() {
  const { shopTier, pendingUpgrade, level, money, buyUpgrade } = useGame();
  return (
    <>
      <p style={styles.sub}>
        Mở rộng thì mặt tiền giữ nguyên, tiệm nới ra phía sau và hai bên. Đồ đạc giữ nguyên chỗ. Thợ làm qua đêm.
      </p>
      <div style={{ display: 'grid', gap: 8 }}>
        {SHOP_TIERS.map((t, i) => {
          const done = i <= shopTier;
          const next = i === shopTier + 1;
          return (
            <div key={t.name} style={{ ...styles.card, opacity: done || next ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <b>{t.name}</b> · {t.width}×{t.depth}m
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {i === 0 ? 'Khởi đầu' : `${formatMoney(t.price)} · cần cấp ${t.unlock}`}
                </div>
              </div>
              {done && <span>{i === shopTier ? '📍 Hiện tại' : '✅'}</span>}
              {next && pendingUpgrade && <span>🏗️ Đang thi công</span>}
              {next && !pendingUpgrade && (
                level < t.unlock
                  ? <span style={{ fontSize: 12 }}>🔒 Cấp {t.unlock}</span>
                  : <button style={styles.btn} disabled={money < t.price} onClick={buyUpgrade}>Thuê thợ</button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StaffPanel() {
  const [tab, setTab] = useState<'team' | 'hire'>('team');
  const { staff, candidates, level, autoOpen, hire, fire, setShift, closePanel } = useGame();
  const max = maxStaff(level);
  const total = staff.reduce((sum, st) => sum + dailyWage(st), 0);
  return (
    <>
      <h2 style={styles.title}>👥 Nhân viên</h2>
      <p style={styles.sub}>
        Đang có {staff.length}/{max} người (lên cấp để thuê thêm). Tổng lương mỗi ngày: <b>{formatMoney(total)}</b>, trả lúc đi ngủ.
      </p>
      <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
        {([['team', '📋 Đang làm'], ['hire', '🔍 Tuyển dụng']] as const).map(([id, label]) => (
          <button
            key={id}
            style={{ ...styles.btn, marginLeft: 0, background: tab === id ? '#f1c40f' : '#fff' }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {!staff.length && <p style={styles.sub}>Chưa có ai. Qua tab Tuyển dụng để thuê.</p>}
          {staff.map((st) => (
            <div key={st.id} style={styles.card}>
              <StaffInfo st={st} />
              <Dropdown
                value={st.shift}
                onChange={(v) => setShift(st.id, v)}
                ariaLabel={`Ca làm của ${st.name}`}
                options={(Object.keys(SHIFTS) as Shift[]).map((k) => ({ value: k, label: SHIFTS[k].name }))}
              />
              <span style={{ width: 90, textAlign: 'right' }}>{formatMoney(dailyWage(st))}/ngày</span>
              <button style={styles.btn} onClick={() => confirm(`Cho ${st.name} nghỉ việc?`) && fire(st.id)}>Cho nghỉ</button>
            </div>
          ))}
          <label style={{ fontSize: 13, marginTop: 6 }}>
            <input type="checkbox" checked={autoOpen} onChange={(e) => useGame.setState({ autoOpen: e.target.checked })} />{' '}
            Thu ngân tự mở cửa khi vào ca, tự đóng cửa khi hết ca
          </label>
        </div>
      )}

      {tab === 'hire' && (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={styles.sub}>Mỗi sáng có ứng viên mới. Lương ghi theo một ca; làm cả ngày trả 1.6 lần.</p>
          <p style={styles.sub}>
            {Object.values(ROLES).map((r) => (
              <span key={r.name} style={{ marginRight: 10, opacity: r.unlock <= level ? 1 : 0.45 }} title={r.desc}>
                {r.icon} {r.name}{r.unlock > level ? ` (cấp ${r.unlock})` : ''}
              </span>
            ))}
          </p>
          {!candidates.length && <p style={styles.sub}>Hết ứng viên hôm nay, mai quay lại nhé.</p>}
          {candidates.map((c) => (
            <div key={c.id} style={styles.card}>
              <StaffInfo st={c} />
              <span style={{ width: 90, textAlign: 'right' }}>{formatMoney(c.wage)}/ca</span>
              <button style={styles.btn} disabled={staff.length >= max} onClick={() => hire(c.id)}>Thuê</button>
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

function StaffInfo({ st }: { st: Staff }) {
  const role = ROLES[st.role];
  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <b>{role.icon} {st.name}</b> · {role.name}
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        {'★'.repeat(st.skill)}{'☆'.repeat(5 - st.skill)} · {role.desc}
      </div>
    </div>
  );
}

function PricePanel() {
  const { level, prices, setPrice, closePanel, sales, demand } = useGame();
  return (
    <>
      <h2 style={styles.title}>💲 Bảng giá</h2>
      <p style={styles.sub}>
        Giá cao hơn giá gợi ý thì lời nhiều hơn nhưng khách ít mua hơn (💸); đồ uống, bánh kẹo bị chê nhanh nhất, gạo, trứng ít bị ảnh hưởng.
        Giá rẻ hơn gợi ý thì thêm người ghé tiệm. Cột "Nên" gợi ý theo số bán mấy ngày gần đây.
      </p>
      <table style={styles.table}>
        <thead>
          <tr><th style={styles.left}>Mặt hàng</th><th>Giá nhập</th><th>Gợi ý</th><th>Giá bán</th><th>Lời / món</th><th>Bán/ngày</th><th>Nên</th></tr>
        </thead>
        <tbody>
          {unlockedProducts(level).map((p) => {
            const price = prices[p.id] ?? p.sell;
            const step = 500;
            const change = (delta: number) => setPrice(p.id, Math.max(step, price + delta));
            const ratio = price / p.sell;
            const tip = suggestPrice(p.id, price, sales[p.id], demand[p.id]);
            return (
              <tr key={p.id}>
                <td style={styles.left}><Swatch color={p.color} /> {p.name}</td>
                <td>{formatMoney(p.buy)}</td>
                <td>{formatMoney(p.sell)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={styles.btn} onClick={() => change(-step)}>−</button>
                  <b style={{ display: 'inline-block', width: 80, color: ratio > 1.3 ? '#e74c3c' : ratio > 1 ? '#f1c40f' : '#fff' }}>
                    {formatMoney(price)}
                  </b>
                  <button style={styles.btn} onClick={() => change(step)}>+</button>
                </td>
                <td style={{ color: price > p.buy ? '#2ecc71' : '#e74c3c' }}>{formatMoney(price - p.buy)}</td>
                <td title={`Khách hỏi mua ~${(demand[p.id] ?? 0).toFixed(1)} lượt/ngày`}>{(sales[p.id] ?? 0).toFixed(1)}</td>
                <td>{tip.action === 'hold' ? <span style={{ opacity: 0.5 }} title={tip.reason}>giữ</span> : (
                  <button style={styles.btn} title={tip.reason} onClick={() => setPrice(p.id, tip.price)}>
                    {tip.action === 'raise' ? '↑' : '↓'} {formatMoney(tip.price)}
                  </button>
                )}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => useGame.setState({ prices: {} })}>Về giá gợi ý</button>
        <button style={styles.btn} onClick={() => useGame.getState().openPanel({ type: 'combos' })}>🎁 Combo</button>
      </Footer>
    </>
  );
}

/** Biểu tượng nhận diện nhanh cho từng loại perk của khách quen. */
const PERK_ICONS: Record<PerkEffect, string> = {
  bonus_tip: '💲',        // boa thêm tiền
  extra_item: '🛒',       // mua thêm món
  frequent_visit: '🔁',   // ghé thường hơn
  refer_friend: '👥',     // rủ bạn bè
  bulk_buy: '📦',         // mua số lượng lớn theo lô
  festival: '🎉',         // ngày hội
};

/** Khách quen: điểm thân thiết, món ưa thích đã biết, perk đã mở. */
function RegularsPanel() {
  const { level, regulars, closePanel } = useGame();
  const met = REGULARS.filter((r) => r.unlock <= level);
  return (
    <>
      <h2 style={styles.title}>💛 Khách quen</h2>
      <DebtBook />
      <p style={styles.sub}>
        Khách quen ghé vào giờ quen. Bán đúng món họ thích thì thân hơn (+2, món khác +1, mỗi ngày một lần);
        để họ về tay không thì mất 1 điểm. Thân đủ mốc thì họ ghé thường hơn, mua thêm món và boa tiền.
      </p>
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {met.map((r) => {
          const prog = regulars[r.id];
          const next = nextPerk(r, prog);
          const pts = prog?.friendship ?? 0;
          const from = r.perks.filter((p) => prog?.perks.includes(p.title)).at(-1)?.threshold ?? 0;
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ opacity: 0.75, fontSize: 12 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)} · {prog?.visits ?? 0} lần ghé</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{r.role}. {r.bio}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Thích: {r.favorites.map((id) => (prog?.discovered.includes(id) ? productById(id).name : '???')).join(', ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12 }}>
                <span>💛 {pts}</span>
                {next && (
                  <>
                    <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                      <div style={{ width: `${Math.min(100, ((pts - from) / (next.threshold - from)) * 100)}%`, height: '100%', borderRadius: 3, background: '#f1c40f' }} />
                    </div>
                    <span style={{ opacity: 0.75 }}>{PERK_ICONS[next.effect]} {next.threshold}: {next.description}</span>
                  </>
                )}
              </div>
              {!!prog?.perks.length && (
                <div style={{ fontSize: 12, color: '#2ecc71', marginTop: 2 }}>
                  {r.perks.filter((p) => prog.perks.includes(p.title)).map((p) => PERK_ICONS[p.effect] + ' ' + p.description).join(' · ')}
                </div>
              )}
            </div>
          );
        })}
        {REGULARS.length > met.length && <p style={styles.sub}>Lên cấp để gặp thêm {REGULARS.length - met.length} khách quen nữa.</p>}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}

function SummaryPanel({ day }: { day: number }) {
  const panel = useGame((s) => s.panel);
  const { level, xp, history, closePanel, storage, priceOf } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  if (panel?.type !== 'summary') return null;
  const st = panel.stats;
  const profit = st.revenue - st.spent - st.wages;
  const lines = Object.entries(st.byItem ?? {}).map(([id, l]) => ({ id, ...l, gross: l.revenue - l.cost }));
  const goodsRevenue = lines.reduce((n, l) => n + l.revenue, 0);
  const goodsCost = lines.reduce((n, l) => n + l.cost, 0);
  const best = [...lines].sort((a, b) => b.qty - a.qty)[0];
  const richest = [...lines].sort((a, b) => b.gross - a.gross)[0];
  const missed = st.missed ?? {};
  const missTotal = (missed.stock ?? 0) + (missed.price ?? 0) + (missed.wait ?? 0);
  const advice = walkoutAdvice(st.missLog ?? {}, storage, priceOf);
  const tabs = [['overview', 'Tổng quan'], ['items', `Theo món (${lines.length})`]] as const;
  return (
    <>
      <h2 style={styles.title}>🌙 Tổng kết ngày {day}</h2>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {tabs.map(([id, label]) => (
          <button key={id} style={{ ...styles.btn, marginLeft: 0, background: tab === id ? '#f1c40f' : '#fff' }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'overview' ? (
        <>
          <table style={{ ...styles.table, fontSize: 15 }}>
            <tbody>
              <tr><td style={styles.left}>Doanh thu</td><td>{formatMoney(st.revenue)}</td></tr>
              {!!st.comboDiscount && <tr><td style={styles.left}>  trong đó đã giảm cho {st.combos} combo</td><td style={{ opacity: 0.75 }}>-{formatMoney(st.comboDiscount)}</td></tr>}
              <tr><td style={styles.left}>Lãi gộp trên hàng bán (giá bán − giá nhập)</td><td style={{ color: '#2ecc71' }}>{formatMoney(goodsRevenue - goodsCost - (st.comboDiscount ?? 0))}</td></tr>
              <tr><td style={styles.left}>Chi tiêu (nhập hàng, nội thất)</td><td>-{formatMoney(st.spent)}</td></tr>
              <tr><td style={styles.left}>Lương nhân viên</td><td>-{formatMoney(st.wages)}</td></tr>
              <tr>
                <td style={styles.left}><b>Tiền vào − tiền ra</b></td>
                <td style={{ color: profit >= 0 ? '#2ecc71' : '#e74c3c' }}><b>{formatMoney(profit)}</b></td>
              </tr>
              {!!st.credited && <tr><td style={styles.left}>  trong đó khách quen ghi sổ (chưa thu)</td><td style={{ color: '#e17055' }}>{formatMoney(st.credited)}</td></tr>}
              {!!st.repaid && <tr><td style={styles.left}>Thu nợ cũ</td><td style={{ color: '#2ecc71' }}>+{formatMoney(st.repaid)}</td></tr>}
              <tr><td style={styles.left}>Món đã bán</td><td>{st.itemsSold}</td></tr>
              {!!st.spoiledItems && (
                <tr><td style={styles.left}>Hàng hết hạn bỏ đi</td><td style={{ color: '#e17055' }}>{st.spoiledItems} món (vốn {formatMoney(st.spoiledCost ?? 0)})</td></tr>
              )}
              <tr><td style={styles.left}>Khách ghé</td><td>{st.customers} ({st.unhappy} không hài lòng)</td></tr>
              <tr><td style={styles.left}>Kinh nghiệm</td><td>+{st.xp} XP · Cấp {level} ({xp}/{xpToNext(level)})</td></tr>
            </tbody>
          </table>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10, maxWidth: 560 }}>
            {best && <Stat icon="🔥" label="Bán chạy nhất" value={`${productById(best.id).name} · ${best.qty} món`} />}
            {richest && <Stat icon="💰" label="Lãi nhiều nhất" value={`${productById(richest.id).name} · ${formatMoney(richest.gross)}`} />}
            {missTotal > 0 && (
              <Stat icon="😞" label={`Lỡ ${missTotal} lượt bán`}
                value={[missed.stock && `${missed.stock} hết hàng`, missed.price && `${missed.price} chê đắt`, missed.wait && `${missed.wait} chờ lâu bỏ về`].filter(Boolean).join(' · ')} />
            )}
          </div>
          {advice.length > 0 && (
            <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
              <b style={{ fontSize: 13 }}>💡 Vì sao khách không mua được · nên làm gì</b>
              {advice.map((a, i) => <div key={i} style={{ fontSize: 12, marginTop: 4 }}>{a.icon} {a.text}</div>)}
            </div>
          )}
          <HistoryChart history={history} />
        </>
      ) : (
        <ItemTable lines={lines} />
      )}
      <p style={{ ...styles.sub, marginTop: 12 }}>💾 Đã tự động lưu game. "Tiền vào − tiền ra" tính cả tiền nhập hàng để bán những ngày sau, nên có hôm âm dù bán có lãi.</p>
      <Footer onClose={closePanel} closeLabel="☀️ Sang ngày mới" />
    </>
  );
}

/** Sổ nợ: khách quen ghi sổ, nhắc nợ hoặc xoá nợ; bật/tắt cho ghi sổ. */
function DebtBook() {
  const { level, day, debts, regulars, allowCredit, setAllowCredit, remindDebt, forgiveDebt } = useGame();
  if (level < CREDIT_UNLOCK) return null;
  const rows = Object.entries(debts).filter(([, d]) => d.amount > 0);
  const total = rows.reduce((n, [, d]) => n + d.amount, 0);
  return (
    <div style={{ ...styles.card, display: 'block', maxWidth: 560, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <b>📒 Sổ nợ {rows.length ? `· ${formatMoney(total)}` : ''}</b>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={allowCredit} onChange={(e) => setAllowCredit(e.target.checked)} /> Cho ghi sổ
        </label>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
        Khách quen từ {CREDIT_FRIENDSHIP} 💛 có lúc quên ví, xin ghi sổ (hạn mức theo độ thân). Thường lần ghé sau sẽ trả.
        Quá {DEBT_LATE_DAYS} ngày nên nhắc nợ; quá {DEBT_WRITE_OFF_DAYS} ngày coi như mất.
      </div>
      {!rows.length && <div style={{ fontSize: 12, marginTop: 4 }}>Chưa ai nợ.</div>}
      {rows.map(([id, d]) => {
        const r = regularById(id);
        const age = day - d.since;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13 }}>
            <span style={{ flex: 1 }}>
              {r?.name}: <b>{formatMoney(d.amount)}</b>
              <span style={{ opacity: 0.7, fontSize: 12, color: age >= DEBT_LATE_DAYS ? '#e17055' : undefined }}> · {age} ngày · hạn mức {formatMoney(creditLimit(regulars[id]))}{d.reminded ? ' · đã nhắc' : ''}</span>
            </span>
            <button style={styles.btn} disabled={d.reminded} onClick={() => remindDebt(id)} title="Lần ghé tới chắc chắn trả, nhưng khách hơi ngại">Nhắc nợ</button>
            <button style={styles.btn} onClick={() => forgiveDebt(id)} title="Mất tiền nhưng khách thân hơn">Xoá nợ</button>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ ...styles.card, display: 'block', padding: '6px 10px' }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{icon} {label}</div>
      <b style={{ fontSize: 13 }}>{value}</b>
    </div>
  );
}

/** Bảng theo món: bấm tiêu đề để sắp xếp. */
function ItemTable({ lines }: { lines: (ItemLine & { id: string; gross: number })[] }) {
  const [sort, setSort] = useState<'qty' | 'revenue' | 'gross'>('gross');
  if (!lines.length) return <p style={styles.sub}>Hôm nay chưa bán được món nào.</p>;
  const rows = [...lines].sort((a, b) => b[sort] - a[sort]);
  const head = (key: typeof sort, label: string) => (
    <th style={{ cursor: 'pointer', textDecoration: sort === key ? 'underline' : undefined }} onClick={() => setSort(key)}>{label}{sort === key ? ' ▾' : ''}</th>
  );
  return (
    <table style={styles.table}>
      <thead>
        <tr><th style={styles.left}>Mặt hàng</th>{head('qty', 'Số món')}{head('revenue', 'Doanh thu')}{head('gross', 'Lãi gộp')}<th>Lãi/món</th></tr>
      </thead>
      <tbody>
        {rows.map((l) => {
          const p = productById(l.id);
          return (
            <tr key={l.id}>
              <td style={styles.left}><Swatch color={p.color} /> {p.name}</td>
              <td>{l.qty}</td>
              <td>{formatMoney(l.revenue)}</td>
              <td style={{ color: l.gross >= 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(l.gross)}</td>
              <td style={{ opacity: 0.8 }}>{formatMoney(Math.round(l.gross / l.qty))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Cột doanh thu và đường "tiền vào − tiền ra" của các ngày gần đây. */
export function HistoryChart({ history }: { history: DayRecord[] }) {
  if (history.length < 2) return null;
  const max = Math.max(1, ...history.map((h) => Math.max(h.revenue, Math.abs(h.profit))));
  const H = 70;
  return (
    <div style={{ marginTop: 12, maxWidth: 560 }}>
      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>{history.length} ngày gần đây · cột vàng: doanh thu · cột xanh/đỏ: tiền vào − tiền ra</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: H + 18 }}>
        {history.map((h) => (
          <div key={h.day} title={`Ngày ${h.day}: doanh thu ${formatMoney(h.revenue)}, tiền vào − ra ${formatMoney(h.profit)}, ${h.customers} khách`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: H }}>
              <div style={{ width: 7, height: (h.revenue / max) * H, background: '#f1c40f', borderRadius: 2 }} />
              <div style={{ width: 7, height: (Math.abs(h.profit) / max) * H, background: h.profit >= 0 ? '#2ecc71' : '#e74c3c', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{h.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Bật/tắt combo khuyến mãi. */
function ComboPanel() {
  const { level, activeCombos, toggleCombo, closePanel, priceOf } = useGame();
  const combos = unlockedCombos(level);
  return (
    <>
      <h2 style={styles.title}>🎁 Combo khuyến mãi</h2>
      <p style={styles.sub}>
        Khách lấy một món trong combo đang chạy thì khoảng {Math.round(COMBO_PULL * 100)}% sẽ lấy thêm món kia, và được giảm giá khi mua đủ cặp.
        Chạy tối đa {MAX_ACTIVE_COMBOS} combo cùng lúc ({activeCombos.length}/{MAX_ACTIVE_COMBOS}). Nhớ bày đủ cả hai món lên kệ.
      </p>
      {level < COMBO_UNLOCK ? <p style={styles.sub}>🔒 Mở ở cấp {COMBO_UNLOCK}.</p> : (
        <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
          {combos.map((c) => {
            const on = activeCombos.includes(c.id);
            const [a, b] = c.items.map(productById);
            const full = priceOf(a.id) + priceOf(b.id);
            const cut = Math.round((full * c.discount) / 100) * 100;
            const margin = full - cut - a.buy - b.buy;
            return (
              <div key={c.id} style={{ ...styles.card, gap: 10, outline: on ? '2px solid #2ecc71' : undefined }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <b>{c.name}</b>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {formatMoney(full)} → <b>{formatMoney(full - cut)}</b> (giảm {Math.round(c.discount * 100)}%) · lãi cả cặp{' '}
                    <span style={{ color: margin > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(margin)}</span>
                  </div>
                </div>
                <button style={{ ...styles.btn, background: on ? '#2ecc71' : '#fff', color: on ? '#fff' : undefined }} onClick={() => toggleCombo(c.id)}>
                  {on ? 'Đang chạy' : 'Chạy'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

/** Lộ trình cấp: tiến độ cấp hiện tại và mọi mốc có mở khóa, kèm XP còn thiếu. */
function LevelsPanel() {
  const { level, xp, closePanel } = useGame();
  const [showAll, setShowAll] = useState(false);
  const unlocksWithStaff = (lv: number) => [
    ...unlocksAt(lv),
    ...(lv > 1 && maxStaff(lv - 1) > 0 && maxStaff(lv) > maxStaff(lv - 1) ? [`Thêm chỗ nhân viên (tối đa ${maxStaff(lv)})`] : []),
  ];
  // XP tích lũy từ chỗ đang đứng tới từng cấp sau
  const rows: { lv: number; need: number; unlocks: string[] }[] = [];
  let need = xpToNext(level) - xp;
  for (let lv = level + 1; lv <= MAX_LEVEL; lv++) {
    const unlocks = unlocksWithStaff(lv);
    if (unlocks.length || showAll) rows.push({ lv, need, unlocks });
    need += xpToNext(lv);
  }
  const past = Array.from({ length: level - 1 }, (_, i) => i + 2).filter((lv) => unlocksWithStaff(lv).length);
  return (
    <>
      <h2 style={styles.title}>⭐ Lộ trình cấp độ</h2>
      <p style={styles.sub}>
        Bán hàng và làm khách vui để lấy XP. Mỗi cấp thêm {customersPerDay(2) - customersPerDay(1)} khách mỗi ngày
        (hiện khoảng {customersPerDay(level)} khách/ngày).
      </p>
      <div style={{ ...styles.card, display: 'block', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <b>{level >= MAX_LEVEL ? `Cấp tối đa ${MAX_LEVEL}` : `Cấp ${level} → ${level + 1}`}</b>
          <span>{xp} / {xpToNext(level)} XP</span>
        </div>
        <div style={{ height: 8, background: '#555', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, (xp / xpToNext(level)) * 100)}%`, height: '100%', background: '#f1c40f' }} />
        </div>
      </div>
      <label style={{ fontSize: 13, opacity: 0.8 }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Hiện cả các cấp không mở khóa gì
      </label>
      <div style={{ display: 'grid', gap: 6, marginTop: 8, maxWidth: 560 }}>
        {rows.map((r, i) => (
          <div key={r.lv} style={{ ...styles.card, display: 'block', outline: i === 0 ? '2px solid #f1c40f' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <b>🔒 Cấp {r.lv}</b>
              <span style={{ opacity: 0.75, fontSize: 13 }}>còn {r.need.toLocaleString('vi-VN')} XP</span>
            </div>
            {r.unlocks.length > 0 && <div style={{ fontSize: 13, marginTop: 4 }}>{r.unlocks.join(' · ')}</div>}
          </div>
        ))}
      </div>
      {past.length > 0 && (
        <details style={{ marginTop: 12, fontSize: 13 }}>
          <summary>✓ Đã mở khóa ({past.length} mốc)</summary>
          {past.map((lv) => <div key={lv} style={{ opacity: 0.75, marginTop: 4 }}>Cấp {lv}: {unlocksWithStaff(lv).join(' · ')}</div>)}
        </details>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const starColor = (n: number) => (n >= 4 ? '#2ecc71' : n === 3 ? '#f1c40f' : '#e74c3c');

/** Lời khách nhận xét: điểm trung bình, biểu đồ số sao, lọc khen/chê. */
function ReviewsPanel() {
  const { reviews, closePanel } = useGame();
  const [filter, setFilter] = useState<'all' | 'good' | 'bad'>('all');
  const sum = summarizeReviews(reviews);
  const max = Math.max(1, ...sum.byStars);
  const isBad = (r: Review) => r.stars <= 2 || !!r.reason;
  const shown = [...reviews].reverse().filter((r) => filter === 'all' || (filter === 'bad') === isBad(r));
  const filters = [['all', 'Tất cả'], ['good', 'Lời khen'], ['bad', 'Lời chê']] as const;
  return (
    <>
      <h2 style={styles.title}>💬 Khách nhận xét</h2>
      <p style={styles.sub}>Khoảng một nửa số khách để lại vài lời khi về. Điểm cao thì người đi đường ghé tiệm nhiều hơn.</p>
      {sum.count === 0 ? (
        <p style={styles.sub}>Chưa có lời nào. Mở cửa tiệm và bán hàng để khách nhận xét.</p>
      ) : (
        <>
          <div style={{ ...styles.card, gap: 20, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{sum.average.toFixed(1)}</div>
              <div style={{ color: starColor(Math.round(sum.average)) }}>{stars(Math.round(sum.average))}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{sum.count} lời gần nhất</div>
            </div>
            <div style={{ flex: 1, display: 'grid', gap: 3, fontSize: 12 }}>
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 20 }}>{n}★</span>
                  <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
                    <div style={{ width: `${(sum.byStars[n - 1] / max) * 100}%`, height: '100%', borderRadius: 3, background: starColor(n) }} />
                  </div>
                  <span style={{ width: 20, textAlign: 'right' }}>{sum.byStars[n - 1]}</span>
                </div>
              ))}
              {sum.topReason && (
                <span style={{ opacity: 0.75 }}>Bị chê nhiều nhất: {REASON_LABEL[sum.topReason.reason]} ({sum.topReason.count} lần)</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {filters.map(([id, label]) => (
              <button key={id} style={{ ...styles.btn, marginLeft: 0, background: filter === id ? '#f1c40f' : '#fff' }} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {shown.map((r) => (
              <div key={r.id} style={{ ...styles.card, display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b>{r.author}</b>
                  <span style={{ color: starColor(r.stars) }}>{stars(r.stars)}</span>
                </div>
                <div style={{ margin: '4px 0' }}>“{r.text}”</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  Ngày {r.day}, {formatClock(r.minute)}
                  {r.reason ? ` · chê ${REASON_LABEL[r.reason]}` : ''}
                  {r.productId ? ` · ${productById(r.productId).name}` : ''}
                </div>
              </div>
            ))}
            {shown.length === 0 && <p style={styles.sub}>Không có lời nào trong mục này.</p>}
          </div>
        </>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

function Footer({ onClose, closeLabel = 'Đóng', children }: { onClose: () => void; closeLabel?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      {children}
      <button style={{ ...styles.btn, background: '#f1c40f' }} onClick={onClose}>{closeLabel}</button>
    </div>
  );
}

const Swatch = ({ color }: { color: number }) => (
  <span style={{
    display: 'inline-block', width: 12, height: 12, borderRadius: 3, verticalAlign: 'middle',
    background: `#${color.toString(16).padStart(6, '0')}`, border: '1px solid #0004',
  }} />
);

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    pointerEvents: 'auto', position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)',
  },
  panel: {
    background: '#2b2b3a', color: '#fff', borderRadius: 12, padding: '18px 22px',
    minWidth: 'min(360px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100dvh - 32px)', overflow: 'auto',
    boxSizing: 'border-box',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
  },
  title: { margin: '0 0 4px' },
  sub: { margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 },
  table: { borderCollapse: 'collapse', width: '100%', fontSize: 14, textAlign: 'right' },
  left: { textAlign: 'left', padding: '6px 8px 6px 0' },
  row: { display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' },
  select: { flex: 1 },
  card: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#3a3a4d', borderRadius: 8 },
  btn: { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', marginLeft: 4, fontSize: 13 },
  close: {
    position: 'sticky', top: 0, float: 'right', zIndex: 1, width: 30, height: 30, marginLeft: 8,
    border: 'none', borderRadius: 15, cursor: 'pointer', fontSize: 15, background: '#fff', color: '#222',
  },
};
