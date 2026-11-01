import { useClock, useGame } from '../core/store';
import { idleTip, isSlowHour } from '../data/idle';
import { todayAgenda, type AgendaPanel } from '../data/todayAgenda';
import { reputationOf } from '../data/reputation';
import { cookSpeed, bartenderBoost } from '../core/slices/orders';
import { worldActions } from '../core/actions';
import { tutorialActive } from './tutorialSteps';

/** GĐ459: dải hẹn hôm nay + chip giờ vắng tách lazy khỏi Hud. */
/** Chip gợi ý giờ vắng khách: việc đáng làm nhất lúc này, bấm là mở đúng bảng (hay lau nhà luôn). */
export function IdleChip() {
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
export function TodayAgendaStrip() {
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

