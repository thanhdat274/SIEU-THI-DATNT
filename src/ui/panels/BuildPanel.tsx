import { useEffect, useState } from 'react';
import { useGame } from '../../core/store';
import { FLOOR_COLORS, PAINT_PRICE, ROOF_COLORS, SHOP_TIERS, WALL_COLORS, rentDelta, rentOf, spaceUsePct, type ShopStyle } from '../../data/shopTiers';
import { FURNITURE } from '../../data/furniture';
import { formatMoney } from '../../data/products';
import { Footer, Swatch, styles, Tabs } from './shared';

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
      <div style={{ display: 'grid', gap: 8 }}>
        {SHOP_TIERS.map((t, i) => {
          const done = i <= shopTier;
          const next = i === shopTier + 1;
          const ahead = i > shopTier;
          const rentThen = rentOf(i);
          const rentUp = rentDelta(shopTier, i);
          const usePct = spaceUsePct(furniture, i);
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
                  </div>
                )}
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
