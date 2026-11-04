import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { endDay } from '../core/slices/endDay';
import { grabFee } from '../data/online';

/**
 * GĐ1185 — khoá PARITY lit giữa save / ngày / hẻm online cho bộ đếm online mới (GĐ1182/1183):
 *  `stats.onlineMissedCount` / `stats.onlineMissed` (đơn app bỏ lỡ) và `stats.onlineOwnGrabSaved`
 *  (phí Grab tiết kiệm khi người giao tự chở). Cả 3 là trường TUỲ CHỌN mới — phải:
 *   1) save cũ thiếu → bù `?? 0`, không crash (kinh tế/seed không đổi);
 *   2) reset THEO NGÀY: chỉ đếm "hôm nay", ngày mai `emptyStats()` trả về rỗng — đếm không rò rỉ qua ngày;
 *   3) sống trong `stats` (object chung máy chạy gửi máy khác) → chơi đơn & hẻm online ra KẾT QUẢ GIỐNG NHAU.
 *  Test này THUẦN quan sát — không đổi kinh tế/save/seed.
 */
const g = () => useGame.getState();

beforeEach(() => {
  useGame.setState({ ...newGameData(), level: 10, money: 5_000_000, notify: () => {} });
});

describe('save cũ (thiếu trường) — backfill ?? 0, không crash', () => {
  it('emptyStats không có trường online-mới; đọc qua ?? 0 ổn định', () => {
    const s = g();
    expect(s.stats.onlineMissedCount).toBeUndefined();
    expect(s.stats.onlineMissed).toBeUndefined();
    expect(s.stats.onlineOwnGrabSaved).toBeUndefined();
    expect((s.stats.onlineMissedCount ?? 0) + 1).toBe(1);
    expect((s.stats.onlineMissed ?? 0)).toBe(0);
    expect((s.stats.onlineOwnGrabSaved ?? 0)).toBe(0);
  });
});

describe('reset theo ngày + giữ đếm cho lastSummary (payload chung hai chế độ)', () => {
  it('nhận + từ chối đơn trong ngày → ghi đếm; endDay đưa vào lastSummary, hôm sau reset rỗng', () => {
    useGame.setState({
      minutes: 610,
      storage: { bia: 10, nuoc: 20 },
      staff: [{ id: 1, name: 'Cuội', role: 'courier', skill: 3, wage: 40000, shift: 'full' }],
      online: {
        ...g().online, open: true,
        orders: [
          { id: 1, customer: 'Cô Lan', km: 1, items: { bia: 3 }, placedAt: 600, dueAt: 800, status: 'new' as const },
          { id: 2, customer: 'Bà Tư', km: 2, items: { nuoc: 2 }, placedAt: 600, dueAt: 800, status: 'new' as const },
        ],
      },
    });
    // đơn 1 — người giao tự chở → tiết kiệm phí Grab
    expect(g().acceptOnline(1, 'own')).toBe(true);
    // đơn 2 — chủ từ chối → ghi nhận bỏ lỡ
    g().declineOnline(2);
    expect(g().stats.onlineMissedCount).toBe(1);
    expect((g().stats.onlineMissed ?? 0)).toBeGreaterThan(0);
    expect(g().stats.onlineOwnGrabSaved).toBe(grabFee(1));

    endDay(useGame.setState, useGame.getState);
    const st = g();
    // ngày vừa chốt: đếm còn đủ trong lastSummary.stats (chính là object máy chạy gửi máy khác)
    expect(st.lastSummary?.stats.onlineMissedCount).toBe(1);
    expect(st.lastSummary?.stats.onlineOwnGrabSaved).toBe(grabFee(1));
    expect((st.lastSummary?.stats.onlineMissed ?? 0)).toBeGreaterThan(0);
    // ngày mới: reset về rỗng — đếm không rò rỉ sang ngày sau
    expect(st.stats.onlineMissedCount).toBeUndefined();
    expect(st.stats.onlineOwnGrabSaved).toBeUndefined();
    expect(st.stats.onlineMissed).toBeUndefined();
  });
});
