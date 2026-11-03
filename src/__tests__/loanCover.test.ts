import { describe, expect, it } from 'vitest';
import {
  LOAN_UNLOCK, loanToCover, loanTopUps, loanOptions, loanLimit, loanInterest,
} from '../data/bizFinance';

describe('vay vốn (hệ tín dụng GĐ734) — hàm thuần quyết định vay', () => {
  describe('loanOptions / loanLimit — gói mở theo cấp, hạn mức = gói lớn nhất', () => {
    it('cấp dưới 5 chưa mở vay thường', () => {
      expect(loanOptions(1)).toEqual([]);
      expect(loanOptions(4)).toEqual([]);
      expect(loanLimit(4)).toBe(0);
    });
    it('cấp 5 mở gói 1 triệu', () => {
      expect(loanOptions(5)).toEqual([1000000]);
      expect(loanLimit(5)).toBe(1000000);
    });
    it('cấp 15 mở thêm 3 triệu, cấp 30 mở 10 triệu', () => {
      expect(loanOptions(15)).toEqual([1000000, 3000000]);
      expect(loanOptions(30)).toEqual([1000000, 3000000, 10000000]);
      expect(loanLimit(30)).toBe(10000000);
    });
  });

  describe('loanTopUps — vay thêm khi đang nợ không vượt hạn mức', () => {
    it('còn dư hạn mức thì liệt kê các khoản vay thêm nhỏ', () => {
      // Cấp 30 (hạn mức 10M), đang nợ 9M → chỉ còn vay thêm 500k và 1M
      expect(loanTopUps(30, 9000000)).toEqual([500000, 1000000]);
      // Đang nợ 9.5M → chỉ còn 500k (1M sẽ vượt 10M)
      expect(loanTopUps(30, 9500000)).toEqual([500000]);
      // Đang nợ 9.8M → 500k cũng vượt 10M → không còn vay thêm
      expect(loanTopUps(30, 9800000)).toEqual([]);
    });
    it('đã chạm hạn mức thì không còn vay thêm', () => {
      expect(loanTopUps(30, 10000000)).toEqual([]);
      expect(loanTopUps(5, 1000000)).toEqual([]);
    });
  });

  describe('loanToCover — khoản vay nhỏ nhất đủ bù, null nếu không còn vay được', () => {
    it('đang nợ: lấy khoản vay thêm nhỏ nhất đủ bù need', () => {
      // Cấp 30, nợ 9M, cần 500k → vay thêm 500k
      expect(loanToCover(30, 9000000, 500000)).toEqual({ amount: 500000, emergency: false });
      // Cần 600k → vay thêm 1M (khoản nhỏ nhất ≥ need)
      expect(loanToCover(30, 9000000, 600000)).toEqual({ amount: 1000000, emergency: false });
    });
    it('đang nợ sát hạn mức: cần hơn khoản vay thêm còn được thì từ chối', () => {
      // Nợ 9.8M, cần 1.2M → chỉ vay thêm được 500k, không đủ → null
      expect(loanToCover(30, 9800000, 1200000)).toBeNull();
    });
    it('chưa tới cấp mở vay: chỉ có gói vay gấp (emergency) 1 triệu nếu need vừa đủ', () => {
      expect(loanToCover(4, null, 500000)).toEqual({ amount: 1000000, emergency: true });
      expect(loanToCover(4, null, 1000000)).toEqual({ amount: 1000000, emergency: true });
      // Cần quá 1 triệu mà chưa mở vay thường → không vay được
      expect(loanToCover(4, null, 1500000)).toBeNull();
    });
    it('đã mở vay (đủ cấp), chưa nợ: lấy gói nhỏ nhất đủ bù need', () => {
      expect(loanToCover(LOAN_UNLOCK, null, 500000)).toEqual({ amount: 1000000, emergency: false });
      expect(loanToCover(15, null, 2000000)).toEqual({ amount: 3000000, emergency: false });
      // Cần hơn gói lớn nhất → null
      expect(loanToCover(15, null, 4000000)).toBeNull();
      expect(loanToCover(30, null, 9000000)).toEqual({ amount: 10000000, emergency: false });
    });
  });

  describe('loanInterest — lãi trừ mỗi tối, làm tròn trăm đồng', () => {
    it('hàng triệu, làm tròn về trăm như ngân hàng thu thật', () => {
      // 1 triệu × 0.008 = 8000 → tròn trăm 8000
      expect(loanInterest(1000000)).toBe(8000);
      // 3 triệu × 0.008 = 24000
      expect(loanInterest(3000000)).toBe(24000);
    });
    it('nợ 0 thì không lãi', () => {
      expect(loanInterest(0)).toBe(0);
    });
  });
});
