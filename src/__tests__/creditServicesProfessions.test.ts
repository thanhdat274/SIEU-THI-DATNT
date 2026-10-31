import { describe, expect, it, beforeEach } from 'vitest';
import { creditLimit, wantsCredit, repaysToday, CREDIT_FRIENDSHIP, DEBT_LATE_DAYS, type Debt } from '../data/credit';
import { dayOfMonth, rollService, serviceById, serviceDraw, SERVICES, BILL_RUSH_DAYS, MONTH_DAYS } from '../data/services';
import { pickProfession, PROFESSIONS, PROFESSION_LOOK, PROFESSION_SHARE } from '../data/professions';
import { productById } from '../data/products';
import { setSimSeed } from '../core/rand';
import type { RegularDef } from '../data/regulars';

// GĐ259 — phủ test logic còn trống (coverage sweep): sổ ghi nợ (credit), dịch vụ quầy (services),
// khách theo nghề (professions). Toàn bộ helper THUẦN ĐỌC — không đụng store/kinh tế.

const def = (priceSensitivity: number) => ({ priceSensitivity, id: 'x' }) as RegularDef;
const debt = (amount: number, since: number, reminded?: boolean): Debt => ({ amount, since, reminded });

describe('credit — hạn mức & xin ghi sổ', () => {
  it('creditLimit: càng thân hạn mức càng cao; chưa biết khách = mức sàn; thân âm không âm hạn mức', () => {
    expect(creditLimit(undefined)).toBe(50000);
    expect(creditLimit({ friendship: 0 } as never)).toBe(50000);
    expect(creditLimit({ friendship: 10 } as never)).toBe(70000); // 50000 + 10 × 2000
    expect(creditLimit({ friendship: -5 } as never)).toBe(50000); // max(0, …)
  });

  it('wantsCredit: chưa đủ thân → không xin dù roll 0; nợ cũ + món mới vượt hạn mức → từ chối', () => {
    expect(wantsCredit(def(1), { friendship: CREDIT_FRIENDSHIP - 1 } as never, undefined, 10000, 0)).toBe(false);
    const p = { friendship: 20 } as never;
    // hạn mức 90000; nợ cũ 60000 + món 40000 = vượt
    expect(wantsCredit(def(1), p, debt(60000, 1), 40000, 0)).toBe(false);
  });

  it('wantsCredit: khách nhạy giá cao xin ghi sổ dễ hơn (roll < 0.25 × độ nhạy)', () => {
    const p = { friendship: 20 } as never;
    expect(wantsCredit(def(1.2), p, undefined, 10000, 0.29)).toBe(true); // 0.25 × 1.2 = 0.3
    expect(wantsCredit(def(0.4), p, undefined, 10000, 0.29)).toBe(false); // 0.25 × 0.4 = 0.1
    expect(wantsCredit(def(1), p, undefined, 10000, 0.25)).toBe(false); // biên: đúng ngưỡng là không
  });

  it('repaysToday: nợ hôm nay chưa là nợ cũ; đã nhắc thì chắc chắn trả; chưa nhắc thì 70%', () => {
    expect(repaysToday(undefined, 5, 0)).toBe(false);
    expect(repaysToday(debt(0, 1), 5, 0)).toBe(false);
    expect(repaysToday(debt(30000, 5), 5, 0)).toBe(false); // since >= day — vừa ghi hôm nay
    expect(repaysToday(debt(30000, 4), 5, 0.99)).toBe(false); // chưa nhắc + roll 0.99 ≥ 0.7 → không trả
    expect(repaysToday(debt(30000, 4, true), 5, 0.99)).toBe(true); // đã nhắc → chắc chắn trả
    expect(repaysToday(debt(30000, 4), 5, 0.69)).toBe(true);
    expect(repaysToday(debt(30000, 4), 5, 0.71)).toBe(false);
  });
});

