/**
 * Đo thời gian thực của 1 ngày trọn ở 1× và 2×, và phân tích cân bằng ca đêm.
 * Chạy bằng node:  node night-balance-measure.cjs
 * (không cần tsx/esbuild — chỉ dùng tính toán lý thuyết từ code)
 */

const BASE_TIME_SCALE = 90; // 1 giây thực = 1,5 phút game ban ngày ở 1×

console.log('═══════════════════════════════════════════════════════════');
console.log('  CÂN BẰNG CA ĐÊM — ĐO LÝ THUYẾT + PHÂN TÍCH');
console.log('═══════════════════════════════════════════════════════════\n');

// ── Parameters từ code ──────────────────────────────────────
const GAME_DAY_MINUTES = 900;   // 07:00 → 22:00
const GAME_NIGHT_MINUTES = 480; // 22:00 → 06:00
const GAME_TOTAL_MINUTES = GAME_DAY_MINUTES + GAME_NIGHT_MINUTES; // 1380

const STAFF_DAILY_WAGE = 30_000;
const NIGHT_WAGE_MULT = 0.6;
const NIGHT_WAGE = Math.round(STAFF_DAILY_WAGE * NIGHT_WAGE_MULT); // 18.000
const NIGHT_BURGLARY_CHANCE = 0.06;     // SECURITY_RULES.nightChance
const GUARD_REPELS_ALL = true;          // hasGuard → { kind: 'repelled' } (security.ts:52)
const NIGHT_CASH_CHANCE = 0.5;          // SECURITY_RULES.nightCashChance
const NIGHT_CASH_FRAC_MIN = 0.3;        // SECURITY_RULES.nightCashMin
const NIGHT_CASH_FRAC_MAX = 0.6;        // SECURITY_RULES.nightCashMax
const NIGHT_STEAL_FRAC_MIN = 0.08;      // SECURITY_RULES.nightStealMin
const NIGHT_STEAL_FRAC_MAX = 0.2;       // SECURITY_RULES.nightStealMax
const NIGHT_MAX_ITEMS = 20;             // SECURITY_RULES.nightMaxItems
const GOODS_UNIT_COST = 3_000;           // giá vốn trung bình

const DAYS_SIM = 30;

// ── Part (b): Đo thời gian thực ───────────────────────────────

console.log('─────────────────────────────────────────────────────────');
console.log('  (b) THỜI GIAN THỰC — 1 ngày trọn (07:00 → 07:00)');
console.log('─────────────────────────────────────────────────────────\n');

function calcTiming(timeScale) {
  const realPerMinDay = 60 / timeScale;        // giây thực / phút game ban ngày
  const realPerMinNight = realPerMinDay / 3;    // ban đêm ×3 nhanh hơn
  const daySec = GAME_DAY_MINUTES * realPerMinDay;
  const nightSec = GAME_NIGHT_MINUTES * realPerMinNight;
  const totalSec = daySec + nightSec;
  return { realPerMinDay, realPerMinNight, daySec, nightSec, totalSec };
}

const timing1x = calcTiming(90);
const timing2x = calcTiming(180);

// Trước pha đêm: 07:00 → 22:00 rồi đóng cửa, đồng hồ dừng → sang ngày
// Tổng = 900 phút game ban ngày
function calcOldTiming(timeScale) {
  const realPerMinDay = 60 / timeScale;
  const daySec = GAME_DAY_MINUTES * realPerMinDay;
  return { daySec, totalSec: daySec };
}

const old1x = calcOldTiming(90);
const old2x = calcOldTiming(180);

console.log('  Config      | Ngày (phút) | Đêm (phút) | Thực ngày(s) | Thực đêm(s) | Tổng(s) | Tổng(phút)');
console.log('  ' + '─'.repeat(90));
for (const [label, t] of [['1× (90)', timing1x], ['2× (180)', timing2x]]) {
  console.log(`  ${label.padEnd(11)} | ${String(GAME_DAY_MINUTES).padEnd(11)} | ${String(GAME_NIGHT_MINUTES).padEnd(10)} | ${String(t.daySec.toFixed(1)).padEnd(12)} | ${String(t.nightSec.toFixed(1)).padEnd(11)} | ${String(t.totalSec.toFixed(1)).padEnd(7)} | ${String((t.totalSec / 60).toFixed(1)).padEnd(10)}`);
}

