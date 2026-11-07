import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { newGameData, useGame } from '../core/store';
import { daySalesProfit } from '../core/dayStats';
import { setSimSeed, simRng } from '../core/rand';
import { CustomerManager } from '../agents/customers';
import { DINE_CHANCE, DINE_UNLOCK, DINE_WAIT_SECONDS, dineTip, TIP_RATE } from '../data/dineIn';
import { COOKED_PRODUCT_IDS } from '../data/recipes';

const mkFurniture = (uid: number, type: string, x: number, z: number) =>
  ({ uid, type, x, z, rot: 0, tiers: [] } as never);

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
  diningWait: 0,
  exitX: 5,
  position: new THREE.Vector3(0, 0, 0),
  path: [] as unknown[],
  plan: [] as (() => void)[],
  pause: 0,
  mesh: { position: new THREE.Vector3(0, 0, 0) },
  say: (t: string) => { said.push(t); },
});

describe('dineTip — công thức tip thuần (GĐ1492)', () => {
  it('phục vụ ngay: 10% tiền món tươi; chờ ≤ nửa ngưỡng vẫn đủ, chờ lâu còn 60% (GĐ1511)', () => {
    expect(TIP_RATE).toBe(0.1);
    expect(dineTip(30_000, 0)).toBe(3_000);
    expect(dineTip(30_000, DINE_WAIT_SECONDS / 2)).toBe(3_000);
    expect(dineTip(30_000, DINE_WAIT_SECONDS / 2 + 1)).toBe(1_800);
    expect(dineTip(30_000, DINE_WAIT_SECONDS)).toBe(1_800);
    expect(dineTip(0, 0)).toBe(0);
    expect(dineTip(-5, 0)).toBe(0);
  });
});

describe('tip đi vào két + sổ ngày khi khách ăn xong (GĐ1492)', () => {
  const manager = new CustomerManager({} as never, {
    findPath: () => [],
    approach: () => [],
  } as never, {
    local: (x: number, z: number) => new THREE.Vector3(x, 0, z),
    counters: () => [],
    doorOutside: new THREE.Vector3(0, 0, 10),
    doorInside: new THREE.Vector3(0, 0, 9),
  } as never) as unknown as {
    maybeDineIn: (c: ReturnType<typeof fakeCustomer>, counter?: never) => boolean;
    seatBusy: Set<number>;
    updateSeatWaiting: (c: ReturnType<typeof fakeCustomer>, gameDt: number) => void;
  };

  const seedTrúngQuay = () => {
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() < DINE_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
  };

  /** Quầy giả cho đường chờ ghế (chỉ dùng counter.pay). */
  const fakeCounter = { pay: new THREE.Vector3(0, 0, 0) } as never;

  beforeEach(() => {
    useGame.setState(newGameData());
    manager.seatBusy.clear();
    said.length = 0;
  });

  it('phục vụ ngay (không chờ): tip nguyên 10% vào money + stats.tips + doanh thu', () => {
    seedTrúngQuay();
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    const s0 = useGame.getState();
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.maybeDineIn(c as never, fakeCounter as never)).toBe(true);
    // Ăn xong: bước 2 của plan trả ghế + trả tip rồi ra về
    c.plan[0]!();
    c.plan[1]!();
    const s1 = useGame.getState();
    expect(s1.money).toBe(s0.money + 3_000);
    expect(s1.stats.tips ?? 0).toBe(3_000);
    expect(s1.stats.revenue).toBe(s0.stats.revenue + 3_000);
    expect(daySalesProfit(s1.stats)).toBe(daySalesProfit(s0.stats) + 3_000);
    expect(said.some((t) => t.includes('tip'))).toBe(true);
  });

  it('chờ ghế lâu (> nửa ngưỡng) mới ngồi: tip còn 60% (GĐ1511)', () => {
    seedTrúngQuay();
    // Ban đầu không có ghế → khách chờ; rồi ghế xuất hiện → ngồi sau 7s chờ
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0)] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.maybeDineIn(c as never, fakeCounter as never)).toBe(true);
    expect(c.seat).toBeUndefined();
    useGame.setState({ furniture: [mkFurniture(1, 'dining_table', 0, 0), mkFurniture(2, 'chair', 0.85, 0)] });
    manager.updateSeatWaiting(c as never, 7);
    expect(c.seat).toEqual({ tableUid: 1, chairUid: 2 });
    expect(c.diningWait).toBe(7);
    const s0 = useGame.getState();
    c.plan[0]!();
    c.plan[1]!();
    const s1 = useGame.getState();
    expect(s1.money).toBe(s0.money + 1_800);
    expect(s1.stats.tips ?? 0).toBe(1_800);
  });

  it('chờ quá DINE_WAIT_SECONDS → bỏ về buồn, ghi mất khách vì chờ, không tip', () => {
    seedTrúngQuay();
    useGame.setState({ level: DINE_UNLOCK, furniture: [mkFurniture(1, 'dining_table', 0, 0)] });
    const before = useGame.getState().stats.missed?.wait ?? 0;
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    manager.maybeDineIn(c as never, fakeCounter as never);
    const money0 = useGame.getState().money;
    manager.updateSeatWaiting(c as never, DINE_WAIT_SECONDS + 0.5);
    expect(c.state).toBe('leaving');
    expect(useGame.getState().stats.missed?.wait ?? 0).toBe(before + 1);
    expect(useGame.getState().money).toBe(money0);
  });
});
