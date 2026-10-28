import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CustomerManager } from '../agents/customers';
import {
  haggleChoice, changeChoice, counterPolicySummary, defaultCounterPolicy, haggleOff,
  type HagglePolicy, type ChangePolicy, type CounterPolicy,
} from '../data/counterDeals';
import { snapshot, applySnapshot } from '../core/save';
import { askAtCounter } from '../core/counterAsk';

vi.mock('../core/counterAsk', () => ({
  askAtCounter: vi.fn(),
  askPending: () => false,
  clearAsk: vi.fn(),
  expireAsk: vi.fn(),
}));

const mockedAsk = askAtCounter as unknown as ReturnType<typeof vi.fn>;

/** GĐ61 "Chính sách quầy": thái độ chủ tiệm (mặc cả & tiền lẻ). Default {ask,ask} = hành vi hôm nay. */

beforeEach(() => {
  useGame.setState(newGameData());
  mockedAsk.mockClear();
});

const pol = (haggle: HagglePolicy = 'ask', change: ChangePolicy = 'ask'): CounterPolicy => ({ haggle, change });

describe('haggleChoice / changeChoice — map thái độ → option 0|1|null', () => {
  it('haggle: accept→0 (bớt), refuse→1 (giữ giá), ask→null (prompt path)', () => {
    expect(haggleChoice(pol('accept'), 25000)).toBe(0);
    expect(haggleChoice(pol('refuse'), 25000)).toBe(1);
    expect(haggleChoice(pol('ask'), 25000)).toBeNull();
  });

  it('change: round→0 (bớt tròn), candy→1 (thối kẹo), ask→null', () => {
    expect(changeChoice(pol('ask', 'round'), 12000)).toBe(0);
    expect(changeChoice(pol('ask', 'candy'), 12000)).toBe(1);
    expect(changeChoice(pol('ask', 'ask'), 12000)).toBeNull();
  });
});

describe('counterPolicySummary — tradeoff text từng stance', () => {
  it('mặc cả — accept / refuse / ask', () => {
    expect(counterPolicySummary(pol('accept')).haggleText).toContain('luôn bớt 10%');
    expect(counterPolicySummary(pol('refuse')).haggleText).toContain('không bớt');
    expect(counterPolicySummary(pol('ask')).haggleText).toContain('hỏi từng đơn');
  });
  it('tiền lẻ — round / candy / ask', () => {
    expect(counterPolicySummary(pol('ask', 'round')).changeText).toContain('bớt cho tròn');
    expect(counterPolicySummary(pol('ask', 'candy')).changeText).toContain('thối kẹo');
    expect(counterPolicySummary(pol('ask', 'ask')).changeText).toContain('hỏi từng đơn');
  });
});

