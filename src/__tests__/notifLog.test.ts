import { describe, it, expect, beforeEach } from 'vitest';
import { pushNotif, notifLog, clearNotifLog } from '../core/notifLog';

describe('GĐ2347 — Sổ thông báo (vòng ghi, không lưu save)', () => {
  beforeEach(() => clearNotifLog());

  it('mới nhất đứng đầu, giữ nhãn ngày + phút', () => {
    pushNotif(24, 9 * 60, '🧹 Sàn bẩn');
    pushNotif(24, 21 * 60 + 2, '📞 Đơn điện thoại');
    const log = notifLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toEqual({ day: 24, minutes: 1262, text: '📞 Đơn điện thoại' });
    expect(log[1].text).toBe('🧹 Sàn bẩn');
  });

  it('tin trùng LẬP TỨC liền trước thì bỏ qua (tick dồn), tin lặp cách xa vẫn ghi', () => {
    pushNotif(24, 600, '🔔 Tin A');
    pushNotif(24, 600, '🔔 Tin A');
    expect(notifLog()).toHaveLength(1);
    pushNotif(24, 610, '🔔 Tin khác');
    pushNotif(24, 700, '🔔 Tin A');
    expect(notifLog().filter((e) => e.text === '🔔 Tin A')).toHaveLength(2);
  });

  it('vòng giới hạn 80 tin — cắt đầu cũ nhất', () => {
    for (let i = 0; i < 100; i++) pushNotif(1, i, `tin ${i}`);
    const log = notifLog();
    expect(log).toHaveLength(80);
    expect(log[0].text).toBe('tin 99');
    expect(log[log.length - 1].text).toBe('tin 20');
  });
});
