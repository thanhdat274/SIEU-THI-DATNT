import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { newGameData, useGame, type Furniture } from '../core/store';
import { setSimSeed, simRng } from '../core/rand';
import { CustomerManager } from '../agents/customers';
import { DINE_CHANCE, DINE_UNLOCK, EAT_SECONDS, wantsDineIn } from '../data/dineIn';
import { COOKED_PRODUCT_IDS } from '../data/recipes';

const mkFurniture = (uid: number, type: string, x: number, z: number): Furniture =>
  ({ uid, type, x, z, rot: 0, tiers: [] } as unknown as Furniture);

/** Khách giả đủ trường mà maybeDineIn/leave động tới (theo mẫu harness counterPolicy). */
const said: string[] = [];
const fakeCustomer = (basket: { id: string; price: number }[]) => ({
  basket,
  state: 'queued' as string,
  missing: 0,
  missed: [] as { id: string; why: string }[],
  waitedMinutes: 0,
  patience: 45,
  regular: null,
  profession: null,
  wholesale: false,
  offered: false,
  counterKey: null as string | null,
  seat: undefined as { tableUid: number; chairUid: number } | undefined,
  exitX: 5,
  position: new THREE.Vector3(0, 0, 0),
  path: [] as unknown[],
  plan: [] as (() => void)[],
  pause: 0,
  say: (t: string) => { said.push(t); },
});

describe('wantsDineIn — quyết định thuần (GĐ1491)', () => {
  it('đủ cấp + món nấu tươi + trúng chance', () => {
    expect(wantsDineIn({ level: DINE_UNLOCK, hasCooked: true, roll: DINE_CHANCE - 0.01 })).toBe(true);
    expect(wantsDineIn({ level: DINE_UNLOCK, hasCooked: true, roll: DINE_CHANCE })).toBe(false);
  });
  it('thiếu cấp hoặc không có món nấu tươi thì không ngồi lại', () => {
    expect(wantsDineIn({ level: DINE_UNLOCK - 1, hasCooked: true, roll: 0 })).toBe(false);
    expect(wantsDineIn({ level: DINE_UNLOCK, hasCooked: false, roll: 0 })).toBe(false);
  });
  it('hằng số: mở tại cấp 30, chance 0,3, ăn 8 giây game', () => {
    expect(DINE_UNLOCK).toBe(30);
    expect(DINE_CHANCE).toBe(0.3);
    expect(EAT_SECONDS).toBeGreaterThan(0);
  });
});

describe('maybeDineIn — hành trình ăn tại chỗ qua CustomerManager', () => {
  const manager = new CustomerManager({} as never, {
    findPath: () => [],
    approach: () => [],
  } as never, {
    local: (x: number, z: number) => new THREE.Vector3(x, 0, z),
    counters: () => [],
    doorOutside: new THREE.Vector3(0, 0, 10),
    doorInside: new THREE.Vector3(0, 0, 9),
  } as never) as unknown as {
    maybeDineIn: (c: ReturnType<typeof fakeCustomer>) => boolean;
    seatBusy: Set<number>;
    leave: (c: ReturnType<typeof fakeCustomer>, happy: boolean, paid?: boolean) => void;
  };

  beforeEach(() => {
    useGame.setState(newGameData());
    manager.seatBusy.clear();
    said.length = 0;
  });

  it('món tươi + có ghế + trúng chance → giữ ghế, đi tới bàn, ăn xong mới ra về', () => {
    // Quét seed để lần rút đầu của maybeDineIn nhỏ hơn DINE_CHANCE (định tất định theo seed)
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() < DINE_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    const ok = manager.maybeDineIn(c as never);
    expect(ok).toBe(true);
    expect(c.state).toBe('toSeat');
    expect(c.seat).toEqual({ tableUid: 1, chairUid: 2 });
    expect(manager.seatBusy.has(2)).toBe(true);
    expect(c.plan).toHaveLength(2);
    // Giả lập ăn xong: bước 1 bắt đầu pause, bước 2 trả ghế rồi ra về
    c.plan[0]!();
    expect(c.state).toBe('dining');
    expect(c.pause).toBe(EAT_SECONDS);
    c.plan[1]!();
    expect(manager.seatBusy.has(2)).toBe(false);
    expect(c.seat).toBeUndefined();
    expect(c.state).toBe('leaving');
  });

  it('hết ghế → bỏ về buồn, ghi mất khách vì chờ', () => {
    // Quét seed để khách trúng vòng quay muốn ngồi lại (rồi mới đụng chuyện hết ghế)
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() < DINE_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0)] }); // bàn không ghế
    const before = useGame.getState().stats.missed?.wait ?? 0;
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    const ok = manager.maybeDineIn(c as never);
    expect(ok).toBe(true);
    expect(c.state).toBe('leaving');
    expect(said.some((t) => t.includes('😤'))).toBe(true);
    expect(manager.seatBusy.size).toBe(0);
    expect(useGame.getState().stats.missed?.wait ?? 0).toBe(before + 1);
  });

  it('không có món nấu tươi → không đụng ghế, cứ ra về như thường', () => {
    setSimSeed(7);
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    const c = fakeCustomer([{ id: 'nuoc', price: 10_000 }]);
    expect(manager.maybeDineIn(c as never)).toBe(false);
    expect(c.state).toBe('queued');
    expect(manager.seatBusy.size).toBe(0);
  });

  it('dưới cấp mở khu ăn thì không bao giờ ngồi lại (kể cả có bàn ghế)', () => {
    setSimSeed(11);
    useGame.setState({ level: DINE_UNLOCK - 1, furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.maybeDineIn(c as never)).toBe(false);
    expect(c.state).toBe('queued');
  });

  it('đủ ghế nhưng trượt vòng quay → không ngồi lại, không giữ ghế', () => {
    // Quét seed để lần rút đầu ≥ DINE_CHANCE
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() >= DINE_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.maybeDineIn(c as never)).toBe(false);
    expect(c.state).toBe('queued');
    expect(manager.seatBusy.size).toBe(0);
  });
});
