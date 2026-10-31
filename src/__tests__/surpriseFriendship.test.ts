import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SURPRISES, type EventChoice, type SurpriseDef } from '../data/biz';
import { loadStories } from '../data/biz';
import { REGULARS, type RegularProgress } from '../data/regulars';
import { chooseSurprise } from '../core/biz';
import { newGameData, useGame } from '../core/store';
await loadStories(); // SURPRISES nạp lười

/**
 * Bộ test GĐ13 — Wire `friendship` vào hệ sự kiện bất ngờ (SURPRISES).
 *
 * Hợp đồng: Developer sẽ (1) trong `src/core/biz.ts` `chooseSurprise` thêm
 * `if (c.friendship) S().adjustFriendship(c.friendship.id, c.friendship.delta)`,
 * và (2) trong `src/data/biz.ts` mảng SURPRISES điền `friendship: { id, delta }`
 * cho ~8-10 mẫu với id thật trong REGULARS và delta nguyên trong [−4, +5], ≠ 0.
 *
 * Test này chỉ IMPORT, không sửa code nguồn. Dùng store thật (newGameData reset).
 * Vài test ở nhóm "Áp dụng qua store" sẽ fail chừng nào Developer chưa wire xong —
 * đó là trạng thái OK: Leader chạy toàn bộ sau khi cả hai bên hoàn tất.
 */

/** Nhãn định danh một lựa chọn để báo rõ mẫu nào vi phạm khi fail. */
const surpriseLabel = (e: { id: string }, c: { label: string }) => `mẫu ${e.id} choice "${c.label}"`;

/** Liệt kê mọi (mẫu, choice) có field `friendship` trong dữ liệu hiện tại. */
const friendshipChoices = () =>
  SURPRISES.flatMap((e) =>
    e.choices.filter((c) => c.friendship).map((c) => ({ e, c, label: surpriseLabel(e, c) })),
  );

/**
 * Tìm (mẫu, index) đầu tiên có một choice thoả `pred`. Ném lỗi rõ ràng nếu chưa có
 * (tức là Developer chưa wire friendship vào src/data/biz.ts).
 */
const findSurprise = (pred: (c: EventChoice) => boolean, why: string) => {
  for (const e of SURPRISES) {
    const idx = e.choices.findIndex(pred);
    if (idx >= 0) return { e, idx };
  }
  throw new Error(
    `${why} — chưa tìm thấy mẫu SURPRISES thoả điều kiện (Developer cần wire friendship vào src/data/biz.ts theo GĐ13).`,
  );
};

/** Bật một sự kiện bất ngờ đang diễn ra trong store (biz.surprise) — như lúc game lăn sự kiện. */
const setActiveSurprise = (e: { id: string }) =>
  useGame.setState({
    biz: { ...useGame.getState().biz, surprise: { id: e.id, expiresAt: 99999 }, surpriseDay: 1 },
  });

/** Tạo nhanh một hồ sơ khách quen với mức thân thiết cho sẵn. */
const progress = (friendship: number): RegularProgress => ({ friendship, visits: 0, perks: [], discovered: [] });

describe('GĐ13 — SURPRISES × friendship: dữ liệu hợp lệ', () => {
  it('mọi choice có friendship.id phải tồn tại trong REGULARS', () => {
    for (const { c, label } of friendshipChoices()) {
      expect(REGULARS.some((r) => r.id === c.friendship!.id), `${label} → friendship.id thiếu trong REGULARS`).toBe(true);
    }
  });

  it('mọi choice có friendship.delta là số nguyên trong [−4, +5] và ≠ 0', () => {
    for (const { c, label } of friendshipChoices()) {
      const d = c.friendship!.delta;
      expect(Number.isInteger(d), `${label} → delta không phải số nguyên`).toBe(true);
      expect(d, `${label} → delta ngoài khoảng [−4, +5]`).toBeGreaterThanOrEqual(-4);
      expect(d, `${label} → delta ngoài khoảng [−4, +5]`).toBeLessThanOrEqual(5);
      expect(d, `${label} → delta không được bằng 0`).not.toBe(0);
    }
  });

  it('quy mô theo thiết kế: ít nhất 8 mẫu sự kiện có lựa chọn friendship (đạt sau khi DEV wire)', () => {
    const uniq = new Set(friendshipChoices().map(({ e }) => e.id));
    expect(uniq.size).toBeGreaterThanOrEqual(8);
  });
});

