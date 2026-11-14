import { bumpHudRender } from '../core/perf';
import { askConfirm } from './ConfirmDialog';
import { wantsRestockButton } from '../core/bizAchieve';
import { hudThemeOn } from '../data/hudTheme';
import { faintMinutes } from '../data/biz';
import { hasUpgrade } from '../data/upgrades';
import { SHOP_HOURS, shopHoursLabel } from '../data/shopHours';
import { Joystick } from './Joystick';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAlertCap } from './alertCap';
import { formatClock, questContext, useClock, useGame } from '../core/store';
import { claimableCount, dailyQuests, dailySetProgress, storyLockLevel, storyQuest, STORY_STEPS } from '../data/quests';
import { dirtLoss } from '../data/dirtLoss';
import { dirtInspectionNote } from '../data/inspection';
import { worldActions } from '../core/actions';
import { saveGame, resetGame, readBackupSave, restoreBackup } from '../core/save';
import { FEATURES, xpToNext } from '../data/levels';
import { xpGainDelta } from '../data/xpGain';
import { decorPopupLine } from '../data/decorPopup';
import { machinePopupLine } from '../data/machines';
import { tipAt } from '../data/tips';
import { radialPositions } from '../data/radialMenu';
import { formatMoney, productById } from '../data/products';
import { trialCost } from '../core/slices/build';
import { todayLine, todayMissedLine, todayPeakLine, todayExpectSoFar, todayTopSeller } from '../data/todayScore';
import { hasSkill } from '../data/titles';
import { summarizeReviews } from '../data/reviews';
import { dayEffects, describeDate, festivalStock, upcomingFestival, weekdayOf } from '../data/calendar';

/** GĐ275 — "7h30" / "8h": nhãn giờ mở cửa cho menu lịch tự động. */
import { describeHours, goldenHourBands, goldenPrepWants, inGoldenHour, minutesToGolden, nextGoldenBand } from '../data/rhythm';
import { skillPoints } from '../data/titles';
import { COMBO_UNLOCK } from '../data/combos';
import { describeDay, describeRain, WEATHER } from '../data/weather';
import { forecastTextOf, skyState } from './hudSky';
import { pushCloudSave, takeCloudSave } from '../net/cloud';
import { leaveRoom } from '../net/coop';
import { logoutGoogle, deleteAccount } from '../net/firebase';
import { deleteAccountData } from '../net/account';
import { useSession } from '../net/session';
import { MoneyChip, MusicToggle, SoundToggle } from './HudChips';
import { crisisDefById, crisisPhaseLabel } from '../data/crisis';
import { HudTour } from './HudTour';
import { Panels } from './Panels';
import { hubFirst, hubOf } from './hubs';
import { ToolButton, type ToolDef } from './HudToolButton';
import { rivalBadgeOf, socialBadgeOf, onlineBadgeOf, licenseBadgeOf, loanBadgeOf, challengeBadgeOf, fairBadgeOf, triBadgeOf, dossierBadgeOf, gardenBadgeOf } from './hudBadges';
import { AccountMenu, MoreMenu, SettingsHost } from './HudMenus';
import './hud.css';
const SurpriseAlert = lazy(() => import('./SurpriseAlert').then((m) => ({ default: m.SurpriseAlert })));
const MiniHost = lazy(() => import('./minigames/MiniHostView').then((m) => ({ default: m.MiniHostView })));
const TripOverlay = lazy(() => import('./TripOverlay').then((m) => ({ default: m.TripOverlay })));
const ShelfRestockAlert = lazy(() => import('./ShelfRestockAlert').then((m) => ({ default: m.ShelfRestockAlert })));
const ExpiryAlert = lazy(() => import('./ExpiryAlert').then((m) => ({ default: m.ExpiryAlert })));
const UnlockActBanner = lazy(() => import('./UnlockActBanner').then((m) => ({ default: m.UnlockActBanner })));
const BranchAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.BranchAlert })));
const RivalAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.RivalAlert })));
const FestivalBanner = lazy(() => import('./HudAlerts').then((m) => ({ default: m.FestivalBanner })));
const TodayAgendaStrip = lazy(() => import('./HudAgenda').then((m) => ({ default: m.TodayAgendaStrip })));
const StoryAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.StoryAlert })));
const PhoneAlerts = lazy(() => import('./PhoneAlerts').then((m) => ({ default: m.PhoneAlerts })));

export { tutorialActive, tutorialStep, tutorialSteps } from './tutorialSteps';
import { tutorialActive, tutorialStep } from './tutorialSteps';
import { fmtNum, locale } from '../core/format';
import { t } from '../core/i18n';
const Tutorial = lazy(() => import('./Tutorial').then((m) => ({ default: m.Tutorial })));
const VendorAlert = lazy(() => import('./VendorAlert').then((m) => ({ default: m.VendorAlert })));
const CounterAskAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.CounterAskAlert }))); // GĐ636
const ChapterDialogue = lazy(() => import('./ChapterDialogue').then((m) => ({ default: m.ChapterDialogue })));
const TelemetryPrompt = lazy(() => import('./TelemetryPrompt').then((m) => ({ default: m.TelemetryPrompt })));

/** Màn hình cảm ứng: không có phím, thay chữ phím [X] bằng biểu tượng chạm. */
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const CLOUD_LABEL = { off: '', idle: 'Cloud', saving: t('hud.dang_luu'), saved: t('hud.da_luu'), error: t('hud.loi_luu'), conflict: t('hud.xung_dot') };

const SPEEDS = [
  { label: '⏸', value: 0, name: t('hud.tam_dung') },
  { label: '1×', value: 1, name: t('hud.toc_do_thuong') },
  { label: '3×', value: 3, name: 'Nhanh' },
  { label: '8×', value: 8, name: t('hud.rat_nhanh') },
];


/** Đo chiều cao thật của thanh dưới (dock + gợi ý) để hội thoại và cột thông báo né ra, mọi cỡ màn hình đều khớp. */
function useNarrowScreen() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 480px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 480px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

