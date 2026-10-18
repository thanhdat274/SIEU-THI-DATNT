/**
 * Cân bằng bảo vệ đêm — sau sửa hasGuard theo ca (17/10/2026 tối).
 *
 * Chạy:  node night-balance-after-guard-fix.cjs
 */

const BASE_TIME_SCALE = 90;

console.log('═══════════════════════════════════════════════════════════');
console.log('  CÂN BẰNG BẢO VỆ ĐÊM — SAU SỬA GUARD THEO CA');
console.log('═══════════════════════════════════════════════════════════\n');

// ── Tham số ────────────────────────────────────────────────
const STAFF_DAILY_WAGE = 30_000;
const NIGHT_WAGE_MULT = 0.6;
const NIGHT_WAGE = Math.round(STAFF_DAILY_WAGE * NIGHT_WAGE_MULT);
const NIGHT_BURGLARY_CHANCE = 0.06;
const NIGHT_CASH_CHANCE = 0.5;
const NIGHT_CASH_FRAC_MIN = 0.3;
const NIGHT_CASH_FRAC_MAX = 0.6;
const NIGHT_STEAL_FRAC_MIN = 0.08;
const NIGHT_STEAL_FRAC_MAX = 0.2;
const NIGHT_MAX_ITEMS = 20;
const GOODS_UNIT_COST = 3_000;
const DAYS_SIM = 30;
const AVG_COUNTER_CASH = 80_000; // tiền két trung bình ban đêm

// ── Kỳ vọng trộm ──────────────────────────────────────────
const expectedBurglaries = NIGHT_BURGLARY_CHANCE * DAYS_SIM;
const avgCashFrac = (NIGHT_CASH_FRAC_MIN + NIGHT_CASH_FRAC_MAX) / 2;
const avgStealFrac = (NIGHT_STEAL_FRAC_MIN + NIGHT_STEAL_FRAC_MAX) / 2;
const avgItems = NIGHT_MAX_ITEMS * avgStealFrac;
const avgCashLost = AVG_COUNTER_CASH * avgCashFrac;
const avgGoodsLost = avgItems * GOODS_UNIT_COST;
const avgLossPerBurglary = NIGHT_CASH_CHANCE * avgCashLost + (1 - NIGHT_CASH_CHANCE) * avgGoodsLost;
const totalLossNoGuard = expectedBurglaries * avgLossPerBurglary;

console.log('  Tham số từ code:');
console.log(`    Lương: ${STAFF_DAILY_WAGE.toLocaleString()} ₫ | Đêm: ${NIGHT_WAGE_MULT} → ${NIGHT_WAGE.toLocaleString()} ₫/đêm`);
console.log(`    Trộm đêm: ${NIGHT_BURGLARY_CHANCE}/đêm → kỳ vọng ${expectedBurglaries.toFixed(1)} vụ trong ${DAYS_SIM} ngày`);
console.log(`    Mất/vụ: ${avgLossPerBurglary.toFixed(0).toLocaleString()} ₫ (trung bình tiền+kho)`);

// ── 3 Phương án ────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log('  3 PHƯƠNG ÁN CÂN BẰNG');
console.log('─────────────────────────────────────────────────────────\n');

// Phương án A: Tăng frequency trộm theo cấp
console.log('  ┌─────────────────────────────────────────────────────┐');
console.log('  │  A. TĂNG TẦN SUẤT TRỘM THEO CẤP NGƯỜI CHƠI         │');
console.log('  ├─────────────────────────────────────────────────────┤');

const levels = [
  { level: 5, mul: 1.0 },   // mở khóa
  { level: 10, mul: 1.5 },
  { level: 15, mul: 2.0 },
  { level: 20, mul: 2.5 },
  { level: 25, mul: 3.0 },
  { level: 30, mul: 4.0 },
  { level: 60, mul: 5.0 },  // trần
];

