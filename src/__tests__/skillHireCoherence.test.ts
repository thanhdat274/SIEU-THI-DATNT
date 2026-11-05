import { describe, expect, it } from 'vitest';
import { skillPayoff, SKILL_PAYOFF_MIN_LOSS } from '../data/skillPayoff';
import { hirePayoff, HIRE_SHELF_MIN_LOSS } from '../data/hirePayoff';

/**
 * GĐ1294 — Khóa BẤT BIẾN TRUNG THỰC GIỮA HAI HỆ TƯ VẤN: KỸ NĂNG (skillPayoff, GĐ1266) × TUYỂN DỤNG
 * (hirePayoff, GĐ1267). Hai panel hiện CÙNG một ngày (SkillsPanel + StaffPanel), và có những cặp
 * "kỹ năng ↔ vai thuê" vá CÙNG một lỗ đo được:
 *   - neat_shelves (kỹ năng, "+20% chỗ bày")  ↔ stocker (vai, xếp bày kịp)   → shelfMissInStorageLoss
 *   - quick_hands  (kỹ năng, "tính nhanh")    ↔ cashier/customer_care (vai) → waitMissed (khách bỏ vì chờ)
 * Hai hệ dùng CHUNG nguồn (cùng con số lỗ đang đo) nhưng chưa có test nào khóa chúng KHÔNG chênh nhau:
 * nếu skillPayoff đổi thành "lỡ ~X×2đ" mà hirePayoff vẫn "lỡ ~Xđ" là người chơi đọc hai số KHÁC nhau cho
 * CÙNG một lỗ → không biết tin ai (phình/trái, Nguyên tắc a). BẤT BIẾN:
 * 1. SAME-SOURCE — kỹ năng & vai thuê vá cùng lỗ phải trích ĐÚNG cùng con số đo được (token "~Xđ" / "N
 *    khách" bằng nhau giữa hai hệ), không ai bịa to hơn/nhỏ hơn để thành "hai mức".
 * 2. NGƯỠNG NHẤT QUÁN — SKILL_PAYOFF_MIN_LOSS === HIRE_SHELF_MIN_LOSS (cùng 50000): hai hệ cùng bật/tắt
 *    tại ĐÚNG điểm, không ai "khóc" trong khi người kia im cho cùng một lỗ (nhiễu lệch nhau).
 * 3. IM ĐỐI XỨNG — dưới ngưỡng / không có tín hiệu → CẢ HAI hệ im (không bịa lỗ mà người kia phớt lờ).
 * 4. SKILL PHÂN HOẠCH — mỗi kỹ năng kinh tế dùng ĐÚNG tín hiệu của nó (neat_shelves chỉ nhận shelf loss,
 *    quick_hands chỉ nhận waitMissed; không nhận lỗ của kỹ năng khác) — mở rộng tinh thần GĐ1292.
 * Đây là tính chất SkillsPanel + StaffPanel đang dựa vào khi hiện đồng thời; khóa để phòng hồi quy.
 * Test THUẦN — nhận sẵn dữ liệu đo, không đổi production/state/save/kinh tế/seed (Luật 5).
 */
