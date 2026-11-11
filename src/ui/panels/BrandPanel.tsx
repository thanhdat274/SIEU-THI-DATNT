import { useMemo, useState } from 'react';
import { useFocusPulse } from '../focusPulse';
import { useGame } from '../../core/store';
import { productById } from '../../data/products';
import {
  BRAND_DEALER_UNLOCK, BRAND_DEAL_CUT_AFTER, BRAND_DEALERS, BRAND_FRANCHISE_REP, BRAND_FRANCHISE_SETUP,
  BRAND_FRANCHISE_SLOTS, BRAND_FRANCHISE_UNLOCK, BRAND_LINE_SLOTS, BRAND_RIVAL_STRENGTH_GAIN,
  BRAND_UNLOCK, brandDealerById, brandDealersAvail, brandLineEligible, brandLineSlots, brandRepTier,
  brandStockUnits, brandDealValue, brandRivalValue, brandWorkshopCapacity, franchiseIncome,
  type BrandState,
} from '../../data/brand';
import { franchisePayoff } from '../../data/franchisePayoff';
import { brandLinePayoff } from '../../data/brandLinePayoff';
import { brandWorkshopPayoff } from '../../data/brandWorkshopPayoff';
import { Footer, styles, Tabs } from './shared';

type Tab = 'lines' | 'workshop' | 'dealers' | 'franchise';
const TABS: readonly [Tab, string][] = [
  ['lines', '🏷️ Dòng hàng'],
  ['workshop', '🏭 Xưởng'],
  ['dealers', '🚛 Bỏ mối'],
  ['franchise', '🏮 Nhượng quyền'],
];

const vnd = (n: number) => `${(n ?? 0).toLocaleString('vi-VN')}đ`;
const pname = (id: string) => (productById(id)?.name ?? id).replace(/\s*\([^)]*\)\s*$/, '');

/**
 * Hệ 4 (SPEC-CHIEU-SAU §4.10) — NHÃN HÀNG RIÊNG: 4 tab Dòng hàng · Xưởng · Bỏ mối · Nhượng quyền,
 * đầu panel là thanh uy tín + các dòng repLog gần nhất. Nội dung dựng dần theo lát: L2 làm Dòng hàng,
 * Xưởng/Bỏ mối/Nhượng quyền sẽ mở ở các lát sau.
 */
