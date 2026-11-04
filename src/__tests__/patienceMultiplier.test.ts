import { describe, expect, it } from 'vitest';
import {
  patienceMultiplier, CAT_PATIENCE_MUL, CAT_SOOTHE_PROFESSIONS,
  counterQueueScore, leastScore, UNSTAFFED_COUNTER_PENALTY, MAIN_COUNTER_BIAS,
} from '../agents/customerEntity';
import { CARE_PATIENCE_PER_STAR } from '../data/staff';

/**
 * GĐ1208 — mở tầng agent (an toàn): tách logic quyết định "khách chịu chờ quầy bao lâu" (bội số patience)
 * từ agent khách (agents/customers.ts) thành helper THUẦN — cùng công thức, cùng hằng số, HÀNH VI GIỮ
 * NGUYÊN (khóa bằng simGolden/full suite). Trước đây nằm chìm trong agent gắn store/THREE nên không test
 * được; giờ test trực tiếp để số phản hồi (báo cáo "Vì sao khách không mua" — chờ lâu) khớp hành vi thật.
 */

describe('patienceMultiplier — GĐ1208 (bội số kiên nhẫn chờ quầy, THUẦN)', () => {
  it('không mèo, không nhân viên chăm sóc → ×1 (kiên nhẫn nguyên mẫu)', () => {
    expect(patienceMultiplier({ petCat: false, professionId: 'student_highschool', care: 0 })).toBe(1);
    expect(patienceMultiplier({ petCat: true, professionId: null, care: 0 })).toBe(1);
  });

  it('mèo hoạt động + khách nhỏ (học sinh, mẹ bỉm) → ×1.3', () => {
    for (const id of ['student_highschool', 'student_college', 'mom']) {
      expect(patienceMultiplier({ petCat: true, professionId: id, care: 0 })).toBe(CAT_PATIENCE_MUL);
    }
  });

  it('mèo nhưng khách KHÔNG thuộc nhóm nhỏ (nghề khác / khách quen) → không nhân mèo', () => {
    expect(patienceMultiplier({ petCat: true, professionId: 'worker', care: 0 })).toBe(1);
    expect(patienceMultiplier({ petCat: true, professionId: null, care: 0 })).toBe(1);
    expect(patienceMultiplier({ petCat: true, care: 0 })).toBe(1); // không khai nghề
  });

  it('nhân viên chăm sóc khách trực ca: ×(1 + 0.06×care) theo tay nghề', () => {
    expect(patienceMultiplier({ petCat: false, care: 0 })).toBe(1);
    expect(patienceMultiplier({ petCat: false, care: 2 })).toBeCloseTo(1 + CARE_PATIENCE_PER_STAR * 2);
    expect(patienceMultiplier({ petCat: false, professionId: 'worker', care: 3 })).toBeCloseTo(1 + CARE_PATIENCE_PER_STAR * 3);
  });

  it('cả mèo lẫn nhân viên → nhân chồng: 1.3 × (1 + 0.06×care)', () => {
    const out = patienceMultiplier({ petCat: true, professionId: 'mom', care: 4 });
    expect(out).toBeCloseTo(CAT_PATIENCE_MUL * (1 + CARE_PATIENCE_PER_STAR * 4), 10);
  });

  it('helper thuần: cùng đầu vào cho kết quả giống hệt (không đổi state/seed)', () => {
    const a = patienceMultiplier({ petCat: true, professionId: 'student_college', care: 5 });
    expect(patienceMultiplier({ petCat: true, professionId: 'student_college', care: 5 })).toBe(a);
  });

  it('danh sách nghề mèo-an-ủi khớp đúng nhóm student_* và mom (hằng số không đổi nghĩa)', () => {
    expect(CAT_SOOTHE_PROFESSIONS).toEqual(['student_highschool', 'student_college', 'mom']);
    expect(CAT_PATIENCE_MUL).toBe(1.3);
  });
});

describe('GĐ1213 — counterQueueScore + leastScore: khách chọn quầy thanh toán (tách từ agents/customers.ts joinQueue) — THUẦN QUAN SÁT, giữ nguyên công thức/hằng (Luật 3)', () => {
  it('hàng ngắn hơn → score nhỏ hơn (quầy 1 người < quầy 3 người)', () => {
    expect(counterQueueScore(1, true, false)).toBeLessThan(counterQueueScore(3, true, false));
  });

  it('quầy không có người tính tiền bị tính như dài thêm 3 (hình phạt không người đứng)', () => {
    // hàng 2 + có người = 2 < hàng 0 + không người (0 + 3 = 3) → khách né quầy vắng người
    expect(counterQueueScore(2, true, false)).toBe(2);
    expect(counterQueueScore(0, false, false)).toBe(3);
  });

  it('quầy chính được ưu tiên nhẹ (−0.1): score thấp hơn quầy phụ cùng độ dài', () => {
    expect(counterQueueScore(2, true, true)).toBeCloseTo(1.9, 6);
    expect(counterQueueScore(2, true, true)).toBeLessThan(counterQueueScore(2, true, false));
  });

  it('leastScore chọn score nhỏ nhất (quầy chính + hình phạt người + độ dài đều chi phối)', () => {
    const counters = [
      { key: 'main', len: 1, cash: true },   // 1 + 0 − 0.1 = 0.9
      { key: 'a', len: 0, cash: false },      // 0 + 3 + 0 = 3
      { key: 'b', len: 2, cash: true },       // 2
    ];
    const best = leastScore(counters, (ct) => counterQueueScore(ct.len, ct.cash, ct.key === 'main')).key;
    expect(best).toBe('main');
  });

  it('hoà điểm → giữ quầy đầu tiên (tie-break của bản gốc reduce với phép so sánh <)', () => {
    const a = { key: 'first', s: 5, n: 0 };
    const b = { key: 'second', s: 5, n: 0 };
    const c = { key: 'third', s: 4, n: 0 };
    const best = leastScore<{ key: string; s: number; n: number }>([a, b, c], (t) => t.s).key;
    expect(best).toBe('third');
    // Hàng trước có score 4 (nhỏ nhất); khi 2 quầy cùng score 4, giữ phần tử đầu tiên gặp.
    const x = { key: 'x', s: 4, n: 0 };
    const y = { key: 'y', s: 4, n: 0 };
    expect(leastScore([x, y], (t) => t.s).key).toBe('x');
  });

  it('giữ hằng số: hình phạt không người = 3, ưu tiên quầy chính = −0.1', () => {
    expect(UNSTAFFED_COUNTER_PENALTY).toBe(3);
    expect(MAIN_COUNTER_BIAS).toBe(-0.1);
  });
});
