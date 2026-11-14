import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** GĐ573: cảnh báo chi nhánh (thiếu thu ngân/giao hàng/bảo vệ, kho cạn) gom một khung, không rải từng dòng. */
describe('BranchPanel gom cảnh báo', () => {
  it('không còn dòng ⚠️ rời, có một khung "Cần xử lý"', () => {
    const src = readFileSync(join(__dirname, '../ui/BranchPanel.tsx'), 'utf8');
    expect(src.match(/st\.warn\}>⚠️/g) ?? []).toHaveLength(0);
    expect(src.match(/branch.can_xu_ly/g)).toHaveLength(1);
  });
});
