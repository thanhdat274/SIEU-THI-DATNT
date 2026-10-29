import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Lớp lưu thật của save.ts (IndexedDB + localStorage + backup + bản hỏng) — đường mà sai là người
 * chơi mất tiệm. Trước đây chỉ snapshot/applySnapshot có test (coverage save.ts 48%).
 * IndexedDB giả bằng Map trong bộ nhớ (mock dexie); localStorage giả bằng Map; mỗi test nạp lại
 * module save.ts (vi.resetModules) để bản sao main/backup trong module bắt đầu sạch.
 */

const idb = new Map<string, unknown>();
let idbFails = false;
vi.mock('dexie', () => {
  const table = {
    bulkGet: async (ids: string[]) => {
      if (idbFails) throw new Error('IndexedDB bị chặn');
      return ids.map((id) => structuredClone(idb.get(id)));
    },
    put: async (row: { id: string }) => { idb.set(row.id, structuredClone(row)); },
    bulkPut: async (rows: { id: string }[]) => { for (const r of rows) idb.set(r.id, structuredClone(r)); },
    clear: async () => { idb.clear(); },
  };
  // Như Dexie thật: bảng gắn vào instance lúc gọi version().stores() (sau khi field `saves!` của lớp con đã khởi tạo)
  class Dexie {
    constructor(_name: string) {}
    version() { return { stores: () => { (this as unknown as { saves: typeof table }).saves = table; } }; }
  }
  return { default: Dexie };
});

const ls = new Map<string, string>();
let lsThrows = false;
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => ls.get(k) ?? null,
  setItem: (k: string, v: string) => { if (lsThrows) throw new Error('QuotaExceeded'); ls.set(k, v); },
  removeItem: (k: string) => { ls.delete(k); },
};

type SaveMod = typeof import('../core/save');
type StoreMod = typeof import('../core/store');
let save: SaveMod;
let store: StoreMod;

/** Chờ hàng đợi ghi IndexedDB chạy xong (queue là chuỗi promise trong module). */
const flushWrites = () => new Promise((r) => setTimeout(r, 0));

const row = (id: string, savedAt: number, data: Record<string, unknown>) => ({
  id, savedAt, data: { ...store.newGameData(), ...data },
});

beforeEach(async () => {
  idb.clear();
  ls.clear();
  idbFails = false;
  lsThrows = false;
  vi.resetModules();
  vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { if (process.env.SHOWWARN) process.stderr.write(`WARN ${String(a[1] ?? a[0])}\n`); });
  store = await import('../core/store');
  save = await import('../core/save');
  store.useGame.setState(store.newGameData());
});

