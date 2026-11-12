import { shopHoursLabel } from '../data/shopHours';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { applySnapshot, loadDiscarded, loadGame, readDiscardedSave, readLocalSave, stashDiscarded, type SaveData } from '../core/save';
import { aheadOf, losesMuch } from '../core/saveCompare';
import { useGame } from '../core/store';
import { formatMoney } from '../data/products';
import { cloudSaveWithin, prefetchCloudSave } from '../net/cloud';
import { giftOfStreak, giftText, scaledGift } from '../data/gifts';
import { returnNudge, returnNudgeWeek } from '../data/returnReminder';
import type { WeekTally } from '../data/bizWeeks';
import { firebaseReady, loginGoogle, logoutGoogle } from '../net/firebase';
import { useSession, type SaveSummary } from '../net/session';
import { recordConsent } from '../net/consent';
import { allConsentsGiven, CONSENT_SCOPES, type ConsentScope } from '../net/consentPolicy';
import { PrivacyPolicy } from './PrivacyPolicy';
import './login.css';
// GĐ521: bảng hẻm online tải lười (bù ngân sách tải đầu)
const AlleyPanel = lazy(() => import('./AlleyPanel').then((m) => ({ default: m.AlleyPanel })));

/** Vào game: đóng màn đăng nhập, cho thời gian chạy. */
export function startGame() {
  useSession.setState({ screen: 'game' });
  // Vào hẻm đang có người chạy: tốc độ là của cả hẻm, không chỉnh
  if (useSession.getState().coop?.role !== 'player') useGame.setState({ speed: 1 });
  // Thưởng "Chào mừng quay lại" (GĐ39): soi khi nạp bản lưu và vào chơi đơn — không vào hẻm người khác
  if (!useSession.getState().coop) {
    useGame.getState().checkWelcomeBack();
    // GĐ1497 — doanh thu vắng mặt (khu ăn tại chỗ): chỉ tiền, có điều kiện rõ ràng
    useGame.getState().collectOfflineRevenue();
  }
}

const ago = (iso: string | number) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  if (min < 1440) return `${Math.round(min / 60)} giờ trước`;
  return `${Math.round(min / 1440)} ngày trước`;
};

function SaveButton({ title, save, onPick, ahead }: { title: string; save: SaveSummary; onPick: () => void; ahead?: boolean }) {
  return (
    <button className={`login-save${ahead ? ' ahead' : ''}`} onClick={onPick}>
      {ahead && <em className="login-save-badge">⭐ Tiến xa hơn</em>}
      <strong>{title}</strong>
      <span>Ngày {save.day} · cấp {save.level}</span>
      <span>{formatMoney(save.money)}</span>
      <span>Lưu {ago(save.updatedAt)}</span>
    </button>
  );
}

