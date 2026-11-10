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
import { AUTO_OPEN_PRESETS } from '../core/gameTypes';
import { dayEffects, describeDate, festivalStock, upcomingFestival, weekdayOf } from '../data/calendar';

/** GĐ275 — "7h30" / "8h": nhãn giờ mở cửa cho menu lịch tự động. */
const fmtOpenAt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`;
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
import { AccountMenu, MoreMenu } from './HudMenus';
import './hud.css';
const SurpriseAlert = lazy(() => import('./SurpriseAlert').then((m) => ({ default: m.SurpriseAlert })));
const MiniHost = lazy(() => import('./minigames/MiniHostView').then((m) => ({ default: m.MiniHostView })));
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
const Tutorial = lazy(() => import('./Tutorial').then((m) => ({ default: m.Tutorial })));
const VendorAlert = lazy(() => import('./VendorAlert').then((m) => ({ default: m.VendorAlert })));
const CounterAskAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.CounterAskAlert }))); // GĐ636
const ChapterDialogue = lazy(() => import('./ChapterDialogue').then((m) => ({ default: m.ChapterDialogue })));

/** Màn hình cảm ứng: không có phím, thay chữ phím [X] bằng biểu tượng chạm. */
const TOUCH = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const CLOUD_LABEL = { off: '', idle: 'Cloud', saving: 'Đang lưu…', saved: 'Đã lưu', error: 'Lỗi lưu', conflict: 'Xung đột' };

const SPEEDS = [
  { label: '⏸', value: 0, name: 'Tạm dừng' },
  { label: '1×', value: 1, name: 'Tốc độ thường' },
  { label: '3×', value: 3, name: 'Nhanh' },
  { label: '8×', value: 8, name: 'Rất nhanh' },
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
  const autoRoutine = useGame((s) => s.autoRoutine);
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

  const save = () => {
    notify(saveGame() ? '💾 Đã lưu game' : 'Không lưu được (trình duyệt chặn)');
    if (account) pushCloudSave();
  };
  const restore = async () => {
    const prev = readBackupSave();
    if (!prev) return notify('Chưa có bản lưu trước để khôi phục');
    const at = new Date(prev.savedAt).toLocaleString('vi-VN');
    if (!await askConfirm(`Quay về bản lưu trước (ngày ${prev.data.day}, lưu lúc ${at})?
