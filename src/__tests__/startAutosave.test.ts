import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * startAutosave (save.ts) — vòng tự lưu khi đang chơi, phần duy nhất của lớp lưu chưa có test.
 * Sai ở đây là mất tiệm: ghi lúc đang ở màn đăng nhập (chưa nạp bản lưu) sẽ đè bản thật, và
 * lưu mỗi khung hình vì đồng hồ chạy thì làm nghẽn IndexedDB. Dexie/localStorage/window giả như saveStore.test.
 */

const idb = new Map<string, { id: string; savedAt: number }>();
vi.mock('dexie', () => {
  const table = {
    bulkGet: async (ids: string[]) => ids.map((id) => idb.get(id)),
    put: async (row: { id: string; savedAt: number }) => { idb.set(row.id, row); },
    bulkPut: async (rows: { id: string; savedAt: number }[]) => { for (const r of rows) idb.set(r.id, r); },
    clear: async () => { idb.clear(); },
  };
  class Dexie {
    constructor(_name: string) {}
    version() { return { stores: () => { (this as unknown as { saves: typeof table }).saves = table; } }; }
  }
  return { default: Dexie };
});

const ls = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => ls.get(k) ?? null,
  setItem: (k: string, v: string) => { ls.set(k, v); },
  removeItem: (k: string) => { ls.delete(k); },
};

const winHandlers = new Map<string, () => void>();
const docHandlers = new Map<string, () => void>();
let visibility = 'visible';
(globalThis as { window?: unknown }).window = { addEventListener: (t: string, h: () => void) => winHandlers.set(t, h) };
(globalThis as { document?: unknown }).document = {
  addEventListener: (t: string, h: () => void) => docHandlers.set(t, h),
  get visibilityState() { return visibility; },
};

type SaveMod = typeof import('../core/save');
type StoreMod = typeof import('../core/store');
let save: SaveMod;
let store: StoreMod;
let canSave = true;
const onCloud = vi.fn();

const saved = () => idb.get('main')?.savedAt;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  idb.clear();
  ls.clear();
  winHandlers.clear();
  docHandlers.clear();
  visibility = 'visible';
  canSave = true;
  onCloud.mockClear();
  vi.resetModules();
  store = await import('../core/store');
  save = await import('../core/save');
  store.useGame.setState(store.newGameData());
  save.startAutosave(() => canSave, onCloud);
});

afterEach(() => { vi.useRealTimers(); });

describe('startAutosave — gộp lần ghi, chặn khi chưa được phép lưu', () => {
  it('đổi dữ liệu thật: gộp trong 1 giây rồi ghi đúng 1 lần', async () => {
    store.useGame.setState({ money: 123 });
    store.useGame.setState({ money: 456 });
    expect(saved()).toBeUndefined(); // chưa tới 1 giây
    await vi.advanceTimersByTimeAsync(1000);
    expect(idb.get('main')).toBeDefined();
    expect((idb.get('main') as unknown as { data: { money: number } }).data.money).toBe(456);
  });

  it('chỉ đồng hồ chạy (minutes): không hẹn ghi 1 giây — để mốc 30 giây lo', async () => {
    store.useGame.setState({ minutes: store.useGame.getState().minutes + 1 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(idb.get('main')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(30000); // mốc 30 giây vẫn ghi vì dữ liệu đã bẩn
    expect(idb.get('main')).toBeDefined();
  });

  it('canSave=false (màn đăng nhập / khách phòng người khác): KHÔNG ghi gì, kể cả khi đóng tab', async () => {
    canSave = false;
    store.useGame.setState({ money: 999 });
    await vi.advanceTimersByTimeAsync(31000);
    winHandlers.get('pagehide')!();
    expect(idb.get('main')).toBeUndefined();
    expect(ls.size).toBe(0);
    expect(onCloud).not.toHaveBeenCalled();
  });

  it('chưa có thay đổi nào: mốc 30 giây không ghi thừa', async () => {
    await vi.advanceTimersByTimeAsync(31000);
    expect(idb.get('main')).toBeUndefined();
  });
});

describe('startAutosave — rời tab và đẩy cloud', () => {
  it('đóng tab (pagehide): ghi ngay + bản khẩn cấp vào localStorage + đẩy cloud', async () => {
    store.useGame.setState({ money: 777 });
    winHandlers.get('pagehide')!();
    expect(ls.size).toBe(1);
    expect(onCloud).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(idb.get('main')).toBeDefined();
  });

  it('ẩn tab (visibilitychange=hidden) cũng như đóng; hiện lại thì không ghi', () => {
    store.useGame.setState({ money: 5 });
    visibility = 'visible';
    docHandlers.get('visibilitychange')!();
    expect(ls.size).toBe(0);
    visibility = 'hidden';
    docHandlers.get('visibilitychange')!();
    expect(ls.size).toBe(1);
  });

  it('cloud thưa: chỉ đẩy khi có thay đổi, mỗi phút một lần', async () => {
    store.useGame.setState({ money: 1 });
    await vi.advanceTimersByTimeAsync(1000); // ghi máy → cloudDirty
    await vi.advanceTimersByTimeAsync(60000);
    expect(onCloud).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60000); // không đổi gì thêm → không đẩy lại
    expect(onCloud).toHaveBeenCalledTimes(1);
  });
});