console.log('\n  So với TRƯỚC pha đêm (22:00 → sang ngày, đồng hồ dừng):');
console.log('  Config | Trước(s) | Sau(s)  | Chênh(s) | % tăng');
console.log('  ' + '─'.repeat(55));
for (const [label, old, after] of [['1×', old1x, timing1x], ['2×', old2x, timing2x]]) {
  const diff = after.totalSec - old.daySec;
  const pct = (diff / old.daySec * 100).toFixed(1);
  console.log(`  ${label.padEnd(7)} | ${String(old.daySec.toFixed(1)).padEnd(7)} | ${String(after.totalSec.toFixed(1)).padEnd(7)} | +${String(diff.toFixed(1)).padEnd(6)} | ${pct.padEnd(6)}%`);
}

console.log('\n  → Trước: 07:00→22:00 = 900 phút game, đồng hồ dừng → 1 ngày = 600s (1×)');
console.log('  → Sau:   07:00→06:00 = 1380 phút game, đêm ×3 → 1 ngày = 706,7s (1×)');
console.log(`  → Pha đêm thêm ${timing1x.nightSec.toFixed(1)}s (~${(timing1x.nightSec / 60).toFixed(1)} phút) thực, nhưng ×3 nên "nhanh".`);
console.log('  → Người chơi có thể bấm "Ngủ" 22:00 → chốt ngày tức thời (~0s thực).');

// ── Part (b) tiếp: Sleep timing ──────────────────────────────

console.log('\n  --- Nút "Ngủ" (sleepNow) ---');
console.log('  Bấm ở 22:00 → advanceToNextDay() → day+1, hour=7, isStoreOpen=true');
console.log('  Thời gian thực ≈ 0 (chốt ngày tức thời, không chạy đồng hồ).');
console.log('  Nhân vật về cửa nhà (x=112, y=400), trạng thái AT_HOME.');

// ── Part (a): Balance simulation ─────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log('  (a) CÂN BẰNG LƯƠNG CA ĐÊM — PHÂN TÍCH 30 NGÀY');
console.log('─────────────────────────────────────────────────────────\n');

console.log('  Tham số từ code:');
console.log(`    Lương cơ bản: ${STAFF_DAILY_WAGE.toLocaleString()} ₫`);
console.log(`    Hệ số đêm: ${NIGHT_WAGE_MULT} → lương đêm = ${NIGHT_WAGE.toLocaleString()} ₫/đêm`);
console.log(`    Xác suất trộm đêm: ${NIGHT_BURGLARY_CHANCE}/đêm (SECURITY_RULES.nightChance)`);
console.log(`    Bảo vệ: hasGuard=true → repelled (KHÔNG mất gì) — security.ts:52`);
console.log(`    Trộm tiền: 50% chance, fraction ${NIGHT_CASH_FRAC_MIN}–${NIGHT_CASH_FRAC_MAX}`);
console.log(`    Trộm hàng: 50% chance, fraction ${NIGHT_STEAL_FRAC_MIN}–${NIGHT_STEAL_FRAC_MAX}, tối ${NIGHT_MAX_ITEMS} món`);

// Kỳ vọng trộm đêm trong 30 ngày
const expectedBurglaries30 = NIGHT_BURGLARY_CHANCE * DAYS_SIM;

// Mất kỳ vọng / vụ (trung bình)
const avgCashFrac = (NIGHT_CASH_FRAC_MIN + NIGHT_CASH_FRAC_MAX) / 2; // 0,45
const avgStealFrac = (NIGHT_STEAL_FRAC_MIN + NIGHT_STEAL_FRAC_MAX) / 2; // 0,14
const avgItems = NIGHT_MAX_ITEMS * avgStealFrac;

// Giả định tiền két trung bình ban đêm (sau 15h bán hàng)
const AVG_COUNTER_CASH = 80_000; // ước lượng: tiền lẻ còn lại sau nhiều giao dịch
const avgCashLost = AVG_COUNTER_CASH * avgCashFrac;
const avgGoodsLost = avgItems * GOODS_UNIT_COST;
const avgLossPerBurglary = NIGHT_CASH_CHANCE * avgCashLost + (1 - NIGHT_CASH_CHANCE) * avgGoodsLost;