describe('GĐ1294 — coherence: kỹ năng × tuyển dụng, cùng lỗ khác hệ, KHÔNG chênh nhau / không bịa lớn hơn lỗ', () => {
  // token "...~Xđ..." — thứ tự "số đ" kỹ năng & hirePayoff cùng emit (độc lập locale "50.000")
  const moneyToken = (line: string): string | undefined => (line.match(/~\s*([\d.,]+)\s*đ/) ?? [])[1];
  const waitToken = (line: string): string | undefined => (line.match(/([\d]+)\s+khách/) ?? [])[1];

  // skillPayoff cần đầy đủ các trường (dù per-skill chỉ dùng 1); hirePayoff cần đầy đủ trường role chung.
  const skillBase = {
    staffWageBill: 0,
    todayKhach: 0,
    revenueToday: 5_000_000,
    itemsSoldToday: 0,
    customersToday: 1000,
    waitMissed: 0,
    yesterdaySpoil: 0,
    shelfMissInStorageLoss: 0,
  };
  const hireBase = {
    wage: 300000,
    waitMissed: 0,
    shelfMissInStorageLoss: 0,
    dirt: 0,
    level: 30,
    customers: 1000,
    revenue: 5_000_000,
    guardCount: 0,
    cashierStaffed: false,
    hasDog: false,
    hasCamera: false,
    hasSharpEye: false,
  };

  it('SAME-SOURCE — kệ trống: neat_shelves (kỹ năng) & stocker (thuê) trích ĐÚNG CÙNG con số ~Xđ', () => {
    const X = 250_000;
    const skill = skillPayoff('neat_shelves', { ...skillBase, shelfMissInStorageLoss: X });
    const hire = hirePayoff('stocker', { ...hireBase, shelfMissInStorageLoss: X });
    expect(skill.ok).toBe(true);
    expect(hire.ok).toBe(true);
    expect(moneyToken(skill.line)).toBe(moneyToken(hire.line)); // cùng "~250.000đ", không ai chênh
    expect(moneyToken(skill.line)).toBeTruthy();
  });

  it('SAME-SOURCE — chờ quầy: quick_hands (kỹ năng) & cashier (thuê) trích ĐÚNG CÙNG "N khách"', () => {
    const N = 9;
    const skill = skillPayoff('quick_hands', { ...skillBase, waitMissed: N });
    const hire = hirePayoff('cashier', { ...hireBase, waitMissed: N });
    expect(skill.ok).toBe(true);
    expect(hire.ok).toBe(true);
    expect(waitToken(skill.line)).toBe(String(N));
    expect(waitToken(hire.line)).toBe(String(N)); // cùng một lỗ, không cộng dồn thành số khác
  });

  it('NGƯỠNG NHẤT QUÁN — skill & hire cắt ở ĐÚNG cùng ngưỡng 50000 cho cùng một lỗ kệ trống', () => {
    expect(SKILL_PAYOFF_MIN_LOSS).toBe(HIRE_SHELF_MIN_LOSS); // cùng 50000
    const boundary = SKILL_PAYOFF_MIN_LOSS; // = HIRE_SHELF_MIN_LOSS
    // vừa đủ ngưỡng → cả hai bật
    expect(skillPayoff('neat_shelves', { ...skillBase, shelfMissInStorageLoss: boundary }).ok).toBe(true);
    expect(hirePayoff('stocker', { ...hireBase, shelfMissInStorageLoss: boundary }).ok).toBe(true);
    // dưới ngưỡng → cả hai im (không ai "khóc" trước, không nhiễu lệch)
    expect(skillPayoff('neat_shelves', { ...skillBase, shelfMissInStorageLoss: boundary - 1 }).ok).toBe(false);
    expect(hirePayoff('stocker', { ...hireBase, shelfMissInStorageLoss: boundary - 1 }).ok).toBe(false);
  });

  it('IM ĐỐI XỨNG — không có tín hiệu thì cả kỹ năng lẫn vai thuê đều im (không bịa lỗ)', () => {
    // shelf loss = 0 → cả neat_shelves & stocker im
    expect(skillPayoff('neat_shelves', skillBase).ok).toBe(false);
    expect(hirePayoff('stocker', hireBase).ok).toBe(false);
    // waitMissed = 0 → cả quick_hands & cashier im, line rỗng
    expect(skillPayoff('quick_hands', skillBase).line).toBe('');
    expect(hirePayoff('cashier', hireBase).ok).toBe(false);
  });

  it('SKILL PHÂN HOẠCH — mỗi kỹ năng kinh tế chỉ phản ứng ĐÚNG tín hiệu của nó (không nhận lỗ kỹ năng khác)', () => {
    // neat_shelves chỉ cháy với shelf loss; im khi chỉ có waitMissed / spoil đêm qua
    expect(skillPayoff('neat_shelves', { ...skillBase, shelfMissInStorageLoss: 100_000 }).ok).toBe(true);
    expect(skillPayoff('neat_shelves', { ...skillBase, waitMissed: 20 }).ok).toBe(false);
    expect(skillPayoff('neat_shelves', { ...skillBase, yesterdaySpoil: 500_000 }).ok).toBe(false);
    // quick_hands chỉ cháy với waitMissed; im khi chỉ có shelf loss
    expect(skillPayoff('quick_hands', { ...skillBase, waitMissed: 5 }).ok).toBe(true);
    expect(skillPayoff('quick_hands', { ...skillBase, shelfMissInStorageLoss: 200_000 }).ok).toBe(false);
    // fresh_keeper dùng spoil đêm qua (signal riêng), KHÔNG nhận shelf loss
    expect(skillPayoff('fresh_keeper', { ...skillBase, yesterdaySpoil: 300_000 }).ok).toBe(true);
    expect(skillPayoff('fresh_keeper', { ...skillBase, shelfMissInStorageLoss: 200_000 }).ok).toBe(false);
  });

  it('THUẦN — cùng đầu vào cho cùng kết quả (không RNG)', () => {
    const s = { ...skillBase, shelfMissInStorageLoss: 250_000 };
    const h = { ...hireBase, shelfMissInStorageLoss: 250_000 };
    expect(skillPayoff('neat_shelves', s)).toEqual(skillPayoff('neat_shelves', s));
    expect(hirePayoff('stocker', h)).toEqual(hirePayoff('stocker', h));
    expect(moneyToken(skillPayoff('neat_shelves', s).line)).toBe(moneyToken(hirePayoff('stocker', h).line));
  });
});
