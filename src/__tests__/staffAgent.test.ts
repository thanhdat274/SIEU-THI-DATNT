import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '../core/store';
import { setSimSeed, clearSimSeed } from '../core/rand';
import { resetStaffDay, staffDaySnapshot } from '../core/slices/staffDay';
import { furnitureDef } from '../data/furniture';
import { unlockedProducts } from '../data/products';
import { DIRT_PER_SWEEP, type Staff } from '../data/staff';
import { workSpeed } from '../data/staffTraits';

/**
 * Hành vi nhân viên trong tiệm (agents/staff.ts — StaffManager): trước đây chỉ có harness sim chạy
 * qua, không test riêng (coverage 0% khi bỏ sim). Chạy trên world 3D headless như simEconomy và
 * kiểm tra KẾT QUẢ người chơi thấy: ai đến/về đúng ca, thu ngân đứng quầy thì có tốc độ tính tiền
 * và cửa tự mở, lao công lau sàn, nhân viên kho bày kệ vơi, tự thay món hết, quản lý tự đặt hàng.
 */

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const stub2d = (): unknown => new Proxy({}, {
  get: (_t, prop) => {
    if (prop === 'measureText') return () => ({ width: 0 });
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') return () => ({ addColorStop: () => {} });
    return () => {};
  },
  set: () => true,
});
globalThis.document = {
  createElement: (tag: string) => (tag === 'canvas'
    ? { width: 0, height: 0, style: {}, getContext: () => stub2d(), toDataURL: () => '', addEventListener: () => {} }
    : {}) as unknown as HTMLElement,
  createElementNS: () => ({} as Element),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
} as unknown as Document;
(globalThis as { window?: unknown }).window = {
  addEventListener: () => {}, removeEventListener: () => {}, requestAnimationFrame: (f: FrameRequestCallback) => f(0), devicePixelRatio: 1,
};

type World = ReturnType<typeof import('../dev/simEconomy')['buildEconomyWorld']>;
let world: World;

const H = (h: number) => h * 60;
let nextId = 1;
const hire = (role: Staff['role'], shift: Staff['shift'] = 'full', skill = 3): Staff =>
  ({ id: nextId++, name: `NV${role}`, role, skill, wage: 0, shift });

/** Chạy StaffManager tới khi điều kiện đúng (tối đa `max` bước 0.4s game); trả về số bước đã chạy hoặc -1. */
const runUntil = (pred: () => boolean, max = 800, playerAtCounter = false) => {
  for (let i = 0; i < max; i++) {
    if (pred()) return i;
    world.staff.update(0.4, playerAtCounter);
  }
  return pred() ? max : -1;
};
const worker = (st: Staff) => world.staff.workers.get(st.id);

/** Món bày được trên kệ thường ở cấp 30 (2 món khác nhau để test thay món). */
const shelfProducts = () => {
  const def = furnitureDef('shelf');
  return unlockedProducts(30).filter((p) => def.categories.includes(p.category));
};

beforeEach(async () => {
  setSimSeed(7);
  const sim = await import('../dev/simEconomy');
  sim.seedLevel(30);
  world?.staff.reset();
  world = sim.buildEconomyWorld();
  useGame.setState({ minutes: H(9), staff: [], autoOpen: false, autoSwap: false, shopOpen: false, dirt: 0, customersInside: 0 });
});
afterAll(() => clearSimSeed());

