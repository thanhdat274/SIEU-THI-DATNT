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
  getWeek, postWeekScore, getBoard, getFair, contributeFair, removeFriend,
  type FriendRow, type MarketLot, type PublicCard, type InboxItem, type WeekRes, type BoardRes,
} from '../../net/socialApi';

/** Kiểu chung cho input/select trong bảng (shared.tsx không có sẵn). */
const ctrl: React.CSSProperties = { padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)', background: '#2b2b3a', color: '#fff', fontSize: 13 };

type Tab = 'card' | 'friends' | 'market' | 'week' | 'fair';
const TABS: readonly (readonly [Tab, string])[] = [
  ['card', '🪪 Danh thiếp'], ['friends', '👥 Bạn bè'], ['market', '🛒 Chợ liên hẻm'], ['week', '🏆 Thi đua'], ['fair', '🎪 Hội chợ'],
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
        <h2 style={styles.title}>👥 Cộng đồng</h2>
        <Callout tone="warn" title="Cần tài khoản để chơi cộng đồng">
          <div style={{ marginTop: 4, fontSize: 13 }}>
            Bạn bè, chợ liên hẻm, thi đua và hội chợ là tính năng <b>online không đồng bộ</b>: cần đăng nhập
            Google và kết nối server. Chưa đăng nhập thì cộng đồng chỉ hiện lời mời này — <b>chơi đơn của bạn
            không bị ảnh hưởng</b>.
          </div>
        </Callout>
        <p style={{ ...styles.sub, marginTop: 8 }}>💡 Không mạng / chưa đăng nhập: bấm Đóng và chơi bình thường. Khi đã đăng nhập (menu tài khoản) mở lại bảng này sẽ hoạt động.</p>
        <Footer onClose={closePanel} />
      </>
    );
  }

  return (
    <>
      <h2 style={styles.title}>👥 Cộng đồng</h2>
      <p style={styles.sub}>
        Online không đồng bộ: mọi thứ đều có trần mỗi ngày/tuần nên gian lận cũng vô nghĩa. Chỉ cần đăng nhập —
        không cần mở tiệm cùng lúc với người khác.
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
            <b>Khoe tiệm cho người khác</b> — bật quyền <code>public_card</code> (mặc định tắt).
            Người khác xem được tên tiệm, cấp và sơ đồ tiệm qua mã bạn bè, xuất hiện trên bảng xếp hạng.
            Tắt quyền bất cứ lúc nào → server xoá danh thiếp, bạn bè, thư, điểm thi đua/hội chợ của bạn (chơi đơn giữ nguyên).
          </span>
        </label>
      </div>
      {cardPublic && (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>Mã bạn bè (6 ký tự — chia cho bạn để kết)</small>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, margin: '4px 0' }}>{code ?? '…'}</div>
            <div style={{ fontSize: 13 }}>🏪 {shopName} · cấp {level} · ngày {day}</div>
          </div>
          <div style={styles.card}>
            <button style={styles.btn} onClick={() => pushCard()}>🔄 Cập nhật danh thiếp lên server</button>
            <small style={{ display: 'block', opacity: 0.7, marginTop: 2 }}>Mỗi Cuối ngày tự đẩy; bấm đây để gửi ngay (tên tiệm, cấp, bố trí mới nhất).</small>
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
    try { const r = await addFriend(code); setOk(r.already ? 'Đã là bạn rồi.' : `Kết bạn với mã ${r.code} thành công.`); setCode(''); load(); }
    catch (e) { setErr((e as Error).message); }
  };
  const doView = async () => {
    setErr(''); setView(null);
    try { setView(await getCardByCode(code)); } catch (e) { setErr((e as Error).message); }
  };
  const doGift = async (uid: string, kind: 'flower' | 'praise') => {
    setErr('');
    try { await gift(uid, kind); setOk(kind === 'flower' ? 'Đã gửi lẵng hoa 🎀' : 'Đã gửi lời khen 💬'); }
    catch (e) { setErr((e as Error).message); }
  };
  const doReport = async (target: string) => {
    setErr('');
    try { const { report } = await import('../../net/socialApi'); await report('card', target, 'Tên/nội dung không phù hợp'); setOk('Đã gửi báo cáo — cảm ơn bạn.'); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Mã bạn bè 6 ký tự"
            style={{ ...ctrl, flex: 1, minWidth: 150 }} maxLength={6} />
          <button style={styles.btn} onClick={doAdd}>Kết bạn</button>
          <button style={{ ...styles.btn, background: '#2ecc71' }} onClick={doView}>Xem danh thiếp</button>
        </div>
        {err && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 4 }}>{err}</div>}
        {ok && <div style={{ color: '#27ae60', fontSize: 12, marginTop: 4 }}>{ok}</div>}
      </div>
      {view && (
        <div style={styles.card}>
          <b>🏪 {view.shopName}</b> <small style={{ opacity: 0.7 }}>· {view.ownerName} · cấp {view.level}</small>
          {view.titles?.length ? <div style={{ fontSize: 12, marginTop: 2 }}>🏅 {view.titles.join(' · ')}</div> : null}
          <button style={{ ...styles.btn, background: '#e74c3c', marginLeft: 'auto' }} onClick={() => doReport(view.uid)}>🚩 Báo cáo</button>
        </div>
      )}
      <div style={{ ...styles.card, display: 'block' }}>
        <small style={{ opacity: 0.7 }}>Thư (lẵng hoa · lời khen · lô chợ) — còn {inbox.length} chưa nhận</small>
        <button style={{ ...styles.btn, margin: '4px 0 0' }} onClick={() => { claimInbox(inbox); load(); }}>Nhận tất cả</button>
        {inbox.slice(0, 12).map((i) => (
          <div key={i.id} style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
            {i.kind === 'flower' ? '🎀 Lẵng hoa' : i.kind === 'praise' ? '💬 Lời khen' : i.kind === 'lot_sold' ? '💵 Đã bán lô chợ' : '📦 Đã mua lô chợ'}
            {i.payload?.money ? ` +${formatMoney(i.payload.money)}` : ''}
          </div>
        ))}
        {!inbox.length && <small style={{ opacity: 0.6 }}>Chưa có thư.</small>}
      </div>
      <div style={{ ...styles.card, display: 'block' }}>
        <small style={{ opacity: 0.7 }}>Bạn bè ({friends?.length ?? 0}/30)</small>
        {friends?.map((f) => (
          <div key={f.uid} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, fontSize: 13 }}>🏪 {f.closed ? 'Tiệm đã đóng' : `${f.shopName} · cấp ${f.level}`}</span>
            <button style={styles.btn} onClick={() => doGift(f.uid, 'flower')}>🎀 Hoa</button>
            <button style={{ ...styles.btn, background: '#2ecc71' }} onClick={() => doGift(f.uid, 'praise')}>💬 Khen</button>
            <button style={{ ...styles.btn, background: '#e74c3c' }} onClick={async () => { await removeFriend(f.uid); load(); }}>Xoá</button>
          </div>
        ))}
        {friends && !friends.length && <small style={{ opacity: 0.6 }}>Chưa có bạn. Chia mã ở tab "Danh thiếp" để bạn bè kết.</small>}
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
    if (!sel) { setErr('Chọn mặt hàng để bán.'); return; }
    const suggest = productById(sel).sell;
    const unit = Math.round(suggest * ratio);
    try { await postMarketLot({ productId: sel, qty, unit, suggestPrice: suggest }); setSel(''); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  const lotRow = (l: MarketLot) => (
    <div key={l.id} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
      <span style={{ flex: 1, fontSize: 13 }}>{productById(l.productId)?.name ?? l.productId} ×{l.qty} · {formatMoney(l.unit)}/món ({formatMoney(l.price * l.qty)} cả lô)</span>
      <button style={{ ...styles.btn, background: '#3498db' }} disabled={money < l.price * l.qty}
        onClick={() => buyMarketLot(l).then(load)}>Mua</button>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Callout tone="info" title={`🛒 Chợ liên hẻm · bạn bè và lân cận (dải ${level <= 29 ? '1–29' : level <= 59 ? '30–59' : level <= 99 ? '60–99' : level <= 149 ? '100–149' : '150–200'})`}>
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Đăng tối đa <b>3 lô/tuần</b>, mua tối đa <b>2 lô/ngày</b>, giá phải trong <b>60–95%</b> giá bán gợi ý.
          Tiền bán về thư sáng mai; hàng mua cũng về kho qua thư. Chỉ hàng <b>khô không theo mùa</b>.
        </div>
      </Callout>
      <div style={styles.card}>
        <b>Đăng lô bán</b>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select value={sel} onChange={(e) => { setSel(e.target.value); setQty(Math.min(24, Math.max(1, storage[e.target.value] ?? 0))); }} style={{ ...ctrl, flex: 1, minWidth: 160 }}>
            <option value="">Chọn hàng trong kho</option>
            {sellables.map((id) => <option key={id} value={id}>{productById(id).name} (còn {storage[id]})</option>)}
          </select>
          <input type="number" value={qty} min={1} max={24} onChange={(e) => setQty(Number(e.target.value))} style={{ ...ctrl, width: 70 }} />
          <select value={ratio} onChange={(e) => setRatio(Number(e.target.value))} style={ctrl}>
            {[0.6, 0.7, 0.8, 0.9, 0.95].map((r) => <option key={r} value={r}>{Math.round(r * 100)}% giá gợi ý</option>)}
          </select>
          <button style={styles.btn} onClick={doPost}>Đăng</button>
        </div>
        {sel && <small style={{ opacity: 0.7, fontSize: 12 }}>Giá/món: {formatMoney(Math.round(productById(sel).sell * ratio))} → cả lô {formatMoney(Math.round(productById(sel).sell * ratio) * qty)}</small>}
      </div>
      {err && <div style={{ color: '#e74c3c', fontSize: 12 }}>{err}</div>}
      {market && (
        <>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>Lô của bạn</small>
            {market.mine.length ? market.mine.map(lotRow) : <small style={{ opacity: 0.6 }}>Chưa có lô.</small>}
          </div>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>Bạn bè đang bán</small>
            {market.fromFriends.length ? market.fromFriends.map(lotRow) : <small style={{ opacity: 0.6 }}>Không có.</small>}
          </div>
          <div style={{ ...styles.card, display: 'block' }}>
            <small style={{ opacity: 0.7 }}>Lân cận</small>
            {market.others.length ? market.others.map(lotRow) : <small style={{ opacity: 0.6 }}>Chưa có lô từ hẻm khác.</small>}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Thi đua / Xếp hạng ─────────────────────────── */
function WeekTab() {
  const { level, history, biz, ordersDone } = useGame();
  const [week, setWeek] = useState<WeekRes | null>(null);
  const [board, setBoard] = useState<BoardRes | null>(null);
  const [period, setPeriod] = useState<'week' | 'season'>('week');
  const [scope, setScope] = useState<'friends' | 'server'>('friends');
  const [err, setErr] = useState('');

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
      <Callout tone="info" title="🏆 Thi đua tuần — chỉ số có trần (tối đa 100)">
        <div style={{ fontSize: 12, marginTop: 2 }}>
          Điểm = thử thách (30) + tiệm sạch (30) + khách hài lòng (20) + việc nhà (10) + góp hội chợ (10).
          Server tự kẹp trần nên ai chơi gian lận cũng không qua được trần — bảng chỉ có giá trị vui, không quyết tiền của bạn.
        </div>
      </Callout>
      {err && <div style={{ color: '#e74c3c', fontSize: 12 }}>{err}</div>}
      {week?.mine && (
        <div style={{ ...styles.card, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <span><small style={{ opacity: 0.6 }}>Điểm tuần</small><div><b>{week.mine.score}</b>/100</div></span>
          <span><small style={{ opacity: 0.6 }}>Tổ</small><div><b>{week.group.slice(-6)}</b></div></span>
          <span><small style={{ opacity: 0.6 }}>Bạn cùng tổ</small><div><b>{week.cohort.length}</b></div></span>
        </div>
      )}
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <button style={{ ...styles.btn, background: scope === 'friends' ? '#f1c40f' : undefined }} onClick={() => loadBoard('friends', period)}>Bạn bè</button>
          <button style={{ ...styles.btn, background: scope === 'server' ? '#f1c40f' : undefined }} onClick={() => loadBoard('server', period)}>Toàn server</button>
          <span style={{ width: 8 }} />
          <button style={{ ...styles.btn, background: period === 'week' ? '#2ecc71' : undefined }} onClick={() => loadBoard(scope, 'week')}>Tuần nay</button>
          <button style={{ ...styles.btn, background: period === 'season' ? '#2ecc71' : undefined }} onClick={() => loadBoard(scope, 'season')}>Mùa (quý)</button>
        </div>
        {board?.self && <small style={{ opacity: 0.7 }}>Bạn đang hạng <b>#{board.self.rank}</b>/{board.total} ({board.self.percent}%) · {board.self.score} điểm</small>}
        <div style={{ marginTop: 4 }}>
          {board?.top.slice(0, 20).map((r) => (
            <div key={r.rank} style={{ display: 'flex', gap: 8, fontSize: 13, marginTop: 3 }}>
              <span style={{ width: 28, opacity: 0.8 }}>#{r.rank}</span>
              <span style={{ flex: 1 }}>{r.flagged ? 'Tiệm ẩn' : `Tiệm #${r.uid.slice(0, 4)}`}</span>
              <span><b>{r.score}</b></span>
            </div>
          ))}
          {board && !board.top.length && <small style={{ opacity: 0.6 }}>Chưa có ai ghi điểm.</small>}
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

  if (!fair) return <p style={styles.sub}>Hội chợ chưa mở. Mấy đợt hội chợ chạy theo lịch thật (Tết, 30/4, Trung thu, 20/11, Giáng sinh).</p>;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ ...styles.card, display: 'block' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{fair.icon} {fair.name}</div>
        <small style={{ opacity: 0.7 }}>Góp món ({fair.metric}) cho cả server · mục tiêu {formatMoney(fair.target)}</small>
        <div style={{ fontSize: 13, marginTop: 4 }}>Đã góp: <b>{formatMoney(fair.total)}</b> · phần của bạn: <b>{formatMoney(mine)}</b></div>
        <div style={{ marginTop: 6 }}>
          {fair.milestones.map((m) => {
            const done = fair.total >= m;
            return <div key={m} style={{ fontSize: 12, opacity: done ? 1 : 0.6 }}>{done ? '✅' : '🔲'} Mốc {formatMoney(m)}</div>;
          })}
        </div>
      </div>
      <div style={styles.card}>
        <small style={{ opacity: 0.7 }}>Hôm nay bán món thuộc hội chợ ({metricLabel(fair.metric)}) → bấm góp khi ngày kết thúc.</small>
        <button style={styles.btn} onClick={async () => {
          const n = metricToday(salesToday, fair.metric);
          try { const r = await contributeFair(level, n); setMsg(`Đã góp thêm ${r.accepted} món cho hội chợ.`); load(); }
          catch (e) { setMsg((e as Error).message); }
        }}>🎪 Góp {metricToday(salesToday, fair.metric)} món hôm nay</button>
        {msg && <div style={{ fontSize: 12, marginTop: 4 }}>{msg}</div>}
      </div>
    </div>
  );
}

const metricLabel = (m: string) => ({ festival_goods: 'hàng lễ', cooked: 'món nấu', homemade: 'món tự làm', region: 'đặc sản vùng' }[m] ?? m);

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
