import { useMemo, useState } from 'react';
import { useGame } from '../../core/store';
import { productById } from '../../data/products';
import {
  BRAND_LINE_SLOTS, BRAND_UNLOCK, brandLineEligible, brandLineSlots, brandRepTier, brandStockUnits,
  brandWorkshopCapacity, type BrandState,
} from '../../data/brand';
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
  const { level, money, biz, garden, soldEver, foundBrand, addBrandLine, dropBrandLine, buyBrandWorkshop, hireBrandWorker, fireBrandWorker, closePanel } = useGame();
  const [tab, setTab] = useState<Tab>('lines');
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
          <RepBar rep={b.rep} name={b.name} />

          <Tabs<Tab>
            tabs={TABS}
            value={tab}
            onChange={setTab}
          />

          {tab === 'lines' && <LinesTab lines={b.lines} candidates={candidates} slots={brandLineSlots(level)} onAdd={addBrandLine} onDrop={dropBrandLine} stock={brandStockUnits(b)} />}

          {tab === 'workshop' && (
            <WorkshopTab b={b} level={level} money={money} onBuy={buyBrandWorkshop} onHire={hireBrandWorker} onFire={fireBrandWorker} />
          )}

          {tab === 'dealers' && (
            <div style={styles.card}>
              <b>🚛 Bỏ mối đại lý</b>
              <span style={{ fontSize: 12, opacity: 0.75, flex: 1 }}>Ký hợp đồng giao hàng nhãn cho các đại lý theo định kỳ (sẽ mở ở lát sau).</span>
            </div>
          )}

          {tab === 'franchise' && (
            <div style={styles.card}>
              <b>🏮 Nhượng quyền</b>
              <span style={{ fontSize: 12, opacity: 0.75, flex: 1 }}>Mở điểm nhượng quyền bán hàng nhãn — tiếng lan xa, thêm nghĩa vụ cung hàng (sẽ mở ở lát sau).</span>
            </div>
          )}
        </>
      )}

      <Footer onClose={closePanel} children={undefined} />
    </>
  );
}

function RepBar({ rep, name }: { rep: number; name: string }) {
  const tier = brandRepTier(rep);
  return (
    <div style={{ ...styles.card, background: '#41324f' }}>
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 14 }}>🏷️ {name}</b>
        <div style={{ fontSize: 12, opacity: 0.85 }}>Uy tín {Math.round(rep)}/100 · {tier.name} · hàng nhãn bán +{Math.round(tier.premium * 100)}%</div>
        <div style={{ height: 8, background: '#2b2b3a', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${rep}%`, background: '#f39c12', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function WorkshopTab(props: { b: BrandState; level: number; money: number; onBuy: () => void; onHire: () => void; onFire: () => void }) {
  const { b, level, money, onBuy, onHire, onFire } = props;
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
}) {
  const { lines, candidates, slots, onAdd, onDrop, stock } = props;
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        Dòng nhãn: <b>{lines.length}/{slots}</b> · Hàng nhãn trong kho: <b>{stock}</b> đơn vị. Mỗi món mở dòng khi đã
        làm 100 mẻ và bán 500 đơn vị. Dòng tiếp mở ở cấp {BRAND_LINE_SLOTS[lines.length] ?? 'tối đa'}.
      </p>

      {lines.length > 0 && lines.map((l) => (
        <div key={l.productId} style={styles.card}>
          <span style={{ flex: 1 }}><b>{pname(l.productId)}</b> <span style={{ opacity: 0.7 }}>· đóng {l.made} · bán {l.sold}</span></span>
          <button style={styles.btn} onClick={() => onDrop(l.productId)}>Bỏ dòng</button>
        </div>
      ))}
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
