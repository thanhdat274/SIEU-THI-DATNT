import { ANIMALS, ANIMAL_ORDER, EGG_PER_TRAY, plotReady } from '../data/garden';
import { activeBuzz } from '../data/social';
import { licenseStatus, type LicenseId } from '../data/licenses';
import { faintMinutes, weeklyChallenge } from '../data/biz';
import { Joystick } from './Joystick';
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { formatClock, questContext, useClock, useGame } from '../core/store';
import { claimableCount, dailyQuests, dailySetProgress, storyQuest, STORY_STEPS } from '../data/quests';
import { idleTip, isSlowHour } from '../data/idle';
import { todayAgenda, type AgendaPanel } from '../data/todayAgenda';
import { reputationOf } from '../data/reputation';
import { dirtLoss } from '../data/dirtLoss';
import { cookSpeed, bartenderBoost } from '../core/slices/orders';
import { worldActions } from '../core/actions';
import { saveGame, resetGame, readBackupSave, restoreBackup } from '../core/save';
import { FEATURES, xpToNext } from '../data/levels';
import { formatMoney, productById } from '../data/products';
import { summarizeReviews } from '../data/reviews';
import { AUTO_OPEN_PRESETS } from '../core/gameTypes';
import { dayEffects, describeDate, festivalStock, monthOf, upcomingFestival, weekdayOf } from '../data/calendar';