describe('đến/về theo ca', () => {
  it('ngoài giờ ca thì không có mặt; vào ca thì đến tiệm và bắt đầu làm', () => {
    const st = hire('stocker', 'morning');
    useGame.setState({ staff: [st], minutes: H(5) });
    world.staff.update(0.4, false);
    expect(worker(st)).toBeUndefined();
    useGame.setState({ minutes: H(7) });
    expect(runUntil(() => worker(st)?.state === 'working')).toBeGreaterThanOrEqual(0);
  });

  it('hết ca thì về và biến khỏi bản đồ', () => {
    const st = hire('stocker', 'morning');
    useGame.setState({ staff: [st], minutes: H(7) });
    runUntil(() => worker(st)?.state === 'working');
    useGame.setState({ minutes: H(15) });
    world.staff.update(0.4, false);
    expect(worker(st)?.state).toBe('leaving');
    expect(runUntil(() => !worker(st))).toBeGreaterThanOrEqual(0);
  });

  it('bị cho nghỉ việc giữa ca: rời tiệm ngay', () => {
    const st = hire('cleaner');
    useGame.setState({ staff: [st] });
    runUntil(() => worker(st)?.state === 'working');
    useGame.setState({ staff: [] });
    world.staff.update(0.4, false);
    expect(worker(st)?.state).toBe('leaving');
    expect(runUntil(() => !worker(st))).toBeGreaterThanOrEqual(0);
  });

  it('làm thêm giờ: hết ca buổi tối mà còn khách trong tiệm thì ở lại; quá 23h30 thì vẫn về', () => {
    const st = hire('cashier', 'afternoon');
    useGame.setState({ staff: [st], minutes: H(15) });
    runUntil(() => worker(st)?.state === 'working');
    useGame.setState({ minutes: H(22.75), customersInside: 2 });
    world.staff.update(0.4, false);
    expect(worker(st)?.state).toBe('working');
    useGame.setState({ minutes: H(23.6) });
    world.staff.update(0.4, false);
    expect(worker(st)?.state).toBe('leaving');
  });

  it('phụ trại không xuất hiện trong tiệm (việc chạy ở cuối ngày)', () => {
    const st = hire('farmhand');
    useGame.setState({ staff: [st] });
    world.staff.update(0.4, false);
    expect(worker(st)?.state).toBe('working');
    expect(worker(st)?.mesh.visible).toBe(false);
  });

  it('reset (sang ngày mới) dọn hết nhân viên trên bản đồ', () => {
    useGame.setState({ staff: [hire('stocker'), hire('cleaner')] });
    world.staff.update(0.4, false);
    expect(world.staff.workers.size).toBe(2);
    world.staff.reset();
    expect(world.staff.workers.size).toBe(0);
  });
});

describe('thu ngân / bảo vệ', () => {
  it('thu ngân tới quầy thì có tốc độ tính tiền; bật tự mở cửa thì cửa mở', () => {
    const st = hire('cashier');
    useGame.setState({ staff: [st], autoOpen: true });
    expect(world.staff.cashierSpeed()).toBe(0);
    expect(runUntil(() => world.staff.cashierSpeed() > 0)).toBeGreaterThanOrEqual(0);
    world.staff.update(0.4, false);
    expect(useGame.getState().shopOpen).toBe(true);
  });

  it('thu ngân về (hết ca) mà người chơi không đứng quầy: cửa tự đóng', () => {
    const st = hire('cashier', 'morning');
    useGame.setState({ staff: [st], autoOpen: true, minutes: H(7) });
    runUntil(() => useGame.getState().shopOpen);
    useGame.setState({ minutes: H(15) });
    expect(runUntil(() => !useGame.getState().shopOpen)).toBeGreaterThanOrEqual(0);
  });

  it('2 thu ngân cùng 1 quầy: người giỏi tính tiền + người thứ hai phụ 50% tốc độ của họ', () => {
    expect(world.shop.counters().length).toBe(1); // ván seed chỉ có quầy chính
    const a = hire('cashier', 'full', 5);
    const b = hire('cashier', 'full', 1);
    useGame.setState({ staff: [a, b] });
    const full = workSpeed(a) + 0.5 * workSpeed(b);
    expect(runUntil(() => Math.abs(world.staff.cashierSpeed() - full) < 1e-9)).toBeGreaterThanOrEqual(0);
    expect(worker(a)!.post).toBe(worker(b)!.post);
    expect(worker(a)!.slot).not.toBe(worker(b)!.slot); // mỗi người một máy tính tiền
  });

  it('quầy đủ 2 người: thu ngân thứ 3 không chen vào (không cộng thêm tốc độ)', () => {
    const team = [hire('cashier', 'full', 5), hire('cashier', 'full', 4), hire('cashier', 'full', 3)];
    useGame.setState({ staff: team });
    const two = workSpeed(team[0]) + 0.5 * workSpeed(team[1]);
    runUntil(() => Math.abs(world.staff.cashierSpeed() - two) < 1e-9);
    for (let i = 0; i < 100; i++) world.staff.update(0.4, false);
    expect(world.staff.cashierSpeed()).toBeCloseTo(two, 9);
    expect(worker(team[2])!.post).toBeNull();
  });

  it('bảo vệ đứng trực ở cửa', () => {
    const st = hire('guard');
    useGame.setState({ staff: [st] });
    expect(world.staff.guardOnDuty()).toBe(false);
    expect(runUntil(() => world.staff.guardOnDuty())).toBeGreaterThanOrEqual(0);
  });
});

