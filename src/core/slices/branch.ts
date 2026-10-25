import { formatMoney } from '../../data/products';
import { dailyWage, GUARD_DETECT, maxStaff, ROLES, type Staff } from '../../data/staff';
import { BLACKOUT_LOSS, BONUS_RELIEF, COVER_WAGE_MUL, DRUNK_BLOCK, DRUNK_DAMAGE, EVENT_CHANCE, EVENT_ROLL_AT, FATIGUE_PER_DAY, FATIGUE_QUIT, FATIGUE_SLOW, HOT_FOOD_MUL, MANAGER_REFILL_BELOW, QUIT_CHANCE, TIRED_MISS, autoSchedule, fatigueOf, isHotFood, pickWeighted, restingOn, spoilsInBlackout, BRANCH_NIGHT_THEFT, BRANCH_ROLES, BRANCH_SHIFT_NAME, BRANCH_SHIFTS, CONVENIENCE, branchTrafficAt, isBranchNight, newBranch, onShift, shelfTotal, type BranchState } from '../../data/branches';
import type { GameState, SetState, GetState } from '../gameTypes';
import { copyStock, takeStock } from '../stock';

/** Cửa hàng tiện lợi 24/7: mô phỏng ngầm theo bước 10 phút, sang ngày, thuê/xếp ca/thưởng nhân viên chi nhánh. */

/**
 * Mô phỏng cửa hàng tiện lợi từ mốc đã chạy tới phút `to` (bước 10 phút): khách mua, xe chở hàng từ kho chung,
 * trộm và sự kiện đêm. Chủ không đứng bán nên tính ngầm; đi tới tận nơi thì cảnh 3D chỉ diễn lại cho đẹp.
 */
