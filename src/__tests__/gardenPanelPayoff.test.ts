import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Hệ 1 — thẻ payoff cửa sổ chất lượng (picklePayoff) được nối vào BẢNG mẻ MUỐI và Ủ trong PhoiTab.
// Khóa bằng nguồn (như substituteFeedback.test), vì hiển thị gắn liền nơi có collectPreserve.
const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '../ui/panels/GardenPanel.tsx'), 'utf8');

describe('picklePayoff — nối vào PhoiTab (GardenPanel)', () => {
  it('import picklePayoff + phoiPayoff + preserveOutlet', () => {
    expect(src).toContain("import { picklePayoff } from '../../data/picklePayoff'");
    expect(src).toContain("import { phoiPayoff } from '../../data/phoiPayoff'");
    expect(src).toContain("import { preserveOutlet } from '../../data/preserveOutlet'");
  });
  it('đầu ra (preserveOutlet) nối vào 3 nút "Bắt đầu mẻ" phơi/muối/ủ', () => {
    // phoi (không có d), muối (d.window), ủ (d.need) — mỗi cái một lần.
    expect(src).toContain('preserveOutlet(d.outputId).line');
    expect((src.split('preserveOutlet(d.outputId).line').length - 1)).toBeGreaterThanOrEqual(3);
  });
  it('dòng 💰 payoff trong mỗi mẻ MUỐI (cạnh nút Vớt)', () => {
    // nằm trong khối muoiJobs.map → có nút vớt và dòng payoff màu cam
    expect(src).toContain('picklePayoff({ job: j, def: d, day }).line');
  });
  it('dòng 💰 payoff trong mỗi mẻ Ủ (cạnh nút Rút)', () => {
    // dùng chung biến j/d/day trong khối uJobs.map; đủ 2 lần = muối + ủ
    const occurrences = src.split('picklePayoff({ job: j, def: d, day }).line').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
  it('dòng 💰 payoff trong mỗi nong PHƠI (cạnh nút Gỡ xuống)', () => {
    expect(src).toContain('phoiPayoff({ job: j, def }).line');
  });
});
