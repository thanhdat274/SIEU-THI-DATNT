import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { newGameData, useGame } from '../core/store';
import { setSimSeed, simRng } from '../core/rand';
import { CustomerManager } from '../agents/customers';
import { DINE_CHANCE, DINE_UNLOCK, DINE_WAIT_SECONDS } from '../data/dineIn';
import { COOKED_PRODUCT_IDS } from '../data/recipes';
import { snapshot, applySnapshot } from '../core/save';

const said: string[] = [];
const fakeCustomer = (basket: { id: string; price: number }[]) => ({
  basket,
  state: 'toSeat' as string,
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

describe('dineSeatHint — toast chẩn đoán nút thắt chỗ ngồi (GĐ1502)', () => {
  const manager = new CustomerManager({} as never, {
    findPath: () => [],
    approach: () => [],
  } as never, {
    local: (x: number, z: number) => new THREE.Vector3(x, 0, z),
    counters: () => [],
    doorOutside: new THREE.Vector3(0, 0, 10),
    doorInside: new THREE.Vector3(0, 0, 9),
  } as never) as unknown as {
    updateSeatWaiting: (c: ReturnType<typeof fakeCustomer>, gameDt: number) => void;
    seatBusy: Set<number>;
  };

  beforeEach(() => {
    useGame.setState(newGameData());
    manager.seatBusy.clear();
    said.length = 0;
    // Khách đã trúng vòng quay muốn ngồi (đang ở toSeat, chưa có ghế) — bỏ qua vòng quay 0,3
    useGame.setState({ level: DINE_UNLOCK, furniture: [] });
  });

  it('khách đầu tiên bỏ về vì hết ghế → hiện toast dạy mua bàn ghế đúng 1 lần', () => {
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    manager.updateSeatWaiting(c as never, DINE_WAIT_SECONDS + 0.5);
    expect(c.state).toBe('leaving');
    expect(useGame.getState().dineSeatHinted).toBe(true);
    // Toast chẩn đoán hiện đúng lúc với nội dung chỉ việc cần làm
    expect(useGame.getState().message ?? '').toContain('Bàn ăn');
  });

  it('lần bỏ về sau đó không lặp toast (một lần mỗi ván)', () => {
    useGame.setState({ dineSeatHinted: true });
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    manager.updateSeatWaiting(c as never, DINE_WAIT_SECONDS + 0.5);
    expect(c.state).toBe('leaving');
    expect(useGame.getState().dineSeatHinted).toBe(true);
  });

  it('flag được lưu vào bản lưu (snapshot → nạp lại vẫn true)', () => {
    useGame.setState({ dineSeatHinted: true });
    const snap = snapshot();
    useGame.setState(newGameData());
    applySnapshot(snap);
    expect(useGame.getState().dineSeatHinted).toBe(true);
  });

  it('bàn ghế xuất hiện giữa chừng → khách được ngồi, không cần toast', () => {
    const c = fakeCustomer([{ id: [...COOKED_PRODUCT_IDS][0], price: 30_000 }]);
    manager.updateSeatWaiting(c as never, 2);
    expect(c.diningWait).toBe(2);
    // Chưa bỏ về (dưới kiên nhẫn); ghế trống sẽ được cấp ở nhịp kế (đã test ở dineDecision/tip)
    expect(c.state).toBe('toSeat');
  });
});
