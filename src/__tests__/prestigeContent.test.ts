import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame, type GameState } from '../core/store';
import { PRESTIGE_TITLES, ALL_TITLES, TITLES, type TitleContext } from '../data/titles';
import { PRESTIGE_COSTUMES, COSTUMES, costumesFor, costumeById } from '../data/costumes';
import { applySnapshot, snapshot } from '../core/save';
import { prestigeRestart, PRESTIGE_MAX_LEVEL } from '../core/prestige';

/**
 * Bộ test GĐ-NG+CONTENT — "Prestige mở khóa nội dung": mỗi mức tái sinh mở thêm một danh hiệu và
 * một bộ trang phục độc quyền, giữ qua mọi vòng (bổ sung cho GĐ14 vốn chỉ tăng +% doanh thu).
 *
 * Hợp đồng:
 * - data/titles.ts: TitleContext.prestige + PRESTIGE_TITLES (mỗi mục có prestige) + ALL_TITLES.
 * - core/slices/progress.ts checkTitles(): xét PRESTIGE_TITLES khi prestige.level ≥ N.
 * - data/costumes.ts: Costume.prestige + PRESTIGE_COSTUMES + costumesFor(level, prestige) + costumeById.
 * - core/slices/progress.ts setCostume(): chặn trang phục NG+ khi chưa đủ số lần tái sinh.
 * - prestigeRestart() giữ bộ sưu tập (titles/costume) đã có — nên NG+ độc quyền không bị mất.
 */

describe('Dữ liệu danh hiệu NG+ (PRESTIGE_TITLES)', () => {
  it('mỗi danh hiệu có prestige trong [1, PRESTIGE_MAX_LEVEL] và id duy nhất', () => {
    const ids = new Set<string>();
    for (const t of PRESTIGE_TITLES) {
      expect(t.prestige).toBeGreaterThanOrEqual(1);
      expect(t.prestige).toBeLessThanOrEqual(PRESTIGE_MAX_LEVEL);
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      // Điều kiện ngưỡng prestige được checkTitles xét (>= t.prestige); done chỉ là điều kiện thường.
      expect(t.done({ prestige: 0 } as TitleContext)).toBe(true);
    }
  });

  it('không trùng id với danh hiệu thường', () => {
    const base = new Set(TITLES.map((t) => t.id));
    for (const t of PRESTIGE_TITLES) expect(base.has(t.id)).toBe(false);
  });

  it('ALL_TITLES gộp đủ 2 nhóm, không trùng', () => {
    expect(ALL_TITLES.length).toBe(TITLES.length + PRESTIGE_TITLES.length);
    expect(new Set(ALL_TITLES.map((t) => t.id)).size).toBe(ALL_TITLES.length);
  });
});

describe('checkTitles xét danh hiệu NG+ qua store thật', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('prestige 0: không mở danh hiệu NG+ nào', () => {
    useGame.getState().checkTitles();
    expect(useGame.getState().titles.some((id) => PRESTIGE_TITLES.some((t) => t.id === id))).toBe(false);
  });

  it('prestige 2: mở đúng 2 danh hiệu NG+ đầu, chưa mở các mức cao hơn', () => {
    const s0 = useGame.getState();
    useGame.setState({ biz: { ...s0.biz, prestige: { level: 2, bonus: 0.16 } } });
    useGame.getState().checkTitles();
    const titles = useGame.getState().titles;
    expect(titles).toContain(PRESTIGE_TITLES[0].id);
    expect(titles).toContain(PRESTIGE_TITLES[1].id);
    expect(titles).not.toContain(PRESTIGE_TITLES[2].id);
    expect(titles).not.toContain(PRESTIGE_TITLES[5].id);
  });

  it('prestige 6 (tối đa): mở trọn bộ 6 danh hiệu NG+', () => {
    const s0 = useGame.getState();
    useGame.setState({ biz: { ...s0.biz, prestige: { level: PRESTIGE_MAX_LEVEL, bonus: 0.48 } } });
    useGame.getState().checkTitles();
    for (const t of PRESTIGE_TITLES) expect(useGame.getState().titles).toContain(t.id);
  });

  it('checkTitles nhiều lần không mở trùng (idempotent)', () => {
    const s0 = useGame.getState();
    useGame.setState({ biz: { ...s0.biz, prestige: { level: 3, bonus: 0.24 } } });
    useGame.getState().checkTitles();
    const once = useGame.getState().titles;
    useGame.getState().checkTitles();
    expect(useGame.getState().titles).toEqual(once);
  });
});