/** GĐ275 — "7h30" / "8h": nhãn giờ mở cửa cho menu lịch tự động. */
const fmtOpenAt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`;
import { isFairOpen } from '../data/fairmerchant';
import { lifetimeRegularVisits, vipTierOf, EMOTIONAL_FRIENDSHIP } from '../data/regularTrust';
import { relTier } from '../data/supplierRel';
import { serviceById } from '../data/services';
import { ASK_RESOLVE_REAL_S } from '../data/counterDeals';
import { dossierEarnedCount, type DossierInput } from '../data/dossier';
import { describeHours, goldenHourBands, goldenPrepWants, inGoldenHour, minutesToGolden, nextGoldenBand } from '../data/rhythm';
import { skillPoints } from '../data/titles';
import { COMBO_UNLOCK } from '../data/combos';
import { describeDay, describeRain, rainSpell, WEATHER } from '../data/weather';
import { pushCloudSave, takeCloudSave } from '../net/cloud';
import { leaveRoom } from '../net/coop';
import { logoutGoogle } from '../net/firebase';
import { useSession } from '../net/session';
import { initAudio, isMuted, isMusic, setMuted, setMusic } from '../core/audio';
import { Panels } from './Panels';
import { hubFirst, hubOf } from './hubs';
import { answerAsk, useCounterAsk, askWallElapsed } from '../core/counterAsk';
import { GFX_CYCLE, GFX_LABEL, gfxStatus, setGfxChoice } from '../render/graphicsQuality';
import './hud.css';
const SurpriseAlert = lazy(() => import('./SurpriseAlert').then((m) => ({ default: m.SurpriseAlert })));
const ExpiryAlert = lazy(() => import('./ExpiryAlert').then((m) => ({ default: m.ExpiryAlert })));
const UnlockActBanner = lazy(() => import('./UnlockActBanner').then((m) => ({ default: m.UnlockActBanner })));
const BranchAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.BranchAlert })));
const RivalAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.RivalAlert })));
const StoryAlert = lazy(() => import('./HudAlerts').then((m) => ({ default: m.StoryAlert })));
const PhoneAlerts = lazy(() => import('./PhoneAlerts').then((m) => ({ default: m.PhoneAlerts })));

export { tutorialActive, tutorialStep, tutorialSteps } from './tutorialSteps';
import { tutorialActive, tutorialStep } from './tutorialSteps';
const Tutorial = lazy(() => import('./Tutorial').then((m) => ({ default: m.Tutorial })));
const VendorAlert = lazy(() => import('./VendorAlert').then((m) => ({ default: m.VendorAlert })));
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

const CONTROLS = [
  ['WASD / bấm chuột', 'Đi lại'],
  ['N', 'Đi ngủ (ở giường)'],
  ['B', 'Bày hàng (ở kệ, tủ)'],
  ['K', 'Đặt hàng / xem kho (ở kho)'],
  ['G', 'Giao hàng (ở cửa nhà khách)'],
  ['M', 'Nấu ăn (ở trạm nấu)'],
  ['O', 'Đóng / mở cửa tiệm'],
  ['Kéo chuột trái', 'Nhìn quanh'],
  ['Chuột phải / Q E', 'Xoay camera'],
  ['Cuộn chuột', 'Phóng to, thu nhỏ'],
  ['Esc', 'Đóng bảng'],
];

/** Nút tắt/bật tiếng: âm thanh lưu riêng trong máy, không nằm trong bản lưu game. */
function SoundToggle() {
  const [muted, setLocal] = useState(isMuted());
  return (
    <button
      className="hud-chip hud-sound"
      title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      onClick={() => { initAudio(); const next = !muted; setMuted(next); setLocal(next); }}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}

/** Nút nhạc nền: giai điệu nhẹ tự sinh, bật riêng khỏi hiệu ứng tiếng. */
function MusicToggle() {
  const [on, setLocal] = useState(isMusic());
  return (
    <button
      className="hud-chip hud-sound"
      title={on ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
      onClick={() => { const next = !on; setMusic(next); setLocal(next); }}
    >
      <span aria-hidden="true">{on ? '🎵' : '🎶'}</span>
    </button>
  );
}

/** Tiền "pop" mỗi khi đổi: xanh khi kiếm, đỏ khi chi, kèm số +/− nổi lên rồi tan. */
function MoneyChip({ money }: { money: number }) {
  const [bump, setBump] = useState(0);
  const [delta, setDelta] = useState<{ v: number; dir: 1 | -1 } | null>(null);
  const prev = useRef(money);
  useEffect(() => {
    if (money === prev.current) return;
    const diff = money - prev.current;
    prev.current = money;
    if (Math.abs(diff) >= 100) {
      setDelta({ v: diff, dir: diff >= 0 ? 1 : -1 });
      setBump((n) => n + 1);
    }
    const t = setTimeout(() => setDelta(null), 1300);
    return () => clearTimeout(t);
  }, [money]);
  return (
    <div className="hud-chip hud-money" title="Tiền hiện có">
      <span aria-hidden="true">💰</span>
      <b key={bump} className={delta ? (delta.dir === 1 ? 'money-up' : 'money-down') : undefined}>{formatMoney(money)}</b>
      {delta && <span className={`hud-delta ${delta.dir === 1 ? 'up' : 'down'}`}>{delta.dir === 1 ? '+' : '−'}{formatMoney(Math.abs(delta.v))}</span>}
    </div>
  );
}

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
  const placing = useGame((s) => s.placing);
  const sellFurniture = useGame((s) => s.sellFurniture);
  const weather = useGame((s) => s.weather);
  const autoRoutine = useGame((s) => s.autoRoutine);
  const forecast = useGame((s) => s.forecast);
  const weatherSeed = useGame((s) => s.weatherSeed);
  const skillsLeft = useGame((s) => skillPoints(s.level) - s.skills.length);
  const effects = dayEffects(weatherSeed, day, level);
  const soon = upcomingFestival(day);
  const spell = rainSpell(weatherSeed, day, weather);
  // Ngày mưa mà chưa tới hoặc đã qua cơn mưa thì trời chỉ nhiều mây
  const raining = !!spell && minutes >= spell.start && minutes < spell.end;
  const skyIcon = spell && !raining ? WEATHER.cloudy.icon : WEATHER[weather].icon;
  const forecastText = forecast.map((w, i) => `${i ? 'Ngày kia' : 'Ngày mai'}: ${describeDay(weatherSeed, day + 1 + i, w)}`).join('\n');
  const { account, cloudStatus, conflict, coop } = useSession();
  /** Đang ở hẻm online: tiến trình là của cả hẻm, lưu trên server thay vì trong máy. */
  const online = !!coop;
  /** Số lượt đã góp sân chơi (GĐ40) — để nút menu hiện tiến độ n/28. */
  const landmarkContrib = useGame((s) => s.biz.landmark.contributions);
  const fedBreakfast = useGame((s) => s.biz.breakfastDay === s.day);
  const [copiedCode, setCopiedCode] = useState(false);
  // Xem lại hướng dẫn từ menu Thêm: bật thì Tutorial chuyển sang chế độ review
  const [helpTutorial, setHelpTutorial] = useState(false);
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
  const restore = () => {
    const prev = readBackupSave();
    if (!prev) return notify('Chưa có bản lưu trước để khôi phục');
    const at = new Date(prev.savedAt).toLocaleString('vi-VN');
    if (!confirm(`Quay về bản lưu trước (ngày ${prev.data.day}, lưu lúc ${at})?