export const runBranch = (get: GetState, to: number): Partial<GameState> => {
  const s = get();
  const b0 = s.branch;
  if (!b0) return {};
  const b: BranchState = { ...b0, shelf: { ...b0.shelf }, hourly: [...(b0.hourly ?? Array(24).fill(0))] };
  const k = copyStock(s);
  const news: string[] = [];
  let fees = 0;
  let revenue = 0;
  const STEP = 10;
  const manager = b.staff.some((st) => st.role === 'manager' && !restingOn(b, st.id, s.day));
  const absent = (st: Staff) => restingOn(b, st.id, s.day)
    || (b.event?.kind === 'calloff' && b.event.staffId === st.id && !b.event.covered);
  if (b.simAt > to || to - b.simAt > 48 * 60) b.simAt = to - STEP;
  while (b.simAt + STEP <= to) {
    b.simAt += STEP;
    const m = b.simAt;
    if (!b.open) continue;
    // Tối nay có chuyện gì không (tung một lần lúc 21h)
    if (m >= EVENT_ROLL_AT && b.eventDay !== s.day) {
      b.eventDay = s.day;
      b.event = null;
      const r = Math.random();
      const nightStaff = b.staff.filter((st) => st.shift === 'night' && !restingOn(b, st.id, s.day));
      if (r < EVENT_CHANCE.calloff && nightStaff.length) {
        const who = nightStaff.find((st) => st.role === 'cashier') ?? nightStaff[0];
        const cover = Math.round(dailyWage(who) * COVER_WAGE_MUL);
        b.event = { kind: 'calloff', at: 22 * 60, staffId: who.id, covered: manager };
        if (manager) {
          fees += cover;
          news.push(`📋 ${who.name} (ca đêm) xin nghỉ đột xuất — quản lý đã gọi người làm thay (${formatMoney(cover)})`);
        } else {
          news.push(`📵 ${who.name} (${ROLES[who.role].name} ca đêm) xin nghỉ đột xuất! Mở bảng Tiện lợi 24/7 để gọi người thay (${formatMoney(cover)}), hoặc tự sang đứng quầy`);
        }
      } else if (r < EVENT_CHANCE.calloff + EVENT_CHANCE.drunk) {
        b.event = { kind: 'drunk', at: 22 * 60 + Math.floor(Math.random() * 7 * 60) };
      } else if (r < EVENT_CHANCE.calloff + EVENT_CHANCE.drunk + EVENT_CHANCE.blackout) {
        b.event = { kind: 'blackout', at: 22 * 60 + Math.floor(Math.random() * 7 * 60) };
      }
    }
    const on = b.staff.filter((st) => onShift(st, m) && !absent(st));
    const ev = b.event;
    if (ev && !ev.done && ev.kind !== 'calloff' && m >= ev.at) {
      ev.done = true;
      if (ev.kind === 'drunk') {
        if (on.some((st) => st.role === 'guard') || s.atBranch) news.push('🍺 Có khách say vào quậy ở tiện lợi — bảo vệ đã mời ra, không thiệt hại gì');
        else {
          fees += DRUNK_DAMAGE;
          b.blockedUntil = m + DRUNK_BLOCK;
          news.push(`🍺 Khách say quậy ở tiện lợi, không có bảo vệ: vỡ đồ mất ${formatMoney(DRUNK_DAMAGE)}, quầy ngưng bán 1 tiếng`);
        }
      } else {
        let lost = 0;
        for (const id of Object.keys(b.shelf)) {
          if (!spoilsInBlackout(id)) continue;
          const n = Math.round(b.shelf[id] * BLACKOUT_LOSS);
          b.shelf[id] -= n;
          lost += n;
        }
        b.lostToday += lost;
        news.push(`💡 Mất điện ở tiện lợi giữa đêm: tủ mát tắt, ${lost} món hàng mát/đồ nóng bị hỏng`);
      }
    }
    // Xe chở hàng: người giao/xếp hàng trực thì định kỳ chở; có quản lý thì kệ vơi là tự gọi xe
    const total = shelfTotal(b.shelf);
    const mover = on.some((st) => st.role === 'courier' || st.role === 'stocker') && m - b.lastTrip >= CONVENIENCE.tripEvery;
    const managerCall = manager && total < CONVENIENCE.shelfCap * MANAGER_REFILL_BELOW && m - b.lastTrip >= 30;
    if (mover || managerCall) {
      let room = CONVENIENCE.shelfCap - total;
      let moved = 0;
      for (const id of Object.keys(k.storage)) {
        if (room <= 0) break;
        const want = Math.min(room, CONVENIENCE.perItem - (b.shelf[id] ?? 0), k.storage[id] ?? 0);
        if (want <= 0) continue;
        const got = takeStock(k, id, want).reduce((n, l) => n + l.qty, 0);
        b.shelf[id] = (b.shelf[id] ?? 0) + got;
        room -= got;
        moved += got;
      }
      if (moved) { fees += CONVENIENCE.tripFee; b.lastTrip = m; }
    }
    // Khách ghé trong 10 phút; không ai đứng quầy, quầy đang ngưng hoặc hết hàng thì khách bỏ về
    const expect = (branchTrafficAt(m) * STEP) / 60;
    let n = Math.floor(expect) + (Math.random() < expect % 1 ? 1 : 0);
    const cashiers = on.filter((st) => st.role === 'cashier');
    // Chủ đang có mặt ở chi nhánh thì tự đứng quầy được (không mệt)
    const tired = !s.atBranch && cashiers.length > 0 && cashiers.every((st) => fatigueOf(b, st.id) >= FATIGUE_SLOW);
    const canSell = (cashiers.length > 0 || s.atBranch) && !(b.blockedUntil && m < b.blockedUntil);
    for (; n > 0; n--) {
      if (!canSell || !Object.values(b.shelf).some((q) => q > 0) || (tired && Math.random() < TIRED_MISS)) { b.missedToday++; continue; }
      b.customersToday++;
      for (let items = 1 + Math.floor(Math.random() * 2); items > 0; items--) {
        const pool = Object.keys(b.shelf).filter((id) => b.shelf[id] > 0);
        if (!pool.length) break;
        const id = pickWeighted(pool, m);
        b.shelf[id]--;
        const price = Math.round((s.priceOf(id) * CONVENIENCE.priceMul * (isHotFood(id) ? HOT_FOOD_MUL : 1)) / 500) * 500;
        revenue += price;
        b.hourly![Math.floor((((m % 1440) + 1440) % 1440) / 60)] += price;
      }
    }
    // Trộm đêm: có bảo vệ trực thì gần như bắt được hết
    if (isBranchNight(m) && Math.random() < BRANCH_NIGHT_THEFT) {
      const guard = on.some((st) => st.role === 'guard');
      if (!guard || Math.random() > GUARD_DETECT) {
        for (let i = 0; i < 3; i++) {
          const pool = Object.keys(b.shelf).filter((id) => b.shelf[id] > 0);
          if (!pool.length) break;
          b.shelf[pool[Math.floor(Math.random() * pool.length)]]--;
          b.lostToday++;
        }
      }
    }
  }
  for (const id of Object.keys(b.shelf)) if (b.shelf[id] <= 0) delete b.shelf[id];
  b.revenueToday += revenue;
  for (const line of news) s.notify(line);
  return {
    branch: b, ...k,
    money: s.money - fees + revenue,
    stats: { ...s.stats, revenue: s.stats.revenue + revenue, spent: s.stats.spent + fees },
  };
};

