import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** GĐ417 — gọn BranchPanel: tab Ban đêm tách file riêng, chỉ một nút Đóng. */
describe('BranchPanel gọn', () => {
  const src = readFileSync('src/ui/BranchPanel.tsx', 'utf8');
  it('chỉ một nút Đóng', () => {
    expect(src.match(/<Footer\b/g)).toHaveLength(1);
    expect(src.match(/>Đóng<\/button>/g)).toBeNull();
  });
  it('tab Ban đêm nằm ở BranchNightTab', () => {
    expect(src).toContain('<BranchNightTab />');
    expect(src.split('\n').length).toBeLessThan(240);
  });
});
