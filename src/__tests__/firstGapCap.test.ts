import { describe, expect, it, beforeEach, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CustomerManager } from '../agents/customers';

vi.mock('../core/counterAsk', () => ({
  askAtCounter: vi.fn(), askPending: () => false, clearAsk: vi.fn(), expireAsk: vi.fn(),
}));

/** GĐ806: phần dư khoảng chờ của đêm (60–90 phút) không bắt khách đầu ngày đợi. */
type Priv = { spawnIn: number; update: (dt: number, f: () => number) => void };

function manager(): Priv {
  const shop = { counters: () => [] } as never;
  const m = new CustomerManager({ add: () => {} } as never, {} as never, shop) as unknown as Priv & Record<string, unknown>;
  m.rehomeQueues = () => {};
  m.updateAskRealTime = () => {};
  m.spawn = () => {};
  return m;
}

beforeEach(() => { useGame.setState(newGameData()); });

describe('khoảng chờ khách đầu ngày', () => {
  it('sang giờ mở mà spawnIn còn dư 80 phút → bị kéo về trần ≤ 20 phút', () => {
    useGame.setState({ minutes: 6 * 60 + 1, shopOpen: true });
    const m = manager();
    m.spawnIn = 80;
    m.update(0.0001, () => 1);
    expect(m.spawnIn).toBeLessThanOrEqual(20);
  });
  it('ngoài giờ mở (3h sáng) thì giữ nguyên khoảng chờ', () => {
    useGame.setState({ minutes: 3 * 60, shopOpen: true });
    const m = manager();
    m.spawnIn = 80;
    m.update(0.0001, () => 1);
    expect(m.spawnIn).toBeGreaterThan(70);
  });
});
