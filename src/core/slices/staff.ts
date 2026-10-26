import { maxStaff, ROLES, type Staff } from '../../data/staff';
import { nextPromotion, promoted } from '../../data/careers';
import { gainExp, TRAIN_EXP, trainCost } from '../../data/staffTraits';
import { formatMoney } from '../../data/products';
import { hasUpgrade } from '../../data/upgrades';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Nhân viên tiệm chính: thuê, cho nghỉ, đổi ca, đào tạo. */

export const createStaffSlice = (set: SetState, get: GetState): Pick<GameState, 'hire' | 'fire' | 'setShift' | 'trainStaff' | 'promoteStaff' | 'promoteBranchStaff'> => {
  /** Kiểm tra điều kiện, trừ tiền thưởng; trả về người sau khi thăng chức hoặc null. */
  const tryPromote = (st: Staff): Staff | null => {
    const s = get();
    const chk = nextPromotion(st, s.level);
    if (!chk) { s.notify(`${st.name} đã ở bậc cao nhất`); return null; }
    if (!chk.ok) { s.notify(`${st.name} chưa đủ điều kiện lên ${chk.def.name}: cần ${chk.missing.join(', ')}`); return null; }
    if (s.money < chk.def.cost) { s.notify(`Không đủ tiền thưởng thăng chức (${formatMoney(chk.def.cost)})!`); return null; }
    const next = promoted(st, chk.to);
    set({
      money: s.money - chk.def.cost,
      stats: { ...s.stats, spent: s.stats.spent + chk.def.cost },
      totals: { ...s.totals, spent: s.totals.spent + chk.def.cost },
    });
    s.notify(`${chk.def.icon} ${st.name} được thăng ${chk.def.name}! Thưởng ${formatMoney(chk.def.cost)}, lương mới ${formatMoney(next.wage)}/ca`);
    return next;
  };
  return {
  hire: (id) => {
    const s = get();
    const c = s.candidates.find((it) => it.id === id);
    if (!c) return;
    if (s.staff.length >= maxStaff(s.level)) return s.notify('Đã đủ số nhân viên tối đa ở cấp này');
    if (ROLES[c.role].unlock > s.level) return s.notify(`Vai trò ${ROLES[c.role].name} mở ở cấp ${ROLES[c.role].unlock}`);
    set({ staff: [...s.staff, c], candidates: s.candidates.filter((it) => it.id !== id) });
    s.notify(`🤝 Đã thuê ${c.name}. Lương trả cuối mỗi ngày.`);
    if (c.role === 'courier' && !s.staff.some((w) => w.role === 'courier')) {
      s.notify('🛵 Đã mở chế độ giao tận nhà: hàng xóm sẽ gọi điện đặt hàng!');
    }
  },
  fire: (id) => set({ staff: get().staff.filter((it) => it.id !== id) }),
  setShift: (id, shift) => {
    const s = get();
    // Ca đêm ở tiệm chính chỉ có ích khi mua nâng cấp "Mở ca đêm" (tiệm mới bán thâu đêm);
    // trước đó cửa hàng đóng 22h30 nên ca đêm chỉ tốn lương ×1.5 vô ích
    if (shift === 'night' && !hasUpgrade(s.biz, 'night')) {
      return s.notify('🌙 Ca đêm mở khi mua nâng cấp "Mở ca đêm" (cấp 55) — giờ tiệm đóng lúc 22h30');
    }
    set({ staff: s.staff.map((it) => (it.id === id ? { ...it, shift } : it)) });
  },
  trainStaff: (id) => {
    const s = get();
    const st = s.staff.find((it) => it.id === id);
    if (!st) return;
    if (st.skill >= 5) return s.notify(`${st.name} đã giỏi nhất rồi (5★)`);
    if (st.trainedDay === s.day) return s.notify(`Hôm nay ${st.name} đã học một buổi, mai học tiếp nhé`);
    const cost = trainCost(st.skill);
    if (s.money < cost) return s.notify('Không đủ tiền mở lớp đào tạo!');
    const { staff: next, leveled } = gainExp({ ...st, trainedDay: s.day }, TRAIN_EXP);
    set({
      staff: s.staff.map((it) => (it.id === id ? next : it)),
      money: s.money - cost,
      stats: { ...s.stats, spent: s.stats.spent + cost },
      totals: { ...s.totals, spent: s.totals.spent + cost },
    });
    s.notify(leveled
      ? `🎓 ${st.name} học xong lên ${next.skill}★! Lương mới ${formatMoney(next.wage)}/ca`
      : `🎓 Đã cho ${st.name} học thêm (${formatMoney(cost)})`);
  },
  promoteStaff: (id) => {
    const st = get().staff.find((it) => it.id === id);
    const next = st && tryPromote(st);
    if (next) set({ staff: get().staff.map((it) => (it.id === id ? next : it)) });
  },
  promoteBranchStaff: (id) => {
    const b = get().branch;
    const st = b?.staff.find((it) => it.id === id);
    const next = st && tryPromote(st);
    const cur = get().branch;
    if (next && cur) set({ branch: { ...cur, staff: cur.staff.map((it) => (it.id === id ? next : it)) } });
  },
  };
};
