import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { stockReminders } from '../core/biz';
import { PRODUCTS } from '../data/products';

/**
 * stockReminders (biz.ts) — nhắc hàng sắp hết trên kệ: mỗi món một lần mỗi ngày, chỉ khi có nhu cầu và kho cũng hết.
 * Sai ở đây là spam thông báo mỗi tick hoặc im lặng khi hết hàng.
 */

const PID = PRODUCTS[0].id;
const PID2 = PRODUCTS[1].id;
const notify = vi.fn();
let day = 100;

const withShelf = (counts: Record<string, number>, storage: Record<string, number>, demand: Record<string, number>) => {
  const tiers = Object.entries(counts).map(([productId, count]) => ({ productId, count, lots: [] }));
  useGame.setState({
    furniture: [{ uid: 1, type: 'shelf', x: 0, z: 0, rot: 0, wear: 0, tiers }] as never,
    storage, storageLots: {}, demand: demand as never, day,
  });
};

beforeEach(() => {
  day += 1; // bộ nhớ "đã nhắc" của module tính theo ngày: mỗi test một ngày mới
  notify.mockClear();
  useGame.setState({ ...newGameData(), notify });
});

describe('stockReminders — nhắc sắp hết', () => {
  it('kệ + kho dưới ngưỡng và có nhu cầu: nhắc đúng một lần trong ngày', () => {
    withShelf({ [PID]: 1 }, {}, { [PID]: 5 });
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('Sắp hết hàng');
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('sang ngày mới thì nhắc lại', () => {
    withShelf({ [PID]: 1 }, {}, { [PID]: 5 });
    stockReminders();
    day += 1;
    useGame.setState({ day });
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('kho còn nhiều, không có nhu cầu, hoặc kệ đủ hàng: không nhắc', () => {
    withShelf({ [PID]: 1 }, { [PID]: 50 }, { [PID]: 5 });
    stockReminders();
    withShelf({ [PID]: 1 }, {}, {});
    stockReminders();
    withShelf({ [PID]: 20 }, {}, { [PID]: 5 });
    stockReminders();
    expect(notify).not.toHaveBeenCalled();
  });

  it('nhiều món cùng thiếu: gộp một thông báo, vẫn nhắc món mới thiếu sau đó', () => {
    withShelf({ [PID]: 1, [PID2]: 2 }, {}, { [PID]: 3, [PID2]: 3 });
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain(PRODUCTS[0].name);
    expect(notify.mock.calls[0][0]).toContain(PRODUCTS[1].name);
  });
});

describe('stockReminders — nhắc sắp hỏng', () => {
  const shelfWith = (life: number, count = 20) => {
    useGame.setState({
      furniture: [{ uid: 1, type: 'shelf', x: 0, z: 0, rot: 0, wear: 0, tiers: [{ productId: PID, count, lots: [{ qty: count, life }] }] }] as never,
      storage: {}, storageLots: {}, demand: {} as never, day,
    });
  };

  it('lô trên kệ còn dưới 1 ngày: nhắc "Sắp hỏng" một lần/ngày', () => {
    shelfWith(0.5);
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('Sắp hỏng');
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('lô còn hạn dài: không nhắc', () => {
    shelfWith(5);
    stockReminders();
    expect(notify).not.toHaveBeenCalled();
  });

  it('lô trong kho sắp hỏng: nhắc khi kho còn hàng, im khi kho đã hết', () => {
    shelfWith(9);
    useGame.setState({ storage: { [PID]: 3 }, storageLots: { [PID]: [{ qty: 3, life: 1 }] } as never });
    stockReminders();
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('Sắp hỏng');
    notify.mockClear();
    day += 1;
    useGame.setState({ day, storage: {} });
    stockReminders();
    expect(notify).not.toHaveBeenCalled();
  });
});