/** Sang ngày mới ở chi nhánh: cộng mệt, người quá mệt có thể nghỉ việc, quản lý xếp lại ca và cho người mệt nghỉ luân phiên. */
export const branchNewDay = (b: BranchState, day: number): { branch: BranchState; news: string[] } => {
  const news: string[] = [];
  const fatigue: Record<number, number> = { ...(b.fatigue ?? {}) };
  let staff = b.staff.filter((st) => {
    if (restingOn(b, st.id, day)) { fatigue[st.id] = 0; return true; }
    if (b.event?.kind === 'calloff' && b.event.staffId === st.id) return true;
    fatigue[st.id] = Math.min(100, (fatigue[st.id] ?? 0) + FATIGUE_PER_DAY[st.shift]);
    if (st.role !== 'manager' && fatigue[st.id] >= FATIGUE_QUIT && Math.random() < QUIT_CHANCE) {
      news.push(`😩 ${st.name} (${ROLES[st.role].name}) kiệt sức vì làm liên tục, đã xin nghỉ việc ở tiện lợi`);
      delete fatigue[st.id];
      return false;
    }
    return true;
  });
  const restDay: Record<number, number> = {};
  for (const [id, d] of Object.entries(b.restDay ?? {})) if (d > day) restDay[+id] = d;
  if (staff.some((st) => st.role === 'manager')) {
    // Mỗi vai trò cho người mệt nhất nghỉ một ngày nếu còn người khác cùng vai trò trực thay
    for (const role of ['cashier', 'guard', 'stocker', 'courier'] as const) {
      const same = staff.filter((st) => st.role === role);
      const worst = same.filter((st) => (fatigue[st.id] ?? 0) >= FATIGUE_SLOW).sort((x, y) => (fatigue[y.id] ?? 0) - (fatigue[x.id] ?? 0))[0];
      if (worst && same.length > 1) {
        restDay[worst.id] = day + 1;
        news.push(`📋 Quản lý cho ${worst.name} nghỉ ngày mai để lấy sức`);
      }
    }
    staff = autoSchedule(staff.filter((st) => restDay[st.id] !== day + 1), fatigue)
      .concat(staff.filter((st) => restDay[st.id] === day + 1));
  }
  return { branch: { ...b, staff, fatigue, restDay, event: null, blockedUntil: undefined, hourly: Array(24).fill(0) }, news };
};

