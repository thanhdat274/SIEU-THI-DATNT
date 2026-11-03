import { describe, expect, it, vi } from 'vitest';

vi.mock('../net/firebase', () => ({ idToken: async () => null }));
import { createAlley, joinAlley, listAlleys, quitAlley } from '../net/alleyApi';

describe('GĐ975 — net/alleyApi tách khỏi net/coop', () => {
  it('chưa đăng nhập thì mọi lệnh REST báo cần đăng nhập', async () => {
    for (const call of [listAlleys(), createAlley('x'), joinAlley('abc'), quitAlley('id')]) {
      await expect(call).rejects.toThrow(/đăng nhập/);
    }
  });
});