console.log(`\n  Giả định tiền két trung bình ban đêm: ${AVG_COUNTER_CASH.toLocaleString()} ₫`);
console.log(`  Mất tiền trung bình/vụ cash: ${avgCashLost.toFixed(0).toLocaleString()} ₫`);
console.log(`  Mất hàng trung bình/vụ: ~${avgItems.toFixed(1)} món × ${GOODS_UNIT_COST.toLocaleString()} ₫ = ${avgGoodsLost.toFixed(0).toLocaleString()} ₫`);
console.log(`  Mất trung bình/mỗi vụ trộm thành công: ${avgLossPerBurglary.toFixed(0).toLocaleString()} ₫`);

console.log(`\n  Kỳ vọng trộm đêm trong ${DAYS_SIM} ngày: ${expectedBurglaries30.toFixed(1)} vụ`);

// Không có bảo vệ
const totalExpectedLossNoGuard = expectedBurglaries30 * avgLossPerBurglary;
const wageNoGuard = 0;

// Có bảo vệ (100% repelled — security.ts:52)
const totalExpectedLossGuard = 0;
const wageGuard = NIGHT_WAGE * DAYS_SIM;

console.log(`\n  ┌─────────────────────────────────────────────────────┐`);
console.log(`  │  KHÔNG có nhân viên đêm (baseline)                 │`);
console.log(`  ├─────────────────────────────────────────────────────┤`);
console.log(`  │ Kỳ vọng trộm: ${String(expectedBurglaries30.toFixed(1) + ' vụ').padEnd(30)}│`);
console.log(`  │ Mất mát kỳ vọng: ~${String(totalExpectedLossNoGuard.toFixed(0).toLocaleString() + ' ₫').padEnd(30)}│`);
console.log(`  │ Lương: ${String('0 ₫'.padEnd(28))}│`);
console.log(`  │ TỔNG chi: -${String(totalExpectedLossNoGuard.toFixed(0).toLocaleString() + ' ₫').padEnd(25)}│`);
console.log(`  └─────────────────────────────────────────────────────┘`);

console.log(`\n  ┌─────────────────────────────────────────────────────┐`);
console.log(`  │  1 BẢO VỆ ĐÊM (${String(NIGHT_WAGE.toLocaleString() + ' ₫/đêm').padEnd(26)}│`);
console.log(`  ├─────────────────────────────────────────────────────┤`);
console.log(`  │ Lương ${DAYS_SIM} ngày: ${String(wageGuard.toLocaleString() + ' ₫').padEnd(30)}│`);
console.log(`  │ Kỳ vọng trộm còn lại: ${String('0 (repelled 100%)').padEnd(30)}│`);
console.log(`  │ Mất mát kỳ vọng: ${String('0 ₫'.padEnd(30))}│`);
console.log(`  │ TỔNG chi: -${String(wageGuard.toLocaleString() + ' ₫').padEnd(25)}│`);
console.log(`  └─────────────────────────────────────────────────────┘`);

const diffCost = wageGuard + totalExpectedLossGuard - totalExpectedLossNoGuard;
const breakevenWage = totalExpectedLossNoGuard - totalExpectedLossGuard;

console.log(`\n  So sánh: BV đêm tốn THÊM ${diffCost.toFixed(0).toLocaleString()} ₫ trong ${DAYS_SIM} ngày so với không BV.`);
console.log(`  → Để hòa vốn, BV đêm cần tiết kiệm >= ${breakevenWage.toFixed(0).toLocaleString()} ₫ trộm trong ${DAYS_SIM} ngày`);
console.log(`    = ${(breakevenWage / DAYS_SIM).toFixed(0).toLocaleString()} ₫/ngày`);
console.log(`    Thực tế tiết kiệm: ${totalExpectedLossNoGuard.toFixed(0).toLocaleString()} ₫ — ${totalExpectedLossNoGuard < breakevenWage ? 'THẤP HƠN' : 'CAO HƠN'} nhu cầu.`);

// Doanh thu
const avgDailyRevenue = 2_500_000;
const nightWagePct = (NIGHT_WAGE / avgDailyRevenue * 100).toFixed(3);
console.log(`\n  % lương đêm trên doanh thu: ${NIGHT_WAGE.toLocaleString()} / ${avgDailyRevenue.toLocaleString()} = ${nightWagePct}%`);