Bản đang chơi được giữ lại, khôi phục lần nữa là trở lại.`)) return;
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
  const backToMenu = () => {
    if (online && !confirm('Rời hẻm và về màn hình chính? Tiến trình hẻm đã được lưu trên server.')) return;
    leaveGame();
  };
  const logout = () => confirm('Lưu game rồi đăng xuất?') && leaveGame(logoutGoogle);

  // Ô kệ đang trống (chưa gán món hoặc hết hàng) để nhắc trên nút Kho
  const emptySlots = useGame((s) => s.furniture.reduce((n, f) => n + f.tiers.filter((t) => !t.productId || t.count === 0).length, 0));
  // Nhiệm vụ đã xong chờ nhận thưởng
  const questsReady = useGame((s) => claimableCount(questContext(s)));
  const rivalBadge = useGame((s) => (s.biz.rival ? `⚔️ ${Math.round(s.biz.rival.strength)}` : undefined));
  const socialBadge = useGame((s) => {
    const buzz = activeBuzz(s.social, s.day);
    return buzz?.kind === 'crisis' && !buzz.responded ? '⚠️ Khủng hoảng' : buzz?.kind === 'hype' ? '🔥 Hot' : undefined;
  });
  const onlineBadge = useGame((s) => {
    const n = s.online.orders.filter((o) => o.status === 'new').length;
    return n ? `${n} đơn mới` : undefined;
  });
  const licenseBadge = useGame((s) => {
    if (s.inspection.suspendedDay === s.day) return '⛔ Đình chỉ';
    const due = Object.keys(s.inspection.noticed ?? {}).filter((id) => {
      const st = licenseStatus(s.licenses, id as LicenseId, s.day);
      return st === 'none' || st === 'expired';
    }).length;
    return due ? `${due} cần xin` : undefined;
  });
  // Vẫn còn nợ ngân hàng thì nhắc số gốc ngay trên nút Kinh doanh
  const loanBadge = useGame((s) => {
    const l = s.biz.loan;
    if (!l) return undefined;
    const goc = l.principal >= 1000000 ? `${Math.round((l.principal / 1000000) * 10) / 10}tr` : `${Math.round(l.principal / 1000)}k`;
    return `🏦 ${goc}${s.day >= l.dueDay - 3 ? ' ⚠️' : ''}`;
  });
  // Thử thách tuần sắp xong (≥80% mục tiêu) hoặc đã xong thì nhắc trên nút Kinh doanh;
  // dưới 80% thì khỏi nhồi — nút khoá (cấp < 3) ToolButton tự ẩn badge.
  const challengeBadge = useGame((s) => {
    const ch = weeklyChallenge(Math.ceil(s.day / 7), s.level);
    const target = ch.target(s.level);
    // Save cũ thiếu counter trong tally thì tiến độ coi như 0 (giống tab Lãi lỗ)
    const current = ch.measure === 'revenue' ? s.biz.week.revenue : (s.biz.week[ch.measure] ?? 0);
    if (current >= target) return '🎯 xong';
    return current >= target * 0.8 ? `🎯 ${ch.icon}` : undefined;
  });
  // Điểm danh quà / lượt vòng quay hôm nay còn trống thì nhắc trên nút
  const giftClaimable = useGame((s) => s.giftLastDay !== s.day);
  const wheelReady = useGame((s) => s.wheelLastDay !== s.day);
  const wheelBoost = useGame((s) => s.wheelBoost);
  // Đầu tháng có chợ phiên đặc biệt còn chưa lấy thì nhắc trên nút Nhập hàng
  const fairBadge = useGame((s) => (isFairOpen(s.day) && s.biz.fairTaken !== monthOf(s.day)) ? '🛒 Phiên chợ' : undefined);
  // Sổ thương mến (GĐ69): bậc Tiệm hiện tại (bể khách quen cả ván) — hiện trên nút Khách quen
  const triBadge = useGame((s) => {
    const t = vipTierOf(lifetimeRegularVisits(s.regulars ?? {}));
    return t.level >= 1 ? `${t.icon} ${t.name}` : undefined;
  });
  // Hồ sơ tiệm (GĐ71): số huy hiệu thâm niên đã đạt — hiện trên nút Hồ sơ tiệm
  const dossierBadge = useGame((s) => {
    const d: DossierInput = {
      supplierTier: Math.max(0, ...Object.values(s.biz.supplierRel ?? {}).map((r) => relTier(r.spent).level)),
      regularTier: vipTierOf(lifetimeRegularVisits(s.regulars ?? {})).level,
      closeRegulars: Object.values(s.regulars ?? {}).filter((r) => r.friendship >= EMOTIONAL_FRIENDSHIP).length,
      fairTaken: s.biz.fairTaken !== undefined,
      prepClaimed: s.biz.prepClaimed !== undefined,
      servicesOwned: (s.biz.services ?? []).length,
      servicesPaidBack: Object.entries(s.biz.serviceLife ?? {}).filter(([sid, life]) => (serviceById(sid)?.price ?? Infinity) <= life).length,
      demographicsCount: Object.keys(s.biz.demographics ?? {}).length,
      landmarkContrib: s.biz.landmark?.contributions ?? 0,
      prestigeLevel: s.biz.prestige?.level ?? 0,
      rivalArcs: (s.biz.rivalTrend ?? []).length,
      perfectDays: s.biz.perfectDays ?? 0,
    };
    const n = dossierEarnedCount(d);
    return n > 0 ? `${n} huy hiệu` : undefined;
  });
  // Trang trại: luống chờ thu, trứng/sữa chờ lấy, heo xuất chuồng được, gà đói mà kho hết cám, hoặc chưa tưới
  const gardenBadge = useGame((s) => {
    if (s.level < 8) return undefined;
    if (s.garden.farmOrder && s.garden.farmOrder.dueDay === s.day + 1) return '📦 Đơn sắp hết hạn';
    for (const kind of ANIMAL_ORDER) {
      const pen = s.garden.pens[kind];
      if (!pen?.count) continue;
      const def = ANIMALS[kind];
      if (kind === 'pig' && (pen.fattened ?? 0) >= (def.fattenDays ?? 0)) return '🐖 Xuất chuồng được';
      if (kind !== 'pig' && pen.pending >= (kind === 'cow' ? 1 : EGG_PER_TRAY)) return kind === 'cow' ? '🥛 Sữa chờ vắt' : '🥚 Trứng chờ thu';
    }
    if (s.garden.plots.some(plotReady)) return '🧺 Thu được';
    const outOfFeed = ANIMAL_ORDER.some((kind) => {
      const pen = s.garden.pens[kind];
      if (!pen?.count || pen.fedDay === s.day) return false;
      const def = ANIMALS[kind];
      return pen.feedKg < pen.count * def.feedKgPerDay && (s.storage[def.feedProduct] ?? 0) === 0;
    });
    if (outOfFeed) return '🌽 Hết cám';
    const dry = s.weather !== 'rain' && s.weather !== 'storm' && s.garden.plots.some((p) => p.crop && p.wateredDay !== s.day);
    return dry ? '💧 Chưa tưới' : undefined;
  });
  // Ở hẻm online nhà chung mang tên riêng; cả hai đều là "đang ở nhà" nên mới hiện nút Ra tiệm
  const atHome = location === 'Nhà của bạn' || location === 'Nhà chung của hẻm';
  const atFarm = location === 'Trang trại đầu ngõ';
  // Bảng nào đang mở thì nút mở bảng đó sáng lên
  const openType = useGame((s) => s.panel?.type ?? null);
  // Hướng dẫn ngày đầu đang hiện và đang dừng ở bước nào (để nhấp nháy đúng nút dock)
  const tutActive = useGame(tutorialActive);
  const tutStep = useGame(tutorialStep);
  type Tool = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; more?: boolean; /** Nhóm trong menu Thêm: tiêu đề nhỏ hiện trước cụm nút cùng nhóm */ group?: string; /** Màn hẹp (điện thoại đứng): dời vào menu Thêm cho dock vừa một hàng */ narrowMore?: boolean; /** Bước hướng dẫn ngày đầu đang chỉ tới nút này: viền vàng nhấp nháy */ pulse?: boolean };
  const tools: Tool[] = [
    {
      icon: atHome ? '🛵' : '🏠', label: atHome ? 'Ra tiệm' : 'Về nhà',
      on: () => worldActions.travel(atHome ? 'shop' : 'home'),
      // Bước 3 "Đứng quầy": đang ở nhà thì nhấp nháy nút Ra tiệm dẫn đường (tới nơi rồi marker
      // vàng trên sàn quầy lo việc dẫn tiếp); bước 4 "Tối về nhà" cũng là nút này
      pulse: tutActive && (tutStep === 4 || (tutStep === 3 && atHome)),
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
      {/* Cột trái trên: ngày giờ, tiền, cấp; thông báo xếp ngay bên dưới nên không đè lên cụm bên phải */}
      <div className="hud-left">
      <div className="hud-status">
        <div className="hud-chip hud-time" title={`${WEATHER[weather].tip}
