import { simRng } from '../rand';
import { formatMoney, productById } from '../../data/products';
import { HOMEGROWN_PREMIUM } from '../../data/garden';
import { dailyWage, GUARD_DETECT, maxStaff, ROLES, type Staff } from '../../data/staff';
import { BLACKOUT_LOSS, BONUS_RELIEF, COVER_WAGE_MUL, DRUNK_BLOCK, DRUNK_DAMAGE, EVENT_CHANCE, EVENT_ROLL_AT, FATIGUE_PER_DAY, FATIGUE_QUIT, FATIGUE_SLOW, HOT_FOOD_MUL, MANAGER_REFILL_BELOW, QUIT_CHANCE, TIRED_MISS, autoSchedule, fatigueOf, isHotFood, pickWeighted, restingOn, spoilsInBlackout, BRANCH_NIGHT_THEFT, BRANCH_ROLES, BRANCH_SHIFT_NAME, BRANCH_SHIFTS, CONVENIENCE, VENDING_CAP, VENDING_COST, VENDING_ITEMS, VENDING_OFFTAKE, VENDING_THEFT, branchTrafficAt, isBranchNight, newBranch, onShift, shelfTotal, vendingTotal, type BranchState,
  ALCOHOL_BRAWL_CHANCE, ALCOHOL_NIGHT_MUL, BRAWL_BLOCK, BRAWL_DAMAGE, GENERATOR_FUEL, GENERATOR_LOSS_MUL, NIGHT_DELIVERY_MISHAP, NIGHT_DELIVERY_PER_HOUR, NIGHT_DELIVERY_SURCHARGE, PATROL_AT, PATROL_CHANCE, POWER_UPGRADES,
  coverMul, hasAlcohol, hasPower, pickForGroup, pickNightGroup, powerUpgradeById, type PowerUpgradeId } from '../../data/branches';
