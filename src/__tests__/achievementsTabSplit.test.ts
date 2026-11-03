import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('GĐ993 — ui/panels/AchievementsTab tách khỏi ui/BusinessPanel', () => {
  it('BusinessPanel không định nghĩa Achievements/PrestigeSection; AchievementsTab export Achievements', () => {
    const panel = readFileSync('src/ui/BusinessPanel.tsx', 'utf8');
    const tab = readFileSync('src/ui/panels/AchievementsTab.tsx', 'utf8');
    for (const n of ['function Achievements', 'function PrestigeSection', 'function NearMilestones']) {
      expect(panel).not.toContain(n);
    }
    expect(tab).toContain('export function Achievements');
    expect(tab).toContain('function PrestigeSection');
    expect(panel).toContain("from './panels/AchievementsTab'");
  });
});