describe('initSaves — chọn bản lưu khi mở game', () => {
  it('chưa có gì: không có bản chính, loadGame trả false (vào ván mới)', async () => {
    await save.initSaves();
    expect(save.readLocalSave()).toBeNull();
    expect(save.loadGame()).toBe(false);
  });

  it('bản chính hợp lệ: nạp được đúng tiền/ngày', async () => {
    idb.set('main', row('main', 100, { day: 12, money: 3_456_000, level: 7 }));
    await save.initSaves();
    expect(save.loadGame()).toBe(true);
    const s = store.useGame.getState();
    expect([s.day, s.money, s.level]).toEqual([12, 3_456_000, 7]);
  });

  it('bản chính HỎNG: cất sang "corrupt" (không mất để cứu tay) và dùng bản backup', async () => {
    idb.set('main', { id: 'main', savedAt: 200, data: { day: 0, money: NaN, level: 1, furniture: null } });
    idb.set('backup', row('backup', 100, { day: 9, money: 900_000 }));
    await save.initSaves();
    await flushWrites();
    expect(idb.get('corrupt')).toBeTruthy();
    expect(save.readLocalSave()?.data.day).toBe(9);
    expect(save.loadGame()).toBe(true);
    expect(store.useGame.getState().money).toBe(900_000);
    // Backup được chép lên làm bản chính trong IndexedDB
    expect((idb.get('main') as { data: { day: number } }).data.day).toBe(9);
  });

  it.each([
    ['ngày < 1', { day: 0 }],
    ['tiền không hữu hạn', { money: Infinity }],
    ['cấp không nguyên', { level: 1.5 }],
    ['furniture không phải mảng', { furniture: {} }],
  ])('isValid loại bản lưu: %s', async (_name, bad) => {
    idb.set('main', row('main', 100, bad));
    await save.initSaves();
    expect(save.readLocalSave()).toBeNull();
  });

  it('bản khẩn cấp (localStorage, ghi lúc đóng tab) MỚI hơn IndexedDB thì thắng; bản cũ khác ngày thành backup', async () => {
    idb.set('main', row('main', 100, { day: 5, money: 500_000 }));
    ls.set('taphoa3d-emergency', JSON.stringify(row('main', 200, { day: 6, money: 600_000 })));
    await save.initSaves();
    await flushWrites();
    expect(save.readLocalSave()?.data.day).toBe(6);
    expect(save.readBackupSave()?.data.day).toBe(5);
    expect(ls.size).toBe(0); // dọn localStorage sau khi chuyển vào IndexedDB
    expect((idb.get('main') as { data: { day: number } }).data.day).toBe(6);
  });

  it('bản khẩn cấp CŨ hơn IndexedDB: bỏ qua, giữ bản IndexedDB', async () => {
    idb.set('main', row('main', 300, { day: 8 }));
    ls.set('taphoa3d-emergency', JSON.stringify(row('main', 200, { day: 7 })));
    await save.initSaves();
    expect(save.readLocalSave()?.data.day).toBe(8);
  });

  it('bản lưu đời localStorage cũ (trước IndexedDB) được chuyển sang', async () => {
    ls.set('taphoa3d-save-v1', JSON.stringify(row('x', 50, { day: 3, money: 123_000 })));
    await save.initSaves();
    await flushWrites();
    expect(save.readLocalSave()?.data.money).toBe(123_000);
    expect(idb.get('main')).toBeTruthy();
    expect(ls.size).toBe(0);
  });

  it('localStorage chứa JSON hỏng: không sập, bỏ qua', async () => {
    ls.set('taphoa3d-emergency', '{hỏng');
    idb.set('main', row('main', 100, { day: 4 }));
    await expect(save.initSaves()).resolves.toBeUndefined();
    expect(save.readLocalSave()?.data.day).toBe(4);
  });

  it('IndexedDB bị chặn: không sập, vẫn cứu được bản khẩn cấp trong localStorage', async () => {
    idbFails = true;
    ls.set('taphoa3d-emergency', JSON.stringify(row('main', 200, { day: 11 })));
    await expect(save.initSaves()).resolves.toBeUndefined();
    expect(save.readLocalSave()?.data.day).toBe(11);
  });
});

describe('saveGame — tự lưu và bản backup cuối ngày', () => {
  it('lưu nhiều lần CÙNG ngày: backup không đổi (backup luôn là cuối ngày hôm qua)', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 3, money: 100 });
    save.saveGame();
    store.useGame.setState({ day: 3, money: 200 });
    save.saveGame();
    expect(save.readBackupSave()).toBeNull();
    expect(save.readLocalSave()?.data.money).toBe(200);
  });

  it('sang ngày mới: bản của hôm trước thành backup', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 3, money: 100 });
    save.saveGame();
    store.useGame.setState({ day: 4, money: 999 });
    save.saveGame();
    await flushWrites();
    expect(save.readBackupSave()?.data.day).toBe(3);
    expect((idb.get('backup') as { data: { day: number } }).data.day).toBe(3);
    expect((idb.get('main') as { data: { money: number } }).data.money).toBe(999);
  });

  it('ghi IndexedDB theo đúng thứ tự gọi — bản cũ không đè bản mới', async () => {
    await save.initSaves();
    for (let m = 1; m <= 5; m++) {
      store.useGame.setState({ money: m * 1000 });
      save.saveGame();
    }
    await flushWrites();
    expect((idb.get('main') as { data: { money: number } }).data.money).toBe(5000);
  });

  it('emergency (đóng tab): ghi thêm localStorage đồng bộ; localStorage đầy thì trả false, không sập', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 2, money: 4242 });
    expect(save.saveGame(true)).toBe(true);
    expect(JSON.parse(ls.get('taphoa3d-emergency')!).data.money).toBe(4242);
    lsThrows = true;
    expect(save.saveGame(true)).toBe(false);
    expect(save.saveGame()).toBe(true); // lưu thường không đụng localStorage
  });

  it('vòng tròn: lưu → mở lại game (module mới) → nạp ra đúng trạng thái', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 21, money: 7_777_000, level: 15, xp: 42 });
    save.saveGame();
    await flushWrites();
    vi.resetModules();
    store = await import('../core/store');
    save = await import('../core/save');
    store.useGame.setState(store.newGameData());
    await save.initSaves();
    expect(save.loadGame()).toBe(true);
    const s = store.useGame.getState();
    expect([s.day, s.money, s.level, s.xp]).toEqual([21, 7_777_000, 15, 42]);
  });
});

