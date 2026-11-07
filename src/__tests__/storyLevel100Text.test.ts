import { describe, expect, it } from 'vitest';
import { STORY_STEPS } from '../data/quests';
import { MAX_LEVEL } from '../data/levels';

// GĐ1645 — trần cấp đã lên 200: bước cốt truyện cấp 100 không được gọi là "mốc cuối game".
describe('GĐ1645 — mô tả bước cấp 100', () => {
  it('không còn gọi cấp 100 là cuối game khi trần cao hơn', () => {
    const st = STORY_STEPS.find((s) => s.id === 'story_level_100')!;
    expect(MAX_LEVEL).toBeGreaterThan(100);
    expect(st.description).not.toContain('cuối game');
  });
});
