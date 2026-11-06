import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { newGameData, useGame, type Furniture } from '../core/store';
import { setSimSeed, simRng } from '../core/rand';
import { CustomerManager } from '../agents/customers';
import {
  TOILET_NEED_CHANCE, TOILET_STRICT_UNLOCK, TOILET_TYPES, TOILET_USE_SECONDS, freeToilet, isToilet, toiletFee,
} from '../data/dineIn';
import { FURNITURE } from '../data/furniture';
import { DINE_CHANCE, DINE_UNLOCK } from '../data/dineIn';
import { COOKED_PRODUCT_IDS } from '../data/recipes';

const mk = (uid: number, type: string, extra: Record<string, unknown> = {}): Furniture =>
  ({ uid, type, x: 0, z: 0, rot: 0, tiers: [], ...extra } as unknown as Furniture);

const said: string[] = [];
const fakeCustomer = (basket: { id: string; price: number }[]) => ({
  basket,
  state: 'dining' as string,
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
  mesh: { position: new THREE.Vector3(0, 0, 0) },
  path: [] as unknown[],
  plan: [] as (() => void)[],
  pause: 0,
  say: (t: string) => { said.push(t); },
});

describe('toilet — dữ liệu (GĐ1494)', () => {
  it('3 bậc bồn trong FURNITURE, hoàn vốn CHẬM ~500 lượt (tiện ích, không phải máy kiếm lời)', () => {
    for (const [id, def] of Object.entries(TOILET_TYPES)) {
      const furn = FURNITURE.find((f) => f.type === id);
      expect(furn, `thiếu bồn ${id}`).toBeTruthy();
      const payback = furn!.price / def.fee;
      expect(payback).toBeGreaterThanOrEqual(450);
      expect(payback).toBeLessThanOrEqual(650);
    }
  });
  it('isToilet/toiletFee theo bảng; 20% khách cần, 4 giây/lượt, mốc nghiêm ngặt cấp 45', () => {
    expect(isToilet('toilet_squat')).toBe(true);
    expect(isToilet('toilet_squat' as never)).toBe(true);
    expect(toiletFee('toilet_squat')).toBe(500);
    expect(toiletFee('toilet_porcelain')).toBe(2_000);
    expect(toiletFee('toilet_smart')).toBe(8_000);
    expect(toiletFee('shelf')).toBe(0);
    expect(TOILET_NEED_CHANCE).toBe(0.2);
    expect(TOILET_USE_SECONDS).toBe(4);
    expect(TOILET_STRICT_UNLOCK).toBe(45);
  });
  it('freeToilet bỏ bồn bận/hỏng', () => {
    const furn = [mk(1, 'toilet_squat'), mk(2, 'toilet_squat', { broken: true })];
    expect(freeToilet(furn as never, new Set())?.uid).toBe(1);
    expect(freeToilet(furn as never, new Set([1]))).toBeNull();
  });
});

describe('toiletNeed — hành trình vệ sinh sau bữa ăn (GĐ1494)', () => {
  const manager = new CustomerManager({} as never, {
    findPath: () => [],
    approach: () => [],
  } as never, {
    local: (x: number, z: number) => new THREE.Vector3(x, 0, z),
    counters: () => [],
    doorOutside: new THREE.Vector3(0, 0, 10),
    doorInside: new THREE.Vector3(0, 0, 9),
    spotFor: (f: { x: number; z: number }) => new THREE.Vector3(f.x, 0, f.z),
  } as never) as unknown as {
    toiletNeed: (c: ReturnType<typeof fakeCustomer>) => 'handled' | 'happy' | 'angry';
    toiletBusy: Set<number>;
  };

  /** Quét seed để lần rút đầu của toiletNeed trúng nhu cầu (< 20%). */
  const seedCầnToilet = () => {
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() < TOILET_NEED_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
  };

  beforeEach(() => {
    useGame.setState(newGameData());
    manager.toiletBusy.clear();
    said.length = 0;
  });

  it('có bồn trống: đi tới, dùng 4 giây, trả phí vào két rồi ra về', () => {
    seedCầnToilet();
    useGame.setState({ level: DINE_UNLOCK, furniture: [mk(10, 'toilet_squat')] });
    const s0 = useGame.getState();
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.toiletNeed(c as never)).toBe('handled');
    expect(manager.toiletBusy.has(10)).toBe(true);
    expect(c.plan).toHaveLength(2);
    c.plan[0]!();
    expect(c.pause).toBe(TOILET_USE_SECONDS);
    c.plan[1]!();
    const s1 = useGame.getState();
    expect(s1.money).toBe(s0.money + 500);
    expect(s1.stats.services ?? 0).toBe(500);
    expect(manager.toiletBusy.has(10)).toBe(false);
    expect(c.state).toBe('leaving');
  });

  it('chưa tới mốc nghiêm ngặt mà thiếu bồn: khách ra về bình thường (bong bóng 💧)', () => {
    seedCầnToilet();
    useGame.setState({ level: TOILET_STRICT_UNLOCK - 1, furniture: [] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.toiletNeed(c as never)).toBe('happy');
    expect(said.some((t) => t.includes('💧'))).toBe(true);
    expect(useGame.getState().stats.missed?.wait ?? 0).toBe(0);
  });

  it('siêu thị lớn thiếu bồn: khách nổi giận, ghi mất khách vì chờ', () => {
    seedCầnToilet();
    useGame.setState({ level: TOILET_STRICT_UNLOCK, furniture: [] });
    const before = useGame.getState().stats.missed?.wait ?? 0;
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.toiletNeed(c as never)).toBe('angry');
    expect(said.some((t) => t.includes('😠'))).toBe(true);
    expect(useGame.getState().stats.missed?.wait ?? 0).toBe(before + 1);
  });

  it('không trúng nhu cầu thì đi thẳng ra về (không đụng bồn)', () => {
    let seed = 0;
    for (let s = 1; s <= 500; s++) {
      setSimSeed(s);
      if (simRng()() >= TOILET_NEED_CHANCE) { seed = s; break; }
    }
    expect(seed).toBeGreaterThan(0);
    setSimSeed(seed);
    useGame.setState({ level: TOILET_STRICT_UNLOCK, furniture: [mk(10, 'toilet_squat')] });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    expect(manager.toiletNeed(c as never)).toBe('happy');
    expect(manager.toiletBusy.size).toBe(0);
  });
});