export function BrandPanel() {
  const { level, money, biz, garden, soldEver, storage, foundBrand, addBrandLine, dropBrandLine, buyBrandWorkshop, hireBrandWorker, fireBrandWorker, acceptBrandDeal, commitBrandDeal, releaseBrandDeal, deliverBrandDeal, acceptRivalSupply, openFranchise, closeFranchise, closePanel, day } = useGame();
  // T6-L3: mở từ Sổ việc có thể tới thẳng một tab nhãn (`focus: 'lines' | 'workshop' | 'dealers' | 'franchise'`).
  const initialFocus = useGame((s) => (s.panel?.type === 'brand' ? s.panel.focus : undefined));
  const [tab, setTab] = useState<Tab>(initialFocus && (['lines', 'workshop', 'dealers', 'franchise'] as string[]).includes(initialFocus) ? (initialFocus as Tab) : 'lines');
  useFocusPulse(initialFocus);
  const [name, setName] = useState('');
  const b = biz.brand;

  // Ứng viên dán nhãn: món nhà làm đã có mẻ làm (preserveMade > 0), kèm trạng thái đủ điều kiện.
  const candidates = useMemo(() => {
    const made = garden.preserveMade ?? {};
    return Object.keys(made)
      .filter((id) => (made[id] ?? 0) > 0)
      .map((id) => ({ id, made: made[id] ?? 0, sold: soldEver?.[id] ?? 0, eligible: brandLineEligible(made[id] ?? 0, soldEver?.[id] ?? 0) }))
      .sort((a, z) => (z.eligible ? 1 : 0) - (a.eligible ? 1 : 0) || z.made - a.made);
  }, [garden.preserveMade, soldEver]);

  return (
    <>
      <h2 style={styles.title}>🏷️ Nhãn hàng riêng</h2>
      <p style={styles.sub}>
        Những món nhà làm đã thành thạo được dán nhãn mang tên tiệm, sản xuất theo lô ở xưởng, rồi bỏ mối cho
        đại lý và tiệm nhượng quyền — việc cuối game là giữ uy tín một thương hiệu. Mở từ cấp {BRAND_UNLOCK}.
      </p>

      {!b && (
        <div style={styles.card}>
          <div style={{ flex: 1 }}>
            <b>Lập nhãn</b>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              Đặt tên nhãn (≤ 24 ký tự) — tên sẽ theo các dòng hàng, đại lý và nhượng quyền.
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="VD: Nước mắm nhà Năm"
              style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, border: '1px solid #555', background: '#2b2b3a', color: '#f5f5f5' }}
            />
          </div>
          <button style={styles.btn} onClick={() => foundBrand(name)}>Khai trương nhãn</button>
        </div>
      )}

      {b && (
        <>
          <RepBar rep={b.rep} name={b.name} repLog={b.repLog} />

          <div data-focus={tab}>
          <Tabs<Tab>
            tabs={TABS}
            value={tab}
            onChange={setTab}
          />
          </div>

          {tab === 'lines' && <LinesTab lines={b.lines} candidates={candidates} slots={brandLineSlots(level)} onAdd={addBrandLine} onDrop={dropBrandLine} stock={brandStockUnits(b)} payoff={brandLinePayoff(b).rows} />}

          {tab === 'workshop' && (
            <WorkshopTab b={b} level={level} money={money} storage={storage} onBuy={buyBrandWorkshop} onHire={hireBrandWorker} onFire={fireBrandWorker} />
          )}

          {tab === 'dealers' && (
            <DealersTab b={b} level={level} rep={b.rep} day={day} rival={biz.rival ?? null}
              onAccept={acceptBrandDeal} onCommit={commitBrandDeal} onRelease={releaseBrandDeal}
              onDeliver={deliverBrandDeal} onRivalSupply={acceptRivalSupply} />
          )}

          {tab === 'franchise' && (
            <FranchiseTab b={b} level={level} money={money} onOpen={openFranchise} onClose={closeFranchise} />
          )}
        </>
      )}

      <Footer onClose={closePanel} children={undefined} />
    </>
  );
}

