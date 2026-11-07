import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { FIRST_CONTRACT_LEVEL, STORY_STEPS, storyGateLevel, storyQuest } from '../data/quests';

// GĐ1618 — bước "Đối tác đầu tiên" tới trước cấp mở hợp đồng: ghi rõ cấp mở thay vì kẹt câm.
describe('GĐ1618 — gợi ý cấp mở hợp đồng ở bước cốt truyện', () => {
  const at = (level: number, id = 'story_first_contract') => {
    const idx = STORY_STEPS.findIndex((s) => s.id === id);
    useGame.setState({ ...newGameData(), level });
    const ctx = questContext(useGame.getState());
    return storyQuest({ ...ctx, log: { ...ctx.log, claimedStory: STORY_STEPS.slice(0, idx).map((s) => s.id) } })!;
  };
  it('cấp mở hợp đồng sớm nhất là 14', () => expect(FIRST_CONTRACT_LEVEL).toBe(14));
  it('dưới cấp mở → mô tả nêu cấp; đủ cấp → câu gốc', () => {
    expect(at(10).id).toBe('story_first_contract');
    expect(at(10).description).toContain(`mở từ cấp ${FIRST_CONTRACT_LEVEL}`);
    expect(at(FIRST_CONTRACT_LEVEL).description).toBe('Giao 1 kỳ hợp đồng cung cấp');
  });
  it('GĐ1620: kho/mặt bằng/thuê người cũng nêu cấp mở', () => {
    const g = (id: string) => storyGateLevel(STORY_STEPS.find((s) => s.id === id)!);
    expect(g('story_warehouse')).toBe(8);
    expect(g('story_expand')).toBe(6);
    expect(g('story_hire')).toBe(4);
    expect(g('story_level_3')).toBe(0);
    expect(at(3, 'story_warehouse').description).toBe('Nâng cấp nhà kho 1 lần — mở từ cấp 8');
    expect(at(8, 'story_warehouse').description).toBe('Nâng cấp nhà kho 1 lần');
  });
  it('GĐ1621: mọi bước đo kho/mặt bằng/nhân viên/hợp đồng đều có cấp chặn', () => {
    const ctx = { warehouseTier: 0, shopTier: 0, staffCount: 0, totals: { contractsDone: 0 } } as never;
    for (const st of STORY_STEPS) {
      const src = st.measure.toString();
      if (/warehouseTier|shopTier|staffCount|contractsDone/.test(src)) expect(storyGateLevel(st), st.id).toBeGreaterThan(0);
    }
    void ctx;
  });
  it('GĐ1621: không bước nào đòi bậc kho/mặt bằng vượt bậc cao nhất (kẹt vĩnh viễn)', async () => {
    const { WAREHOUSE_TIERS } = await import('../data/warehouse');
    const { SHOP_TIERS } = await import('../data/shopTiers');
    for (const st of STORY_STEPS) {
      if (st.id.startsWith('story_warehouse')) expect(st.target, st.id).toBeLessThan(WAREHOUSE_TIERS.length);
      if (st.id.startsWith('story_expand') || st.id.startsWith('story_shop_tier')) expect(st.target, st.id).toBeLessThan(SHOP_TIERS.length);
    }
  });
  it('GĐ1621: bước đặt theo tên bậc trỏ đúng bậc đó', async () => {
    const { SHOP_TIERS } = await import('../data/shopTiers');
    const { WAREHOUSE_TIERS } = await import('../data/warehouse');
    const t = (id: string) => STORY_STEPS.find((s) => s.id === id)!.target;
    expect(SHOP_TIERS[t('story_shop_tier_6')].name).toBe('Siêu thị khang trang');
    expect(SHOP_TIERS[t('story_shop_tier_7')].name).toBe('Đại siêu thị');
    expect(WAREHOUSE_TIERS[t('story_warehouse_7')].name).toBe('Tổng kho logistics');
  });
  it('GĐ1622: bước thuê N người nêu cấp đủ chỗ (trần maxStaff)', async () => {
    const { maxStaff } = await import('../data/staff');
    for (const st of STORY_STEPS.filter((s) => s.id.startsWith('story_hire'))) {
      const l = storyGateLevel(st);
      expect(maxStaff(l), st.id).toBeGreaterThanOrEqual(st.target);
      expect(maxStaff(l - 1), st.id).toBeLessThan(st.target);
    }
  });
});
