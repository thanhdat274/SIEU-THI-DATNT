/**
 * Test thuần trạng thái lô + dữ liệu thuê (OpenSpec `open-world-land-lease`, task 1.1 — THUẦN + PROVISIONAL).
 * Phạm vi: game-data. Chạy được độc lập (`tsx src/world/land-lease.test.ts`) hoặc qua `runLandLeaseTests`
 * đăng ký trong test-runner (Lead nối sau).
 *
 * Phạm vi kiểm (ghi rõ):
 *   - `ParcelTenure` owned/leased đúng shape (đủ trường, đúng loại).
 *   - `isLeased`/`isOwned` đúng cho cả 2 loại.
 *   - `rentDebtThresholdMet` đúng ở 2/3/4 ngày (2 → false, 3 → true, 4 → true) và lô owned không bao giờ đạt.
 *   - `LAND_LEASE_CONSTANTS` có đúng giá trị ghi trên design: 0.02 / 0.5 / 3 / 0.05 / [1,1.1,1.25,1.45,1.7,2] / 2.5.
 *   - Bất biến: LEASE_DAILY_RATE > 0, TIER_FACTOR đơn điệu tăng, PRICE_CAP > 1.
 *
 * GHÉP CHÚ: phần THUẦN — không đụng validatePlacement/parcelPrice/simulation/lệnh (chờ máy thật).
 */
import assert from 'node:assert/strict';
import {
  LAND_LEASE_CONSTANTS,
  isLeased,
  isOwned,
  rentDebtThresholdMet,
  type ParcelTenure,
} from './land-lease';

export function runLandLeaseTests(): void {
  console.log('\n--- Trạng thái lô + dữ liệu thuê (task 1.1: ParcelTenure + LAND_LEASE_CONSTANTS) ---');

  // --- ParcelTenure owned/leased đúng shape ---
  const owned: ParcelTenure = { kind: 'owned', boughtBy: 'playerA', day: 5 };
  assert.equal(owned.kind, 'owned', 'owned.kind = "owned"');
  assert.equal(owned.boughtBy, 'playerA', 'owned.boughtBy lưu đúng người mua');
  assert.equal(owned.day, 5, 'owned.day lưu đúng ngày mua');
  assert.equal(typeof owned.boughtBy, 'string', 'owned.boughtBy là string');
  assert.equal(typeof owned.day, 'number', 'owned.day là number');

  const leased: ParcelTenure = { kind: 'leased', leasedBy: 'playerB', sinceDay: 10, paidTotal: 120, debtDays: 0 };
  assert.equal(leased.kind, 'leased', 'leased.kind = "leased"');
  assert.equal(leased.leasedBy, 'playerB', 'leased.leasedBy lưu đúng người thuê');
  assert.equal(leased.sinceDay, 10, 'leased.sinceDay lưu đúng ngày bắt đầu thuê');
  assert.equal(leased.paidTotal, 120, 'leased.paidTotal lưu đúng tổng đã trả');
  assert.equal(leased.debtDays, 0, 'leased.debtDays lưu đúng số ngày nợ');
  assert.equal(typeof leased.leasedBy, 'string', 'leased.leasedBy là string');
  for (const k of ['sinceDay', 'paidTotal', 'debtDays']) {
    assert.equal(typeof (leased as Record<string, unknown>)[k], 'number', `leased.${k} là number`);
  }
  // owned không có trường của leased và ngược lại (discriminated union đúng).
  assert.equal('debtDays' in owned || 'sinceDay' in owned || 'paidTotal' in owned, false,
    'owned không chứa trường của leased');
  assert.equal('boughtBy' in leased || 'day' in leased, false, 'leased không chứa trường của owned');

  // --- isLeased / isOwned đúng ---
  assert.equal(isLeased(owned), false, 'isLeased(owned) = false');
  assert.equal(isOwned(owned), true, 'isOwned(owned) = true');
  assert.equal(isLeased(leased), true, 'isLeased(leased) = true');
  assert.equal(isOwned(leased), false, 'isOwned(leased) = false');

  // --- rentDebtThresholdMet đúng ở 2/3/4 ngày ---
  const lease2: ParcelTenure = { kind: 'leased', leasedBy: 'p', sinceDay: 1, paidTotal: 0, debtDays: 2 };
  const lease3: ParcelTenure = { kind: 'leased', leasedBy: 'p', sinceDay: 1, paidTotal: 0, debtDays: 3 };
  const lease4: ParcelTenure = { kind: 'leased', leasedBy: 'p', sinceDay: 1, paidTotal: 0, debtDays: 4 };
  assert.equal(rentDebtThresholdMet(lease2), false, 'nợ 2 ngày (< 3) → chưa đóng');
  assert.equal(rentDebtThresholdMet(lease3), true, 'nợ 3 ngày (>= 3) → đóng');
  assert.equal(rentDebtThresholdMet(lease4), true, 'nợ 4 ngày (>= 3) → đóng');
  // Lô owned không có khái niệm nợ thuê → không bao giờ đạt ngưỡng.
  assert.equal(rentDebtThresholdMet(owned), false, 'lô owned không bao giờ đạt ngưỡng nợ thuê');

  // --- LAND_LEASE_CONSTANTS có đúng giá trị ghi trên design (PROVISIONAL) ---
  assert.equal(LAND_LEASE_CONSTANTS.leaseDailyRate, 0.02, 'LEASE_DAILY_RATE = 0.02');
  assert.equal(LAND_LEASE_CONSTANTS.leaseCreditRate, 0.5, 'LEASE_CREDIT_RATE = 0.5');
  assert.equal(LAND_LEASE_CONSTANTS.debtClosureDays, 3, 'DEBT_CLOSURE_DAYS = 3');
  assert.equal(LAND_LEASE_CONSTANTS.nearbyBonus, 0.05, 'NEARBY_BONUS = 0.05');
  assert.deepEqual(Array.from(LAND_LEASE_CONSTANTS.tierFactor), [1, 1.1, 1.25, 1.45, 1.7, 2],
    'TIER_FACTOR = [1, 1.1, 1.25, 1.45, 1.7, 2] (cityTier 0..5)');
  assert.equal(LAND_LEASE_CONSTANTS.priceCap, 2.5, 'PRICE_CAP = 2.5');

  // --- Bất biến: LEASE_DAILY_RATE > 0, TIER_FACTOR đơn điệu tăng, PRICE_CAP > 1 ---
  assert.ok(LAND_LEASE_CONSTANTS.leaseDailyRate > 0, 'LEASE_DAILY_RATE > 0');
  assert.ok(LAND_LEASE_CONSTANTS.priceCap > 1, 'PRICE_CAP > 1');
  for (let i = 1; i < LAND_LEASE_CONSTANTS.tierFactor.length; i++) {
    assert.ok(
      LAND_LEASE_CONSTANTS.tierFactor[i]! > LAND_LEASE_CONSTANTS.tierFactor[i - 1]!,
      `TIER_FACTOR đơn điệu tăng (${LAND_LEASE_CONSTANTS.tierFactor[i - 1]} → ${LAND_LEASE_CONSTANTS.tierFactor[i]})`,
    );
  }

  console.log('  ✓ ParcelTenure shape; isLeased/isOwned; rentDebtThresholdMet 2/3/4 ngày; LAND_LEASE_CONSTANTS đúng + bất biến');
}

declare const process: any;
// Chạy độc lập: `tsx src/world/land-lease.test.ts`.
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('land-lease.test')) {
  runLandLeaseTests();
  console.log('\n🎉 TRẠNG THÁI LÔ + DỮ LIỆU THUÊ ĐẠT!\n');
}
