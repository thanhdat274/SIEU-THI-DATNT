import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireTabLock } from '../tabLock';

/**
 * GĐ1496 — Khoá một tab duy nhất. Fake đúng phần Web Locks mình dùng: một tên khoá,
 * giữ bằng promise chưa resolve (giống callback của navigator.locks.request), nhả khi gọi release.
 */

type Release = () => void;
interface FakeLocks {
  request(name: string, opts: { ifAvailable?: boolean }, cb: (lock: unknown) => Promise<unknown> | undefined): Promise<unknown>;
  /** Nhả khoá (giả lập tab giữ khoá đóng/refresh — trình duyệt tự nhả). */
  releaseAll(): void;
  heldCount(): number;
}

function fakeLocks(): FakeLocks {
  const held = new Set<string>();
  return {
    request(name, opts, cb) {
      if (held.has(name)) {
        if (opts.ifAvailable) cb(null); // có người giữ + ifAvailable → trả null
        return Promise.resolve(null);
      }
      const ret = cb({ name });
      if (ret instanceof Promise) {
        held.add(name);
        // Đúng ngữ nghĩa Web Locks: promise của callback settle (nhả khoá) là trình duyệt trả khoá
        ret.then(() => held.delete(name), () => held.delete(name));
        return Promise.resolve(null);
      }
      return Promise.resolve(ret);
    },
    releaseAll() {
      held.clear(); // giả lập tab giữ khoá đóng đột ngột — trình duyệt thu hồi khoá
    },
    heldCount: () => held.size,
  };
}

/** Mỗi tab thật là một document riêng: xoá hook nhả-khoá trước khi nạp lại module mới. */
async function freshTab() {
  delete (globalThis as { __tabLockRelease?: unknown }).__tabLockRelease;
  vi.resetModules();
  return import('../tabLock');
}

afterEach(() => {
  // @ts-expect-error dọn stub navigator cho test khác
  delete globalThis.navigator;
  vi.resetModules();
});

describe('acquireTabLock — khoá 1 tab mỗi trình duyệt (GĐ1496)', () => {
  it('tab đầu giữ được khoá, tab thứ hai bị chặn', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { locks: fakeLocks() }, configurable: true });
    const tabA = await freshTab();
    await expect(tabA.acquireTabLock()).resolves.toBe(true);
    const tabB = await freshTab();
    await expect(tabB.acquireTabLock()).resolves.toBe(false);
  });

  it('tab giữ khoá đóng thì tab chặn bấm Thử lại vào được', async () => {
    const locks = fakeLocks();
    Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true });
    const tabA = await freshTab();
    await tabA.acquireTabLock();
    const tabB = await freshTab();
    await expect(tabB.acquireTabLock()).resolves.toBe(false);
    locks.releaseAll(); // tab A đóng — trình duyệt tự nhả khoá
    await expect(tabB.acquireTabLock()).resolves.toBe(true); // bấm Thử lại
  });

  it('HMR chạy lại module trên cùng trang: nhả khoá cũ rồi xin lại được (không tự khoá chính mình)', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: { locks: fakeLocks() }, configurable: true });
    const tabA = await freshTab();
    await tabA.acquireTabLock();
    // freshTab xoá hook nhả — giờ giả lập HMR: KHÔNG xoá, gọi lại module đang giữ khoá
    vi.resetModules();
    const samePage = await import('../tabLock');
    await expect(samePage.acquireTabLock()).resolves.toBe(true);
  });

  it('trình duyệt không hỗ trợ Web Locks thì bỏ qua khoá (không chặn người chơi)', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    await expect(acquireTabLock()).resolves.toBe(true);
  });

  it('API lỗi (request reject) thì mở khoá — không ai bị kẹt ngoài cửa', async () => {
    const broken: FakeLocks['request'] = () => Promise.reject(new Error('boom'));
    Object.defineProperty(globalThis, 'navigator', { value: { locks: { request: broken } }, configurable: true });
    await expect(acquireTabLock()).resolves.toBe(true);
  });

  it('giữ được khoá thì khoá còn được nắm tới khi nhả (không nhả sớm)', async () => {
    const locks = fakeLocks();
    Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true });
    const tabA = await freshTab();
    await tabA.acquireTabLock();
    expect(locks.heldCount()).toBe(1);
    locks.releaseAll();
    expect(locks.heldCount()).toBe(0);
  });
});
