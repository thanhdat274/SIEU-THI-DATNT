import { describe, expect, it } from 'vitest';
import { tiemXoiMorning, tiemXoiCapacity } from '../data/tiemXoi';

/** GĐ1172 — sáng sau ngày nồi hỏng (event 'cooker'), sản lượng thấp là vì máy hỏng chứ KHÔNG phải thợ dư
 *  sức: không gợi ý "cho nghỉ bớt". Trước đây total thấp do nồi hỏng bị đọc nhầm thành thợ dư sức. */
describe('GĐ1172 — tiemXoiMorning', () => {
  it('net = saved − wages', () => {
    const m = tiemXoiMorning({ open: true, staff: 1 }, { total: 80, saved: 900_000, wages: 360_000 });
    expect(m.net).toBe(540_000);
  });

  it('thợ thật sự dư sức (kho đủ, không sự kiện) vẫn báo cho nghỉ bớt', () => {
    // staff=1 nấu được 120; hôm qua chỉ nấu 60 vì kho gần đủ → dư sức thật.
    expect(tiemXoiCapacity(1)).toBe(120);
    expect(tiemXoiCapacity(0)).toBe(60);
    const m = tiemXoiMorning({ open: true, staff: 1 }, { total: 60, saved: 480_000, wages: 180_000 });
    expect(m.idle).toBe(true);
  });

  it('cùng số nấu thấp nhưng vì NỒI HỎNG: không báo cho nghỉ bớt', () => {
    const m = tiemXoiMorning({ open: true, staff: 1 }, { total: 60, saved: 480_000, wages: 180_000, event: 'cooker' });
    expect(m.idle).toBe(false);
  });

  it('sự kiện gạo khan (giá vốn tăng) không phải lý do dư sức — vẫn báo idle nếu thật sự nấu ít', () => {
    const m = tiemXoiMorning({ open: true, staff: 1 }, { total: 60, saved: 400_000, wages: 180_000, event: 'gao' });
    expect(m.idle).toBe(true);
  });

  it('chưa có kết quả (mới mở): net null, không báo gì', () => {
    expect(tiemXoiMorning({ open: true, staff: 1 }, undefined)).toEqual({ net: null, idle: false });
  });
});
