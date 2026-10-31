import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { SKILLS, skillPoints } from '../data/titles';

/** learnSkill — học kỹ năng: cần đủ cấp, còn điểm kỹ năng (cấp/5), không học trùng, id lạ bỏ qua. */

const g = () => useGame.getState();
const quick = SKILLS.find((k) => k.id === 'quick_hands')!;
const high = SKILLS.find((k) => k.unlock >= 20)!;

beforeEach(() => {
  useGame.setState({ ...newGameData(), level: quick.unlock, skills: [] });
});

describe('learnSkill', () => {
  it('đủ cấp và còn điểm: thêm vào danh sách', () => {
    g().learnSkill(quick.id);
    expect(g().skills).toEqual([quick.id]);
  });

  it('học trùng: không thêm lần hai', () => {
    g().learnSkill(quick.id);
    useGame.setState({ level: 50 });
    g().learnSkill(quick.id);
    expect(g().skills).toEqual([quick.id]);
  });

  it('chưa tới cấp mở: bị chặn', () => {
    useGame.setState({ level: high.unlock - 1 });
    g().learnSkill(high.id);
    expect(g().skills).toEqual([]);
  });

  it('hết điểm kỹ năng: không học thêm, có điểm lại thì học được', () => {
    expect(skillPoints(quick.unlock)).toBe(1);
    const other = SKILLS.find((k) => k.id !== quick.id && k.unlock <= quick.unlock)!;
    g().learnSkill(quick.id);
    g().learnSkill(other.id);
    expect(g().skills).toEqual([quick.id]);
    useGame.setState({ level: quick.unlock + 5 });
    g().learnSkill(other.id);
    expect(g().skills).toEqual([quick.id, other.id]);
  });

  it('id lạ: bỏ qua', () => {
    g().learnSkill('khong-co' as never);
    expect(g().skills).toEqual([]);
  });
});
