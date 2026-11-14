import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** GĐ1826 (review người chơi R8): ngày 1–2 gập khối nâng cao của tổng kết sau nút "Xem chi tiết" —
 *  ngày đầu chỉ giữ lõi (tiền, lãi bán thật, việc cần làm); từ ngày 3 mở mặc định. */
describe('Tổng kết ngày 1–2 gọn — khối nâng cao sau nút Xem chi tiết', () => {
  const src = readFileSync(resolve(__dirname, '../ui/panels/ReportPanels.tsx'), 'utf8');
  it('mặc định gập ở ngày 1–2, mở từ ngày 3', () => {
    expect(src).toContain('useState(day > 2)');
  });
  it('khối kỷ lục / ca đêm / thanh toán / giờ bán đều bị cổng `more`', () => {
    expect(src).toContain('{more && feedActive.length > 0 && (');
    expect(src).toContain('{more && (() => {');
    expect(src).toContain('{more && <SummaryMoneyCards');
    expect(src).toContain('{more && methods.length > 0 && (');
    expect(src).toContain('{more && hours.length > 0 && <HourChart');
  });
  it('nút Xem chi tiết chỉ hiện ngày 1–2; "Vì sao khách không mua" vẫn nằm ngoài khối gập', () => {
    expect(src).toContain('day <= 2 &&');
    expect(src).toContain('setMore((v) => !v)');
    expect(src).toContain("t('panels_report.vi_sao_khach_khong_mua_duoc')");
    // nút toggle đứng TRƯỚC thẻ gợi ý trong JSX — thứ tự: bảng → lãi thật → stats → toggle → advice
    expect(src.indexOf('setMore((v) => !v)')).toBeGreaterThan(src.indexOf('<HourChart'));
    expect(src.indexOf("t('panels_report.vi_sao_khach_khong_mua_duoc')")).toBeGreaterThan(src.indexOf('setMore((v) => !v)'));
  });
});
