import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { closeStory, storyOnVisit } from '../core/biz';
import { loadStories, STORIES } from '../data/biz';

/**
 * biz.ts — chuyện khách quen: chương mở theo độ thân thiết, mỗi lần chỉ một chương chờ, đọc xong mới trao thưởng và sang chương sau.
 */

vi.mock('../net/session', () => ({ useSession: { getState: () => ({}) }, subscribe: () => () => {} }));
vi.mock('../net/cloud', () => ({ pushCloudSave: () => {}, takeCloudSave: () => {} }));

const g = () => useGame.getState();
const R = 'ba_nam';
let ch: (typeof STORIES)[string] = [];

const setFriend = (friendship: number) => useGame.setState({ regulars: { [R]: { friendship, visits: 1, perks: [], discovered: [] } } as never });

beforeEach(async () => {
  await loadStories();
  ch = STORIES[R];
  useGame.setState({ ...newGameData(), money: 0 });
  useGame.setState({ biz: { ...g().biz, story: {}, storyPending: null } });
});

describe('storyOnVisit', () => {
  it('đủ thân thiết chương đầu: xếp chương 0 chờ hiện', () => {
    setFriend(ch[0].at);
    storyOnVisit(R);
    expect(g().biz.storyPending).toEqual({ regular: R, chapter: 0 });
  });

  it('chưa đủ thân thiết, khách không có truyện, hoặc đang có chương chờ: không đổi', () => {
    setFriend(ch[0].at - 1);
    storyOnVisit(R);
    expect(g().biz.storyPending).toBeNull();
    storyOnVisit('khong-co');
    expect(g().biz.storyPending).toBeNull();
    setFriend(ch[0].at);
    useGame.setState({ biz: { ...g().biz, storyPending: { regular: 'x', chapter: 3 } } as never });
    storyOnVisit(R);
    expect(g().biz.storyPending).toEqual({ regular: 'x', chapter: 3 });
  });

  it('đã xem hết chương: không xếp thêm', () => {
    setFriend(9999);
    useGame.setState({ biz: { ...g().biz, story: { [R]: ch.length } } });
    storyOnVisit(R);
    expect(g().biz.storyPending).toBeNull();
  });
});

describe('closeStory', () => {
  it('đọc xong: ghi đã xem (+1), xoá chờ, trao tiền thưởng của chương', () => {
    const last = ch.length - 1;
    const reward = ch[last].reward?.money ?? 0;
    useGame.setState({ biz: { ...g().biz, story: { [R]: last }, storyPending: { regular: R, chapter: last } } as never });
    closeStory();
    expect(g().biz.story[R]).toBe(last + 1);
    expect(g().biz.storyPending).toBeNull();
    expect(g().money).toBe(reward);
  });

  it('không có chương chờ: không làm gì; đóng hai lần không thưởng kép', () => {
    closeStory();
    expect(g().money).toBe(0);
    useGame.setState({ biz: { ...g().biz, story: { [R]: 2 }, storyPending: { regular: R, chapter: 2 } } as never });
    closeStory();
    const m = g().money;
    closeStory();
    expect(g().money).toBe(m);
    expect(g().biz.story[R]).toBe(3);
  });
});
