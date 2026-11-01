import { describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { maybeSurprise, storyOnVisit } from '../core/biz';
import { loadStories, SURPRISES, STORIES } from '../data/biz';

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

/** GĐ336: STORIES/SURPRISES nạp lười — vài ms đầu phiên chúng rỗng, các đường đọc phải không ném lỗi. */
describe('dữ liệu văn bản nạp lười (STORIES / SURPRISES)', () => {
  it('trước khi nạp xong: kể chuyện/bất ngờ không ném lỗi, không ghi trạng thái rác', () => {
    expect(Object.keys(STORIES)).toHaveLength(0);
    expect(SURPRISES).toHaveLength(0);
    useGame.setState({ ...newGameData(), level: 30, day: 10 });
    expect(() => storyOnVisit('ba_tam')).not.toThrow();
    expect(useGame.getState().biz.storyPending).toBeFalsy();
    for (let i = 0; i < 20; i++) expect(() => maybeSurprise(660)).not.toThrow();
  });

  it('nạp xong thì có dữ liệu, gọi lại vẫn an toàn (idempotent)', async () => {
    await loadStories();
    const n = SURPRISES.length;
    expect(n).toBeGreaterThan(0);
    expect(Object.keys(STORIES).length).toBeGreaterThanOrEqual(10);
    await loadStories();
    expect(SURPRISES.length).toBe(n);
  });
});
