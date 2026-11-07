import { describe, expect, it } from 'vitest';
import { newGameData, questContext, useGame } from '../core/store';
import { FIRST_CONTRACT_LEVEL, STORY_STEPS, storyQuest } from '../data/quests';

// GĐ1618 — bước "Đối tác đầu tiên" tới trước cấp mở hợp đồng: ghi rõ cấp mở thay vì kẹt câm.
describe('GĐ1618 — gợi ý cấp mở hợp đồng ở bước cốt truyện', () => {
  const at = (level: number) => {
    const idx = STORY_STEPS.findIndex((s) => s.id === 'story_first_contract');
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
});