describe('restoreBackup / resetGame', () => {
  it('không có backup: trả false, không đổi gì', async () => {
    await save.initSaves();
    store.useGame.setState({ money: 555 });
    expect(save.restoreBackup()).toBe(false);
    expect(store.useGame.getState().money).toBe(555);
  });

  it('quay về hôm qua; khôi phục lần nữa thì trở lại như cũ (không mất bản đang chơi)', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 5, money: 500 });
    save.saveGame();
    store.useGame.setState({ day: 6, money: 600 });
    save.saveGame();
    expect(save.restoreBackup()).toBe(true);
    expect(store.useGame.getState().day).toBe(5);
    expect(save.restoreBackup()).toBe(true);
    expect([store.useGame.getState().day, store.useGame.getState().money]).toEqual([6, 600]);
  });

  it('resetGame: xóa sạch IndexedDB + localStorage, về ván mới', async () => {
    await save.initSaves();
    store.useGame.setState({ day: 9, money: 9 });
    save.saveGame(true);
    save.resetGame();
    await flushWrites();
    expect(idb.size).toBe(0);
    expect(ls.size).toBe(0);
    expect(save.readLocalSave()).toBeNull();
    expect(store.useGame.getState().day).toBe(store.newGameData().day);
  });
});

describe('migrate 1→2 — bản lưu đời cũ', () => {
  it('chuồng gà cũ → chuồng theo loài; kệ kho cũ trong tiệm → gỡ + hoàn tiền; ca "cả ngày" → ca sáng; bù hạt giống thời tiết', () => {
    const old = {
      day: 10, money: 1_000_000, level: 5,
      garden: { ...store.newGameData().garden, coop: { chickens: 4, fedDay: 9, eggs: 3, feedKg: 2 } },
      furniture: [
        { uid: 1, type: 'shelf', x: 0, z: 0, rot: 0, tiers: [] },
        { uid: 2, type: 'stockRack', x: 1, z: 0, rot: 0, tiers: [] },
        { uid: 3, type: 'coldStorage', x: 2, z: 0, rot: 0, tiers: [] },
      ],
      branch: { staff: [{ shift: 'full' }, { shift: 'night' }] },
    } as unknown as Parameters<SaveMod['applySnapshot']>[0];
    delete (old as { weatherSeed?: number }).weatherSeed;
    save.applySnapshot(old);
    const s = store.useGame.getState();
    const pens = (s.garden as unknown as { pens: Record<string, { count: number; pending: number }> }).pens;
    expect(pens.chicken.count).toBe(4);
    expect(pens.chicken.pending).toBe(3);
    expect(s.furniture.map((f) => f.type)).toEqual(['shelf']);
    expect(s.money).toBe(1_000_000 + 200_000 + 250_000);
    expect(s.branch!.staff.map((x) => x.shift)).toEqual(['morning', 'night']);
    expect(typeof s.weatherSeed).toBe('number');
    expect(s.forecast.length).toBeGreaterThan(0);
  });

  it('bản đã ở phiên bản mới: không chạy lại bước nâng (không hoàn tiền kệ kho lần 2)', () => {
    save.applySnapshot({
      ...store.newGameData(), saveVersion: save.SAVE_VERSION, money: 1000,
      furniture: [{ uid: 1, type: 'stockRack', x: 0, z: 0, rot: 0, tiers: [] }] as never,
    });
    expect(store.useGame.getState().money).toBe(1000);
  });
});