import type { GameState, SetState, GetState } from '../gameTypes';
import { copyStock, takeStock } from '../stock';
import { CHIEF_QUIT_MUL, LEAD_FATIGUE_MUL, hasRank } from '../../data/careers';
import { gainExp } from '../../data/staffTraits';
import { LICENSE_FINE, isAlcohol, licenseById, licenseStatus } from '../../data/licenses';
import { APP_COMMISSION, appRating } from '../../data/online';

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
  const k = copyStock(s);  // Nhãn hàng nhà trồng/nuôi: bán ở chi nhánh cũng được giá hơn và rút dần như ở quầy chính
  const hg = { ...s.garden.homegrown };
  const spendHomegrown = (id: string, n: number) => {
    const left = (hg[id] ?? 0) - n;
    if (left > 0) hg[id] = left;
    else if (hg[id] !== undefined) delete hg[id];
  };
  const news: string[] = [];
  let fees = 0;
  let revenue = 0;
  // Đơn app giao đêm: cộng dồn rồi trả về một lần
  const onl = { ratingSum: 0, ratingCount: 0, done: 0, late: 0, pay: 0 };
  const STEP = 10;
  const manager = b.staff.some((st) => st.role === 'manager' && !restingOn(b, st.id, s.day));
  const absent = (st: Staff) => restingOn(b, st.id, s.day)
    || (b.event?.kind === 'calloff' && b.event.staffId === st.id && !b.event.covered);
  if (b.simAt > to || to - b.simAt > 48 * 60) b.simAt = to - STEP;
  while (b.simAt + STEP <= to) {
    b.simAt += STEP;
    const m = b.simAt;
    const on = b.staff.filter((st) => onShift(st, m) && !absent(st));

    // Máy bán hàng tự động ngoài cửa: bán kể cả khi quầy đóng / không ai trực.
    if (b.vendingEnabled && b.vendingStock) {
      // Người giao/xếp hàng/quản lý trực thì định kỳ chở hàng nạp máy (không cần mở cửa)
      const vStockman = on.some((st) => st.role === 'courier' || st.role === 'stocker' || st.role === 'manager');
      if (vStockman && m - b.lastTrip >= CONVENIENCE.tripEvery) {
        let vroom = VENDING_CAP - vendingTotal(b.vendingStock);
        for (const id of Object.keys(k.storage)) {
          if (vroom <= 0) break;
          if (!VENDING_ITEMS.has(id)) continue;
          const want = Math.min(vroom, k.storage[id] ?? 0);
          if (want <= 0) continue;
          const got = takeStock(k, id, want).reduce((n, l) => n + l.qty, 0);
          b.vendingStock[id] = (b.vendingStock[id] ?? 0) + got;
          vroom -= got;
        }
        if (vroom < VENDING_CAP) b.lastTrip = m; // thực sự nạp được hàng thì tính là một chuyến xe
      }
      // Bán hàng từ máy: một phần khách qua đường rút hàng mỗi 10 phút
      let vTotal = vendingTotal(b.vendingStock);
      if (vTotal > 0) {
        const vExpect = (branchTrafficAt(m) * STEP) / 60 * VENDING_OFFTAKE;
        let vn = Math.floor(vExpect) + (simRng()() < vExpect % 1 ? 1 : 0);
        for (; vn > 0 && vTotal > 0; vn--) {
          const pool: string[] = Object.keys(b.vendingStock).filter((id) => (b.vendingStock?.[id] ?? 0) > 0);
          if (!pool.length) break;
          const id = pool[Math.floor(simRng()() * pool.length)];
          b.vendingStock[id]--;
          const price = Math.round((s.priceOf(id, m) * CONVENIENCE.priceMul) / 500) * 500;
          revenue += price;
          b.vendingRevenueToday = (b.vendingRevenueToday ?? 0) + price;
          b.hourly![Math.floor((((m % 1440) + 1440) % 1440) / 60)] += price;
          vTotal--;
        }
        if (vTotal <= 0) news.push('🥤 Máy bán hàng tự động hết hàng — người giao hàng sẽ nạp lại khi có người trực.');
      }
      // Trộm vặt máy ban đêm (máy đặt ngoài cửa, bảo vệ không canh được)
      if (isBranchNight(m) && simRng()() < VENDING_THEFT) {
        const pool = Object.keys(b.vendingStock).filter((id) => (b.vendingStock?.[id] ?? 0) > 0);
        for (let i = 0; i < 2 && pool.length; i++) {
          const stolen = pool[Math.floor(simRng()() * pool.length)];
          b.vendingStock[stolen]--;
          b.lostToday++;
        }
      }
    }

    if (!b.open) continue;
    // Tối nay có chuyện gì không (tung một lần lúc 21h)
    if (m >= EVENT_ROLL_AT && b.eventDay !== s.day) {
      b.eventDay = s.day;
      b.event = null;
      const r = simRng()();
      const nightStaff = b.staff.filter((st) => st.shift === 'night' && !restingOn(b, st.id, s.day));
      if (r < EVENT_CHANCE.calloff && nightStaff.length) {
        const who = nightStaff.find((st) => st.role === 'cashier') ?? nightStaff[0];
        const cover = Math.round(dailyWage(who) * coverMul(b));
        b.event = { kind: 'calloff', at: 22 * 60, staffId: who.id, covered: manager };
        if (manager) {
          fees += cover;
          news.push(`📋 ${who.name} (ca đêm) xin nghỉ đột xuất — quản lý đã gọi người làm thay (${formatMoney(cover)})`);
        } else {
          news.push(`📵 ${who.name} (${ROLES[who.role].name} ca đêm) xin nghỉ đột xuất! Mở bảng Tiện lợi 24/7 để gọi người thay (${formatMoney(cover)}), hoặc tự sang đứng quầy`);
        }
      } else if (r < EVENT_CHANCE.calloff + EVENT_CHANCE.drunk) {
        b.event = { kind: 'drunk', at: 22 * 60 + Math.floor(simRng()() * 7 * 60) };
      } else if (r < EVENT_CHANCE.calloff + EVENT_CHANCE.drunk + EVENT_CHANCE.blackout) {
        b.event = { kind: 'blackout', at: 22 * 60 + Math.floor(simRng()() * 7 * 60) };
      }
    }
    // Công an tuần tra đêm: kệ có rượu bia mà thiếu giấy phép thì bị phạt và tịch thu
    if (m >= PATROL_AT && b.patrolDay !== s.day) {
      b.patrolDay = s.day;
      if (simRng()() < PATROL_CHANCE && hasAlcohol(b.shelf) && s.level >= licenseById('alcohol').unlock) {
        const lic = licenseStatus(s.licenses, 'alcohol', s.day);
        if (lic === 'none' || lic === 'expired') {
          let seized = 0;
          for (const id of Object.keys(b.shelf)) if (isAlcohol(id)) { seized += b.shelf[id]; delete b.shelf[id]; }
          b.lostToday += seized;
          fees += LICENSE_FINE;
          news.push(`👮 Công an tuần tra tiện lợi: bán rượu bia không giấy phép! Phạt ${formatMoney(LICENSE_FINE)}, tịch thu ${seized} món`);
        } else news.push('👮 Công an tuần tra đêm ghé tiện lợi, giấy phép bán rượu bia hợp lệ — êm xuôi');
      }
    }
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
        const gen = hasPower(b, 'generator');
        if (gen) fees += GENERATOR_FUEL;
        for (const id of Object.keys(b.shelf)) {
          if (!spoilsInBlackout(id)) continue;
          const n = Math.round(b.shelf[id] * BLACKOUT_LOSS * (gen ? GENERATOR_LOSS_MUL : 1));
          b.shelf[id] -= n;
          spendHomegrown(id, n);
          lost += n;
        }
        b.lostToday += lost;
        news.push(gen
          ? `💡 Mất điện ở tiện lợi nhưng máy phát đã chạy (dầu ${formatMoney(GENERATOR_FUEL)}): chỉ hỏng ${lost} món`
          : `💡 Mất điện ở tiện lợi giữa đêm: tủ mát tắt, ${lost} món hàng mát/đồ nóng bị hỏng`);
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
        if (productById(id).category === 'meat') continue; // thịt cá tươi cần quầy riêng, chi nhánh không có
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
    let n = Math.floor(expect) + (simRng()() < expect % 1 ? 1 : 0);
    const cashiers = on.filter((st) => st.role === 'cashier');
    // Chủ đang có mặt ở chi nhánh thì tự đứng quầy được (không mệt)
    const tired = !s.atBranch && cashiers.length > 0 && cashiers.every((st) => fatigueOf(b, st.id) >= FATIGUE_SLOW);
    const guardOn = on.some((st) => st.role === 'guard');
    let canSell = (cashiers.length > 0 || s.atBranch) && !(b.blockedUntil && m < b.blockedUntil);
    for (; n > 0; n--) {
      if (!canSell || !Object.values(b.shelf).some((q) => q > 0) || (tired && simRng()() < TIRED_MISS)) { b.missedToday++; continue; }
      b.customersToday++;
      // Giờ đêm: khách thuộc các nhóm riêng (tài xế, công nhân, sinh viên, bác sĩ, dân nhậu) mua theo sở thích
      const group = isBranchNight(m) || m % 1440 >= 21 * 60 ? pickNightGroup(m) : undefined;
      if (group) b.groupToday = { ...b.groupToday, [group.id]: (b.groupToday?.[group.id] ?? 0) + 1 };
      const [lo, hi] = group?.items ?? [1, 2];
      for (let items = lo + Math.floor(simRng()() * (hi - lo + 1)); items > 0; items--) {
        const pool = Object.keys(b.shelf).filter((id) => b.shelf[id] > 0);
        if (!pool.length) break;
        const id = pickForGroup(pool, m, group);
        b.shelf[id]--;
        // Hàng nhà trồng/nuôi bán ở chi nhánh được giá hơn như ở quầy chính
        const premium = (hg[id] ?? 0) > 0;
        if (premium) spendHomegrown(id, 1);
        const boozeNight = isBranchNight(m) && isAlcohol(id);
        const price = Math.round((s.priceOf(id, m) * CONVENIENCE.priceMul * (isHotFood(id) ? HOT_FOOD_MUL : 1) * (premium ? 1 + HOMEGROWN_PREMIUM : 1) * (boozeNight ? ALCOHOL_NIGHT_MUL : 1)) / 500) * 500;
        revenue += price;
        b.hourly![Math.floor((((m % 1440) + 1440) % 1440) / 60)] += price;
        if (boozeNight) {
          b.alcoholToday = (b.alcoholToday ?? 0) + 1;
          // Bán rượu bia đêm mà không có bảo vệ: khách say dễ gây gổ
          if (!guardOn && !s.atBranch && canSell && simRng()() < ALCOHOL_BRAWL_CHANCE) {
            fees += BRAWL_DAMAGE;
            b.blockedUntil = m + BRAWL_BLOCK;
            canSell = false;
            news.push(`🍺 Khách nhậu say gây gổ ở tiện lợi (không có bảo vệ): đền ${formatMoney(BRAWL_DAMAGE)}, quầy ngưng bán ${BRAWL_BLOCK} phút`);
          }
        }
      }
    }
    // Giao hàng đêm qua app: cần gian hàng app đang mở và người giao hàng trực; phụ phí đêm, app lấy hoa hồng
    if (b.nightDelivery && s.online.open && isBranchNight(m) && !(b.blockedUntil && m < b.blockedUntil)) {
      const couriers = on.filter((st) => st.role === 'courier' && fatigueOf(b, st.id) < FATIGUE_SLOW);
      const dExpect = (NIGHT_DELIVERY_PER_HOUR * STEP) / 60 * (appRating(s.online) / 5);
      for (let d = Math.floor(dExpect) + (simRng()() < dExpect % 1 ? 1 : 0); d > 0; d--) {
        const pool = Object.keys(b.shelf).filter((id) => b.shelf[id] > 0);
        if (!pool.length) break;
        if (!couriers.length) { onl.ratingSum += 3; onl.ratingCount++; b.missedToday++; continue; }
        let value = 0;
        const taken: string[] = [];
        for (let i = 1 + Math.floor(simRng()() * 3); i > 0; i--) {
          const left = pool.filter((id) => b.shelf[id] > 0);
          if (!left.length) break;
          const id = pickWeighted(left, m);
          b.shelf[id]--;
          spendHomegrown(id, 1);
          taken.push(id);
          value += Math.round((s.priceOf(id, m) * CONVENIENCE.priceMul * (1 + NIGHT_DELIVERY_SURCHARGE)) / 500) * 500;
        }
        if (!taken.length) break;
        if (simRng()() < NIGHT_DELIVERY_MISHAP) {
          // Shipper ngã xe/lạc đường ban đêm: mất đơn, không thu tiền
          onl.ratingSum += 2; onl.ratingCount++; onl.late++; b.lostToday += taken.length;
          news.push('🛵 Shipper giao đêm gặp sự cố giữa đường — mất một đơn app');
          continue;
        }
        const pay = Math.round(value * (1 - APP_COMMISSION));
        revenue += pay;
        onl.pay += pay;
        onl.ratingSum += 5; onl.ratingCount++; onl.done++;
        b.deliveryToday = (b.deliveryToday ?? 0) + 1;
        b.deliveryRevenueToday = (b.deliveryRevenueToday ?? 0) + pay;
        b.hourly![Math.floor((((m % 1440) + 1440) % 1440) / 60)] += pay;
      }
    }
    // Trộm đêm: có bảo vệ trực thì gần như bắt được hết
    if (isBranchNight(m) && simRng()() < BRANCH_NIGHT_THEFT) {
      const guard = on.some((st) => st.role === 'guard');
      if (!guard || simRng()() > GUARD_DETECT) {
        for (let i = 0; i < 3; i++) {
          const pool = Object.keys(b.shelf).filter((id) => b.shelf[id] > 0);
          if (!pool.length) break;
          const stolen = pool[Math.floor(simRng()() * pool.length)];
          b.shelf[stolen]--;
          spendHomegrown(stolen, 1);
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
    garden: { ...s.garden, homegrown: hg },
    money: s.money - fees + revenue,
    stats: { ...s.stats, revenue: s.stats.revenue + revenue, spent: s.stats.spent + fees, ...(onl.pay ? { online: (s.stats.online ?? 0) + onl.pay } : {}) },
    ...(onl.ratingCount
      ? { online: { ...s.online, ratingSum: s.online.ratingSum + onl.ratingSum, ratingCount: s.online.ratingCount + onl.ratingCount, done: s.online.done + onl.done, late: s.online.late + onl.late, revenueToday: s.online.revenueToday + onl.pay } }
      : {}),
  };
};

/** Sang ngày mới ở chi nhánh: cộng mệt, người quá mệt có thể nghỉ việc, quản lý xếp lại ca và cho người mệt nghỉ luân phiên. */
export const branchNewDay = (b: BranchState, day: number): { branch: BranchState; news: string[] } => {
  const news: string[] = [];
  const fatigue: Record<number, number> = { ...(b.fatigue ?? {}) };
  let staff = b.staff.filter((st) => {
    if (restingOn(b, st.id, day)) { fatigue[st.id] = 0; return true; }
    if (b.event?.kind === 'calloff' && b.event.staffId === st.id) return true;
    // Có trưởng quầy cùng ca đứng đầu thì mọi người làm đỡ mệt
    const led = st.rank !== 'lead' && b.staff.some((l) => l.rank === 'lead' && l.shift === st.shift && !restingOn(b, l.id, day));
    fatigue[st.id] = Math.min(100, Math.round((fatigue[st.id] ?? 0) + FATIGUE_PER_DAY[st.shift] * (led ? LEAD_FATIGUE_MUL : 1)));
    if (st.role !== 'manager' && fatigue[st.id] >= FATIGUE_QUIT && simRng()() < QUIT_CHANCE * (hasRank(b.staff, 'chief') ? CHIEF_QUIT_MUL : 1)) {
      news.push(`😩 ${st.name} (${ROLES[st.role].name}) kiệt sức vì làm liên tục, đã xin nghỉ việc ở tiện lợi`);
      delete fatigue[st.id];
      return false;
    }
    return true;
  });
  // Làm việc đều thì thêm ngày công và kinh nghiệm (đủ thì lên sao, đủ điều kiện sẽ được cất nhắc)
  staff = staff.map((st) => {
    if (restingOn(b, st.id, day) || (b.event?.kind === 'calloff' && b.event.staffId === st.id)) return st;
    const { staff: next, leveled } = gainExp({ ...st, daysWorked: (st.daysWorked ?? 0) + 1 }, 1);
    if (leveled) news.push(`⭐ ${next.name} (tiện lợi) lên tay nghề ${next.skill}★ — lương mới ${Math.round(next.wage / 1000)}k/ca`);
    return next;
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
  return { branch: { ...b, staff, fatigue, restDay, event: null, blockedUntil: undefined, hourly: Array(24).fill(0), vendingRevenueToday: 0, groupToday: {}, alcoholToday: 0, deliveryToday: 0, deliveryRevenueToday: 0 }, news };
};

export const createBranchSlice = (set: SetState, get: GetState): Pick<GameState, 'openBranch' | 'toggleBranch' | 'hireForBranch' | 'fireFromBranch' | 'coverCalloff' | 'bonusBranchStaff' | 'restBranchStaff' | 'setBranchShift' | 'toggleVending' | 'toggleNightDelivery' | 'buyBranchPower'> => ({
  openBranch: () => {
    const s = get();
    if (s.branch) return false;
    if (s.level < CONVENIENCE.unlock) { s.notify(`Cửa hàng tiện lợi mở ở cấp ${CONVENIENCE.unlock}`); return false; }
    if (s.money < CONVENIENCE.openCost) { s.notify('Không đủ tiền mua mặt bằng! Có thể vay ngân hàng.'); return false; }
    set({
      money: s.money - CONVENIENCE.openCost,
      branch: { ...newBranch(), simAt: s.minutes },
      stats: { ...s.stats, spent: s.stats.spent + CONVENIENCE.openCost },
      totals: { ...s.totals, spent: s.totals.spent + CONVENIENCE.openCost },
    });
    s.notify('🏪 Đã mua đứt mặt bằng cửa hàng tiện lợi ở con đường bên kia! Thuê thu ngân, giao hàng, bảo vệ rồi mở cửa.');
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
    const cost = who ? Math.round(dailyWage(who) * coverMul(b)) : 0;
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
  toggleVending: () => {
    const s = get();
    const b = s.branch;
    if (!b) return;
    if (b.vendingEnabled) {
      set({ branch: { ...b, vendingEnabled: false } });
      s.notify('Máy bán hàng tự động đã tắt.');
      return;
    }
    if (s.money < VENDING_COST) return s.notify(`Không đủ tiền lắp máy bán hàng tự động (${formatMoney(VENDING_COST)})!`);
    set({
      money: s.money - VENDING_COST,
      branch: { ...b, vendingEnabled: true, vendingStock: b.vendingStock ?? {} },
      stats: { ...s.stats, spent: s.stats.spent + VENDING_COST },
      totals: { ...s.totals, spent: s.totals.spent + VENDING_COST },
    });
    s.notify('🥤 Đã lắp máy bán hàng tự động ngoài cửa — bán kể cả khi đóng cửa; cần người giao/xếp hàng nạp hàng định kỳ.');
  },
  toggleNightDelivery: () => {
    const s = get();
    const b = s.branch;
    if (!b) return;
    if (b.nightDelivery) { set({ branch: { ...b, nightDelivery: false } }); return s.notify('Đã ngưng nhận đơn app ban đêm.'); }
    if (!s.online.open) return s.notify('Cần mở gian hàng trên app (Bán online) trước khi nhận đơn đêm!');
    set({ branch: { ...b, nightDelivery: true } });
    s.notify(`🌙 Chi nhánh nhận đơn app ban đêm: phụ phí +${Math.round(NIGHT_DELIVERY_SURCHARGE * 100)}%, cần người giao hàng ca đêm.`);
  },
  buyBranchPower: (id: PowerUpgradeId) => {
    const s = get();
    const b = s.branch;
    if (!b || hasPower(b, id) || !POWER_UPGRADES.some((u) => u.id === id)) return;
    const def = powerUpgradeById(id);
    if (s.money < def.price) return s.notify(`Không đủ tiền mua ${def.name} (${formatMoney(def.price)})!`);
    set({
      money: s.money - def.price,
      branch: { ...b, power: [...(b.power ?? []), id] },
      stats: { ...s.stats, spent: s.stats.spent + def.price },
      totals: { ...s.totals, spent: s.totals.spent + def.price },
    });
    s.notify(`${def.icon} Đã lắp ${def.name} cho tiện lợi.`);
  },
});