export const createBranchSlice = (set: SetState, get: GetState): Pick<GameState, 'openBranch' | 'toggleBranch' | 'hireForBranch' | 'fireFromBranch' | 'coverCalloff' | 'bonusBranchStaff' | 'restBranchStaff' | 'setBranchShift'> => ({
  openBranch: () => {
    const s = get();
    if (s.branch) return false;
    if (s.level < CONVENIENCE.unlock) { s.notify(`Cửa hàng tiện lợi mở ở cấp ${CONVENIENCE.unlock}`); return false; }
    if (s.money < CONVENIENCE.openCost) { s.notify('Không đủ tiền cọc mặt bằng! Có thể vay ngân hàng.'); return false; }
    set({
      money: s.money - CONVENIENCE.openCost,
      branch: { ...newBranch(), simAt: s.minutes },
      stats: { ...s.stats, spent: s.stats.spent + CONVENIENCE.openCost },
      totals: { ...s.totals, spent: s.totals.spent + CONVENIENCE.openCost },
    });
    s.notify('🏪 Đã thuê mặt bằng cửa hàng tiện lợi ở con đường bên kia! Thuê thu ngân, giao hàng, bảo vệ rồi mở cửa.');
    return true;
  },
  toggleBranch: () => {
    const s = get();
    if (!s.branch) return;
    if (!s.branch.open && !s.branch.staff.some((st) => st.role === 'cashier')) return s.notify('Chủ không đứng bán ở chi nhánh: thuê ít nhất 1 thu ngân trước!');
    set({ branch: { ...s.branch, open: !s.branch.open, simAt: s.minutes } });
  },
  hireForBranch: (id, shift) => {
    const s = get();
    const c = s.candidates.find((it) => it.id === id);
    if (!c || !s.branch) return;
    if (s.branch.staff.length >= CONVENIENCE.maxStaff) return s.notify('Chi nhánh đã đủ người');
    if (!BRANCH_ROLES.includes(c.role)) return s.notify('Chi nhánh chỉ cần thu ngân, xếp hàng, giao hàng, bảo vệ');
    if (!BRANCH_SHIFTS.includes(shift)) return;
    set({ branch: { ...s.branch, staff: [...s.branch.staff, { ...c, shift }] }, candidates: s.candidates.filter((it) => it.id !== id) });
    s.notify(`🤝 ${c.name} làm ${BRANCH_SHIFT_NAME[shift]} ở cửa hàng tiện lợi.`);
  },
  fireFromBranch: (id) => {
    const b = get().branch;
    if (b) set({ branch: { ...b, staff: b.staff.filter((it) => it.id !== id) } });
  },
  coverCalloff: () => {
    const s = get();
    const b = s.branch;
    const ev = b?.event;
    if (!b || ev?.kind !== 'calloff' || ev.covered) return;
    const who = b.staff.find((st) => st.id === ev.staffId);
    const cost = who ? Math.round(dailyWage(who) * COVER_WAGE_MUL) : 0;
    if (s.money < cost) return s.notify('Không đủ tiền gọi người làm thay!');
    set({ money: s.money - cost, branch: { ...b, event: { ...ev, covered: true } }, stats: { ...s.stats, spent: s.stats.spent + cost } });
    s.notify(`📞 Đã gọi người làm thay ca đêm (${formatMoney(cost)})`);
  },
  bonusBranchStaff: (id) => {
    const s = get();
    const b = s.branch;
    const st = b?.staff.find((it) => it.id === id);
    if (!b || !st) return;
    const cost = dailyWage(st);
    if (s.money < cost) return s.notify('Không đủ tiền thưởng!');
    set({
      money: s.money - cost,
      branch: { ...b, fatigue: { ...b.fatigue, [id]: Math.max(0, fatigueOf(b, id) - BONUS_RELIEF) } },
      stats: { ...s.stats, spent: s.stats.spent + cost },
    });
    s.notify(`🎁 Thưởng ${st.name} ${formatMoney(cost)} — đỡ mệt hẳn!`);
  },
  restBranchStaff: (id) => {
    const b = get().branch;
    const st = b?.staff.find((it) => it.id === id);
    if (!b || !st) return;
    set({ branch: { ...b, restDay: { ...b.restDay, [id]: get().day + 1 } } });
    get().notify(`🛌 ${st.name} nghỉ ngày mai (không lương), quay lại sẽ khỏe như mới`);
  },
  setBranchShift: (id, shift) => {
    const b = get().branch;
    if (b) set({ branch: { ...b, staff: b.staff.map((it) => (it.id === id ? { ...it, shift } : it)) } });
  },
});
