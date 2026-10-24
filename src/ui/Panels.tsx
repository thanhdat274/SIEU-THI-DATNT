import { ProductIcon } from './ProductIcon';
import { fitLots, nearestLife, tierMarkdown } from '../data/freshness';
import { useEffect, useState } from 'react';
import { ArrangePanel } from './ArrangePanel';
import { Dropdown } from './Dropdown';
import { HAPPY_FROM_MAX, HAPPY_FROM_MIN, HAPPY_HOURS, HAPPY_OFF_OPTIONS, happyHourActive } from '../data/rhythm';
import { OrderPanel } from './OrderPanel';
import { PlanogramPanel } from './PlanogramPanel';
import { QuestPanel } from './QuestPanel';
import { ContractsPanel } from './ContractsPanel';
import { CostumePanel } from './CostumePanel';
import { BusinessPanel } from './BusinessPanel';
import { storageCapacity, storageUsed, useGame } from '../core/store';
import { warehouseTier, WAREHOUSE_TIERS } from '../data/warehouse';
import { dailyWage, maxStaff, ROLES, SHIFTS, type Shift, type Staff } from '../data/staff';
import { FLOOR_COLORS, PAINT_PRICE, ROOF_COLORS, SHOP_TIERS, WALL_COLORS, rentOf, type ShopStyle } from '../data/shopTiers';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { RECIPES, STATIONS, type CookingStation } from '../data/recipes';
import { customersPerDay, MAX_LEVEL, unlocksAt, xpToNext } from '../data/levels';
import { caseSize, CATEGORIES, describeUnits, formatMoney, productById, unlockedProducts, type Product } from '../data/products';
import { productSummary, REASON_LABEL, summarizeReviews, type Review } from '../data/reviews';
import { describeRep, meetsRep, REP_FACTORS, REP_INFO, REP_MIN_SAMPLES, reputationOf, type RepSample } from '../data/reputation';
import { regularRep } from '../data/regulars';
import { formatClock, type DayRecord, type ItemLine } from '../core/store';
import { LOAN_DAILY_RATE } from '../data/biz';
import { COMBO_PULL, COMBO_UNLOCK, MAX_ACTIVE_COMBOS, unlockedCombos } from '../data/combos';
import { suggestPrice, referenceSell } from '../data/pricing';
import { nextPerk, regularById, regularsExpectedToday, REGULARS, type PerkEffect } from '../data/regulars';
import { CREDIT_FRIENDSHIP, CREDIT_UNLOCK, creditLimit, DEBT_LATE_DAYS, DEBT_WRITE_OFF_DAYS } from '../data/credit';
import { ACTION_LABEL, expiringSoon, expiryAdvice, peakAdvice, peakHours, walkoutAdvice, type Advice, type HourStat } from '../data/advice';
import { SKILLS, skillPoints, TITLES } from '../data/titles';
import { repairCost, RISK_RULES, wears } from '../data/risks';
import { CUM_DAYS, dateOfDoy, dayEffects, dayOfYear, FESTIVALS, festivalOn, festivalStock, MONTH_LENGTHS, upcomingFestival, YEAR_DAYS } from '../data/calendar';
import { trending } from '../data/suppliers';
import { describeDay, WEATHER } from '../data/weather';
import { missingForContract, SUPPLY_CONTRACTS, supplyContractById } from '../data/contracts';
import { PHONE_SLOTS } from '../data/phoneOrders';
import { paymentById, type PaymentMethod } from '../data/payments';
import { DAILY_GIFTS, WHEEL_PRIZES, type WheelPrize } from '../data/gifts';

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
        {panel.type === 'calendar' && <CalendarPanel />}
        {panel.type === 'gifts' && <GiftPanel />}
        {panel.type === 'cook' && <CookPanel />}
        {panel.type === 'morning' && <MorningPanel />}
        {panel.type === 'history' && <HistoryPanel />}
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
  const { storage, storageLots, deliveries, warehouseTier: tierIndex, level, money, autoSwap, upgradeWarehouse, openPanel, closePanel } = useGame();
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
      <label style={{ ...styles.card, display: 'flex', fontSize: 13, marginTop: 8 }}>
        <input type="checkbox" checked={autoSwap} onChange={(e) => useGame.setState({ autoSwap: e.target.checked })} />
        Tự thay ô kệ hết hàng (kho cũng hết, không có đơn chờ) bằng món khác đang có trong kho
      </label>
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
  const shopName = useGame((s) => s.shopName);
  const setShopName = useGame((s) => s.setShopName);
  const [name, setName] = useState(shopName);
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
      {/* Biển hiệu tên tiệm: đặt lại miễn phí bao nhiêu lần cũng được */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '8px 0' }}>
        <b>🏪 Tên tiệm</b>
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tạp Hóa Đầu Ngõ"
          style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: '#fff', font: 'inherit' }}
        />
        <button style={{ ...styles.btn, marginLeft: 0, opacity: name.trim() === shopName ? 0.5 : 1 }} disabled={name.trim() === shopName} onClick={() => setShopName(name)}>Đổi tên</button>
      </div>
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
      <div style={staffSt.stats}>
        <div style={staffSt.stat}><small>Nhân sự</small><b>{staff.length}/{max}</b><small>lên cấp để thuê thêm</small></div>
        <div style={staffSt.stat}><small>Tổng lương / ngày</small><b>{formatMoney(total)}</b><small>trả lúc đi ngủ</small></div>
      </div>
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
            <div key={st.id} style={staffSt.card}>
              <StaffInfo st={st} right={<span style={staffSt.wage}>{formatMoney(dailyWage(st))}<small>/ngày</small></span>} />
              <div style={staffSt.actions}>
                <span style={staffSt.label}>🕒 Ca làm</span>
                <Dropdown
                  value={st.shift}
                  onChange={(v) => setShift(st.id, v)}
                  ariaLabel={`Ca làm của ${st.name}`}
                  options={(Object.keys(SHIFTS) as Shift[]).map((k) => ({ value: k, label: SHIFTS[k].name }))}
                />
                <button style={staffSt.fire} onClick={() => confirm(`Cho ${st.name} nghỉ việc?`) && fire(st.id)}>Cho nghỉ</button>
              </div>
            </div>
          ))}
          <label style={staffSt.toggle}>
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
            <div key={c.id} style={staffSt.card}>
              <StaffInfo
                st={c}
                right={
                  <>
                    <span style={staffSt.wage}>{formatMoney(c.wage)}<small>/ca</small></span>
                    <button style={staffSt.hire} disabled={staff.length >= max} onClick={() => hire(c.id)}>Thuê</button>
                  </>
                }
              />
            </div>
          ))}
        </div>
      )}
      <Footer onClose={closePanel} />
    </>
  );
}

function StaffInfo({ st, right }: { st: Staff; right?: React.ReactNode }) {
  const role = ROLES[st.role];
  return (
    <div style={staffSt.head}>
      <span style={staffSt.avatar}>{role.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 15 }}>{st.name}</b>
          <span style={staffSt.role}>{role.name}</span>
          <span style={staffSt.stars} aria-label={`Tay nghề ${st.skill}/5`}>{'★'.repeat(st.skill)}<span style={{ opacity: 0.3 }}>{'★'.repeat(5 - st.skill)}</span></span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{role.desc}</div>
      </div>
      {right}
    </div>
  );
}

