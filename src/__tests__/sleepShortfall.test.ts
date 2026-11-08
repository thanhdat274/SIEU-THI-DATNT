import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';

/**
 * GĐ1833 — cảnh báo trước khi ngủ khi két không đủ trả tiền nhà/lương/vận hành
 * (review đợt 2 R3 + đợt 3 R3): hẻm QA thật bị −7.659đ rồi âm tiếp nhiều ngày mà không có ai
 * báo trước. Giờ lần ngủ đầu bị chặn kèm cảnh báo; bấm lần nữa vẫn ngủ (người chơi được chấp
 * nhận nợ nhưng phải biết), tổng kết kê dòng thiếu hụt rõ ràng.
 */

const g = () => useGame.getState();

beforeEach(() => {
  useGame.setState({ ...newGameData(), minutes: 19 * 60 });
});

describe('cảnh báo tiền âm trước khi ngủ (GĐ1833)', () => {
  it('đủ tiền (360k > tiền nhà 20k): ngủ ngay, không cảnh báo', () => {
    expect(g().sleep()).toBe(true);
    expect(g().day).toBe(2);
    expect(g().lastSummary!.stats.shortfall).toBeUndefined();
  });

  it('két không đủ trả: lần đầu bị chặn kèm cảnh báo, lần hai vẫn ngủ và tổng kết kê thiếu hụt', () => {
    useGame.setState({ money: 5_000 }); // dưới tiền nhà 20.000đ
    const money0 = g().money;
    expect(g().sleep()).toBe(false);
    expect(g().day).toBe(1); // chưa qua ngày
    expect(g().money).toBe(money0);
    expect(g().message ?? '').toContain('Bấm Ngủ lần nữa vẫn ngủ');
    expect(g().notify.length ? g().message : g().message).toBeDefined();
    // thông báo đúng ngân sách ≤90 ký tự
    expect((g().message ?? '').length).toBeLessThanOrEqual(90);
    // lần hai vẫn ngủ
    expect(g().sleep()).toBe(true);
    expect(g().day).toBe(2);
    expect(g().money).toBeLessThan(0); // tiền âm thật — thiết kế không giấu
    expect(g().lastSummary!.stats.shortfall).toBe(-g().money);
  });
});
