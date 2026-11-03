import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { loadStories } from '../data/biz';
await loadStories(); // cảnh arc nạp lười — để endDay không vỡ khi xử lý mở rộng

/** GĐ1062 — core/slices/endDay nhánh KHỦNG HOẢNG MẠNG XÃ HỘI (dòng 360–368):
 *  bắt được nhân viên gian lận trong ngày (crew.caught) mà mạng chưa có buzz và cấp ≥ SOCIAL_UNLOCK (8),
 *  thì nửa số lần (simRng < 0.5) dán bài "🚨 Nghe đồn … vừa bắt được nhân viên ăn bớt hàng…" viral +
 *  gắn buzz crisis (× CRISIS_MUL) vào Sổ mạng xã hội, và báo tin sáng `📱⚠️ …lan trên mạng…`.
 *  Ép crew.caught bằng nhân viên tắt mắt (sticky) role stocker + simRng 0.1 (đủ < CATCH_BASE 0.12 để
 *  bị bắt, và < 0.5 để bùng khủng hoảng). */

const g = () => useGame.getState();

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.1); // staffDayEnd rng: bắt được + crisis rng < 0.5
  useGame.setState({
    ...newGameData(),
    day: 10, level: 20, money: 10_000_000, minutes: 20 * 60, notify: () => {},
    staff: [{ id: 2, name: 'Lan', role: 'stocker', skill: 3, wage: 90000, shift: 'morning', trait: 'sticky', daysWorked: 0 }],
  });
});

afterEach(() => vi.restoreAllMocks());

const news = () => g().lastSummary?.news ?? [];

describe('GĐ1062 — endDay khủng hoảng mạng xã hội khi bắt được nhân viên gian lận', () => {
  it('bắt được nhân viên tắt mắt + chưa có buzz + roll < 0.5 → tin xấu lan trên mạng + buzz crisis', () => {
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.includes('📱⚠️') && n.includes('lan trên mạng'))).toBe(true);
    // buzz crisis đã được gắn (post viral + đến ngày dừng trong tương lai)
    const buzz = g().social.buzz;
    expect(buzz).not.toBeNull();
    expect(buzz?.kind).toBe('crisis');
    expect(g().social.posts.some((p) => p.viral)).toBe(true);
  });

  it('không bắt được nhân viên nào (caught rỗng) → không có tin xấu lan truyền', () => {
    useGame.setState({ staff: [{ id: 3, name: 'Hiền', role: 'stocker', skill: 3, wage: 90000, shift: 'morning', trait: 'steady', daysWorked: 0 }] });
    expect(g().sleep()).toBe(true);
    expect(news().some((n) => n.includes('lan trên mạng'))).toBe(false);
    expect(g().social.buzz).toBeNull();
  });
});
