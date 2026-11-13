import { formatMoney } from '../../data/products';
import {
  DICE_CAP, DICE_STAKES, FORTUNE_DONATE, SHARK_DAYS, SHARK_RATE, STROLL_UNLOCK, TICKET_CAP, TICKET_PRICE,
  diceWin, fortuneOf, sharkOffer, sharkOwedNow, strollToday, ticketPrize,
} from '../../data/stroll';
import { playSfx } from '../audio';
import type { GameState, SetState, GetState } from '../gameTypes';

/** Dạo phố: vé số, chùa, tài xỉu, vay nóng. Mỗi điểm có trần mỗi ngày; sim không gọi các thao tác này. */
export const createStrollSlice = (set: SetState, get: GetState): Pick<GameState, 'strollTicket' | 'strollIncense' | 'strollFortune' | 'strollDice' | 'strollBorrow' | 'strollRepay'> => {
  const today = () => { const s = get(); return { s, st: strollToday(s.stroll, s.day) }; };
  const locked = () => {
    const s = get();
    if (s.level >= STROLL_UNLOCK) return false;
    s.notify(`🚶 Cần cấp ${STROLL_UNLOCK} để dạo phố`);
    return true;
  };
  return {
    strollTicket: () => {
      if (locked()) return null;
      const { s, st } = today();
      if (st.tickets >= TICKET_CAP) { s.notify('🎟️ Cô Sáu bảo hôm nay bán đủ cho bạn rồi, mai ghé tiếp nhé!'); return null; }
      if (s.money < TICKET_PRICE) { s.notify('🎟️ Không đủ tiền mua vé số'); return null; }
      const prize = ticketPrize(Math.random());
      set({ money: s.money - TICKET_PRICE + prize, stroll: { ...st, tickets: st.tickets + 1 } });
      s.notify(prize > 0 ? `🎟️ Cào trúng ${formatMoney(prize)}!` : '🎟️ Tiếc quá, vé trượt rồi.');
      playSfx(prize > 0 ? 'gift' : 'sale');
      return prize;
    },
    strollIncense: () => {
      if (locked()) return false;
      const { s, st } = today();
      if (st.incense) { s.notify('🛕 Hôm nay bạn đã thắp nhang rồi'); return false; }
      set({ stroll: { ...st, incense: true } });
      s.notify('🛕 Thắp nén nhang, lòng nhẹ hẳn. Giờ có thể xin quẻ.');
      return true;
    },
    strollFortune: () => {
      if (locked()) return null;
      const { s, st } = today();
      if (!st.incense) { s.notify('🛕 Thắp nhang trước đã rồi hãy xin quẻ'); return null; }
      if (st.fortune) { s.notify('🛕 Mỗi ngày chỉ xin một quẻ thôi nhé'); return null; }
      if (s.money < FORTUNE_DONATE) { s.notify('🛕 Không đủ tiền công đức'); return null; }
      const f = fortuneOf(Math.random());
      set({
        money: s.money - FORTUNE_DONATE,
        stroll: { ...st, fortune: true },
        // Dùng chung lượng khách tăng của vòng quay (tự về 1 khi sang ngày); không hạ buff đang có
        ...(f.boost ? { wheelBoost: Math.max(s.wheelBoost, 1 + f.boost) } : {}),
      });
      s.notify(`🛕 ${f.label}: ${f.text}`);
      playSfx('gift');
      return f;
    },
    strollDice: (stake) => {
      if (locked()) return null;
      const { s, st } = today();
      if (!DICE_STAKES.includes(stake)) return null;
      if (st.dice >= DICE_CAP) { s.notify('🎲 Hôm nay chơi đủ ba ván rồi, về lo bán hàng đi!'); return null; }
      if (s.money < stake) { s.notify('🎲 Không đủ tiền đặt cược'); return null; }
      const win = diceWin(Math.random());
      set({ money: s.money + (win ? stake : -stake), stroll: { ...st, dice: st.dice + 1 } });
      s.notify(win ? `🎲 Thắng ván này, +${formatMoney(stake)}` : `🎲 Thua ván này, −${formatMoney(stake)}`);
      playSfx(win ? 'gift' : 'sale');
      return win;
    },
    strollBorrow: () => {
      if (locked()) return false;
      const { s, st } = today();
      if (st.shark) { s.notify('🕴️ Chú Tư: trả nợ cũ đã rồi hãy vay tiếp'); return false; }
      const amount = sharkOffer(s.level);
      const owed = Math.round(amount * SHARK_RATE);
      set({ money: s.money + amount, stroll: { ...st, shark: { owed, dueDay: s.day + SHARK_DAYS } } });
      s.notify(`🕴️ Vay nóng ${formatMoney(amount)}, hạn ${SHARK_DAYS} ngày phải trả ${formatMoney(owed)}. Quá hạn mỗi ngày tính thêm 10%!`);
      return true;
    },
    strollRepay: () => {
      const { s, st } = today();
      if (!st.shark) return false;
      const owed = sharkOwedNow(st.shark, s.day);
      const pay = Math.min(owed, s.money);
      if (pay <= 0) { s.notify('🕴️ Không có tiền để trả'); return false; }
      const left = owed - pay;
      set({ money: s.money - pay, stroll: { ...st, shark: left > 0 ? { owed: left, dueDay: s.day } : null } });
      s.notify(left > 0 ? `🕴️ Trả bớt ${formatMoney(pay)}, còn nợ ${formatMoney(left)}` : '🕴️ Đã trả hết nợ chú Tư!');
      return true;
    },
  };
};
