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
import { brandDealPayoff } from '../../data/brandDealPayoff';
import { Footer, styles, Tabs } from './shared';
import { fmtNum } from '../../core/format';
import { t } from '../../core/i18n';

type Tab = 'lines' | 'workshop' | 'dealers' | 'franchise';
const TABS: readonly [Tab, string][] = [
  ['lines', t('brand.dong_hang')],
  ['workshop', t('brand.xuong')],
  ['dealers', t('brand.bo_moi')],
  ['franchise', t('brand.nhuong_quyen')],
];

const vnd = (n: number) => t('brand.d', { v0: fmtNum((n ?? 0)) });
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
      <h2 style={styles.title}>{t('brand.nhan_hang_rieng')}</h2>
      <p style={styles.sub}>
        {t('brand.nhung_mon_nha_lam_da_thanh')}{' '}{BRAND_UNLOCK}.
      </p>

      {!b && (
        <div style={styles.card}>
          <div style={{ flex: 1 }}>
            <b>{t('brand.lap_nhan')}</b>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {t('brand.dat_ten_nhan_24_ky_tu')}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder={t('brand.vd_nuoc_mam_nha_nam')}
              style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, border: '1px solid #555', background: '#2b2b3a', color: '#f5f5f5' }}
            />
          </div>
          <button style={styles.btn} onClick={() => foundBrand(name)}>{t('brand.khai_truong_nhan')}</button>
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
        <div style={{ fontSize: 12, opacity: 0.85 }}>{t('brand.uy_tin')}{' '}{Math.round(rep)}/100 · {tier.name}{' '}{t('brand.hang_nhan_ban')}{Math.round(tier.premium * 100)}%</div>
        <div style={{ height: 8, background: '#2b2b3a', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${rep}%`, background: '#f39c12', borderRadius: 4 }} />
        </div>
        {repLog.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            {repLog.slice(-4).reverse().map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <span style={{ opacity: 0.6 }}>{t('brand.ngay')}{' '}{e.day}</span>
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
  const vnd = (n: number) => t('brand.d', { v0: fmtNum((n ?? 0)) });
  return (
    <div>
      <p style={{ ...styles.sub, maxWidth: 620 }}>
        {t('brand.moi_dem_xuong_lay_hang_chua')}{' '}<b>{t('brand.mang_nhan')}</b>{' '}{t('brand.ban_theo_bac_uy_tin_cong')}
      </p>

      {!w?.open && (
        <div style={styles.card}>
          <div style={{ flex: 1 }}>
            <b>{t('brand.mua_xuong_dong_goi')}</b>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{vnd(60000000)}{' '}{t('brand.mo_mat_bang_de_dong_hang')}</div>
          </div>
          <button style={styles.btn} disabled={level < 100 || money < 60000000} onClick={onBuy}>{t('brand.mua_xuong')}</button>
        </div>
      )}

      {w?.open && (
        <>
          <div style={styles.card}>
            <div style={{ flex: 1 }}>
              <b>{t('brand.xuong_dong_goi')}</b>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {t('brand.tho')}{' '}{w.staff}{t('brand.3_cong_suat_dem')}{' '}<b>{brandWorkshopCapacity(w)}</b>{' '}{t('brand.don_vi_luong_tho_dem')}{' '}{vnd(w.staff * 150000)}{' '}{t('brand.phi_bao_bi_8_gia_ban')}
                {' '}{t('brand.hang_nhan_trong_kho')}{' '}{brandStockUnits(b)}{' '}{t('brand.don_vi')}
              </div>
              <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>📊 {brandWorkshopPayoff(b, storage).line}</div>
            </div>
            <button style={styles.btn} disabled={w.staff >= 3} onClick={onHire}>{t('brand.thue_tho')}</button>
            <button style={styles.btn} disabled={w.staff <= 0} onClick={onFire}>{t('brand.cho_nghi')}</button>
          </div>
          <p style={{ ...styles.sub, marginTop: 8 }}>
            {t('brand.he_1_mon_nao_trong_dong')}
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
      <p style={styles.sub}>
        {t('brand.dong_nhan')}{' '}<b>{lines.length}/{slots}</b>{' '}{t('brand.hang_nhan_trong_kho_2')}{' '}<b>{stock}</b>{' '}{t('brand.don_vi_moi_mon_mo_dong')}{' '}{BRAND_LINE_SLOTS[lines.length] ?? t('brand.toi_da')}.
      </p>

      {lines.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {lines.map((l) => {
            const blp = payoff.find((r) => r.productId === l.productId);
            return (
              <div key={l.productId} style={styles.card}>
                <span style={{ flex: 1 }}><b>{pname(l.productId)}</b> <span style={{ opacity: 0.7 }}>{t('brand.dong')}{' '}{l.made}{' '}{t('brand.ban')}{' '}{l.sold}</span>
                  {blp && <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>📊 {blp.line}</div>}
                </span>
                <button style={styles.btn} onClick={() => onDrop(l.productId)}>{t('brand.bo_dong')}</button>
              </div>
            );
          })}
        </div>
      )}
      {lines.length === 0 && <p style={styles.sub}>{t('brand.chua_co_dong_nhan_nao_ben')}</p>}

      {candidates.length > 0 && (
        <>
          <p style={{ ...styles.sub, marginTop: 12 }}>{t('brand.mon_nha_lam_cua_ban')}</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {candidates.map((c) => (
              <div key={c.id} style={styles.card}>
                <span style={{ flex: 1 }}>
                  <b>{pname(c.id)}</b> <span style={{ opacity: 0.7 }}>· {c.made}{' '}{t('brand.me_ban')}{' '}{c.sold}</span>
                  {!c.eligible && <span style={{ opacity: 0.6 }}>{' '}{t('brand.can')}{' '}{(c.made < 100 ? t('brand.me', { v0: 100 - c.made }) : '')}{(c.made < 100 && c.sold < 500 ? t('brand.va') : '')}{c.sold < 500 ? t('brand.ban_dv', { v0: 500 - c.sold }) : ''}</span>}
                </span>
                <button style={styles.btn} disabled={!c.eligible || lines.some((l) => l.productId === c.id) || lines.length >= slots} onClick={() => onAdd(c.id)}>
                  {t('brand.them_dong')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {candidates.length === 0 && <p style={styles.sub}>{t('brand.chua_co_mon_nha_lam_nao')}</p>}
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
      <p style={styles.sub}>
        {t('brand.ky_hop_dong_giao_hang_nhan')}{' '}<b>{BRAND_DEAL_CUT_AFTER}{' '}{t('brand.ky_hong_lien_tiep_thi_bi')}</b>{' '}{t('brand.30_ngay_sau_moi_ky_lai')}{' '}{BRAND_DEALER_UNLOCK}.
      </p>

      {rival && rival.strength > 0 && (
        <div style={{ ...styles.card, background: '#4a2c2c', marginBottom: 6 }}>
          <span style={{ flex: 1 }}>
            <b>😈 {rival.name}{' '}{t('brand.doi_thu_ghe_mua')}</b>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {b.rivalOffer
                ? t('brand.don_vi_tra_d_95_gianh', { v0: pname(b.rivalOffer.productId), units: b.rivalOffer.units, v2: fmtNum(brandRivalValue(b.rivalOffer)), name: rival.name, BRAND_RIVAL_STRENGTH_GAIN })
                : t('brand.doi_thu_suc_manh_thinh_thoang', { strength: rival.strength })}
              {b.rivalSold ? t('brand.da_ban_don_vi_cho_rival', { rivalSold: b.rivalSold }) : ''}
            </div>
          </span>
          {b.rivalOffer && <button style={styles.btn} onClick={onRivalSupply}>{t('brand.gianh_tien_dot_nay')}</button>}
        </div>
      )}

      {Object.keys(b.deals).length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          {Object.entries(b.deals).map(([id, deal]) => {
            const def = brandDealerById(id)!;
            const dueIn = deal.dueDay - day;
            const have = b.stock[deal.productId] ?? 0;
            const dlp = brandDealPayoff(def, deal.productId, b.rep);
            return (
              <div key={id} style={styles.card}>
                <span style={{ flex: 1 }}>
                  <b>{def.icon} {def.title}</b>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {pname(deal.productId)} · {def.qty}{' '}{t('brand.dv_moi')}{' '}{def.periodDays}{' '}{t('brand.ngay_2')}{' '}{fmtNum(brandDealValue(def, deal.productId))}{t('brand.d_ky')}
                    {' '}{t('brand.ky_toi')}{' '}{dueIn <= 0 ? (deal.overdue ? t('brand.qua_han') : t('brand.hom_nay')) : t('brand.ngay_nua', { dueIn })}
                    {' '}{t('brand.kho_nhan')}{' '}{have}/{def.qty}
                    {deal.committed ? t('brand.da_cam_ket') : ''}
                  </div>
                  <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>📊 {dlp.line}</div>
                </span>
                {!deal.committed && <button style={styles.btn} disabled={have < def.qty} onClick={() => onCommit(id)}>{t('brand.cam_ket')}</button>}
                {deal.committed && <button style={styles.btn} onClick={() => onRelease(id)}>{t('brand.hoan_coc')}</button>}
                <button style={styles.btn} disabled={have < def.qty} onClick={() => onDeliver(id)}>{t('brand.giao_ky')}</button>
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(b.deals).length === 0 && <p style={styles.sub}>{t('brand.chua_co_hop_dong_nao_chon')}</p>}

      <p style={{ ...styles.sub, marginTop: 12 }}>{t('brand.dai_ly_co_the_ky')}{avail.length}/{BRAND_DEALERS.length}):</p>
      <div style={{ display: 'grid', gap: 6 }}>
        {avail.map((def) => {
          const deal = b.deals[def.id];
          const reopen = reSign(def.id);
          return (
            <div key={def.id} style={styles.card}>
              <span style={{ flex: 1 }}>
                <b>{def.icon} {def.title}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {def.qty}{' '}{t('brand.dv_moi')}{' '}{def.periodDays}{' '}{t('brand.ngay_2')}{' '}{Math.round(def.pricePerUnit * 100)}{t('brand.gia_ban_le_can_uy_tin')}{' '}{def.rep}
                </div>
              </span>
              {deal
                ? <span style={{ fontSize: 12, opacity: 0.8 }}>{t('brand.dang_ky')}</span>
                : reopen > 0
                  ? <span style={{ fontSize: 12, opacity: 0.7 }}>{t('brand.cat_con')}{' '}{reopen}{' '}{t('brand.ngay')}</span>
                  : <DealerSign def={def} lines={b.lines} onAccept={onAccept} />}
            </div>
          );
        })}
      </div>
      {avail.length === 0 && <p style={styles.sub}>{t('brand.chua_co_dai_ly_nao_mo')}</p>}
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
      <button style={styles.btn} disabled={lines.length === 0 || !sel} onClick={() => onAccept(def.id, sel)}>{t('brand.ky_hop_dong')}</button>
    </span>
  );
}

function FranchiseTab(props: { b: BrandState; level: number; money: number; onOpen: (defId: string) => void; onClose: (defId: string) => void }) {
  const { b, level, money, onOpen, onClose } = props;
  return (
    <div>
      <p style={styles.sub}>
        {t('brand.mo_diem_nhuong_quyen_ban_hang')}{' '}<b>{BRAND_FRANCHISE_SLOTS[0].weekly}</b>{' '}{t('brand.don_vi_tro_len_tuy_quy')}{' '}{vnd(BRAND_FRANCHISE_SETUP)}{' '}{t('brand.setup_phi_mo')}{' '}{vnd(BRAND_FRANCHISE_SETUP)}{' '}{t('brand.can_uy_tin')}{' '}{BRAND_FRANCHISE_REP}{' '}{t('brand.mo_tu_cap')}{' '}{BRAND_FRANCHISE_UNLOCK}.
      </p>

      {b.franchises.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
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
                    {t('brand.khoe')}{' '}{f.health}{t('brand.100_moi_tuan')}{' '}{def.weekly}{' '}{t('brand.don_vi_phi_dem')}{' '}{fmtNum(franchiseIncome(f.health, b.rep, def.size, 1))}{t('brand.d_2')}
                    {' '}{t('brand.nhap_hang')}{' '}{due !== undefined ? (due <= 1 ? (due <= 0 ? t('brand.qua_han_2') : t('brand.hom_nay')) : t('brand.con_ngay', { due })) : '—'}
                  </div>
                  {frp && (
                    <div style={{ fontSize: 12, color: '#e67e22', marginTop: 4 }}>
                      📊 {frp.line}
                    </div>
                  )}
                </span>
                <button style={styles.btn} onClick={() => onClose(f.id)}>{t('brand.dong_diem')}</button>
              </div>
            );
          })}
        </div>
      )}
      {b.franchises.length === 0 && <p style={styles.sub}>{t('brand.chua_co_diem_nhuong_quyen_nao')}</p>}

      <p style={{ ...styles.sub, marginTop: 12 }}>{t('brand.suat_nhuong_quyen')}</p>
      <div style={{ display: 'grid', gap: 6 }}>
        {BRAND_FRANCHISE_SLOTS.map((def) => {
          const has = b.franchises.some((f) => f.id === def.id);
          const locked = level < def.unlock || b.rep < BRAND_FRANCHISE_REP || money < BRAND_FRANCHISE_SETUP || has;
          return (
            <div key={def.id} style={styles.card}>
              <span style={{ flex: 1 }}>
                <b>{def.icon} {def.title}</b>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t('brand.cap')}{' '}{def.unlock}{' '}{t('brand.moi_tuan')}{' '}{def.weekly}{' '}{t('brand.don_vi_quy_mo')}{' '}{def.size}</div>
              </span>
              <button style={styles.btn} disabled={locked} onClick={() => onOpen(def.id)}>{has ? t('brand.da_mo') : t('brand.mo_diem')}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
