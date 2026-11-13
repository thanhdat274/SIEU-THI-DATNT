import { describe, expect, it } from 'vitest';
import { lockDisabledByParam } from '../core/tabLock';

describe('khoá 1 tab — lối thoát dev/test/review', () => {
  it('bỏ khoá với lock=off, thu=1, dev=a', () => {
    for (const q of ['?lock=off', '?thu=1', '?dev=a', '?x=1&thu=1']) expect(lockDisabledByParam(q)).toBe(true);
  });
  it('save thật (không tham số) vẫn bị khoá', () => {
    for (const q of ['', '?x=1', '?thu=0']) expect(lockDisabledByParam(q)).toBe(false);
  });
});
