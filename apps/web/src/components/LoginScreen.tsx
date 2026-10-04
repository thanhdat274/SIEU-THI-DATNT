import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { deleteSaveSlot, getActiveSlotId, listSaveSlots, loadExistingSave, resetSaveToDefault, setActiveSlotId, type SaveSlotId, type SaveSlotInfo } from '../db';
import { acquireSlotLock, releaseSlotLock, slotsLockedElsewhere } from '../slot-lock';
import { listUserWorlds, createOnlineWorld, joinOnlineWorld, getLeaderboard, type WorldSummary, type WorldDetail, type ActivitiesResponse, type LeaderboardResponse } from '../services/api';
import { useControlMode, setControlMode, type ControlMode } from '../control-mode';
import './LoginScreen.css';

interface LoginScreenProps {
  onEnter: (onlineWorld?: WorldDetail) => void;
}

// Gentle Web Audio feedback for tactile cozy game feel
function playChime(freq = 440, soundEnabled = true) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch {
    // AudioContext might be restricted until user gesture, safely ignore
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onEnter }) => {
  const controlMode = useControlMode();
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveDay, setSaveDay] = useState<number>(1);
  const [hasSave, setHasSave] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardState, setLeaderboardState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [showMultiplayerModal, setShowMultiplayerModal] = useState<boolean>(false);
  const [userWorlds, setUserWorlds] = useState<WorldSummary[]>([]);
  const [newWorldName, setNewWorldName] = useState<string>('');
  const [joinToken, setJoinToken] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [loadingWorlds, setLoadingWorlds] = useState<boolean>(false);
  const [absenceActivities, setAbsenceActivities] = useState<ActivitiesResponse['activities']>([]);
  const [absenceHasMore, setAbsenceHasMore] = useState<boolean>(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState<boolean>(false);
  const [selectedWorldDetail, setSelectedWorldDetail] = useState<WorldDetail | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'daily' | 'controls' | 'stock' | 'features' | 'coop'>('daily');

  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [activeSlot, setActiveSlot] = useState<SaveSlotId>(getActiveSlotId());
  const [lockedSlots, setLockedSlots] = useState<Set<SaveSlotId>>(new Set());
  const [slotsExpanded, setSlotsExpanded] = useState<boolean>(false);
  // Chỉ hiện hàng chọn ô khi thật sự có lựa chọn: từ hai bản lưu trở lên, hoặc bản lưu duy nhất không nằm ở ô đang chọn, hoặc người chơi tự mở.
  const filledSlots = slots.filter((slot) => slot.status !== 'empty');
  const showSlotRow = slotsExpanded || filledSlots.length >= 2 || (filledSlots.length === 1 && filledSlots[0].slotId !== activeSlot);

  // Đọc ba ô lưu và ô đang chọn từ IndexedDB; làm mới khi quay lại tab (tab khác có thể đã đổi/khóa ô).
  const refreshSlots = React.useCallback(async () => {
    try {
      const [list, locked] = await Promise.all([listSaveSlots(), slotsLockedElsewhere()]);
      let selectedSlot = getActiveSlotId();
      const occupied = list.filter((slot) => slot.status !== 'empty');
      if (list.find((slot) => slot.slotId === selectedSlot)?.status === 'empty' && occupied.length === 1) {
        selectedSlot = occupied[0].slotId;
        setActiveSlotId(selectedSlot);
        setActiveSlot(selectedSlot);
      }
      const save = await loadExistingSave(selectedSlot);
      setSlots(list);
      setLockedSlots(locked);
      setHasSave(!!save);
      setSaveDay(save?.worldTime.day ?? 1);
    } catch (err) {
      console.error('Không đọc được các ô lưu:', err);
    }
  }, []);

  useEffect(() => {
    void refreshSlots();
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSlots(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refreshSlots]);

  const handleSelectSlot = async (slotId: SaveSlotId) => {
    triggerSound(420);
    setActiveSlotId(slotId);
    setActiveSlot(slotId);
    await refreshSlots();
  };

  const handleDeleteSlot = async (slot: SaveSlotInfo) => {
    if (!window.confirm(`Xóa hẳn Ô ${slot.number} (và bản dự phòng của ô này)? Không thể hoàn tác.`)) return;
    setBusy(true);
    try {
      await deleteSaveSlot(slot.slotId);
      setFeedbackMsg(`Đã xóa Ô ${slot.number}.`);
    } catch (err) {
      console.error(err);
      setFeedbackMsg('Không xóa được ô lưu. Vui lòng thử lại.');
    } finally {
      setBusy(false);
      await refreshSlots();
    }
  };

  /** Giữ khóa ô đang chọn trước khi vào chơi một mình; ô đang mở ở tab khác thì không vào. */
  const claimActiveSlot = async (): Promise<boolean> => {
    if (await acquireSlotLock(getActiveSlotId())) return true;
    setFeedbackMsg('Ô lưu này đang mở ở một thẻ khác. Hãy đóng thẻ đó hoặc chọn ô khác.');
    await refreshSlots();
    return false;
  };

  const handleContinue = async () => {
    triggerSound(580);
    setBusy(true);
    try {
      if (!(await claimActiveSlot())) return;
      onEnter();
    } finally {
      setBusy(false);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    void Promise.all([import('../services/firebase'), import('firebase/auth')])
      .then(([service, sdk]) => {
        if (!stopped) unsubscribe = sdk.onAuthStateChanged(service.gameAuth(), setUser);
      })
      .catch(() => {
        // Firebase auth not configured or offline
      });
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, []);

  const triggerSound = (freq = 440) => {
    playChime(freq, soundEnabled);
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) playChime(520, true);
      return next;
    });
  };

  async function getIdToken(): Promise<string> {
    if (!user) throw new Error('Cần đăng nhập tài khoản trước.');
    return user.getIdToken();
  }

  async function handleOpenLeaderboard() {
    triggerSound(440);
    setShowLeaderboard(true);
    setLeaderboard(null);
    if (!user) { setLeaderboardState('idle'); return; }
    setLeaderboardState('loading');
    try {
      setLeaderboard(await getLeaderboard(await getIdToken()));
      setLeaderboardState('idle');
    } catch (err) {
      console.error(err);
      setLeaderboardState('error');
    }
  }

  async function handleOpenMultiplayer() {
    triggerSound(400);
    if (!user) {
      setFeedbackMsg('Vui lòng đăng nhập Google trước để chơi chế độ Hẻm online!');
      return;
    }
    setShowMultiplayerModal(true);
    setLoadingWorlds(true);
    try {
      const token = await getIdToken();
      const worlds = await listUserWorlds(token);
      setUserWorlds(worlds);
    } catch (err) {
      console.error(err);
      setFeedbackMsg(err instanceof Error ? err.message : 'Không thể tải danh sách hẻm.');
    } finally {
      setLoadingWorlds(false);
    }
  }

  async function handleCreateWorld() {
    if (!newWorldName.trim()) return;
    triggerSound(480);
    setBusy(true);
    try {
      const token = await getIdToken();
      const detail = await createOnlineWorld(token, newWorldName.trim());
      setShowMultiplayerModal(false);
      onEnter(detail);
    } catch (err) {
      console.error(err);
      setFeedbackMsg(err instanceof Error ? err.message : 'Không tạo được hẻm mới.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinWorld() {
    if (!joinToken.trim()) return;
    triggerSound(480);
    setBusy(true);
    try {
      const token = await getIdToken();
      const detail = await joinOnlineWorld(token, joinToken.trim());
      setShowMultiplayerModal(false);
      onEnter(detail);
    } catch (err) {
      console.error(err);
      setFeedbackMsg(err instanceof Error ? err.message : 'Không thể tham gia hẻm bằng mã này.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSelectWorld(worldId: string) {
    triggerSound(520);
    setBusy(true);
    try {
      const token = await getIdToken();
      const { getOnlineWorld, listOnlineActivities } = await import('../services/api');
      const detail = await getOnlineWorld(token, worldId);
      const myMembership = detail.world.memberships.find((m) => m.accountId === user?.uid);
      const lastSeenRevision = myMembership?.lastSeenRevision;

      const res = await listOnlineActivities(token, worldId, { lastSeenRevision, limit: 100 }).catch(() => ({
        activities: [],
        totalCount: 0,
        hasMore: false,
      }));
      setShowMultiplayerModal(false);
      if (res.activities && res.activities.length > 0) {
        setAbsenceActivities(res.activities);
        setAbsenceHasMore(res.hasMore ?? false);
        setSelectedWorldDetail(detail);
        setShowAbsenceModal(true);
      } else {
        onEnter(detail);
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg(err instanceof Error ? err.message : 'Không thể tải dữ liệu hẻm.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleAuth() {
    triggerSound(440);
    setBusy(true);
    setFeedbackMsg('');
    try {
      const service = await import('../services/firebase');
      if (user) {
        await service.logoutGoogle();
        setFeedbackMsg('Đã đăng xuất tài khoản.');
      } else {
        await service.loginGoogle();
        setFeedbackMsg('Đăng nhập Google thành công!');
      }
    } catch (error) {
      const code = (error as { code?: string }).code;
      setFeedbackMsg(
        code === 'auth/unauthorized-domain'
          ? 'Tên miền chưa được thêm vào Authorized domains của Firebase.'
          : code === 'auth/operation-not-allowed'
          ? 'Google Sign-In chưa được kích hoạt trong Firebase console.'
          : code === 'auth/popup-closed-by-user'
          ? 'Bạn đã đóng cửa sổ đăng nhập.'
          : 'Không thể kết nối tài khoản Google.'
      );
    } finally {
      setBusy(false);
    }
  }

  const handleNewGame = async () => {
    triggerSound(380);
    const currentSlot = getActiveSlotId();
    setBusy(true);
    try {
      const latestSlots = await listSaveSlots();
      const emptySlot = latestSlots.find((slot) => slot.status === 'empty');
      const targetSlot = hasSave && emptySlot ? emptySlot.slotId : currentSlot;
      if (hasSave && !emptySlot && !window.confirm(
        `Bạn đang có bản lưu Ngày ${saveDay}. Cả ba ô đã dùng; bắt đầu tiệm mới sẽ đặt lại ô đang chọn. Bạn có chắc chắn không?`
      )) { setBusy(false); return; }
      setActiveSlotId(targetSlot);
      setActiveSlot(targetSlot);
      // Xin khóa trước khi ghi đè để không phá ô đang mở ở tab khác.
      if (!(await claimActiveSlot())) { setBusy(false); return; }
      await resetSaveToDefault();
      triggerSound(600);
      onEnter();
    } catch (err) {
      console.error('Failed to create new save:', err);
      releaseSlotLock();
      setFeedbackMsg('Lỗi tạo tiến trình mới. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  /** Chơi thử local — không cần Google Auth, tạo bản lưu mới tại ô đang chọn */
  const handleLocalDemo = async () => {
    triggerSound(380);
    setBusy(true);
    try {
      if (!(await claimActiveSlot())) return;
      await resetSaveToDefault();
      triggerSound(600);
      setFeedbackMsg('Chế độ Local Demo — không đồng bộ máy chủ. Chơi thử đơn player.');
      onEnter();
    } catch (err) {
      console.error('Local demo error:', err);
      setFeedbackMsg('Lỗi mở chế độ Local Demo. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  return (
    <main className="login-screen-vintage">
      {/* 1. CINEMATIC BACKGROUND: Sunset Sky, Clouds, Wires & Street Life */}
      <div className="login-backdrop" aria-hidden="true">
        {/* Soft Golden Sunset Sun & Halo */}
        <div className="sky-sun">
          <div className="sun-core" />
          <div className="sun-aura sun-aura-outer" />
          <div className="sun-aura sun-aura-inner" />
        </div>

        {/* Ambient Drifting Clouds */}
        <div className="clouds-layer">
          <div className="vintage-cloud cloud-a" />
          <div className="vintage-cloud cloud-b" />
          <div className="vintage-cloud cloud-c" />
          <div className="vintage-cloud cloud-d" />
        </div>

        {/* Traditional Alley Electric Wires & Sparrows */}
        <div className="wires-container">
          <div className="telegraph-pole" />
          <svg className="wire-svg" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path d="M0,80 Q360,140 720,95 T1440,110" className="wire-line wire-1" />
            <path d="M0,130 Q400,200 800,150 T1440,165" className="wire-line wire-2" />
            <path d="M0,175 Q480,240 960,195 T1440,210" className="wire-line wire-3" />
          </svg>
          <div className="sparrow sparrow-1" title="Chim sẻ đầu hẻm" />
          <div className="sparrow sparrow-2" />
          <div className="sparrow sparrow-3" />
        </div>

        {/* Corner Tree & Swaying Foliage */}
        <div className="corner-tree-canopy">
          <span className="foliage foliage-1" />
          <span className="foliage foliage-2" />
          <span className="foliage foliage-3" />
        </div>

        {/* Warm Golden Dust Floating Motes */}
        <div className="golden-motes">
          <span className="mote mote-1" />
          <span className="mote mote-2" />
          <span className="mote mote-3" />
          <span className="mote mote-4" />
          <span className="mote mote-5" />
          <span className="mote mote-6" />
        </div>
      </div>

      {/* 2. THE GRAND NOSTALGIC STOREFRONT (Full Architectural Backdrop) */}
      <div className="storefront-stage" aria-hidden="true">
        {/* Antique Tile Roof */}
        <div className="store-roof-layer">
          <div className="roof-ridge-crest" />
          <div className="roof-shingles" />
        </div>

        {/* Striped Canopy Awning */}
        <div className="store-awning-layer">
          <div className="awning-fabric">
            <div className="awning-valance-scallops" />
          </div>
          <div className="awning-struts">
            <span className="strut strut-left" />
            <span className="strut strut-center" />
            <span className="strut strut-right" />
          </div>
        </div>

        {/* Iconic Hand-Painted Vintage Signboard */}
        <div className="store-signboard-layer">
          <div className="sign-lanterns">
            <span className="sign-bulb bulb-left" />
            <span className="sign-bulb bulb-right" />
          </div>
          <div className="signboard-frame">
            <div className="signboard-body">
              <span className="sign-eyebrow">★ BÁCH HÓA TỔNG HỢP GIA ĐÌNH ★</span>
              <h2 className="sign-headline">TIỆM TẠP HÓA ĐẦU HẺM</h2>
              <span className="sign-tagline">Kính Chào Quý Khách · Buôn Bán Thật Thà</span>
            </div>
          </div>
        </div>

        {/* Facade Windows with Glowing Interior Shelves */}
        <div className="store-wall-facade">
          <div className="facade-window window-left">
            <div className="window-frame">
              <div className="shelf-tier tier-drinks" />
              <div className="shelf-tier tier-cans" />
            </div>
          </div>

          <div className="facade-entry">
            <div className="entry-interior-glow" />
            <div className="entry-bead-curtain" />
          </div>

          <div className="facade-window window-right">
            <div className="window-frame">
              <div className="shelf-tier tier-snacks" />
              <div className="shelf-tier tier-jars" />
            </div>
          </div>
        </div>

        {/* Sidewalk & Nostalgic Porch Accessories */}
        <div className="store-pavement-layer">
          <div className="pavement-curb" />
          <div className="porch-details">
            <div className="prop-planter-box" title="Thùng xốp trồng rau thơm" />
            <div className="prop-tea-jug" title="Bình trà đá miễn phí mát rượi" />
            <div className="prop-plastic-chair" title="Chiếc ghế nhựa đỏ quen thuộc" />
            <div className="prop-chalk-sign" title="Bảng hiệu phấn viết tay">
              <small>HÔM NAY CÓ</small>
              <strong>Kem Chuối</strong>
              <span>Nước Ngọt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE CONTROL HUB (Handcrafted Wood & Warm Kraft Deck) */}
      <div className="login-control-deck">
        {/* Top Header: Brand & Utilities */}
        <header className="deck-header">
          <div className="deck-brand-lockup">
            <div className="brand-badge-seal">
              <span className="seal-star">★</span>
              <span className="seal-year">1998</span>
            </div>
            <div className="brand-text-block">
              <span className="brand-mini-eyebrow">MỘT TIỆM NHỎ · MỘT CON HẺM THÂN THƯƠNG</span>
              <h1 className="brand-display-title">
                Tiệm Tạp Hóa <em>Đầu Hẻm</em>
              </h1>
            </div>
          </div>

          <div className="deck-top-actions">
            {/* Retro Radio Sound Switcher */}
            <button
              type="button"
              className={`sound-switch-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`}
              onClick={handleToggleSound}
              title={soundEnabled ? 'Âm thanh: Đang Bật (Bấm để tắt)' : 'Âm thanh: Đang Tắt (Bấm để bật)'}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              <span className="sound-disc-icon">{soundEnabled ? '♫' : '♪'}</span>
              <span className="sound-text-status">{soundEnabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}</span>
            </button>

            {/* Google Account Profile Capsule */}
            {user ? (
              <div className="auth-profile-pill">
                <span className="auth-avatar">
                  {(user.displayName || user.email || 'N').slice(0, 1).toUpperCase()}
                </span>
                <div className="auth-credentials">
                  <span className="auth-badge-role">Chủ Tiệm</span>
                  <strong className="auth-username" title={user.displayName || user.email || ''}>
                    {user.displayName || user.email}
                  </strong>
                </div>
                <button
                  type="button"
                  className="auth-btn-logout"
                  disabled={busy}
                  onClick={() => void handleGoogleAuth()}
                  title="Đăng xuất tài khoản Google"
                >
                  {busy ? '…' : 'Đăng xuất'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="auth-btn-google"
                disabled={busy}
                onClick={() => void handleGoogleAuth()}
                title="Đăng nhập Google để đồng bộ và chơi trực tuyến"
              >
                <span className="google-icon-wrapper">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.37 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2.0 10.05.0 12s.46 3.8 1.27 5.42l4.01-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </span>
                <span>{busy ? 'Đang kết nối…' : 'Đăng nhập Google'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div className="deck-feedback-bar" role="status">
            <span className="feedback-bulb">🔔</span>
            <span className="feedback-msg-text">{feedbackMsg}</span>
            <button
              type="button"
              className="feedback-dismiss-btn"
              onClick={() => setFeedbackMsg('')}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Hero Save Card & Action Tiles */}
        <div className="deck-content-split">
          {/* Left Column: Primary Save State & Play Button */}
          <section className="deck-save-spotlight" aria-label="Tiến trình tiệm của bạn">
            <div className="spotlight-ribbon-tag">
              {hasSave ? '★ HỒ SƠ TIỆM HOẠT ĐỘNG' : '★ KHAI TRƯƠNG TIỆM MỚI'}
            </div>

            <div className="spotlight-inner-box">
              <div className="spotlight-badge-row">
                <div className="spotlight-shop-icon">🏪</div>
                <div className="spotlight-title-group">
                  <span className="spotlight-kicker">{hasSave ? 'TIẾN TRÌNH TRÊN THIẾT BỊ' : 'CHÀO MỪNG CHỦ TIỆM MỚI'}</span>
                  <h2 className="spotlight-heading">{hasSave ? `Ngày Buôn Bán Thứ ${saveDay}` : 'Bắt Đầu Ngày Đầu Tiên'}</h2>
                </div>
              </div>

              {!showSlotRow && slots.length > 0 && (
                <button type="button" className="save-slot-more" onClick={() => setSlotsExpanded(true)}>+ Thêm ô lưu khác</button>
              )}
              {showSlotRow && <div className="save-slot-row" role="radiogroup" aria-label="Chọn ô lưu">
                {slots.map((slot) => {
                  const locked = lockedSlots.has(slot.slotId);
                  const detail = locked ? 'Đang mở ở thẻ khác'
                    : slot.status === 'empty' ? 'Trống'
                    : slot.status === 'corrupt' ? 'Dữ liệu lỗi'
                    : `Ngày ${slot.day} · cấp ${slot.level} · ${(slot.money ?? 0).toLocaleString('vi-VN')}₫`;
                  return (
                    <div key={slot.slotId} className={`save-slot-chip${activeSlot === slot.slotId ? ' is-active' : ''}`}>
                      <button type="button" role="radio" aria-checked={activeSlot === slot.slotId} disabled={busy} onClick={() => void handleSelectSlot(slot.slotId)}>
                        <strong>Ô {slot.number}</strong>
                        <small>{detail}</small>
                      </button>
                      {slot.status !== 'empty' && !locked && (
                        <button type="button" className="save-slot-delete" aria-label={`Xóa Ô ${slot.number}`} disabled={busy} onClick={() => void handleDeleteSlot(slot)}>×</button>
                      )}
                    </div>
                  );
                })}
              </div>}

              <p className="spotlight-summary-text">
                {hasSave
                  ? 'Bà con chòm xóm đang chờ bạn mở cửa tiệm. Hãy kiểm tra kho, bày hàng lên kệ và tính tiền cho khách quen nhé!'
                  : 'Chào bạn đến với tiệm tạp hóa đầu hẻm. Hãy đặt đơn hàng đầu tiên từ đại lý, bày trí lên kệ gỗ và đón vị khách mở hàng may mắn.'}
              </p>

              <button
                type="button"
                className="btn-hero-launch"
                disabled={busy}
                onClick={() => { void handleContinue(); }}
              >
                <div className="hero-launch-texts">
                  <span className="launch-action-main">{hasSave ? 'TIẾP TỤC BUÔN BÁN' : 'MỞ CỬA BÁN HÀNG'}</span>
                  <span className="launch-action-sub">{hasSave ? `Tiếp tục ngày ${saveDay} · Vào tiệm ngay` : 'Bắt đầu ngày thứ nhất'}</span>
                </div>
                <span className="launch-play-symbol">▶</span>
              </button>
            </div>
          </section>

          {/* Right Column: Game Choices & Exploration */}
          <section className="deck-options-grid" aria-label="Các tùy chọn trò chơi">
            {hasSave && (
              <button
                type="button"
                className="deck-action-card card-new-game"
                disabled={busy}
                onClick={() => void handleNewGame()}
              >
                <span className="card-symbol-badge badge-bronze">✦</span>
                <div className="card-text-body">
                  <strong>Bắt đầu tiệm mới</strong>
                  <small>Đặt lại tiến trình và xây dựng tiệm từ đầu</small>
                </div>
                <span className="card-arrow-mark">›</span>
              </button>
            )}

            <button
              type="button"
              className="deck-action-card card-multiplayer"
              disabled={busy}
              onClick={() => void handleOpenMultiplayer()}
            >
              <span className="card-symbol-badge badge-teal">👥</span>
              <div className="card-text-body">
                <div className="card-heading-row">
                  <strong>Hẻm Chơi Cùng</strong>
                  <span className="badge-tag-online">Co-op 2 người</span>
                </div>
                <small>Góp vốn kinh doanh chung trong một hẻm</small>
              </div>
              <span className="card-arrow-mark">›</span>
            </button>

            <button
              type="button"
              className="deck-action-card card-local"
              disabled={busy}
              onClick={() => void handleLocalDemo()}
            >
              <span className="card-symbol-badge badge-silver">🎮</span>
              <div className="card-text-body">
                <div className="card-heading-row">
                  <strong>Chơi Thử (Local)</strong>
                  <span className="badge-tag-local">Không cần đăng nhập</span>
                </div>
                <small>Chế độ Local Demo — chơi đơn không đồng bộ máy chủ</small>
              </div>
              <span className="card-arrow-mark">›</span>
            </button>

            <button
              type="button"
              className="deck-action-card card-guide"
              onClick={() => {
                triggerSound(440);
                setShowHowToPlay(true);
              }}
            >
              <span className="card-symbol-badge badge-amber">📖</span>
              <div className="card-text-body">
                <strong>Sổ tay chủ tiệm</strong>
                <small>Hướng dẫn cách nhập hàng, bán và điều khiển</small>
              </div>
              <span className="card-arrow-mark">›</span>
            </button>

            <button
              type="button"
              className="deck-action-card card-rankings"
              onClick={() => { void handleOpenLeaderboard(); }}
            >
              <span className="card-symbol-badge badge-gold">🏆</span>
              <div className="card-text-body">
                <strong>Bảng Vàng Danh Dự</strong>
                <small>Thành tích buôn bán của các tiệm trong phố</small>
              </div>
              <span className="card-arrow-mark">›</span>
            </button>
          </section>
        </div>

        {/* Footer: Autosave Status & Project Meta */}
        <footer className="deck-footer-bar">
          <div className="footer-save-guarantee">
            <span className="status-ping-green" />
            <span>Tiến trình tự động lưu an toàn trên máy bạn (IndexedDB)</span>
          </div>
          <div className="footer-copyright-tag">
            <span>Phiên bản v0.1.0</span>
            <span className="dot-divider">·</span>
            <span>Ký ức hoài niệm Sài Gòn</span>
            <span className="dot-divider">·</span>
            <span>{new Date().toLocaleDateString('vi-VN')}</span>
          </div>
        </footer>
      </div>

      {/* 4. MODALS & POPUPS REDESIGNED IN VINTAGE NOSTALGIC THEME */}

      {/* MODAL: SỔ TAY CHỦ TIỆM (ANTIQUE LEATHERBOUND NOTEBOOK) */}
      {showHowToPlay && (
        <div className="vintage-modal-overlay" onClick={() => setShowHowToPlay(false)}>
          <article
            className="vintage-notebook-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-book-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="notebook-spine-accent" />
            <header className="notebook-leather-header">
              <div className="header-emboss-seal">★</div>
              <div className="header-emboss-copy">
                <span className="emboss-kicker">CẨM NANG KINH DOANH · XÓM ĐẦU HẺM</span>
                <h3 id="guide-book-title">Sổ Tay Chủ Tiệm Tạp Hóa</h3>
                <p>Kinh nghiệm gom hàng, sắp kệ và chiều lòng bà con xóm giềng.</p>
              </div>
              <button
                type="button"
                className="notebook-close-btn"
                onClick={() => setShowHowToPlay(false)}
                aria-label="Đóng sổ tay"
              >
                ✕
              </button>
            </header>

            <nav className="notebook-tabs-bar" aria-label="Các mục cẩm nang">
              <button
                type="button"
                className={`notebook-tab-item ${activeGuideTab === 'daily' ? 'is-active' : ''}`}
                onClick={() => { triggerSound(400); setActiveGuideTab('daily'); }}
              >
                🛒 Vòng chơi ngày
              </button>
              <button
                type="button"
                className={`notebook-tab-item ${activeGuideTab === 'controls' ? 'is-active' : ''}`}
                onClick={() => { triggerSound(400); setActiveGuideTab('controls'); }}
              >
                🎮 Bàn phím & Cảm ứng
              </button>
              <button
                type="button"
                className={`notebook-tab-item ${activeGuideTab === 'stock' ? 'is-active' : ''}`}
                onClick={() => { triggerSound(400); setActiveGuideTab('stock'); }}
              >
                📦 Quản lý kho kệ
              </button>
              <button
                type="button"
                className={`notebook-tab-item ${activeGuideTab === 'features' ? 'is-active' : ''}`}
                onClick={() => { triggerSound(400); setActiveGuideTab('features'); }}
              >
                🌟 Tính năng nâng cao
              </button>
              <button
                type="button"
                className={`notebook-tab-item ${activeGuideTab === 'coop' ? 'is-active' : ''}`}
                onClick={() => { triggerSound(400); setActiveGuideTab('coop'); }}
              >
                👥 Hẻm chơi cùng
              </button>
            </nav>

            <div className="notebook-parchment-content">
              {activeGuideTab === 'daily' && (
                <div className="notebook-tab-panel">
                  <h4>01 · Vòng quay buôn bán mỗi ngày</h4>
                  <ol className="parchment-flow-list">
                    <li>
                      <strong>1. Nhập hàng từ Đại lý:</strong> Mở bảng Đại lý, chọn các mặt hàng đang hút khách và đặt số lượng. Đơn hàng sẽ được chuyển vào nhà kho khi sang ngày mới.
                    </li>
                    <li>
                      <strong>2. Kiểm kê kho & Bày hàng:</strong> Đi tới nhà kho (phía trên tiệm), lấy hàng ra túi rồi bày lên kệ gỗ hoặc tủ mát tương ứng.
                    </li>
                    <li>
                      <strong>3. Mở cửa đón khách:</strong> Nhấn nút "Mở tiệm" trên thanh HUD để khách hàng trong hẻm vào chọn món và xếp hàng.
                    </li>
                    <li>
                      <strong>4. Thu tiền tại quầy:</strong> Đứng tại quầy thu ngân, bấm phím tương tác để xem hóa đơn và thanh toán, nhận tiền lời cùng điểm kinh nghiệm (XP).
                    </li>
                    <li>
                      <strong>5. Chốt ngày buôn bán:</strong> Khi hết giờ hoặc hết khách, xem tổng kết doanh thu tại quầy và chuyển sang ngày buôn bán tiếp theo.
                    </li>
                  </ol>
                </div>
              )}

              {activeGuideTab === 'controls' && (
                <div className="notebook-tab-panel">
                  <h4>02 · Bàn phím điều khiển & Thao tác</h4>
                  <div className="key-guide-grid">
                    <div className="key-guide-item">
                      <div className="key-badges">
                        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> hoặc <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
                      </div>
                      <p>Di chuyển nhân vật chủ tiệm quanh khu vực bán hàng và nhà kho.</p>
                    </div>
                    <div className="key-guide-item">
                      <div className="key-badges">
                        <kbd>E</kbd> hoặc <kbd>Space</kbd>
                      </div>
                      <p>Tương tác với kệ hàng, quầy thu ngân, khu nhập kho và điểm lấy hàng.</p>
                    </div>
                    <div className="key-guide-item">
                      <div className="key-badges">
                        <kbd>I</kbd>
                      </div>
                      <p>Mở túi hàng cá nhân đang cầm theo người.</p>
                    </div>
                    <div className="key-guide-item">
                      <div className="key-badges">
                        <kbd>Esc</kbd>
                      </div>
                      <p>Đóng nhanh bảng hoặc cửa sổ thông tin đang mở.</p>
                    </div>
                  </div>
                  <div className="mobile-touch-note">
                    <span className="note-icon">📱</span>
                    <span>Trên điện thoại và máy tính bảng: sử dụng cần xoay ảo (Virtual Joystick) bên trái và nút tương tác cảm ứng bên phải; xoay ngang màn hình để trải nghiệm tốt nhất. iPad màn lớn bị nhận là máy tính? Chọn "Cảm ứng" bên dưới.</span>
                  </div>
                  <div className="control-mode-options" role="radiogroup" aria-label="Cách điều khiển" style={{ marginTop: 8 }}>
                    {([['auto', 'Tự nhận'], ['touch', 'Cảm ứng (nút di chuyển)'], ['keyboard', 'Bàn phím / chuột']] as Array<[ControlMode, string]>).map(([mode, label]) => (
                      <button key={mode} type="button" role="radio" aria-checked={controlMode === mode} className={controlMode === mode ? 'active' : ''} onClick={() => setControlMode(mode)}>{label}</button>
                    ))}
                  </div>
                </div>
              )}

              {activeGuideTab === 'stock' && (
                <div className="notebook-tab-panel">
                  <h4>03 · Bí quyết quản lý hàng hóa & Quầy kệ</h4>
                  <ul className="parchment-bullet-list">
                    <li>
                      <strong>Phân loại quầy kệ:</strong> Hàng khô và đồ hộp bày trên kệ gỗ; các loại nước giải khát, sữa tươi và kem lạnh bắt buộc phải đặt trong tủ mát.
                    </li>
                    <li>
                      <strong>Theo dõi hạn dùng:</strong> Kiểm tra hạn dùng của từng lô hàng để ưu tiên bán các lô gần hạn trước, tránh hao hụt vốn.
                    </li>
                    <li>
                      <strong>Dự trữ lúc cao điểm:</strong> Nhà kho có sức chứa lớn và khu nhận hàng mở rộng; nên nhập hàng đều đặn để kệ không bị trống lúc khách đông.
                    </li>
                    <li>
                      <strong>Nâng cấp tiệm:</strong> Tích lũy đủ vốn và danh tiếng để mở rộng diện tích tiệm và sắm thêm quầy kệ mới.
                    </li>
                  </ul>
                </div>
              )}

              {activeGuideTab === 'features' && (
                <div className="notebook-tab-panel">
                  <h4>04 · Các tính năng buôn bán nâng cao</h4>
                  <ul className="parchment-bullet-list">
                    <li>
                      <strong>Khách quen hẻm:</strong> 6 nhân vật thân quen (Bà Năm Bán Xôi, Chú Ba Xe Ôm, Bé Na Học Sinh...) ghé tiệm định kỳ. Phục vụ đúng món ưa thích giúp tích lũy điểm thân thiết (+2 điểm/ngày) và mở khóa đặc quyền như mua thêm hàng, boa tiền hào phóng.
                    </li>
                    <li>
                      <strong>Đơn tiệc (Party Orders):</strong> Nhận các đơn đặt hàng số lượng lớn phục vụ liên hoan xóm, đám giỗ, tiệc sinh nhật. Trả hàng trực tiếp từ kho theo phương pháp FEFO (First-Expired-First-Out) để nhận tiền thưởng lớn và danh tiếng.
                    </li>
                    <li>
                      <strong>Mục tiêu dài hạn & Nhiệm vụ tuần:</strong> Sổ ước nguyện giúp bạn theo dõi các cột mốc kinh doanh. Hoàn thành nhiệm vụ nhận thưởng tiền mặt và điểm uy tín một lần.
                    </li>
                    <li>
                      <strong>Kỹ năng & Đặc quyền:</strong> Mỗi hoạt động bán hàng, quản lý kho và giao lưu với khách giúp tích lũy XP cho 3 nhánh kỹ năng: Quản lý, Ngoại giao & Kho vận. Đạt các mốc cấp 5 và 10 cho phép bạn chọn đặc quyền vĩnh viễn (chiết khấu giá sỉ, giảm lương nhân viên, v.v.).
                    </li>
                    <li>
                      <strong>Mùa lễ hội & Sản phẩm truyền thống:</strong> Trải nghiệm 4 mùa đặc trưng (Tết Nguyên Đán, Mùa mưa Sài Gòn, Tựu trường, Trung Thu) cùng các mặt hàng truyền thống như Bánh chưng xanh, Câu đối đỏ, Dưa hấu Tài Lộc, Bánh Trung Thu.
                    </li>
                    <li>
                      <strong>Bảo vệ trông xe & Quầy phụ:</strong> Thuê nhân viên bảo vệ trông xe vỉa hè để khách đi xe máy yên tâm ghé tiệm lâu hơn và đánh giá cao hơn. Mở thêm quầy cà phê vợt và bánh mì muối ớt phục vụ khách vãng lai trước hiên nhà.
                    </li>
                    <li>
                      <strong>Danh hiệu chủ tiệm:</strong> Đạt các cột mốc để mở khóa và trang bị danh hiệu độc đáo thể hiện uy tín và phong cách của tiệm trên phố.
                    </li>
                  </ul>
                </div>
              )}

              {activeGuideTab === 'coop' && (
                <div className="notebook-tab-panel">
                  <h4>05 · Hẻm chơi cùng (Multiplayer 2 người) & Lưu trữ</h4>
                  <p>
                    Chế độ Hẻm chơi cùng cho phép bạn và bạn bè cùng đăng nhập Google và quản lý chung một tiệm tạp hóa trong một hẻm realtime.
                  </p>
                  <ul className="parchment-bullet-list">
                    <li>Một người tạo hẻm mới rồi gửi Mã Hẻm hoặc Lời mời cho người bạn cùng chơi.</li>
                    <li>Cả hai người chơi đều có thể nhập hàng, bày kệ và phụ nhau thu tiền tại quầy thu ngân.</li>
                    <li>Dữ liệu hẻm chơi chung được đồng bộ qua máy chủ, trong khi tiến trình chơi đơn trên máy của bạn luôn được giữ an toàn độc lập.</li>
                  </ul>
                </div>
              )}
            </div>

            <footer className="notebook-footer-bar">
              <button
                type="button"
                className="btn-notebook-close"
                onClick={() => setShowHowToPlay(false)}
              >
                Gấp sổ lại · Quay về màn hình tiệm
              </button>
            </footer>
          </article>
        </div>
      )}

      {/* MODAL: HẺM CHƠI CÙNG (COMMUNITY NOTICE BOARD) */}
      {showMultiplayerModal && (
        <div className="vintage-modal-overlay" onClick={() => setShowMultiplayerModal(false)}>
          <div className="vintage-wood-card notice-board-card" onClick={(e) => e.stopPropagation()}>
            <header className="notice-board-header">
              <span className="board-pin">📌</span>
              <h3>🌐 HẺM CHƠI CÙNG (2 NGƯỜI)</h3>
              <p>Chung tay buôn bán trong một con hẻm thân tình với bạn bè.</p>
            </header>

            <div className="notice-board-content">
              <div className="notice-independence-alert">
                <span className="info-icon">💡</span>
                <span>Tiến trình chơi riêng trên máy của bạn luôn được giữ độc lập hoàn toàn.</span>
              </div>

              {loadingWorlds ? (
                <div className="board-loading-state">
                  <span className="spinner-sand" />
                  <p>Đang tìm kiếm các hẻm của bạn…</p>
                </div>
              ) : (
                <div className="world-list-section">
                  <h4 className="section-title">Danh sách hẻm bạn tham gia:</h4>
                  {userWorlds.length === 0 ? (
                    <div className="empty-worlds-box">
                      <p>Bạn chưa tham gia hẻm nào. Hãy tạo một hẻm mới hoặc dán mã mời từ bạn bè bên dưới nhé!</p>
                    </div>
                  ) : (
                    <ul className="worlds-item-list">
                      {userWorlds.map((w) => (
                        <li key={w.id} className="world-item-row">
                          <div className="world-item-meta">
                            <strong>{w.name}</strong>
                            <span className="role-tag">({w.role === 'owner' ? 'Chủ Hẻm' : 'Thành Viên'})</span>
                          </div>
                          <button
                            type="button"
                            className="btn-join-world"
                            onClick={() => void handleSelectWorld(w.id)}
                          >
                            Vào Hẻm
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Create new world section */}
              <div className="action-form-section">
                <h4 className="section-title">Tạo một con hẻm mới:</h4>
                <div className="input-button-flex">
                  <input
                    type="text"
                    className="vintage-text-input"
                    placeholder="Đặt tên hẻm (VD: Hẻm 36 Nghĩa Thục)"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-form-action btn-wood-teal"
                    disabled={!newWorldName.trim() || busy}
                    onClick={() => void handleCreateWorld()}
                  >
                    Tạo Hẻm
                  </button>
                </div>
              </div>

              {/* Join world by token section */}
              <div className="action-form-section">
                <h4 className="section-title">Nhập mã tham gia hẻm bạn bè:</h4>
                <div className="input-button-flex">
                  <input
                    type="text"
                    className="vintage-text-input"
                    placeholder="Dán mã mời hẻm vào đây…"
                    value={joinToken}
                    onChange={(e) => setJoinToken(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-form-action btn-wood-brick"
                    disabled={!joinToken.trim() || busy}
                    onClick={() => void handleJoinWorld()}
                  >
                    Tham Gia
                  </button>
                </div>
              </div>
            </div>

            <footer className="notice-board-footer">
              <button
                type="button"
                className="btn-board-dismiss"
                onClick={() => setShowMultiplayerModal(false)}
              >
                Đóng bảng
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: BẢNG XẾP HẠNG / BẢNG VÀNG DANH DỰ */}
      {showLeaderboard && (
        <div className="vintage-modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="vintage-wood-card golden-honor-card" onClick={(e) => e.stopPropagation()}>
            <header className="honor-header">
              <span className="honor-medal">🏆</span>
              <h3>BẢNG VÀNG THÀNH TÍCH</h3>
              <p>Những tiệm tạp hóa buôn may bán đắt nhất phố</p>
            </header>

            <div className="honor-list" aria-live="polite">
              {!user && <p className="honor-disclaimer">Đăng nhập Google để xem bảng xếp hạng của các hẻm online.</p>}
              {user && leaderboardState === 'loading' && <p className="honor-disclaimer">Đang tải bảng xếp hạng...</p>}
              {user && leaderboardState === 'error' && <p className="honor-disclaimer">Không tải được bảng xếp hạng. Hãy thử lại sau.</p>}
              {user && leaderboardState === 'idle' && leaderboard && leaderboard.entries.length === 0 && (
                <p className="honor-disclaimer">Chưa có hẻm nào trên bảng. Hãy lập hẻm online và là người đầu tiên.</p>
              )}
              {leaderboard?.entries.map((entry) => (
                <div key={entry.rank} className={`honor-rank-card ${entry.mine ? 'rank-player' : entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : ''}`}>
                  <div className="rank-num">{entry.rank}</div>
                  <div className="rank-info">
                    <strong>{entry.name}{entry.mine ? ' (hẻm của bạn)' : ''}</strong>
                    <span>Ngày {entry.day} · cấp {entry.level} · {entry.members} người</span>
                  </div>
                  <div className="rank-stat">{entry.totalRevenue.toLocaleString('vi-VN')}₫</div>
                </div>
              ))}
              {leaderboard && leaderboard.myRank !== null && !leaderboard.entries.some((entry) => entry.mine) && (
                <div className="honor-rank-card rank-player">
                  <div className="rank-num">{leaderboard.myRank}</div>
                  <div className="rank-info">
                    <strong>Hẻm của bạn</strong>
                    <span>Chưa vào top {leaderboard.entries.length}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="honor-disclaimer">
              * Xếp theo tổng doanh thu của các hẻm online. Số liệu do máy người chơi báo về và mới được máy chủ kiểm tra ở mức cơ bản, nên chưa phải số đã xác minh. Tiệm chơi một mình trên máy không có trên bảng.
            </p>

            <button
              type="button"
              className="btn-board-dismiss"
              onClick={() => setShowLeaderboard(false)}
            >
              Đóng bảng vàng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TRONG LÚC BẠN VẮNG (ABSENCE LOG) */}
      {showAbsenceModal && (
        <div
          className="vintage-modal-overlay"
          onClick={() => {
            setShowAbsenceModal(false);
            if (selectedWorldDetail) onEnter(selectedWorldDetail);
          }}
        >
          <div className="vintage-wood-card ledger-card" onClick={(e) => e.stopPropagation()}>
            <header className="ledger-header">
              <span className="ledger-quill">📜</span>
              <h3>NHẬT KÝ TRONG LÚC BẠN VẮNG</h3>
              <p>Bạn đồng hành trong hẻm đã thực hiện các giao dịch sau:</p>
            </header>

            <div className="ledger-activities-list">
              {absenceActivities.map((act) => (
                <div key={act.id} className="ledger-item">
                  <div className="ledger-type-badge">{act.type}</div>
                  <div className="ledger-desc">
                    <p>{act.description}</p>
                    <time>{new Date(act.createdAt).toLocaleString('vi-VN')}</time>
                  </div>
                </div>
              ))}
            </div>

            {absenceHasMore && (
              <p className="ledger-overflow-warning">
                ⚠️ Lịch sử hoạt động đã vượt quá giới hạn hiển thị (100 sự kiện gần nhất).
              </p>
            )}

            <button
              type="button"
              className="btn-hero-launch"
              style={{ marginTop: '16px', minHeight: '44px' }}
              onClick={() => {
                setShowAbsenceModal(false);
                if (selectedWorldDetail) onEnter(selectedWorldDetail);
              }}
            >
              <div className="hero-launch-texts">
                <span className="launch-action-main">TIẾP TỤC VÀO TIỆM</span>
              </div>
              <span className="launch-play-symbol">▶</span>
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginScreen;
