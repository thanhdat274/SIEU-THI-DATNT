import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Hệ 4 — thẻ payoff nhượng quyền (franchisePayoff) được nối vào từng điểm trong FranchiseTab (BrandPanel).
// Khóa bằng nguồn (như gardenPanelPayoff.test), vì hiển thị gắn liền nơi render danh sách franchise.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../ui/panels/BrandPanel.tsx'), 'utf8');

describe('franchisePayoff — nối vào FranchiseTab (BrandPanel)', () => {
  it('import franchisePayoff', () => {
    expect(src).toContain("import { franchisePayoff } from '../../data/franchisePayoff'");
  });
  it('mỗi điểm trong b.franchises.map render dòng 📊 payoff', () => {
    expect(src).toContain('const frp = franchisePayoff(b).rows.find((r) => r.id === f.id);');
    expect(src).toContain('📊 {frp.line}');
    expect(src).toContain('frp.line');
  });
});