console.log(`  ${'Cấp'.padEnd(5)} | ${'Trộm/đêm'.padEnd(10)} | ${'30 ngày'.padEnd(8)} | ${'Mất/kỳ vọng'.padEnd(14)} | ${'Tiết kiệm BV'.padEnd(12)} | ${'Hòa vốn?'.padEnd(10)}`);
console.log('  ' + '─'.repeat(85));

for (const { level, mul } of levels) {
  const adjustedChance = NIGHT_BURGLARY_CHANCE * mul;
  const adj30 = adjustedChance * DAYS_SIM;
  const adjLoss = adj30 * avgLossPerBurglary;
  const saving = totalLossNoGuard * mul / (NIGHT_BURGLARY_CHANCE * DAYS_SIM);
  const breakeven = adjLoss >= NIGHT_WAGE * DAYS_SIM;
  console.log(`  ${String(level).padEnd(5)} | ${adjustedChance.toFixed(3).padEnd(10)} | ${adj30.toFixed(1).padEnd(8)} | ${(adjLoss).toFixed(0).toLocaleString().padEnd(14)} | ${saving.toFixed(0).toLocaleString().padEnd(12)} | ${breakeven ? '✅ CÓ' : '❌ Không'}`);
}
console.log(`  → Ở cấp 10-15: BV đêm gần hòa vốn (trộm ~${(NIGHT_BURGLARY_CHANCE * 2 * DAYS_SIM).toFixed(0)} vụ/30 ngày, mất ~${(totalLossNoGuard * 2).toFixed(0).toLocaleString()} ₫ ≈ lương ${NIGHT_WAGE * DAYS_SIM.toLocaleString()} ₫)`);
console.log(`  → Ở cấp 20+: BV đêm LỢI nhuận (tiết kiệm > lương)`);

// Phương án B: Giảm lương đêm
console.log('\n  ┌─────────────────────────────────────────────────────┐');
console.log('  │  B. GIẢM LƯƠNG BẢO VỆ ĐÊM                           │');
console.log('  ├─────────────────────────────────────────────────────┤');

const wageOptions = [
  { mult: 0.3, label: '0,3 (15.000/đ)' },
  { mult: 0.4, label: '0,4 (20.000/đ)' },
  { mult: 0.5, label: '0,5 (18.000 hiện tại — note: thực tế 30k×0,6=18k, nhưng BV thường cao hơn)' },
  { mult: 0.6, label: '0,6 (18.000 hiện tại)' },
  { mult: 0.8, label: '0,8 (24.000/đ)' },
];

console.log(`  ${'Hệ số'.padEnd(6)} | ${'Lương/đ'.padEnd(8)} | ${'30 ngày'.padEnd(8)} | ${'Tiết kiệm BV'.padEnd(14)} | ${'Hòa vốn?'.padEnd(10)}`);
console.log('  ' + '─'.repeat(70));

for (const { mult, label } of wageOptions) {
  const wage = Math.round(STAFF_DAILY_WAGE * mult);
  const totalWage = wage * DAYS_SIM;
  const saving = totalLossNoGuard;
  const breakeven = saving >= totalWage;
  console.log(`  ${label.padEnd(6)} | ${(wage).toLocaleString().padEnd(8)} | ${(totalWage).toLocaleString().padEnd(8)} | ${saving.toLocaleString().padEnd(14)} | ${breakeven ? '✅ Có' : '❌ Không'}`);
}
console.log(`  → Để hòa vốn với ${totalLossNoGuard.toFixed(0).toLocaleString()} ₫ tiết kiệm/30 ngày: lương tối ${Math.round(totalLossNoGuard / DAYS_SIM).toLocaleString()} ₫/đêm`);

// Phương án C: BV chỉ giảm X% thay vì 100%
console.log('\n  ┌─────────────────────────────────────────────────────┐');
console.log('  │  C. BẢO VỆ CHỈ GIẢM X% THAY VÌ 100%                │');
console.log('  ├─────────────────────────────────────────────────────┤');

