import { describe, expect, it } from 'vitest';
import { shortLabel } from '../ui/shortLabel';

describe('GĐ1631 — nút mua thiếu tiền nêu số thiếu', () => {
  it('đủ tiền giữ nhãn; thiếu thì ghi số thiếu', () => {
    expect(shortLabel('Chọn', 100000, 150000)).toBe('Chọn');
    expect(shortLabel('Chọn', 100000, 100000)).toBe('Chọn');
    expect(shortLabel('Chọn', 100000, 40000)).toMatch(/^Thiếu 60/);
  });
});

describe('GĐ1632 — các bảng mua bằng tiền dùng shortLabel', () => {
  it('Giấy phép / Online / MXH / Nâng cấp tiệm / Xây dựng', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['LicensesPanel', 'OnlinePanel', 'SocialPanel', 'ShopLifeTabs', 'BuildPanel', 'StaffPanel', 'MarketTab', 'GardenPanel'])
      expect(readFileSync(`src/ui/panels/${f}.tsx`, 'utf8'), f).toContain('shortLabel(');
  });
});

describe('GĐ1634 — chi nhánh, hợp đồng, lô hàng, kho, tiệm xôi, sạp cũng nêu số thiếu', () => {
  it('dùng shortLabel', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['BranchNightTab', 'BranchPanel', 'ContractsPanel', 'OrderPanel', 'panels/StoragePanel', 'panels/TiemXoiSection', 'panels/ZoneMapSection', 'panels/QuanMenuSection'])
      expect(readFileSync(`src/ui/${f}.tsx`, 'utf8'), f).toContain('shortLabel(');
  });
});