describe('GĐ13 — Áp dụng qua store thật: chooseSurprise cập nhật thân thiết', () => {
  beforeEach(() => {
    useGame.setState({ ...newGameData() });
    // chooseSurprise và adjustFriendship đều có thể gọi notify; mock lại như các test khác làm
    useGame.setState({ notify: vi.fn() });
  });

  it('chọn lựa chọn có friendship dương: thân thiết tăng đúng delta và surprise bị xoá (null)', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship && c.friendship!.delta > 0, 'Cần lựa chọn có friendship.delta > 0');
    const fc = e.choices[idx].friendship!;
    setActiveSurprise(e);
    const before = useGame.getState().regulars[fc.id]?.friendship ?? 0;

    chooseSurprise(idx);

    const s = useGame.getState();
    expect(s.regulars[fc.id].friendship).toBe(before + fc.delta);
    expect(s.biz.surprise).toBeNull();
  });

  it('chọn lựa chọn có friendship âm: thân thiết giảm đúng delta (không âm)', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship && c.friendship!.delta < 0, 'Cần lựa chọn có friendship.delta < 0');
    const fc = e.choices[idx].friendship!;
    setActiveSurprise(e);
    useGame.setState({ regulars: { ...useGame.getState().regulars, [fc.id]: progress(100) } });

    chooseSurprise(idx);

    expect(useGame.getState().regulars[fc.id].friendship).toBe(100 + fc.delta);
  });

  it('clamp: thân thiết đã ở 0, chọn delta âm vẫn giữ nguyên 0', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship && c.friendship!.delta < 0, 'Cần lựa chọn có friendship.delta < 0');
    const fc = e.choices[idx].friendship!;
    setActiveSurprise(e);
    useGame.setState({ regulars: { ...useGame.getState().regulars, [fc.id]: progress(0) } });

    chooseSurprise(idx);

    expect(useGame.getState().regulars[fc.id].friendship).toBe(0);
  });

  it('chỉ khách quen được chỉ định trong friendship.id bị đổi; các khách khác giữ nguyên', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship && c.friendship!.delta > 0, 'Cần lựa chọn có friendship.delta > 0');
    const fc = e.choices[idx].friendship!;
    useGame.setState({ regulars: { ba_nam: progress(3), chu_ba: progress(2), [fc.id]: progress(1) } });
    setActiveSurprise(e);

    chooseSurprise(idx);

    const s = useGame.getState();
    expect(s.regulars[fc.id].friendship).toBe(1 + fc.delta);
    if (fc.id !== 'ba_nam') expect(s.regulars.ba_nam.friendship).toBe(3);
    if (fc.id !== 'chu_ba') expect(s.regulars.chu_ba.friendship).toBe(2);
  });

  it('lựa chọn không mang friendship: không làm đổi thân thiết của bất kỳ khách quen nào', () => {
    const { e, idx } = findSurprise((c) => !c.friendship, 'Cần một lựa chọn không có friendship');
    setActiveSurprise(e);
    useGame.setState({ regulars: { ba_nam: progress(7), chu_ba: progress(9) } });
    const before = JSON.stringify(useGame.getState().regulars);

    chooseSurprise(idx);

    expect(JSON.stringify(useGame.getState().regulars)).toBe(before);
  });

  it('khách quen chưa có hồ sơ (state.regulars trống): chọn friendship không vỡ, tự tạo hồ sơ đúng mức', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship, 'Cần lựa chọn có friendship');
    const fc = e.choices[idx].friendship!;
    useGame.setState({ regulars: {} });
    setActiveSurprise(e);

    expect(() => chooseSurprise(idx)).not.toThrow();

    const s = useGame.getState();
    expect(s.regulars[fc.id]).toBeDefined();
    expect(s.regulars[fc.id].friendship).toBe(Math.max(0, fc.delta));
    expect(s.regulars[fc.id].perks).toEqual([]);
    expect(s.regulars[fc.id].discovered).toEqual([]);
  });

  it('friendship nằm ở lựa chọn không phải đầu tiên vẫn được áp dụng đúng index', () => {
    const targets: { e: SurpriseDef; idx: number }[] = [];
    for (const e of SURPRISES) {
      const i = e.choices.findIndex((c) => !!c.friendship && c.friendship!.delta > 0);
      if (i > 0) targets.push({ e, idx: i });
    }
    expect(targets.length).toBeGreaterThanOrEqual(1);
    const { e, idx } = targets[0];
    const fc = e.choices[idx].friendship!;
    setActiveSurprise(e);

    chooseSurprise(idx);

    expect(useGame.getState().regulars[fc.id].friendship).toBe(0 + fc.delta);
  });

  it('thay đổi friendship không tính là một lượt ghé (visits giữ nguyên)', () => {
    const { e, idx } = findSurprise((c) => !!c.friendship && c.friendship!.delta > 0, 'Cần lựa chọn có friendship.delta > 0');
    const fc = e.choices[idx].friendship!;
    useGame.setState({ regulars: { [fc.id]: progress(5) } });
    setActiveSurprise(e);

    chooseSurprise(idx);

    expect(useGame.getState().regulars[fc.id].visits).toBe(0);
  });
});

describe('GĐ13 — Đánh đổi thiết kế', () => {
  it('có mẫu sự kiện vừa cho thân thiết vừa có tiền (có chiến lược đánh đổi), ít nhất 2 mẫu', () => {
    const trade = SURPRISES.filter((e) =>
      e.choices.some((c) => !!c.friendship) && e.choices.some((c) => c.money !== undefined),
    );
    expect(trade.length).toBeGreaterThanOrEqual(2);

    // Ngoài ra nên có lựa chọn nào đó mang CẢ friendship lẫn money trong cùng một nhánh
    const bothOnSameChoice = SURPRISES.some((e) => e.choices.some((c) => !!c.friendship && c.money !== undefined));
    expect(bothOnSameChoice).toBe(true);
  });
});
