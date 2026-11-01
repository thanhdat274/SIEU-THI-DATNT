import { describe, expect, it, beforeEach } from 'vitest';
import { setSimSeed } from '../core/rand';
import { BILL_RUSH_DAYS, MONTH_DAYS, dayOfMonth, serviceById, serviceDraw, rollService } from '../data/services';

// Coverage sweep GĐ296: serviceDraw/rollService chưa có test trực tiếp nào — logic trọng số dịch vụ
// (thu hộ dồn đầu tháng) là dữ liệu cân bằng, phải khoá lại để không vỡ im lặng khi ai chỉnh draw.
// fee() đọc simRng() → seed cố định để test tất định (quy ước seed GĐ27/28).

beforeEach(() => setSimSeed(12345));

describe('serviceDraw — lượng khách dịch vụ theo ngày (GĐ296)', () => {
  it('thu hộ tiền điện nước dồn ×4 trong BILL_RUSH_DAYS ngày đầu tháng', () => {
    const bills = serviceById('bills')!;
    expect(serviceDraw(bills, 1)).toBe(bills.draw * 4);
    expect(serviceDraw(bills, BILL_RUSH_DAYS)).toBe(bills.draw * 4);
    expect(serviceDraw(bills, BILL_RUSH_DAYS + 1)).toBe(bills.draw);
  });

  it('vòng tháng (MONTH_DAYS=30): ngày 31 = mùng 1 tháng sau → vẫn mùa thu hộ', () => {
    expect(dayOfMonth(31)).toBe(1);
    const bills = serviceById('bills')!;
    expect(serviceDraw(bills, 31)).toBe(bills.draw * 4);
    expect(serviceDraw(bills, MONTH_DAYS)).toBe(bills.draw); // ngày 30 còn trong tháng
  });

  it('dịch vụ khác không đổi theo ngày (nạp tiền, vé số...)', () => {
    for (const id of ['topup', 'lottery', 'parking', 'parcel']) {
      const def = serviceById(id)!;
      expect(serviceDraw(def, 2)).toBe(def.draw);
      expect(serviceDraw(def, 20)).toBe(def.draw);
    }
  });
});

describe('rollService — chọn dịch vụ cho người đi đường (GĐ296)', () => {
  it('roll dưới trọng số món đầu → chọn món đầu; vượt dồn tới món sau', () => {
    const topup = serviceById('topup')!;  // draw 0.12
    const bills = serviceById('bills')!;  // draw 0.03
    expect(rollService(['topup', 'bills'], 10, 0.05)).toBe(topup);
    expect(rollService(['topup', 'bills'], 10, 0.13)).toBe(bills); // 0.12 ≤ 0.13 < 0.15
  });

  it('roll ≥ tổng trọng số → không ai dùng dịch vụ', () => {
    expect(rollService(['topup', 'bills'], 10, 0.15)).toBeUndefined();
    expect(rollService(['topup'], 10, 0.12)).toBeUndefined(); // biên: roll < acc mới chọn
    expect(rollService(['topup'], 10, 0.119)).toBe(serviceById('topup'));
  });

  it('mùa thu hộ đổi THỨ TỰ chọn: bills trọng số ×4 ngày đầu tháng', () => {
    // ngày thường: bills 0.03 — roll 0.05 lọt qua bills rơi vào lottery (0.06)
    const lottery = serviceById('lottery')!;
    expect(rollService(['bills', 'lottery'], 20, 0.05)).toBe(lottery);
    // ngày 2 đầu tháng: bills 0.12 — roll 0.05 dừng ở bills
    expect(rollService(['bills', 'lottery'], 2, 0.05)).toBe(serviceById('bills'));
  });

  it('id không tồn tại trong danh sách đang sở hữu → bỏ qua, không phá tổng', () => {
    const topup = serviceById('topup')!;
    expect(rollService(['khong_co', 'topup'], 10, 0.05)).toBe(topup);
    expect(rollService(['khong_co'], 10, 0.01)).toBeUndefined();
  });
});

describe('SERVICES fee() — lời mỗi lượt dịch vụ (GĐ296)', () => {
  it('nạp tiền: lời đúng 3% mệnh giá, làm tròn 100đ', () => {
    const topup = serviceById('topup')!;
    for (let i = 0; i < 60; i++) {
      const { amount, fee } = topup.fee();
      expect(fee).toBe(Math.round((amount * 0.03) / 100) * 100);
      expect(fee).toBeGreaterThan(0);
    }
  });

  it('thu hộ điện nước: phí cố định 3.000đ', () => {
    const bills = serviceById('bills')!;
    for (let i = 0; i < 30; i++) expect(bills.fee().fee).toBe(3000);
  });

  it('gửi xe: khách trả 3.000đ, tiệm giữ 3.000đ', () => {
    expect(serviceById('parking')!.fee()).toEqual({ amount: 3000, fee: 3000 });
  });

  it('bưu kiện: cước giữ cố định 4.000đ', () => {
    for (let i = 0; i < 30; i++) expect(serviceById('parcel')!.fee().fee).toBe(4000);
  });

  it('vé số: thường lời 3.000đ/tờ, có ngày "xịt" phải trả thưởng 400.000đ', () => {
    const lottery = serviceById('lottery')!;
    const fees = Array.from({ length: 2000 }, () => lottery.fee().fee);
    expect(fees.every((f) => f === 3000 || f === -400000)).toBe(true);
    expect(fees).toContain(3000);        // nhịp lời đều
    expect(fees).toContain(-400000);     // 0.5% khách trúng → tiệm trả thưởng
  });
});
