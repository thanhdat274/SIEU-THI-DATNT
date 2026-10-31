import { describe, expect, it } from 'vitest';
import { cookTiming, cookAdvice, pickEveningPrep, fmtHour } from '../data/cookSchedule';

/** GĐ161 — "Kịch bản nấu theo giờ": hẹn-giờ-thu-hoạch trong phiên (thuần đọc).
 *  Helper không dùng RNG/sim (chỉ cộng giờ + đọc TIME_BANDS) nên không cần setSimSeed.
 *  Mốc khung theo TIME_BANDS: vàng sáng 6–8h30 · vắng 8h30–11 · vàng trưa 11–13 ·
 *  vắng 13–17 · vàng tối 17–20 (traffic 1.7 — đích châm kệ chính). */

// Công thức thật (recipes.ts): mì trứng 8 phút, cơm sườn 30 phút, cơm hộp gà 25 phút
const MI = 'recipe_mi_trung';      // 8 phút — hot_kettle
const SUON = 'recipe_com_suon';    // 30 phút — food_grill
const HOPGA = 'recipe_com_hop_ga'; // 25 phút — food_grill

describe('cookTiming — thời điểm 1 mẻ', () => {
  it('mặc định dùng duration gốc của công thức, readyBy = bắt đầu + duration', () => {
    expect(cookTiming(MI, 14 * 60)).toEqual({ recipeId: MI, durationMin: 8, readyBy: 14 * 60 + 8 });
    expect(cookTiming(SUON, 9 * 60)).toEqual({ recipeId: SUON, durationMin: 30, readyBy: 9 * 60 + 30 });
  });

  it('tốc độ trạm tăng tốc (phút trạm thật nhỏ hơn) đổi readyBy đúng theo', () => {
    expect(cookTiming(MI, 840, 4)).toEqual({ recipeId: MI, durationMin: 4, readyBy: 844 });
    expect(cookTiming(SUON, 840, 10)?.readyBy).toBe(850);
  });

  it('stationMinutes lệch/âm/NaN thì rơi về duration gốc (không sập)', () => {
    expect(cookTiming(MI, 840, 0)?.durationMin).toBe(8);
    expect(cookTiming(MI, 840, -5)?.durationMin).toBe(8);
    expect(cookTiming(MI, 840, NaN)?.durationMin).toBe(8);
    expect(cookTiming(MI, 840, undefined)?.durationMin).toBe(8);
  });

  it('công thức lạ → null', () => {
    expect(cookTiming('mon_khong_ton_tai', 600)).toBeNull();
  });
});

describe('cookAdvice — khung sáng (6–8h30, giờ vàng)', () => {
  it('xong trong giờ vàng sáng', () => {
    const s = cookAdvice(SUON, 7 * 60)!; // xong 7h30
    expect(s).toContain('giờ vàng sáng');
    expect(s).toContain('Nấu ngay');
  });

  it('xong vào giờ vắng giữa buổi → khuyên chờ giờ vàng trưa', () => {
    const s = cookAdvice(HOPGA, 8 * 60 + 10)!; // xong 8h35
    expect(s).toContain('giữa buổi');
    expect(s).toContain('giờ vàng trưa');
  });

  it('mẻ dài (phút trạm thật) xong giữa giờ vàng trưa', () => {
    const s = cookAdvice(SUON, 8 * 60 + 20, 180)!; // xong 11h20
    expect(s).toContain('giờ vàng trưa');
  });

  it('mẻ rất dài xong vào giờ vắng chiều → chờ giờ vàng tối', () => {
    const s = cookAdvice(SUON, 8 * 60 + 25, 280)!; // xong 13h05
    expect(s).toContain('giờ vắng chiều');
    expect(s).toContain('17h');
  });
});

describe('cookAdvice — khung vắng giữa buổi (8h30–11)', () => {
  it('mẻ chờ trong giờ vắng: khuyên trễ tới mốc xong đúng đầu giờ vàng trưa 11h', () => {
    const s = cookAdvice(SUON, 9 * 60)!; // xong 9h30 — giờ vắng
    expect(s).toContain('Bắt đầu sau 10h30');
    expect(s).toContain('giờ vàng trưa 11h');
    expect(s).toContain('vắng khách');
  });

  it('trễ đúng tới mốc cuối (xong đúng 11h) thì khuyên nấu ngay', () => {
    const s = cookAdvice(SUON, 10 * 60 + 30, 30)!; // xong 11h00
    expect(s).toContain('Nấu ngay');
  });

  it('mẻ xong giữa giờ vàng trưa → bày kệ bán luôn', () => {
    const s = cookAdvice(MI, 10 * 60, 90)!; // xong 11h30
    expect(s).toContain('giờ vàng trưa');
  });

  it('mẻ xong trước giờ vàng tối 17h → bày kệ chờ khung đông', () => {
    const s = cookAdvice(SUON, 10 * 60, 200)!; // xong 13h20
    expect(s).toContain('trước giờ vàng tối 17h');
  });
});

