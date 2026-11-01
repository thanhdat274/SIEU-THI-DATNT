import { describe, expect, it, beforeEach, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CustomerManager } from '../agents/customers';
import {
  HAGGLE_COUNTER_ACCEPT_P, HAGGLE_REFUSE_OK, haggleCounterOff, haggleCounterOutcome, haggleOff, haggleSettle,
} from '../data/counterDeals';
import { askAtCounter } from '../core/counterAsk';

vi.mock('../core/counterAsk', () => ({
  askAtCounter: vi.fn(),
  askPending: () => false,
  clearAsk: vi.fn(),
  expireAsk: vi.fn(),
}));

const mockedAsk = askAtCounter as unknown as ReturnType<typeof vi.fn>;

/**
 * GĐ721 — "Trả giá lại" ở quầy: nút giữa của mặc cả. Khách xin bớt X; chủ có thể trả nửa (Y = X/2 làm
 * tròn XUỐNG nghìn): <0,7 khách gật giá giữa · 0,7–0,88 mua giá đầy · ≥0,88 bỏ về. EV nằm giữa "bớt luôn"
 * (mất X, giữ 100%) và "giữ giá" (60%×total, 40% mất khách) → nút giữa có nghĩa thật. Prompt 3 nút,
 * fallback = 2 (giữ giá — semant cũ của fallback 1), policy refuse → choice 2.
 */

describe('haggleCounterOff — nửa mức xin, làm tròn xuống nghìn, sàn 1.000đ', () => {
  it('50k: xin 5k → trả 2k; 20k: xin 2k → trả 1k; 21k: xin 2k → trả 1k', () => {
    expect(haggleOff(50_000)).toBe(5_000);
    expect(haggleCounterOff(50_000)).toBe(2_000);
    expect(haggleCounterOff(20_000)).toBe(1_000);
    expect(haggleCounterOff(21_000)).toBe(1_000);
    expect(haggleCounterOff(95_000)).toBe(5_000); // haggleOff làm tròn 9,5k lên 10k trước → nửa = 5k
  });
});

describe('haggleCounterOutcome — dải một lần rút', () => {
  it('<0,7 gật giá giữa; 0,7–0,88 mua đầy; ≥0,88 bỏ về', () => {
    expect(haggleCounterOutcome(0)).toBe('deal');
    expect(haggleCounterOutcome(HAGGLE_COUNTER_ACCEPT_P - 0.001)).toBe('deal');
    expect(haggleCounterOutcome(HAGGLE_COUNTER_ACCEPT_P)).toBe('full');
    expect(haggleCounterOutcome(HAGGLE_COUNTER_ACCEPT_P + (1 - HAGGLE_COUNTER_ACCEPT_P) * HAGGLE_REFUSE_OK - 0.001)).toBe('full');
    expect(haggleCounterOutcome(HAGGLE_COUNTER_ACCEPT_P + (1 - HAGGLE_COUNTER_ACCEPT_P) * HAGGLE_REFUSE_OK)).toBe('walk');
    expect(haggleCounterOutcome(0.999)).toBe('walk');
  });
});

describe('haggleSettle — chốt deal thuần (không rút khi bớt luôn)', () => {
  it('choice 0: bớt đầy đủ X, khách vui, không cần rút', () => {
    expect(haggleSettle(0, 5_000, 50_000, 0)).toEqual({ discount: 5_000, happy: true, icon: '🤝' });
  });
  it('choice 1 (trả giá lại): gật → bớt nửa; mua đầy → không giảm; bỏ về → không vui', () => {
    expect(haggleSettle(1, 5_000, 50_000, 0.5)).toEqual({ discount: 2_000, happy: true, icon: '💬' });
    expect(haggleSettle(1, 5_000, 50_000, 0.75)).toEqual({ discount: 0, happy: true, icon: null });
    expect(haggleSettle(1, 5_000, 50_000, 0.95)).toEqual({ discount: 0, happy: false, icon: null });
  });
  it('choice 2 (giữ giá): <0,6 vui vẻ mua giá đầy, ≥0,6 bỏ về — đúng công thức cũ trước GĐ721', () => {
    expect(haggleSettle(2, 5_000, 50_000, HAGGLE_REFUSE_OK - 0.01)).toEqual({ discount: 0, happy: true, icon: null });
    expect(haggleSettle(2, 5_000, 50_000, HAGGLE_REFUSE_OK)).toEqual({ discount: 0, happy: false, icon: null });
  });
});

describe('prompt 3 nút qua đường thật (harness counterPolicy)', () => {
  const manager = new CustomerManager({} as never, {} as never, {} as never) as unknown as {
    counterDeal: (c: { deal?: unknown }, counter: unknown) => unknown;
    playerAtCounter: (c: unknown) => boolean;
  };
  const cust = (prices: number[]) => ({
    basket: prices.map((price) => ({ price })),
    regular: null,
    profession: null,
    deal: undefined as unknown,
    say: vi.fn(),
  });
  const counter = {} as never;

  beforeEach(() => {
    useGame.setState(newGameData());
    useGame.setState({ level: 3 });
    manager.playerAtCounter = () => true;
    mockedAsk.mockClear();
  });

  it('policy ask: prompt có 3 nút (bớt / trả nửa / giữ giá), fallback 2 (giữ giá)', () => {
    const c = cust([50_000]);
    const rand = Math.random; Math.random = () => 0.01; // < HAGGLE_CHANCE
    try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
    expect(c.deal).toBe('waiting');
    expect(mockedAsk).toHaveBeenCalledTimes(1);
    const ask = mockedAsk.mock.calls[0][0] as { options: string[]; fallback: number; amount: number };
    expect(ask.options).toHaveLength(3);
    expect(ask.options[0]).toContain('Bớt 5.000');
    expect(ask.options[1]).toContain('Trả nửa');
    expect(ask.options[1]).toContain('2.000');
    expect(ask.options[2]).toContain('Giá đúng rồi');
    expect(ask.fallback).toBe(2);
  });

  it('GĐ722 — khách quen cũng mặc cả: lời "Bà con" với 3 nút như khách lẻ', () => {
    const c = { ...cust([50_000]), regular: { id: 'ba_nam', name: 'Bà Năm bán xôi' } };
    const rand = Math.random; Math.random = () => 0.01; // < HAGGLE_CHANCE_REG 0,06
    try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
    expect(c.deal).toBe('waiting');
    const ask = mockedAsk.mock.calls[0][0] as { options: string[]; text: string; who: string; fallback: number };
    expect(ask.text).toContain('Bà con');
    expect(ask.who).toBe('Bà Năm bán xôi');
    expect(ask.options).toHaveLength(3);
    expect(ask.fallback).toBe(2);
  });

  it('GĐ722 — khách quen bill lớn + roll ngoài 6%: không hỏi mặc cả (rơi qua nhánh khác)', () => {
    const c = { ...cust([50_000]), regular: { id: 'ba_nam', name: 'Bà Năm bán xôi' } };
    const rand = Math.random; Math.random = () => 0.5; // ≥ HAGGLE_CHANCE_REG, < CHANGE? total tròn 50k → không lẻ
    try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
    expect(mockedAsk).not.toHaveBeenCalled();
    expect((c.deal as { kind: string }).kind).toBe('none');
  });
});
