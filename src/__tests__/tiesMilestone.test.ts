import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { REGULARS } from '../data/regulars';
import { FURNITURE, furnitureDef } from '../data/furniture';
import { TITLES } from '../data/titles';
import { TIES_MILESTONES, tiesMilestonesReached, alleyBond } from '../data/regularTies';
import { LIFE_EVENT_UNLOCK } from '../data/lifeEvent';

/**
 * GĐ Hệ2-L7 (SPEC-CHIEU-SAU §2.8) — MỐC TÌNH LÀNG + DANH HIỆU + DECOR.
 * `alleyBond` (đã có L1) giờ có mốc 25/50/75/100%: mỗi mốc thưởng tiền MỘT LẦN MỖI VÁN
 * (`biz.tiesMilestones`, ghi vào `questIncome`), mốc 100% tặng thêm decor "Cổng chào hẻm văn hoá"
 * (`cong_chao` vào `furnStash`). Kèm 4 danh hiệu qua `TitleContext.alleyBond`. Cổng cấp ≥
 * LIFE_EVENT_UNLOCK=32 (R1) → golden L30 không đổi.
 */

/** Dựng ván với mọi khách quen đã "thân toàn tập" → bond tiến tới 100%. */
const fullFriend = (level = 32) => {
  useGame.setState({
    ...newGameData(),
    level,
    notify: vi.fn(),
    regulars: Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 60, visits: 1, perks: [], discovered: [] }])),
    biz: { ...useGame.getState().biz, tiesMended: [], tiesMilestones: [] },
  });
};

beforeEach(() => {
  useGame.setState({ ...newGameData(), storage: {}, storageLots: {} });
});

describe('bảng mốc (SPEC §2.8 — dữ liệu)', () => {
  it('4 mốc 25/50/75/100, mỗi mốc có tiền; chỉ mốc 100% tặng decor', () => {
    expect(TIES_MILESTONES.map((m) => m.pct)).toEqual([25, 50, 75, 100]);
    const deco = TIES_MILESTONES.filter((m) => m.decor);
    expect(deco.map((m) => m.pct)).toEqual([100]);
    expect(deco[0].decor).toBe('cong_chao');
    for (const m of TIES_MILESTONES) expect(m.money).toBeGreaterThan(0);
  });

  it('tiesMilestonesReached: đúng mốc vượt, bỏ mốc đã nhận', () => {
    expect(tiesMilestonesReached(20).map((m) => m.pct)).toEqual([]);
    expect(tiesMilestonesReached(25).map((m) => m.pct)).toEqual([25]);
    expect(tiesMilestonesReached(50).map((m) => m.pct)).toEqual([25, 50]);
    expect(tiesMilestonesReached(100, [50]).map((m) => m.pct)).toEqual([25, 75, 100]);
  });

  it('decor "Cổng chào hẻm văn hoá" — loại nội thất hợp lệ, unlock cao (không bán, chỉ thưởng)', () => {
    const def = furnitureDef('cong_chao');
    expect(def.name).toContain('Cổng chào');
    expect(def.unlock).toBeGreaterThanOrEqual(32);
    expect(def.tiers).toBe(0);
    expect(FURNITURE.some((f) => f.type === 'cong_chao')).toBe(true);
  });

  it('có đủ 4 danh hiệu mốc, `done` xét theo alleyBond', () => {
    const ids = TITLES.filter((t) => ['xom_hoa_thuan', 'ban_lang_than', 'xom_vui_ve', 'hem_van_hoa'].includes(t.id));
    expect(ids).toHaveLength(4);
    expect(ids.map((t) => t.done({ alleyBond: 24 } as never))).toEqual([false, false, false, false]);
    expect(ids.map((t) => t.done({ alleyBond: 25 } as never))).toEqual([true, false, false, false]);
    expect(ids.map((t) => t.done({ alleyBond: 100 } as never))).toEqual([true, true, true, true]);
  });
});

describe('checkTitles — nhận thưởng mốc Tình làng (SPEC §2.8)', () => {
  it('bond 100% (thân toàn tập) → nhận đủ 4 mốc: tiền + decor vào Kho đồ, ghi tiesMilestones', () => {
    fullFriend(32);
    const before = useGame.getState().money;
    useGame.getState().checkTitles();
    const s = useGame.getState();
    const total = TIES_MILESTONES.reduce((n, m) => n + m.money, 0);
    expect(s.money).toBe(before + total);
    expect(s.biz.tiesMilestones).toEqual([25, 50, 75, 100]);
    expect(s.furnStash['cong_chao']).toBe(1);
    expect(s.stats.questIncome).toBe(total);
  });

  it('đã nhận rồi thì KHÔNG nhận lại (một lần mỗi ván — idempotent)', () => {
    fullFriend(32);
    const s1 = useGame.getState();
    s1.checkTitles();
    const after = useGame.getState();
    const s2Money = after.money;
    after.checkTitles();
    const s3 = useGame.getState();
    expect(s3.money).toBe(s2Money); // không cộng thêm
    expect(s3.biz.tiesMilestones).toEqual([25, 50, 75, 100]);
    expect(s3.furnStash['cong_chao']).toBe(1);
  });

  it('level < 32 → KHÔNG thưởng mốc (golden L30 an toàn dù bond đã cao)', () => {
    fullFriend(31);
    const before = useGame.getState().money;
    useGame.getState().checkTitles();
    const s = useGame.getState();
    expect(s.money).toBe(before);
    expect(s.biz.tiesMilestones ?? []).toEqual([]);
    expect(s.furnStash['cong_chao'] ?? 0).toBe(0);
  });

  it('level 32 nhưng bond chưa tới 25 → chưa nhận mốc nào', () => {
    useGame.setState({
      ...newGameData(), level: 32, notify: vi.fn(),
      regulars: Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 2, visits: 0, perks: [], discovered: [] }])),
      biz: { ...useGame.getState().biz, tiesMended: [], tiesMilestones: [] },
    });
    const before = useGame.getState().money;
    useGame.getState().checkTitles();
    expect(useGame.getState().money).toBe(before);
    expect(useGame.getState().biz.tiesMilestones ?? []).toEqual([]);
  });
});

describe('alleyBond làm mốc (đối chứng số liệu)', () => {
  it('thân toàn tập (60) → bond 100; thân 20 khắp nơi → bond 50', () => {
    const all = Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 60 }]));
    expect(alleyBond(all)).toBe(100);
    const half = Object.fromEntries(REGULARS.map((r) => [r.id, { friendship: 20 }]));
    expect(alleyBond(half)).toBe(50);
  });
});