describe('cookAdvice — khung vàng trưa (11–13)', () => {
  it('xong giữa giờ vàng trưa → bán luôn trong khung đông', () => {
    const s = cookAdvice(MI, 12 * 60)!; // xong 12h08
    expect(s).toContain('giờ vàng trưa');
  });

  it('xong vào giờ vắng chiều → gợi ý mốc bắt đầu muộn nhất để kịp 17h', () => {
    const s = cookAdvice(HOPGA, 12 * 60 + 50)!; // xong 13h15
    expect(s).toContain('13h15');
    expect(s).toContain('bắt đầu sau 16h35'); // 17h − 25 phút
    expect(s).toContain('giờ vàng tối');
  });
});

describe('cookAdvice — khung vắng chiều (13–17): nguyên lý Hay Day', () => {
  it('kịp 17h → nấu ngay, châm kệ trước giờ vàng tối', () => {
    const s = cookAdvice(SUON, 14 * 60)!; // xong 14h30
    expect(s).toContain('Nấu ngay');
    expect(s).toContain('14h30');
    expect(s).toContain('trước giờ vàng tối 17h');
  });

  it('mẻ đồ uống cũng áp dụng (trạm drink_counter không đổi luật giờ)', () => {
    const s = cookAdvice('recipe_tra_sua', 13 * 60)!; // xong 13h08
    expect(s).toContain('trước giờ vàng tối 17h');
  });

  it('biên 17h: xong ĐÚNG 17h00 vẫn kịp, 17h01 là bắt đầu muộn', () => {
    expect(cookAdvice(SUON, 990)!).toContain('Nấu ngay'); // 16h30 + 30 = 17h00
    expect(cookAdvice(SUON, 991)!).toContain('Bắt đầu muộn'); // xong 17h01
  });

  it('tốc độ trạm tăng tốc lật được khuyến nghị: mẻ chậm hụt, mẻ nhanh kịp', () => {
    expect(cookAdvice(SUON, 16 * 60 + 50)!).toContain('Bắt đầu muộn'); // xong 17h20
    expect(cookAdvice(SUON, 16 * 60 + 50, 10)!).toContain('Nấu ngay'); // xong 17h00
  });
});

describe('cookAdvice — trả null khi không áp dụng', () => {
  it('đã quá 17h (khung tối/khuya) → null', () => {
    expect(cookAdvice(SUON, 17 * 60)).toBeNull();
    expect(cookAdvice(SUON, 18 * 60)).toBeNull();
    expect(cookAdvice(SUON, 21 * 60)).toBeNull();
  });

  it('mẻ xong sau 20h (hết giờ vàng tối) → null', () => {
    expect(cookAdvice(SUON, 19 * 60 + 50)).toBeNull(); // xong 20h20
  });

  it('công thức lạ → null', () => {
    expect(cookAdvice('mon_khong_ton_tai', 14 * 60)).toBeNull();
  });
});

describe('fmtHour — phút game sang chữ giờ Việt', () => {
  it('đúng mốc khung', () => {
    expect(fmtHour(17 * 60)).toBe('17h');
    expect(fmtHour(16 * 60 + 30)).toBe('16h30');
    expect(fmtHour(8 * 60 + 30)).toBe('8h30');
  });
});

describe('pickEveningPrep — món cho dòng Sổ đầu ngày 13–17h', () => {
  const cands = [
    { id: 'a', name: 'A', durationMin: 30, perMinute: 100 },
    { id: 'b', name: 'B', durationMin: 8, perMinute: 900 },
    { id: 'c', name: 'C', durationMin: 250, perMinute: 50 }, // không kịp: 780 + 250 > 1020
  ];

  it('chọn món duration DÀI NHẤT vẫn kịp 17h, mốc startBy + duration = 17h', () => {
    const pick = pickEveningPrep(cands, 13 * 60)!;
    expect(pick.id).toBe('a');
    expect(pick.startBy).toBe(16 * 60 + 30);
    expect(pick.startBy + pick.durationMin).toBe(17 * 60);
  });

  it('hòa duration thì lấy món lời nhất theo phút trạm', () => {
    const pick = pickEveningPrep([
      { id: 'x', durationMin: 30, perMinute: 100 },
      { id: 'y', durationMin: 30, perMinute: 500 },
    ], 14 * 60)!;
    expect(pick.id).toBe('y');
  });

  it('không món nào kịp (hoặc rỗng) → null', () => {
    expect(pickEveningPrep([{ id: 'a', durationMin: 40 }], 16 * 60 + 30)).toBeNull(); // 990+40 > 1020
    expect(pickEveningPrep([], 14 * 60)).toBeNull();
  });

  it('quá 17h → null (không còn kịp giờ vàng tối hôm nay)', () => {
    expect(pickEveningPrep(cands, 17 * 60)).toBeNull();
  });

  it('duration lệch (0/âm) bị loại khỏi ứng viên', () => {
    expect(pickEveningPrep([{ id: 'a', durationMin: 0 }, { id: 'b', durationMin: -3 }], 14 * 60)).toBeNull();
  });
});
