import { describe, expect, it } from 'vitest';
import * as biz from '../data/biz';
import * as rivals from '../data/rivals';

describe('rivals tách khỏi biz (GĐ959)', () => {
  it('biz vẫn re-export toàn bộ API đối thủ', () => {
    for (const k of Object.keys(rivals)) expect((biz as Record<string, unknown>)[k]).toBe((rivals as Record<string, unknown>)[k]);
    expect(Object.keys(rivals).length).toBeGreaterThan(20);
  });
  it('newRival tạo đối thủ hợp lệ', () => {
    const r = rivals.newRival('Tiệm A', 50, 3, () => 0);
    expect(r).toMatchObject({ name: 'Tiệm A', strength: 50, openedDay: 3, personality: 'cutter' });
  });
});
