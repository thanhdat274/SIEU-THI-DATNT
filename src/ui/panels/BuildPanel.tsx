import { askConfirm } from '../ConfirmDialog';
import { useEffect, useState } from 'react';
import { useGame } from '../../core/store';
import { FLOOR_COLORS, PAINT_PRICE, ROOF_COLORS, SHOP_TIERS, WALL_COLORS, rentDelta, rentOf, spaceUsePct, type ShopStyle } from '../../data/shopTiers';
import { FURNITURE, furnitureDef, type FurnitureType } from '../../data/furniture';
import { festivalShopName, festivalShopOpen } from '../../data/festivalDeco';
import { FURNITURE_GROUP_TABS, furnitureGroup, type FurnitureGroup } from '../../data/furnitureGroups';
import { VIET_SET, VIET_SET_TIERS, vietSetCount, vietSetDecorBonus } from '../../data/decorSets';
import { decorPayoff, decorPayoffLine } from '../../data/decorPayoff';
import { decorBuyPayoff, decorBuyPayoffLine } from '../../data/decorBuyPayoff';
import { decorScoreOf } from '../../data/layout';
import { reputationOf } from '../../data/reputation';
import { activeDepartments, departmentWalled, DEPT_ECON_FROM_TIER, departmentsUnlockedAtTier } from '../../data/departments';
import { EXPANSION_TILE_CAP, MAX_SHOP_TIER, expansionBlock, expansionTilePrice, shopFootprint } from '../../data/expansionTiles';
import { bigBasketInsight, BIG_BASKET_TIER } from '../../data/bigBasket';
import { meatCounterPayoff, meatChainCooled } from '../../data/meatCounterPayoff';
import { isMeat } from '../../data/meat';
import { nearestLife, shelfLife } from '../../data/freshness';
import { formatMoney } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { newUnlockMark, shelfBuyHint, storeMissRevenue } from '../../data/advice';
import { Callout, Footer, Swatch, styles, Tabs } from './shared';

export function BuildPanel() {
  const [tab, setTab] = useState<'furniture' | 'paint' | 'expand'>('furniture');
  const setBuildMode = useGame((s) => s.setBuildMode);
  const tabs = [
    ['furniture', '🪑 Nội thất'],
    ['paint', '🎨 Sơn sửa'],
    ['expand', '🏗️ Mở rộng tiệm'],
  ] as const;
  return (
    <>
      <h2 style={styles.title}>🛠️ Xây dựng</h2>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'furniture' && <FurnitureTab />}
      {tab === 'paint' && <PaintTab />}
      {tab === 'expand' && <ExpandTab />}
      <Footer onClose={() => useGame.setState({ panel: null })} closeLabel="Di chuyển đồ có sẵn">
        <button style={styles.btn} onClick={() => setBuildMode(false)}>Thoát chế độ xây</button>
      </Footer>
    </>
  );
}

