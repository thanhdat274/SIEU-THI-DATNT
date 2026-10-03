import { TaxRuleRegistry, type TaxRule } from './registry';
import { TAX_RESEARCH_2026 } from './research';

function assert(value: boolean, message: string): void { if (!value) throw new Error(message); }
function rejects(fn: () => unknown): void { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Phải từ chối dữ liệu không hợp lệ'); }

export function runTaxRegistryTests(): void {
  const registry = new TaxRuleRegistry();
  registry.register(TAX_RESEARCH_2026);
  assert(registry.resolve(TAX_RESEARCH_2026.version, '2026-09-30', 'household', 'retail_goods').length === 0, 'Không kích hoạt nghiên cứu chưa xác minh');
  // Synthetic fixture only; deliberately not Vietnamese tax policy.
  const fixture: TaxRule = { ...TAX_RESEARCH_2026.rules[0], ruleId: 'test-only', verificationStatus: 'VERIFIED', lastVerifiedAt: '2026-09-30', clause: 'Điều kiện giả lập kiểm thử', effectiveFrom: '2026-01-01', effectiveTo: '2026-07-01' };
  registry.register({ version: 'test-v1', rules: [fixture] });
  assert(registry.resolve('test-v1', '2025-12-31', 'household', 'retail_goods').length === 0, 'Trước hiệu lực');
  assert(registry.resolve('test-v1', '2026-01-01', 'household', 'retail_goods').length === 1, 'Đầu hiệu lực');
  assert(registry.resolve('test-v1', '2026-07-01', 'household', 'retail_goods').length === 0, 'Cuối hiệu lực loại trừ');
  assert(registry.resolve('test-v1', '2026-02-01', 'single_member_llc', 'retail_goods').length === 0, 'Đúng loại hình');
  fixture.threshold = 500;
  const saved = JSON.parse(JSON.stringify(registry.snapshot('test-v1')));
  saved.rules[0].threshold = 123;
  assert(registry.snapshot('test-v1').rules[0].threshold === 1_000_000_000, 'Không sửa lịch sử qua tham chiếu');
  const restored = new TaxRuleRegistry();
  restored.register(JSON.parse(JSON.stringify(registry.snapshot('test-v1'))));
  assert(restored.resolve('test-v1', '2026-02-01', 'household', 'retail_goods').length === 1, 'Khôi phục JSON giữ phiên bản');
  rejects(() => registry.snapshot('missing'));
  rejects(() => registry.register({ version: 'test-v1', rules: [] }));
  rejects(() => registry.resolve('test-v1', '2026-02-30', 'household', 'retail_goods'));
  rejects(() => registry.register({ version: 'bad-money', rules: [{ ...fixture, threshold: 0.5 }] }));
  rejects(() => registry.register({ version: 'bad-source', rules: [{ ...fixture, sourceUrl: '' }] }));
  console.log('✓ Kiểm thử registry thuế: hiệu lực, khóa xác minh, phiên bản, JSON và dữ liệu không hợp lệ.');
}

import { summarizeAnnualRevenue, taxDueOnClose, annualTaxFor, TAX_POLICIES, ACTIVE_TAX_POLICY } from './annual-revenue';
import nodeAssert from 'node:assert/strict';
export function runAnnualRevenueTests(): void {
  const rec = (day: number, revenue: number) => ({ day, revenue } as any);
  const early = TAX_POLICIES.game_early;
  const s = summarizeAnnualRevenue({ 1: rec(1, 1000), 2: rec(2, 500), 366: rec(366, 999) }, 2, rec(2, 700));
  nodeAssert.equal(s.year, 1);
  nodeAssert.equal(s.revenue, 1700, 'Năm 1 dùng bản ghi hiện tại thay bản cũ và bỏ ngày năm 2');
  nodeAssert.equal(s.taxActive, false, 'Chưa vượt ngưỡng miễn thuế');
  nodeAssert.equal(summarizeAnnualRevenue({ 366: rec(366, 5) }, 366).year, 2);

  // Chính sách mặc định 2026: ngưỡng 1 tỷ, GTGT 1% + TNCN 0,5% trên doanh thu bán hàng hóa
  nodeAssert.equal(ACTIVE_TAX_POLICY.id, 'household_2026');
  nodeAssert.equal(ACTIVE_TAX_POLICY.threshold, 1_000_000_000);
  nodeAssert.deepEqual(annualTaxFor(800_000_000), { vat: 0, pit: 0, total: 0 }, '800 triệu: không thuế');
  nodeAssert.deepEqual(annualTaxFor(1_000_000_000), { vat: 0, pit: 0, total: 0 }, 'Đúng 1 tỷ vẫn miễn');
  nodeAssert.deepEqual(annualTaxFor(1_200_000_000), { vat: 12_000_000, pit: 6_000_000, total: 18_000_000 }, '1,2 tỷ: 12 triệu + 6 triệu');
  nodeAssert.deepEqual(annualTaxFor(1_200_000_000, { ...ACTIVE_TAX_POLICY, pitBase: 'excess' }), { vat: 12_000_000, pit: 1_000_000, total: 13_000_000 }, 'Tùy biến: TNCN chỉ tính phần vượt ngưỡng');
  const big: Record<number, any> = {};
  for (let d = 1; d <= 365; d++) big[d] = rec(d, 3_000_000);
  nodeAssert.equal(summarizeAnnualRevenue(big, 365).taxActive, true, '1,095 tỷ vượt ngưỡng 1 tỷ');
  nodeAssert.equal(summarizeAnnualRevenue(big, 365).estimatedTax, Math.round(1_095_000_000 * 0.015));
  const small: Record<number, any> = {};
  for (let d = 1; d <= 365; d++) small[d] = rec(d, 300_000);
  nodeAssert.equal(summarizeAnnualRevenue(small, 365).taxActive, false, '109,5 triệu/năm không chịu thuế theo chính sách 2026');
  nodeAssert.equal(summarizeAnnualRevenue(small, 365, undefined, early).taxActive, true, 'Nhưng chịu thuế ở chính sách tùy biến ngưỡng 100 triệu');
  console.log('  ✓ Passed: Doanh thu năm, ngưỡng và thuế suất theo chính sách');

  // Nộp bù khi vượt ngưỡng, sau đó chỉ nộp phần tăng thêm; tổng đã nộp luôn bằng thuế năm theo chính sách.
  const ledger: Record<number, any> = {};
  let paid = 0;
  for (let d = 1; d <= 12; d++) {
    const today = rec(d, 10_000_000);
    const due = taxDueOnClose(ledger, d, today, early);
    if (d <= 10) nodeAssert.equal(due, 0, `Ngày ${d}: chưa vượt ngưỡng 100M (bằng ngưỡng vẫn miễn)`);
    ledger[d] = { ...today, taxPaid: due };
    paid += due;
  }
  nodeAssert.equal(paid, annualTaxFor(120_000_000, early).total, 'Tổng thuế = thuế năm của 120M, không phải chỉ phần sau ngưỡng');
  nodeAssert.equal(ledger[11].taxPaid, annualTaxFor(110_000_000, early).total, 'Ngày vượt ngưỡng nộp bù cả 110M doanh thu');
  nodeAssert.equal(ledger[12].taxPaid, annualTaxFor(120_000_000, early).total - annualTaxFor(110_000_000, early).total, 'Ngày sau chỉ nộp phần tăng thêm');
  nodeAssert.equal(taxDueOnClose(ledger, 12, rec(12, 10_000_000), early), ledger[12].taxPaid, 'Đóng lại cùng ngày không nộp trùng');
  nodeAssert.equal(taxDueOnClose({ 365: { ...rec(365, 99_000_000), taxPaid: 0 } as any }, 366, rec(366, 99_000_000), early), 0, 'Sang năm mới đếm lại từ đầu');
  console.log('  ✓ Passed: taxDueOnClose nộp bù khi vượt ngưỡng, không nộp trùng, đổi năm');
}