describe('Dữ liệu trang phục NG+ (PRESTIGE_COSTUMES)', () => {
  it('mỗi bộ có prestige trong [1, PRESTIGE_MAX_LEVEL] và id duy nhất, không trùng COSTUMES', () => {
    const base = new Set(COSTUMES.map((c) => c.id));
    const ids = new Set<string>();
    for (const c of PRESTIGE_COSTUMES) {
      expect(c.prestige).toBeGreaterThanOrEqual(1);
      expect(c.prestige).toBeLessThanOrEqual(PRESTIGE_MAX_LEVEL);
      expect(ids.has(c.id)).toBe(false);
      expect(base.has(c.id)).toBe(false);
      ids.add(c.id);
      expect(c.unlock).toBeGreaterThanOrEqual(1);
      expect(c.price).toBeGreaterThan(0);
    }
  });

  it('costumesFor: prestige 0 không có bộ NG+; đủ cấp + đủ prestige thì có', () => {
    expect(costumesFor(100, 0).some((c) => c.prestige)).toBe(false);
    const has1 = costumesFor(100, 1).some((c) => c.id === PRESTIGE_COSTUMES[0].id);
    expect(has1).toBe(true);
    // Chưa đủ cấp vẫn không có dù đủ prestige
    const low = costumesFor(5, 6);
    expect(low.some((c) => c.prestige)).toBe(false);
  });

  it('costumeById tìm được cả NG+ và thường', () => {
    expect(costumeById(PRESTIGE_COSTUMES[0].id)?.id).toBe(PRESTIGE_COSTUMES[0].id);
    expect(costumeById(COSTUMES[1].id)?.id).toBe(COSTUMES[1].id);
    expect(costumeById('khong-ton-tai')).toBeUndefined();
  });
});

describe('setCostume chặn trang phục NG+ chưa đủ prestige', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('prestige 0 dù đủ cấp 100 vẫn không đổi sang bộ NG+', () => {
    const s0 = useGame.getState();
    useGame.setState({ level: 100, biz: { ...s0.biz, prestige: { level: 0, bonus: 0 } } });
    const before = useGame.getState().costume;
    useGame.getState().setCostume(PRESTIGE_COSTUMES[0].id);
    expect(useGame.getState().costume).toBe(before);
  });

  it('đủ cấp + đủ prestige (3) thì đổi được bộ NG+ prestige 3', () => {
    const s0 = useGame.getState();
    useGame.setState({
      level: 100,
      biz: { ...s0.biz, prestige: { level: 3, bonus: 0.24 } },
    });
    useGame.getState().setCostume(PRESTIGE_COSTUMES[2].id); // prestige 3
    expect(useGame.getState().costume).toBe(PRESTIGE_COSTUMES[2].id);
  });
});

describe('prestigeRestart giữ bộ sưu tập NG+ đã mở', () => {
  it('titles và costume (kể cả NG+) giữ nguyên qua lần tái sinh kế tiếp', () => {
    const rich = newGameData() as GameState;
    rich.titles = [PRESTIGE_TITLES[0].id, PRESTIGE_TITLES[1].id];
    rich.costume = PRESTIGE_COSTUMES[0].id;
    rich.biz.prestige = { level: 1, bonus: 0.08 };
    const r = prestigeRestart(rich);
    expect(r.titles).toEqual(rich.titles);
    expect(r.costume).toBe(PRESTIGE_COSTUMES[0].id);
    expect(r.biz.prestige.level).toBe(2);
  });
});

describe('doPrestige mở ngay danh hiệu NG+ tương ứng', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('đủ điều kiện, tái sinh lần đầu → level 1, prestige 1 VÀ được thưởng danh hiệu NG+ đầu', () => {
    const msgs: string[] = [];
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      totals: { ...s0.totals, revenue: 500_000_000 },
      notify: (m: string) => { msgs.push(m); },
    });
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.biz.prestige.level).toBe(1);
    expect(s.titles).toContain(PRESTIGE_TITLES[0].id); // người giữ lửa hẻm
    expect(msgs.some((m) => m.includes('Người giữ lửa hẻm') || m.includes('Danh hiệu'))).toBe(true);
  });

  it('tái sinh nhiều lần chỉ mở đúng danh hiệu mới (level+1), không mở sớm mức cao hơn', () => {
    // Giả lập đang ở vòng prestige 2 đã có sẵn 2 danh hiệu NG+ đầu; tái sinh → level 3 mở danh hiệu thứ 3.
    const s0 = useGame.getState();
    useGame.setState({
      level: 60,
      titles: [PRESTIGE_TITLES[0].id, PRESTIGE_TITLES[1].id],
      totals: { ...s0.totals, revenue: 500_000_000 },
      biz: { ...s0.biz, prestige: { level: 2, bonus: 0.16 } },
    });
    useGame.getState().doPrestige();
    const s = useGame.getState();
    expect(s.biz.prestige.level).toBe(3);
    expect(s.titles).toContain(PRESTIGE_TITLES[2].id); // phú gia đại hộ
    expect(s.titles).not.toContain(PRESTIGE_TITLES[3].id); // chưa tới
  });
});

describe('save round-trip giữ prest assets', () => {
  beforeEach(() => useGame.setState({ ...newGameData() }));

  it('snapshot→applySnapshot giữ titles NG+ và trang phục NG+ đang mặc', () => {
    const s0 = useGame.getState();
    useGame.setState({
      titles: [PRESTIGE_TITLES[0].id],
      costume: PRESTIGE_COSTUMES[0].id,
      biz: { ...s0.biz, prestige: { level: 1, bonus: 0.08 } },
    });
    const snap = snapshot();
    applySnapshot(snap);
    const s = useGame.getState();
    expect(s.titles).toContain(PRESTIGE_TITLES[0].id);
    expect(s.costume).toBe(PRESTIGE_COSTUMES[0].id);
    expect(s.biz.prestige.level).toBe(1);
  });
});
