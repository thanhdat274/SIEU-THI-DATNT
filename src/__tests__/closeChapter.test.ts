import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { closeChapter } from '../core/bizStory';
import { chapterById } from '../data/chapters';

/**
 * 📖 closeChapter (GĐ1026) — đọc xong hội thoại chương: ghi đã xem (chapters), trao thưởng (money/xp),
 * chạy hiệu ứng (mở rival). Nhánh reward/effect TRƯỚC ĐÂY 0% — kịch qua store như claimQuest.
 */

const g = () => useGame.getState();

/** Ván sạch với chương đang chờ cho sẵn. day 3 để chapterDay không bị chặn. */
const pending = (id: string | null, over: Record<string, unknown> = {}) =>
  useGame.setState({
    ...newGameData(), day: 3, level: 10, money: 1_000_000, xp: 0, notify: () => {},
    biz: { ...newGameData().biz, chapters: [], chapterPending: id, chapterDay: 0, ...over },
  } as never);

beforeEach(() => useGame.setState(newGameData()));

describe('closeChapter — trao thưởng & hiệu ứng khi đọc xong chương', () => {
  it('chương không chờ → chỉ dọn chapterPending, không đụng chapters/tiền', () => {
    pending(null);
    const before = g().money;
    closeChapter();
    expect(g().biz.chapterPending).toBeNull();
    expect(g().biz.chapters).toEqual([]);
    expect(g().money).toBe(before);
  });

  it('chương thưởng TIỀN (ch1) → nạp đúng, ghi đã xem, xoá chờ', () => {
    pending('ch1_ve_que'); // reward: money 20000
    const before = g().money;
    closeChapter();
    expect(g().money).toBe(before + chapterById('ch1_ve_que')!.reward!.money!);
    expect(g().biz.chapters).toEqual(['ch1_ve_que']);
    expect(g().biz.chapterPending).toBeNull();
    expect(g().biz.chapterDay).toBe(3);
  });

  it('chương thưởng XP (ch2) → nạp XP, không chạm tiền', () => {
    pending('ch2_khach_quen'); // reward: xp 40
    closeChapter();
    expect(g().xp).toBe(40);
    expect(g().biz.chapters).toEqual(['ch2_khach_quen']);
    expect(g().money).toBe(1_000_000);
  });

  it('hiệu ứng MỞ RIVAL (ch4) → tạo đối thủ saleUntil = day+2, vẫn thưởng XP', () => {
    pending('ch4_sieu_thi', { rival: null, rivalsBeaten: 0 }); // effect openRival, reward xp 100
    closeChapter();
    expect(g().biz.rival).not.toBeNull();
    expect(g().biz.rival!.saleUntil).toBe(3 + 2);
    expect(g().biz.chapters).toEqual(['ch4_sieu_thi']);
    expect(g().xp).toBe(100);
  });

  it('hiệu ứng MỞ RIVAL nhưng đã có rival → không tạo lại', () => {
    // rival đã tồn tại → nhánh `&& !s.biz.rival` không chạy, giữ rival cũ
    const rival = { name: 'Cửa hàng cũ', level: 2, saleUntil: 99, catalog: [] };
    pending('ch4_sieu_thi', { rival: rival as never });
    closeChapter();
    expect(g().biz.rival).toBe(rival);
  });
});