describe('services — đồng xu người đi đường & khung thu hộ', () => {
  it('dayOfMonth: vòng theo tháng 30 ngày (ngày 31 → 1)', () => {
    expect(dayOfMonth(1)).toBe(1);
    expect(dayOfMonth(30)).toBe(30);
    expect(dayOfMonth(31)).toBe(1);
    expect(dayOfMonth(MONTH_DAYS * 2)).toBe(30);
  });

  it('serviceById trả đủ bảng SERVICES; id lạ → undefined', () => {
    for (const s of SERVICES) expect(serviceById(s.id)).toBe(s);
    expect(serviceById('khong_co')).toBeUndefined();
  });

  it('serviceDraw: thu hộ mấy ngày đầu tháng đông gấp 4; dịch vụ khác đều như thường', () => {
    const bills = serviceById('bills')!;
    for (let d = 1; d <= BILL_RUSH_DAYS; d++) expect(serviceDraw(bills, d)).toBe(bills.draw * 4);
    expect(serviceDraw(bills, BILL_RUSH_DAYS + 1)).toBe(bills.draw);
    for (const s of SERVICES) {
      if (s.id === 'bills') continue;
      expect(serviceDraw(s, 2)).toBe(s.draw);
      expect(serviceDraw(s, 40)).toBe(s.draw);
    }
  });

  it('rollService: rơi đúng khối tích luỹ; chưa sở hữu thì không rơi; roll ngoài tổng → không dùng dịch vụ', () => {
    expect(rollService([], 10, 0)).toBeUndefined();
    expect(rollService(['topup'], 10, 0)).toBe(serviceById('topup'));
    expect(rollService(['topup'], 10, 0.999)).toBeUndefined();
    // id lạ bị bỏ qua, không phá tích luỹ
    expect(rollService(['khong_co', 'lottery'] as never, 10, 0)).toBe(serviceById('lottery'));
    // đầu tháng khối thu hộ phình to: roll trong vùng 4× draw vẫn rơi vào bills dù đứng sau topup
    const owned = ['topup', 'bills'];
    const topup = serviceById('topup')!;
    const bills = serviceById('bills')!;
    const acc1 = topup.draw;
    expect(rollService(owned, 2, acc1 + 0.01)).toBe(bills); // đầu tháng: vùng bills phình ×4, ăn trọn roll vừa qua topup
    expect(rollService(owned, 10, acc1 + 0.05)).toBeUndefined(); // ngày thường bills chỉ 0.03 → roll vượt tổng → không dùng
  });
});

describe('professions — khách theo nghề', () => {
  it('bảng nghề khoẻ: id không trùng, món thích có thật trong bảng hàng, lòng trung thành trong (0,1]', () => {
    const ids = new Set(PROFESSIONS.map((p) => p.id));
    expect(ids.size).toBe(PROFESSIONS.length);
    for (const p of PROFESSIONS) {
      expect(p.loyalty).toBeGreaterThan(0);
      expect(p.loyalty).toBeLessThanOrEqual(1);
      for (const id of p.likes) expect(productById(id)).toBeTruthy();
    }
  });

  it('PROFESSION_LOOK: biến thể ngoại hình đều có màu áo hợp lệ', () => {
    for (const [key, look] of Object.entries(PROFESSION_LOOK)) {
      expect(typeof look!.topColor).toBe('number');
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('pickProfession (seed cố định): trả null hoặc nghề trong bảng; tần suất null ~ đúng tỉ lệ chia sẻ', () => {
    let nulls = 0;
    const N = 400;
    for (let i = 0; i < N; i++) {
      setSimSeed(1000 + i);
      const p = pickProfession(12 * 60);
      if (p === null) nulls++;
      else expect(PROFESSIONS.includes(p)).toBe(true);
    }
    // share 0.55, không boosted → null khi roll > 0.55; dung sai rộng cho ngẫu nhiên seeded
    expect(nulls / N).toBeGreaterThan(0.35);
    expect(nulls / N).toBeLessThan(0.75);
  });

  it('pickProfession: nghề được quảng cáo nhắm tới ghé nhiều hơn hẳn (so 2 seed loạt)', () => {
    const target = PROFESSIONS[0].id;
    const count = (boosted: string[]) => {
      let n = 0;
      for (let i = 0; i < 600; i++) {
        setSimSeed(5000 + i);
        if (pickProfession(12 * 60, boosted)?.id === target) n++;
      }
      return n;
    };
    expect(count([target])).toBeGreaterThan(count([]) * 1.8);
  });
});
