import { describe, expect, it } from 'vitest';
import {
  DICE_WIN, SHARK_RATE, TICKET_PRICE, TICKET_PRIZES, diceWin, fortuneOf, newStroll, sharkOffer, sharkOwedNow, strollToday, ticketPrize,
} from '../data/stroll';
import { useGame } from '../core/store';

describe('dạo phố — dữ liệu thuần', () => {
  it('vé số: kỳ vọng thấp hơn giá vé (không phải nguồn tiền)', () => {
    let prev = 0;
    let ev = 0;
    for (const p of TICKET_PRIZES) { ev += (p.upTo - prev) * p.prize; prev = p.upTo; }
    expect(ev).toBeLessThan(TICKET_PRICE);
    expect(ev).toBeGreaterThan(TICKET_PRICE * 0.5);
    expect(ticketPrize(0.1)).toBe(0);
    expect(ticketPrize(0.999)).toBe(500_000);
  });
  it('tài xỉu: nhà cái hơi lợi', () => {
    expect(DICE_WIN).toBeLessThan(0.5);
    expect(diceWin(0.1)).toBe(true);
    expect(diceWin(0.9)).toBe(false);
  });
  it('quẻ: ba bậc, đại cát hiếm nhất', () => {
    expect(fortuneOf(0.05).id).toBe('dai_cat');
    expect(fortuneOf(0.3).id).toBe('cat');
    expect(fortuneOf(0.9).id).toBe('binh');
  });
  it('vay nóng: lãi nặng, quá hạn tính lãi chồng', () => {
    const sk = { owed: 130_000, dueDay: 10 };
    expect(sharkOwedNow(sk, 9)).toBe(130_000);
    expect(sharkOwedNow(sk, 10)).toBe(130_000);
    expect(sharkOwedNow(sk, 12)).toBe(157_000);
    expect(SHARK_RATE).toBeGreaterThan(1.2);
    expect(sharkOffer(5)).toBe(100_000);
    expect(sharkOffer(999)).toBe(1_200_000);
  });
  it('sang ngày mới thì bộ đếm về 0 nhưng nợ giữ nguyên', () => {
    const st = { ...newStroll(), day: 3, tickets: 5, dice: 3, incense: true, fortune: true, shark: { owed: 1, dueDay: 9 } };
    expect(strollToday(st, 3)).toBe(st);
    const next = strollToday(st, 4);
    expect([next.tickets, next.dice, next.incense, next.fortune]).toEqual([0, 0, false, false]);
    expect(next.shark).toEqual({ owed: 1, dueDay: 9 });
  });
});

describe('dạo phố — thao tác trong store', () => {
  const reset = (over: Record<string, unknown> = {}) => useGame.setState({ level: 10, day: 5, money: 1_000_000, stroll: newStroll(), wheelBoost: 1, ...over } as never);
  it('cần cấp 3', () => {
    reset({ level: 2 });
    expect(useGame.getState().strollTicket()).toBeNull();
    expect(useGame.getState().money).toBe(1_000_000);
  });
  it('vé số có trần 5 tờ mỗi ngày', () => {
    reset();
    for (let i = 0; i < 5; i++) expect(useGame.getState().strollTicket()).not.toBeNull();
    expect(useGame.getState().strollTicket()).toBeNull();
    expect(useGame.getState().stroll.tickets).toBe(5);
  });
  it('xin quẻ cần thắp nhang trước, mỗi ngày một quẻ', () => {
    reset();
    expect(useGame.getState().strollFortune()).toBeNull();
    expect(useGame.getState().strollIncense()).toBe(true);
    expect(useGame.getState().strollIncense()).toBe(false);
    expect(useGame.getState().strollFortune()).not.toBeNull();
    expect(useGame.getState().strollFortune()).toBeNull();
    expect(useGame.getState().wheelBoost).toBeGreaterThanOrEqual(1);
  });
  it('tài xỉu: cược sai mức bị chặn, tối đa 3 ván', () => {
    reset();
    expect(useGame.getState().strollDice(12345)).toBeNull();
    for (let i = 0; i < 3; i++) expect(useGame.getState().strollDice(10_000)).not.toBeNull();
    expect(useGame.getState().strollDice(10_000)).toBeNull();
  });
  it('vay nóng: một khoản một lúc, trả hết thì xóa nợ', () => {
    reset();
    expect(useGame.getState().strollBorrow()).toBe(true);
    const owed = useGame.getState().stroll.shark!.owed;
    expect(owed).toBe(Math.round(sharkOffer(10) * SHARK_RATE));
    expect(useGame.getState().strollBorrow()).toBe(false);
    expect(useGame.getState().strollRepay()).toBe(true);
    expect(useGame.getState().stroll.shark).toBeNull();
    expect(useGame.getState().money).toBe(1_000_000 + sharkOffer(10) - owed);
  });
  it('trả thiếu tiền thì trả bớt, nợ còn lại tính từ hôm nay', () => {
    reset({ stroll: { ...newStroll(), day: 5, shark: { owed: 500_000, dueDay: 3 } }, money: 100_000 });
    expect(useGame.getState().strollRepay()).toBe(true);
    const sk = useGame.getState().stroll.shark!;
    expect(sk.dueDay).toBe(5);
    expect(useGame.getState().money).toBe(0);
    expect(sk.owed).toBeGreaterThan(400_000);
  });
});
