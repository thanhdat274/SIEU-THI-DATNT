import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/** GĐ786 — qua 24:00 đang chạy nhanh thì hạ về 1× MỘT lần (tránh ngất khi người chơi chưa kịp thấy banner). */
const base = () => { useGame.setState({ ...newGameData(), notifications: [] } as never); };
const msgs: string[] = [];
beforeEach(() => {
  base(); msgs.length = 0;
  const orig = useGame.getState().notify;
  useGame.setState({ notify: (m: string) => { msgs.push(m); orig(m); } } as never);
});

describe('hạ tốc độ khi khuya', () => {
  it('vượt 24:00 ở 8× → 1× và đúng một thông báo ≤ 90 ký tự', () => {
    useGame.setState({ minutes: 24 * 60 - 1, speed: 8 });
    useGame.getState().tick(1);
    expect(useGame.getState().speed).toBe(1);
    const late = msgs.filter((m) => m.includes('Đã khuya'));
    expect(late.length).toBe(1);
    expect(late[0].length).toBeLessThanOrEqual(90);
    useGame.getState().tick(0.1); // đã qua mốc: không lặp
    expect(msgs.filter((m) => m.includes('Đã khuya')).length).toBe(1);
  });
  it('đang 1× thì không đổi gì, không báo', () => {
    useGame.setState({ minutes: 24 * 60 - 1, speed: 1 });
    useGame.getState().tick(1);
    expect(useGame.getState().speed).toBe(1);
    expect(msgs.some((m) => m.includes('Đã khuya'))).toBe(false);
  });
  it('trước 24:00 vẫn giữ 8×; người chơi chọn lại 8× sau khuya thì không bị ép nữa', () => {
    useGame.setState({ minutes: 600, speed: 8 });
    useGame.getState().tick(1);
    expect(useGame.getState().speed).toBe(8);
    useGame.setState({ minutes: 24 * 60 + 10, speed: 8 });
    useGame.getState().tick(0.1);
    expect(useGame.getState().speed).toBe(8);
  });
});

describe('mốc ngất 02:00 (GĐ788)', () => {
  it('tick qua 26:00 → sang ngày mới, mất 10% tiền, đồng hồ không kẹt ở 26:xx', () => {
    useGame.setState({ minutes: 26 * 60 - 1, speed: 1, money: 100000, day: 5 });
    useGame.getState().tick(1);
    const s = useGame.getState();
    expect(s.day).toBe(6);
    expect(s.money).toBeLessThan(100000);
    expect(s.minutes).toBeLessThan(24 * 60);
    expect(msgs.some((m) => m.includes('ngất'))).toBe(true);
  });
});
