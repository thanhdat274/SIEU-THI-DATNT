import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WHATS_NEW } from '../data/whatsNew';
import { FEEDBACK_KINDS, CONTACT_MAX, TEXT_MAX, feedbackProblem, loadDraft, loadSent, saveDraft, sendFeedback, type FeedbackKind } from '../data/feedback';
import { loadPlayerName, NAME_MAX, savePlayerName, validatePlayerName } from '../data/playerName';
import { getBoard, type AlleyBoardRes, type BoardRes } from '../net/socialApi';
import { useSession } from '../net/session';
import { getGuestBoard, getPublicAlleyBoard, localLevel, submitGuestScore } from '../net/guestBoard';
import { DEVICES, KEYS, LANDING, guessDevice, guideFor, landingSeen, markLandingSeen, shouldShowLanding, type Device } from '../data/guide';
import { PLAY_LIMIT_MIN, PLAY_WARN_MIN, playMinutesToday } from '../data/playTime';
import { readLocalSave } from '../core/save';
import { PrivacyPolicy } from './PrivacyPolicy';

const SettingsPanel = lazy(() => import('./SettingsPanel').then((m) => ({ default: m.SettingsPanel })));

type Modal = 'intro' | 'settings' | 'guide' | 'news' | 'board' | 'feedback' | 'rules' | null;

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="privacy-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="lm-sheet" onClick={(e) => e.stopPropagation()}>
        <header><h2>{title}</h2><button className="login-link" onClick={onClose} aria-label="Đóng">✕</button></header>
        <div className="lm-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Dòng chốt tuần của bảng xếp hạng: thứ 2 → 23:59 Chủ nhật (giờ máy), kèm đếm ngược. */
function WeekCut() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Thứ 2 đầu tuần
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const ms = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const countdown = days > 0 ? `còn ${days} ngày ${hours} giờ` : `còn ${hours} giờ`;
  return <p className="login-muted">🗓️ {fmt(start)} – {fmt(end)} · chốt 23:59 Chủ nhật (giờ máy bạn) · ⏳ {countdown}</p>;
}

