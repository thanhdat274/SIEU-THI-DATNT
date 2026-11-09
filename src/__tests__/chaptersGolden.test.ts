import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { checkChapters } from '../core/bizStory';
import { inGoldenHour } from '../data/rhythm';

/**
 * GĐ1838 (review đợt 4 R1) — thoại chương cốt truyện không được dừng đồng hồ ĐÚNG GIỜ VÀNG
 * khi tiệm đang mở (chương ngày 150 bật đầu khung 6h–8h30, gián đoạn lúc đông khách).
 * Giờ vàng + đang bán → hoãn (checkChapters gọi lại mỗi khung sẽ mở khi hết giờ vàng);
 * ngoài giờ vàng hoặc tiệm đóng → mở như cũ. Thứ tự chương đã là "chương sớm nhất chưa xem
 * đủ điều kiện" trong CHAPTERS (khoá ở bizStory.test.ts) — lệch 3→2 của đợt 4 là save cũ.
 */

const g = () => useGame.getState();

beforeEach(() => {
  useGame.setState({
    ...newGameData(),
    day: 5,
    level: 10,
    minutes: 7 * 60,
    shopOpen: true,
    totals: { ...newGameData().totals, customers: 100 },
  });
});

describe('hoãn thoại chương trong giờ vàng (GĐ1838)', () => {
  it('7h00 tiệm đang mở: chưa mở chương', () => {
    expect(inGoldenHour(7 * 60)).toBe(true);
    checkChapters();
    expect(g().biz.chapterPending).toBeNull();
  });

  it('9h00 (hết giờ vàng): mở chương kế tiếp đủ điều kiện', () => {
    useGame.setState({ minutes: 9 * 60 });
    checkChapters();
    expect(g().biz.chapterPending).toBe('ch2_khach_quen');
  });

  it('giờ vàng nhưng tiệm đóng cửa: vẫn mở chương (không chặn vô ích)', () => {
    useGame.setState({ shopOpen: false });
    checkChapters();
    expect(g().biz.chapterPending).toBe('ch2_khach_quen');
  });

  it('hết giờ vàng thì chương bị hoãn trước đó mở được ngay (không kẹt)', () => {
    checkChapters(); // bị hoãn lúc 7h
    useGame.setState({ minutes: 9 * 60 });
    checkChapters();
    expect(g().biz.chapterPending).toBe('ch2_khach_quen');
  });
});
