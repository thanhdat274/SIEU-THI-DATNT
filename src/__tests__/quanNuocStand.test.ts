import { describe, expect, it } from 'vitest';
import { quanNuocStandState, QUAN_NUOC_UNLOCK } from '../data/quanNuoc';

/**
 * Bộ test GĐ7 — Quán Nước Đầu Ngõ: STATE hiển thị "khu đất trống" (đủ cấp thì cho thuê/lấp đầy) của quán nước.
 * Đây là hàm thuần, chạy trong node thuần, không phụ thuộc three/React, không cần mock nào.
 *
 * Hợp đồng `quanNuocStandState(level, open)`:
 *  - open === true                        → 'open'  (thắng mọi case, kể cả level < ngưỡng mở khoá)
 *  - open === false && level >= UNLOCK    → 'lot'   (đã đủ cấp, chưa mua → khu đất có thể lấp đầy)
 *  - ngược lại                            → 'hidden'
 * trong đó UNLOCK = QUAN_NUOC_UNLOCK = 29.
 */

describe('quanNuocStandState — các ngưỡng cấp khi chưa mua (open=false)', () => {
  it('cấp 28 (dưới ngưỡng) chưa mua → hidden', () => {
    expect(quanNuocStandState(28, false)).toBe('hidden');
  });

  it('cấp 29 (đúng ngưỡng) chưa mua → lot', () => {
    expect(quanNuocStandState(29, false)).toBe('lot');
  });

  it('cấp 40 chưa mua → lot', () => {
    expect(quanNuocStandState(40, false)).toBe('lot');
  });

  it('cấp 100 chưa mua → lot', () => {
    expect(quanNuocStandState(100, false)).toBe('lot');
  });
});

describe('quanNuocStandState — đã mua (open=true)', () => {
  it('cấp 29 open → open', () => {
    expect(quanNuocStandState(29, true)).toBe('open');
  });

  it('cấp 100 open → open', () => {
    expect(quanNuocStandState(100, true)).toBe('open');
  });
});

describe('quanNuocStandState — phòng thủ: open thắng cả khi dưới cấp mở khoá', () => {
  it('cấp 10 open → open (open thắng ngay cả dưới cấp mở khoá)', () => {
    expect(quanNuocStandState(10, true)).toBe('open');
  });
});

describe('quanNuocStandState — ranh giới chính xác QUAN_NUOC_UNLOCK', () => {
  it('kiểm tra tường minh cả hai phía ngưỡng import (28 vs 29)', () => {
    // Hai phía đối lập nhau quanh chính hằng số QUAN_NUOC_UNLOCK được import (29)
    expect(quanNuocStandState(QUAN_NUOC_UNLOCK - 1, false)).toBe('hidden');
    expect(quanNuocStandState(QUAN_NUOC_UNLOCK, false)).toBe('lot');
    expect(QUAN_NUOC_UNLOCK).toBe(29);
  });

  it('dưới ngưỡng bất kỳ cấp nào chưa mua đều hidden, kể cả cấp 1', () => {
    expect(quanNuocStandState(1, false)).toBe('hidden');
    expect(quanNuocStandState(QUAN_NUOC_UNLOCK - 1, false)).toBe('hidden');
  });
});

describe('quanNuocStandState — quét toàn dải cấp (đủ ngưỡng là đủ điều kiện)', () => {
  it('toàn bộ dải 1..100: flags đúng theo hợp đồng (open thắng mọi nơi; lot chỉ khi đủ cấp)', () => {
    for (let level = 1; level <= 100; level++) {
      // Đã mua → luôn open
      expect(quanNuocStandState(level, true), `level ${level} open`).toBe('open');
      // Chưa mua → lot khi đủ cấp, hidden khi chưa đủ
      const expected = level >= QUAN_NUOC_UNLOCK ? 'lot' : 'hidden';
      expect(quanNuocStandState(level, false), `level ${level}`).toBe(expected);
    }
  });
});