const staffSt: Record<string, React.CSSProperties> = {
  stats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '4px 0 4px' },
  stat: { display: 'grid', gap: 2, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 },
  card: { display: 'grid', gap: 10, padding: 12, background: '#3a3a4d', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' },
  head: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(241,196,15,0.15)', fontSize: 20 },
  role: { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' },
  stars: { color: '#f1c40f', fontSize: 12, letterSpacing: 1 },
  wage: { flex: 'none', fontWeight: 700, color: '#f1c40f', whiteSpace: 'nowrap' },
  actions: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' },
  label: { fontSize: 12, opacity: 0.7 },
  fire: { marginLeft: 'auto', border: '1px solid rgba(255,118,117,0.5)', background: 'transparent', color: '#ff7675', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  hire: { flex: 'none', border: 'none', background: '#f1c40f', color: '#222', fontWeight: 700, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)' },
};

const PRICE_PAGE = 12;

function PricePanel() {
  const { level, prices, setPrice, closePanel, sales, demand } = useGame();
  const happyHour = useGame((s) => s.happyHour);
  const minutes = useGame((s) => s.minutes);
  const setHappyHour = useGame((s) => s.setHappyHour);
  const running = happyHourActive(happyHour, minutes);
  // Lọc theo ngành + tìm theo tên, rồi phân trang cho đỡ kéo dài
  const [cat, setCat] = useState<'all' | Product['category']>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const all = unlockedProducts(level);
  const filtered = all.filter((p) => (cat === 'all' || p.category === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / PRICE_PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PRICE_PAGE, cur * PRICE_PAGE + PRICE_PAGE);
  return (
    <>
      <h2 style={styles.title}>💲 Bảng giá</h2>
      <p style={styles.sub}>
        Giá cao hơn giá gợi ý thì lời nhiều hơn nhưng khách ít mua hơn (💸); đồ uống, bánh kẹo bị chê nhanh nhất, gạo, trứng ít bị ảnh hưởng.
        Giá rẻ hơn gợi ý thì thêm người ghé tiệm. Cột "Nên" gợi ý theo số bán mấy ngày gần đây.
        Giá gợi ý hiện hành nhích nhẹ mỗi ngày theo khan hiếm hàng trên thị trường (hàng cạn → giá thị trường nhích lên, tồn nhiều → hạ xuống).
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }}>
        <b style={{ flex: 'none' }}>⏰ Giờ vàng</b>
        <span style={{ ...styles.sub, flex: '1 1 220px', minWidth: 180 }}>giảm giá đúng khung 2 tiếng, khách kéo về đông hơn (giảm {HAPPY_OFF_OPTIONS.join('/')}% → +{HAPPY_OFF_OPTIONS.map((o) => Math.round(o * 2.5)).join('/')}% khách)</span>
        {happyHour ? (
          <>
            <span
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: running ? 'rgba(46,204,113,0.18)' : 'rgba(255,255,255,0.08)', color: running ? '#2ecc71' : undefined }}
              title={running ? 'Giờ vàng đang chạy' : 'Giờ vàng đã đặt, tự chạy đúng khung mỗi ngày'}
            >
              {running ? `● đang chạy tới ${happyHour.from + HAPPY_HOURS}h` : `mỗi ngày ${happyHour.from}h–${happyHour.from + HAPPY_HOURS}h`}
            </span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Dropdown
                value={String(happyHour.from)}
                onChange={(v) => setHappyHour({ ...happyHour, from: Number(v) })}
                options={Array.from({ length: HAPPY_FROM_MAX - HAPPY_FROM_MIN + 1 }, (_, i) => ({ value: String(HAPPY_FROM_MIN + i), label: `${HAPPY_FROM_MIN + i}h` }))}
                ariaLabel="Giờ bắt đầu giờ vàng"
              />
              <Dropdown
                value={String(happyHour.off)}
                onChange={(v) => setHappyHour({ ...happyHour, off: Number(v) })}
                options={HAPPY_OFF_OPTIONS.map((o) => ({ value: String(o), label: `giảm ${o}%` }))}
                ariaLabel="Mức giảm giờ vàng"
              />
            </span>
            <button style={styles.fire} onClick={() => setHappyHour(null)}>Tắt</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)' }}>chưa đặt</span>
            <button style={styles.hire} onClick={() => setHappyHour({ from: 14, off: 10 })}>Bật từ 14h</button>
          </>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '10px 0 6px' }}>
        <Dropdown
          value={cat}
          onChange={(v) => { setCat(v as typeof cat); setPage(0); }}
          options={[{ value: 'all', label: `📂 Tất cả (${all.length})` }, ...Object.entries(CATEGORIES).map(([k, label]) => ({ value: k, label: `${label} (${all.filter((p) => p.category === k).length})` }))]}
          ariaLabel="Lọc theo ngành hàng"
        />
        <input
          style={{ flex: 1, minWidth: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid #ffffff33', background: '#1f1f2b', color: '#fff' }}
          placeholder="Tìm mặt hàng…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          aria-label="Tìm mặt hàng"
        />
        <span style={styles.sub}>{filtered.length} món</span>
      </div>
      <table style={styles.table}>
        <thead>
          <tr><th style={styles.left}>Mặt hàng</th><th>Giá nhập</th><th>Gợi ý</th><th>Giá bán</th><th>Lời / món</th><th>Bán/ngày</th><th>Nên</th></tr>
        </thead>
        <tbody>
          {shown.map((p) => {
            const ref = referenceSell(p.id);
            const price = prices[p.id] ?? p.sell;
            const step = 500;
            const change = (delta: number) => setPrice(p.id, Math.max(step, price + delta));
            const ratio = price / ref;
            const tip = suggestPrice(p.id, price, sales[p.id], demand[p.id]);
            return (
              <tr key={p.id}>
                <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
                <td>{formatMoney(p.buy)}</td>
                <td title="Giá gợi ý hiện hành: nhích theo khan hiếm hàng">{formatMoney(ref)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button style={styles.btn} onClick={() => change(-step)}>−</button>
                  <b
                    style={{ display: 'inline-block', width: 80, color: ratio > 1.3 ? '#e74c3c' : ratio < 0.8 ? '#74b9ff' : ratio > 1 ? '#f1c40f' : '#fff' }}
                    title={ratio > 1.3
                      ? 'Đắt hơn 30% giá gợi ý: rất nhiều khách chê và bỏ đi (💸)'
                      : ratio < 0.8
                        ? 'Rẻ hơn 20% giá gợi ý: bán được nhưng lời mỏng, cân nhắc tăng lại'
                        : ratio > 1
                          ? 'Hơi cao hơn gợi ý: một số khách nhạy giá sẽ chê (💸)'
                          : 'Trong biên giá hợp lý (0.8–1.3× giá gợi ý)'}
                  >
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
          {!shown.length && (
            <tr><td style={styles.left} colSpan={7}>Không có mặt hàng nào khớp bộ lọc.</td></tr>
          )}
        </tbody>
      </table>
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
          <button style={styles.btn} disabled={cur === 0} onClick={() => setPage(cur - 1)}>‹ Trước</button>
          <span style={{ fontSize: 13 }}>Trang {cur + 1}/{pages}</span>
          <button style={styles.btn} disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Sau ›</button>
        </div>
      )}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => useGame.setState({ prices: {} })}>Về giá gợi ý</button>
        <button
          style={styles.hire}
          onClick={() => {
            const s = useGame.getState();
            const next: Record<string, number> = {};
            let changed = 0;
            for (const p of unlockedProducts(s.level)) {
              const price = s.prices[p.id] ?? p.sell;
              const tip = suggestPrice(p.id, price, s.sales[p.id], s.demand[p.id]);
              // Món chưa bán được lần nào thì về giá gợi ý hiện hành thay vì "giữ" vô thông tin
              const noData = (s.sales[p.id] ?? 0) === 0 && (s.demand[p.id] ?? 0) === 0;
              const target = tip.action === 'hold' && noData ? referenceSell(p.id) : tip.price;
              if (target !== price) changed++;
              next[p.id] = target;
            }
            useGame.setState({ prices: next });
            s.notify(`💲 Đã chỉnh giá ${changed}/${Object.keys(next).length} món mở theo cột "Nên"`);
          }}
        >
          ✨ Chỉnh tất cả về giá nên
        </button>
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
  const { level, xp, history, closePanel, openPanel, storage, storageLots, furniture, priceOf } = useGame();
  const [tab, setTab] = useState<'overview' | 'items'>('overview');
  if (panel?.type !== 'summary') return null;
  const st = panel.stats;
  const profit = st.revenue - st.spent - st.wages - (st.rent ?? 0) - (st.fees ?? 0);
  const methods = (Object.entries(st.byMethod ?? {}) as [PaymentMethod, { revenue: number; count: number }][])
    .sort((a, b) => b[1].revenue - a[1].revenue);
  const lines = Object.entries(st.byItem ?? {}).map(([id, l]) => ({ id, ...l, gross: l.revenue - l.cost }));
  const goodsRevenue = lines.reduce((n, l) => n + l.revenue, 0);
  const goodsCost = lines.reduce((n, l) => n + l.cost, 0);
  const best = [...lines].sort((a, b) => b.qty - a.qty)[0];
  const richest = [...lines].sort((a, b) => b.gross - a.gross)[0];
  const missed = st.missed ?? {};
  const missTotal = (missed.stock ?? 0) + (missed.price ?? 0) + (missed.wait ?? 0) + (missed.expired ?? 0);
  const { hours, peak, quiet } = peakHours(st.byHour);
  const timeAdvice = peakAdvice(peak, missed.wait ?? 0);
  // Gợi ý giờ cao điểm đã nói chuyện chờ lâu thì bỏ dòng chờ lâu chung chung
  const advice = walkoutAdvice(st.missLog ?? {}, storage, priceOf)
    .filter((a) => !(timeAdvice[0]?.action === 'staff' && a.action === 'staff'))
    .concat(timeAdvice);
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const act = (a: Advice) => a.action && openPanel({ type: a.action });
  const tabs = [['overview', 'Tổng quan'], ['items', `Theo món (${lines.length})`]] as const;
  const shopName = useGame((s) => s.shopName);
  return (
    <>
      <h2 style={styles.title}>🌙 {shopName} · Tổng kết ngày {day}</h2>
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
              <tr><td style={styles.left}>Tiền nhà (theo bậc tiệm)</td><td>-{formatMoney(st.rent ?? 0)}</td></tr>
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
          {methods.length > 0 && (
            <>
              <h3 style={{ margin: '12px 0 4px', fontSize: 14 }}>💳 Tiền vào theo hình thức thanh toán</h3>
              <table style={{ ...styles.table, fontSize: 13 }}>
                <tbody>
                  {methods.map(([id, m]) => {
                    const def = paymentById(id);
                    return (
                      <tr key={id} title={def.desc}>
                        <td style={styles.left}>{def.icon} {def.name} <span style={{ opacity: 0.6 }}>· {m.count} lượt</span></td>
                        <td>{formatMoney(m.revenue)} <span style={{ opacity: 0.6 }}>({st.revenue ? Math.round((m.revenue / st.revenue) * 100) : 0}%)</span></td>
                      </tr>
                    );
                  })}
                  {!!st.fees && (
                    <tr title="Phí ví điện tử / máy POS đã trừ khỏi tiền thật về">
                      <td style={styles.left}>↳ Phí thanh toán</td>
                      <td style={{ color: '#e17055' }}>-{formatMoney(st.fees)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6, marginTop: 10, maxWidth: 560 }}>
            {best && <Stat icon="🔥" label="Bán chạy nhất" value={`${productById(best.id).name} · ${best.qty} món`} />}
            {richest && <Stat icon="💰" label="Lãi nhiều nhất" value={`${productById(richest.id).name} · ${formatMoney(richest.gross)}`} />}
            {missTotal > 0 && (
              <Stat icon="😞" label={`Lỡ ${missTotal} lượt bán`}
                value={[missed.stock && `${missed.stock} hết hàng`, missed.price && `${missed.price} chê đắt`, missed.wait && `${missed.wait} chờ lâu bỏ về`, missed.expired && `${missed.expired} ngại hàng cận hạn`].filter(Boolean).join(' · ')} />
            )}
          </div>
          {hours.length > 0 && <HourChart hours={hours} peak={peak?.hour} quiet={quiet?.hour} />}
          {expiryTips.length > 0 && (
            <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={act} />
          )}
          {advice.length > 0 && <AdviceCard title="💡 Vì sao khách không mua được · nên làm gì" items={advice} onAct={act} />}
          <HistoryChart history={history} />
        </>
      ) : (
        <ItemTable lines={lines} />
      )}
      <p style={{ ...styles.sub, marginTop: 12 }}>💾 Đã tự động lưu game. "Tiền vào − tiền ra" tính cả tiền nhập hàng để bán những ngày sau, nên có hôm âm dù bán có lãi.</p>
      <Footer onClose={() => openPanel({ type: 'morning' })} closeLabel="☀️ Sang ngày mới · xem sổ đầu ngày" />
    </>
  );
}

/**
 * Sổ đầu ngày: mọi thứ cần biết để chuẩn bị trong một màn hình — dịp lễ, hàng hot,
 * khách quen dự kiến ghé (và món họ thích còn trong kho không), lời hẹn giữ món,
 * hợp đồng tới kỳ giao và khe giờ điện thoại. Chỉ liệt kê, không tự quyết thay người chơi.
 */
function MorningPanel() {
  const {
    day, level, weatherSeed, weather, forecast, regulars, reservations, storage,
    furniture, staff, contracts, deliveries, shopTier, closePanel, openPanel, repLog,
    storageLots, debts, biz,
  } = useGame();
  const shopName = useGame((s) => s.shopName);
  const rep = reputationOf(repLog);
  const effects = dayEffects(weatherSeed, day, level);
  const soon = upcomingFestival(day);
  const hot = trending(day, level).filter((id) => !effects.hot.includes(id));
  const expected = regularsExpectedToday(day, weatherSeed, level, regulars, rep);
  const resList = Object.entries(reservations).filter(([, r]) => r.day === day);
  const haveStock = (id: string) => (storage[id] ?? 0) > 0 || furniture.some((f) => f.tiers.some((t) => t.productId === id && t.count > 0))
    || deliveries.some((d) => (d.items[id] ?? 0) > 0);
  const dueContracts = Object.entries(contracts)
    .map(([id, cs]) => ({ cs, def: supplyContractById(cs.defId) }))
    .filter(({ cs, def }) => def && cs.dueDay <= day + 1);
  const courier = staff.some((w) => w.role === 'courier');
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  const today = dateOfDoy(dayOfYear(day));
  const expiring = expiringSoon(storage, storageLots, furniture.flatMap((f) => f.tiers));
  const expiryTips = expiryAdvice(expiring);
  const dueDebts = expected
    .map((r) => ({ r, debt: debts[r.id] }))
    .filter(({ debt }) => debt && debt.amount > 0);
  const favsOf = (rid: string) => {
    const def = REGULARS.find((x) => x.id === rid);
    return def ? def.favorites.filter((id) => productById(id).unlock <= level) : [];
  };
  return (
    <>
      <h2 style={styles.title}>☀️ {shopName} · Sổ đầu ngày {day} ({today.day}/{today.month})</h2>
      <p style={styles.sub}>
        {WEATHER[weather].icon} Hôm nay {describeDay(weatherSeed, day, weather)} · mai {WEATHER[forecast[0]].icon} {describeDay(weatherSeed, day + 1, forecast[0])}.
        Đọc xong nên nhập hàng bày kệ trước khi mở cửa — khách quen ghé đúng giờ quen.
        🏠 Tiền nhà trả cuối ngày: <b>{formatMoney(rentOf(shopTier))}</b>.
      </p>

      {biz.loan && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: biz.loan.dueDay - day <= 3 ? '2px solid #e74c3c' : undefined }}>
          <b>🏦 Đang nợ ngân hàng {formatMoney(biz.loan.principal)}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Tối nay trừ lãi {formatMoney(Math.round(biz.loan.principal * LOAN_DAILY_RATE))} · hạn trả ngày {biz.loan.dueDay} (còn {Math.max(0, biz.loan.dueDay - day)} ngày)
            · trả gốc ở Kinh doanh → Vay &amp; hụi.
          </div>
        </div>
      )}
      {biz.hui && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🤝 Đang góp hụi {formatMoney(biz.hui.daily)}/ngày</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            Đã góp {biz.hui.paidDays}/{biz.hui.members} ngày{!biz.hui.received && ` · ngày ${biz.hui.turnDay} tới lượt hốt ${formatMoney(biz.hui.daily * biz.hui.members)}`}.
          </div>
        </div>
      )}

      {effects.festival && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8, outline: '2px solid #f1c40f' }}>
          <b>{effects.festival.icon} {effects.festival.name} đang diễn ra</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>
            👥 khách {pct(effects.festival.traffic)}{effects.festival.cost !== 1 && ` · 💰 giá nhập ${pct(effects.festival.cost)}`}
            {effects.festival.tolerance && ' · 😤 khách chịu giá cao'}
          </div>
          {festivalStock(effects.festival, level).length > 0 && (
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Hàng nên bày sẵn: {festivalStock(effects.festival, level).map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ kho không có'}`).join(', ')}
            </div>
          )}
        </div>
      )}
      {effects.hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🎯 Hàng của dịp hôm nay</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{effects.hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {hot.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>🔥 Hàng hot tuần này</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>{hot.map((id) => `${productById(id).name}${haveStock(id) ? ' ✓' : ' ⚠️ chưa có'}`).join(', ')}</div>
        </div>
      )}
      {soon && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 8 }}>
          <b>⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}</b>
          <div style={{ fontSize: 12, marginTop: 2 }}>Nên nhập sẵn: {festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ') || '—'}</div>
        </div>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>💛 Khách quen dự kiến ghé hôm nay ({expected.length})</h3>
      {expected.length === 0 && <p style={styles.sub}>Không ai trong nhóm khách quen có lịch ghé hôm nay.</p>}
      <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
        {expected.map((r) => {
          const prog = regulars[r.id];
          const res = reservations[r.id];
          const favs = favsOf(r.id);
          return (
            <div key={r.id} style={{ ...styles.card, display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b><Swatch color={r.color} /> {r.name}</b>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{formatClock(r.visitFrom)}–{formatClock(r.visitUntil)}{res ? ' · 🤝 đang giữ món hẹn' : ''}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 2 }}>
                Món thích: {favs.length
                  ? favs.map((id) => `${prog?.discovered.includes(id) || res?.productId === id ? productById(id).name : '???'}${haveStock(id) ? ' ✓' : ' ⚠️'}`).join(', ')
                  : 'chưa biết'}
              </div>
            </div>
          );
        })}
      </div>

      {dueDebts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📒 Nợ của khách quen ghé hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueDebts.map(({ r, debt }) => debt && (
              <div key={r.id} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{r.name}</b> nợ <b>{formatMoney(debt.amount)}</b> từ ngày {debt.since}
                  {day - debt.since >= DEBT_LATE_DAYS && <span style={{ color: '#ff8a7a' }}> · quá {DEBT_LATE_DAYS} ngày, mất hẳn sau ngày {debt.since + DEBT_WRITE_OFF_DAYS}</span>}
                  {debt.reminded && ' · đã nhắc, lần này chắc trả'}
                </span>
                {!debt.reminded && <button style={styles.btn} onClick={() => useGame.getState().remindDebt(r.id)}>Nhắc nợ</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {expiring.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <AdviceCard title={`🥀 Hàng sắp hỏng (${expiring.reduce((n, l) => n + l.qty, 0)} món)`} items={expiryTips} onAct={(a) => a.action && openPanel({ type: a.action })} />
        </div>
      )}

      {resList.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🤝 Lời hẹn giữ món hôm nay</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {resList.map(([rid, r]) => (
              <div key={rid} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  Giữ <b>{r.qty} {productById(r.productId).name}</b> cho {regularById(rid)?.name}
                  {haveStock(r.productId) ? ' — kho/kệ đủ ✓' : ' — ⚠️ chưa có hàng, nhập hoặc bày ngay'}
                </span>
                <button style={styles.btn} onClick={() => useGame.getState().cancelReservation(rid)}>Huỷ hẹn</button>
              </div>
            ))}
          </div>
        </>
      )}

      {dueContracts.length > 0 && (
        <>
          <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>🚚 Hợp đồng tới kỳ giao</h3>
          <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
            {dueContracts.map(({ cs, def }) => def && (
              <div key={cs.defId} style={{ ...styles.card }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{def.title}</b> · hạn ngày {cs.dueDay}
                  {(() => {
                    const missing = missingForContract(def, storage);
                    return missing.length
                      ? <span style={{ color: '#ff8a7a' }}> · thiếu: {missing.map((m) => `${m.need} ${productById(m.id).name}`).join(', ')}</span>
                      : <span style={{ color: '#2ecc71' }}> · kho đủ hàng ✓</span>;
                  })()}
                </span>
                <button style={styles.btn} onClick={() => openPanel({ type: 'contracts' })}>Xem</button>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ margin: '10px 0 4px', fontSize: 14 }}>📞 Điện thoại</h3>
      <p style={styles.sub}>
        {courier
          ? `Hôm nay có ${PHONE_SLOTS.length} khe giờ hàng xóm gọi điện đặt hàng: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}. Nghe máy kịp mới có đơn.`
          : `Chưa thuê 🛵 Giao hàng nên không có cuộc gọi nào. Thuê nhân viên giao hàng để mở đơn điện thoại (khe giờ: ${PHONE_SLOTS.map((m) => formatClock(m)).join(', ')}).`}
      </p>
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập hàng</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Kho</button>
      </Footer>
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

function AdviceCard({ title, items, onAct }: { title: string; items: Advice[]; onAct: (a: Advice) => void }) {
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={{ fontSize: 13 }}>{title}</b>
      {items.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ flex: 1 }}>{a.icon} {a.text}</span>
          {a.action && <button style={{ ...styles.btn, whiteSpace: 'nowrap' }} onClick={() => onAct(a)}>{ACTION_LABEL[a.action]}</button>}
        </div>
      ))}
    </div>
  );
}

/** Khách ghé theo giờ: cột cao nhất là giờ đông nhất. */
function HourChart({ hours, peak, quiet }: { hours: HourStat[]; peak?: number; quiet?: number }) {
  const max = Math.max(1, ...hours.map((h) => h.customers));
  return (
    <div style={{ ...styles.card, display: 'block', marginTop: 10, maxWidth: 560 }}>
      <b style={{ fontSize: 13 }}>🕒 Khách theo giờ</b>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginTop: 6 }}>
        {hours.map((h) => (
          <div key={h.hour} title={`${h.hour}h: ${h.customers} khách · ${formatMoney(h.revenue)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10 }}>{h.customers || ''}</span>
            <div style={{ width: '100%', height: `${(h.customers / max) * 50}px`, minHeight: h.customers ? 2 : 0, borderRadius: 3, background: h.hour === peak ? '#e67e22' : h.hour === quiet ? '#95a5a6' : '#3498db' }} />
            <span style={{ fontSize: 10, opacity: 0.7 }}>{h.hour}h</span>
          </div>
        ))}
      </div>
      {peak !== undefined && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          🟠 Đông nhất {peak}h–{peak + 1}h{quiet !== undefined && <> · ⚪ vắng nhất {quiet}h–{quiet + 1}h (lúc rảnh để dọn dẹp, châm hàng)</>}
        </div>
      )}
    </div>
  );
}

/** Danh tiếng 5 mặt, mặt yếu nhất kèm cách sửa, và những gì danh tiếng đang mở hoặc còn khoá. */
function ReputationCard({ log }: { log: RepSample[] }) {
  const { level, regulars } = useGame();
  const rep = reputationOf(log);
  const gated = [
    ...SUPPLY_CONTRACTS.filter((c) => c.rep && c.unlock <= level + 5).map((c) => ({ name: `${c.icon} Hợp đồng ${c.title}`, need: c.rep! })),
    ...REGULARS.filter((r) => !regulars[r.id]?.visits && r.unlock <= level + 5 && regularRep(r)).map((r) => ({ name: `💛 Khách quen ${r.name}`, need: regularRep(r)! })),
  ].filter((g) => !meetsRep(rep, g.need)).slice(0, 4);
  return (
    <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <b>⭐ Danh tiếng {rep.overall.toFixed(1)}★</b>
        <span style={{ fontSize: 12, opacity: 0.7 }}>{rep.samples} lượt khách gần nhất</span>
      </div>
      {rep.samples < REP_MIN_SAMPLES && <div style={{ fontSize: 12, opacity: 0.75 }}>Cần ít nhất {REP_MIN_SAMPLES} lượt khách mới chấm được, tạm tính 3★.</div>}
      {REP_FACTORS.map((k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
          <span style={{ width: 130 }}>{REP_INFO[k].icon} {REP_INFO[k].name}</span>
          <div style={{ flex: 1, height: 6, background: '#555', borderRadius: 3 }}>
            <div style={{ width: `${((rep.factors[k] - 1) / 4) * 100}%`, height: '100%', borderRadius: 3, background: starColor(Math.round(rep.factors[k])) }} />
          </div>
          <span style={{ width: 30, textAlign: 'right' }}>{rep.factors[k].toFixed(1)}</span>
        </div>
      ))}
      {rep.weakest && rep.factors[rep.weakest] < 4 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>💡 Yếu nhất: <b>{REP_INFO[rep.weakest].name}</b>. {REP_INFO[rep.weakest].low}</div>
      )}
      {gated.length > 0 && (
        <div style={{ fontSize: 12, marginTop: 6 }}>
          🔒 Danh tiếng sẽ mở: {gated.map((g) => `${g.name} (${describeRep(g.need)})`).join(' · ')}
        </div>
      )}
      <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>Danh tiếng cao thì nhiều người đi đường ghé hơn, mở khách quen mới, hợp đồng và mục tiêu dịp lễ lớn.</div>
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
              <td style={styles.left}><ProductIcon product={p} /> {p.name}</td>
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
      <div style={{ ...styles.card, display: 'block', marginBottom: 12, maxWidth: 780 }}>
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
      <div style={{ display: 'grid', gap: 6, marginTop: 8, maxWidth: 780 }}>
        {rows.map((r, i) => (
          <div key={r.lv} style={{ ...styles.card, display: 'block', outline: i === 0 ? '2px solid #f1c40f' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <b>🔒 Cấp {r.lv}</b>
              <span style={{ opacity: 0.75, fontSize: 13 }}>còn {r.need.toLocaleString('vi-VN')} XP</span>
            </div>
            {r.unlocks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {r.unlocks.map((u) => (
                  <span key={u} style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.1)' }}>{u}</span>
                ))}
              </div>
            )}
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
  const { reviews, closePanel, repLog } = useGame();
  const [filter, setFilter] = useState<'all' | 'good' | 'bad'>('all');
  const sum = summarizeReviews(reviews);
  const perProduct = productSummary(reviews);
  const max = Math.max(1, ...sum.byStars);
  const isBad = (r: Review) => r.stars <= 2 || !!r.reason;
  const shown = [...reviews].reverse().filter((r) => filter === 'all' || (filter === 'bad') === isBad(r));
  const filters = [['all', 'Tất cả'], ['good', 'Lời khen'], ['bad', 'Lời chê']] as const;
  return (
    <>
      <h2 style={styles.title}>💬 Danh tiếng & nhận xét</h2>
      <ReputationCard log={repLog} />
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
          {/* Theo từng món: món nào đang bị chê thì nhập/bày/điều giá liền, món được khen thì giữ chất lượng */}
          {(perProduct.worst.length > 0 || perProduct.best.length > 0) && (
            <div style={{ ...styles.card, marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <b style={{ color: '#ff7675' }}>👎 Bị chê nhiều nhất</b>
                {perProduct.worst.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.complaint} lần
                  </div>
                ))}
                {perProduct.worst.length === 0 && <div style={styles.sub}>Chưa có món nào bị chê</div>}
              </div>
              <div>
                <b style={{ color: '#55efc4' }}>👍 Được khen nhiều nhất</b>
                {perProduct.best.map((p) => (
                  <div key={p.productId} style={{ fontSize: 12, marginTop: 4 }}>
                    {productById(p.productId).name}: {p.praise} lần
                  </div>
                ))}
                {perProduct.best.length === 0 && <div style={styles.sub}>Chưa có lời khen món nào</div>}
              </div>
            </div>
          )}
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

/** Lịch sự kiện cả năm: lưới 12 tháng tô màu theo dịp lễ, kèm hiệu ứng từng dịp để nhập hàng trước. */
function CalendarPanel() {
  const day = useGame((s) => s.day);
  const level = useGame((s) => s.level);
  const closePanel = useGame((s) => s.closePanel);
  const doy = dayOfYear(day);
  const current = festivalOn(day);
  const sorted = [...FESTIVALS].sort((a, b) => {
    const dist = (f: typeof a) => f === current ? -1 : (f.from - doy + YEAR_DAYS) % YEAR_DAYS;
    return dist(a) - dist(b);
  });
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  const dateText = (doy0: number) => {
    const { month, day: d } = dateOfDoy(doy0);
    return `${d}/${month}`;
  };
  const rangeText = (f: typeof FESTIVALS[number]) => {
    const a = dateOfDoy(f.from), b = dateOfDoy(f.to);
    return a.month === b.month ? `${a.day}–${b.day}/${a.month}` : `${a.day}/${a.month}–${b.day}/${b.month}`;
  };
  const today = dateOfDoy(doy);
  return (
    <>
      <h2 style={styles.title}>🗓️ Lịch sự kiện</h2>
      <p style={styles.sub}>
        Một năm trong game dài 365 ngày theo lịch thật. Hôm nay là ngày {today.day}/{today.month}
        {current ? ` — đang trong ${current.icon} ${current.name}` : ''}. Xem trước dịp nào tới để nhập sẵn hàng:
        giá nhập thay đổi theo dịp, khách chịu giá cao với hàng mùa.
      </p>
      <div style={{ display: 'grid', gap: 3, marginBottom: 14, maxWidth: 660 }}>
        {MONTH_LENGTHS.map((len, m) => (
          <div key={m} style={{ display: 'grid', gridTemplateColumns: `28px repeat(${len}, 1fr)`, gap: 2 }}>
            <span style={{ fontSize: 11, opacity: 0.6, alignSelf: 'center' }}>T{m + 1}</span>
            {Array.from({ length: len }, (_, d) => {
              const doy0 = CUM_DAYS[m] + d;
              const f = FESTIVALS.find((x) => doy0 >= x.from && doy0 <= x.to);
              const idx = f ? FESTIVALS.indexOf(f) : -1;
              return (
                <div
                  key={d}
                  title={`${d}/${m + 1}${f ? `: ${f.name}` : ''}`}
                  style={{
                    height: 16, borderRadius: 3, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: f ? `hsl(${(idx * 47) % 360} 55% 42%)` : '#3a3a4d',
                    outline: doy0 === doy ? '2px solid #fff' : undefined,
                    cursor: 'default',
                  }}
                >
                  {f ? f.icon : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, maxWidth: 660 }}>
        {sorted.map((f) => {
          const inDays = (f.from - doy + YEAR_DAYS) % YEAR_DAYS;
          const running = f === current;
          const goods = festivalStock(f, level);
          return (
            <div key={f.id} style={{ ...styles.card, alignItems: 'flex-start', outline: running ? '2px solid #f1c40f' : undefined }}>
              <span style={{ fontSize: 26 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <b>{f.name}</b>
                  <small style={{ opacity: 0.7 }}>
                    {running ? 'Đang diễn ra' : inDays === 0 ? 'Hôm nay' : `sau ${inDays} ngày`} · {rangeText(f)}
                  </small>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, margin: '2px 0' }}>{f.blurb}</div>
                <div style={{ fontSize: 12 }}>
                  👥 khách {pct(f.traffic)}
                  {f.cost !== 1 && ` · 💰 giá nhập ${pct(f.cost)}`}
                  {f.tolerance && ' · 😤 khách chịu giá cao'}
                  {goods.length > 0 && <small style={{ opacity: 0.75 }}> · hàng nên nhập: {goods.map((id) => productById(id).name).join(', ')}</small>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}

/** Điểm danh quà 7 ngày + vòng quay may mắn mỗi ngày một lượt. */
function GiftPanel() {
  const { day, giftStreak, giftLastDay, wheelLastDay, wheelBoost, claimGift, spinWheel, closePanel } = useGame();
  const claimedToday = giftLastDay === day;
  const spunToday = wheelLastDay === day;
  const nextIdx = giftStreak % DAILY_GIFTS.length;
  const claimedIdx = claimedToday ? (giftStreak - 1) % DAILY_GIFTS.length : -1;
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelPrize | null>(null);

  const doSpin = () => {
    if (spunToday || spinning) return;
    const prize = spinWheel();
    if (!prize) return;
    const i = WHEEL_PRIZES.indexOf(prize);
    const step = 360 / WHEEL_PRIZES.length;
    const jitter = (Math.random() - 0.5) * step * 0.6;
    const targetMod = (360 - (i * step + step / 2 + jitter)) % 360;
    setResult(null);
    setSpinning(true);
    setAngle((a) => a + 360 * 5 + ((targetMod - (a % 360)) + 360) % 360);
    setTimeout(() => { setSpinning(false); setResult(prize); }, 3200);
  };

  const wheelColors = WHEEL_PRIZES.map((_, i) => `${i % 2 ? '#4a4a5d' : '#3a3a4d'} ${i * (360 / WHEEL_PRIZES.length)}deg ${(i + 1) * (360 / WHEEL_PRIZES.length)}deg`).join(', ');
  const step = 360 / WHEEL_PRIZES.length;
  return (
    <>
      <h2 style={styles.title}>🎁 Điểm danh & vòng quay</h2>
      <p style={styles.sub}>
        Mỗi ngày chơi nhận một phần quà, đủ 7 ngày liên tiếp thì trúng rương vàng rồi lặp lại.
        Mỗi ngày còn một lượt vòng quay may mắn.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        {DAILY_GIFTS.map((g, i) => {
          const done = i === claimedIdx;
          const next = i === nextIdx && !claimedToday;
          return (
            <div
              key={i}
              title={g.label}
              style={{
                flex: '1 1 70px', textAlign: 'center', padding: '8px 4px', borderRadius: 8, fontSize: 12,
                background: done ? '#3d6b45' : next ? '#5a4a1d' : '#3a3a4d',
                outline: next ? '2px solid #f1c40f' : undefined,
                opacity: done ? 0.9 : 1,
              }}
            >
              <div style={{ fontSize: 22 }}>{done ? '✅' : g.icon}</div>
              <div>{g.label}</div>
              <small style={{ opacity: 0.65 }}>Ngày {i + 1}</small>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <small style={{ opacity: 0.75 }}>Chuỗi điểm danh: {giftStreak > 0 ? `${giftStreak} ngày` : 'chưa bắt đầu'}</small>
        <button style={{ ...styles.btn, marginLeft: 0, background: claimedToday ? '#666' : '#2ecc71', color: '#fff', cursor: claimedToday ? 'default' : 'pointer' }} onClick={claimGift} disabled={claimedToday}>
          {claimedToday ? '✅ Hôm nay đã điểm danh' : 'Nhận quà hôm nay'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 232, height: 232, flexShrink: 0 }}>
          {/* Kim chỉ ở đỉnh */}
          <div style={{ position: 'absolute', left: '50%', top: -4, transform: 'translateX(-50%)', fontSize: 20, zIndex: 2 }}>▼</div>
          <div
            style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: `conic-gradient(${wheelColors})`,
              transform: `rotate(${angle}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.15, 0.6, 0.15, 1)' : undefined,
              boxShadow: '0 0 0 5px #222, 0 6px 18px rgba(0,0,0,0.4)',
              position: 'relative',
            }}
          >
            {WHEEL_PRIZES.map((p, i) => (
              // Nhãn xoay theo ô (kiểu vòng quay thật): biểu tượng sát mép, chữ bên dưới hướng vào tâm,
              // bề ngang giới hạn trong cung của ô để không tràn sang ô bên cạnh
              <div
                key={i}
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 54, marginLeft: -27,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transform: `rotate(${i * step + step / 2}deg) translateY(-104px)`,
                  transformOrigin: '50% 0',
                  textAlign: 'center', lineHeight: 1.05, pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{p.short}</span>
              </div>
            ))}
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 40, height: 40, borderRadius: '50%', background: '#f1c40f', color: '#222',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, zIndex: 1,
          }}>🎡</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          {spinning ? (
            <p style={styles.sub}>Đang quay…</p>
          ) : result ? (
            <p style={{ ...styles.sub, fontSize: 15 }}>
              🎉 Chúc mừng: <b>{result.icon} {result.label}</b>
            </p>
          ) : spunToday ? (
            <p style={styles.sub}>Hôm nay đã quay rồi, mai quay lại nhé!</p>
          ) : (
            <p style={styles.sub}>Mỗi ngày một lượt quay. Trúng 🍀 thì cả ngày khách ghé đông thêm!</p>
          )}
          <button
            style={{ ...styles.btn, marginLeft: 0, background: spunToday || spinning ? '#666' : '#e67e22', color: '#fff', cursor: spunToday || spinning ? 'default' : 'pointer', padding: '8px 16px' }}
            onClick={doSpin}
            disabled={spunToday || spinning}
          >
            🎡 Quay ngay
          </button>
          {wheelBoost > 1 && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#a3e4a3' }}>🍀 Hôm nay khách ghé đông thêm {Math.round((wheelBoost - 1) * 100)}% nhờ vòng quay.</p>
          )}
        </div>
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}

