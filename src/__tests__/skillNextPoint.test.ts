import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { nextSkillPointLevel, skillPoints } from '../data/titles';

// GĐ1647 — nút "Học" khi hết điểm nêu cấp có điểm tiếp theo.
describe('GĐ1647 — cấp có điểm kỹ năng kế tiếp', () => {
  it('là bội 5 kế tiếp và đúng là cấp tăng thêm 1 điểm', () => {
    for (const l of [1, 4, 5, 9, 10, 199]) {
      const n = nextSkillPointLevel(l);
      expect(n % 5).toBe(0);
      expect(skillPoints(n)).toBe(skillPoints(l) + 1);
      expect(skillPoints(n - 1)).toBe(skillPoints(l));
    }
  });
  it('bảng kỹ năng dùng nhãn hết điểm', () => {
    expect(readFileSync('src/ui/panels/SkillsPanel.tsx', 'utf8')).toContain('nextSkillPointLevel(level)');
  });
});
