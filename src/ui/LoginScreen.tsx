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
import { LoginMenu, NameField } from './LoginMenu';
import { loadPlayerName } from '../data/playerName';
import { t } from '../core/i18n';
import './login.css';
// GĐ521: bảng hẻm online tải lười (bù ngân sách tải đầu)
const AlleyPanel = lazy(() => import('./AlleyPanel').then((m) => ({ default: m.AlleyPanel })));

/** Vào game: đóng màn đăng nhập, cho thời gian chạy. */
export function startGame() {
  useSession.setState({ screen: 'game' });
  // Vào hẻm đang có người chạy: tốc độ là của cả hẻm, không chỉnh
  if (useSession.getState().coop?.role !== 'player') useGame.setState({ speed: 1 });
  // Tên người chơi đặt ở màn đăng nhập → tên tiệm (hiện trên bảng xếp hạng), chỉ khi chơi đơn
  const nick = loadPlayerName();
  if (nick && !useSession.getState().coop) useGame.getState().setShopName(nick);
  // Thưởng "Chào mừng quay lại" (GĐ39): soi khi nạp bản lưu và vào chơi đơn — không vào hẻm người khác
  if (!useSession.getState().coop) {
    useGame.getState().checkWelcomeBack();
    // GĐ1497 — doanh thu vắng mặt (khu ăn tại chỗ): chỉ tiền, có điều kiện rõ ràng
    useGame.getState().collectOfflineRevenue();
  }
}

const ago = (iso: string | number) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return t('login.vua_xong');
  if (min < 60) return t('login.phut_truoc', { min });
  if (min < 1440) return t('login.gio_truoc', { v0: Math.round(min / 60) });
  return t('login.ngay_truoc', { v0: Math.round(min / 1440) });
};

