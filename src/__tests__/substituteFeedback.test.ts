import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** GĐ1829 — OpenSpec khach-thay-mon-het-hang: phản hồi "đã cứu X lượt" trong tổng kết. */
describe('Tổng kết — dòng "đã cứu X lượt nhờ thay món"', () => {
  const src = readFileSync(resolve(__dirname, '../ui/panels/ReportPanels.tsx'), 'utf8');
  it('dòng chỉ hiện khi có lượt thay, ngắn gọn đúng quy cách', () => {
    expect(src).toContain("{(st.substituted ?? 0) > 0 && (");
    expect(src).toContain("{t('panels_report.da_cuu')}{' '}{st.substituted}{' '}{t('panels_report.luot_nho_khach_nhan_mon_thay')}");
    // dòng phải đứng TRƯỚC thẻ "Vì sao khách không mua" (nhóm phản hồi cuối ngày)
    expect(src.indexOf("t('panels_report.da_cuu')")).toBeLessThan(src.indexOf("t('panels_report.vi_sao_khach_khong_mua_duoc')"));
  });
  it('văn bản dòng dài ≤ 90 ký tự khi thay bằng số 3 chữ số', () => {
    const line = `🔄 Đã cứu 999 lượt nhờ khách nhận món thay — vẫn nên châm kệ đủ.`;
    expect([...line].length).toBeLessThanOrEqual(90);
  });
});
