import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Hệ chuỗi cung — giá trị doanh thu treo (supplyRestockValue) nối vào Phiếu nạp kho trong SupplyChainCard.
// Khóa bằng nguồn (như gardenPanelPayoff.test).
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../ui/panels/SupplyChainCard.tsx'), 'utf8');

describe('supplyRestockValue — nối vào Phiếu nạp kho (SupplyChainCard)', () => {
  it('import supplyRestockValue + gọi từ rm.lines', () => {
    expect(src).toContain("import { supplyRestockValue } from '../../data/supplyRestockValue'");
    expect(src).toContain('const rv = supplyRestockValue(rm.lines, level);');
  });
  it('headline + mỗi dòng nạp hiện giá trị bán lẻ', () => {
    expect(src).toContain('· {rv.headline}');
    expect(src).toContain('≈ {rv.rows[i].worth.toLocaleString(\'vi-VN\')}đ giá bán lẻ');
  });
});
