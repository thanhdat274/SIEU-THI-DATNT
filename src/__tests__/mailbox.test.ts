import { describe, expect, it } from 'vitest';
import { localMail, mailTodoItems } from '../data/mailbox';
import { TODO_SOURCES } from '../data/todo';
import { WHATS_NEW } from '../data/whatsNew';

describe('hòm thư', () => {
  it('quà chưa nhận hôm nay hiện thành thư; nhận rồi thì hết', () => {
    expect(localMail({ day: 5, giftLastDay: 4, wheelLastDay: 4 }).map((m) => m.id)).toEqual(['gift-5', 'wheel-5']);
    expect(localMail({ day: 5, giftLastDay: 5, wheelLastDay: 4 }).map((m) => m.id)).toEqual(['wheel-5']);
    expect(localMail({ day: 5, giftLastDay: 5, wheelLastDay: 5 })).toEqual([]);
  });
  it('chip giờ vắng chỉ khi có thư, trỏ tới panel mailbox', () => {
    expect(mailTodoItems({ day: 5, giftLastDay: 5, wheelLastDay: 5 })).toEqual([]);
    const [it] = mailTodoItems({ day: 5, giftLastDay: 4, wheelLastDay: 5 });
    expect(it.urgency).toBe('idle');
    expect(it.go).toEqual({ panel: 'mailbox' });
    expect(it.text).toContain('1');
  });
  it('đã đăng ký nguồn việc', () => { expect(TODO_SOURCES.mailbox).toBeTypeOf('function'); });
  it('Có gì mới: mục mới nhất đứng đầu, mỗi mục có nội dung', () => {
    const dates = WHATS_NEW.map((w) => w.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const w of WHATS_NEW) expect(w.lines.length).toBeGreaterThan(0);
  });
});
