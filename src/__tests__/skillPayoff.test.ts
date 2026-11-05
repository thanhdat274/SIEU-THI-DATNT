import { describe, expect, it } from 'vitest';
import { skillPayoff, SKILL_PAYOFF_MIN_LOSS } from '../data/skillPayoff';

/** GĐ1266 — soi cây kỹ năng: con số THẬT cho từng kỹ năng để quyết định điểm.
 *  Helper THUẦN — không đổi state/kinh tế; kiểm theo hằng số game + sổ người chơi. */

const base = {
  staffWageBill: 0,
  todayKhach: 0,
  revenueToday: 0,
  itemsSoldToday: 0,
  customersToday: 0,
  waitMissed: 0,
  yesterdaySpoil: 0,
  shelfMissInStorageLoss: 0,
};

describe('good_boss (lương −10%)', () => {
  it('có nhân viên thì báo đúng 10% Σ lương ca', () => {
    const p = skillPayoff('good_boss', { ...base, staffWageBill: 2_000_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('200.000');
  });

  it('chưa có nhân viên thì không ồn (ok=false)', () => {
    expect(skillPayoff('good_boss', { ...base, staffWageBill: 0 }).ok).toBe(false);
  });

  it('mutation: đổi hệ số 0.1 thì con số lệch — helper đọc đúng hằng số game', () => {
    // helper cố định 10% = hằng số good_boss 0.9 ở gameTypes/endDay; thử 0.2 cho ra số khác
    const p = skillPayoff('good_boss', { ...base, staffWageBill: 1_000_000 });
    expect(p.line).not.toContain('200.000'); // 10% của 1tr = 100k, không phải 200k
    expect(p.line).toContain('100.000');
  });
});

describe('local_legend (khách +10%)', () => {
  it('có khách dự kiến thì báo 10% số khách', () => {
    const p = skillPayoff('local_legend', { ...base, todayKhach: 120 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('12');
  });

  it('chưa có dữ liệu thì không ồn', () => {
    expect(skillPayoff('local_legend', { ...base, todayKhach: 0 }).ok).toBe(false);
  });
});

describe('big_basket (+1 món p=0.5)', () => {
  it('doanh thu thêm ước = 0.5 × khách × bình quân món', () => {
    // 80 khách, 200 món, 400.000đ → bình quân 2.000đ/món → +80×0.5×2000 = 80.000đ
    const p = skillPayoff('big_basket', {
      ...base, customersToday: 80, itemsSoldToday: 200, revenueToday: 400_000,
    });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('80.000');
  });

  it('chưa bán gì thì không ồn', () => {
    expect(skillPayoff('big_basket', { ...base, customersToday: 0, itemsSoldToday: 0 }).ok).toBe(false);
  });
});

describe('fresh_keeper (hỏng chậm 25%)', () => {
  it('có sổ hỏng đêm qua thì báo 25% tiền hỏng', () => {
    const p = skillPayoff('fresh_keeper', { ...base, yesterdaySpoil: 400_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('100.000');
    expect(p.line).toContain('400.000');
  });

  it('không có hàng hỏng thì không ồn', () => {
    expect(skillPayoff('fresh_keeper', { ...base, yesterdaySpoil: 0 }).ok).toBe(false);
  });
});

describe('neat_shelves (kệ +20% sức chứa)', () => {
  it('có phần lỡ kệ-trống-kho-còn đáng kể thì nhắc dùng sức chứa', () => {
    const p = skillPayoff('neat_shelves', { ...base, shelfMissInStorageLoss: 200_000 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('200.000');
  });

  it('lỡ nhỏ dưới ngưỡng thì không ồn (tránh nhiễu, cùng tinh thần các ngưỡng khác)', () => {
    expect(skillPayoff('neat_shelves', { ...base, shelfMissInStorageLoss: SKILL_PAYOFF_MIN_LOSS - 1 }).ok).toBe(false);
  });
});

describe('quick_hands (tính tiền nhanh 20%)', () => {
  it('hôm nay có khách bỏ vì chờ quầy thì nhắc đứng quầy/giữ khách', () => {
    const p = skillPayoff('quick_hands', { ...base, waitMissed: 4 });
    expect(p.ok).toBe(true);
    expect(p.line).toContain('4');
  });

  it('không ai bỏ vì chờ thì không ồn', () => {
    expect(skillPayoff('quick_hands', { ...base, waitMissed: 0 }).ok).toBe(false);
  });
});

describe('kỹ năng chưa có cách quy tiền trung thực', () => {
  it('charm / master_manager / fast_cook ... để mô tả % nguyên bản, không nói quá', () => {
    expect(skillPayoff('charm', base).ok).toBe(false);
    expect(skillPayoff('master_manager', base).ok).toBe(false);
    expect(skillPayoff('fast_cook', base).ok).toBe(false);
    expect(skillPayoff('cool_pack', base).ok).toBe(false);
    expect(skillPayoff('zero_waste', base).ok).toBe(false);
    expect(skillPayoff('snack_master', base).ok).toBe(false);
    expect(skillPayoff('drink_master', base).ok).toBe(false);
    expect(skillPayoff('sharp_eye', base).ok).toBe(false); // dòng riêng xử lý counterfeitRisk
  });
});