function useBottomBarHeight() {
  useEffect(() => {
    const el = document.querySelector('.hud-bottom');
    const root = document.getElementById('ui');
    if (!el || !root || typeof ResizeObserver === 'undefined') return;
    const set = () => root.style.setProperty('--hud-bottom-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
}

export function Hud() {
  // SPEC-TOI-UU §T2 (L1): đếm số lần React vẽ lại HUD/giây (chỉ đếm khi bật ?perf=1).
  bumpHudRender();
  useBottomBarHeight();
  const narrow = useNarrowScreen();
  const {
    day, speed, money, level, xp, location, hint, message, shopOpen, waiting, dirt, buildMode,
    setSpeed, openPanel, setBuildMode, notify, toggleShop,
  } = useGame();
  // Giờ trong game nằm ở store riêng (đổi mỗi khung hình): chọn theo phút nguyên để HUD
  // không phải vẽ lại 60 lần/giây — chỉ vẽ lại khi đồng hồ chạy qua một phút mới.
  const minutes = useClock((c) => Math.floor(c.minutes));
  const reviews = useGame((s) => s.reviews);
  // GĐ1521: theme HUD theo dịp lễ (chỉ CSS variables)
  const hudTheme = hudThemeOn(day);
  useEffect(() => {
    const root = document.getElementById('ui');
    if (!root) return;
    if (hudTheme) root.dataset.hudTheme = hudTheme; else delete root.dataset.hudTheme;
  }, [hudTheme]);
  const placing = useGame((s) => s.placing);
  const serviceLife = useGame((s) => s.biz.serviceLife);
  const nightShift = useGame((s) => hasUpgrade(s.biz, 'night'));
  const sellFurniture = useGame((s) => s.sellFurniture);
  const stashFurniture = useGame((s) => s.stashFurniture);
  const trialCount = useGame((s) => s.furniture.filter((f) => f.trial).length);
  const trialTotal = useGame((s) => trialCost(s.furniture));
  const buyTrials = useGame((s) => s.buyTrials);
  const dropTrials = useGame((s) => s.dropTrials);
  const weather = useGame((s) => s.weather);
  const forecast = useGame((s) => s.forecast);
  const weatherSeed = useGame((s) => s.weatherSeed);
  const skills = useGame((s) => s.skills);
  const happyHour = useGame((s) => s.happyHour);
  const skillsLeft = useGame((s) => skillPoints(s.level) - s.skills.length);
  const effects = dayEffects(weatherSeed, day, level);
  // Hệ8 — Biến cố dài (SPEC-CHIEU-RONG §8): chip hiển thị khi đang có đợt (state mở/đóng ở endDay).
  const crisis = useGame((s) => s.biz.crisis);
  const crisisDef = crisis ? crisisDefById(crisis.defId) : undefined;
  const crisisPhase = crisis && crisisDef ? crisisPhaseLabel(crisisDef, day, crisis) : '';
  const soon = upcomingFestival(day);
  const { spell, raining, skyIcon } = skyState(weatherSeed, day, weather, minutes);
  const forecastText = forecastTextOf(weatherSeed, day, forecast);
  const { account, cloudStatus, conflict, coop } = useSession();
  /** Đang ở hẻm online: tiến trình là của cả hẻm, lưu trên server thay vì trong máy. */
  const online = !!coop;
  /** Số lượt đã góp sân chơi (GĐ40) — để nút menu hiện tiến độ n/28. */
  const landmarkContrib = useGame((s) => s.biz.landmark.contributions);
  const fedBreakfast = useGame((s) => s.biz.breakfastDay === s.day);
  const [copiedCode, setCopiedCode] = useState(false);
  // Xem lại hướng dẫn từ menu Thêm: bật thì Tutorial chuyển sang chế độ review
  const [helpTutorial, setHelpTutorial] = useState(false);
  // Playtest P0 M4: tối đa 2 thẻ thông báo cùng lúc, phần còn lại gom sau nút "+N thông báo"
  const alertsRef = useRef<HTMLDivElement>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const hiddenAlerts = useAlertCap(alertsRef, alertsOpen);
  const copyRoomCode = () => {
    if (!coop) return;
    void navigator.clipboard.writeText(coop.alley).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1500);
    });
  };
  const rating = summarizeReviews(reviews);
  const late = minutes >= 24 * 60;
  const progress = Math.min(1, xp / xpToNext(level));

  const [settingsOpen, setSettingsOpen] = useState<false | 'game' | 'img'>(false);
  // "Thư gọn": ẩn toàn bộ HUD để ngắm tiệm/chụp màn hình — chỉ còn nút nhỏ góc phải bật lại.
  const [clean, setClean] = useState(false);
  useEffect(() => {
    document.getElementById('ui')?.classList.toggle('hud-clean', clean);
  }, [clean]);
  const save = () => {
    notify(saveGame() ? t('hud.da_luu_game') : t('hud.khong_luu_duoc_trinh_duyet_chan'));
    if (account) pushCloudSave();
  };
  const restore = async () => {
    const prev = readBackupSave();
    if (!prev) return notify(t('hud.chua_co_ban_luu_truoc_de'));
    const at = new Date(prev.savedAt).toLocaleString(locale());
    if (!await askConfirm(t('hud.quay_ve_ban_luu_truoc_ngay', { day: prev.data.day, at }), { okLabel: t('hud.khoi_phuc') })) return;
    restoreBackup();
    notify(t('hud.da_quay_ve_ngay', { day: prev.data.day }));
    if (account) pushCloudSave();
  };
  /** Lưu (máy + cloud), rời phòng, rồi tải lại trang về màn đăng nhập cho sạch trạng thái. */
  const leaveGame = async (then?: () => Promise<void>) => {
    if (!online) {
      saveGame();
      if (account) await pushCloudSave();
    }
    leaveRoom();
    await then?.();
    window.location.reload();
  };
  const backToMenu = async () => {
    if (online && !await askConfirm(t('hud.roi_hem_va_ve_man_hinh'), { okLabel: t('hud.roi_hem') })) return;
    leaveGame();
  };
  const logout = () => { void askConfirm(t('hud.luu_game_roi_dang_xuat'), { okLabel: t('hud.dang_xuat') }).then((ok) => { if (ok) void leaveGame(logoutGoogle); }); };
  /** Xoá tài khoản & dữ liệu (quyền chủ thể dữ liệu — Luật 91/2025): 2 bước xác nhận, giữ bản lưu máy. */
  const deleteAccountFlow = async () => {
    if (!account) return;
    if (!await askConfirm(t('hud.xoa_tai_khoan_va_toan_bo'), { danger: true, okLabel: t('hud.xoa_tai_khoan') })) return;
    if (!await askConfirm(t('hud.chac_chan_chua_se_xoa_ban'), { danger: true, okLabel: t('hud.xoa_vinh_vien') })) return;
    try {
      await deleteAccountData();   // xoá cloud + hẻm + bằng chứng đồng ý trên server
      await deleteAccount();       // xoá tài khoản Firebase (xác thực lại qua popup Google)
    } catch (err) {
      notify(t('hud.khong_xoa_duoc_tai_khoan', { v0: err instanceof Error ? err.message : String(err) }));
      return;
    }
    window.location.reload();
  };

  // Ô kệ đang trống (chưa gán món hoặc hết hàng) để nhắc trên nút Kho
  const emptySlots = useGame((s) => s.furniture.reduce((n, f) => n + f.tiers.filter((t) => !t.productId || t.count === 0).length, 0));
  // Nhiệm vụ đã xong chờ nhận thưởng
  const questsReady = useGame((s) => claimableCount(questContext(s)));
  const rivalBadge = useGame(rivalBadgeOf);
  const socialBadge = useGame(socialBadgeOf);
  const onlineBadge = useGame(onlineBadgeOf);
  const licenseBadge = useGame(licenseBadgeOf);
  // Vẫn còn nợ ngân hàng thì nhắc số gốc ngay trên nút Kinh doanh
  const loanBadge = useGame(loanBadgeOf);
  // Thử thách tuần sắp xong (≥80% mục tiêu) hoặc đã xong thì nhắc trên nút Kinh doanh;
  // dưới 80% thì khỏi nhồi — nút khoá (cấp < 3) ToolButton tự ẩn badge.
  const challengeBadge = useGame(challengeBadgeOf);
  // Điểm danh quà / lượt vòng quay hôm nay còn trống thì nhắc trên nút
  const giftClaimable = useGame((s) => s.giftLastDay !== s.day);
  const wheelReady = useGame((s) => s.wheelLastDay !== s.day);
  const wheelBoost = useGame((s) => s.wheelBoost);
  // Đầu tháng có chợ phiên đặc biệt còn chưa lấy thì nhắc trên nút Nhập hàng
  const fairBadge = useGame(fairBadgeOf);
  // Sổ thương mến (GĐ69): bậc Tiệm hiện tại (bể khách quen cả ván) — hiện trên nút Khách quen
  const triBadge = useGame(triBadgeOf);
  // Hồ sơ tiệm (GĐ71): số huy hiệu thâm niên đã đạt — hiện trên nút Hồ sơ tiệm
  const dossierBadge = useGame(dossierBadgeOf);
  // Trang trại: luống chờ thu, trứng/sữa chờ lấy, heo xuất chuồng được, gà đói mà kho hết cám, hoặc chưa tưới
  const gardenBadge = useGame(gardenBadgeOf);
  // Ở hẻm online nhà chung mang tên riêng; cả hai đều là "đang ở nhà" nên mới hiện nút Ra tiệm
  const atHome = location === 'Nhà của bạn' || location === 'Nhà chung của hẻm';
  const atFarm = location === 'Trang trại đầu ngõ';
  // Bảng nào đang mở thì nút mở bảng đó sáng lên
  const openType = useGame((s) => s.panel?.type ?? null);
  // Hướng dẫn ngày đầu đang hiện và đang dừng ở bước nào (để nhấp nháy đúng nút dock)
  const tutActive = useGame(tutorialActive);
  // GĐ1503 — tour HUD hiện một lần cho ván mới (ngày 1, xong hướng dẫn, không mở bảng nào)
  const hudTourDone = useGame((s) => s.hudTourDone);
  const tutStep = useGame(tutorialStep);
  type Tool = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; more?: boolean; /** Nhóm trong menu Thêm: tiêu đề nhỏ hiện trước cụm nút cùng nhóm */ group?: string; /** Màn hẹp (điện thoại đứng): dời vào menu Thêm cho dock vừa một hàng */ narrowMore?: boolean; /** Bước hướng dẫn ngày đầu đang chỉ tới nút này: viền vàng nhấp nháy */ pulse?: boolean };
  const tools: Tool[] = [
    {
      icon: atHome ? '🛵' : '🏠', label: atHome ? t('hud.ra_tiem') : t('hud.ve_nha'),
      on: () => worldActions.travel(atHome ? 'shop' : 'home'),
      // Bước 3 "Đứng quầy": đang ở nhà thì nhấp nháy nút Ra tiệm dẫn đường (tới nơi rồi marker
      // vàng trên sàn quầy lo việc dẫn tiếp); bước 4 "Tối về nhà" cũng là nút này
      pulse: (tutActive && (tutStep === 4 || (tutStep === 3 && atHome))) || (atHome && waiting > 0), // GĐ648: khách chờ quầy
    },
    {
      icon: atFarm ? '🛵' : '🚜', label: atFarm ? t('hud.ra_tiem') : t('hud.ra_trai'),
      // GĐ160 — khoá chiều ĐI trại theo cấp 8 đúng cơ chế các nút khác (Trang trại panel cũng khoá 8):
      // trước đó bấm được là dịch chuyển tới trại trống không giải thích. Chiều VỀ (đang ở trại) luôn mở
      // — save cũ có thể đang đứng ở trại dưới cấp 8, không khoá kẻo mắc kẹt.
      lock: atFarm ? undefined : 8,
      on: () => worldActions.travel(atFarm ? 'shop' : 'ranch'),
    },
    {
      icon: '🗃️', label: 'Kho', badge: emptySlots ? t('hud.trong', { emptySlots }) : undefined, active: openType === 'storage',
      on: () => openPanel({ type: 'storage' }),
    },
    { icon: '🗺️', label: t('hud.so_do_ke'), active: openType === 'planogram', pulse: tutActive && tutStep === 1, on: () => openPanel({ type: 'planogram' }) },
    { icon: '📦', label: t('hud.nhap_hang'), badge: fairBadge, active: openType === 'order', pulse: tutActive && tutStep === 0, on: () => openPanel({ type: 'order' }) },
    // GĐ98: ☀️ Sổ đầu ngày + 🎁 Điểm danh là NGHI THỨC HẰNG NGÀY (vòng lặp giữ chân) — ở ≤480px
    // vẫn giữ trên dock (wrap 2 hàng chấp nhận được), không dời vào Thêm như 💲/📈.
    { icon: '☀️', label: t('hud.so_dau_ngay'), group: t('hud.van_hanh'), active: openType === 'morning', on: () => openPanel({ type: 'morning' }) },
    { icon: '📜', label: t('hud.nhiem_vu'), badge: questsReady ? `${questsReady} xong` : undefined, active: openType === 'quests', on: () => openPanel({ type: 'quests' }) },
    {
      icon: '🎁', label: t('hud.diem_danh'), group: t('hud.van_hanh'), active: openType === 'gifts',
      badge: giftClaimable ? t('hud.co_qua') : wheelReady ? '⭕ Quay' : undefined,
      on: () => openPanel({ type: 'gifts' }),
    },
    { icon: '🗓️', label: t('hud.lich_su_kien'), more: true, group: t('hud.van_hanh'), active: openType === 'calendar', on: () => openPanel({ type: 'calendar' }) },
    { icon: '🍳', label: t('hud.so_nau'), more: true, group: t('hud.van_hanh'), lock: 21, active: openType === 'cook', on: () => openPanel({ type: 'cook' }) },
    { icon: '🛠️', label: t('hud.xay_dung'), more: true, group: t('hud.van_hanh'), active: openType === 'arrange', on: () => openPanel({ type: 'arrange' }) },
    { icon: '💲', label: t('hud.gia_ban'), narrowMore: true, group: t('hud.hang_hoa'), lock: FEATURES.prices, active: openType === 'prices', on: () => openPanel({ type: 'prices' }) },
    { icon: '🎁', label: 'Combo', more: true, group: t('hud.hang_hoa'), lock: COMBO_UNLOCK, active: openType === 'combos', on: () => openPanel({ type: 'combos' }) },
    { icon: '📋', label: t('hud.hop_dong'), group: t('hud.hang_hoa'), lock: 14, more: true, active: openType === 'contracts', on: () => openPanel({ type: 'contracts' }) },
    { icon: '📈', label: 'Kinh doanh', narrowMore: true, group: t('hud.kinh_doanh_doi_thu'), lock: 3, badge: [loanBadge, rivalBadge, challengeBadge].filter(Boolean).join(' · ') || undefined, active: openType === 'business', on: () => openPanel({ type: 'business' }) },
    { icon: '📊', label: t('hud.so_sach'), more: true, group: t('hud.kinh_doanh_doi_thu'), badge: dossierBadge, active: hubOf(openType ?? '') === 'sosach', on: () => openPanel({ type: hubFirst('sosach', level) } as never) },
    { icon: '⭐', label: t('hud.danh_tieng'), more: true, group: t('hud.nhan_su_khach'), badge: [rating.count ? `${rating.average.toFixed(1)}★` : undefined, triBadge, licenseBadge, skillsLeft > 0 ? t('hud.ky_nang', { skillsLeft }) : undefined].filter(Boolean)[0], active: hubOf(openType ?? '') === 'danhtieng', on: () => openPanel({ type: hubFirst('danhtieng', level) } as never) },
    { icon: '🌱', label: t('hud.mo_rong'), more: true, group: t('hud.ngoai_tiem'), badge: [gardenBadge, socialBadge, onlineBadge].find(Boolean) ?? (landmarkContrib >= 28 ? undefined : `${landmarkContrib}/28`), active: hubOf(openType ?? '') === 'morong', on: () => openPanel({ type: hubFirst('morong', level) } as never) },
    { icon: '👕', label: t('hud.trang_phuc'), group: t('hud.nhan_su_khach'), lock: 2, more: true, active: openType === 'costume', on: () => openPanel({ type: 'costume' }) },
    { icon: '👥', label: t('hud.nhan_vien'), more: true, group: t('hud.nhan_su_khach'), lock: FEATURES.staff, active: openType === 'staff', on: () => openPanel({ type: 'staff' }) },
  ];

  return (
    <>
      <button
        className={`hud-clean-toggle${clean ? ' on' : ''}`}
        aria-pressed={clean}
        title={clean ? t('hud.hien_lai_giao_dien') : t('hud.thu_gon_an_giao_dien_de')}
        onClick={() => setClean((v) => !v)}
      >
        {clean ? '🖼️' : '🧹'}
      </button>
      <Joystick />
      {/* GĐ1831: ConfirmHost dời về boot.tsx (gốc ứng dụng) — hộp xác nhận cần hiện cả ở màn đăng nhập */}
      {!hudTourDone && !tutActive && openType == null && day === 1 && level <= 3
        && <HudTour onDone={() => useGame.getState().markHudTourDone()} />}
      {/* Cột trái trên: ngày giờ, tiền, cấp; thông báo xếp ngay bên dưới nên không đè lên cụm bên phải */}
      <div className="hud-left">
      <div className="hud-status">
        <div className="hud-chip hud-time" title={`${WEATHER[weather].tip}
${forecastText}`}>
          <span className="hud-weather" aria-hidden="true">{skyIcon}</span>
          <span>
            <b className={late ? 'hud-late' : undefined}>{formatClock(minutes)}</b>
            <small>{t('hud.ngay')}{' '}{day} ({describeDate(day)}) · {weekdayOf(day)} · {spell ? describeRain(spell, weather) : WEATHER[weather].name}</small>
            {(() => {
              const s = useGame.getState().stats;
              const live = todayLine({ ...s, expectCustomers: todayExpectSoFar({ weather, tomorrow: forecast[0] ?? weather, level, day, seed: weatherSeed, minutes, localLegend: hasSkill(skills, 'local_legend'), happy: happyHour }) });
              const top = todayTopSeller(s.byItem);
              const peak = todayPeakLine(s.byHour);
              const missed = todayMissedLine(s.missed);
              const parts = [live, top, missed, peak].filter(Boolean);
              return parts.length ? <small title={t('hud.doanh_thu_so_mon_so_khach')}>{parts.join(' · ')}</small> : null;
            })()}
            <small className="hud-forecast">
              <span title={(() => {
                const next = nextGoldenBand(minutes);
                const prep = next ? goldenPrepWants(minutes, level, 5).join(', ') : '';
                return `⏰ Giờ vàng trong ngày: ${describeHours(goldenHourBands())} — đông khách, nhớ châm kệ trước giờ này.\n${next ? `Sắp tới (${next.name}): nên châm ${prep || 'món bán chạy trong khung'}.` : 'Hôm nay hết giờ vàng rồi.'}`;
              })()}>
                ⏰ {minutes < SHOP_HOURS.grocery.from ? t('hud.chua_mo_cua_cham_ke_truoc', { v0: shopHoursLabel('grocery').split('–')[0] })
                  : inGoldenHour(minutes) ? t('hud.dang_gio_vang_san_sang_don')
                  : (() => {
                      const mt = minutesToGolden(minutes);
                      if (mt >= 0 && mt <= 120) {
                        const prep = goldenPrepWants(minutes, level, 2).join(', ');
                        return `Sắp tới giờ vàng (${Math.ceil(mt / 60) >= 1 ? `≈${Math.ceil(mt / 60)}h` : `${mt} phút`}): châm kệ ${prep}`;
                      }
                      return t('hud.gio_vang', { v0: describeHours(goldenHourBands()) });
                    })()}
              </span>
            </small>
            {/* Review 13/11-3 R5: lễ/chợ + lễ sắp tới gộp MỘT dòng (trước đây 2 dòng chồng nhau) */}
            {(effects.festival || effects.market || soon) && (
              <small title={[
                effects.festival && `${effects.festival.name}: ${effects.festival.blurb}`,
                effects.market?.label,
                soon && t('hud.hang_nen_nhap_san', { blurb: soon.festival.blurb, v1: festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ') }),
              ].filter(Boolean).join('\n')}>
                {[
                  effects.festival && `${effects.festival.icon} ${effects.festival.name}`,
                  effects.market && `${effects.market.icon} ${effects.market.label}`,
                  soon && `⏳ ${soon.festival.icon} ${soon.festival.name} ${soon.inDays === 1 ? t('hud.ngay_mai') : t('hud.sau_ngay', { inDays: soon.inDays })}`,
                ].filter(Boolean).join(' · ')}
              </small>
            )}
            {crisisDef && crisisPhase && (
              <small className="hud-crisis-chip" title={`${crisisDef.name} — ${crisisPhase}.${crisisDef.aftermath ? t('hud.hoan_thanh_phan_chuan_bi_de', { label: crisisDef.aftermath.label }) : ''}`}>
                {crisisDef.icon} {crisisPhase}
              </small>
            )}
            <small className="hud-forecast">{forecast.map((w, i) => <span key={i} title={describeDay(weatherSeed, day + 1 + i, w)}>{WEATHER[w].icon}</span>)}</small>
          </span>
        </div>
        <MoneyChip money={money} />
        <button className="hud-chip hud-level" style={{ position: 'relative' }} title={t('hud.xp_xem_lo_trinh_cap', { xp, v1: xpToNext(level) })} onClick={() => openPanel({ type: 'levels' })}>
          <span className="hud-level-num">{level}</span>
          <XpGain />
          <span>
            <small>{t('hud.cap')}{' '}{Math.round(progress * 100)}%</small>
            <span className="hud-xp"><span style={{ width: `${progress * 100}%` }} /></span>
          </span>
        </button>
        <GoalChip ready={questsReady} />
        <div className="hud-place">
          <span>📍 {location}</span>
          <span className={`hud-open ${shopOpen ? 'on' : ''}`}>{!shopOpen ? t('hud.tiem_dong') : minutes >= SHOP_HOURS.grocery.to && minutes < 30 * 60 && !nightShift ? t('hud.het_don_khach_moi') : t('hud.dang_mo_cua')}</span>
        </div>
      </div>

      {/* Thông báo: cột trái, dưới ô trạng thái */}
      <div className="hud-alerts" ref={alertsRef}>
        {late && !message && <div className="hud-alert danger">{t('hud.da_khuya_ve_nha_ngu_truoc')}{' '}{faintMinutes(fedBreakfast) / 60 - 24}{t('hud.00_sang_keo_ngat')}</div>}
        {wheelBoost > 1 && <div className="hud-alert info">{t('hud.vong_quay_may_man_hom_nay')}{' '}{Math.round((wheelBoost - 1) * 100)}%</div>}
        {dirt >= 30 && (
          <div className={`hud-alert ${dirt >= 60 ? 'warn' : 'info'}`}>
            {t('hud.san_tiem_ban')}{Math.round(dirt)}%){dirt >= 60 ? t('hud.khach_ngai_vao') : ''}{dirtInspectionNote(level, dirt)}{' '}{t('hud.dung_trong_tiem_bam')}{' '}<b>[C]</b>{' '}{t('hud.giu_phim_de_tu_lau')}
            {(() => {
              const s = useGame.getState().stats;
              const dl = dirtLoss({ dirt, level, customers: s.customers, revenue: s.revenue });
              if (!dl.avgPerVisit) return null;
              return <span style={{ marginLeft: 6, opacity: 0.9 }}>{t('hud.ban_nay_dang_mat')}{dl.lostKhachPerDay.toFixed(0)}{' '}{t('hud.khach_ngay')}{formatMoney(dl.moneyLostPerDay)}).</span>;
            })()}
            <span className="hud-alert-actions"><button className="hud-btn" onClick={() => worldActions.mop()}>{t('hud.lau_nha')}</button></span>
          </div>
        )}
        {waiting > 0 && !hint?.startsWith('💵') &&<div className="hud-alert warn">🛒 {waiting}{' '}{t('hud.khach_dang_cho_tinh_tien_o')}{atHome || atFarm ? t('hud.bam_ra_tiem') : ''}</div>}
        <Suspense fallback={null}><PhoneAlerts /></Suspense>
        <Suspense fallback={null}><BranchAlert /></Suspense>
        <Suspense fallback={null}><RivalAlert /></Suspense>
        <Suspense fallback={null}><ExpiryAlert /></Suspense>
        <Suspense fallback={null}><ShelfRestockAlert /></Suspense>
        <Suspense fallback={null}><UnlockActBanner /></Suspense>
        <Suspense fallback={null}><VendorAlert /></Suspense>
        <Suspense fallback={null}><CounterAskAlert /></Suspense>
        <Suspense fallback={null}><FestivalBanner /></Suspense>
        <Suspense fallback={null}><Tutorial review={helpTutorial} onDone={() => setHelpTutorial(false)} /></Suspense>
        <Suspense fallback={null}><SurpriseAlert /></Suspense>
        <Suspense fallback={null}><MiniHost /></Suspense>
        <Suspense fallback={null}><TripOverlay /></Suspense>
        <Suspense fallback={null}><StoryAlert /></Suspense>
        {(hiddenAlerts.count > 0 || alertsOpen) && (
          // QA người chơi: nút gom không được chỉ nói "+N" mà phải cho biết THẺ NÀO đang bị gom —
          // nội dung đầu tiên hiện ngay trên nút, tooltip liệt kê đủ tất cả. GĐ2347: cạnh đó có nút
          // 🔔 mở Sổ thông báo — tin đã trôi / đã bị gom vẫn đọc lại được toàn văn trong bảng.
          <>
            <button
              className="hud-btn hud-alerts-more"
              title={hiddenAlerts.texts.length ? t('hud.dang_gom', { v0: hiddenAlerts.texts.join('\n') }) : undefined}
              onClick={() => setAlertsOpen(!alertsOpen)}
            >
              {alertsOpen ? t('hud.thu_gon_thong_bao') : (
                <>
                  <span className="hud-alerts-more-count">+{hiddenAlerts.count}{' '}{t('hud.thong_bao')}</span>
                  {hiddenAlerts.texts[0] && (
                    <span className="hud-alerts-more-preview">: {hiddenAlerts.texts[0].length > 60 ? `${hiddenAlerts.texts[0].slice(0, 59).trimEnd()}…` : hiddenAlerts.texts[0]}</span>
                  )}
                </>
              )}
            </button>
            <button
              className="hud-btn hud-alerts-more"
              title={t('hud.so_thong_bao_xem_lai_moi')}
              onClick={() => openPanel({ type: 'log' })}
            >
              {t('hud.so_thong_bao')}
            </button>
          </>
        )}
        {conflict && (
          <div className="hud-alert info">
            {t('hud.cloud_co_ban_luu_moi_hon')}{' '}{conflict.day}{t('hud.cap_2')}{' '}{conflict.level}).
            <span className="hud-alert-actions">
              <button className="hud-btn" onClick={() => takeCloudSave()}>{t('hud.tai_ban_cloud')}</button>
              <button className="hud-btn" onClick={() => pushCloudSave(true)}>{t('hud.ghi_de_bang_ban_nay')}</button>
            </span>
          </div>
        )}
      </div>
      </div>

      {/* Góc phải trên: âm thanh, nhạc nền, tài khoản; chip hẻm online xuống hàng dưới */}
      <div className={`hud-meta${coop ? ' coop' : ''}`}>
        <SoundToggle />
        <MusicToggle />
        {coop && (
          <div className="hud-chip hud-room" title={`Mã hẻm ${coop.alley}: gửi cho bạn bè để cùng vào (tối đa 4 người)
Online: ${coop.peers.map((p) => (p.id === coop.selfId ? 'bạn' : p.name)).join(', ')}`}>
            <span className="hud-room-icon">👥<em>{coop.peers.length}</em></span>
            <span>
              <b><span className="hud-room-name">{coop.name} · </span>{coop.alley}</b>
              <small>{coop.peers.length} online: {coop.peers.map((p) => (p.id === coop.selfId ? t('hud.ban') : p.name)).join(', ')}</small>
            </span>
            <button className="hud-link" onClick={copyRoomCode} title={t('hud.sao_chep_ma_hem_de_gui')}>
              {copiedCode ? t('hud.da_chep') : '📋'}
            </button>
            <button className="hud-link" onClick={backToMenu}>{t('hud.roi')}</button>
          </div>
        )}
        <AccountMenu
          name={account ? account.name : t('hud.choi_khach')}
          photo={account?.photo ?? null}
          status={online ? t('hud.luu_tren_server_hem') : account ? CLOUD_LABEL[cloudStatus] : t('hud.chi_luu_trong_may')}
          items={[
            { label: t('hud.cai_dat_van_choi'), on: () => setSettingsOpen('game'), hint: t('hud.luu_game_khoi_phuc_lich_tu') },
            ...(account ? [{ label: t('hud.dang_xuat_2'), on: logout }] : []),
            ...(!online && account ? [{ label: t('hud.xoa_tai_khoan_du_lieu'), danger: true, on: () => void deleteAccountFlow() }] : []),
          ]}
        />
      </div>

      {message && (
        <div className="hud-toast" role="status">
          {message}
          {/* GĐ1512 (K1) — 1 chạm từ cảnh báo sắp hết hàng: mở Nhập hàng và tự điền giỏ gợi ý (vẫn phải bấm Đặt) */}
          {wantsRestockButton(message) && (
            <button type="button" className="hud-toast-btn" onClick={() => openPanel({ type: 'order', autofill: true })}>{t('hud.nhap_du')}</button>
          )}
        </div>
      )}
      {TOUCH && buildMode && placing?.movingUid !== undefined && (
        <RadialMenu items={[
          { icon: '↻', label: 'Xoay', run: worldActions.rotate },
          { icon: '📦', label: t('hud.cat_kho'), run: () => stashFurniture(placing.movingUid!) },
          { icon: '💰', label: t('hud.ban_2'), run: () => sellFurniture(placing.movingUid!) },
          { icon: '✕', label: t('hud.huy'), run: worldActions.cancel },
        ]} />
      )}
      <Suspense fallback={null}><ChapterDialogue /></Suspense>
      <TelemetryPrompt />

      {/* Dưới cùng: dải kế hoạch hôm nay (hoặc gợi ý giờ vắng), gợi ý tương tác, rồi thanh công cụ */}
      <div className="hud-bottom">
        <Suspense fallback={null}><TodayAgendaStrip /></Suspense>
        {!buildMode && <TipStrip />}
        {buildMode && (
          <div className="hud-alert build">
            {placing ? (
              <>
                {TOUCH ? t('hud.cham_de_doi_cham_lai_de') : t('hud.bam_de_dat')}
                {decorPopupLine(placing.type) && <div style={{ fontSize: 12, color: '#f1c40f' }}>{decorPopupLine(placing.type)}</div>}
                {machinePopupLine(placing.type, serviceLife?.[placing.type]) && <div style={{ fontSize: 12, color: '#81ecec' }}>{machinePopupLine(placing.type, serviceLife?.[placing.type])}</div>}
                <span className="hud-alert-actions">
                  <button className="hud-btn" onClick={worldActions.rotate}>↻ Xoay</button>
                  {TOUCH && <button className="hud-btn primary" onClick={worldActions.place}>{t('hud.dat')}</button>}
                  {placing.movingUid !== undefined && (
                    <>
                      <button className="hud-btn" onClick={() => stashFurniture(placing.movingUid!)}>{t('hud.cat_kho_2')}</button>
                      <button className="hud-btn" onClick={() => sellFurniture(placing.movingUid!)}>{t('hud.ban_2')}</button>
                    </>
                  )}
                  <button className="hud-btn" onClick={worldActions.cancel}>{t('hud.huy')}</button>
                </span>
              </>
            ) : (
              <>
                {t('hud.che_do_xay_dung')}{' '}{TOUCH ? t('hud.cham') : t('hud.bam')}{' '}{t('hud.vao_do_de_di_chuyen')}
                <button className="hud-btn" onClick={() => setBuildMode(false)}>Xong</button>
              </>
            )}
            {trialCount > 0 && (
              <div className="hud-alert-actions" style={{ marginTop: 4 }}>
                {t('hud.dang_thu')}{' '}{trialCount}{' '}{t('hud.mon')}{' '}{formatMoney(trialTotal)}
                <button className="hud-btn primary" onClick={buyTrials}>{t('hud.mua_het')}</button>
                <button className="hud-btn" onClick={dropTrials}>{t('hud.bo_thu')}</button>
              </div>
            )}
          </div>
        )}
        {hint && (buildMode ? (
          <div className="hud-hint">{TOUCH ? hint.replace(t('hud.r_xoay_esc_huy'), '').replace(t('hud.delete_ban'), t('hud.nut_ban')) : hint}</div>
        ) : (
          // Bấm vào gợi ý cũng tương tác được (thay cho bấm phím trên điện thoại)
          <button className="hud-hint" onClick={worldActions.interact}>
            {TOUCH ? hint.replace(/^\[[A-Z]\] /, '👆 ') : hint}
          </button>
        ))}
        <nav className="hud-dock" aria-label={t('hud.cong_cu')}>
          <div className="hud-speed" role="group" aria-label={t('hud.toc_do_thoi_gian')}>
            {SPEEDS.map((s) => (
              <button key={s.value} title={s.name} aria-pressed={speed === s.value} onClick={() => setSpeed(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          {/* Màn hẹp: một nút bấm xoay vòng tốc độ thay cho cả nhóm */}
          <button
            className="hud-speed-cycle"
            title={t('hud.doi_toc_do')}
            onClick={() => setSpeed(SPEEDS[(SPEEDS.findIndex((s) => s.value === speed) + 1) % SPEEDS.length].value)}
          >
            {SPEEDS.find((s) => s.value === speed)?.label ?? '1×'}
          </button>
          <span className="hud-divider" />
          <button
            className={`hud-tool hud-shop${shopOpen ? ' open' : ''}${tutActive && tutStep === 2 ? ' hud-pulse' : ''}`}
            aria-pressed={shopOpen}
            title={shopOpen ? t('hud.dong_cua_tiem_khach_moi_khong') : t('hud.mo_cua_tiem_don_khach')}
            onClick={toggleShop}
          >
            <span className="hud-tool-icon" aria-hidden="true">{shopOpen ? '🏪' : '🚪'}</span>
            <span>{shopOpen ? t('hud.dong_cua') : t('hud.mo_cua')}</span>
          </button>
          {tools.filter((t) => !(t.more || (narrow && t.narrowMore))).map((t) => <ToolButton key={t.label} tool={t} level={level} />)}
          <MoreMenu tools={tools.filter((t) => t.more || (narrow && t.narrowMore))} level={level} onHelp={() => setHelpTutorial(true)} onSettings={() => setSettingsOpen('img')} />
          <SettingsHost open={settingsOpen} onClose={() => setSettingsOpen(false)} game={{ online, save, restore, backToMenu, newGame: () => { void askConfirm(t('hud.xoa_ban_luu_va_choi_lai'), { danger: true, okLabel: t('hud.choi_lai') }).then((ok) => ok && resetGame()); } }} />
        </nav>
      </div>
      <Panels />
    </>
  );
}

/** Chip "La bàn": bước cốt truyện đang làm (hay số việc hôm nay) — bấm mở bảng Nhiệm vụ. */
function GoalChip({ ready }: { ready: number }) {
  // storyQuest trả object mới mỗi lần gọi nên gói thành chuỗi nguyên thuỷ, selector mới so sánh được
  // (quy tắc chung của dự án — như Tutorial bên dưới)
  const story = useGame((s) => {
    const q = storyQuest(questContext(s));
    if (!q) return null;
    // GĐ1628: bước bị chặn cấp → chip hiện 🔒 cấp N thay vì 0/1 đứng im
    return [q.icon, q.title, q.description, String(q.current), String(q.target), String(storyLockLevel(q.id, s.level))].join('|');
  });
  const todo = useGame((s) => dailyQuests(questContext(s)).filter((q) => !q.claimed).length);
  // Cả bộ nhiệm vụ ngày (đã xong/đã nhận/tổng) gói thành chuỗi nguyên thuỷ để selector so sánh được
  // (như story phía trên) — tránh trả object mới từng lần render.
  const set = useGame((s) => {
    const p = dailySetProgress(questContext(s));
    const remaining = p.total - p.claimed;
    return `${p.done}|${p.total}|${remaining}|${p.allDone ? 1 : 0}|${p.allClaimed ? 1 : 0}`;
  });
  const [doneN, totalN, remaining, allDoneF, allClaimedF] = set.split('|');
  const allDone = allDoneF === '1';
  const allClaimed = allClaimedF === '1';
  const stepNo = useGame((s) => questContext(s).log.claimedStory.length + 1);
  const openPanel = useGame((s) => s.openPanel);
  // Hết chuỗi cốt truyện: chip còn nhắc Việc hôm nay, nhận hết thưởng thì ẩn hẳn
  if (!story) {
    if (allClaimed) return null;
    return (
      <button className="hud-chip hud-goal" title={allDone ? t('hud.da_xong_toan_bo_viec_hom') : t('hud.viec_hom_nay_dang_cho_trong')} onClick={() => openPanel({ type: 'quests' })}>
        <span className="hud-goal-icon" aria-hidden="true">☀️</span>
        <span><b>{allDone ? t('hud.moi_viec_da_xong') : t('hud.viec_hom_nay', { doneN, totalN })}</b></span>
        {allDone && <span className="hud-badge">{t('hud.nhan_thuong')}</span>}
        {!allDone && <span className="hud-badge muted">{t('hud.con', { remaining })}</span>}
      </button>
    );
  }
  const [icon, title, desc, current, target, lockAt] = story.split('|');
  // GĐ1818: số lớn (doanh thu 16665800/50000000) phải có dấu chấm ngăn nghìn.
  const fmtGoalNum = (s: string) => { const n = Number(s); return Number.isFinite(n) ? fmtNum(Math.round(n)) : s; };
  return (
    <button
      className="hud-chip hud-goal"
      title={t('hud.buoc_cua_cot_truyen_bam_xem', { desc, stepNo, length: STORY_STEPS.length })}
      onClick={() => openPanel({ type: 'quests' })}
    >
      <span className="hud-goal-icon" aria-hidden="true">{icon}</span>
      <span>
        <b>{title}</b>
        <small>{lockAt !== '0' ? t('hud.cap_3', { lockAt }) : `${fmtGoalNum(current)}/${fmtGoalNum(target)}`}</small>
      </span>
      {ready > 0 && <span className="hud-badge">{`🎯 ${ready} xong`}</span>}
      {ready === 0 && todo > 0 && <span className="hud-badge muted">{t('hud.viec', { todo })}</span>}
    </button>
  );
}

/** Khách ở quầy xin ghi sổ / mặc cả / thiếu tiền lẻ: chọn nhanh, thế giới dừng chờ chủ quyết định (GĐ102). */

/** GĐ1529: chip "+N XP" nổi cạnh cấp mỗi lần nhận XP (1,5 giây), thuần hiển thị. */
function XpGain() {
  const dayXp = useGame((s) => s.stats.xp);
  const prev = useRef(dayXp);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const d = xpGainDelta(prev.current, dayXp);
    prev.current = dayXp;
    if (!d) return;
    setShown(d);
    const t = setTimeout(() => setShown(0), 1500);
    return () => clearTimeout(t);
  }, [dayXp]);
  return shown ? <span className="hud-xp-gain" style={{ position: 'absolute', top: -14, left: 6, fontSize: 11, fontWeight: 700, color: '#f1c40f', pointerEvents: 'none' }}>+{shown} XP</span> : null;
}

/** GĐ1535: menu quạt quanh giữa màn hình khi đang dời một món — các nút cũ ở thanh dưới vẫn giữ. */
function RadialMenu({ items }: { items: { icon: string; label: string; run: () => void }[] }) {
  const pos = radialPositions(items.length);
  return (
    <div className="hud-radial" style={{ position: 'fixed', left: '50%', top: '55%', width: 0, height: 0, pointerEvents: 'none', zIndex: 5 }}>
      {items.map((it, i) => (
        <button key={it.label} type="button" className="hud-btn" title={it.label} aria-label={it.label} onClick={it.run}
          style={{ position: 'absolute', left: pos[i].x - 20, top: pos[i].y - 20, width: 40, height: 40, borderRadius: '50%', padding: 0, pointerEvents: 'auto' }}>{it.icon}</button>
      ))}
    </div>
  );
}

/** GĐ1552 — dải mẹo "Bạn có biết?" xoay 30 phút game; ✕ ẩn trong phiên (không vào save). */
function TipStrip() {
  const level = useGame((s) => s.level);
  const day = useGame((s) => s.day);
  const seed = useGame((s) => s.weatherSeed);
  const slot = useGame((s) => Math.floor(s.minutes / 30));
  const [hidden, setHidden] = useState(false);
  // GĐ1835 (review đợt 2 R5 / đợt 3 R6): đang có banner lễ (hàng hút, khách +X%) thì nhường
  // đỉnh màn cho tin gameplay — mẹo đời thường không gối lên lễ hội nữa.
  const festival = dayEffects(seed, day, level).festival;
  if (hidden || (festival && (festival.traffic >= 1.2 || !!festival.pull))) return null;
  return (
    <div style={{ fontSize: 12, color: '#dfe6e9', background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '3px 8px', display: 'flex', gap: 6, alignItems: 'center', pointerEvents: 'auto' }}>
      <span>{t('hud.ban_co_biet')}{' '}{tipAt(level, day, slot * 30)}</span>
      <button onClick={() => setHidden(true)} style={{ background: 'none', border: 'none', color: '#b2bec3', cursor: 'pointer' }} aria-label={t('hud.an_meo')}>✕</button>
    </div>
  );
}
