import { CONVENIENCE } from '../data/branches';
import { plotReady } from '../data/garden';
import { activeBuzz, SOCIAL_UNLOCK } from '../data/social';
import { ONLINE_UNLOCK } from '../data/online';
import { licenseStatus, type LicenseId } from '../data/licenses';
import { INSPECTION_UNLOCK } from '../data/biz';
import { Joystick } from './Joystick';
import { useEffect, useRef, useState } from 'react';
import { formatClock, questContext, useClock, useGame } from '../core/store';
import { claimableCount } from '../data/quests';
import { worldActions } from '../core/actions';
import { saveGame, resetGame, readBackupSave, restoreBackup } from '../core/save';
import { FEATURES, xpToNext } from '../data/levels';
import { formatMoney, productById } from '../data/products';
import { summarizeReviews } from '../data/reviews';
import { dayEffects, describeDate, festivalStock, upcomingFestival } from '../data/calendar';
import { skillPoints } from '../data/titles';
import { COMBO_UNLOCK } from '../data/combos';
import { describeDay, describeRain, rainSpell, WEATHER } from '../data/weather';
import { pushCloudSave, takeCloudSave } from '../net/cloud';
import { leaveRoom } from '../net/coop';
import { logoutGoogle } from '../net/firebase';
import { useSession } from '../net/session';
import { describeItems, houseById, phoneOrderValue } from '../data/phoneOrders';
import { vendorById, wholesaleTotal } from '../data/wholesale';
import { STORIES, SURPRISES } from '../data/biz';
import { chooseSurprise, closeChapter, closeStory, dismissTutorial, REGULAR_NAMES } from '../core/biz';
import { chapterById } from '../data/chapters';
import { initAudio, isMuted, isMusic, setMuted, setMusic } from '../core/audio';
import { Panels } from './Panels';
import { answerAsk, useCounterAsk } from '../core/counterAsk';
import './hud.css';

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
      <span aria-hidden="true">{on ? '🎵' : '🎶︎'}</span>
    </button>
  );
}

