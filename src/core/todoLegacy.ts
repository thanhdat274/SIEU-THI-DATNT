// Sổ việc chung (SPEC-TOI-UU §T6, lát L1): hai nguồn đầu tiên BỌC NGUYÊN TRẠNG hai cơ chế cũ —
// dải "Kế hoạch hôm nay" (data/todayAgenda.ts) và chip giờ vắng (data/idle.ts). Nằm ở core/ (không
// phải data/) vì cần `cookSpeed`/`bartenderBoost` của slice orders để phút trạm là phút thật.
// Hệ MỚI không thêm vào đây: đăng ký nguồn trong file data của chính hệ đó (`registerTodo`).
import { idleTip } from '../data/idle';
import { reputationOf } from '../data/reputation';
import { todayAgenda } from '../data/todayAgenda';
import { registerTodo, urgencyAt } from '../data/todo';
import { bartenderBoost, cookSpeed } from './slices/orders';

registerTodo('agenda', (s, minutes) =>
  todayAgenda({
    minutes,
    day: s.day,
    seed: s.weatherSeed,
    level: s.level,
    regulars: s.regulars,
    rep: reputationOf(s.repLog),
    reservations: s.reservations,
    regularArcs: s.biz.regularArcs,
    surpriseArc: s.biz.surpriseArc,
    cookJobs: s.cookJobs,
    stations: s.furniture.map((f) => f.type),
    storage: s.storage,
    cookSpeedMul: cookSpeed(() => s),
    bartenderBoost: bartenderBoost(() => s),
    hasCourier: s.staff.some((w) => w.role === 'courier'),
    contracts: s.contracts,
    order: s.order,
  }).map((it) => ({
    id: it.key,
    icon: it.icon,
    text: it.label,
    urgency: urgencyAt(minutes, it.atMinutes),
    at: it.atMinutes,
    until: it.untilMinutes,
    go: { panel: it.panel },
  })));

registerTodo('idle', (s) => {
  const tip = idleTip(s);
  if (!tip) return [];
  return [{
    id: 'idle-tip',
    icon: tip.icon,
    text: tip.text,
    urgency: 'idle' as const,
    go: tip.act === 'mop' ? { act: 'mop' as const } : tip.act ? { panel: tip.act } : undefined,
  }];
});
