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
import { creditAskText, creditLeft, creditLimit } from '../data/credit';

/**
 * GĐ746 — câu xin ghi sổ ở quầy nói RÕ còn ghi được bao nhiêu (hạn mức − đang nợ), không chỉ
 * báo "đang nợ". Người chơi quyết định cho nợ bằng số, không phải đoán hạn mức.
 */

describe('creditLeft — thuần', () => {
  it('chưa nợ → bằng hạn mức; có nợ → trừ ra; nợ vượt hạn mức → 0 (không âm)', () => {
    expect(creditLeft(undefined, undefined)).toBe(50_000); // sàn hạn mức
    const p = { friendship: 40, visits: 5, perks: [], discovered: [] };
    expect(creditLimit(p)).toBe(130_000);
    expect(creditLeft(p, undefined)).toBe(130_000);
    expect(creditLeft(p, { amount: 100_000, since: 3 })).toBe(30_000);
    expect(creditLeft(p, { amount: 500_000, since: 3 })).toBe(0);
  });
  it('thân thiết âm không kéo hạn mức dưới sàn', () => {
    expect(creditLeft({ friendship: -50, visits: 1, perks: [], discovered: [] }, undefined)).toBe(50_000);
  });
});

describe('creditAskText — câu hỏi ở quầy', () => {
  it('chưa nợ: nêu hạn mức còn ghi; có nợ: nêu đang nợ + còn ghi', () => {
    expect(creditAskText(25_000, 0, 130_000)).toBe('quên ví, xin ghi sổ 25.000đ (còn ghi 130.000đ)');
    expect(creditAskText(25_000, 100_000, 30_000)).toBe('quên ví, xin ghi sổ 25.000đ (đang nợ 100.000đ · còn ghi 30.000đ)');
  });
  it('luôn nhắc hạn mức còn lại (kể cả khi đang nợ) — không có nhánh nào bỏ sót', () => {
    for (const owed of [0, 10_000, 90_000]) expect(creditAskText(5_000, owed, 40_000)).toContain('còn ghi 40.000đ');
  });
});

describe('câu xin ghi sổ qua đường thật (counterDeal)', () => {
  const manager = new CustomerManager({} as never, {} as never, {} as never) as unknown as {
    counterDeal: (c: { deal?: unknown }, counter: unknown) => unknown;
    playerAtCounter: (c: unknown) => boolean;
  };
  beforeEach(() => {
    useGame.setState({ ...newGameData(), day: 20, level: 10, allowCredit: true, notify: () => {} });
    manager.playerAtCounter = () => true;
    (askAtCounter as unknown as ReturnType<typeof vi.fn>).mockClear();
  });
  const run = (debtAmount: number) => {
    useGame.setState({
      day: 20,
      debts: debtAmount ? { ba_nam: { amount: debtAmount, since: 10 } } : {},
      regulars: { ba_nam: { friendship: 40, visits: 5, perks: [], discovered: [] } },
    });
    const c = { basket: [{ id: 'nuoc', price: 25_000 }], regular: { id: 'ba_nam', name: 'Bà Năm bán xôi', priceSensitivity: 1 }, profession: null, deal: undefined as unknown, say: vi.fn() };
    const rand = Math.random; Math.random = () => 0.001; // < CREDIT_ASK_CHANCE
    try { manager.counterDeal(c as never, {} as never); } finally { Math.random = rand; }
    const calls = (askAtCounter as unknown as ReturnType<typeof vi.fn>).mock.calls;
    return calls.filter((call) => (call[0] as { text?: string }).text?.includes('quên ví')).pop()?.[0] as
      | { text: string; options: string[] }
      | undefined;
  };
  it('không nợ: câu hỏi nêu "còn ghi 130.000đ"', () => {
    const ask = run(0);
    expect(ask?.text).toBeDefined();
    expect(ask?.text).toContain('còn ghi 130.000đ');
    expect(ask?.text).not.toContain('đang nợ');
  });
  it('đang nợ 50k (dưới mốc trả góp): nêu cả "đang nợ 50.000đ" và "còn ghi 80.000đ"', () => {
    const ask = run(50_000);
    expect(ask?.text).toContain('đang nợ 50.000đ');
    expect(ask?.text).toContain('còn ghi 80.000đ');
  });
  it('món mua vượt hạn mức còn lại → không hỏi ghi sổ (wantsCredit chặn)', () => {
    const ask = run(120_000); // còn 10k, mua 25k
    expect(ask?.text ?? '').not.toContain('ghi sổ');
  });
});
