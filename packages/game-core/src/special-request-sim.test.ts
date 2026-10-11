import assert from 'node:assert/strict';
import type { CustomerState } from '@game/shared';
import { DEFAULT_INITIAL_SAVE, generateStarterTileMap } from '@game/data';
import { InputManager } from './input';
import { GameSimulation } from './simulation';

type Internals = { tickSpecialRequests(): void; clock: { time: { day: number; hour: number; minute: number } } };

const newSim = (regularId?: string): GameSimulation => {
  const save = structuredClone(DEFAULT_INITIAL_SAVE);
  save.player.level = 30;
  save.worldTime.isStoreOpen = true;
  save.worldTime.hour = 8;
  save.customer = undefined;
  save.customers = [{
    id: 'c1', position: { x: 8 * 32, y: 9 * 32 }, stage: 'checkout', targetFixtureId: 'cashier_counter_wood', checkoutId: 'checkout-c1',
    patience: 600, checkoutWait: 600, basket: [], ...(regularId ? { regularId } : {}),
  } as CustomerState];
  return new GameSimulation(save, generateStarterTileMap(), new InputManager(), {});
};

/** Quét các khung 30 phút của một ngày bằng cách đặt đồng hồ rồi gọi thẳng tick. */
const sweepDay = (sim: GameSimulation, stopWhenActive = false): void => {
  const internals = sim as unknown as Internals;
  for (let hour = 8; hour <= 20; hour++) for (const minute of [0, 30]) {
    internals.clock.time.hour = hour;
    internals.clock.time.minute = minute;
    internals.tickSpecialRequests();
    if (stopWhenActive && sim.getSpecialRequestCustomerIds().size > 0) return;
  }
};

export function runSpecialRequestSimTests(): void {
  console.log('\n--- Yêu cầu đặc biệt: nối vào GameSimulation ---');

  const noRegular = newSim();
  sweepDay(noRegular);
  assert.equal(noRegular.getSpecialRequestState().active.length, 0, 'không có khách quen trong tiệm thì không sinh yêu cầu');

  const withRegular = newSim('ba_nam');
  sweepDay(withRegular, true);
  const state = withRegular.getSpecialRequestState();
  assert.ok(state.active.length >= 1, 'có khách quen trong tiệm thì sinh được yêu cầu trong ngày');

  assert.ok(state.active.every((r) => r.customerId === 'c1' && r.regularId === 'ba_nam'), 'yêu cầu gắn đúng khách quen đưa ra');
  assert.ok(withRegular.getSpecialRequestCustomerIds().has('c1'), 'renderer lấy được id khách có bong bóng');

  const saved = withRegular.exportSaveData();
  assert.equal(saved.specialRequests?.active.length, state.active.length, 'yêu cầu được ghi vào save');

  // Khách rời tiệm trước khi được giao: yêu cầu hết hiệu lực, bong bóng biến mất.
  const internals = withRegular as unknown as { customerManager: { customers: CustomerState[] } };
  internals.customerManager.customers = [];
  (withRegular as unknown as Internals).tickSpecialRequests();
  assert.equal(withRegular.getSpecialRequestCustomerIds().size, 0, 'khách rời đi thì hết bong bóng');
  assert.ok(withRegular.getSpecialRequestState().active.every((r) => r.status !== 'active'), 'yêu cầu của khách đã rời bị hết hiệu lực');
}
