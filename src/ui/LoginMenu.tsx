import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { whatsNewMarkSeen, whatsNewUnseen } from '../data/whatsNew';
import { WhatsNewList } from './WhatsNewList';
import { FEEDBACK_KINDS, CONTACT_MAX, TEXT_MAX, feedbackProblem, loadDraft, loadSent, saveDraft, sendFeedback, type FeedbackKind } from '../data/feedback';
import { loadPlayerName, NAME_MAX, savePlayerName, validatePlayerName } from '../data/playerName';
import { getBoard, type AlleyBoardRes, type BoardRes } from '../net/socialApi';
import { useSession } from '../net/session';
import { getGuestBoard, getPublicAlleyBoard, localLevel, submitGuestScore } from '../net/guestBoard';
import { DEVICES, KEYS, LANDING, guessDevice, guideFor, landingSeen, markLandingSeen, shouldShowLanding, type Device } from '../data/guide';
import { PLAY_LIMIT_MIN, PLAY_WARN_MIN, playMinutesToday } from '../data/playTime';
import { readLocalSave } from '../core/save';
import { PrivacyPolicy } from './PrivacyPolicy';
import { fmtDate, fmtNum } from '../core/format';
import { t } from '../core/i18n';

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
        <header><h2>{title}</h2><button className="login-link" onClick={onClose} aria-label={t('login.dong')}>✕</button></header>
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
  const fmt = (d: Date) => fmtDate(d, { day: '2-digit', month: '2-digit' });
  const ms = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const countdown = days > 0 ? t('login.con_ngay_gio', { days, hours }) : t('login.con_gio', { hours });
  return <p className="login-muted">🗓️ {fmt(start)} – {fmt(end)}{' '}{t('login.chot_23_59_chu_nhat_gio')}{' '}{countdown}</p>;
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
      <p className="login-muted">{t('login.cac_hem_choi_chung_co_op')}</p>
      <WeekCut />
      {err && <p className="login-error">{err}</p>}
      {!res && !err && <p className="login-muted">{t('login.dang_tai')}</p>}
      {res && (res.rows.length === 0 ? <p className="login-muted">{t('login.tuan_nay_chua_co_hem_nao')}</p> : (
        <ol className="lm-board">
          {res.rows.map((r) => <li key={r.rank}><b>#{r.rank}</b><span>{r.name || t('login.hem', { key: r.key })} <small>{r.together}{' '}{t('login.ngay_3')}</small></span><em>{r.score}</em></li>)}
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
      <p className="login-muted">{t('login.top_tiem_tuan_nay_nguoi_dang')}</p>
      <WeekCut />
      <div className="login-row">
        <button className={`login-btn small${scope === 'server' ? ' primary' : ''}`} onClick={() => setScope('server')}>{t('login.toan_server')}</button>
        {friendsOk && <button className={`login-btn small${scope === 'friends' ? ' primary' : ''}`} onClick={() => setScope('friends')}>{t('login.ban_be')}</button>}
      </div>
      {err && <p className="login-error">{err}</p>}
      {!res && !err && <p className="login-muted">{t('login.dang_tai')}</p>}
      {res && (res.top.length === 0 ? <p className="login-muted">{t('login.tuan_nay_chua_co_ai_len')}</p> : (
        <ol className="lm-board">
          {res.top.map((r) => (
            <li key={r.uid} className={res.self && r.rank === res.self.rank ? 'mine' : undefined}><b>#{r.rank}</b><span>{r.flagged ? t('login.tiem_an') : (r.name || t('login.tiem', { v0: r.uid.slice(0, 4) }))}</span><em>{fmtNum(r.score)}</em></li>
          ))}
        </ol>
      ))}
      {res?.self && <p className="login-muted">{t('login.hang_cua_ban')}{res.self.rank}/{res.total} · Top {res.self.percent}% · {fmtNum(res.self.score)}{' '}{t('login.diem')}</p>}
      <button className="login-btn small" onClick={() => setTick((t) => t + 1)}>{t('login.lam_moi')}</button>
    </>
  );
}

function BoardTabs() {
  const [kind, setT] = useState<'shop' | 'coop'>('shop');
  return (
    <>
      <div className="lm-kinds">
        <button className={`login-btn small${kind === 'shop' ? ' primary' : ''}`} onClick={() => setT('shop')}>{t('login.tiem_2')}</button>
        <button className={`login-btn small${kind === 'coop' ? ' primary' : ''}`} onClick={() => setT('coop')}>{t('login.co_op_hem')}</button>
      </div>
      {kind === 'shop' ? <Board /> : <AlleyBoard />}
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
      <p className="login-muted">{t('login.chon_thiet_bi_ban_dang_dung')}</p>
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
          <h3>{t('login.bang_phim')}</h3>
          <div className="lm-keys">{KEYS.map(([k, v]) => <div key={k}><kbd>{k}</kbd><span>{v}</span></div>)}</div>
        </section>
      )}
      <p className="login-muted">{t('login.choi_qua_180_phut_lien_tuc')}</p>
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
      setMsg({ ok: true, text: t('login.da_gui_cam_on_ban_da') });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    setBusy(false);
  };
  return (
    <>
      <p className="login-muted">{t('login.khong_can_dang_nhap_moi_gop')}</p>
      <div className="lm-kinds">
        {FEEDBACK_KINDS.map(([k, label]) => (
          <button key={k} className={`login-btn small${d.kind === k ? ' primary' : ''}`} onClick={() => set({ kind: k as FeedbackKind })}>{label}</button>
        ))}
      </div>
      <textarea className="lm-text" rows={5} maxLength={TEXT_MAX} value={d.text} placeholder={t('login.ban_muon_noi_gi_voi_tac')} onChange={(e) => set({ text: e.target.value })} />
      <div className="lm-count">{d.text.length}/{TEXT_MAX}</div>
      <input className="lm-input" maxLength={CONTACT_MAX} value={d.contact} placeholder={t('login.email_zalo_de_tac_gia_tra')} onChange={(e) => set({ contact: e.target.value })} />
      <label className="login-consent"><input type="checkbox" checked={withTech} onChange={(e) => setWithTech(e.target.checked)} /><span>{t('login.kem_thong_tin_may_trinh_duyet')}</span></label>
      <button className="login-btn primary" disabled={busy} onClick={submit}>{busy ? t('login.dang_gui') : t('login.gui_gop_y')}</button>
      {msg && <p className={msg.ok ? 'login-muted' : 'login-error'} role="status">{msg.text}</p>}
      {sent.length > 0 && (
        <>
          <h3>{t('login.gop_y_cua_ban')}</h3>
          <ul className="lm-sent">
            {sent.map((s) => <li key={s.at}><em>{fmtDate(s.at)}</em> {s.text.length > 90 ? `${s.text.slice(0, 90)}…` : s.text}</li>)}
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
      <label htmlFor="lm-name-in">{t('login.ten_cua_ban_hien_tren_bang')}</label>
      <input id="lm-name-in" className="lm-input" maxLength={NAME_MAX} value={v} placeholder={t('login.vi_du_tiem_co_ba')} onChange={(e) => change(e.target.value)} />
      {err && <p className="login-error" role="alert">{err}</p>}
      {ok && <p className="login-muted">{t('login.da_luu_ten')}</p>}
      {!v.trim() && !err && <p className="login-muted">{t('login.chua_dat_ten_bang_xep_hang')}{saved ? ` ("${saved}")` : t('login.tap_hoa_dau_ngo')}.</p>}
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
        {t('login.hom_nay_ban_da_choi')}{' '}<b>{min}{' '}{t('login.phut')}</b>.
        {over
          ? t('login.da_qua_moc_180_phut_khuyen')
          : warn
            ? t('login.gan_moc_phut_khuyen_nghi_roi', { PLAY_LIMIT_MIN })
            : t('login.choi_qua_phut_lien_tuc_hai', { PLAY_LIMIT_MIN })}
      </span>
    </div>
  );
}

export function LoginMenu() {
  const [m, setM] = useState<Modal>(() => (shouldShowLanding(!!readLocalSave(), landingSeen()) ? 'intro' : null));
  const [newsUnseen, setNewsUnseen] = useState(whatsNewUnseen);
  const items: [Exclude<Modal, null>, string][] = [
    ['intro', t('login.gioi_thieu')], ['settings', t('login.cai_dat')], ['guide', t('login.huong_dan')], ['news', t('login.co_gi_moi')],
    ['board', t('login.xep_hang')], ['feedback', t('login.gop_y')], ['rules', t('login.quy_dinh')],
  ];
  const close = () => { if (m === 'intro') markLandingSeen(); setM(null); };
  const open = (k: Exclude<Modal, null>) => {
    setM(k);
    if (k === 'news') { whatsNewMarkSeen(); setNewsUnseen(false); }
  };
  return (
    <>
      <nav className="lm-grid" aria-label="Menu">
        {items.map(([k, label]) => (
          <button key={k} className="login-btn small" onClick={() => open(k)}>
            {label}
            {k === 'news' && newsUnseen && (
              <span aria-hidden="true" data-testid="whats-new-dot"
                style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d64545', marginLeft: 6, verticalAlign: 'middle' }} />
            )}
          </button>
        ))}
      </nav>
      <PlayTimeCard />
      {m === 'intro' && <Sheet title={LANDING.title} onClose={close}><Intro onPlay={close} /></Sheet>}
      {m === 'settings' && <Suspense fallback={null}><SettingsPanel onClose={close} /></Suspense>}
      {m === 'rules' && <PrivacyPolicy onClose={close} />}
      {m === 'guide' && (
        <Sheet title={t('login.huong_dan_choi')} onClose={close}><Guide /></Sheet>
      )}
      {m === 'news' && (
        <Sheet title={t('login.co_gi_moi_2')} onClose={close}>
          <WhatsNewList />
        </Sheet>
      )}
      {m === 'board' && <Sheet title={t('login.bang_xep_hang')} onClose={close}><BoardTabs /></Sheet>}
      {m === 'feedback' && <Sheet title={t('login.gop_y_2')} onClose={close}><Feedback /></Sheet>}
    </>
  );
}
