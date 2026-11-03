import { describe, expect, it } from 'vitest';
import * as biz from '../core/biz';
import * as story from '../core/bizStory';

describe('bizStory tách khỏi core/biz (GĐ962)', () => {
  it('biz vẫn re-export đủ API sự kiện/chuyện/chương', () => {
    for (const k of Object.keys(story)) expect((biz as Record<string, unknown>)[k]).toBe((story as Record<string, unknown>)[k]);
    for (const k of ['maybeSurprise', 'chooseSurprise', 'storyOnVisit', 'closeStory', 'checkChapters', 'closeChapter', 'REGULAR_NAMES']) expect(Object.keys(story)).toContain(k);
  });
  it('REGULAR_NAMES ánh xạ id → tên', () => {
    const ids = Object.keys(story.REGULAR_NAMES);
    expect(ids.length).toBeGreaterThan(0);
    expect(typeof story.REGULAR_NAMES[ids[0]]).toBe('string');
  });
});