export function Hud() {
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
  // Điểm danh quà / lượt vòng quay hôm nay còn trống thì nhắc trên nút
  const giftClaimable = useGame((s) => s.giftLastDay !== s.day);
  const wheelReady = useGame((s) => s.wheelLastDay !== s.day);
  const wheelBoost = useGame((s) => s.wheelBoost);
  // Vườn nhà: chưa tưới (và trời không mưa) hoặc luống chờ thu hoạch thì nhắc trên nút
  const gardenBadge = useGame((s) => {
    if (s.level < 8) return undefined;
    if (s.garden.plots.some(plotReady)) return '🧺 Thu được';
    const dry = s.weather !== 'rain' && s.weather !== 'storm' && s.garden.plots.some((p) => p.crop && p.wateredDay !== s.day);
    return dry ? '💧 Chưa tưới' : undefined;
  });
  const atHome = location === 'Nhà của bạn';
  type Tool = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; more?: boolean };
  const tools: Tool[] = [
    {
      icon: atHome ? '🛵' : '🏠', label: atHome ? 'Ra tiệm' : 'Về nhà',
      on: () => worldActions.travel(atHome ? 'shop' : 'home'),
    },
    {
      icon: '🗃️', label: 'Kho', badge: emptySlots ? `${emptySlots} trống` : undefined,
      on: () => openPanel({ type: 'storage' }),
    },
    { icon: '🗺️', label: 'Sơ đồ kệ', on: () => openPanel({ type: 'planogram' }) },
    { icon: '📦', label: 'Nhập hàng', on: () => openPanel({ type: 'order' }) },
    { icon: '☀️', label: 'Sổ đầu ngày', on: () => openPanel({ type: 'morning' }) },
    { icon: '📜', label: 'Nhiệm vụ', badge: questsReady ? `${questsReady} xong` : undefined, on: () => openPanel({ type: 'quests' }) },
    {
      icon: '🎁', label: 'Điểm danh',
      badge: giftClaimable ? 'Có quà' : wheelReady ? '⭕ Quay' : undefined,
      on: () => openPanel({ type: 'gifts' }),
    },
    { icon: '🗓️', label: 'Lịch sự kiện', more: true, on: () => openPanel({ type: 'calendar' }) },
    { icon: '🍳', label: 'Sổ nấu', more: true, lock: 21, on: () => openPanel({ type: 'cook' }) },
    { icon: '🛠️', label: 'Xây dựng', active: false, more: true, on: () => openPanel({ type: 'arrange' }) },
    { icon: '💲', label: 'Giá bán', lock: FEATURES.prices, on: () => openPanel({ type: 'prices' }) },
    { icon: '🎁', label: 'Combo', more: true, lock: COMBO_UNLOCK, on: () => openPanel({ type: 'combos' }) },
    { icon: '📋', label: 'Hợp đồng', lock: 14, more: true, on: () => openPanel({ type: 'contracts' }) },
    { icon: '📈', label: 'Kinh doanh', lock: 3, badge: [loanBadge, rivalBadge].filter(Boolean).join(' · ') || undefined, on: () => openPanel({ type: 'business' }) },
    { icon: '📊', label: 'Sổ theo dõi', more: true, on: () => openPanel({ type: 'history' }) },
    { icon: '🩺', label: 'Sức khoẻ món', more: true, on: () => openPanel({ type: 'analytics' }) },
    { icon: '🌱', label: 'Vườn nhà', more: true, lock: 8, badge: gardenBadge, on: () => openPanel({ type: 'garden' }) },
    { icon: '👕', label: 'Trang phục', lock: 2, more: true, on: () => openPanel({ type: 'costume' }) },
    { icon: '🏅', label: 'Danh hiệu', more: true, badge: skillsLeft > 0 ? `+${skillsLeft} kỹ năng` : undefined, on: () => openPanel({ type: 'skills' }) },
    { icon: '💛', label: 'Khách quen', more: true, on: () => openPanel({ type: 'regulars' }) },
    { icon: '👥', label: 'Nhân viên', more: true, lock: FEATURES.staff, on: () => openPanel({ type: 'staff' }) },
    { icon: '🏪', label: 'Tiện lợi 24/7', more: true, lock: CONVENIENCE.unlock, on: () => openPanel({ type: 'branch' }) },
    { icon: '📱', label: 'Mạng xã hội', more: true, lock: SOCIAL_UNLOCK, badge: socialBadge, on: () => openPanel({ type: 'social' }) },
    { icon: '📲', label: 'Bán online', more: true, lock: ONLINE_UNLOCK, badge: onlineBadge, on: () => openPanel({ type: 'online' }) },
    { icon: '📜', label: 'Giấy phép', more: true, lock: INSPECTION_UNLOCK, badge: licenseBadge, on: () => openPanel({ type: 'licenses' }) },
    {
      icon: '💬', label: 'Đánh giá', more: true, badge: rating.count ? `${rating.average.toFixed(1)}★` : undefined,
      on: () => openPanel({ type: 'reviews' }),
    },
  ];

  return (
    <>
      <Joystick />
      {/* Góc trái trên: ngày giờ, tiền, cấp */}
      <div className="hud-status">
        <div className="hud-chip hud-time" title={`${WEATHER[weather].tip}
${forecastText}`}>
          <span className="hud-weather" aria-hidden="true">{skyIcon}</span>
          <span>
            <b className={late ? 'hud-late' : undefined}>{formatClock(minutes)}</b>
            <small>Ngày {day} ({describeDate(day)}) · {spell ? describeRain(spell, weather) : WEATHER[weather].name}</small>
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
        <div className="hud-chip hud-money" title="Tiền hiện có">
          <span aria-hidden="true">💰</span>
          <b>{formatMoney(money)}</b>
        </div>
        <button className="hud-chip hud-level" title={`${xp}/${xpToNext(level)} XP · xem lộ trình cấp`} onClick={() => openPanel({ type: 'levels' })}>
          <span className="hud-level-num">{level}</span>
          <span>
            <small>Cấp · {Math.round(progress * 100)}%</small>
            <span className="hud-xp"><span style={{ width: `${progress * 100}%` }} /></span>
          </span>
        </button>
        <div className="hud-place">
          <span>📍 {location}</span>
          <span className={`hud-open ${shopOpen ? 'on' : ''}`}>{shopOpen ? 'Đang mở cửa' : 'Tiệm đóng'}</span>
        </div>
      </div>

      {/* Góc phải trên: âm thanh, nhạc nền, phòng chơi chung, tài khoản và menu */}
      <div className="hud-meta">
        <SoundToggle />
        <MusicToggle />
        {coop && (
          <div className="hud-chip hud-room" title={`Mã hẻm ${coop.alley}: gửi cho bạn bè để cùng vào (tối đa 4 người)`}>
            <span>👥</span>
            <span>
              <b>{coop.name} · {coop.alley}</b>
              <small>{coop.peers.length} online: {coop.peers.map((p) => (p.id === coop.selfId ? 'bạn' : p.name)).join(', ')}</small>
            </span>
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
              label: autoRoutine ? '⏰ Lịch tự động: Bật' : '⏰ Lịch tự động: Tắt',
              on: () => {
                useGame.setState({ autoRoutine: !autoRoutine });
                notify(autoRoutine ? 'Đã tắt lịch tự động' : '⏰ Bật lịch: 7h ra tiệm, 8h mở cửa, 22h30 đóng, 23h kiểm kê rồi về nhà');
              },
            },
            { label: '🏠 Màn hình chính', on: backToMenu },
            ...(!online ? [{ label: '🔄 Chơi lại từ đầu', danger: true, on: () => confirm('Xoá bản lưu và chơi lại từ đầu?') && resetGame() }] : []),
            ...(account ? [{ label: '↪ Đăng xuất', on: logout }] : []),
          ]}
        />
      </div>

      {/* Thông báo giữa trên */}
      <div className="hud-alerts">
        {late && !message && <div className="hud-alert danger">🌙 Đã khuya! Về nhà ngủ trước 2:00 sáng kẻo ngất.</div>}
        {wheelBoost > 1 && <div className="hud-alert info">🍀 Vòng quay may mắn: hôm nay khách ghé đông thêm {Math.round((wheelBoost - 1) * 100)}%</div>}
        {dirt >= 60 && <div className="hud-alert warn">🧹 Sàn tiệm bẩn ({Math.round(dirt)}%), khách ngại vào</div>}
        {waiting > 0 && !hint?.startsWith('💵') &&<div className="hud-alert warn">🛒 {waiting} khách đang chờ tính tiền ở quầy</div>}
        <PhoneAlerts />
        <VendorAlert />
        <CounterAskAlert />
        <FestivalBanner />
        <Tutorial />
        <SurpriseAlert />
        <StoryAlert />
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

      {message && <div className="hud-toast" role="status">{message}</div>}
      <ChapterDialogue />

      {/* Dưới cùng: gợi ý tương tác, rồi thanh công cụ */}
      <div className="hud-bottom">
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
            className={`hud-tool hud-shop${shopOpen ? ' open' : ''}`}
            aria-pressed={shopOpen}
            title={shopOpen ? 'Đóng cửa tiệm: khách mới không vào nữa' : 'Mở cửa tiệm đón khách'}
            onClick={toggleShop}
          >
            <span className="hud-tool-icon" aria-hidden="true">{shopOpen ? '🏪' : '🚪'}</span>
            <span>{shopOpen ? 'Đóng cửa' : 'Mở cửa'}</span>
          </button>
          {tools.filter((t) => !t.more).map((t) => <ToolButton key={t.label} tool={t} level={level} />)}
          <MoreMenu tools={tools.filter((t) => t.more)} level={level} />
        </nav>
      </div>
      <Panels />
    </>
  );
}

