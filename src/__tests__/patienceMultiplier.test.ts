import { describe, expect, it } from 'vitest';
import {
  patienceMultiplier, CAT_PATIENCE_MUL, CAT_SOOTHE_PROFESSIONS,
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
