/**
 * Hệ 6 — Cộng đồng online không đồng bộ (SPEC-CHIEU-RONG §6.5). Bảng này là cửa ngõ toàn bộ hệ:
 * Danh thiếp · Bạn bè (thư, lẵng hoa) · Chợ liên hẻm · Thi đua/Xếp hạng · Hội chợ.
 *
 * Lập trường: mọi giao dịch đều đụng server và có trần phía server (§6.3). Chưa đăng nhập / chưa bật
 * scope `public_card` → panel chỉ hiện lời mời, không phá chơi đơn (không gọi gì).
 */
import { useEffect, useState } from 'react';
import { useGame } from '../../core/store';
import { Footer, styles, Tabs, Callout } from './shared';
import { formatMoney, productById } from '../../data/products';
import { SEASONAL_GOODS } from '../../data/calendar';
import { weekParts } from '../../data/socialWeek';
import {
  addFriend, listFriends, getCardByCode, gift, listInbox, getMarket,
  getWeek, postWeekScore, getBoard, getAlleyBoard, type AlleyBoardRes, getFair, contributeFair, removeFriend,
  type FriendRow, type MarketLot, type PublicCard, type InboxItem, type WeekRes, type BoardRes,
} from '../../net/socialApi';
import { t } from '../../core/i18n';

/** Kiểu chung cho input/select trong bảng (shared.tsx không có sẵn). */
const ctrl: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: '#2b2b3a', color: '#fff', fontSize: 13 };

type Tab = 'card' | 'friends' | 'market' | 'week' | 'fair';
const TABS: readonly (readonly [Tab, string])[] = [
  ['card', t('community.danh_thiep')], ['friends', t('community.ban_be')], ['market', t('community.cho_lien_hem')], ['week', t('community.thi_dua')], ['fair', t('community.hoi_cho')],
];

export function CommunityPanel() {
  const closePanel = useGame((s) => s.closePanel);
  const [tab, setTab] = useState<Tab>('card');
  const [auth, setAuth] = useState<'loading' | 'offline' | 'ready'>('loading');
  // Kiểm đăng nhập bằng một lệnh nhẹ; lỗi là chưa đăng nhập/không mạng → báo lời mời.
  useEffect(() => {
    let alive = true;
    listInbox().then(() => alive && setAuth('ready')).catch(() => alive && setAuth('offline'));
    return () => { alive = false; };
  }, []);

  if (auth === 'offline') {
    return (
      <>
        <h2 style={styles.title}>{t('community.cong_dong')}</h2>
        <Callout tone="warn" title={t('community.can_tai_khoan_de_choi_cong')}>
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {t('community.ban_be_cho_lien_hem_thi')}{' '}<b>{t('community.online_khong_dong_bo')}</b>{t('community.can_dang_nhap_google_va_ket')}{' '}<b>{t('community.choi_don_cua_ban_khong_bi')}</b>.
          </div>
        </Callout>
        <p style={{ ...styles.sub, marginTop: 8 }}>{t('community.khong_mang_chua_dang_nhap_bam')}</p>
        <Footer onClose={closePanel} />
      </>
    );
  }

  return (
    <>
      <h2 style={styles.title}>{t('community.cong_dong')}</h2>
      <p style={styles.sub}>
        {t('community.online_khong_dong_bo_moi_thu')}
      </p>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'card' && <CardTab />}
      {tab === 'friends' && <FriendsTab />}
      {tab === 'market' && <MarketTab />}
      {tab === 'week' && <WeekTab />}
      {tab === 'fair' && <FairTab />}
      <Footer onClose={closePanel} />
    </>
  );
}