export function LoginScreen() {
  const { account, authChecked } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Đồng ý xử lý dữ liệu (Luật 91/2025): khoá nút Google tới khi tick + đọc Chính sách. */
  const [consents, setConsents] = useState<Partial<Record<ConsentScope, boolean>>>({});
  const [showPrivacy, setShowPrivacy] = useState(false);
  /** Đặt cờ này trước khi mở popup Google; khi `account` có (watchUser) thì ghi bằng chứng đồng ý. */
  const pendingConsent = useRef(false);
  /** Cả máy và cloud đều có bản lưu khác nhau: cho người chơi chọn. */
  const [choice, setChoice] = useState<{ local: SaveSummary; cloud: SaveSummary & { data: SaveData } } | null>(null);
  /** Bản người chơi vừa bấm nhưng kém tiến độ rõ rệt: chờ xác nhận lần hai. */
  const [warn, setWarn] = useState<'cloud' | 'local' | null>(null);
  const discarded = readDiscardedSave();

  const local = readLocalSave();
  const localSummary: SaveSummary | null = local && {
    updatedAt: new Date(local.savedAt).toISOString(), day: local.data.day, level: local.data.level, money: local.data.money,
  };

  // Đổi tài khoản thì bỏ lựa chọn cũ
  useEffect(() => { setChoice(null); setWarn(null); }, [account?.uid]);
  // GĐ1822: biết tài khoản là tải trước bản cloud, bấm "Vào tiệm" khỏi chờ
  useEffect(() => { if (account?.uid) prefetchCloudSave(account.uid).catch(() => {}); }, [account?.uid]);

  // User đã tick đồng ý và đăng nhập xong → ghi bằng chứng đồng ý lên server (một lần/phiên/scope)
  useEffect(() => {
    if (account && pendingConsent.current) {
      pendingConsent.current = false;
      for (const scope of CONSENT_SCOPES) void recordConsent(scope);
    }
  }, [account]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  /** Đã đăng nhập: lấy bản cloud, so với bản trong máy rồi vào chơi. */
  const enterWithAccount = () => run(async () => {
    if (!account) return;
    let got: Awaited<ReturnType<typeof cloudSaveWithin>>;
    try {
      got = await cloudSaveWithin(account.uid, 8000);
    } catch {
      throw new Error('Không kết nối được server lưu cloud. Kiểm tra "npm run server" đang chạy, hoặc chơi bằng bản trong máy.');
    }
    // GĐ1822: server chậm quá 8s mà máy có bản lưu → vào bằng bản máy luôn, lần lưu sau tự đồng bộ
    if (got === 'timeout') {
      if (!localSummary) throw new Error('Server lưu cloud phản hồi chậm — thử lại sau giây lát.');
      loadGame();
      startGame();
      return;
    }
    const cloud = got;
    if (cloud && localSummary && cloud.day !== localSummary.day) {
      setChoice({ local: localSummary, cloud });
      return;
    }
    if (cloud) applySnapshot(cloud.data);
    else loadGame();
    startGame();
  });

  /** Chốt bản được chọn; bản còn lại được cất vào kho "bản đã bị thay" trước khi bị ghi đè. */
  const commitPick = (kind: 'cloud' | 'local') => {
    if (!choice || !local) return;
    if (kind === 'cloud') {
      stashDiscarded(local.data, local.savedAt, 'local');
      applySnapshot(choice.cloud.data);
    } else {
      stashDiscarded(choice.cloud.data, Date.parse(choice.cloud.updatedAt) || Date.now(), 'cloud');
      loadGame();
    }
    startGame();
  };
  /** Bấm chọn: kém tiến độ rõ rệt thì hỏi lại một lần, không thì vào luôn. */
  const pick = (kind: 'cloud' | 'local') => {
    if (!choice) return;
    const [chosen, other] = kind === 'cloud' ? [choice.cloud, choice.local] : [choice.local, choice.cloud];
    if (warn !== kind && losesMuch(chosen, other)) { setWarn(kind); return; }
    commitPick(kind);
  };

  const enterAsGuest = () => {
    loadGame();
    startGame();
  };


  return (
    <div className="login">
      <div className="login-col">
        <header className="login-sign">
          <h1>Tạp Hóa<br />Đầu Ngõ</h1>
          <p>Mở tiệm nhỏ đầu ngõ, bán từng gói mì, nuôi lớn thành siêu thị.</p>
          <span className="login-addr">Mở cửa {shopHoursLabel('grocery').replace('–', ' – ')}</span>
        </header>

        <section className="login-card" aria-live="polite">
          {local && <DailyNudge g={local.data} />}
          {local && <ReturnNudge g={local.data} />}
          {discarded && (
            <button className="login-link" onClick={() => { loadDiscarded(); startGame(); }}>
              ↩️ Khôi phục bản đã bị thay: {discarded.from === 'cloud' ? '☁️ cloud' : '💻 máy'} · ngày {discarded.data.day}, cấp {discarded.data.level}, {formatMoney(discarded.data.money)} · lưu {ago(discarded.savedAt)}
            </button>
          )}
          {choice ? (
            <>
              <h2>Chọn bản lưu để chơi tiếp</h2>
              <p className="login-muted">Máy này và cloud đang có hai bản khác nhau. Bản không chọn sẽ bị ghi đè ở lần lưu sau (game cất một bản sao để bạn khôi phục được).</p>
              {(() => {
                const lead = aheadOf(choice.cloud, choice.local);
                return (
                  <div className="login-saves">
                    <SaveButton title="☁️ Trên cloud" save={choice.cloud} ahead={lead === 'a'} onPick={() => pick('cloud')} />
                    <SaveButton title="💻 Trong máy này" save={choice.local} ahead={lead === 'b'} onPick={() => pick('local')} />
                  </div>
                );
              })()}
              {warn && (
                <div className="login-warn" role="alert">
                  ⚠️ Bản {warn === 'cloud' ? 'cloud' : 'trong máy'} kém tiến độ hơn nhiều
                  (ngày {(warn === 'cloud' ? choice.cloud : choice.local).day}, cấp {(warn === 'cloud' ? choice.cloud : choice.local).level}
                  {' '}so với ngày {(warn === 'cloud' ? choice.local : choice.cloud).day}, cấp {(warn === 'cloud' ? choice.local : choice.cloud).level}).
                  Chọn bản này, bản kia sẽ bị ghi đè — vẫn chọn?
                  <div className="login-row">
                    <button className="login-btn small" onClick={() => commitPick(warn)}>Vẫn chọn bản này</button>
                    <button className="login-btn small primary" onClick={() => setWarn(null)}>Chọn lại</button>
                  </div>
                </div>
              )}
            </>
          ) : account ? (
            <>
              <div className="login-user">
                {account.photo && <img src={account.photo} alt="" referrerPolicy="no-referrer" />}
                <div>
                  <strong>{account.name}</strong>
                  <span className="login-muted">Tiến trình được lưu lên cloud</span>
                </div>
                <button className="login-link" onClick={() => logoutGoogle()}>Đăng xuất</button>
              </div>
              <button className="login-btn primary" disabled={busy} onClick={enterWithAccount}>
                {busy ? 'Đang tải bản lưu…' : 'Vào tiệm'}
              </button>
            </>
          ) : (
            <>
              <h2>Đăng nhập để lưu tiến trình</h2>
              <p className="login-muted">Đăng nhập Google để chơi tiếp trên máy khác. Chơi không đăng nhập thì tiến trình chỉ nằm trong trình duyệt này.</p>
              <label className="login-consent">
                <input type="checkbox" checked={consents.account_cloud === true}
                  onChange={(e) => setConsents((c) => ({ ...c, account_cloud: e.target.checked }))} />
                <span>
                  Tôi đồng ý cho xử lý dữ liệu tài khoản Google và lưu tiến trình lên cloud theo{' '}
                  <button className="link" type="button" onClick={() => setShowPrivacy(true)}>Chính sách bảo mật</button>.
                </span>
              </label>
              <label className="login-consent">
                <input type="checkbox" checked={consents.terms === true}
                  onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))} />
                <span>
                  Tôi chấp nhận{' '}
                  <button className="link" type="button" onClick={() => setShowPrivacy(true)}>Điều khoản sử dụng</button>.
                </span>
              </label>
              <button
                className="login-btn primary"
                disabled={!authChecked || busy || !firebaseReady || !allConsentsGiven(consents)}
                onClick={() => {
                  pendingConsent.current = true;
                  void run(async () => void (await loginGoogle()));
                }}
              >
                <GoogleMark /> Đăng nhập bằng Google
              </button>
              <button className="login-btn" disabled={busy} onClick={enterAsGuest}>
                {localSummary ? `Chơi tiếp trong máy (ngày ${localSummary.day})` : 'Chơi không cần đăng nhập'}
              </button>
              <p className="login-muted login-coop-hint">🏘️ Muốn chơi chung với bạn bè (2–4 người)? Đăng nhập Google để mở hẻm online lưu trên server.</p>
            </>
          )}

          {error && <p className="login-error">{error}</p>}
        </section>
      </div>
      {/* Bảng hẻm online tách riêng thẻ đăng nhập: nhiều hẻm không đấy thông tin đăng nhập */}
      {account && !choice && (
        <Suspense fallback={null}><AlleyPanel busy={busy} run={run} onEnter={startGame} /></Suspense>
      )}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

