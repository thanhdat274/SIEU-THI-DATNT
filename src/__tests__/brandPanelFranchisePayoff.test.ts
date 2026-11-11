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

describe('brandLinePayoff — nối vào LinesTab (BrandPanel)', () => {
  it('import brandLinePayoff + truyền payoff vào LinesTab', () => {
    expect(src).toContain("import { brandLinePayoff } from '../../data/brandLinePayoff'");
    expect(src).toContain('payoff={brandLinePayoff(b).rows}');
  });
  it('mỗi dòng nhãn trong lines.map render dòng 📊 payoff', () => {
    expect(src).toContain('const blp = payoff.find((r) => r.productId === l.productId);');
    expect(src).toContain('📊 {blp.line}');
  });
});

describe('brandWorkshopPayoff — nối vào WorkshopTab (BrandPanel)', () => {
  it('import brandWorkshopPayoff + truyền storage từ store', () => {
    expect(src).toContain("import { brandWorkshopPayoff } from '../../data/brandWorkshopPayoff'");
    expect(src).toContain('storage, foundBrand');
  });
  it('thẻ xưởng đang mở render dòng 📊 payoff', () => {
    expect(src).toContain('brandWorkshopPayoff(b, storage).line');
  });
});

describe('brandDealPayoff — nối vào hợp đồng đại lý (DealersTab)', () => {
  it('import brandDealPayoff', () => {
    expect(src).toContain("import { brandDealPayoff } from '../../data/brandDealPayoff'");
  });
  it('mỗi hợp đồng trong b.deals map render dòng 📊 payoff', () => {
    expect(src).toContain('const dlp = brandDealPayoff(def, deal.productId, b.rep);');
    expect(src).toContain('📊 {dlp.line}');
  });
});