/* ─────────────────────────── Danh thiếp ─────────────────────────── */
function CardTab() {
  const { biz, level, day, shopName, toggleCardPublic, pushCard } = useGame();
  const cardPublic = !!biz.social2?.cardPublic;
  const code = biz.social2?.code;
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={styles.card}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
          <input type="checkbox" checked={cardPublic} disabled={busy}
            onChange={async (e) => { setBusy(true); await toggleCardPublic(e.target.checked); setBusy(false); }} />
          <span>
            <b>{t('community.khoe_tiem_cho_nguoi_khac')}</b>{' '}{t('community.bat_quyen')}{' '}<code>public_card</code>{' '}{t('community.mac_dinh_tat_nguoi_khac_xem')}
          </span>
        </label>
      </div>
      {cardPublic && (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>{t('community.ma_ban_be_6_ky_tu')}</small>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, margin: '4px 0' }}>{code ?? '…'}</div>
            <div style={{ fontSize: 13 }}>🏪 {shopName}{' '}{t('community.cap')}{' '}{level}{' '}{t('community.ngay')}{' '}{day}</div>
          </div>
          <div style={styles.card}>
            <button style={styles.btn} onClick={() => pushCard()}>{t('community.cap_nhat_danh_thiep_len_server')}</button>
            <small style={{ display: 'block', opacity: 0.7, marginTop: 2 }}>{t('community.moi_cuoi_ngay_tu_day_bam')}</small>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Bạn bè ─────────────────────────── */
function FriendsTab() {
  const claimInbox = useGame((s) => s.claimInbox);
  const [friends, setFriends] = useState<FriendRow[] | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [view, setView] = useState<PublicCard | null>(null);

  const load = () => {
    listFriends().then((r) => setFriends(r.friends)).catch((e) => setErr((e as Error).message));
    listInbox().then((r) => setInbox(r.items)).catch(() => {});
  };
  useEffect(load, []);

  const doAdd = async () => {
    setErr(''); setOk('');
    try { const r = await addFriend(code); setOk(r.already ? t('community.da_la_ban_roi') : t('community.ket_ban_voi_ma_thanh_cong', { code: r.code })); setCode(''); load(); }
    catch (e) { setErr((e as Error).message); }
  };
  const doView = async () => {
    setErr(''); setView(null);
    try { setView(await getCardByCode(code)); } catch (e) { setErr((e as Error).message); }
  };
  const doGift = async (uid: string, kind: 'flower' | 'praise') => {
    setErr('');
    try { await gift(uid, kind); setOk(kind === 'flower' ? t('community.da_gui_lang_hoa') : t('community.da_gui_loi_khen')); }
    catch (e) { setErr((e as Error).message); }
  };
  const doReport = async (target: string) => {
    setErr('');
    try { const { report } = await import('../../net/socialApi'); await report('card', target, t('community.ten_noi_dung_khong_phu_hop')); setOk(t('community.da_gui_bao_cao_cam_on')); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('community.ma_ban_be_6_ky_tu_2')}
            style={{ ...ctrl, flex: 1, minWidth: 150 }} maxLength={6} />
          <button style={styles.btn} onClick={doAdd}>{t('community.ket_ban')}</button>
          <button style={{ ...styles.btn, background: '#2ecc71' }} onClick={doView}>{t('community.xem_danh_thiep')}</button>
        </div>
        {err && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{err}</div>}
        {ok && <div style={{ color: '#27ae60', fontSize: 12, marginTop: 4 }}>{ok}</div>}
      </div>
      {view && (
        <div style={styles.card}>
          <b>🏪 {view.shopName}</b> <small style={{ opacity: 0.7 }}>· {view.ownerName}{' '}{t('community.cap')}{' '}{view.level}</small>
          {view.titles?.length ? <div style={{ fontSize: 12, marginTop: 2 }}>🏅 {view.titles.join(' · ')}</div> : null}
          <button style={{ ...styles.btn, background: '#e74c3c', marginLeft: 'auto' }} onClick={() => doReport(view.uid)}>{t('community.bao_cao')}</button>
        </div>
      )}
      <div style={{ ...styles.card, display: 'block' }}>
        <small style={{ opacity: 0.7 }}>{t('community.thu_lang_hoa_loi_khen_lo')}{' '}{inbox.length}{' '}{t('community.chua_nhan')}</small>
        <button style={{ ...styles.btn, margin: '4px 0 0' }} onClick={() => { claimInbox(inbox); load(); }}>{t('community.nhan_tat_ca')}</button>
        {inbox.slice(0, 12).map((i) => (
          <div key={i.id} style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
            {i.kind === 'flower' ? t('community.lang_hoa') : i.kind === 'praise' ? t('community.loi_khen') : i.kind === 'lot_sold' ? t('community.da_ban_lo_cho') : t('community.da_mua_lo_cho')}
            {i.payload?.money ? ` +${formatMoney(i.payload.money)}` : ''}
          </div>
        ))}
        {!inbox.length && <small style={{ opacity: 0.6 }}>{t('community.chua_co_thu')}</small>}
      </div>
      <div style={{ ...styles.card, display: 'block' }}>
        <small style={{ opacity: 0.7 }}>{t('community.ban_be_2')}{friends?.length ?? 0}/30)</small>
        {friends?.map((f) => (
          <div key={f.uid} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, fontSize: 13 }}>🏪 {f.closed ? t('community.tiem_da_dong') : t('community.cap_2', { shopName: f.shopName, level: f.level })}</span>
            <button style={styles.btn} onClick={() => doGift(f.uid, 'flower')}>🎀 Hoa</button>
            <button style={{ ...styles.btn, background: '#2ecc71' }} onClick={() => doGift(f.uid, 'praise')}>💬 Khen</button>
            <button style={{ ...styles.btn, background: '#e74c3c' }} onClick={async () => { await removeFriend(f.uid); load(); }}>{t('community.xoa')}</button>
          </div>
        ))}
        {friends && !friends.length && <small style={{ opacity: 0.6 }}>{t('community.chua_co_ban_chia_ma_o')}</small>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Chợ liên hẻm ─────────────────────────── */
function MarketTab() {
  const { level, storage, money, postMarketLot, buyMarketLot } = useGame();
  const [market, setMarket] = useState<{ mine: MarketLot[]; fromFriends: MarketLot[]; others: MarketLot[] } | null>(null);
  const [err, setErr] = useState('');
  // Đăng lô
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(10);
  const [ratio, setRatio] = useState(0.8);
  const load = () => { getMarket(level).then(setMarket).catch((e) => setErr((e as Error).message)); };
  useEffect(() => { load(); }, [level]);

  const sellables = Object.entries(storage)
    .filter(([id]) => { const p = productById(id); return p && p.category === 'dry' && !SEASONAL_GOODS.has(id) && (storage[id] ?? 0) > 0; })
    .map(([id]) => id)
    .sort((a, b) => productById(a).name.localeCompare(productById(b).name));

  const doPost = async () => {
    setErr('');
    if (!sel) { setErr(t('community.chon_mat_hang_de_ban')); return; }
    const suggest = productById(sel).sell;
    const unit = Math.round(suggest * ratio);
    try { await postMarketLot({ productId: sel, qty, unit, suggestPrice: suggest }); setSel(''); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  const lotRow = (l: MarketLot) => (
    <div key={l.id} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
      <span style={{ flex: 1, fontSize: 13 }}>{productById(l.productId)?.name ?? l.productId} ×{l.qty} · {formatMoney(l.unit)}{t('community.mon')}{formatMoney(l.price * l.qty)}{' '}{t('community.ca_lo')}</span>
      <button style={{ ...styles.btn, background: '#3498db' }} disabled={money < l.price * l.qty}
        onClick={() => buyMarketLot(l).then(load)}>Mua</button>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Callout tone="info" title={t('community.cho_lien_hem_ban_be_va', { v0: level <= 29 ? '1–29' : level <= 59 ? '30–59' : level <= 99 ? '60–99' : level <= 149 ? '100–149' : '150–200' })}>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {t('community.dang_toi_da')}{' '}<b>{t('community.3_lo_tuan')}</b>{t('community.mua_toi_da')}{' '}<b>{t('community.2_lo_ngay')}</b>{t('community.gia_phai_trong')}{' '}<b>60–95%</b>{' '}{t('community.gia_ban_goi_y_tien_ban')}{' '}<b>{t('community.kho_khong_theo_mua')}</b>.
        </div>
      </Callout>
      <div style={styles.card}>
        <b>{t('community.dang_lo_ban')}</b>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select value={sel} onChange={(e) => { setSel(e.target.value); setQty(Math.min(24, Math.max(1, storage[e.target.value] ?? 0))); }} style={{ ...ctrl, flex: 1, minWidth: 160 }}>
            <option value="">{t('community.chon_hang_trong_kho')}</option>
            {sellables.map((id) => <option key={id} value={id}>{productById(id).name}{' '}{t('community.con')}{' '}{storage[id]})</option>)}
          </select>
          <input type="number" value={qty} min={1} max={24} onChange={(e) => setQty(Number(e.target.value))} style={{ ...ctrl, width: 70 }} />
          <select value={ratio} onChange={(e) => setRatio(Number(e.target.value))} style={ctrl}>
            {[0.6, 0.7, 0.8, 0.9, 0.95].map((r) => <option key={r} value={r}>{Math.round(r * 100)}{t('community.gia_goi_y')}</option>)}
          </select>
          <button style={styles.btn} onClick={doPost}>{t('community.dang')}</button>
        </div>
        {sel && <small style={{ opacity: 0.7, fontSize: 12 }}>{t('community.gia_mon')}{' '}{formatMoney(Math.round(productById(sel).sell * ratio))}{' '}{t('community.ca_lo_2')}{' '}{formatMoney(Math.round(productById(sel).sell * ratio) * qty)}</small>}
      </div>
      {err && <div style={{ color: '#e74c3c', fontSize: 12 }}>{err}</div>}
      {market && (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>{t('community.lo_cua_ban')}</small>
            {market.mine.length ? market.mine.map(lotRow) : <small style={{ opacity: 0.6 }}>{t('community.chua_co_lo')}</small>}
          </div>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>{t('community.ban_be_dang_ban')}</small>
            {market.fromFriends.length ? market.fromFriends.map(lotRow) : <small style={{ opacity: 0.6 }}>{t('community.khong_co')}</small>}
          </div>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>{t('community.lan_can')}</small>
            {market.others.length ? market.others.map(lotRow) : <small style={{ opacity: 0.6 }}>{t('community.chua_co_lo_tu_hem_khac')}</small>}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Thi đua / Xếp hạng ─────────────────────────── */
const bandOfLevel = (l: number) => (l <= 29 ? '1-29' : l <= 59 ? '30-59' : l <= 99 ? '60-99' : l <= 149 ? '100-149' : '150-200');
function WeekTab() {
  const { level, history, biz, ordersDone } = useGame();
  const [week, setWeek] = useState<WeekRes | null>(null);
  const [board, setBoard] = useState<BoardRes | null>(null);
  const [period, setPeriod] = useState<'week' | 'season'>('week');
  const [scope, setScope] = useState<'friends' | 'server'>('friends');
  const [err, setErr] = useState('');
  const [alleys, setAlleys] = useState<AlleyBoardRes | null>(null);
  useEffect(() => { getAlleyBoard({ scope: 'server', band: bandOfLevel(level) }).then(setAlleys).catch(() => {}); }, [level]);

  const load = () => {
    // Gửi điểm tuần (thành tích vài ngày gần nhất), server tự kẹp trần từng thành phần.
    const recent = history.slice(-7);
    const customers = recent.reduce((n, r) => n + (r.customers ?? 0), 0);
    const happy = recent.reduce((n, r) => n + ((r.customers ?? 0) - (r.unhappy ?? 0)), 0);
    const wp = weekParts({ cleanBest: biz.cleanBest ?? 0, happy, customers, ordersRecent: ordersDone, lifeDone: biz.lifeEventsDone?.length ?? 0 });
    postWeekScore(level, wp.parts)
      .then(() => getWeek(level)).then(setWeek)
      .catch((e) => setErr((e as Error).message));
    getBoard({ scope, period, level }).then(setBoard).catch(() => {});
  };
  useEffect(load, [level]);

  const loadBoard = (s: typeof scope, p: typeof period) => {
    setScope(s); setPeriod(p);
    getBoard({ scope: s, period: p, level }).then(setBoard).catch((e) => setErr((e as Error).message));
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Callout tone="info" title={t('community.thi_dua_tuan_chi_so_co')}>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          {t('community.diem_thu_thach_30_tiem_sach')}
        </div>
      </Callout>
      {err && <div style={{ color: '#e74c3c', fontSize: 12 }}>{err}</div>}
      {week?.mine && (
        <div style={{ ...styles.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: 8 }}>
          <span><small style={{ opacity: 0.6 }}>{t('community.diem_tuan')}</small><div><b>{week.mine.score}</b>/100</div></span>
          <span><small style={{ opacity: 0.6 }}>{t('community.to')}</small><div><b>{week.group.slice(-6)}</b></div></span>
          <span><small style={{ opacity: 0.6 }}>{t('community.ban_cung_to')}</small><div><b>{week.cohort.length}</b></div></span>
        </div>
      )}
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <button style={{ ...styles.btn, background: scope === 'friends' ? '#f1c40f' : undefined }} onClick={() => loadBoard('friends', period)}>{t('community.ban_be_3')}</button>
          <button style={{ ...styles.btn, background: scope === 'server' ? '#f1c40f' : undefined }} onClick={() => loadBoard('server', period)}>{t('community.toan_server')}</button>
          <span style={{ width: 8 }} />
          <button style={{ ...styles.btn, background: period === 'week' ? '#2ecc71' : undefined }} onClick={() => loadBoard(scope, 'week')}>{t('community.tuan_nay')}</button>
          <button style={{ ...styles.btn, background: period === 'season' ? '#2ecc71' : undefined }} onClick={() => loadBoard(scope, 'season')}>{t('community.mua_quy')}</button>
        </div>
        {board?.self && <small style={{ opacity: 0.7 }}>{t('community.ban_dang_hang')}{' '}<b>#{board.self.rank}</b>/{board.total} ({board.self.percent}%) · {board.self.score}{' '}{t('community.diem')}</small>}
        <div style={{ marginTop: 4 }}>
          {board?.top.slice(0, 20).map((r) => (
            <div key={r.rank} style={{ display: 'flex', gap: 8, fontSize: 13, marginTop: 3 }}>
              <span style={{ width: 28, opacity: 0.8 }}>#{r.rank}</span>
              <span style={{ flex: 1 }}>{r.flagged ? t('community.tiem_an') : (r.name || t('community.tiem', { v0: r.uid.slice(0, 4) }))}</span>
              <span><b>{r.score}</b></span>
            </div>
          ))}
          {board && !board.top.length && <small style={{ opacity: 0.6 }}>{t('community.chua_co_ai_ghi_diem')}</small>}
        </div>
      </div>
      <div style={styles.card}>
        <b>{t('community.bang_co_op_hem_choi_chung')}</b>
        <div><small style={{ opacity: 0.6 }}>{t('community.cung_dai_cap_xep_theo_diem')}</small></div>
        <div style={{ marginTop: 4 }}>
          {alleys?.rows.slice(0, 20).map((r) => (
            <div key={r.rank} style={{ display: 'flex', gap: 8, fontSize: 13, marginTop: 3 }}>
              <span style={{ width: 28, opacity: 0.8 }}>#{r.rank}</span>
              <span style={{ flex: 1 }}>{r.name || t('community.hem', { key: r.key })} <small style={{ opacity: 0.6 }}>{r.together}{' '}{t('community.ngay_2')}</small></span>
              <span><b>{r.score}</b></span>
            </div>
          ))}
          {alleys && !alleys.rows.length && <small style={{ opacity: 0.6 }}>{t('community.tuan_nay_chua_co_hem_nao')}</small>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Hội chợ ─────────────────────────── */
function FairTab() {
  const { level, salesToday } = useGame();
  const [fair, setFair] = useState<{ id: string; name: string; metric: string; target: number; milestones: number[]; total: number; from: string; to: string; icon?: string } | null>(null);
  const [mine, setMine] = useState(0);
  const [msg, setMsg] = useState('');

  const load = () => { getFair().then((r) => { setFair(r.fair); setMine(r.mine); }).catch(() => {}); };
  useEffect(() => { load(); }, []);

  if (!fair) return <p style={styles.sub}>{t('community.hoi_cho_chua_mo_may_dot')}</p>;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ ...styles.card, display: 'block' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{fair.icon} {fair.name}</div>
        <small style={{ opacity: 0.7 }}>{t('community.gop_mon')}{fair.metric}{t('community.cho_ca_server_muc_tieu')}{' '}{formatMoney(fair.target)}</small>
        <div style={{ fontSize: 13, marginTop: 4 }}>{t('community.da_gop')}{' '}<b>{formatMoney(fair.total)}</b>{' '}{t('community.phan_cua_ban')}{' '}<b>{formatMoney(mine)}</b></div>
        <div style={{ marginTop: 6 }}>
          {fair.milestones.map((m) => {
            const done = fair.total >= m;
            return <div key={m} style={{ fontSize: 12, opacity: done ? 1 : 0.6 }}>{done ? '✅' : '🔲'}{' '}{t('community.moc')}{' '}{formatMoney(m)}</div>;
          })}
        </div>
      </div>
      <div style={styles.card}>
        <small style={{ opacity: 0.7 }}>{t('community.hom_nay_ban_mon_thuoc_hoi')}{metricLabel(fair.metric)}{t('community.bam_gop_khi_ngay_ket_thuc')}</small>
        <button style={styles.btn} onClick={async () => {
          const n = metricToday(salesToday, fair.metric);
          try { const r = await contributeFair(level, n); setMsg(t('community.da_gop_them_mon_cho_hoi', { accepted: r.accepted })); load(); }
          catch (e) { setMsg((e as Error).message); }
        }}>{t('community.gop')}{' '}{metricToday(salesToday, fair.metric)}{' '}{t('community.mon_hom_nay')}</button>
        {msg && <div style={{ fontSize: 12, marginTop: 4 }}>{msg}</div>}
      </div>
    </div>
  );
}

const metricLabel = (m: string) => ({ festival_goods: t('community.hang_le'), cooked: t('community.mon_nau'), homemade: t('community.mon_tu_lam'), region: t('community.dac_san_vung') }[m] ?? m);

/** Đếm hàng đã bán hôm nay theo metric hội chợ (đọc salesToday — chợ/thi đua không đổi). */
function metricToday(salesToday: Record<string, number>, metric: string): number {
  const entries = Object.entries(salesToday);
  switch (metric) {
    case 'cooked': return entries.filter(([id]) => id.startsWith('cooked_')).reduce((n, [, q]) => n + q, 0);
    case 'homemade': return entries.filter(([id]) => id.startsWith('home_') || id.startsWith('neighbor2_')).reduce((n, [, q]) => n + q, 0);
    case 'region': return entries.filter(([id]) => id.startsWith('region_')).reduce((n, [, q]) => n + q, 0);
    default: return 0;
  }
}