/** Bảng co-op: các hẻm chơi chung, xếp theo điểm tuần (công khai, không cần đăng nhập). */
function AlleyBoard() {
  const [res, setRes] = useState<AlleyBoardRes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getPublicAlleyBoard(localLevel()).then((r) => { if (live) setRes(r); }).catch((e) => { if (live) setErr(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, []);
  return (
    <>
      <p className="login-muted">Các hẻm chơi chung (co-op) cùng dải cấp với bạn, xếp theo điểm tuần. Số bên phải là số ngày gắn bó.</p>
      <WeekCut />
      {err && <p className="login-error">{err}</p>}
      {!res && !err && <p className="login-muted">Đang tải…</p>}
      {res && (res.rows.length === 0 ? <p className="login-muted">Tuần này chưa có hẻm nào lên bảng. Rủ bạn chơi chung để là hẻm đầu tiên!</p> : (
        <ol className="lm-board">
          {res.rows.map((r) => <li key={r.rank}><b>#{r.rank}</b><span>{r.name || `Hẻm #${r.key}`} <small>{r.together} ngày</small></span><em>{r.score}</em></li>)}
        </ol>
      ))}
    </>
  );
}

function Board() {
  const { account } = useSession();
  const [res, setRes] = useState<BoardRes | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scope, setScope] = useState<'server' | 'friends'>('server');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setRes(null); setErr(null);
    const q = account
      ? getBoard({ scope, period: 'week', level: localLevel() })
      : submitGuestScore().catch(() => {}).then(() => getGuestBoard(localLevel()));
    q.then((r) => { if (live) setRes(r); }).catch((e) => { if (live) setErr(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [account, scope, tick]);
  const friendsOk = !!account;
  return (
    <>
      <p className="login-muted">Top tiệm tuần này — người đăng nhập và khách cùng một bảng. Tên là tên bạn đặt ở ô "Tên của bạn".</p>
      <WeekCut />
      <div className="login-row">
        <button className={`login-btn small${scope === 'server' ? ' primary' : ''}`} onClick={() => setScope('server')}>Toàn server</button>
        {friendsOk && <button className={`login-btn small${scope === 'friends' ? ' primary' : ''}`} onClick={() => setScope('friends')}>Bạn bè</button>}
      </div>
      {err && <p className="login-error">{err}</p>}
      {!res && !err && <p className="login-muted">Đang tải…</p>}
      {res && (res.top.length === 0 ? <p className="login-muted">Tuần này chưa có ai lên bảng.</p> : (
        <ol className="lm-board">
          {res.top.map((r) => (
            <li key={r.uid} className={res.self && r.rank === res.self.rank ? 'mine' : undefined}><b>#{r.rank}</b><span>{r.flagged ? 'Tiệm ẩn' : (r.name || `Tiệm #${r.uid.slice(0, 4)}`)}</span><em>{r.score.toLocaleString('vi-VN')}</em></li>
          ))}
        </ol>
      ))}
      {res?.self && <p className="login-muted">Hạng của bạn #{res.self.rank}/{res.total} · Top {res.self.percent}% · {res.self.score.toLocaleString('vi-VN')} điểm</p>}
      <button className="login-btn small" onClick={() => setTick((t) => t + 1)}>⟳ Làm mới</button>
    </>
  );
}

function BoardTabs() {
  const [t, setT] = useState<'shop' | 'coop'>('shop');
  return (
    <>
      <div className="lm-kinds">
        <button className={`login-btn small${t === 'shop' ? ' primary' : ''}`} onClick={() => setT('shop')}>🏪 Tiệm</button>
        <button className={`login-btn small${t === 'coop' ? ' primary' : ''}`} onClick={() => setT('coop')}>🏘️ Co-op (hẻm)</button>
      </div>
      {t === 'shop' ? <Board /> : <AlleyBoard />}
    </>
  );
}

function Intro({ onPlay }: { onPlay: () => void }) {
  return (
    <>
      <p className="lm-tagline">{LANDING.tagline}</p>
      {LANDING.intro.map((t) => <p key={t}>{t}</p>)}
      <ul className="lm-points">
        {LANDING.points.map((p) => <li key={p.title}><b>{p.icon} {p.title}</b><span>{p.text}</span></li>)}
      </ul>
      <button className="login-btn primary" onClick={onPlay}>{LANDING.cta}</button>
    </>
  );
}

function Guide() {
  const [dev, setDev] = useState<Device>(() => guessDevice(window.innerWidth, 'ontouchstart' in window || navigator.maxTouchPoints > 0));
  let n = 0;
  return (
    <>
      <p className="login-muted">Chọn thiết bị bạn đang dùng rồi làm theo từng bước.</p>
      <div className="lm-kinds">
        {DEVICES.map(([k, label]) => <button key={k} className={`login-btn small${dev === k ? ' primary' : ''}`} onClick={() => setDev(k)}>{label}</button>)}
      </div>
      {guideFor(dev).map((sec) => (
        <section key={sec.title}>
          <h3>{sec.title}</h3>
          <ol className="lm-guide">
            {sec.steps.map((st) => <li key={st.title}><b><i>{++n}</i> {st.icon} {st.title}</b><span>{st.text}</span></li>)}
          </ol>
        </section>
      ))}
      {dev === 'pc' && (
        <section>
          <h3>Bảng phím</h3>
          <div className="lm-keys">{KEYS.map(([k, v]) => <div key={k}><kbd>{k}</kbd><span>{v}</span></div>)}</div>
        </section>
      )}
      <p className="login-muted">⏰ Chơi quá 180 phút liên tục có thể ảnh hưởng sức khỏe và thị lực — nhớ nghỉ giải lao.</p>
    </>
  );
}

function Feedback() {
  const [d, setD] = useState(loadDraft);
  const [withTech, setWithTech] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState(loadSent);
  const set = (p: Partial<typeof d>) => { const n = { ...d, ...p }; setD(n); saveDraft(n); setMsg(null); };
  const submit = async () => {
    const bad = feedbackProblem(d.kind, d.text);
    if (bad) { setMsg({ ok: false, text: bad }); return; }
    setBusy(true);
    try {
      await sendFeedback({ ...d, withTech });
      setD({ ...d, text: '', contact: '' }); setSent(loadSent());
      setMsg({ ok: true, text: 'Đã gửi. Cảm ơn bạn đã góp ý! 💚' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    setBusy(false);
  };
  return (
    <>
      <p className="login-muted">Không cần đăng nhập. Mọi góp ý đều được đọc.</p>
      <div className="lm-kinds">
        {FEEDBACK_KINDS.map(([k, label]) => (
          <button key={k} className={`login-btn small${d.kind === k ? ' primary' : ''}`} onClick={() => set({ kind: k as FeedbackKind })}>{label}</button>
        ))}
      </div>
      <textarea className="lm-text" rows={5} maxLength={TEXT_MAX} value={d.text} placeholder="Bạn muốn nói gì với tác giả?" onChange={(e) => set({ text: e.target.value })} />
      <div className="lm-count">{d.text.length}/{TEXT_MAX}</div>
      <input className="lm-input" maxLength={CONTACT_MAX} value={d.contact} placeholder="Email/Zalo để tác giả trả lời (không bắt buộc)" onChange={(e) => set({ contact: e.target.value })} />
      <label className="login-consent"><input type="checkbox" checked={withTech} onChange={(e) => setWithTech(e.target.checked)} /><span>Kèm thông tin máy (trình duyệt, màn hình) để dễ tìm lỗi</span></label>
      <button className="login-btn primary" disabled={busy} onClick={submit}>{busy ? 'Đang gửi…' : 'Gửi góp ý'}</button>
      {msg && <p className={msg.ok ? 'login-muted' : 'login-error'} role="status">{msg.text}</p>}
      {sent.length > 0 && (
        <>
          <h3>Góp ý của bạn</h3>
          <ul className="lm-sent">
            {sent.map((s) => <li key={s.at}><em>{new Date(s.at).toLocaleDateString('vi-VN')}</em> {s.text.length > 90 ? `${s.text.slice(0, 90)}…` : s.text}</li>)}
          </ul>
        </>
      )}
    </>
  );
}

/** Ô đặt tên hiển thị trên bảng xếp hạng; lưu ngay khi hợp lệ, báo lỗi tại chỗ. */
export function NameField() {
  const [v, setV] = useState(loadPlayerName);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const saved = readLocalSave()?.data.shopName ?? '';
  const change = (raw: string) => {
    setV(raw); setOk(false);
    if (!raw.trim()) { savePlayerName(''); setErr(null); return; }
    const c = validatePlayerName(raw);
    if (c.ok) { savePlayerName(raw); setErr(null); setOk(true); } else setErr(c.reason);
  };
  return (
    <div className="lm-name">
      <label htmlFor="lm-name-in">Tên của bạn (hiện trên bảng xếp hạng)</label>
      <input id="lm-name-in" className="lm-input" maxLength={NAME_MAX} value={v} placeholder="Ví dụ: Tiệm Cô Ba" onChange={(e) => change(e.target.value)} />
      {err && <p className="login-error" role="alert">{err}</p>}
      {ok && <p className="login-muted">Đã lưu tên.</p>}
      {!v.trim() && !err && <p className="login-muted">Chưa đặt tên: bảng xếp hạng dùng tên tiệm trong ván{saved ? ` ("${saved}")` : ' ("Tạp Hóa Đầu Ngõ")'}.</p>}
    </div>
  );
}

/** Đồng hồ thời gian chơi hôm nay (chống nghiện): đậm dần khi gần/qua mốc khuyến nghị. */
function PlayTimeCard() {
  const [min, setMin] = useState(() => playMinutesToday());
  useEffect(() => {
    const t = setInterval(() => setMin(playMinutesToday()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (min < 10) return null; // mới chơi một chút thì không cần nhắc
  const over = min >= PLAY_LIMIT_MIN;
  const warn = !over && min >= PLAY_WARN_MIN;
  return (
    <div
      className={`login-nudge${warn || over ? ' claimable' : ''}`}
      role="status"
      style={over ? { borderColor: '#d64545', background: '#fff1f1', color: '#8f2828' } : undefined}
    >
      <span aria-hidden="true">⏰</span>
      <span>
        Hôm nay bạn đã chơi <b>{min} phút</b>.
        {over
          ? ' Đã quá mốc 180 phút khuyến nghị — nên nghỉ ngơi, vận động nhẹ và nhắm mắt vài phút nhé!'
          : warn
            ? ` Gần mốc ${PLAY_LIMIT_MIN} phút khuyến nghị rồi — chơi thêm nữa thì nghỉ giải lao nhé!`
            : ` Chơi quá ${PLAY_LIMIT_MIN} phút liên tục hại mắt — nhớ nghỉ giải lao.`}
      </span>
    </div>
  );
}

export function LoginMenu() {
  const [m, setM] = useState<Modal>(() => (shouldShowLanding(!!readLocalSave(), landingSeen()) ? 'intro' : null));  const items: [Exclude<Modal, null>, string][] = [
    ['intro', '🏪 Giới thiệu'], ['settings', '⚙️ Cài đặt'], ['guide', '📖 Hướng dẫn'], ['news', '🆕 Có gì mới'],
    ['board', '🏆 Xếp hạng'], ['feedback', '💬 Góp ý'], ['rules', '📜 Quy định'],
  ];
  const close = () => { if (m === 'intro') markLandingSeen(); setM(null); };
  return (
    <>
      <nav className="lm-grid" aria-label="Menu">
        {items.map(([k, label]) => <button key={k} className="login-btn small" onClick={() => setM(k)}>{label}</button>)}
      </nav>
      <PlayTimeCard />
      {m === 'intro' && <Sheet title={LANDING.title} onClose={close}><Intro onPlay={close} /></Sheet>}
      {m === 'settings' && <Suspense fallback={null}><SettingsPanel onClose={close} /></Suspense>}
      {m === 'rules' && <PrivacyPolicy onClose={close} />}
      {m === 'guide' && (
        <Sheet title="Hướng dẫn chơi" onClose={close}><Guide /></Sheet>
      )}
      {m === 'news' && (
        <Sheet title="Có gì mới" onClose={close}>
          {WHATS_NEW.map((e) => (
            <section key={e.date + e.title}><h3>{e.title} <em>{e.date}</em></h3><ul>{e.lines.map((l) => <li key={l}>{l}</li>)}</ul></section>
          ))}
        </Sheet>
      )}
      {m === 'board' && <Sheet title="Bảng xếp hạng" onClose={close}><BoardTabs /></Sheet>}
      {m === 'feedback' && <Sheet title="Góp ý" onClose={close}><Feedback /></Sheet>}
    </>
  );
}