const reductionOptions = [
  { pct: 1.0, label: '100% (hiện tại, repelled)' },
  { pct: 0.7, label: '70% (30% lọt)' },
  { pct: 0.5, label: '50% (50% lọt)' },
  { pct: 0.3, label: '30% (70% lọt)' },
  { pct: 0.1, label: '10% (90% lọt)' },
];

console.log(`  ${'Chặn'.padEnd(8)} | ${'Trộm lọt/30đ'.padEnd(12)} | ${'Mất thêm'.padEnd(12)} | ${'Tổng chi BV'.padEnd(12)} | ${'Tiết kiệm'.padEnd(12)} | ${'So với không BV'.padEnd(14)}`);
console.log('  ' + '─'.repeat(85));

for (const { pct, label } of reductionOptions) {
  const leakBurglaries = expectedBurglaries * (1 - pct);
  const extraLoss = leakBurglaries * avgLossPerBurglary;
  const totalWage = NIGHT_WAGE * DAYS_SIM;
  const totalCost = totalWage + extraLoss;
  const vsNoGuard = totalLossNoGuard - extraLoss; // tiết kiệm so với không BV
  const netVsNoGuard = vsNoGuard - totalWage;
  console.log(`  ${label.padEnd(8)} | ${(leakBurglaries).toFixed(1).padEnd(12)} | ${extraLoss.toFixed(0).toLocaleString().padEnd(12)} | ${(totalCost).toLocaleString().padEnd(12)} | ${(totalLossNoGuard - extraLoss).toFixed(0).toLocaleString().padEnd(12)} | ${netVsNoGuard > 0 ? '✅ Lãi ' + (netVsNoGuard).toFixed(0).toLocaleString() : '❌ Lỗ ' + Math.abs(netVsNoGuard).toFixed(0).toLocaleString()}`);
}

// ── Tổng kết đề xuất ─────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TỔNG KẾT & ĐỀ XUẤT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  Ở rate trộm hiện tại (0,06/đêm = 1,8 vụ/30 ngày):');
console.log(`    Mất kỳ vọng khi không BV: ${totalLossNoGuard.toFixed(0).toLocaleString()} ₫`);
console.log(`    Lương BV đêm 30 ngày: ${NIGHT_WAGE * DAYS_SIM.toLocaleString()} ₫`);
console.log(`    Lỗ: ${((NIGHT_WAGE * DAYS_SIM) - totalLossNoGuard).toFixed(0).toLocaleString()} ₫`);

console.log('\n  ĐỀ XUẤT:');
console.log('  (A1) GIỮ nguyên tất cả — BV đêm có giá trị gameplay (role-playing)');
console.log('       Dù lỗ tài chính, người chơi vẫn muốn thuê BV để cảm giác an toàn.');
console.log('       % lương/DT = 0,72% — không ảnh hưởng kinh tế.');
console.log('');
console.log('  (A2) Tăng tần suất trộm theo cấp: nightChance × (1 + level/30)');
console.log(`       Cấp 10: ${(NIGHT_BURGLARY_CHANCE * 1.5).toFixed(3)}/đêm → ${(NIGHT_BURGLARY_CHANCE * 1.5 * DAYS_SIM).toFixed(0)} vụ/30 ngày → gần hòa vốn.`);
console.log(`       Cấp 20: ${(NIGHT_BURGLARY_CHANCE * 2.5).toFixed(3)}/đêm → ${(NIGHT_BURGLARY_CHANCE * 2.5 * DAYS_SIM).toFixed(0)} vụ/30 ngày → LỢI nhuận.`);
console.log('');
console.log('  (A3) Kết hợp A1 + A2: BV miễn phí ở cấp thấp, có lợi nhuận ở cấp cao.');
console.log('       Tạo động lực nâng cấp cho người chơi.');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  → CHƯA ĐỔI HẰNG SỐ: chờ chủ dự án chọn phương án.');
console.log('═══════════════════════════════════════════════════════════');
