import { describe, expect, it, beforeEach } from 'vitest';
import { nextMiniMilestone, MINI_MILESTONES } from '../data/festivalMini';
import { useGame } from '../core/store';

/** Mốc thưởng trò khéo tay: đúng ván chạm mốc mới thưởng, đếm theo từng trò. */
describe('recordMiniPlay — mốc thưởng theo lượt chơi', () => {
  beforeEach(() => {
    useGame.setState({ biz: { ...useGame.getState().biz, miniPlays: {} } });
  });

  it('nextMiniMilestone: trước mốc đầu → 3; sau mốc cuối → null', () => {
    expect(nextMiniMilestone(0)).toEqual({ plays: 3, reward: 50000 });
    expect(nextMiniMilestone(2)).toEqual({ plays: 3, reward: 50000 });
    expect(nextMiniMilestone(3)).toEqual({ plays: 7, reward: 100000 });
    expect(nextMiniMilestone(50)).toBeNull();
    expect(nextMiniMilestone(999)).toBeNull();
  });

  it('thưởng đúng ván chạm mốc, các ván khác trả 0', () => {
    const g = useGame.getState();
    const money0 = g.money;
    const got: number[] = [];
    for (let i = 1; i <= 8; i++) got.push(g.recordMiniPlay('gio_qua'));
    // ván 3 → 50k, ván 7 → 100k, còn lại 0
    expect(got[2]).toBe(50000);
    expect(got[6]).toBe(100000);
    expect(got.filter((x) => x === 0).length).toBe(6);
    expect(useGame.getState().biz.miniPlays?.gio_qua).toBe(8);
    expect(useGame.getState().money).toBe(money0 + 150000);
  });

  it('đếm độc lập theo từng trò', () => {
    const g = useGame.getState();
    g.recordMiniPlay('gio_qua'); g.recordMiniPlay('gio_qua');
    expect(g.recordMiniPlay('banh_chung')).toBe(0); // trò khác bắt đầu từ 0
    expect(g.recordMiniPlay('gio_qua')).toBe(50000); // ván 3 của giỏ quà
  });

  it('save cũ không có miniPlays vẫn chạy (undefined → 0)', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, miniPlays: undefined } });
    const g = useGame.getState();
    expect(g.recordMiniPlay('den_ong_sao')).toBe(0);
    expect(useGame.getState().biz.miniPlays?.den_ong_sao).toBe(1);
  });

  it('bảng mốc tăng dần, không trùng lượt', () => {
    for (let i = 1; i < MINI_MILESTONES.length; i++) {
      expect(MINI_MILESTONES[i][0]).toBeGreaterThan(MINI_MILESTONES[i - 1][0]);
      expect(MINI_MILESTONES[i][1]).toBeGreaterThan(MINI_MILESTONES[i - 1][1]);
    }
  });
});