// ── Part (c): Sweep audit ───────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log('  (c) RÀ SWEEP — Ảnh hưởng pha đêm');
console.log('─────────────────────────────────────────────────────────\n');

const integrationDelta = timing1x.nightSec * 3;
const balanceSweepDelta = timing1x.nightSec * 40;

console.log('  Sweep tích hợp 3 ngày (integration.test.ts):');
console.log(`    Thời gian thêm: ~${integrationDelta.toFixed(0)}s (~${(integrationDelta / 60).toFixed(1)} phút)`);
console.log(`    3 × 6.000.000 bước, margin an toàn lớn → KHÔNG lệch kết quả số liệu`);
console.log(`    Doanh thu/ngày: KHÔNG ĐỔI (đêm không sinh khách)`);
console.log(`    Lương: KHÔNG ĐỔI (sweep cơ bản không có NV đêm)`);

console.log('\n  Balance-sweep 40 ngày (balance-sweep.ts):');
console.log(`    Thời gian thêm: ~${balanceSweepDelta.toFixed(0)}s (~${(balanceSweepDelta / 3600).toFixed(1)} giờ)`);
console.log(`    Số ngày quan sát: 40 (giữ nguyên, đếm ngày trong sim)`);
console.log(`    Doanh thu/trung bình/ngày: KHÔNG ĐỔI`);
console.log(`    Lãi ròng/trung bình/ngày: KHÔNG ĐỔI (không có NV đêm trong sweep)`);
console.log(`    → Các sweep cũ KHÔNG bị lệch bởi pha đêm.`);

// ── Tổng kết đề xuất ────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TỔNG KẾT & ĐỀ XUẤT');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('  1. TỐC ĐỘ ĐÊM ×3: ★ GIỮ NGUYÊN');
console.log(`     1×: ${timing1x.daySec.toFixed(0)}s ngày + ${timing1x.nightSec.toFixed(0)}s đêm = ${timing1x.totalSec.toFixed(0)}s (${(timing1x.totalSec / 60).toFixed(1)} phút)`);
console.log(`     2×: ${timing2x.daySec.toFixed(0)}s ngày + ${timing2x.nightSec.toFixed(0)}s đêm = ${timing2x.totalSec.toFixed(0)}s (${(timing2x.totalSec / 60).toFixed(1)} phút)`);
console.log(`     Trước: 600s (1×). ĐÊM thêm ${timing1x.nightSec.toFixed(0)}s (~${(timing1x.nightSec / 60).toFixed(1)} phút).`);
console.log(`     % tăng: ${((timing1x.nightSec / old1x.daySec) * 100).toFixed(1)}% mỗi ngày → nhỏ, chấp nhận được.`);

console.log('\n  2. LƯƠNG CA ĐÊM 0,6: ★ GIỮ NGUYÊN (chủ dự án đã chốt 17/10/2026)');
console.log(`     Lương đêm = ${NIGHT_WAGE.toLocaleString()} ₫/đêm = ${nightWagePct}% doanh thu.`);
console.log(`     Phân tích kinh tế ${DAYS_SIM} ngày, 1 BV đêm:`);
console.log(`       Tốn thêm: ${diffCost.toFixed(0).toLocaleString()} ₫ so với không BV (lương 540.000 − tiết kiệm trộm ${totalExpectedLossNoGuard.toFixed(0).toLocaleString()})`);
console.log(`     → Ở rate trộm hiện tại (0,06/đêm), BV đêm LỖ từ góc độ tài chính.`);
console.log(`     → Nhưng: (a) theft-and-security 4.4 sẽ tăng BV đêm mạnh hơn;`);
console.log(`              (b) gameplay value (role-playing, cảm giác an toàn);`);
console.log(`              (c) % lương/DT rất nhỏ (0,72%), không ảnh hưởng kinh tế.`);
console.log(`              (d) chủ dự án đã chốt giữ 0,6.`);

console.log('\n  3. SWEEP KHÔNG BỊ LỆCH:');
console.log(`     Sweep chỉ đo trung bình/ngày. Đêm không sinh khách → DT/ngày = 0.`);
console.log(`     Sweep chậm hơn nhưng số liệu KHÔNG ĐỔI.`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  → CHƯA ĐỔI HẰNG SỐ: chờ chủ dự án duyệt.');
console.log('═══════════════════════════════════════════════════════════');