/**
 * Móc giữ chân người chơi cũ: nhắc quà điểm danh + streak ngay trên màn đăng nhập,
 * cho lý do quay lại mỗi ngày. Không cần vào game cũng thấy được phần thưởng tiếp theo.
 */
function DailyNudge({ g }: { g: { day: number; level: number; giftStreak: number; giftLastDay: number } }) {
  if (g.giftLastDay === g.day) {
    const n = g.giftStreak;
    return (
      <div className="login-nudge">
        <span aria-hidden="true">✅</span>
        <span><b>Đã điểm danh hôm nay</b> · chuỗi {n} ngày — ngày mai quay lại để giữ mạch!</span>
      </div>
    );
  }
  const streak = g.giftLastDay === g.day - 1 ? g.giftStreak + 1 : 1;
  const gift = scaledGift(giftOfStreak(streak), g.level);
  return (
    <div className="login-nudge claimable">
      <span aria-hidden="true">🎁</span>
      <span>Quà điểm danh hôm nay: <b>{gift.icon} {gift.label}</b> ({giftText(gift)}) · chuỗi sắp tới <b>{streak}</b> ngày — vào tiệm nhận ngay!</span>
    </div>
  );
}

/**
 * GĐ2224+GĐ2225 — lớp nhắc "đã N ngày chưa quay" ở màn đăng nhập: cho người quay lại lý do bền bằng
 * cách liệt kê các mốc thưởng sắp hết hạn (thưởng tròn năm / sự kiện mùa / mốc niên giám) — khác quà
 * chào mừng (checkWelcomeBack) vốn chỉ bắn một notify lúc vào game. THUẦN đọc (returnNudge từ
 * lastSeenAt/day/level/almanac), không đổi state/save. Chơi đều mỗi ngày → mảng rỗng → không hiện.
 */
function ReturnNudge({ g }: { g: { day: number; level: number; lastSeenAt: number; biz?: { seasonAlmanac?: Record<string, number>; almanacClaimed?: number[]; week?: WeekTally; services?: string[] } } }) {
  const biz = g.biz;
  const almanac = biz?.seasonAlmanac ?? {};
  const total = Object.values(almanac).reduce((a, n) => a + (n ?? 0), 0);
  const items = returnNudge(Date.now(), g.lastSeenAt, g.day, g.level, total, biz?.almanacClaimed ?? []);
  const wk = returnNudgeWeek(Date.now(), g.lastSeenAt, g.day, g.level, biz?.week ?? null, biz?.services ?? []);
  const all = wk ? [{ key: 'week', icon: wk.icon, text: wk.text }, ...items] : items;
  if (!all.length) return null;
  return (
    <>
      {all.map((it) => (
        <div className="login-nudge" key={it.key}>
          <span aria-hidden="true">{it.icon}</span>
          <span>{it.text}</span>
        </div>
      ))}
    </>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
