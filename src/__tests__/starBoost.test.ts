import { describe, it, expect, beforeEach } from 'vitest';
import { useGame } from '../core/store';
import { starBoostBlock, STAR_BOOST_ITEM, STAR_BOOST_UNLOCK } from '../data/dishStars';

describe('GĐ1526 nguyên liệu nâng sao', () => {
  it('chặn đúng lý do', () => {
    expect(starBoostBlock(STAR_BOOST_UNLOCK - 1, 0, 5)).toBe('locked');
    expect(starBoostBlock(STAR_BOOST_UNLOCK, 800, 5)).toBe('maxed');
    expect(starBoostBlock(STAR_BOOST_UNLOCK, 0, 0)).toBe('no-item');
    expect(starBoostBlock(STAR_BOOST_UNLOCK, 0, 1)).toBeNull();
    expect(STAR_BOOST_UNLOCK).toBeGreaterThan(30);
  });
  beforeEach(() => useGame.setState({ level: STAR_BOOST_UNLOCK, storage: { [STAR_BOOST_ITEM]: 1 }, storageLots: {}, servedCounts: { xoi_muoi_me: 15 } } as never));
  it('trừ 1 tổ yến, +10 lượt; hết hàng thì từ chối', () => {
    expect(useGame.getState().boostDishStar('xoi_muoi_me')).toBe(true);
    const s = useGame.getState();
    expect(s.servedCounts.xoi_muoi_me).toBe(25);
    expect(s.storage[STAR_BOOST_ITEM] ?? 0).toBe(0);
    expect(useGame.getState().boostDishStar('xoi_muoi_me')).toBe(false);
  });
});