export function FurnitureTab() {
  const { level, day, money, furniture, storage, stats, weather, setPlacing, demolishAll, repLog } = useGame();
  const furnStash = useGame((s) => s.furnStash);
  // GĐ2214 — tổng điểm 🩷 decor đang kéo bao nhiêu khách/tiền mỗi ngày (soi lợi ích trang trí).
  const avgPerVisit = stats && stats.customers > 0 ? stats.revenue / stats.customers : 0;
  const decorInfo = decorPayoff(
    decorScoreOf(furniture),
    reputationOf(repLog).overall,
    level,
    avgPerVisit,
  );
  // GĐ1516 — lọc theo nhóm (UI thuần, không lưu)
  const [group, setGroup] = useState<'all' | FurnitureGroup>('all');
  const stashed = Object.entries(furnStash).filter(([, n]) => n > 0) as [FurnitureType, number][];
  // GĐ1251: soi quyết định MUA KỆ bằng số liệu bỏ lỡ hôm nay (storeMissRevenue GĐ131) —
  // trước giờ dữ liệu này chỉ hiện ở Kho/Báo cáo, còn nơi mua kệ lại chỉ chìa giá.
  const hint = shelfBuyHint(storeMissRevenue(stats?.missLog, storage));
  // GĐ-C: chuỗi lạnh ngành "Khu thịt cá" — thịt/cá ĐANG để ẤM sẽ hỏng đêm nay, soi để chủ dọn sang chỗ mát.
  const coldLine = (() => {
    const lots = furniture.flatMap((f) =>
      (f.tiers ?? []).flatMap((t) =>
        t.productId && t.count > 0 && isMeat(t.productId)
          ? [{ productId: t.productId, qty: t.count, life: nearestLife(t.lots) ?? shelfLife(t.productId), place: meatChainCooled(f.type) ? ('chilled' as const) : ('warm' as const) }]
          : [],
      ),
    );
    if (!lots.length) return null;
    return meatCounterPayoff(lots, weather, furniture.some((f) => f.type === 'meat_counter')).line;
  })();
  return (
    <>
      <p style={styles.sub}>
        Chọn món để đặt vào tiệm. "Thử" để đặt xem trước, ưng mới trả tiền. Bấm "Di chuyển đồ có sẵn" rồi bấm vào đồ để dời, cất kho (giữ nguyên giá trị) hoặc bán (nhận lại 50%).
      </p>
      {stashed.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <b>📦 Kho đồ</b>
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {stashed.map(([type, n]) => (
              <div key={type} style={styles.card}>
                <div style={{ flex: 1 }}><b>{furnitureDef(type).name}</b> × {n}</div>
                <button style={styles.btn} onClick={() => setPlacing({ type, rot: 0, source: 'stash' })}>Lấy ra đặt</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {hint && (
        <Callout tone={hint.kind === 'shelf' ? 'ok' : 'info'} style={{ marginBottom: 8 }}
          title={hint.kind === 'shelf' ? '💡 Mua thêm kệ hôm nay đáng' : '💡 Mua thêm kệ hôm nay chưa giúp'}>
          <div style={{ marginTop: 2, fontSize: 12 }}>{hint.line}</div>
        </Callout>
      )}
      {coldLine && (
        <Callout tone="warn" style={{ marginBottom: 8 }} title="🥩 Chuỗi lạnh Khu thịt cá">
          <div style={{ marginTop: 2, fontSize: 12 }}>{coldLine}</div>
        </Callout>
      )}
      {level > 30 && (
        <div style={{ fontSize: 12, opacity: 0.85, margin: '4px 0 8px' }}>
          🏺 Bộ Đồ Việt: {vietSetCount(furniture)}/{VIET_SET.length} món
          {' · '}mốc {VIET_SET_TIERS.map(([n, b]) => `${n} món +${b}🩷`).join(', ')}
          {vietSetDecorBonus(furniture) > 0 && <b> · đang +{vietSetDecorBonus(furniture)}🩷</b>}
        </div>
      )}
      {level > 30 && decorInfo.decorScore > 0 && (
        <div style={{ fontSize: 12, color: '#9ecbff', opacity: 0.9, margin: '2px 0 8px' }}>{decorPayoffLine(decorInfo)}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {FURNITURE_GROUP_TABS.map((t) => (
          <button key={t.id} style={{ ...styles.btn, opacity: group === t.id ? 1 : 0.55 }} aria-pressed={group === t.id} onClick={() => setGroup(t.id)}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {FURNITURE.filter((f) => group === 'all' || furnitureGroup(f) === group).map((f) => {
          const offFest = !festivalShopOpen(f, day);
          const locked = f.unlock > level || offFest;
          const decorD = furnitureDef(f.type).decor ?? 0;
          const buyPayoff = decorD > 0
            ? decorBuyPayoffLine(decorBuyPayoff(furnitureDef(f.type).price, decorD, reputationOf(repLog).overall, level, avgPerVisit))
            : '';
          return (
            <div key={f.type} style={{ ...styles.card, opacity: locked ? 0.5 : 1 }}>
              <div style={{ flex: 1 }}>
                <b>{f.name}</b>{newUnlockMark(f.unlock, level)} · {formatMoney(f.price)}
                <div style={{ fontSize: 12, opacity: 0.75 }}>{f.desc}</div>
                {buyPayoff && <div style={{ fontSize: 12, color: '#9ecbff', opacity: 0.9 }}>{buyPayoff}</div>}
              </div>
              {locked ? (
                <span style={{ fontSize: 12 }}>{f.unlock > level ? `🔒 Cấp ${f.unlock}` : `🗓 Chỉ bán dịp ${festivalShopName(f)}`}</span>
              ) : (
                <>
                  <button style={styles.btn} title="Đặt xem trước, chưa trả tiền" onClick={() => setPlacing({ type: f.type, rot: 0, source: 'trial' })}>
                    Thử
                  </button>
                  <button style={styles.btn} disabled={money < f.price} onClick={() => setPlacing({ type: f.type, rot: 0 })}>
                    {shortLabel('Chọn', f.price, money)}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          style={{ ...styles.btn, marginLeft: 0, background: '#e74c3c', color: '#fff' }}
          disabled={!furniture.length}
          onClick={() => { void askConfirm('Đập hết nội thất trong tiệm? Nhận lại 50% tiền, hàng trên kệ về kho.', { danger: true, okLabel: 'Đập hết' }).then((ok) => ok && demolishAll()); }}
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
          {cost > money && <b style={{ color: '#ff7675' }}> · không đủ tiền</b>}
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
      <ZonePaintSection />
    </>
  );
}

/** GĐ1943 — sơn nền/vách riêng cho từng khu siêu thị đang hoạt động (từ bậc Siêu thị tạp hóa). */
function ZonePaintSection() {
  const shopTier = useGame((s) => s.shopTier);
  const furniture = useGame((s) => s.furniture);
  const zonePaint = useGame((s) => s.zonePaint) ?? {};
  const money = useGame((s) => s.money);
  const paintZone = useGame((s) => s.paintZone);
  const [dep, setDep] = useState<string | null>(null);
  if (shopTier < DEPT_ECON_FROM_TIER) return null;
  const list = activeDepartments(furniture, shopTier);
  if (!list.length) return <p style={styles.sub}>🏬 Sơn theo khu: đặt nội thất chủ chốt để mở khu siêu thị.</p>;
  const cur = list.find((d) => d.id === dep) ?? list[0];
  const zp = zonePaint[cur.id] ?? {};
  const rows = [
    { part: 'floor', label: 'Nền khu', swatches: FLOOR_COLORS },
    { part: 'wall', label: 'Vách ngăn khu', swatches: WALL_COLORS },
  ] as const;
  return (
    <div style={{ marginTop: 14 }}>
      <b>🏬 Sơn theo khu</b>
      <p style={styles.sub}>Mỗi khu sơn riêng nền & vách ngăn ({formatMoney(PAINT_PRICE)}/lần). Đặt vách ngăn quanh khu thì khu thêm 🩷.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {list.map((d) => (
          <button key={d.id} aria-pressed={d.id === cur.id} onClick={() => setDep(d.id)}
            style={{ ...styles.btn, marginLeft: 0, outline: d.id === cur.id ? '3px solid #f1c40f' : 'none' }}>
            {d.icon} {d.name}{departmentWalled(d, furniture) ? ' 🧱' : ''}
          </button>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.part} style={{ margin: '8px 0' }}>
          <b>{row.label}</b>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {row.swatches.map((sw) => (
              <button key={sw.color} disabled={zp[row.part] === sw.color || money < PAINT_PRICE}
                onClick={() => paintZone(cur.id, row.part, sw.color)}
                style={{ ...styles.btn, marginLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Swatch color={sw.color} /> {sw.name}{zp[row.part] === sw.color ? ' ✓' : ''}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hình tiệm nhìn chính diện để xem thử màu mái, tường, sàn. */
export function ShopPreview({ style }: { style: ShopStyle }) {
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
  const extraTilesAll = useGame((s) => s.extraTiles) ?? 0;
  const { shopTier, pendingUpgrade, level, money, buyUpgrade, furniture, history } = useGame();
  const rentNow = rentOf(shopTier);
  // Doanh thu bình quân 7 ngày gần nhất — chỉ đáng tin khi có ≥ 3 ngày thật sự bán được hàng.
  const recent = history.slice(-7);
  const avgRev7 =
    recent.filter((d) => d.revenue > 0).length >= 3
      ? Math.round(recent.reduce((s, d) => s + d.revenue, 0) / recent.length)
      : null;
  const spaceVerdict = (pct: number) =>
    pct < 50 ? 'còn nhiều chỗ trống, chưa vội mở rộng' : pct >= 80 ? 'sắp chật, mở để bày thêm' : 'vừa đà';
  return (
    <>
      <p style={styles.sub}>
        Mở rộng thì mặt tiền giữ nguyên, tiệm nới ra phía sau và hai bên. Đồ đạc giữ nguyên chỗ. Thợ làm qua đêm.
      </p>
      <div style={{ fontSize: 13, margin: '0 0 10px' }}>
        💰 Tiền nhà bây giờ: <b style={{ color: '#f1c40f' }}>{formatMoney(rentNow)}/ngày</b>
      </div>
      {(() => {
        const hasCart = furniture.some((f) => f.type === 'cartStation');
        const hasBig = furniture.some((f) => f.type === 'bigShelf');
        const bb = bigBasketInsight(shopTier, hasCart, hasBig);
        if (bb.line && (shopTier >= BIG_BASKET_TIER || hasCart || hasBig)) {
          return <div style={{ fontSize: 12, color: '#55efc4', margin: '0 0 8px' }}>{bb.line}</div>;
        }
        return null;
      })()}
      <div style={{ display: 'grid', gap: 8 }}>
        {SHOP_TIERS.map((t, i) => {
          const done = i <= shopTier;
          const next = i === shopTier + 1;
          const ahead = i > shopTier;
          const rentThen = rentOf(i);
          const rentUp = rentDelta(shopTier, i);
          const usePct = spaceUsePct(furniture, i, shopFootprint(i, extraTilesAll).depth - t.depth);
          return (
            <div key={t.name} style={{ ...styles.card, opacity: done || next ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <b>{t.name}</b> · {t.width}×{t.depth}m
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {i === 0 ? 'Khởi đầu' : `${formatMoney(t.price)} · cần cấp ${t.unlock}`}
                </div>
                {i === shopTier && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Tiền nhà hiện tại: <b style={{ color: '#f1c40f' }}>{formatMoney(rentNow)}/ngày</b>
                    {' · '}Mặt bằng đang dùng ~{usePct}% — {spaceVerdict(usePct)}.
                  </div>
                )}
                {ahead && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Tiền nhà lên <b style={{ color: '#f1c40f' }}>{formatMoney(rentThen)}/ngày</b>
                    {' '}(+<b style={{ color: '#f1c40f' }}>{formatMoney(rentUp)}</b>
                    {' — '}30 ngày ~+{formatMoney(rentUp * 30)}), chưa kể thuê thợ.
                    <div style={{ opacity: 0.75 }}>
                      Đồ hiện tại chiếm ~{usePct}% — {spaceVerdict(usePct)}.
                    </div>
                    {next && avgRev7 !== null && (
                      <div style={{ opacity: 0.75 }}>
                        Tiền nhà mới ≈ {Math.round((rentThen / avgRev7) * 100)}% doanh thu bình quân 7 ngày.
                      </div>
                    )}
                    {departmentsUnlockedAtTier(i).length > 0 && (
                      <div style={{ color: '#55efc4', opacity: 0.9 }}>
                        🆕 Mở ngành: {departmentsUnlockedAtTier(i).map((d) => `${d.icon} ${d.name}`).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {done && <span>{i === shopTier ? '📍 Hiện tại' : '✅'}</span>}
              {next && pendingUpgrade && <span>🏗️ Đang thi công</span>}
              {next && !pendingUpgrade && (
                level < t.unlock
                  ? <span style={{ fontSize: 12 }}>🔒 Cấp {t.unlock}</span>
                  : <button style={styles.btn} disabled={money < t.price} onClick={buyUpgrade}>{shortLabel('Thuê thợ', t.price, money)}</button>
              )}
            </div>
          );
        })}
      </div>
      <ExpansionTiles />
    </>
  );
}

/** GĐ1944 — ô mở rộng tiếp giáp phía sau, chỉ mở ở bậc Đại siêu thị. */
function ExpansionTiles() {
  const shopTier = useGame((s) => s.shopTier);
  const extraTiles = useGame((s) => s.extraTiles) ?? 0;
  const money = useGame((s) => s.money);
  const buy = useGame((s) => s.buyExpansionTile);
  if (shopTier < MAX_SHOP_TIER) return null;
  const k = extraTiles + 1;
  const block = expansionBlock(shopTier, extraTiles);
  const fp = shopFootprint(shopTier, extraTiles);
  return (
    <div style={{ ...styles.card, marginTop: 8 }}>
      <div style={{ flex: 1 }}>
        <b>🧱 Ô mở rộng</b> · {extraTiles}/{EXPANSION_TILE_CAP} ô · khuôn {fp.width}×{fp.depth}m
        <div style={{ fontSize: 12, opacity: 0.75 }}>Mỗi ô nới tiệm sâu thêm 1 m về phía sau, nối liền tường sau.</div>
      </div>
      {block ? <span style={{ fontSize: 12 }}>{block}</span>
        : <button style={styles.btn} disabled={money < expansionTilePrice(k)} onClick={buy}>{shortLabel(`Mở ô ${k}`, expansionTilePrice(k), money)}</button>}
    </div>
  );
}