describe('lao công / kho / quản lý', () => {
  it('lao công: sàn bẩn (≥3) thì đi lau, bẩn giảm theo DIRT_PER_SWEEP × tay nghề', () => {
    const st = hire('cleaner');
    useGame.setState({ staff: [st], dirt: 20 });
    expect(runUntil(() => useGame.getState().dirt < 20)).toBeGreaterThanOrEqual(0);
    expect(20 - useGame.getState().dirt).toBeGreaterThanOrEqual(DIRT_PER_SWEEP * 0.5);
  });

  it('lao công: sàn sạch (<3) thì nghỉ, không lau', () => {
    const st = hire('cleaner');
    useGame.setState({ staff: [st], dirt: 2 });
    runUntil(() => worker(st)?.state === 'working');
    for (let i = 0; i < 100; i++) world.staff.update(0.4, false);
    expect(useGame.getState().dirt).toBe(2);
  });

  it('nhân viên kho: tầng kệ vơi mà kho còn hàng thì đi lấy hàng bày lại', () => {
    const [p] = shelfProducts();
    const def = furnitureDef('shelf');
    const s = useGame.getState();
    const f = s.furniture[0];
    const tiers = f.tiers.map((t, i) => (i === 0 ? { ...t, productId: p.id, count: 0, lots: [] } : t));
    useGame.setState({
      furniture: s.furniture.map((it) => (it.uid === f.uid ? { ...it, tiers } : it)),
      storage: { ...s.storage, [p.id]: 50 },
      staff: [hire('stocker')],
    });
    const tierCount = () => useGame.getState().furniture.find((it) => it.uid === f.uid)!.tiers[0].count;
    expect(runUntil(() => tierCount() > 0, 1500)).toBeGreaterThanOrEqual(0);
    expect(tierCount()).toBeLessThanOrEqual(def.capacity);
    expect(useGame.getState().storage[p.id]).toBeLessThan(50); // hàng lấy từ kho ra, không tự sinh
  });

  it('kệ hết sạch + kho hết món đó + bật tự thay món: đổi sang món khác kho còn', () => {
    const [p, q] = shelfProducts();
    const s = useGame.getState();
    const f = s.furniture[0];
    const tiers = f.tiers.map((t, i) => (i === 0 ? { ...t, productId: p.id, count: 0, lots: [] } : t));
    useGame.setState({
      furniture: s.furniture.map((it) => (it.uid === f.uid ? { ...it, tiers } : it)),
      storage: { [q.id]: 30 }, deliveries: [], autoSwap: true,
      staff: [hire('stocker')],
    });
    const tier = () => useGame.getState().furniture.find((it) => it.uid === f.uid)!.tiers[0];
    expect(runUntil(() => tier().productId !== p.id, 1500)).toBeGreaterThanOrEqual(0);
    expect(tier().productId).toBe(q.id);
  });

  it('tắt tự thay món: kệ hết hàng vẫn để nguyên món cũ', () => {
    const [p, q] = shelfProducts();
    const s = useGame.getState();
    const f = s.furniture[0];
    const tiers = f.tiers.map((t, i) => (i === 0 ? { ...t, productId: p.id, count: 0, lots: [] } : t));
    useGame.setState({
      furniture: s.furniture.map((it) => (it.uid === f.uid ? { ...it, tiers } : it)),
      storage: { [q.id]: 30 }, deliveries: [], autoSwap: false,
      staff: [hire('stocker')],
    });
    for (let i = 0; i < 400; i++) world.staff.update(0.4, false);
    expect(useGame.getState().furniture.find((it) => it.uid === f.uid)!.tiers[0].productId).toBe(p.id);
  });

  it('quản lý: không có thu ngân thì tự đứng quầy tính tiền giúp', () => {
    useGame.setState({ staff: [hire('manager')] });
    expect(runUntil(() => world.staff.cashierSpeed() > 0)).toBeGreaterThanOrEqual(0);
  });

  it('quản lý: tới giờ kiểm kho (7h) thì tự đặt món đã từng bán mà kho sắp cạn', () => {
    const [p] = shelfProducts();
    const s = useGame.getState();
    const f = s.furniture[0];
    const tiers = f.tiers.map((t, i) => (i === 0 ? { ...t, productId: p.id, count: 5 } : t));
    const cashier = hire('cashier');
    useGame.setState({
      minutes: H(7.5), money: 50_000_000,
      furniture: s.furniture.map((it) => (it.uid === f.uid ? { ...it, tiers } : it)),
      storage: { [p.id]: 0 }, deliveries: [], sales: { [p.id]: 10 }, salesToday: {},
      staff: [cashier, hire('manager')],
    });
    const before = useGame.getState().money;
    const ordered = () => useGame.getState().deliveries.length > 0
      || (useGame.getState().storage[p.id] ?? 0) > 0 || useGame.getState().money < before;
    expect(runUntil(ordered, 2000)).toBeGreaterThanOrEqual(0);
  });

  it('quản lý: món CHƯA từng bán thì không tự đặt (món mới do chủ quyết)', () => {
    const [p] = shelfProducts();
    const s = useGame.getState();
    const f = s.furniture[0];
    const tiers = f.tiers.map((t, i) => (i === 0 ? { ...t, productId: p.id, count: 5 } : t));
    const others = s.furniture.filter((it) => it.uid !== f.uid).map((it) => ({ ...it, tiers: it.tiers.map((t) => ({ ...t, productId: null, count: 0, lots: [] })) }));
    useGame.setState({
      minutes: H(7.5), money: 50_000_000,
      furniture: [{ ...f, tiers: tiers.map((t, i) => (i === 0 ? t : { ...t, productId: null, count: 0, lots: [] })) }, ...others] as never,
      storage: {}, deliveries: [], sales: {}, salesToday: {},
      staff: [hire('cashier'), hire('manager')],
    });
    const before = useGame.getState().money;
    for (let i = 0; i < 600; i++) world.staff.update(0.4, false);
    expect(useGame.getState().deliveries.length).toBe(0);
    expect(useGame.getState().money).toBe(before);
  });
});

