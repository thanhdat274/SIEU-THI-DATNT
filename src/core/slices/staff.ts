import { maxStaff, ROLES } from '../../data/staff';
import { gainExp, TRAIN_EXP, trainCost } from '../../data/staffTraits';
import { formatMoney } from '../../data/products';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Nhân viên tiệm chính: thuê, cho nghỉ, đổi ca, đào tạo. */

export const createStaffSlice = (set: SetState, get: GetState): Pick<GameState, 'hire' | 'fire' | 'setShift' | 'trainStaff'> => ({
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
  setShift: (id, shift) => set({ staff: get().staff.map((it) => (it.id === id ? { ...it, shift } : it)) }),
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
});