type ToolDef = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean };

function ToolButton({ tool: t, level, onPicked }: { tool: ToolDef; level: number; onPicked?: () => void }) {
  const locked = t.lock !== undefined && level < t.lock;
  return (
    <button
      className={`hud-tool${t.active ? ' active' : ''}`}
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
function MoreMenu({ tools, level }: { tools: ToolDef[]; level: number }) {
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
              {tools.map((t) => <ToolButton key={t.label} tool={t} level={level} onPicked={() => setOpen(false)} />)}
              {!TOUCH && <ToolButton tool={{ icon: '⌨️', label: 'Phím', on: () => setKeys(true) }} level={level} />}
            </>
          )}
        </div>
      )}
    </div>
  );
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
  items: { label: string; on: () => unknown; danger?: boolean }[];
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
            <button key={it.label} role="menuitem" className={it.danger ? 'danger' : undefined} onClick={() => { setOpen(false); it.on(); }}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sự kiện bất ngờ trong ngày: chọn một cách xử lý. */
function SurpriseAlert() {
  const active = useGame((s) => s.biz.surprise);
  const ev = active && SURPRISES.find((e) => e.id === active.id);
  if (!ev) return null;
  return (
    <div className="hud-alert phone">
      {ev.icon} <b>{ev.title}</b>: {ev.text}
      <span className="hud-alert-actions">
        {ev.choices.map((c, i) => <button key={i} className={`hud-btn${i === 0 ? ' primary' : ''}`} onClick={() => chooseSurprise(i)}>{c.label}</button>)}
      </span>
    </div>
  );
}