describe('GĐ246: đếm thời gian làm/rảnh trong ca (staffDay transient)', () => {
  it('xếp hàng không có việc (kệ đầy, kho trống) → gần như toàn bộ vào cột RẢNH', () => {
    resetStaffDay();
    const st = hire('stocker');
    const s = useGame.getState();
    // Dọn sạch kệ + kho: không còn việc bày hàng nào
    const emptyFurniture = s.furniture.map((it) => ({ ...it, tiers: it.tiers.map((t) => ({ ...t, productId: null, count: 0, lots: [] })) }));
    useGame.setState({ furniture: emptyFurniture as never, storage: {}, deliveries: [] });
    useGame.setState({ staff: [st] });
    runUntil(() => worker(st)?.state === 'working');
    for (let i = 0; i < 100; i++) world.staff.update(0.4, false); // 40s game
    const stat = staffDaySnapshot()[st.id];
    expect(stat).toBeDefined();
    expect(stat.idleSec).toBeGreaterThan(30); // đứng không gần hết 40s
    expect(stat.idleSec).toBeGreaterThan(stat.workSec * 5);
  });

  it('có việc (các kệ vơi + kho còn hàng) → cột LÀM vượt cột rảnh', () => {
    resetStaffDay();
    const st = hire('stocker');
    const prods = shelfProducts();
    const s = useGame.getState();
    // Mọi tầng của mọi kệ đều vơi + kho dư → chuỗi việc bày hàng dài, không kịp nghỉ
    const storage: Record<string, number> = {};
    const furniture = s.furniture.map((it) => ({
      ...it,
      tiers: it.tiers.map((t, i) => {
        const p = prods[i % prods.length];
        storage[p.id] = 500;
        return { ...t, productId: p.id, count: 0, lots: [] };
      }),
    }));
    useGame.setState({ furniture: furniture as never, storage, deliveries: [], staff: [st] });
    runUntil(() => worker(st)?.state === 'working');
    for (let i = 0; i < 300; i++) world.staff.update(0.4, false); // 120s game: liên tục lấy-bày
    const stat = staffDaySnapshot()[st.id];
    expect(stat).toBeDefined();
    expect(stat.workSec).toBeGreaterThan(10); // đi lấy hàng + bày kệ
    expect(stat.workSec).toBeGreaterThan(stat.idleSec);
  });

  it('resetStaffDay (đóng Sổ đầu ngày) xoá số liệu đếm của agent', () => {
    resetStaffDay();
    const st = hire('stocker');
    useGame.setState({ staff: [st], storage: {} });
    runUntil(() => worker(st)?.state === 'working');
    for (let i = 0; i < 50; i++) world.staff.update(0.4, false);
    expect(Object.keys(staffDaySnapshot()).length).toBeGreaterThan(0);
    resetStaffDay();
    expect(staffDaySnapshot()).toEqual({});
  });
});
