import { beforeEach, describe, expect, it } from 'vitest';
import { loadStories } from '../data/biz';
import { newGameData, useGame } from '../core/store';
import { maybeSurprise } from '../core/biz';
import { setSimSeed } from '../core/rand';

await loadStories(); // SURPRISES nạp lười — rỗng thì pool không bao giờ bắn

/**
 * GĐ1507 — bug elapsed=0 của `maybeSurprise`: clock.ts ghi thẳng `get().minutes = minutes`
 * TRƯỚC khi gọi `maybeSurprise(minutes - s.minutes)` → elapsed LUÔN 0 → ngưỡng bắn
 * `SURPRISE_CHANCE × 0 / (11×60) = 0` → pool sự kiện một-phát KHÔNG BAO GIỜ bắn
 * (từ GĐ962; chỉ arc sống vì không dùng elapsed). Test này khoá hành vi đúng:
 * elapsed=0 không bắn, elapsed>0 bắn được (deterministic theo seed).
 */
describe('maybeSurprise — bug elapsed=0 (GĐ1507)', () => {
  beforeEach(() => {
    setSimSeed(7);
    useGame.setState({ ...newGameData(), level: 5, shopOpen: true, minutes: 10 * 60, day: 2 });
    useGame.setState({ biz: { ...useGame.getState().biz, surprise: null, surpriseDay: 0, surpriseArc: undefined, surpriseArcsTold: [] } });
  });

  it('elapsed = 0 (bug cũ): 500 nhịp tick không bao giờ bắn sự kiện', () => {
    for (let i = 0; i < 500; i++) {
      useGame.setState({ minutes: 10 * 60 });
      maybeSurprise(0);
      if (useGame.getState().biz.surpriseDay === 2) break;
    }
    expect(useGame.getState().biz.surpriseDay).not.toBe(2);
  });

  it('elapsed > 0 (đã sửa): pool bắn được — có ngày sự kiện mở', () => {
    let fired = false;
    for (let i = 0; i < 3000 && !fired; i++) {
      useGame.setState({ minutes: 9 * 60 + (i % 600), surpriseDay: undefined } as never);
      useGame.setState({ biz: { ...useGame.getState().biz, surpriseDay: 0, surprise: null } });
      maybeSurprise(10);
      fired = useGame.getState().biz.surpriseDay === 2;
    }
    expect(fired).toBe(true);
    const ev = useGame.getState().biz.surprise;
    expect(ev).not.toBeNull();
  });

  it('bắn xong chặn đúng 1 lần/ngày (surpriseDay khoá)', () => {
    useGame.setState({ biz: { ...useGame.getState().biz, surpriseDay: 2, surprise: null } });
    for (let i = 0; i < 100; i++) {
      useGame.setState({ minutes: 10 * 60 });
      maybeSurprise(600);
    }
    // surpriseDay vẫn 2, không đổi sang bắn thêm — chỉ một sự kiện mỗi ngày
    expect(useGame.getState().biz.surpriseDay).toBe(2);
  });
});