describe('instrument counterDeal — chính sách tự chốt option (không qua prompt)', () => {
  // customerDeal chỉ dùng playerAtCounter (stub) + state; không cần scene/grid/shop thật.
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

  const run = (c: unknown, m = manager) => m.counterDeal(c as never, counter);

  beforeEach(() => {
    manager.playerAtCounter = () => true; // có người ở quầy → nhánh thường SẼ hỏi (để chứng minh policy chặn)
  });

  it('mặc cả: policy accept → deal {kind haggle, choice 0} đã chốt, KHÔNG waiting, KHÔNG gọi askAtCounter', () => {
    useGame.setState({ level: 3, counterPolicy: pol('accept') });
    const c = cust([25000]); // ≥ HAGGLE_MIN_TOTAL
    const rand = Math.random; Math.random = () => 0.01; // < HAGGLE_CHANCE
    try { run(c); } finally { Math.random = rand; }
    expect(c.deal).toEqual({ kind: 'haggle', amount: haggleOff(25000), choice: 0 });
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it('mặc cả: policy refuse → choice 1 (giữ giá)', () => {
    useGame.setState({ level: 3, counterPolicy: pol('refuse') });
    const c = cust([25000]);
    const rand = Math.random; Math.random = () => 0.01;
    try { run(c); } finally { Math.random = rand; }
    expect((c.deal as { kind: string; choice: number }).kind).toBe('haggle');
    expect((c.deal as { choice: number }).choice).toBe(1);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it('mặc cả: policy ask → giữ prompt path (waiting + gọi askAtCounter) — regression guard', () => {
    useGame.setState({ level: 3, counterPolicy: pol('ask') });
    const c = cust([25000]);
    const rand = Math.random; Math.random = () => 0.01;
    try { expect(run(c)).toBe('waiting'); } finally { Math.random = rand; }
    expect(c.deal).toBe('waiting');
    expect(mockedAsk).toHaveBeenCalledTimes(1);
  });

  it('tiền lẻ: policy round → deal {kind change, choice 0}, không waiting, không askAtCounter', () => {
    useGame.setState({ level: 3, counterPolicy: pol('ask', 'round') });
    const c = cust([12000]); // < HAGGLE_MIN_TOTAL nên bỏ nhánh mặc cả; lẻ → nhánh tiền lẻ
    const rand = Math.random; Math.random = () => 0.01; // < CHANGE_CHANCE
    try { run(c); } finally { Math.random = rand; }
    expect(c.deal).toEqual({ kind: 'change', amount: 12000 % 5000, choice: 0 });
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it('tiền lẻ: policy candy → choice 1 (thối kẹo)', () => {
    useGame.setState({ level: 3, counterPolicy: pol('ask', 'candy') });
    const c = cust([12000]);
    const rand = Math.random; Math.random = () => 0.01;
    try { run(c); } finally { Math.random = rand; }
    expect((c.deal as { kind: string; choice: number }).kind).toBe('change');
    expect((c.deal as { choice: number }).choice).toBe(1);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it('tiền lẻ: policy ask → giữ prompt path (waiting) — regression guard', () => {
    useGame.setState({ level: 3, counterPolicy: pol('ask', 'ask') });
    const c = cust([12000]);
    const rand = Math.random; Math.random = () => 0.01;
    try { expect(run(c)).toBe('waiting'); } finally { Math.random = rand; }
    expect(c.deal).toBe('waiting');
    expect(mockedAsk).toHaveBeenCalledTimes(1);
  });

  it('không có sự kiện quầy (không mặc cả/không lẻ) → policy không tác động, deal = none', () => {
    useGame.setState({ level: 3, counterPolicy: pol('accept', 'round') });
    const c = cust([1000]); // < HAGGLE_MIN_TOTAL, tròn (1000%5000=1000 ≠0 → vẫn lẻ nhưng Math.random cao)
    const rand = Math.random; Math.random = () => 0.99; // vượt cả HAGGLE_CHANCE lẫn CHANGE_CHANCE
    try { run(c); } finally { Math.random = rand; }
    expect(c.deal).toEqual({ kind: 'none', amount: 0, choice: 0 });
    expect(mockedAsk).not.toHaveBeenCalled();
  });
});

describe('save-safe — counterPolicy optional, bù {ask,ask} save cũ, round-trip giữ nguyên', () => {
  it('newGameData default = {ask, ask} (hành vi hôm nay)', () => {
    expect(useGame.getState().counterPolicy).toEqual({ haggle: 'ask', change: 'ask' });
    expect(defaultCounterPolicy()).toEqual({ haggle: 'ask', change: 'ask' });
  });

  it('applySnapshot bản cũ thiếu counterPolicy → tự bù {ask, ask}', () => {
    const raw = { ...newGameData() } as Record<string, unknown>;
    delete raw.counterPolicy;
    applySnapshot(raw as never);
    expect(useGame.getState().counterPolicy).toEqual({ haggle: 'ask', change: 'ask' });
  });

  it('snapshot → applySnapshot round-trip giữ nguyên chính sách', () => {
    useGame.setState({ counterPolicy: { haggle: 'refuse', change: 'candy' } });
    applySnapshot(snapshot());
    expect(useGame.getState().counterPolicy).toEqual({ haggle: 'refuse', change: 'candy' });
  });

  it('setCounterPolicy chỉ patch đúng field, không đụng field kia', () => {
    useGame.getState().setCounterPolicy({ haggle: 'accept' });
    const got = useGame.getState().counterPolicy;
    expect(got.haggle).toBe('accept');
    expect(got.change).toBe('ask'); // giữ nguyên mặc định
  });
});
