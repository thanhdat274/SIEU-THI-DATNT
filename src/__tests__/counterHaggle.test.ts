import { describe, expect, it, beforeEach, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CustomerManager } from '../agents/customers';
import {
  counterPolicySummary, HAGGLE_COUNTER_ACCEPT_P, HAGGLE_REFUSE_OK, haggleChoice, haggleCounterOff, haggleCounterOutcome, haggleOff, haggleSettle, HAGGLE_CHANCE, PRICEMATCH_CHANCE, pricematchSettle,
} from '../data/counterDeals';
import { rivalPriceGap } from '../data/biz';
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

describe('GĐ725 — kèo khớp giá với rival', () => {
  it('rivalPriceGap: chỉ cộng món rival đang phá giá, làm tròn nghìn; không rival thì 0', () => {
    const priceOf = (id: string) => (id === 'nuoc' ? 6000 : id === 'keo' ? 5000 : 10000);
    const rival = { prices: { nuoc: 4000, keo: 5200 } } as never; // nuoc phá giá 33%, keo chỉ rẻ 4% (không tính)
    expect(rivalPriceGap(rival as never, priceOf, 5, ['nuoc', 'keo'])).toBe(2000);
    expect(rivalPriceGap(null, priceOf, 5, ['nuoc'])).toBe(0);
    expect(rivalPriceGap({ prices: {} } as never, priceOf, 5, ['nuoc'])).toBe(0);
  });
  it('pricematchSettle: choice 0 khớp (không rút) · choice 1 giữ giá theo REFUSE_OK', () => {
    expect(pricematchSettle(0, 2000, 50_000, 0)).toEqual({ discount: 2000, happy: true, icon: '🏷️' });
    expect(pricematchSettle(1, 2000, 50_000, HAGGLE_REFUSE_OK - 0.01)).toEqual({ discount: 0, happy: true, icon: null });
    expect(pricematchSettle(1, 2000, 50_000, HAGGLE_REFUSE_OK)).toEqual({ discount: 0, happy: false, icon: null });
    expect(PRICEMATCH_CHANCE).toBeLessThan(HAGGLE_CHANCE);
  });
});

describe('GĐ723 — stance chính sách Luôn trả nửa', () => {
  it('policy counter → choice 1 (hành trình trả giá lại tự chạy); summary nhắc đúng', () => {
    const pol = { haggle: 'counter' as const, change: 'ask' as const };
    expect(haggleChoice(pol, 50_000)).toBe(1);
    expect(counterPolicySummary(pol).haggleText).toContain('trả nửa');
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

  it('GĐ725 — kèo khớp giá: giỏ có món rival phá giá + chủ ở quầy → hỏi 2 nút; KHÔNG ở quầy → KHÔNG hỏi (autoplay an toàn)', () => {
    const basket = [{ id: 'nuoc', price: 12000 }];
    const rival = { name: 'Siêu thị Minh', prices: { nuoc: 4000 } };
    const at = (present: boolean) => {
      manager.playerAtCounter = () => present;
      useGame.setState({ level: 3, biz: { ...useGame.getState().biz, rival } as never });
      const c = { basket, regular: null, profession: null, deal: undefined as unknown, say: vi.fn() };
      const rand = Math.random; Math.random = () => 0.01; // < PRICEMATCH_CHANCE
      try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
      return c;
    };
    const hit = at(true);
    expect(hit.deal).toBe('waiting');
    // packet chủ hỏi KHÔNG mang kind/amount (chúng nằm trong closure c.deal) — assert bằng nội dung người chơi thấy
    const ask = mockedAsk.mock.calls.at(-1)![0] as { text: string; options: string[]; fallback: number };
    expect(ask.text).toContain('Siêu thị Minh');
    expect(ask.text).toContain('2.000đ'); // gap theo GIÁ TIỆM (6.000 − 4.000), không phải giá giỏ stub
    expect(ask.options).toHaveLength(2);
    expect(ask.options[0]).toContain('Khớp giá');
    expect(ask.options[1]).toContain('Giữ giá');
    expect(ask.fallback).toBe(1);
    // vắng chủ: KHÔNG có câu hỏi pricematch nào (haggle không trúng vì giỏ 11k < 20k; chỉ change có thể hỏi)
    const before = mockedAsk.mock.calls.length;
    const miss0 = at(false);
    const newsCalls = mockedAsk.mock.calls.slice(before);
    // vắng chủ: KHÔNG được có deal pricematch (tự chốt fallback = autoplay bào mòn kinh tế — bài học GĐ722)
    expect(JSON.stringify(miss0.deal)).not.toContain('pricematch');
  });

  it('GĐ722 — khách quen bill lớn + roll ngoài 6%: không hỏi mặc cả (rơi qua nhánh khác)', () => {
    const c = { ...cust([50_000]), regular: { id: 'ba_nam', name: 'Bà Năm bán xôi' } };
    const rand = Math.random; Math.random = () => 0.5; // ≥ HAGGLE_CHANCE_REG, < CHANGE? total tròn 50k → không lẻ
    try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
    expect(mockedAsk).not.toHaveBeenCalled();
    expect((c.deal as { kind: string }).kind).toBe('none');
  });
});