function SaveButton({ title, save, onPick, ahead }: { title: string; save: SaveSummary; onPick: () => void; ahead?: boolean }) {
  return (
    <button className={`login-save${ahead ? ' ahead' : ''}`} onClick={onPick}>
      {ahead && <em className="login-save-badge">{t('login.tien_xa_hon')}</em>}
      <strong>{title}</strong>
      <span>{t('login.ngay')}{' '}{save.day}{' '}{t('login.cap')}{' '}{save.level}</span>
      <span>{formatMoney(save.money)}</span>
      <span>{t('login.luu')}{' '}{ago(save.updatedAt)}</span>
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
      throw new Error(t('login.khong_ket_noi_duoc_server_luu'));
    }
    // GĐ1822: server chậm quá 8s mà máy có bản lưu → vào bằng bản máy luôn, lần lưu sau tự đồng bộ
    if (got === 'timeout') {
      if (!localSummary) throw new Error(t('login.server_luu_cloud_phan_hoi_cham'));
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
          <h1>{t('login.tap_hoa')}<br />{t('login.dau_ngo')}</h1>
          <p>{t('login.mo_tiem_nho_dau_ngo_ban')}</p>
          <span className="login-addr">{t('login.mo_cua')}{' '}{shopHoursLabel('grocery').replace('–', ' – ')}</span>
        </header>

        <section className="login-card" aria-live="polite">
          {local && <DailyNudge g={local.data} />}
          {local && <ReturnNudge g={local.data} />}
          {discarded && (
            <button className="login-link" onClick={() => { loadDiscarded(); startGame(); }}>
              {t('login.khoi_phuc_ban_da_bi_thay')}{' '}{discarded.from === 'cloud' ? '☁️ cloud' : t('login.may')}{' '}{t('login.ngay_2')}{' '}{discarded.data.day}{t('login.cap_2')}{' '}{discarded.data.level}, {formatMoney(discarded.data.money)}{' '}{t('login.luu_2')}{' '}{ago(discarded.savedAt)}
            </button>
          )}
          {choice ? (
            <>
              <h2>{t('login.chon_ban_luu_de_choi_tiep')}</h2>
              <p className="login-muted">{t('login.may_nay_va_cloud_dang_co')}</p>
              {(() => {
                const lead = aheadOf(choice.cloud, choice.local);
                return (
                  <div className="login-saves">
                    <SaveButton title={t('login.tren_cloud')} save={choice.cloud} ahead={lead === 'a'} onPick={() => pick('cloud')} />
                    <SaveButton title={t('login.trong_may_nay')} save={choice.local} ahead={lead === 'b'} onPick={() => pick('local')} />
                  </div>
                );
              })()}
              {warn && (
                <div className="login-warn" role="alert">
                  {t('login.ban')}{' '}{warn === 'cloud' ? 'cloud' : t('login.trong_may')}{' '}{t('login.kem_tien_do_hon_nhieu_ngay')}{' '}{(warn === 'cloud' ? choice.cloud : choice.local).day}{t('login.cap_2')}{' '}{(warn === 'cloud' ? choice.cloud : choice.local).level}
                  {' '}{t('login.so_voi_ngay')}{' '}{(warn === 'cloud' ? choice.local : choice.cloud).day}{t('login.cap_2')}{' '}{(warn === 'cloud' ? choice.local : choice.cloud).level}{t('login.chon_ban_nay_ban_kia_se')}
                  <div className="login-row">
                    <button className="login-btn small" onClick={() => commitPick(warn)}>{t('login.van_chon_ban_nay')}</button>
                    <button className="login-btn small primary" onClick={() => setWarn(null)}>{t('login.chon_lai')}</button>
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
                  <span className="login-muted">{t('login.tien_trinh_duoc_luu_len_cloud')}</span>
                </div>
                <button className="login-link" onClick={() => logoutGoogle()}>{t('login.dang_xuat')}</button>
              </div>
              <button className="login-btn primary" disabled={busy} onClick={enterWithAccount}>
                {busy ? t('login.dang_tai_ban_luu') : t('login.vao_tiem')}
              </button>
            </>
          ) : (
            <>
              <h2>{t('login.dang_nhap_de_luu_tien_trinh')}</h2>
              <p className="login-muted">{t('login.dang_nhap_google_de_choi_tiep')}</p>
              <label className="login-consent">
                <input type="checkbox" checked={consents.account_cloud === true}
                  onChange={(e) => setConsents((c) => ({ ...c, account_cloud: e.target.checked }))} />
                <span>
                  {t('login.toi_dong_y_cho_xu_ly')}{' '}
                  <button className="link" type="button" onClick={() => setShowPrivacy(true)}>{t('login.chinh_sach_bao_mat')}</button>.
                </span>
              </label>
              <label className="login-consent">
                <input type="checkbox" checked={consents.terms === true}
                  onChange={(e) => setConsents((c) => ({ ...c, terms: e.target.checked }))} />
                <span>
                  {t('login.toi_chap_nhan')}{' '}
                  <button className="link" type="button" onClick={() => setShowPrivacy(true)}>{t('login.dieu_khoan_su_dung')}</button>.
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
                <GoogleMark />{' '}{t('login.dang_nhap_bang_google')}
              </button>
              <button className="login-btn" disabled={busy} onClick={enterAsGuest}>
                {localSummary ? t('login.choi_tiep_trong_may_ngay', { day: localSummary.day }) : t('login.choi_khong_can_dang_nhap')}
              </button>
              <p className="login-muted login-coop-hint">{t('login.muon_choi_chung_voi_ban_be')}</p>
            </>
          )}

          {error && <p className="login-error">{error}</p>}
          {!choice && <NameField />}
          <LoginMenu />
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
        <span><b>{t('login.da_diem_danh_hom_nay')}</b>{' '}{t('login.chuoi')}{' '}{n}{' '}{t('login.ngay_ngay_mai_quay_lai_de')}</span>
      </div>
    );
  }
  const streak = g.giftLastDay === g.day - 1 ? g.giftStreak + 1 : 1;
  const gift = scaledGift(giftOfStreak(streak), g.level);
  return (
    <div className="login-nudge claimable">
      <span aria-hidden="true">🎁</span>
      <span>{t('login.qua_diem_danh_hom_nay')}{' '}<b>{gift.icon} {gift.label}</b> ({giftText(gift)}{t('login.chuoi_sap_toi')}{' '}<b>{streak}</b>{' '}{t('login.ngay_vao_tiem_nhan_ngay')}</span>
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