Bản đang chơi được giữ lại, khôi phục lần nữa là trở lại.`, { okLabel: 'Khôi phục' })) return;
    restoreBackup();
    notify(`⏪ Đã quay về ngày ${prev.data.day}`);
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
    if (online && !await askConfirm('Rời hẻm và về màn hình chính? Tiến trình hẻm đã được lưu trên server.', { okLabel: 'Rời hẻm' })) return;
    leaveGame();
  };
  const logout = () => { void askConfirm('Lưu game rồi đăng xuất?', { okLabel: 'Đăng xuất' }).then((ok) => { if (ok) void leaveGame(logoutGoogle); }); };
  /** Xoá tài khoản & dữ liệu (quyền chủ thể dữ liệu — Luật 91/2025): 2 bước xác nhận, giữ bản lưu máy. */
  const deleteAccountFlow = async () => {
    if (!account) return;
    if (!await askConfirm('Xoá tài khoản và toàn bộ dữ liệu cloud? Việc này không thể hoàn tác.', { danger: true, okLabel: 'Xoá tài khoản' })) return;
    if (!await askConfirm('Chắc chắn chưa? Sẽ xoá: bản lưu cloud, các hẻm bạn tham gia, và tài khoản Google liên kết. Bản lưu trong máy này được giữ lại.', { danger: true, okLabel: 'Xoá vĩnh viễn' })) return;
    try {
      await deleteAccountData();   // xoá cloud + hẻm + bằng chứng đồng ý trên server
      await deleteAccount();       // xoá tài khoản Firebase (xác thực lại qua popup Google)
    } catch (err) {
      notify(`⚠️ Không xoá được tài khoản: ${err instanceof Error ? err.message : String(err)}`);
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
      icon: atHome ? '🛵' : '🏠', label: atHome ? 'Ra tiệm' : 'Về nhà',
      on: () => worldActions.travel(atHome ? 'shop' : 'home'),
      // Bước 3 "Đứng quầy": đang ở nhà thì nhấp nháy nút Ra tiệm dẫn đường (tới nơi rồi marker
      // vàng trên sàn quầy lo việc dẫn tiếp); bước 4 "Tối về nhà" cũng là nút này
      pulse: (tutActive && (tutStep === 4 || (tutStep === 3 && atHome))) || (atHome && waiting > 0), // GĐ648: khách chờ quầy
    },
    {
      icon: atFarm ? '🛵' : '🚜', label: atFarm ? 'Ra tiệm' : 'Ra trại',
      // GĐ160 — khoá chiều ĐI trại theo cấp 8 đúng cơ chế các nút khác (Trang trại panel cũng khoá 8):
      // trước đó bấm được là dịch chuyển tới trại trống không giải thích. Chiều VỀ (đang ở trại) luôn mở
      // — save cũ có thể đang đứng ở trại dưới cấp 8, không khoá kẻo mắc kẹt.
      lock: atFarm ? undefined : 8,
      on: () => worldActions.travel(atFarm ? 'shop' : 'ranch'),
    },
    {
      icon: '🗃️', label: 'Kho', badge: emptySlots ? `${emptySlots} trống` : undefined, active: openType === 'storage',
      on: () => openPanel({ type: 'storage' }),
    },
    { icon: '🗺️', label: 'Sơ đồ kệ', active: openType === 'planogram', pulse: tutActive && tutStep === 1, on: () => openPanel({ type: 'planogram' }) },
    { icon: '📦', label: 'Nhập hàng', badge: fairBadge, active: openType === 'order', pulse: tutActive && tutStep === 0, on: () => openPanel({ type: 'order' }) },
    // GĐ98: ☀️ Sổ đầu ngày + 🎁 Điểm danh là NGHI THỨC HẰNG NGÀY (vòng lặp giữ chân) — ở ≤480px
    // vẫn giữ trên dock (wrap 2 hàng chấp nhận được), không dời vào Thêm như 💲/📈.
    { icon: '☀️', label: 'Sổ đầu ngày', group: 'Vận hành', active: openType === 'morning', on: () => openPanel({ type: 'morning' }) },
    { icon: '📜', label: 'Nhiệm vụ', badge: questsReady ? `${questsReady} xong` : undefined, active: openType === 'quests', on: () => openPanel({ type: 'quests' }) },
    {
      icon: '🎁', label: 'Điểm danh', group: 'Vận hành', active: openType === 'gifts',
      badge: giftClaimable ? 'Có quà' : wheelReady ? '⭕ Quay' : undefined,
      on: () => openPanel({ type: 'gifts' }),
    },
    { icon: '🗓️', label: 'Lịch sự kiện', more: true, group: 'Vận hành', active: openType === 'calendar', on: () => openPanel({ type: 'calendar' }) },
    { icon: '🍳', label: 'Sổ nấu', more: true, group: 'Vận hành', lock: 21, active: openType === 'cook', on: () => openPanel({ type: 'cook' }) },
    { icon: '🛠️', label: 'Xây dựng', more: true, group: 'Vận hành', active: openType === 'arrange', on: () => openPanel({ type: 'arrange' }) },
    { icon: '💲', label: 'Giá bán', narrowMore: true, group: 'Hàng hóa', lock: FEATURES.prices, active: openType === 'prices', on: () => openPanel({ type: 'prices' }) },
    { icon: '🎁', label: 'Combo', more: true, group: 'Hàng hóa', lock: COMBO_UNLOCK, active: openType === 'combos', on: () => openPanel({ type: 'combos' }) },
    { icon: '📋', label: 'Hợp đồng', group: 'Hàng hóa', lock: 14, more: true, active: openType === 'contracts', on: () => openPanel({ type: 'contracts' }) },
    { icon: '📈', label: 'Kinh doanh', narrowMore: true, group: 'Kinh doanh & đối thủ', lock: 3, badge: [loanBadge, rivalBadge, challengeBadge].filter(Boolean).join(' · ') || undefined, active: openType === 'business', on: () => openPanel({ type: 'business' }) },
    { icon: '📊', label: 'Sổ sách', more: true, group: 'Kinh doanh & đối thủ', badge: dossierBadge, active: hubOf(openType ?? '') === 'sosach', on: () => openPanel({ type: hubFirst('sosach', level) } as never) },
    { icon: '⭐', label: 'Danh tiếng', more: true, group: 'Nhân sự & khách', badge: [rating.count ? `${rating.average.toFixed(1)}★` : undefined, triBadge, licenseBadge, skillsLeft > 0 ? `+${skillsLeft} kỹ năng` : undefined].filter(Boolean)[0], active: hubOf(openType ?? '') === 'danhtieng', on: () => openPanel({ type: hubFirst('danhtieng', level) } as never) },
    { icon: '🌱', label: 'Mở rộng', more: true, group: 'Ngoài tiệm', badge: [gardenBadge, socialBadge, onlineBadge].find(Boolean) ?? (landmarkContrib >= 28 ? undefined : `${landmarkContrib}/28`), active: hubOf(openType ?? '') === 'morong', on: () => openPanel({ type: hubFirst('morong', level) } as never) },
    { icon: '👕', label: 'Trang phục', group: 'Nhân sự & khách', lock: 2, more: true, active: openType === 'costume', on: () => openPanel({ type: 'costume' }) },
    { icon: '👥', label: 'Nhân viên', more: true, group: 'Nhân sự & khách', lock: FEATURES.staff, active: openType === 'staff', on: () => openPanel({ type: 'staff' }) },
  ];

  return (
    <>
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
            <small>Ngày {day} ({describeDate(day)}) · {weekdayOf(day)} · {spell ? describeRain(spell, weather) : WEATHER[weather].name}</small>
            {(() => {
              const s = useGame.getState().stats;
              const live = todayLine({ ...s, expectCustomers: todayExpectSoFar({ weather, tomorrow: forecast[0] ?? weather, level, day, seed: weatherSeed, minutes, localLegend: hasSkill(skills, 'local_legend'), happy: happyHour }) });
              const top = todayTopSeller(s.byItem);
              const peak = todayPeakLine(s.byHour);
              const missed = todayMissedLine(s.missed);
              const parts = [live, top, missed, peak].filter(Boolean);
              return parts.length ? <small title="Doanh thu / số món / số khách hôm nay so với dự kiến đến giờ + món chạy nhất — tổng kết đầy đủ ở Sổ tổng kết cuối ngày">{parts.join(' · ')}</small> : null;
            })()}
            <small className="hud-forecast">
              <span title={(() => {
                const next = nextGoldenBand(minutes);
                const prep = next ? goldenPrepWants(minutes, level, 5).join(', ') : '';
                return `⏰ Giờ vàng trong ngày: ${describeHours(goldenHourBands())} — đông khách, nhớ châm kệ trước giờ này.\n${next ? `Sắp tới (${next.name}): nên châm ${prep || 'món bán chạy trong khung'}.` : 'Hôm nay hết giờ vàng rồi.'}`;
              })()}>
                ⏰ {minutes < SHOP_HOURS.grocery.from ? `Chưa mở cửa (${shopHoursLabel('grocery').split('–')[0]}) — châm kệ trước`
                  : inGoldenHour(minutes) ? 'Đang giờ vàng — sẵn sàng đón khách!'
                  : (() => {
                      const mt = minutesToGolden(minutes);
                      if (mt >= 0 && mt <= 120) {
                        const prep = goldenPrepWants(minutes, level, 2).join(', ');
                        return `Sắp tới giờ vàng (${Math.ceil(mt / 60) >= 1 ? `≈${Math.ceil(mt / 60)}h` : `${mt} phút`}): châm kệ ${prep}`;
                      }
                      return `Giờ vàng: ${describeHours(goldenHourBands())}`;
                    })()}
              </span>
            </small>
            {(effects.festival || effects.market) && (
              <small title={[effects.festival && `${effects.festival.name}: ${effects.festival.blurb}`, effects.market?.label].filter(Boolean).join('\n')}>
                {effects.festival && `${effects.festival.icon} ${effects.festival.name}`}
                {effects.festival && effects.market && ' · '}
                {effects.market && `${effects.market.icon} ${effects.market.label}`}
              </small>
            )}
            {crisisDef && crisisPhase && (
              <small className="hud-crisis-chip" title={`${crisisDef.name} — ${crisisPhase}.${crisisDef.aftermath ? ` Hoàn thành phần chuẩn bị để nhận ${crisisDef.aftermath.label}.` : ''}`}>
                {crisisDef.icon} {crisisPhase}
              </small>
            )}
            {soon && (
              <small title={`${soon.festival.blurb}\nHàng nên nhập sẵn: ${festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ')}`}>
                ⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}
              </small>
            )}
            <small className="hud-forecast">{forecast.map((w, i) => <span key={i} title={describeDay(weatherSeed, day + 1 + i, w)}>{WEATHER[w].icon}</span>)}</small>
          </span>
        </div>
        <MoneyChip money={money} />
        <button className="hud-chip hud-level" style={{ position: 'relative' }} title={`${xp}/${xpToNext(level)} XP · xem lộ trình cấp`} onClick={() => openPanel({ type: 'levels' })}>
          <span className="hud-level-num">{level}</span>
          <XpGain />
          <span>
            <small>Cấp · {Math.round(progress * 100)}%</small>
            <span className="hud-xp"><span style={{ width: `${progress * 100}%` }} /></span>
          </span>
        </button>
        <GoalChip ready={questsReady} />
        <div className="hud-place">
          <span>📍 {location}</span>
          <span className={`hud-open ${shopOpen ? 'on' : ''}`}>{!shopOpen ? 'Tiệm đóng' : minutes >= SHOP_HOURS.grocery.to && minutes < 30 * 60 && !nightShift ? 'Hết đón khách mới' : 'Đang mở cửa'}</span>
        </div>
      </div>

      {/* Thông báo: cột trái, dưới ô trạng thái */}
      <div className="hud-alerts" ref={alertsRef}>
        {late && !message && <div className="hud-alert danger">🌙 Đã khuya! Về nhà ngủ trước {faintMinutes(fedBreakfast) / 60 - 24}:00 sáng kẻo ngất.</div>}
        {wheelBoost > 1 && <div className="hud-alert info">🍀 Vòng quay may mắn: hôm nay khách ghé đông thêm {Math.round((wheelBoost - 1) * 100)}%</div>}
        {dirt >= 30 && (
          <div className={`hud-alert ${dirt >= 60 ? 'warn' : 'info'}`}>
            🧹 Sàn tiệm bẩn ({Math.round(dirt)}%){dirt >= 60 ? ', khách ngại vào' : ''}{dirtInspectionNote(level, dirt)} · đứng trong tiệm bấm <b>[C]</b> (giữ phím) để tự lau
            {(() => {
              const s = useGame.getState().stats;
              const dl = dirtLoss({ dirt, level, customers: s.customers, revenue: s.revenue });
              if (!dl.avgPerVisit) return null;
              return <span style={{ marginLeft: 6, opacity: 0.9 }}>· bẩn này đang mất ~{dl.lostKhachPerDay.toFixed(0)} khách/ngày ({formatMoney(dl.moneyLostPerDay)}).</span>;
            })()}
            <span className="hud-alert-actions"><button className="hud-btn" onClick={() => worldActions.mop()}>Lau nhà</button></span>
          </div>
        )}
        {waiting > 0 && !hint?.startsWith('💵') &&<div className="hud-alert warn">🛒 {waiting} khách đang chờ tính tiền ở quầy{atHome || atFarm ? ' — bấm 🛵 Ra tiệm' : ''}</div>}
        <Suspense fallback={null}><PhoneAlerts /></Suspense>
        <Suspense fallback={null}><BranchAlert /></Suspense>
        <Suspense fallback={null}><RivalAlert /></Suspense>
        <Suspense fallback={null}><ExpiryAlert /></Suspense>
        <Suspense fallback={null}><UnlockActBanner /></Suspense>
        <Suspense fallback={null}><VendorAlert /></Suspense>
        <Suspense fallback={null}><CounterAskAlert /></Suspense>
        <Suspense fallback={null}><FestivalBanner /></Suspense>
        <Suspense fallback={null}><Tutorial review={helpTutorial} onDone={() => setHelpTutorial(false)} /></Suspense>
        <Suspense fallback={null}><SurpriseAlert /></Suspense>
        <Suspense fallback={null}><MiniHost /></Suspense>
        <Suspense fallback={null}><StoryAlert /></Suspense>
        {(hiddenAlerts > 0 || alertsOpen) && (
          <button className="hud-btn hud-alerts-more" onClick={() => setAlertsOpen(!alertsOpen)}>{alertsOpen ? 'Thu gọn thông báo' : `+${hiddenAlerts} thông báo`}</button>
        )}
        {conflict && (
          <div className="hud-alert info">
            ☁️ Cloud có bản lưu mới hơn từ máy khác (ngày {conflict.day}, cấp {conflict.level}).
            <span className="hud-alert-actions">
              <button className="hud-btn" onClick={() => takeCloudSave()}>Tải bản cloud</button>
              <button className="hud-btn" onClick={() => pushCloudSave(true)}>Ghi đè bằng bản này</button>
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
              <small>{coop.peers.length} online: {coop.peers.map((p) => (p.id === coop.selfId ? 'bạn' : p.name)).join(', ')}</small>
            </span>
            <button className="hud-link" onClick={copyRoomCode} title="Sao chép mã hẻm để gửi cho bạn bè">
              {copiedCode ? '✅ Đã chép' : '📋'}
            </button>
            <button className="hud-link" onClick={backToMenu}>Rời</button>
          </div>
        )}
        <AccountMenu
          name={account ? account.name : 'Chơi khách'}
          photo={account?.photo ?? null}
          status={online ? 'Lưu trên server hẻm' : account ? CLOUD_LABEL[cloudStatus] : 'Chỉ lưu trong máy'}
          items={[
            ...(!online ? [{ label: '💾 Lưu game', on: save }] : []),
            ...(!online ? [{ label: '⏪ Khôi phục bản lưu trước', on: restore }] : []),
            {
              // GĐ275 — lịch tự động chỉnh được giờ mở cửa (6h–8h): tắt → bật; đang bật → xoay vòng
              // 8h → 7h30 → 7h → 6h30 → 6h → 8h. Giờ vàng sáng 6h–8h30 kéo 2h30, lịch 8h lỡ nửa đầu
              // (tension GĐ160) — giờ người chơi chỉnh lịch thay vì phải mở tay mỗi sáng.
              label: autoRoutine ? `⏰ Lịch tự động: mở ${fmtOpenAt(useGame.getState().autoOpenAt)}` : '⏰ Lịch tự động: Tắt',
              on: () => {
                if (!autoRoutine) {
                  const at = useGame.getState().autoOpenAt;
                  useGame.setState({ autoRoutine: true });
                  notify(`⏰ Lịch tự động: mở ${fmtOpenAt(at)} (bấm tiếp đổi 6h–8h), đóng 22h30, về nhà 23h`);
                } else {
                  const cur = useGame.getState().autoOpenAt;
                  const i = AUTO_OPEN_PRESETS.indexOf(cur);
                  const next = AUTO_OPEN_PRESETS[(i + 1) % AUTO_OPEN_PRESETS.length];
                  useGame.setState({ autoOpenAt: next });
                  notify(`⏰ Lịch tự động mở cửa ${fmtOpenAt(next)}${next < cur ? ' — đón thêm giờ vàng sáng' : next > cur ? ' — mở trễ hơn' : ' (về mặc định)'}, 22h30 đóng, 23h kiểm kê`);
                }
              },
              hint: autoRoutine
                ? `⏰ Lịch mở cửa ${fmtOpenAt(useGame.getState().autoOpenAt)} — bấm để đổi (6h–8h). Mở sớm đón nửa giờ vàng sáng 6h–8h30.`
                : undefined,
            },
            { label: '🏠 Màn hình chính', on: backToMenu },
            ...(!online ? [{ label: '🔄 Chơi lại từ đầu', danger: true, on: () => { void askConfirm('Xoá bản lưu và chơi lại từ đầu?', { danger: true, okLabel: 'Chơi lại' }).then((ok) => ok && resetGame()); } }] : []),
            ...(account ? [{ label: '↪ Đăng xuất', on: logout }] : []),
            ...(!online && account ? [{ label: '🗑 Xoá tài khoản & dữ liệu', danger: true, on: () => void deleteAccountFlow() }] : []),
          ]}
        />
      </div>

      {message && (
        <div className="hud-toast" role="status">
          {message}
          {/* GĐ1512 (K1) — 1 chạm từ cảnh báo sắp hết hàng: mở Nhập hàng và tự điền giỏ gợi ý (vẫn phải bấm Đặt) */}
          {wantsRestockButton(message) && (
            <button type="button" className="hud-toast-btn" onClick={() => openPanel({ type: 'order', autofill: true })}>📦 Nhập đủ</button>
          )}
        </div>
      )}
      {TOUCH && buildMode && placing?.movingUid !== undefined && (
        <RadialMenu items={[
          { icon: '↻', label: 'Xoay', run: worldActions.rotate },
          { icon: '📦', label: 'Cất kho', run: () => stashFurniture(placing.movingUid!) },
          { icon: '💰', label: 'Bán', run: () => sellFurniture(placing.movingUid!) },
          { icon: '✕', label: 'Huỷ', run: worldActions.cancel },
        ]} />
      )}
      <Suspense fallback={null}><ChapterDialogue /></Suspense>

      {/* Dưới cùng: dải kế hoạch hôm nay (hoặc gợi ý giờ vắng), gợi ý tương tác, rồi thanh công cụ */}
      <div className="hud-bottom">
        <Suspense fallback={null}><TodayAgendaStrip /></Suspense>
        {!buildMode && <TipStrip />}
        {buildMode && (
          <div className="hud-alert build">
            {placing ? (
              <>
                {TOUCH ? 'Chạm để dời, chạm lại để đặt' : 'Bấm để đặt'}
                {decorPopupLine(placing.type) && <div style={{ fontSize: 12, color: '#f1c40f' }}>{decorPopupLine(placing.type)}</div>}
                {machinePopupLine(placing.type, serviceLife?.[placing.type]) && <div style={{ fontSize: 12, color: '#81ecec' }}>{machinePopupLine(placing.type, serviceLife?.[placing.type])}</div>}
                <span className="hud-alert-actions">
                  <button className="hud-btn" onClick={worldActions.rotate}>↻ Xoay</button>
                  {TOUCH && <button className="hud-btn primary" onClick={worldActions.place}>✓ Đặt</button>}
                  {placing.movingUid !== undefined && (
                    <>
                      <button className="hud-btn" onClick={() => stashFurniture(placing.movingUid!)}>📦 Cất kho</button>
                      <button className="hud-btn" onClick={() => sellFurniture(placing.movingUid!)}>Bán</button>
                    </>
                  )}
                  <button className="hud-btn" onClick={worldActions.cancel}>Huỷ</button>
                </span>
              </>
            ) : (
              <>
                🛠️ Chế độ xây dựng · {TOUCH ? 'chạm' : 'bấm'} vào đồ để di chuyển
                <button className="hud-btn" onClick={() => setBuildMode(false)}>Xong</button>
              </>
            )}
            {trialCount > 0 && (
              <div className="hud-alert-actions" style={{ marginTop: 4 }}>
                🧪 Đang thử {trialCount} món · {formatMoney(trialTotal)}
                <button className="hud-btn primary" onClick={buyTrials}>🛒 Mua hết</button>
                <button className="hud-btn" onClick={dropTrials}>Bỏ thử</button>
              </div>
            )}
          </div>
        )}
        {hint && (buildMode ? (
          <div className="hud-hint">{TOUCH ? hint.replace(' · R: xoay · Esc: huỷ', '').replace('Delete: bán', 'nút Bán') : hint}</div>
        ) : (
          // Bấm vào gợi ý cũng tương tác được (thay cho bấm phím trên điện thoại)
          <button className="hud-hint" onClick={worldActions.interact}>
            {TOUCH ? hint.replace(/^\[[A-Z]\] /, '👆 ') : hint}
          </button>
        ))}
        <nav className="hud-dock" aria-label="Công cụ">
          <div className="hud-speed" role="group" aria-label="Tốc độ thời gian">
            {SPEEDS.map((s) => (
              <button key={s.value} title={s.name} aria-pressed={speed === s.value} onClick={() => setSpeed(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          {/* Màn hẹp: một nút bấm xoay vòng tốc độ thay cho cả nhóm */}
          <button
            className="hud-speed-cycle"
            title="Đổi tốc độ"
            onClick={() => setSpeed(SPEEDS[(SPEEDS.findIndex((s) => s.value === speed) + 1) % SPEEDS.length].value)}
          >
            {SPEEDS.find((s) => s.value === speed)?.label ?? '1×'}
          </button>
          <span className="hud-divider" />
          <button
            className={`hud-tool hud-shop${shopOpen ? ' open' : ''}${tutActive && tutStep === 2 ? ' hud-pulse' : ''}`}
            aria-pressed={shopOpen}
            title={shopOpen ? 'Đóng cửa tiệm: khách mới không vào nữa' : 'Mở cửa tiệm đón khách'}
            onClick={toggleShop}
          >
            <span className="hud-tool-icon" aria-hidden="true">{shopOpen ? '🏪' : '🚪'}</span>
            <span>{shopOpen ? 'Đóng cửa' : 'Mở cửa'}</span>
          </button>
          {tools.filter((t) => !(t.more || (narrow && t.narrowMore))).map((t) => <ToolButton key={t.label} tool={t} level={level} />)}
          <MoreMenu tools={tools.filter((t) => t.more || (narrow && t.narrowMore))} level={level} onHelp={() => setHelpTutorial(true)} />
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
      <button className="hud-chip hud-goal" title={allDone ? 'Đã xong toàn bộ việc hôm nay — bấm để nhận thưởng' : 'Việc hôm nay đang chờ trong bảng Nhiệm vụ'} onClick={() => openPanel({ type: 'quests' })}>
        <span className="hud-goal-icon" aria-hidden="true">☀️</span>
        <span><b>{allDone ? 'Mọi việc đã xong' : `${doneN}/${totalN} việc hôm nay`}</b></span>
        {allDone && <span className="hud-badge">🎯 Nhận thưởng</span>}
        {!allDone && <span className="hud-badge muted">{`còn ${remaining}`}</span>}
      </button>
    );
  }
  const [icon, title, desc, current, target, lockAt] = story.split('|');
  // GĐ1818: số lớn (doanh thu 16665800/50000000) phải có dấu chấm ngăn nghìn.
  const fmtGoalNum = (s: string) => { const n = Number(s); return Number.isFinite(n) ? Math.round(n).toLocaleString('vi-VN') : s; };
  return (
    <button
      className="hud-chip hud-goal"
      title={`${desc}
Bước ${stepNo}/${STORY_STEPS.length} của cốt truyện · bấm xem Nhiệm vụ`}
      onClick={() => openPanel({ type: 'quests' })}
    >
      <span className="hud-goal-icon" aria-hidden="true">{icon}</span>
      <span>
        <b>{title}</b>
        <small>{lockAt !== '0' ? `🔒 cấp ${lockAt}` : `${fmtGoalNum(current)}/${fmtGoalNum(target)}`}</small>
      </span>
      {ready > 0 && <span className="hud-badge">{`🎯 ${ready} xong`}</span>}
      {ready === 0 && todo > 0 && <span className="hud-badge muted">{`☀️ ${todo} việc`}</span>}
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
      <span>💡 Bạn có biết? {tipAt(level, day, slot * 30)}</span>
      <button onClick={() => setHidden(true)} style={{ background: 'none', border: 'none', color: '#b2bec3', cursor: 'pointer' }} aria-label="Ẩn mẹo">✕</button>
    </div>
  );
}
