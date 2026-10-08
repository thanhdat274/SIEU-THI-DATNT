/**
 * Test cho mô phỏng tiến độ 60 ngày thuê lô (OpenSpec `open-world-land-lease` task 2.3, D2/D3/D4/D6 — PROVISIONAL).
 * Gọi `runLandLeaseSimTests()` để chạy; nối vào test-runner là LEAD làm sau (ngoài phạm vi file này).
 */
import assert from 'node:assert/strict';
import {
  LEASE_SIM_DAYS,
  LEASE_DAILY_RATE,
  LEASE_CREDIT_RATE,
  LEASE_DEBT_LIMIT,
  NEARBY_BONUS,
  PRICE_CAP_MULTIPLIER,
  TIER_FACTOR,
  leaseBasePrice,
  leaseCharge,
  parcelPriceAt,
  purchaseCredit,
  simulateLeaseRun,
  type LandLeaseConfig,
} from './land-lease-sim';

/** Config chuẩn cho test: lô 6×13 ô góc đường chính (hệ số 1.6), như một lô đợt mới điển hình. */
const BASE: LandLeaseConfig = {
  basePrice: 12_000,
  tileCount: 6 * 13,
  landValueMultiplier: 1.6,
  cityTierGrowth: () => 0,
  nearbyBuildings: () => 0,
  dailyFunds: () => Infinity,
};

const countDebtDays = (r: { dayByDay: Array<{ debtDays: number }> }): number =>
  r.dayByDay.reduce((s, d) => s + d.debtDays, 0);

const sumDailyRent = (r: { dayByDay: Array<{ dailyRent: number }> }): number =>
  r.dayByDay.reduce((s, d) => s + d.dailyRent, 0);

