import assert from 'node:assert/strict';
import {
  SUPPLY_CONTRACT_DAILY_CAP_RATIO,
  acceptSupplyContract,
  cancelSupplyContract,
  createSupplyContract,
  dailySupplyCap,
  internalTransferLedger,
  isSupplyContractExpired,
  proposeSupplyContract,
  refuseSupplyContract,
  resolvedDelivery,
  validateQuantityPerDay,
  type SupplyContract,
} from './supply-contract';

function baseInput() {
  return {
    id: 'sc-1',
    fromInstanceId: 'bld-A',
    toInstanceId: 'bld-B',
    productId: 'mi_hao_hao',
    quantityPerDay: 20,
    internalPrice: 5000,
    startDay: 10,
  };
}

function proposed(over: Partial<SupplyContract> = {}): SupplyContract {
  return { ...createSupplyContract(baseInput(), 'alice'), ...over };
}

export function runSupplyContractTests(): void {
  // --- create / propose ---
  const created = createSupplyContract(baseInput(), 'alice');
  assert.equal(created.status, 'proposed');
  assert.equal(created.proposedBy, 'alice');
  assert.equal(created.acceptedBy, '');
  assert.equal(created.endDay, undefined);

  const proposedByFn = proposeSupplyContract(baseInput(), 'bob');
  assert.equal(proposedByFn.status, 'proposed');
  assert.equal(proposedByFn.proposedBy, 'bob');

  assert.throws(() => createSupplyContract({ ...baseInput(), fromInstanceId: 'bld-B', toInstanceId: 'bld-B' }, 'alice'),
    /khác nhau/, 'Hai tòa phải khác nhau');
  assert.throws(() => createSupplyContract(baseInput(), ''), /đề xuất/, 'Cần người đề xuất');

  // --- lifecycle: refuse keeps proposed ---
  const refused = refuseSupplyContract(created, 'bob');
  assert.equal(refused.status, 'proposed', 'Từ chối giữ nguyên proposed');

  // --- accept ---
  const active = acceptSupplyContract(created, 'bob');
  assert.equal(active.status, 'active');
  assert.equal(active.acceptedBy, 'bob');
  // Không đổi contract gốc (immutable)
  assert.equal(created.status, 'proposed');
  assert.throws(() => acceptSupplyContract(active, 'carol'), /không thể đồng ý/, 'Active không đồng ý lại');
  assert.throws(() => acceptSupplyContract(created, 'alice'), /tự đồng ý/, 'Đề xuất không tự đồng ý');
  // acceptingFrom/acceptingTo: chỉ quản lý tòa giao hoặc nhận được đồng ý
  assert.equal(acceptSupplyContract(created, 'bob', { acceptingFrom: 'alice', acceptingTo: 'bob' }).status, 'active');
  assert.throws(() => acceptSupplyContract(created, 'eve', { acceptingFrom: 'alice', acceptingTo: 'bob' }),
    /quản lý/, 'Người ngoài hai tòa không đồng ý được');

  // --- cancel: one side (agree=false) → ended, endDay=day+1 ---
  const endNextDay = cancelSupplyContract(created, 'bob', 12, false);
  assert.equal(endNextDay.status, 'ended');
  assert.equal(endNextDay.endDay, 13);

  // cancel on active also works single-side
  const endActive = cancelSupplyContract(active, 'alice', 15, false);
  assert.equal(endActive.status, 'ended');
  assert.equal(endActive.endDay, 16);

  // --- cancel: both agree → cancelled immediately ---
  const bothAgree = cancelSupplyContract(created, 'bob', 12, true);
  assert.equal(bothAgree.status, 'cancelled');
  assert.equal(bothAgree.endDay, undefined);

  // No hủy từ ended/cancelled
  assert.throws(() => cancelSupplyContract(endNextDay, 'bob', 13, false), /không thể hủy/);

  // --- expiry after 1 game day ---
  assert.equal(isSupplyContractExpired(created, 10), false, 'Chưa hết hạn trong ngày đề xuất');
  assert.equal(isSupplyContractExpired(created, 11), true, 'Hết hạn sau 1 ngày game');
  assert.equal(isSupplyContractExpired(active, 11), false, 'Active không hết hạn');

  // --- cap 50% floor ---
  assert.equal(SUPPLY_CONTRACT_DAILY_CAP_RATIO, 0.5);
  assert.equal(dailySupplyCap(0), 0);
  assert.equal(dailySupplyCap(100), 50);
  assert.equal(dailySupplyCap(101), 50, 'floor(50.5) = 50');
  assert.equal(dailySupplyCap(7), 3, 'floor(3.5) = 3');

  // --- validateQuantityPerDay ngưỡng ---
  assert.equal(validateQuantityPerDay(50, 100), true);
  assert.equal(validateQuantityPerDay(51, 100), false, 'vượt cap 50');
  assert.equal(validateQuantityPerDay(50, 101), true, '50 <= floor(50.5)');
  assert.equal(validateQuantityPerDay(0, 100), false, 'phải > 0');
  assert.equal(validateQuantityPerDay(-5, 100), false);
  assert.equal(validateQuantityPerDay(3.5, 100), false, 'phải là số nguyên');
  assert.equal(validateQuantityPerDay(Number.NaN, 100), false);

  // --- resolvedDelivery ---
  const full = resolvedDelivery(created, 60);
  assert.deepEqual(full, { delivered: 20, shortfall: 0 });
  const partial = resolvedDelivery(created, 8);
  assert.deepEqual(partial, { delivered: 8, shortfall: 12 });
  const empty = resolvedDelivery(created, 0);
  assert.deepEqual(empty, { delivered: 0, shortfall: 20 });

  // --- internalTransferLedger (không đổi quỹ — chỉ ghi nhận) ---
  const entry = internalTransferLedger(created, 8);
  assert.equal(entry.type, 'internal_transfer');
  assert.equal(entry.fromInstanceId, 'bld-A');
  assert.equal(entry.toInstanceId, 'bld-B');
  assert.equal(entry.productId, 'mi_hao_hao');
  assert.equal(entry.qty, 8);
  assert.equal(entry.internalPrice, 5000);
  assert.equal(entry.amount, 8 * 5000);

  console.log('  ✓ Passed: SupplyContract — create/propose, refuse, accept, cancel 1&2 bên, hết hạn, cap 50% floor, validate, resolvedDelivery, internalTransferLedger');
}
