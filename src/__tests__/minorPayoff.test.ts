import { describe, expect, it } from 'vitest';
import { counterPayoff, crisisStatus, huiRoundSummary, recentAvgRevenue, vendingPayoff } from '../data/minorPayoff';
import { APOLOGY_MUL, CRISIS_MUL } from '../data/social';

describe('GĐ159 — hụi: đã góp trong vòng này', () => {
  const hui = (paidDays: number, received = false) => ({ daily: 100000, members: 10, startDay: 1, turnDay: 5, received, paidDays });

  it('contributed = daily × paidDays (chính xác, khớp cách news vỡ hụi tính)', () => {
    expect(huiRoundSummary(hui(3))).toMatchObject({ contributed: 300000, pot: 1000000, daysLeft: 7, received: false });
  });

  it('góp đủ vòng thì hết ngày góp; hốt rồi vẫn còn ngày góp tới mãn vòng', () => {
    expect(huiRoundSummary(hui(10)).daysLeft).toBe(0);
    const r = huiRoundSummary(hui(6, true));
    expect(r.received).toBe(true);
    expect(r.contributed).toBe(600000);
    expect(r.daysLeft).toBe(4);
  });

  it('save cũ kỳ lạ góp vượt số chân thì daysLeft kẹp về 0, không âm', () => {
    expect(huiRoundSummary(hui(12)).daysLeft).toBe(0);
  });
});

describe('GĐ159 — phản công: bớt sức mạnh rival ≈ khách/tiền', () => {
  // rivalTrafficFactor khi không xả hàng: 1 − strength/100 × 0.25 → tuyến tính 0,25% khách/sức mạnh
  // (so với khách bình thường). Đo tại rival yếu nhất còn sống (1): relative chỉ nhỉnh hơn chút.
  it('tuyến tính: bớt 1 sức mạnh ≈ +0,25% khách (đo tại rival 1)', () => {
    const g = counterPayoff(1, 1, false, 200000);
    expect(g.pctCustomers).toBeCloseTo(0.0025 / 0.9975 * 100, 10);
    expect(g.moneyPerDay).toBe(501);
  });

  it('đòn 4 sức mạnh trên rival 40: ~+1,11% khách so với hiện tại', () => {
    const g = counterPayoff(40, 4, false, 1000000);
    expect(g.pctCustomers).toBeCloseTo((0.91 - 0.9) / 0.9 * 100, 10);
    expect(g.moneyPerDay).toBe(11111);
  });

  it('rival đang xả hàng: hệ số ×2 → đòn giá trị khách gấp đôi', () => {
    const g = counterPayoff(40, 4, true, 1000000);
    expect(g.pctCustomers).toBeCloseTo(2.5, 10);
    expect(g.moneyPerDay).toBe(25000);
  });

  it('sàn 0.5 của rivalTrafficFactor vẫn được tôn trọng (rival 100 đang xả hàng)', () => {
    const g = counterPayoff(100, 6, true, 1000000);
    expect(g.pctCustomers).toBeCloseTo(6, 10);
    expect(g.moneyPerDay).toBe(60000);
  });

  it('đòn lớn hơn sức mạnh còn lại: kẹp về 0 sức mạnh, không âm', () => {
    const g = counterPayoff(3, 9, false, 1000000);
    expect(g.pctCustomers).toBeCloseTo(0.755668, 5);
    expect(g.moneyPerDay).toBe(7557);
  });

  it('chưa có doanh thu bình quân thì tiền là 0, % vẫn tính', () => {
    expect(counterPayoff(40, 4, false, 0)).toMatchObject({ pctCustomers: expect.any(Number), moneyPerDay: 0 });
  });
});

describe('GĐ159 — bình quân doanh thu 7 ngày', () => {
  it('chỉ lấy cửa sổ 7 ngày cuối', () => {
    const history = Array.from({ length: 10 }, (_, i) => ({ revenue: 100 + i }));
    expect(recentAvgRevenue(history)).toBe(106); // 100..109 → cửa sổ 103..109
  });

  it('thiếu 7 ngày thì lấy phần có; rỗng/undefined thì 0', () => {
    expect(recentAvgRevenue([{ revenue: 60 }, { revenue: 70 }, { revenue: 80 }])).toBe(70);
    expect(recentAvgRevenue([])).toBe(0);
    expect(recentAvgRevenue(undefined)).toBe(0);
  });
});

describe('GĐ159 — khủng hoảng MXH: còn mấy ngày, xin lỗi cứu bao nhiêu', () => {
  it('until là ngày CUỐI còn hiệu lực → còn N ngày kể cả hôm nay', () => {
    expect(crisisStatus(10, 7).daysLeft).toBe(4);
    expect(crisisStatus(10, 10).daysLeft).toBe(1);
    expect(crisisStatus(10, 11).daysLeft).toBe(0); // đã hết → UI ẩn dòng
  });

  it('hệ số thật: CRISIS 0.72 → APOLOGY 0.92, cứu 0.20 khách bình thường mỗi ngày còn lại', () => {
    const cs = crisisStatus(10, 7);
    expect(cs.crisisMul).toBe(CRISIS_MUL);
    expect(cs.apologyMul).toBe(APOLOGY_MUL);
    expect(cs.savedOfNormal).toBeCloseTo(0.2, 10);
  });
});

describe('GĐ159 — máy bán hàng chi nhánh: hoàn vốn', () => {
  it('điện máy 10k/ngày khi chưa lắp tiết kiệm điện', () => {
    const p = vendingPayoff(40000, false);
    expect(p.electricityPerDay).toBe(10000);
    expect(p.days).toBe(14); // ceil(400k / 30k)
  });

  it('đã lắp efficient: điện máy còn 6.500đ', () => {
    const p = vendingPayoff(20000, true);
    expect(p.electricityPerDay).toBe(6500);
    expect(p.days).toBe(30); // ceil(400k / 13.5k)
  });

  it('chưa đủ bù điện thì null (UI đổi câu)', () => {
    expect(vendingPayoff(10000, false).days).toBeNull();
    expect(vendingPayoff(9000, false).days).toBeNull();
  });

  it('ngày thu dép đủ lớn thì hoàn vốn trong 1 ngày', () => {
    expect(vendingPayoff(410000, false).days).toBe(1);
  });
});
