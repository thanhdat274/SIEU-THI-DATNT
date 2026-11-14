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
import { decorRank, decorRankLine } from '../../data/decorRank';
import { decorScoreOf } from '../../data/layout';
import { reputationOf } from '../../data/reputation';
import { activeDepartments, departmentWalled, DEPT_ECON_FROM_TIER, departmentsUnlockedAtTier } from '../../data/departments';
import { EXPANSION_TILE_CAP, MAX_SHOP_TIER, expansionBlock, expansionTilePrice, shopFootprint } from '../../data/expansionTiles';
import { bigBasketInsight, BIG_BASKET_TIER } from '../../data/bigBasket';
import { meatCounterPayoff, meatChainCooled } from '../../data/meatCounterPayoff';
import { isMeat } from '../../data/meat';
import { ADS, adById, adBoost, adPayoff, adPayoffLine, adTodayLine } from '../../data/advertising';
import { nearestLife, shelfLife } from '../../data/freshness';
import { formatMoney } from '../../data/products';
import { shortLabel } from '../shortLabel';
import { newUnlockMark, shelfBuyHint, storeMissRevenue } from '../../data/advice';
import { Callout, Footer, Swatch, styles, Tabs } from './shared';
import { t } from '../../core/i18n';

export function BuildPanel() {
  const [tab, setTab] = useState<'furniture' | 'paint' | 'expand' | 'ads'>('furniture');
  const setBuildMode = useGame((s) => s.setBuildMode);
  const tabs = [
    ['furniture', t('build.noi_that')],
    ['paint', t('build.son_sua')],
    ['expand', t('build.mo_rong_tiem')],
    ['ads', t('build.quang_cao')],
  ] as const;
  return (
    <>
      <h2 style={styles.title}>{t('build.xay_dung')}</h2>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'furniture' && <FurnitureTab />}
      {tab === 'paint' && <PaintTab />}
      {tab === 'expand' && <ExpandTab />}
      {tab === 'ads' && <AdsTab />}
      <Footer onClose={() => useGame.setState({ panel: null })} closeLabel={t('build.di_chuyen_do_co_san')}>
        <button style={styles.btn} onClick={() => setBuildMode(false)}>{t('build.thoat_che_do_xay')}</button>
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
        {t('build.chon_mon_de_dat_vao_tiem')}
      </p>
      {stashed.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <b>{t('build.kho_do')}</b>
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {stashed.map(([type, n]) => (
              <div key={type} style={styles.card}>
                <div style={{ flex: 1 }}><b>{furnitureDef(type).name}</b> × {n}</div>
                <button style={styles.btn} onClick={() => setPlacing({ type, rot: 0, source: 'stash' })}>{t('build.lay_ra_dat')}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {hint && (
        <Callout tone={hint.kind === 'shelf' ? 'ok' : 'info'} style={{ marginBottom: 8 }}
          title={hint.kind === 'shelf' ? t('build.mua_them_ke_hom_nay_dang') : t('build.mua_them_ke_hom_nay_chua')}>
          <div style={{ marginTop: 2, fontSize: 12 }}>{hint.line}</div>
        </Callout>
      )}
      {coldLine && (
        <Callout tone="warn" style={{ marginBottom: 8 }} title={t('build.chuoi_lanh_khu_thit_ca')}>
          <div style={{ marginTop: 2, fontSize: 12 }}>{coldLine}</div>
        </Callout>
      )}
      {level > 30 && (
        <div style={{ fontSize: 12, opacity: 0.85, margin: '4px 0 8px' }}>
          {t('build.bo_do_viet')}{' '}{vietSetCount(furniture)}/{VIET_SET.length}{' '}{t('build.mon')}
          {' · '}{t('build.moc')}{' '}{VIET_SET_TIERS.map(([n, b]) => t('build.mon_2', { n, b })).join(', ')}
          {vietSetDecorBonus(furniture) > 0 && <b>{' '}{t('build.dang')}{vietSetDecorBonus(furniture)}🩷</b>}
        </div>
      )}
      {level > 30 && decorInfo.decorScore > 0 && (
        <div style={{ fontSize: 12, color: '#9ecbff', opacity: 0.9, margin: '2px 0 8px' }}>{decorPayoffLine(decorInfo)}</div>
      )}
      {(() => {
        const rows = decorRank(level, reputationOf(repLog).overall, avgPerVisit, new Set(furniture.map((ff) => ff.type)));
        const line = rows.length >= 2 ? decorRankLine(rows, 3) : '';
        return line ? <div style={{ fontSize: 12, color: '#f1c40f', opacity: 0.9, margin: '0 0 8px' }}>{line}</div> : null;
      })()}
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
            ? decorBuyPayoffLine(decorBuyPayoff(furnitureDef(f.type).price ?? 0, decorD, reputationOf(repLog).overall, level, avgPerVisit))
            : '';
          return (
            <div key={f.type} style={{ ...styles.card, opacity: locked ? 0.5 : 1 }}>
              <div style={{ flex: 1 }}>
                <b>{f.name}</b>{newUnlockMark(f.unlock, level)} · {formatMoney(f.price)}
                <div style={{ fontSize: 12, opacity: 0.75 }}>{f.desc}</div>
                {buyPayoff && <div style={{ fontSize: 12, color: '#9ecbff', opacity: 0.9 }}>{buyPayoff}</div>}
              </div>
              {locked ? (
                <span style={{ fontSize: 12 }}>{f.unlock > level ? t('build.cap', { unlock: f.unlock }) : t('build.chi_ban_dip', { v0: festivalShopName(f) })}</span>
              ) : (
                <>
                  <button style={styles.btn} title={t('build.dat_xem_truoc_chua_tra_tien')} onClick={() => setPlacing({ type: f.type, rot: 0, source: 'trial' })}>
                    {t('build.thu')}
                  </button>
                  <button style={styles.btn} disabled={money < f.price} onClick={() => setPlacing({ type: f.type, rot: 0 })}>
                    {shortLabel(t('build.chon'), f.price, money)}
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
          onClick={() => { void askConfirm(t('build.dap_het_noi_that_trong_tiem'), { danger: true, okLabel: t('build.dap_het') }).then((ok) => ok && demolishAll()); }}
        >
          {t('build.dap_het_xay_lai_tu_dau')}
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
    { part: 'wall', label: t('build.mau_tuong'), swatches: WALL_COLORS },
    { part: 'floor', label: t('build.san_nha'), swatches: FLOOR_COLORS },
    { part: 'roof', label: t('build.mau_mai'), swatches: ROOF_COLORS },
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
      <p style={styles.sub}>{t('build.chon_mau_de_xem_thu_ung')}{' '}{formatMoney(PAINT_PRICE)}.</p>
      {/* Biển hiệu tên tiệm: đặt lại miễn phí bao nhiêu lần cũng được */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '8px 0' }}>
        <b>{t('build.ten_tiem')}</b>
        <input
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('build.tap_hoa_dau_ngo')}
          style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: '#fff', font: 'inherit' }}
        />
        <button style={{ ...styles.btn, marginLeft: 0, opacity: name.trim() === shopName ? 0.5 : 1 }} disabled={name.trim() === shopName} onClick={() => setShopName(name)}>{t('build.doi_ten')}</button>
      </div>
      <ShopPreview style={look} />
      {rows.map((row) => (
        <div key={row.part} style={{ margin: '10px 0' }}>
          <b>{row.label}</b>
          {pick[row.part] !== undefined && <span style={{ fontSize: 12, color: '#f1c40f' }}>{' '}{t('build.dang_xem_thu')}</span>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {row.swatches.map((sw) => {
              const current = style[row.part] === sw.color;
              const chosen = look[row.part] === sw.color;
              return (
                <button
                  key={sw.color}
                  title={current ? t('build.dang_dung', { name: sw.name }) : sw.name}
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
          {changed.length ? t('build.son_lai_phan', { length: changed.length, v1: formatMoney(cost) }) : t('build.chua_doi_mau_nao')}
          {cost > money && <b style={{ color: '#ff7675' }}>{' '}{t('build.khong_du_tien')}</b>}
        </span>
        <button style={{ ...styles.btn, marginLeft: 0 }} disabled={!Object.keys(pick).length} onClick={() => setPick({})}>{t('build.ve_mau_cu')}</button>
        <button
          style={{ ...styles.btn, marginLeft: 0, background: '#f1c40f', color: '#222', fontWeight: 700 }}
          disabled={!changed.length || cost > money}
          onClick={confirmPaint}
        >
          {t('build.xac_nhan_son')}
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
  if (!list.length) return <p style={styles.sub}>{t('build.son_theo_khu_dat_noi_that')}</p>;
  const cur = list.find((d) => d.id === dep) ?? list[0];
  const zp = zonePaint[cur.id] ?? {};
  const rows = [
    { part: 'floor', label: t('build.nen_khu'), swatches: FLOOR_COLORS },
    { part: 'wall', label: t('build.vach_ngan_khu'), swatches: WALL_COLORS },
  ] as const;
  return (
    <div style={{ marginTop: 14 }}>
      <b>{t('build.son_theo_khu')}</b>
      <p style={styles.sub}>Mỗi khu sơn riêng nền & vách ngăn ({formatMoney(PAINT_PRICE)}{t('build.lan_dat_vach_ngan_quanh_khu')}</p>
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
    <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '4px auto 8px', borderRadius: 10, background: '#8ec5ea' }} aria-label={t('build.xem_thu_mau_tiem')}>
      <rect x="0" y="100" width="200" height="20" fill="#7cb05a" />
      <polygon points="30,52 100,18 170,52" fill={hex(style.roof)} stroke="rgba(0,0,0,0.25)" />
      <rect x="40" y="52" width="120" height="50" fill={hex(style.wall)} stroke="rgba(0,0,0,0.2)" />
      <rect x="86" y="68" width="28" height="34" fill={hex(style.floor)} stroke="#6d4c33" strokeWidth="2" />
      <rect x="52" y="64" width="22" height="18" fill="#bfe3f5" stroke="#fff" strokeWidth="2" />
      <rect x="126" y="64" width="22" height="18" fill="#bfe3f5" stroke="#fff" strokeWidth="2" />
      <rect x="66" y="40" width="68" height="12" rx="2" fill="#1d4f91" />
      <text x="100" y="49" fontSize="8" fontWeight="700" textAnchor="middle" fill="#ffd23f">{t('build.tap_hoa')}</text>
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
    pct < 50 ? t('build.con_nhieu_cho_trong_chua_voi') : pct >= 80 ? t('build.sap_chat_mo_de_bay_them') : t('build.vua_da');
  return (
    <>
      <p style={styles.sub}>
        {t('build.mo_rong_thi_mat_tien_giu')}
      </p>
      <div style={{ fontSize: 13, margin: '0 0 10px' }}>
        {t('build.tien_nha_bay_gio')}{' '}<b style={{ color: '#f1c40f' }}>{formatMoney(rentNow)}{t('build.ngay')}</b>
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
        {SHOP_TIERS.map((tier, i) => {
          const done = i <= shopTier;
          const next = i === shopTier + 1;
          const ahead = i > shopTier;
          const rentThen = rentOf(i);
          const rentUp = rentDelta(shopTier, i);
          const usePct = spaceUsePct(furniture, i, shopFootprint(i, extraTilesAll).depth - tier.depth);
          return (
            <div key={tier.name} style={{ ...styles.card, opacity: done || next ? 1 : 0.5 }}>
              <div style={{ flex: 1 }}>
                <b>{tier.name}</b> · {tier.width}×{tier.depth}m
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {i === 0 ? t('build.khoi_dau') : t('build.can_cap', { v0: formatMoney(tier.price), unlock: tier.unlock })}
                </div>
                {i === shopTier && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {t('build.tien_nha_hien_tai')}{' '}<b style={{ color: '#f1c40f' }}>{formatMoney(rentNow)}{t('build.ngay')}</b>
                    {' · '}{t('build.mat_bang_dang_dung')}{usePct}% — {spaceVerdict(usePct)}.
                  </div>
                )}
                {ahead && (
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {t('build.tien_nha_len')}{' '}<b style={{ color: '#f1c40f' }}>{formatMoney(rentThen)}{t('build.ngay')}</b>
                    {' '}(+<b style={{ color: '#f1c40f' }}>{formatMoney(rentUp)}</b>
                    {' — '}{t('build.30_ngay')}{formatMoney(rentUp * 30)}{t('build.chua_ke_thue_tho')}
                    <div style={{ opacity: 0.75 }}>
                      {t('build.do_hien_tai_chiem')}{usePct}% — {spaceVerdict(usePct)}.
                    </div>
                    {next && avgRev7 !== null && (
                      <div style={{ opacity: 0.75 }}>
                        {t('build.tien_nha_moi')}{' '}{Math.round((rentThen / avgRev7) * 100)}{t('build.doanh_thu_binh_quan_7_ngay')}
                      </div>
                    )}
                    {departmentsUnlockedAtTier(i).length > 0 && (
                      <div style={{ color: '#55efc4', opacity: 0.9 }}>
                        {t('build.mo_nganh')}{' '}{departmentsUnlockedAtTier(i).map((d) => `${d.icon} ${d.name}`).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {done && <span>{i === shopTier ? t('build.hien_tai') : '✅'}</span>}
              {next && pendingUpgrade && <span>{t('build.dang_thi_cong')}</span>}
              {next && !pendingUpgrade && (
                level < tier.unlock
                  ? <span style={{ fontSize: 12 }}>{t('build.cap_2')}{' '}{tier.unlock}</span>
                  : <button style={styles.btn} disabled={money < tier.price} onClick={buyUpgrade}>{shortLabel(t('build.thue_tho'), tier.price, money)}</button>
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
        <b>{t('build.o_mo_rong')}</b> · {extraTiles}/{EXPANSION_TILE_CAP}{' '}{t('build.o_khuon')}{' '}{fp.width}×{fp.depth}m
        <div style={{ fontSize: 12, opacity: 0.75 }}>{t('build.moi_o_noi_tiem_sau_them')}</div>
      </div>
      {block ? <span style={{ fontSize: 12 }}>{block}</span>
        : <button style={styles.btn} disabled={money < expansionTilePrice(k)} onClick={buy}>{shortLabel(t('build.mo_o', { k }), expansionTilePrice(k), money)}</button>}
    </div>
  );
}


/** GĐ2219 — Quảng cáo: bỏ tiền kéo khách đi đường trong vài ngày (như điểm decor có hạn). */
export function AdsTab() {
  const level = useGame((s) => s.level);
  const day = useGame((s) => s.day);
  const money = useGame((s) => s.money);
  const stats = useGame((s) => s.stats);
  const repLog = useGame((s) => s.repLog);
  const ad = useGame((s) => s.ad);
  const buyAd = useGame((s) => s.buyAd);
  const avgPerVisit = stats && stats.customers > 0 ? stats.revenue / stats.customers : 0;
  const stars = reputationOf(repLog).overall;
  const boostToday = adBoost(ad, day);
  return (
    <>
      <p style={styles.sub}>{t('build.bo_tien_quang_cao_de_dan')}</p>
      {ad && (() => {
        const adef = adById(ad.defId);
        return (
          <div style={{ ...styles.card, marginBottom: 8, background: 'rgba(241,196,15,.10)' }}>
            <b>{t('build.dang_chay')}{' '}{adef?.name ?? ad.defId}</b>{' '}{t('build.toi_ngay')}{' '}{ad.until}
            {boostToday > 0 && <span style={{ color: '#f1c40f' }}>{' '}{t('build.hom_nay')}{boostToday}{t('build.hut_khach')}</span>}
            {boostToday > 0 && adef && (
              <div style={{ fontSize: 11, marginTop: 2, color: '#9ecbff' }} title={t('build.tinh_theo_phi_chi_tieu_binh')}>{adTodayLine(adef, stars, level, avgPerVisit)}</div>
            )}
          </div>
        );
      })()}
      {ADS.filter((a) => a.unlock <= level).map((def) => {
        const p = adPayoff(def, stars, level, avgPerVisit);
        const active = ad?.defId === def.id;
        return (
          <div key={def.id} style={{ ...styles.card, opacity: active ? 0.85 : 1 }}>
            <div style={{ flex: 1 }}>
              <b>{def.icon} {def.name}</b> · {formatMoney(def.cost)}
              <div style={{ fontSize: 12, opacity: 0.75 }}>{def.desc}</div>
              <div style={{ fontSize: 12, color: '#9ecbff' }}>{adPayoffLine(p)}</div>
            </div>
            <button style={styles.btn} disabled={active || money < def.cost} onClick={() => buyAd(def.id)}>
              {active ? t('build.dang_chay_2') : shortLabel(t('build.chay'), def.cost, money)}
            </button>
          </div>
        );
      })}
      {ADS.filter((a) => a.unlock > level).map((def) => (
        <div key={def.id} style={{ ...styles.card, opacity: 0.5 }}>
          <b>{def.icon} {def.name}</b> · {formatMoney(def.cost)}
          <span style={{ fontSize: 12 }}>{' '}{t('build.cap_2')}{' '}{def.unlock}</span>
        </div>
      ))}
    </>
  );
}