${forecastText}`}>
          <span className="hud-weather" aria-hidden="true">{skyIcon}</span>
          <span>
            <b className={late ? 'hud-late' : undefined}>{formatClock(minutes)}</b>
            <small>Ngày {day} ({describeDate(day)}) · {weekdayOf(day)} · {spell ? describeRain(spell, weather) : WEATHER[weather].name}</small>
            <small className="hud-forecast">
              <span title={(() => {
                const next = nextGoldenBand(minutes);
                const prep = next ? goldenPrepWants(minutes, level, 5).join(', ') : '';
                return `⏰ Giờ vàng trong ngày: ${describeHours(goldenHourBands())} — đông khách, nhớ châm kệ trước giờ này.\n${next ? `Sắp tới (${next.name}): nên châm ${prep || 'món bán chạy trong khung'}.` : 'Hôm nay hết giờ vàng rồi.'}`;
              })()}>
                ⏰ {inGoldenHour(minutes) ? 'Đang giờ vàng — sẵn sàng đón khách!'
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
            {soon && (
              <small title={`${soon.festival.blurb}\nHàng nên nhập sẵn: ${festivalStock(soon.festival, level).map((id) => productById(id).name).join(', ')}`}>
                ⏳ {soon.festival.icon} {soon.festival.name} {soon.inDays === 1 ? 'ngày mai' : `sau ${soon.inDays} ngày`}
              </small>
            )}
            <small className="hud-forecast">{forecast.map((w, i) => <span key={i} title={describeDay(weatherSeed, day + 1 + i, w)}>{WEATHER[w].icon}</span>)}</small>
          </span>
        </div>
        <MoneyChip money={money} />
        <button className="hud-chip hud-level" title={`${xp}/${xpToNext(level)} XP · xem lộ trình cấp`} onClick={() => openPanel({ type: 'levels' })}>
          <span className="hud-level-num">{level}</span>
          <span>
            <small>Cấp · {Math.round(progress * 100)}%</small>
            <span className="hud-xp"><span style={{ width: `${progress * 100}%` }} /></span>
          </span>
        </button>
        <GoalChip ready={questsReady} />
        <div className="hud-place">
          <span>📍 {location}</span>
          <span className={`hud-open ${shopOpen ? 'on' : ''}`}>{shopOpen ? 'Đang mở cửa' : 'Tiệm đóng'}</span>
        </div>
      </div>

      {/* Thông báo: cột trái, dưới ô trạng thái */}
      <div className="hud-alerts">
        {late && !message && <div className="hud-alert danger">🌙 Đã khuya! Về nhà ngủ trước {faintMinutes(fedBreakfast) / 60 - 24}:00 sáng kẻo ngất.</div>}
        {wheelBoost > 1 && <div className="hud-alert info">🍀 Vòng quay may mắn: hôm nay khách ghé đông thêm {Math.round((wheelBoost - 1) * 100)}%</div>}
        {dirt >= 30 && (
          <div className={`hud-alert ${dirt >= 60 ? 'warn' : 'info'}`}>
            🧹 Sàn tiệm bẩn ({Math.round(dirt)}%){dirt >= 60 ? ', khách ngại vào' : ''} · đứng trong tiệm bấm <b>[C]</b> (giữ phím) để tự lau
            {(() => {
              const s = useGame.getState().stats;
              const dl = dirtLoss({ dirt, level, customers: s.customers, revenue: s.revenue });
              if (!dl.avgPerVisit) return null;
              return <span style={{ marginLeft: 6, opacity: 0.9 }}>· bẩn này đang mất ~{dl.lostKhachPerDay.toFixed(0)} khách/ngày ({formatMoney(dl.moneyLostPerDay)}).</span>;
            })()}
            <span className="hud-alert-actions"><button className="hud-btn" onClick={() => worldActions.mop()}>Lau nhà</button></span>
          </div>
        )}
        {waiting > 0 && !hint?.startsWith('💵') &&<div className="hud-alert warn">🛒 {waiting} khách đang chờ tính tiền ở quầy</div>}
        <Suspense fallback={null}><PhoneAlerts /></Suspense>
        <Suspense fallback={null}><BranchAlert /></Suspense>
        <Suspense fallback={null}><RivalAlert /></Suspense>
        <Suspense fallback={null}><ExpiryAlert /></Suspense>
        <Suspense fallback={null}><UnlockActBanner /></Suspense>
        <Suspense fallback={null}><VendorAlert /></Suspense>
        <CounterAskAlert />
        <FestivalBanner />
        <Suspense fallback={null}><Tutorial review={helpTutorial} onDone={() => setHelpTutorial(false)} /></Suspense>
        <Suspense fallback={null}><SurpriseAlert /></Suspense>
        <Suspense fallback={null}><StoryAlert /></Suspense>
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
            ...(!online ? [{ label: '🔄 Chơi lại từ đầu', danger: true, on: () => confirm('Xoá bản lưu và chơi lại từ đầu?') && resetGame() }] : []),
            ...(account ? [{ label: '↪ Đăng xuất', on: logout }] : []),
          ]}
        />
      </div>

      {message && <div className="hud-toast" role="status">{message}</div>}
      <Suspense fallback={null}><ChapterDialogue /></Suspense>

      {/* Dưới cùng: dải kế hoạch hôm nay (hoặc gợi ý giờ vắng), gợi ý tương tác, rồi thanh công cụ */}
      <div className="hud-bottom">
        <TodayAgendaStrip />
        {buildMode && (
          <div className="hud-alert build">
            {placing ? (
              <>
                {TOUCH ? 'Chạm để dời, chạm lại để đặt' : 'Bấm để đặt'}
                <span className="hud-alert-actions">
                  <button className="hud-btn" onClick={worldActions.rotate}>↻ Xoay</button>
                  {TOUCH && <button className="hud-btn primary" onClick={worldActions.place}>✓ Đặt</button>}
                  {placing.movingUid !== undefined && (
                    <button className="hud-btn" onClick={() => sellFurniture(placing.movingUid!)}>Bán</button>
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

type ToolDef = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; /** Nhóm trong menu Thêm: tiêu đề nhỏ hiện trước cụm nút cùng nhóm */ group?: string; /** Bước hướng dẫn ngày đầu đang chỉ tới nút này: viền vàng nhấp nháy */ pulse?: boolean };

function ToolButton({ tool: t, level, onPicked }: { tool: ToolDef; level: number; onPicked?: () => void }) {
  const locked = t.lock !== undefined && level < t.lock;
  return (
    <button
      className={`hud-tool${t.active ? ' active' : ''}${t.pulse ? ' hud-pulse' : ''}`}
      disabled={locked}
      title={locked ? `Mở khóa ở cấp ${t.lock}` : t.label}
      onClick={() => { onPicked?.(); t.on(); }}
    >
      <span className="hud-tool-icon" aria-hidden="true">{locked ? '🔒' : t.icon}</span>
      <span>{t.label}</span>
      {locked && <span className="hud-badge muted">Cấp {t.lock}</span>}
      {!locked && t.badge && <span className="hud-badge">{t.badge}</span>}
    </button>
  );
}

/** Các bảng ít dùng gom vào một nút để thanh công cụ vừa màn hình; có việc cần xem thì hiện chấm báo. */
function MoreMenu({ tools, level, onHelp }: { tools: ToolDef[]; level: number; onHelp: () => void }) {
  const { open, setOpen, ref } = usePopover();
  const [keys, setKeys] = useState(false);
  const alert = tools.some((t) => t.badge && !(t.lock !== undefined && level < t.lock) && !t.badge.includes('★'));
  return (
    <div className="hud-pop" ref={ref}>
      <button className="hud-tool" aria-haspopup="menu" aria-expanded={open} title="Thêm" onClick={() => { setOpen(!open); setKeys(false); }}>
        <span className="hud-tool-icon" aria-hidden="true">⋯</span>
        <span>Thêm</span>
        {alert && <span className="hud-badge hud-dot" aria-label="Có việc cần xem" />}
      </button>
      {open && (
        <div className="hud-menu hud-more" role="menu">
          {keys ? (
            <div className="hud-help">
              {CONTROLS.map(([k, v]) => (
                <div key={k}><kbd>{k}</kbd><span>{v}</span></div>
              ))}
            </div>
          ) : (
            <>
              {/* Tiêu đề nhóm nhỏ trước từng cụm liên tiếp; thứ tự nút giữ nguyên như cũ */}
              {tools.map((t, i) => (
                <Fragment key={t.label}>
                  {t.group && t.group !== tools[i - 1]?.group && <div className="hud-more-group">{t.group}</div>}
                  <ToolButton tool={t} level={level} onPicked={() => setOpen(false)} />
                </Fragment>
              ))}
              <GfxButton level={level} />
              {!TOUCH && <ToolButton tool={{ icon: '⌨️', label: 'Phím', on: () => setKeys(true) }} level={level} />}
              {/* Xem lại hướng dẫn mở tiệm: cả máy cảm xúc lẫn desktop đều cần */}
              <ToolButton tool={{ icon: '📖', label: 'Hướng dẫn', on: onHelp }} level={level} onPicked={() => setOpen(false)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Nút đồ họa trong menu Thêm: bấm để xoay vòng Tự động → Thấp → Vừa → Cao. Tự động thì ghi kèm
 * mức máy đang chạy. Tuỳ chọn riêng máy, không vào save — menu vẫn mở để bấm tiếp cho tới mức ưng.
 */
function GfxButton({ level }: { level: number }) {
  const [choice, setChoice] = useState(gfxStatus().choice);
  const st = gfxStatus();
  const label = choice === 'auto' ? `Đồ họa: Tự động (${GFX_LABEL[st.level]})` : `Đồ họa: ${GFX_LABEL[choice]}`;
  const next = () => {
    const c = GFX_CYCLE[(GFX_CYCLE.indexOf(choice) + 1) % GFX_CYCLE.length];
    setGfxChoice(c);
    setChoice(c);
  };
  return <ToolButton tool={{ icon: '🎨', label, on: next }} level={level} />;
}

/** Đóng popover khi bấm ra ngoài hoặc nhấn Esc. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function AccountMenu({ name, photo, status, items }: {
  name: string; photo: string | null; status: string;
  items: { label: string; on: () => unknown; danger?: boolean; /** GĐ160: dòng nhỏ giải thích ngay dưới mục, không bấm được */ hint?: string }[];
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="hud-pop" ref={ref}>
      <button className="hud-chip hud-account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {photo ? <img src={photo} alt="" referrerPolicy="no-referrer" /> : <span className="hud-avatar">{name[0]}</span>}
        <span>
          <b>{name}</b>
          <small>{status}</small>
        </span>
        <span className="hud-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="hud-menu" role="menu">
          {items.map((it) => (
            <Fragment key={it.label}>
              <button role="menuitem" className={it.danger ? 'danger' : undefined} onClick={() => { setOpen(false); it.on(); }}>
                {it.label}
              </button>
              {it.hint && <div className="hud-menu-hint">{it.hint}</div>}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** Đang trong mùa lễ: nói rõ khách đông bao nhiêu, món nào hút, giá nhập tăng bao nhiêu. */
function FestivalBanner() {
  const day = useGame((s) => s.day);
  const level = useGame((s) => s.level);
  const seed = useGame((s) => s.weatherSeed);
  const f = dayEffects(seed, day, level).festival;
  if (!f || (f.traffic < 1.2 && !f.pull)) return null;
  const goods = festivalStock(f, level).map((id) => productById(id).name).join(', ');
  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  return (
    <div className="hud-alert festival">
      {f.icon} <b>{f.name}</b>: khách {pct(f.traffic)}{f.cost !== 1 && ` · giá nhập ${pct(f.cost)}`}
      {f.tolerance && ' · khách chịu giá cao'}{goods && <small> · hàng hút: {goods}</small>}
    </div>
  );
}

/** Chip "La bàn": bước cốt truyện đang làm (hay số việc hôm nay) — bấm mở bảng Nhiệm vụ. */
function GoalChip({ ready }: { ready: number }) {
  // storyQuest trả object mới mỗi lần gọi nên gói thành chuỗi nguyên thuỷ, selector mới so sánh được
  // (quy tắc chung của dự án — như Tutorial bên dưới)
  const story = useGame((s) => {
    const q = storyQuest(questContext(s));
    return q ? [q.icon, q.title, q.description, String(q.current), String(q.target)].join('|') : null;
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
  const [icon, title, desc, current, target] = story.split('|');
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
        <small>{`${current}/${target}`}</small>
      </span>
      {ready > 0 && <span className="hud-badge">{`🎯 ${ready} xong`}</span>}
      {ready === 0 && todo > 0 && <span className="hud-badge muted">{`☀️ ${todo} việc`}</span>}
    </button>
  );
}

/** Chip gợi ý giờ vắng khách: việc đáng làm nhất lúc này, bấm là mở đúng bảng (hay lau nhà luôn). */
function IdleChip() {
  const minutes = useClock((c) => Math.floor(c.minutes));
  const s = useGame();
  // Chỉ nhắc khi đúng là giờ vắng, tiệm đang mở, không bảng nào che màn, đồng hồ đang chạy,
  // và tutorial ngày đầu không đang hiện (tránh chồng hướng dẫn mới vào game).
  if (!(isSlowHour(minutes) && s.shopOpen && !s.panel && s.speed > 0 && !tutorialActive(s))) return null;
  const tip = idleTip(s);
  if (!tip) return null;
  const go = () => {
    if (tip.act === 'mop') worldActions.mop();
    else if (tip.act) s.openPanel({ type: tip.act });
  };
  return tip.act ? (
    <button className="hud-chip hud-idle" title={`${tip.text} · bấm để làm ngay`} onClick={go}>
      <span aria-hidden="true">{tip.icon}</span>
      <span>{tip.text}</span>
    </button>
  ) : (
    <div className="hud-chip hud-idle" title={tip.text}>
      <span aria-hidden="true">{tip.icon}</span>
      <span>{tip.text}</span>
    </div>
  );
}

/** GĐ162 — Dải "Kế hoạch hôm nay": mọi hẹn giờ trong ngày (khách quen ghé, giờ vàng,
 *  mẻ nấu, khe điện thoại, hợp đồng/đơn tiệc hạn giao) ghép lại thành MỘT dải ngang
 *  theo thứ tự thời gian, trả lời "BÂY GIỜ việc kế tiếp của tôi là gì?".
 *  Hôm nay có ít nhất 1 hẹn → dải THAY slot IdleChip (chip đầu tiên — đang đến hạn
 *  hoặc đang trong khung — được nhấn mạnh viền vàng); 0 hẹn → IdleChip hiện như cũ,
 *  dải ẩn hoàn toàn. Bấm chip mở đúng bảng liên quan. Giờ đọc 1 lần/phút game
 *  (useClock theo phút nguyên, như GĐ161) — không vẽ lại 60fps. */
function TodayAgendaStrip() {
  const minutes = useClock((c) => Math.floor(c.minutes));
  const s = useGame();
  const items = todayAgenda({
    minutes,
    day: s.day,
    seed: s.weatherSeed,
    level: s.level,
    regulars: s.regulars,
    rep: reputationOf(s.repLog),
    reservations: s.reservations,
    regularArcs: s.biz.regularArcs, // GĐ163: bước nhờ của khách quen đang chờ → chip "Việc {khách} nhờ"
    surpriseArc: s.biz.surpriseArc, // GĐ164: chuyện sự kiện đang kể dở → chip "📖 {tên} còn dở"
    cookJobs: s.cookJobs,
    stations: s.furniture.map((f) => f.type),
    storage: s.storage,
    cookSpeedMul: cookSpeed(useGame.getState),
    bartenderBoost: bartenderBoost(useGame.getState),
    hasCourier: s.staff.some((w) => w.role === 'courier'),
    contracts: s.contracts,
    order: s.order,
  });
  // Không có hẹn nào (hoặc đang hướng dẫn ngày đầu — như IdleChip, tránh chồng lớp) → trả slot IdleChip.
  if (!items.length || tutorialActive(s)) return <IdleChip />;
  // Bảng đang mở thì nhường chỗ (như IdleChip đã làm) — không chồng lớp dưới panel.
  if (s.panel) return null;
  return (
    <div className="hud-agenda" role="list" aria-label="Kế hoạch hôm nay">
      {items.map((it, i) => (
        <button
          key={it.key}
          role="listitem"
          className={`hud-agenda-chip${i === 0 ? ' next' : ''}`}
          title={`${it.label} · bấm để mở bảng liên quan`}
          onClick={() => s.openPanel({ type: it.panel as AgendaPanel })}
        >
          <span aria-hidden="true">{it.icon}</span>
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Khách ở quầy xin ghi sổ / mặc cả / thiếu tiền lẻ: chọn nhanh, thế giới dừng chờ chủ quyết định (GĐ102). */
function CounterAskAlert() {
  const ask = useCounterAsk((s) => s.ask);
  // GĐ122 — đồng hồ THỰC cho khách đang bị treo câu hỏi: khách vẫn mất kiên nhẫn theo giây thật
  // (khác giờ game đang dừng), hiện còn bao nhiêu giây nữa sẽ tự chốt theo mặc định — để người chơi
  // biết hậu quả trước khi muộn (không phạt bất ngờ), và khớp cùng ngân sách bong bóng 3D.
  const rem = Math.ceil(ASK_RESOLVE_REAL_S - askWallElapsed());
  const [, force] = useState(0);
  useEffect(() => {
    if (!ask) return;
    const id = setInterval(() => force((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [ask]);
  if (!ask) return null;
  return (
    <div className="hud-alert phone ringing">
      {ask.icon} <b>{ask.who}</b> {ask.text}
      <small> · tiệm tạm dừng chờ cậu chọn · còn ~{Math.max(1, rem)}s nữa khách tự chốt theo mặc định</small>
      <span className="hud-alert-actions">
        {ask.options.map((label, i) => (
          <button key={label} className={`hud-btn${i === 0 ? ' primary' : ''}`} onClick={() => answerAsk(i)}>{label}</button>
        ))}
      </span>
    </div>
  );
}