/** Hội thoại chương cốt truyện: hiện từng câu, bấm để qua câu kế; game tạm dừng trong lúc đọc. */
function ChapterDialogue() {
  const id = useGame((s) => s.biz.chapterPending);
  const [line, setLine] = useState(0);
  useEffect(() => setLine(0), [id]);
  const ch = id ? chapterById(id) : undefined;
  if (!ch) return null;
  const l = ch.lines[Math.min(line, ch.lines.length - 1)];
  const last = line >= ch.lines.length - 1;
  const reward = [ch.reward?.money && formatMoney(ch.reward.money), ch.reward?.xp && `${ch.reward.xp} XP`].filter(Boolean).join(', ');
  return (
    <div className="hud-dialogue" role="dialog" aria-label={ch.title}>
      <div className="hud-dialogue-title">📖 {ch.title}</div>
      <div className="hud-dialogue-line">
        <span className="hud-dialogue-avatar" aria-hidden="true">{l.icon}</span>
        <span>
          <b>{l.speaker}</b>
          <p>{l.text}</p>
        </span>
      </div>
      <div className="hud-dialogue-foot">
        <small>{line + 1}/{ch.lines.length}{last && reward ? ` · Thưởng: ${reward}` : ''}</small>
        <button className="hud-btn primary" onClick={() => (last ? closeChapter() : setLine(line + 1))}>
          {last ? '✔ Xong' : 'Tiếp ▶'}
        </button>
      </div>
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

/** Hướng dẫn ngày đầu: danh sách việc tự tích khi làm xong. */
function Tutorial() {
  const off = useGame((s) => s.biz.tutorialOff);
  const day = useGame((s) => s.day);
  const steps = useGame((s) => [
    { label: 'Nhập hàng (📦 Nhập hàng)', done: Object.values(s.storage).some((q) => q > 0) || s.deliveries.length > 0 || s.totals.itemsSold > 0 },
    { label: 'Bày hàng lên kệ (bấm vào kệ)', done: s.furniture.some((f) => f.tiers.some((t) => t.count > 0)) },
    { label: 'Mở cửa tiệm', done: s.shopOpen || s.totals.customers > 0 },
    { label: 'Đứng quầy tính tiền cho khách', done: s.totals.itemsSold > 0 },
    { label: 'Tối về nhà đi ngủ', done: s.day > 1 },
  ].map((x) => `${x.done ? 1 : 0}${x.label}`).join('|'));
  // Chỉ hướng dẫn ngày đầu: sang ngày 2 là tắt, tránh đè thông báo mỗi sáng
  if (off || day > 1) return null;
  const list = steps.split('|').map((x) => ({ done: x[0] === '1', label: x.slice(1) }));
  if (list.every((x) => x.done)) return null;
  return (
    <div className="hud-alert info hud-tutorial">
      <b>🧭 Ngày đầu mở tiệm</b>
      <ul>{list.map((x) => <li key={x.label} className={x.done ? 'done' : undefined}>{x.done ? '✅' : '⬜'} {x.label}</li>)}</ul>
      <button className="hud-btn" onClick={dismissTutorial}>Ẩn hướng dẫn</button>
    </div>
  );
}

/** Chương truyện mới của khách quen (mở theo độ thân). */
function StoryAlert() {
  const p = useGame((s) => s.biz.storyPending);
  const ch = p && STORIES[p.regular]?.[p.chapter];
  if (!p || !ch) return null;
  return (
    <div className="hud-alert info">
      📖 <b>{REGULAR_NAMES[p.regular]} · Chương {p.chapter + 1}: {ch.title}</b> — {ch.text}
      {ch.reward && <small> (+{[ch.reward.money && formatMoney(ch.reward.money), ch.reward.xp && `${ch.reward.xp} XP`].filter(Boolean).join(', ')})</small>}
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={closeStory}>💛 Đọc xong</button>
      </span>
    </div>
  );
}

/** Khách ở quầy xin ghi sổ / mặc cả / thiếu tiền lẻ: chọn nhanh, hết giờ thì tự chọn mặc định. */
function CounterAskAlert() {
  const ask = useCounterAsk((s) => s.ask);
  const minutes = useClock((c) => Math.floor(c.minutes));
  if (!ask) return null;
  return (
    <div className="hud-alert phone ringing">
      {ask.icon} <b>{ask.who}</b> {ask.text}
      <small> · còn {Math.max(0, Math.ceil(ask.expiresAt - minutes))} phút</small>
      <span className="hud-alert-actions">
        {ask.options.map((label, i) => (
          <button key={label} className={`hud-btn${i === 0 ? ' primary' : ''}`} onClick={() => answerAsk(i)}>{label}</button>
        ))}
      </span>
    </div>
  );
}

/** Người bán rong đang đứng ở quầy xin lấy sỉ từ kho. */
function VendorAlert() {
  const offer = useGame((s) => s.vendorOffer);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const storage = useGame((s) => s.storage);
  const priceOf = useGame((s) => s.priceOf);
  const accept = useGame((s) => s.acceptWholesale);
  const decline = useGame((s) => s.declineWholesale);
  if (!offer) return null;
  const v = vendorById(offer.vendorId);
  const short = Object.entries(offer.items).some(([id, q]) => (storage[id] ?? 0) < q);
  return (
    <div className="hud-alert phone">
      {v?.icon} <b>{v?.name}</b> xin lấy sỉ: {describeItems(offer.items)} · trả {formatMoney(wholesaleTotal(offer.items, priceOf))} (giá sỉ)
      <small> · chờ thêm {Math.max(0, Math.ceil(offer.expiresAt - minutes))} phút</small>
      <span className="hud-alert-actions">
        <button className="hud-btn primary" onClick={accept}>{short ? '⚠️ Kho thiếu' : '🤝 Bán sỉ từ kho'}</button>
        <button className="hud-btn" onClick={decline}>Không bán</button>
      </span>
    </div>
  );
}

/** Điện thoại tiệm: cuộc gọi đang đổ chuông (nghe máy để soạn hàng) và đơn đang mang đi giao. */
function PhoneAlerts() {
  const orders = useGame((s) => s.phoneOrders);
  const minutes = useClock((c) => Math.floor(c.minutes));
  const storage = useGame((s) => s.storage);
  const priceOf = useGame((s) => s.priceOf);
  const answer = useGame((s) => s.answerPhone);
  const decline = useGame((s) => s.declinePhone);
  const restock = useGame((s) => s.restockAndAnswerPhone);
  return (
    <>
      {orders.map((o) => {
        const house = houseById(o.houseId)?.name ?? '';
        if (o.status === 'ringing') {
          const shortCost = Object.entries(o.items).reduce((sum, [id, q]) => sum + Math.max(0, q - (storage[id] ?? 0)) * productById(id).buy, 0);
          const short = shortCost > 0;
          const cook = !!o.premium && !o.vip;
          const vip = !!o.vip;
          return (
            <div key={o.id} className="hud-alert phone ringing">
              {vip ? '👑' : cook ? '🍳' : '📞'} <b>{o.caller}</b> ({house}, {o.reason}): {describeItems(o.items)} · {formatMoney(phoneOrderValue(o, priceOf))}
              {vip && <b> (đơn VIP, giá hời ×{o.premium})</b>}
              {cook && <b> (đơn nấu, giá hời ×{o.premium})</b>}
              <small> · còn {Math.max(0, Math.ceil(o.answerBy - minutes))} phút để nghe máy</small>
              <span className="hud-alert-actions">
                {short ? (
                  cook ? (
                    <span className="hud-hint">Nấu ở trạm xong bấm nghe máy — món nhà làm không nhập được ở mối nào</span>
                  ) : (
                    <button className="hud-btn primary" onClick={() => restock(o.id)} title="Nhập ngay phần kho còn thiếu rồi soạn hàng đi giao">
                      🛒 Nhập bù {formatMoney(shortCost)} & soạn hàng
                    </button>
                  )
                ) : (
                  <button className="hud-btn primary" onClick={() => answer(o.id)} title="Soạn hàng từ kho rồi mang đi giao">
                    📦 Nghe máy, soạn hàng
                  </button>
                )}
                <button className="hud-btn" onClick={() => decline(o.id)}>Từ chối</button>
              </span>
            </div>
          );
        }
        const left = Math.ceil(o.dueAt - minutes);
        return (
          <div key={o.id} className={`hud-alert phone ${left < 0 ? 'warn' : ''}`}>
            🛵 Mang {describeItems(o.items)} tới <b>{house}</b> cho {o.caller} · {left >= 0 ? `hẹn ${formatClock(o.dueAt)} (còn ${left} phút)` : `trễ ${-left} phút, không còn boa`}
          </div>
        );
      })}
    </>
  );
}