/** Sổ nấu: công thức theo trạm, nguyên liệu lấy từ kho (lô cận hạn trước), mẻ xong về kho chờ bày kệ. */
function CookPanel() {
  const { level, storage, furniture, cookJobs, startCook, closePanel, openPanel, setBuildMode } = useGame();
  const day = useGame((s) => s.day);
  const stationCount = (st: CookingStation) => furniture.filter((f) => f.type === st).length;
  const busyAt = (st: CookingStation) => cookJobs.filter((j) => RECIPES.find((r) => r.id === j.recipeId)?.station === st).length;
  return (
    <>
      <h2 style={styles.title}>🍳 Sổ nấu</h2>
      <p style={styles.sub}>
        Món nhà làm không nhập được ở mối nào — chỉ có bằng cách nấu từ nguyên liệu trong kho (lô cận hạn dùng trước).
        Nấu xong món tự về kho, bày lên kệ như hàng thường; khách thích món nhà làm nên hỏi mua nhiều hơn.
        Mỗi trạm mỗi lúc nấu một mẻ; thuê 🍳 Chế biến (cấp 25) thì nấu nhanh hơn theo tay nghề.
      </p>
      {cookJobs.length > 0 && (
        <div style={{ ...styles.card, display: 'block', marginBottom: 10, maxWidth: 560 }}>
          <b style={{ fontSize: 13 }}>🔥 Đang nấu</b>
          {cookJobs.map((j) => {
            const r = RECIPES.find((x) => x.id === j.recipeId);
            return (
              <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 4 }}>
                <span style={{ flex: 1 }}>{r?.name ?? j.recipeId}</span>
                <div style={{ width: 140, height: 8, background: '#555', borderRadius: 4 }}>
                  <div style={{ width: `${Math.min(100, ((j.total - j.remaining) / j.total) * 100)}%`, height: '100%', borderRadius: 4, background: '#f1c40f' }} />
                </div>
                <span style={{ opacity: 0.75, width: 74, textAlign: 'right' }}>còn ~{Math.ceil(j.remaining)} phút</span>
              </div>
            );
          })}
        </div>
      )}
      {STATIONS.map((st) => {
        const own = stationCount(st.id);
        const busy = busyAt(st.id);
        const recipes = RECIPES.filter((r) => r.station === st.id).sort((a, b) => a.unlock - b.unlock);
        return (
          <div key={st.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <b>{st.icon} {st.name}</b>
              <span style={{ fontSize: 12, opacity: own ? 0.75 : 0.95, color: own ? undefined : '#f39c12' }}>
                {own ? `${busy}/${own} trạm bận` : `chưa có trạm — mua ở 🛠️ Xây dựng (cấp ${st.unlock})`}
              </span>
              {!own && level >= st.unlock && (
                <button style={{ ...styles.btn, marginLeft: 0 }} onClick={() => setBuildMode(true)}>Mua trạm</button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 6, maxWidth: 560 }}>
              {recipes.map((r) => {
                const out = productById(r.outputId);
                const inputCost = r.inputs.reduce((n, i) => n + productById(i.productId).buy * i.quantity, 0);
                const gross = out.sell * r.outputQty - inputCost;
                const missing = r.inputs.filter((i) => (storage[i.productId] ?? 0) < i.quantity);
                const locked = level < r.unlock;
                const noStation = !own;
                const stationFull = busy >= own;
                // Giỏ quà ngày lễ: chỉ gói được trong đúng dịp trên lịch
                const fest = r.festival ? FESTIVALS.find((f) => f.id === r.festival) : undefined;
                const outOfSeason = !!fest && festivalOn(day)?.id !== fest.id;
                const reason = locked ? `🔒 Cấp ${r.unlock}` : outOfSeason ? `Ngoài dịp ${fest!.name}` : noStation ? 'Thiếu trạm' : stationFull ? 'Trạm bận' : missing.length ? 'Thiếu nguyên liệu' : null;
                return (
                  <div key={r.id} style={{ ...styles.card, opacity: locked || outOfSeason ? 0.5 : 1 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{r.name}</b>
                      {fest && <span style={{ fontSize: 11, color: outOfSeason ? '#f39c12' : '#2ecc71', marginLeft: 6 }}>{fest.icon} {outOfSeason ? `chỉ trong dịp ${fest.name}` : 'đúng dịp — gói đi!'}</span>}
                      <div style={{ fontSize: 12, opacity: 0.8 }}>
                        {r.inputs.map((i) => {
                          const have = storage[i.productId] ?? 0;
                          return `${i.quantity} ${productById(i.productId).name} (${have})`;
                        }).join(' + ')}
                        {' '}→ <b>{r.outputQty} × {out.name}</b> · {r.durationMin} phút
                      </div>
                      <div style={{ fontSize: 12 }}>
                        Lãi gộp ~<b style={{ color: gross > 0 ? '#2ecc71' : '#e74c3c' }}>{formatMoney(gross)}</b>/mẻ
                        {missing.length > 0 && !locked && (
                          <span style={{ color: '#ff8a7a' }}> · thiếu: {missing.map((i) => productById(i.productId).name).join(', ')}</span>
                        )}
                      </div>
                    </div>
                    {locked ? (
                      <span style={{ fontSize: 12 }}>🔒 Cấp {r.unlock}</span>
                    ) : (
                      <button style={styles.btn} disabled={!!reason} title={reason ?? 'Bắt đầu nấu'} onClick={() => startCook(r.id)}>
                        {reason ?? '🍳 Nấu'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <Footer onClose={closePanel}>
        <button style={styles.btn} onClick={() => openPanel({ type: 'order' })}>📦 Nhập nguyên liệu</button>
        <button style={styles.btn} onClick={() => openPanel({ type: 'storage' })}>🏭 Xem kho</button>
      </Footer>
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

/** Sổ theo dõi: biểu đồ doanh thu – lãi – khách – sao của tối đa 30 ngày gần nhất (kèm số hôm nay đang chạy). */
function HistoryPanel() {
  const { history, stats, day, closePanel } = useGame();
  const shelfHeat = useGame((s) => s.shelfHeat);
  const furnitureList = useGame((s) => s.furniture);
  const today: DayRecord = {
    day,
    revenue: stats.revenue,
    profit: stats.revenue - stats.spent - (stats.wages ?? 0) - (stats.rent ?? 0),
    customers: stats.customers,
    unhappy: stats.unhappy,
  };
  const days = [...history, today].slice(-14);
  const W = 620;
  const H = 190;
  const padL = 8;
  const padB = 22;
  const stepX = days.length > 1 ? (W - padL * 2) / (days.length - 1) : 0;
  const maxMoney = Math.max(...days.map((d) => Math.max(d.revenue, d.profit)), 1);
  const maxCust = Math.max(...days.map((d) => d.customers), 1);
  const x = (i: number) => padL + i * stepX;
  const yMoney = (v: number) => H - padB - (Math.max(v, 0) / maxMoney) * (H - padB - 10);
  const yCust = (v: number) => H - padB - (v / maxCust) * (H - padB - 10);
  const line = (pick: (d: DayRecord) => number) => days.map((d, i) => `${x(i)},${yMoney(pick(d))}`).join(' ');
  // Đường sao 1–5: vẽ trên cùng khung hình, càng cao càng tốt
  const rated = days.map((d, i) => ({ d, i })).filter(({ d }) => typeof d.rating === 'number');
  const ratingLine = rated.map(({ d, i }) => `${x(i)},${H - padB - ((d.rating! - 1) / 4) * (H - padB - 10)}`).join(' ');
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  const avgProfit = days.reduce((n, d) => n + d.profit, 0) / days.length;
  const zero = H - padB;
  return (
    <>
      <h2 style={styles.title}>📈 Sổ theo dõi 30 ngày</h2>
      <p style={styles.sub}>Doanh thu và lãi từng ngày (lãi hôm nay chưa trừ lương/tiền nhà tới khi sang ngày mới). Cột xám là số lượt khách. Dùng để nhìn đà tăng trưởng: nhập thêm hàng thì doanh thu có nhích không, khách có đông dần không.</p>
      <svg width={W} height={H} style={{ maxWidth: '100%', background: '#fafbfc', borderRadius: 8, border: '1px solid #e3e6ea' }}>
        <line x1={padL} y1={zero} x2={W - padL} y2={zero} stroke="#d6dae0" />
        {days.map((d, i) => (
          <g key={d.day}>
            <rect x={x(i) - 6} y={yCust(d.customers)} width={12} height={Math.max(1, zero - yCust(d.customers))} fill="#d9dee5" opacity={0.9}>
              <title>{`Ngày ${d.day}: ${d.customers} lượt khách`}</title>
            </rect>
                <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#8a919c">{d.day}</text>
          </g>
        ))}
        <polyline points={line((d) => d.revenue)} fill="none" stroke="#2e86de" strokeWidth={2} />
        <polyline points={line((d) => d.profit)} fill="none" stroke="#27ae60" strokeWidth={2} />
        {rated.length > 1 && <polyline points={ratingLine} fill="none" stroke="#f1c40f" strokeWidth={2} strokeDasharray="5 3" />}
      </svg>
      <p style={{ ...styles.sub, marginTop: 8 }}>
        <span style={{ color: '#2e86de' }}>━ Doanh thu</span> · <span style={{ color: '#27ae60' }}>━ Lãi</span> · <span style={{ color: '#c9a20a' }}>╌ ⭐ đánh giá</span> · ▮ Khách
      </p>
      <p style={styles.row}>
        🏆 Lãi nhất: <b>ngày {best.day}</b> — doanh thu {formatMoney(best.revenue)}, lãi {formatMoney(best.profit)}
      </p>
      <p style={styles.row}>📊 Lãi bình quân {days.length} ngày: <b>{formatMoney(avgProfit)}</b>/ngày · khách bình quân <b>{Math.round(days.reduce((n, d) => n + d.customers, 0) / days.length)}</b> lượt/ngày</p>
      {/* Heatmap vị trí kệ: kệ nào bán chạy nhất kể từ khi đặt (xem bản đồ màu ở màn 🏪 Sắp xếp → 🔥) */}
      {(() => {
        const ranked = furnitureList
          .filter((f) => furnitureDef(f.type).tiers > 0)
          .map((f) => ({ f, sold: shelfHeat[f.uid] ?? 0 }))
          .sort((a, b) => b.sold - a.sold);
        if (!ranked.length || ranked.every((r) => r.sold === 0)) return null;
        const top = ranked[0];
        const worst = ranked[ranked.length - 1];
        return (
          <p style={styles.row}>
            🔥 Kệ bán chạy nhất: <b>{furnitureDef(top.f.type).name}</b> ({top.sold} món)
            {worst.sold < top.sold && <> · kệ ế nhất: {furnitureDef(worst.f.type).name} ({worst.sold} món)</>}
            <> · xem bản đồ màu ở <b>🏪 Sắp xếp → 🔥</b>, kệ gần cửa/lối đi được khách để ý hơn</>
          </p>
        );
      })()}
      <Footer onClose={closePanel} />
    </>
  );
}
