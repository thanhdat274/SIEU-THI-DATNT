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

import { summarizeAnnualRevenue } from './annual-revenue';
import nodeAssert from 'node:assert/strict';
export function runAnnualRevenueTests(): void {
  const rec = (day: number, revenue: number) => ({ day, revenue } as any);
  const s = summarizeAnnualRevenue({ 1: rec(1, 1000), 2: rec(2, 500), 366: rec(366, 999) }, 2, rec(2, 700));
  nodeAssert.equal(s.year, 1);
  nodeAssert.equal(s.revenue, 1700, 'Năm 1 dùng bản ghi hiện tại thay bản cũ và bỏ ngày năm 2');
  nodeAssert.equal(s.taxActive, false, 'Chưa vượt ngưỡng miễn thuế');
  nodeAssert.equal(summarizeAnnualRevenue({ 366: rec(366, 5) }, 366).year, 2);
  // Test với doanh thu vượt ngưỡng
  const big: Record<number, any> = {};
  for (let d = 1; d <= 365; d++) big[d] = rec(d, 300_000); // 109.5B ≈ trên 100M
  const bigS = summarizeAnnualRevenue(big, 365);
  nodeAssert.equal(bigS.taxActive, true, 'Vượt 100M → thuế khoán');
  nodeAssert.ok(bigS.estimatedTax > 0, 'Có thuế ước tính > 0');
  console.log('  ✓ Passed: Doanh thu năm, thuế khoán 1% khi vượt ngưỡng');
}
