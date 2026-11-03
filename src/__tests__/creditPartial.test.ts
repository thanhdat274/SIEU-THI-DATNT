import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { askAtCounter } from '../core/counterAsk';

vi.mock('../core/counterAsk', () => ({
  askAtCounter: vi.fn(),
  askPending: () => false,
  clearAsk: vi.fn(),
  expireAsk: vi.fn(),
}));
import { CustomerManager } from '../agents/customers';
import { DEBT_PARTIAL_CHANCE, DEBT_PARTIAL_MIN, installmentNow, wantsInstallment } from '../data/credit';

/**
 * GĐ734 — kèo trả góp khi thu nợ: nợ đến hạn ≥ 100k + khách quen ở quầy → 30% xin "trả nửa hôm nay,
 * nửa sau (7 ngày mới)". Chấp nhận → collectDebtPartial (nhận nửa, amount giảm, since = hôm nay mở
 * cửa sổ mới); Đòi đủ → collectDebt đủ + thân thiết −1 (bấu kịp). Gate theo sự hiện diện của chủ quầy
 * (bài học GĐ722) — autoplay không bao giờ rút rng cho kèo này.
 */

const g = () => useGame.getState();

describe('wantsInstallment / installmentNow — thuần', () => {
  const debt = { amount: 240_000, since: 5 };
  it('nợ ≥ 100k + roll < 0,3 → xin; nợ nhỏ hoặc roll cao → không', () => {
    expect(wantsInstallment(debt, DEBT_PARTIAL_CHANCE - 0.01)).toBe(true);
    expect(wantsInstallment(debt, DEBT_PARTIAL_CHANCE)).toBe(false);
    expect(wantsInstallment({ amount: 90_000, since: 5 }, 0.01)).toBe(false);
    expect(wantsInstallment(undefined, 0.01)).toBe(false);
  });
  it('installmentNow: nửa nợ làm tròn XUỐNG nghìn, sàn 50k', () => {
    expect(installmentNow(240_000)).toBe(120_000);
    expect(installmentNow(250_000)).toBe(125_000); // 125k đã tròn nghìn — giữ nguyên
    expect(installmentNow(101_000)).toBe(50_000); // 50.5k → 50k
  });
});

describe('collectDebtPartial qua store', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 20, money: 1_000_000, notify: () => {} });
    useGame.setState({ debts: { ba_nam: { amount: 240_000, since: 10 } } });
  });
  it('chấp nhận trả góp: nhận nửa (120k), còn 120k mở sổ mới (since = hôm nay 20)', () => {
    const got = g().collectDebtPartial('ba_nam');
    expect(got).toBe(120_000);
    expect(g().money).toBe(1_000_000 + 120_000);
    const d = g().debts.ba_nam!;
    expect(d.amount).toBe(120_000);
    expect(d.since).toBe(20);
    expect(d.reminded).toBeUndefined(); // cửa sổ mới, bỏ trạng thái đã nhắc
    expect(g().stats.repaid).toBe(120_000);
  });
  it('nợ nhỏ hơn nửa sàn 50k (ví dụ 60k): nhận 50k, còn 10k vẫn còn sổ', () => {
    useGame.setState({ debts: { ba_nam: { amount: 60_000, since: 12 } } });
    const got = g().collectDebtPartial('ba_nam');
    expect(got).toBe(50_000);
    expect(g().debts.ba_nam!.amount).toBe(10_000);
  });
  it('nợ < 50k (installmentNow sàn 50k > nợ): trả trước vượt nợ → XOÁ sổ nợ luôn (rest ≤ 0)', () => {
    useGame.setState({ debts: { ba_nam: { amount: 30_000, since: 12 } } });
    const got = g().collectDebtPartial('ba_nam');
    expect(got).toBe(50_000);                        // trả 50k (≥ nợ 30k)
    expect(g().debts.ba_nam).toBeUndefined();        // không còn món nợ nào
    expect(g().money).toBe(1_000_000 + 50_000);
    expect(g().stats.repaid).toBe(50_000);
  });
});

describe('kèo trả góp qua đường thật (harness counterDeal)', () => {
  const manager = new CustomerManager({} as never, {} as never, {} as never) as unknown as {
    counterDeal: (c: { deal?: unknown }, counter: unknown) => unknown;
    playerAtCounter: (c: unknown) => boolean;
  };
  const counter = {} as never;
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 20, level: 10, allowCredit: false, notify: () => {} });
    manager.playerAtCounter = () => true;
  });
  it('nợ 240k đến hạn + chủ ở quầy + roll trúng → hỏi 2 nút trả góp; KHÔNG ở quầy → không hỏi', () => {
    const basket = [{ id: 'nuoc', price: 6000 }];
    const run = (present: boolean) => {
      manager.playerAtCounter = () => present;
      useGame.setState({
        day: 20,
        debts: { ba_nam: { amount: 240_000, since: 10 } },
        regulars: { ba_nam: { friendship: 40, visits: 5, perks: [], discovered: [] } },
      });
      const c = { basket, regular: { id: 'ba_nam', name: 'Bà Năm bán xôi' }, profession: null, deal: undefined as unknown, say: vi.fn() };
      const rand = Math.random; Math.random = () => 0.01; // < DEBT_PARTIAL_CHANCE
      try { manager.counterDeal(c as never, counter); } finally { Math.random = rand; }
      return c;
    };
    const hit = run(true);
    expect(hit.deal).toBe('waiting');
    const ask = mockedAskLast();
    expect(ask.text).toContain('trả góp');
    expect(ask.options).toHaveLength(2);
    expect(ask.options[0]).toContain('120.000');
    expect(ask.fallback).toBe(1);
    const callsBefore = mockedAskCount();
    const miss = run(false);
    expect(missedNoInstallment(callsBefore)).toBe(true);
    void miss;
  });
});


function mockedAskLast(): { text: string; options: string[]; fallback: number } {
  const calls = (askAtCounter as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1][0];
}
function mockedAskCount(): number {
  return (askAtCounter as unknown as ReturnType<typeof vi.fn>).mock.calls.length;
}
function missedNoInstallment(before: number): boolean {
  const calls = (askAtCounter as unknown as ReturnType<typeof vi.fn>).mock.calls.slice(before);
  return calls.every((call: unknown[]) => !(call[0] as { text?: string }).text?.includes('trả góp'));
}