export function runLandLeaseSimTests(): void {
  console.log('\n--- Mô phỏng tiến độ 60 ngày thuê lô — giá đất động (D2/D3/D4/D6, PROVISIONAL) ---');

  // (a) Giá đơn điệu + cap không vượt 2.5× mức gốc dù thành phố tăng trưởng tối đa.
  {
    const base = leaseBasePrice(BASE);
    const grow: LandLeaseConfig = {
      ...BASE,
      // Thành phố leo tối đa 0 → 5, tòa gần cũng tăng → raw chắc chắn vượt 2.5× nếu không có cap.
      cityTierGrowth: (day) => Math.min(5, Math.floor(day / (LEASE_SIM_DAYS / 5))),
      nearbyBuildings: (day) => day * 2,
    };
    const r = simulateLeaseRun(grow);

    // Đơn điệu không giảm theo từng ngày.
    for (let i = 1; i < r.dayByDay.length; i++) {
      assert.ok(r.dayByDay[i].price >= r.dayByDay[i - 1].price, `giá đơn điệu không giảm tại ngày ${i}`);
    }
    // Không vượt trần ×2.5 so với mức gốc.
    const cap = Math.round(base * PRICE_CAP_MULTIPLIER);
    for (const d of r.dayByDay) {
      assert.ok(d.price <= cap, `giá ngày ${d.day} không vượt trần 2.5× (${d.price} <= ${cap})`);
    }
    // Với tăng trưởng tối đa, giá phải đụng trần (đã bị cap chặn).
    assert.equal(r.dayByDay[r.dayByDay.length - 1].price, cap, 'tăng trưởng tối đa → giá chạm trần 2.5×');
    assert.equal(r.dayByDay[0].price, parcelPriceAt(grow, 1), 'ngày 1 = giá động theo config (tier 0, 2 tòa gần)');
    assert.ok(r.dayByDay[0].price >= Math.round(base), 'ngày 1 không thấp hơn mức gốc');
    assert.ok(r.notes.some((n) => n.includes('cap')), 'ghi chú PROVISIONAL nói về cap');
  }

  // (b) Thuê đủ tiền 60 ngày → tổng trả đúng = sum dailyRent, không nợ, không đóng cửa.
  {
    const r = simulateLeaseRun(BASE);
    assert.equal(r.dayByDay.length, LEASE_SIM_DAYS, 'đúng 60 ngày');
    assert.equal(r.totalRentPaid, sumDailyRent(r), 'tổng thuê đã trả = tổng phí thuê các ngày');
    assert.ok(r.dayByDay.every((d) => d.rentPaid === d.dailyRent), 'mỗi ngày trả đủ');
    assert.equal(countDebtDays(r), 0, 'không ngày nợ nào');
    assert.equal(r.everClosed, false, 'không từng đóng cửa');
    assert.ok(r.dayByDay.every((d) => d.price === Math.round(leaseBasePrice(BASE))), 'giá giữ mức gốc (tier 0, tòa 0)');
    // Phí thuê đúng công thức D2: giá × LEASE_DAILY_RATE.
    assert.ok(r.dayByDay.every((d) => d.dailyRent === leaseCharge(d.price)), 'dailyRent = round(price × 0.02)');
  }

  // (c) Quỹ cạn giữa chừng → debtDays đếm + closed khi ≥3, everClosed=true, KHÔNG phá tòa (trả nợ mở lại).
  {
    const r = simulateLeaseRun({ ...BASE, dailyFunds: (day) => (day >= 20 && day <= 33 ? 0 : Infinity) });
    // Từ ngày 20 quỹ = 0: 3 ngày liên tiếp nợ → ngày 22 đóng cửa.
    assert.equal(r.dayByDay[21].debtDays, 3, 'đủ 3 ngày nợ liên tiếp khi quỹ cạn (ngày 22)');
    assert.equal(r.dayByDay[21].closed, true, 'tòa đóng cửa khi debtDays ≥ 3');
    assert.equal(r.everClosed, true, 'everClosed = true');
    // Những ngày nợ: rentPaid = 0.
    for (let day = 20; day <= 33; day++) {
      assert.equal(r.dayByDay[day - 1].rentPaid, 0, `ngày ${day} thiếu quỹ nên không trả thuê`);
    }
    // KHÔNG phá tòa: chỉ gắn cờ closed — không xóa tòa/không có sự kiện phá hủy, tòa vẫn được định giá và còn mua lại được.
    assert.ok(r.dayByDay.every((d) => !('destroyed' in d)), 'result không có khái niệm phá tòa — chỉ đóng cửa vì nợ');
    assert.ok(r.finalPurchasePrice >= 0, 'tòa vẫn còn giá trị mua lại cuối kỳ (không bị phá)');
    // Hết đợt cạn quỹ (ngày 34 có tiền trở lại) → trả đủ, debtDays reset → mở lại được.
    assert.equal(r.dayByDay[33].rentPaid, r.dayByDay[33].dailyRent, 'có tiền lại (ngày 34) → trả đủ');
    assert.equal(r.dayByDay[33].debtDays, 0, 'debtDays reset về 0 khi trả đủ');
    assert.equal(r.dayByDay[33].closed, false, 'mở lại khi trả đủ nợ');
  }

  // (d) purchaseCreditSaved lý tính min(paidTotal × 0.5, 50% giá).
  {
    // Đủ thuê cả kỳ với giá tăng trưởng: tín dụng = min(paidTotal×0.5, 50% giá cuối).
    const grow: LandLeaseConfig = { ...BASE, cityTierGrowth: (day) => Math.min(5, day), nearbyBuildings: (day) => day };
    const r = simulateLeaseRun(grow);
    const finalPrice = r.dayByDay[r.dayByDay.length - 1].price;
    assert.equal(
      r.purchaseCreditSaved,
      Math.min(r.totalRentPaid * LEASE_CREDIT_RATE, finalPrice * 0.5),
      'purchaseCreditSaved = min(paidTotal×0.5, 50% giá)',
    );
    assert.equal(r.finalPurchasePrice, finalPrice - r.purchaseCreditSaved, 'giá mua thực = giá − tín dụng');

    // Hàm thuần độc lập purchaseCredit.
    assert.equal(purchaseCredit(100_000, 1_000_000), Math.min(100_000 * 0.5, 1_000_000 * 0.5), 'paidTotal nhỏ → tín dụng = 50% paidTotal');
    assert.equal(purchaseCredit(2_000_000, 1_000_000), 1_000_000 * 0.5, 'paidTotal lớn → chặn ở 50% giá');
    assert.equal(purchaseCredit(-5, 1_000_000), 0, 'paidTotal âm → 0');
    assert.equal(purchaseCredit(100, -1_000_000), 0, 'giá âm → 0');

    // Cấu hình hàm trần/cấu trúc (kiểm tra công thức tính giá tách biệt).
    assert.equal(parcelPriceAt(BASE, 1), Math.round(leaseBasePrice(BASE)), 'parcelPriceAt mốc = basePrice×ô×hệ số');
    assert.equal(
      parcelPriceAt({ ...BASE, cityTierGrowth: () => 2, nearbyBuildings: () => 4 }, 1),
      Math.round(leaseBasePrice(BASE) * TIER_FACTOR[2] * (1 + NEARBY_BONUS * 4)),
      'giá = gốc × tierFactor[tier] × (1 + NEARBY_BONUS×tòa gần)',
    );
    assert.equal(leaseCharge(leaseBasePrice(BASE)), Math.round(leaseBasePrice(BASE) * LEASE_DAILY_RATE), 'leaseCharge = round(giá×0.02)');
  }

  console.log('  ✓ Passed: Mô phỏng tiến độ 60 ngày thuê lô — giá đơn điệu + cap 2.5×, tổng thuê, nợ/đóng cửa không phá tòa, tín dụng mua');
}

// Chạy độc lập khi gọi trực tiếp bằng tsx (không cần nối vào test-runner.ts).
const isDirect = typeof process !== 'undefined' && process.argv?.[1]?.includes('land-lease-sim');
if (isDirect) {
  runLandLeaseSimTests();
}