function RepBar({ rep, name, repLog }: { rep: number; name: string; repLog: { day: number; delta: number; why: string }[] }) {
  const tier = brandRepTier(rep);
  return (
    <div style={{ ...styles.card, background: '#41324f' }}>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 14 }}>🏷️ {name}</b>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Uy tín {Math.round(rep)}/100 · {tier.name} · hàng nhãn bán +{Math.round(tier.premium * 100)}%</div>
        <div style={{ height: 8, background: '#2b2b3a', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${rep}%`, background: '#f39c12', borderRadius: 4 }} />
        </div>
        {repLog.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            {repLog.slice(-4).reverse().map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <span style={{ opacity: 0.6 }}>ngày {e.day}</span>
                <span style={{ color: e.delta >= 0 ? '#7ee787' : '#ff7b72', width: 40 }}>{e.delta >= 0 ? `+${e.delta}` : e.delta}</span>
                <span style={{ flex: 1 }}>{e.why}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkshopTab(props: { b: BrandState; level: number; money: number; storage: Record<string, number>; onBuy: () => void; onHire: () => void; onFire: () => void }) {
  const { b, level, money, storage, onBuy, onHire, onFire } = props;
  const w = b.workshop;
  const vnd = (n: number) => `${(n ?? 0).toLocaleString('vi-VN')}đ`;
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        Mỗi đêm xưởng lấy hàng chưa nhãn trong kho của các dòng, đóng thành hàng <b>mang nhãn</b> (bán theo bậc
        uy tín). Công suất = thợ × bậc xưởng, phí bao bì 8% giá bán + lương thợ. Mở từ cấp 100.
      </p>

      {!w?.open && (
        <div style={styles.card}>
          <div style={{ flex: 1 }}>
            <b>Mua xưởng đóng gói</b>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{vnd(60000000)} · mở mặt bằng để đóng hàng mang nhãn theo lô.</div>
          </div>
          <button style={styles.btn} disabled={level < 100 || money < 60000000} onClick={onBuy}>Mua xưởng</button>
        </div>
      )}

      {w?.open && (
        <>
          <div style={styles.card}>
            <div style={{ flex: 1 }}>
              <b>🏭 Xưởng đóng gói</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Thợ {w.staff}/3 · công suất/đêm ≈ <b>{brandWorkshopCapacity(w)}</b> đơn vị · lương thợ/đêm {vnd(w.staff * 150000)} · phí bao bì 8% giá bán.
                {' '}Hàng nhãn trong kho: {brandStockUnits(b)} đơn vị.
              </div>
              <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>📊 {brandWorkshopPayoff(b, storage).line}</div>
            </div>
            <button style={styles.btn} disabled={w.staff >= 3} onClick={onHire}>+ Thuê thợ</button>
            <button style={styles.btn} disabled={w.staff <= 0} onClick={onFire}>− Cho nghỉ</button>
          </div>
          <p style={{ ...styles.sub, marginTop: 8 }}>
            Hệ 1 — món nào trong dòng hàng còn nguyên liệu thô ở kho, xưởng sẽ tự đóng qua đêm. Sau vài đêm mở lại
            tab này để thấy hàng nhãn tích trong kho, rồi bán lẻ (hoặc lát sau bỏ mối đại lý).
          </p>
        </>
      )}
    </div>
  );
}

function LinesTab(props: {
  lines: { productId: string; made: number; sold: number }[];
  candidates: { id: string; made: number; sold: number; eligible: boolean }[];
  slots: number;
  onAdd: (id: string) => void;
  onDrop: (id: string) => void;
  stock: number;
  payoff: { productId: string; line: string }[];
}) {
  const { lines, candidates, slots, onAdd, onDrop, stock, payoff } = props;
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        Dòng nhãn: <b>{lines.length}/{slots}</b> · Hàng nhãn trong kho: <b>{stock}</b> đơn vị. Mỗi món mở dòng khi đã
        làm 100 mẻ và bán 500 đơn vị. Dòng tiếp mở ở cấp {BRAND_LINE_SLOTS[lines.length] ?? 'tối đa'}.
      </p>

      {lines.length > 0 && lines.map((l) => {
        const blp = payoff.find((r) => r.productId === l.productId);
        return (
          <div key={l.productId} style={styles.card}>
            <span style={{ flex: 1 }}><b>{pname(l.productId)}</b> <span style={{ opacity: 0.7 }}>· đóng {l.made} · bán {l.sold}</span>
              {blp && <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>📊 {blp.line}</div>}
            </span>
            <button style={styles.btn} onClick={() => onDrop(l.productId)}>Bỏ dòng</button>
          </div>
        );
      })}
      {lines.length === 0 && <p style={styles.sub}>Chưa có dòng nhãn nào. Bên dưới là các món nhà làm đã thực hiện — chọn món đủ điều kiện để thêm.</p>}

      {candidates.length > 0 && (
        <>
          <p style={{ ...styles.sub, marginTop: 12 }}>Món nhà làm của bạn:</p>
          {candidates.map((c) => (
            <div key={c.id} style={styles.card}>
              <span style={{ flex: 1 }}>
                <b>{pname(c.id)}</b> <span style={{ opacity: 0.7 }}>· {c.made} mẻ · bán {c.sold}</span>
                {!c.eligible && <span style={{ opacity: 0.6 }}> · cần {(c.made < 100 ? `${100 - c.made} mẻ` : '')}{(c.made < 100 && c.sold < 500 ? ' và ' : '')}{c.sold < 500 ? `bán ${500 - c.sold} đv` : ''}</span>}
              </span>
              <button style={styles.btn} disabled={!c.eligible || lines.some((l) => l.productId === c.id) || lines.length >= slots} onClick={() => onAdd(c.id)}>
                Thêm dòng
              </button>
            </div>
          ))}
        </>
      )}
      {candidates.length === 0 && <p style={styles.sub}>Chưa có món nhà làm nào — qua Hệ 1 (Sân phơi · Muối · Ủ) hoàn các mẻ để dồn mẻ làm.</p>}
    </div>
  );
}

function DealersTab(props: {
  b: BrandState; level: number; rep: number; day: number; rival: { name: string; strength: number } | null;
  onAccept: (dealerId: string, productId: string) => void;
  onCommit: (id: string) => void; onRelease: (id: string) => void; onDeliver: (id: string) => boolean;
  onRivalSupply: () => void;
}) {
  const { b, level, rep, day, rival, onAccept, onCommit, onRelease, onDeliver, onRivalSupply } = props;
  const avail = brandDealersAvail(level, rep);
  const reSign = (id: string) => {
    const r = b.reopenDays?.[id];
    return r === undefined ? 0 : Math.max(0, r - day);
  };
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        Ký hợp đồng giao hàng nhãn cho đại lý theo định kỳ — giá mua lại thấp hơn bán lẻ nhưng số lượng nhiều
        và đều. Giao đúng hẹn +2 uy tín, trễ −4, bỏ kỳ −8; <b>{BRAND_DEAL_CUT_AFTER} kỳ hỏng liên tiếp thì bị cắt
        hợp đồng</b> (30 ngày sau mới ký lại). Mở từ cấp {BRAND_DEALER_UNLOCK}.
      </p>

      {rival && rival.strength > 0 && (
        <div style={{ ...styles.card, background: '#4a2c2c' }}>
          <span style={{ flex: 1 }}>
            <b>😈 {rival.name} — đối thủ ghé mua</b>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {b.rivalOffer
                ? `${pname(b.rivalOffer.productId)} × ${b.rivalOffer.units} đơn vị, trả ${brandRivalValue(b.rivalOffer).toLocaleString('vi-VN')}đ (95%) — giành tiền nhưng ${rival.name} +${BRAND_RIVAL_STRENGTH_GAIN} sức mạnh, hàng mình lên kệ họ.`
                : `Đối thủ ${rival.strength} sức mạnh — thỉnh thoảng họ ngỏ ý mua hàng nhãn giá cao để trưng trên kệ.`}
              {b.rivalSold ? ` Đã bán ${b.rivalSold} đơn vị cho rival.` : ''}
            </div>
          </span>
          {b.rivalOffer && <button style={styles.btn} onClick={onRivalSupply}>🤝 Giành tiền đợt này</button>}
        </div>
      )}

      {Object.entries(b.deals).map(([id, deal]) => {
        const def = brandDealerById(id)!;
        const dueIn = deal.dueDay - day;
        const have = b.stock[deal.productId] ?? 0;
        return (
          <div key={id} style={styles.card}>
            <span style={{ flex: 1 }}>
              <b>{def.icon} {def.title}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {pname(deal.productId)} · {def.qty} đv mỗi {def.periodDays} ngày · {brandDealValue(def, deal.productId).toLocaleString('vi-VN')}đ/kỳ
                {' '}· kỳ tới {dueIn <= 0 ? (deal.overdue ? 'QUÁ HẠN' : 'hôm nay') : `${dueIn} ngày nữa`}
                {' '}· kho nhãn {have}/{def.qty}
                {deal.committed ? ' · 🤝 đã cam kết' : ''}
              </div>
            </span>
            {!deal.committed && <button style={styles.btn} disabled={have < def.qty} onClick={() => onCommit(id)}>🤝 Cam kết</button>}
            {deal.committed && <button style={styles.btn} onClick={() => onRelease(id)}>↩️ Hoàn cọc</button>}
            <button style={styles.btn} disabled={have < def.qty} onClick={() => onDeliver(id)}>🚚 Giao kỳ</button>
          </div>
        );
      })}

      {Object.keys(b.deals).length === 0 && <p style={styles.sub}>Chưa có hợp đồng nào — chọn đại lý bên dưới để ký.</p>}

      <p style={{ ...styles.sub, marginTop: 12 }}>Đại lý có thể ký ({avail.length}/{BRAND_DEALERS.length}):</p>
      {avail.map((def) => {
        const deal = b.deals[def.id];
        const reopen = reSign(def.id);
        const unsigned = !deal && reopen === 0;
        return (
          <div key={def.id} style={styles.card}>
            <span style={{ flex: 1 }}>
              <b>{def.icon} {def.title}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {def.qty} đv mỗi {def.periodDays} ngày · {Math.round(def.pricePerUnit * 100)}% giá bán lẻ · cần uy tín {def.rep}
              </div>
            </span>
            {deal
              ? <span style={{ fontSize: 12, opacity: 0.8 }}>đang ký</span>
              : reopen > 0
                ? <span style={{ fontSize: 12, opacity: 0.7 }}>cắt · còn {reopen} ngày</span>
                : <DealerSign def={def} lines={b.lines} onAccept={onAccept} />}
          </div>
        );
      })}
      {avail.length === 0 && <p style={styles.sub}>Chưa có đại lý nào — mở theo cấp và nâng uy tín nhãn.</p>}
    </div>
  );
}

function DealerSign({ def, lines, onAccept }: { def: { id: string; title: string }; lines: { productId: string }[]; onAccept: (id: string, productId: string) => void }) {
  const [sel, setSel] = useState(lines[0]?.productId ?? '');
  return (
    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select value={sel} onChange={(e) => setSel(e.target.value)} disabled={lines.length === 0} style={{ padding: '5px', borderRadius: 6, border: '1px solid #555', background: '#2b2b3a', color: '#f5f5f5' }}>
        {lines.map((l) => <option key={l.productId} value={l.productId}>{pname(l.productId)}</option>)}
      </select>
      <button style={styles.btn} disabled={lines.length === 0 || !sel} onClick={() => onAccept(def.id, sel)}>Ký hợp đồng</button>
    </span>
  );
}

function FranchiseTab(props: { b: BrandState; level: number; money: number; onOpen: (defId: string) => void; onClose: (defId: string) => void }) {
  const { b, level, money, onOpen, onClose } = props;
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        Mở điểm nhượng quyền bán hàng nhãn — mỗi tuần xe tự chở <b>{BRAND_FRANCHISE_SLOTS[0].weekly}</b> đơn vị trở
        lên (tùy quy mô), mỗi đêm điểm trả phí nhượng quyền và cộng uy tín. Thiếu hàng 1 tuần: sức khỏe giảm, uy tín
        −3; thiếu 3 tuần liền: điểm đóng, mất {vnd(BRAND_FRANCHISE_SETUP)} setup. Phí mở {vnd(BRAND_FRANCHISE_SETUP)} · cần uy tín {BRAND_FRANCHISE_REP} · mở từ cấp {BRAND_FRANCHISE_UNLOCK}.
      </p>

      {b.franchises.map((f) => {
        const def = BRAND_FRANCHISE_SLOTS.find((x) => x.id === f.id);
        if (!def) return null;
        const due = b.franchiseDue[f.id];
        const frp = franchisePayoff(b).rows.find((r) => r.id === f.id);
        return (
          <div key={f.id} style={styles.card}>
            <span style={{ flex: 1 }}>
              <b>{def.icon} {def.title}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                khoẻ {f.health}/100 · mỗi tuần {def.weekly} đơn vị · phí/đêm ≈ {franchiseIncome(f.health, b.rep, def.size, 1).toLocaleString('vi-VN')}đ
                {' '}· nhập hàng {due !== undefined ? (due <= 1 ? (due <= 0 ? 'quá hạn' : 'hôm nay') : `còn ${due} ngày`) : '—'}
              </div>
              {frp && (
                <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>
                  📊 {frp.line}
                </div>
              )}
            </span>
            <button style={styles.btn} onClick={() => onClose(f.id)}>Đóng điểm</button>
          </div>
        );
      })}
      {b.franchises.length === 0 && <p style={styles.sub}>Chưa có điểm nhượng quyền nào — chọn suất bên dưới để mở.</p>}

      <p style={{ ...styles.sub, marginTop: 12 }}>Suất nhượng quyền:</p>
      {BRAND_FRANCHISE_SLOTS.map((def) => {
        const has = b.franchises.some((f) => f.id === def.id);
        const locked = level < def.unlock || b.rep < BRAND_FRANCHISE_REP || money < BRAND_FRANCHISE_SETUP || has;
        return (
          <div key={def.id} style={styles.card}>
            <span style={{ flex: 1 }}>
              <b>{def.icon} {def.title}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>cấp {def.unlock} · mỗi tuần {def.weekly} đơn vị · quy mô {def.size}</div>
            </span>
            <button style={styles.btn} disabled={locked} onClick={() => onOpen(def.id)}>{has ? 'Đã mở' : 'Mở điểm'}</button>
          </div>
        );
      })}
    </div>
  );
}
