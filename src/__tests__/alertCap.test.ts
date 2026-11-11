import { describe, it, expect } from 'vitest';
import { pickHidden, ALERT_CAP } from '../ui/alertCap';

describe('Playtest P0 M4 — tối đa 2 thẻ thông báo cùng lúc', () => {
  it('5 thẻ thường → hiện 2, ẩn 3', () => {
    const h = pickHidden(Array.from({ length: 5 }, () => ['hud-alert', 'info']));
    expect(ALERT_CAP).toBe(2);
    expect(h).toEqual([false, false, true, true, true]);
  });
  it('thẻ nguy cấp và hướng dẫn ngày đầu luôn hiện, không chiếm suất', () => {
    const h = pickHidden([
      ['hud-alert', 'danger'], ['hud-alert', 'info'], ['hud-alert', 'warn'],
      ['hud-alert', 'info', 'hud-tutorial'], ['hud-alert', 'info'],
    ]);
    expect(h).toEqual([false, false, false, false, true]);
  });
  it('thẻ lý do dừng giờ (pausing — câu hỏi ở quầy) luôn hiện, không chiếm suất', () => {
    const h = pickHidden([
      ['hud-alert', 'info'], ['hud-alert', 'warn'], ['hud-alert', 'pausing', 'phone', 'ringing'],
    ]);
    expect(h).toEqual([false, false, false]);
  });
  it('ít thẻ thì không ẩn gì', () => {
    expect(pickHidden([['hud-alert']])).toEqual([false]);
  });
});
