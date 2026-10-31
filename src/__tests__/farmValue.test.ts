import { describe, expect, it } from 'vitest';
import { cropById, newGarden } from '../data/garden';
import {
  animalPerDay, animalRank, bestAnimal, bestCrop, cropPerDay, cropRank, homegrownSell, orderVsShelf,
} from '../data/farmValue';

// Mọi khẳng định dùng số CHÍNH XÁC từ dữ liệu thật (products.ts / garden.ts / catalog.ts).

describe('GĐ146 farmValue — homegrownSell (bán lẻ nhà trồng ×1,2)', () => {
  it('cộng 20% nhãn nhà trồng lên giá bán thường', () => {
    expect(homegrownSell('rau')).toBe(Math.round(16000 * 1.2)); // 19200
    expect(homegrownSell('trung')).toBe(Math.round(33000 * 1.2)); // 39600
    expect(homegrownSell('thit_ga_dt')).toBe(Math.round(450000 * 1.2)); // 540000
  });
});

describe('GĐ146 farmValue — cropPerDay (giá trị luống/ngày)', () => {
  it('rau cải: 3 ngày, 8 món × 19.200, trừ 40k giống = 37.866,67/luống/ngày', () => {
    const v = cropPerDay(cropById('rau_cai'), { day: 5 });
    expect(v.revenue).toBe(153600);
    expect(v.seedCost).toBe(40000);
    expect(v.perDay).toBeCloseTo(37866.6667, 1);
    expect(v.isPerennial).toBe(false);
  });

  it('bắp: 24k giống, 4 ngày, 6×14.400 = 15.600/luống/ngày (kém rau cải)', () => {
    expect(cropPerDay(cropById('bap'), { day: 5 }).perDay).toBe(15600);
  });

  it('mía: 48k giống, 6 ngày, 8×21.600 = 20.800/luống/ngày', () => {
    expect(cropPerDay(cropById('mia'), { day: 5 }).perDay).toBe(20800);
  });

  it('cây ăn trái lâu năm chia theo chu kỳ ra trái (trừ giống một lần)', () => {
    const v = cropPerDay(cropById('traicay_nam'), { day: 5 });
    expect(v.isPerennial).toBe(true);
    expect(v.revenue).toBe(8 * 45600); // 364800
    expect(v.perDay).toBeCloseTo((v.revenue - 100000) / 3, 1);
  });

  it('mùa vụ: xoài trái đúng vụ tháng 3–6 sai gấp rưỡi → revenue ×1,5', () => {
    // monthOf(ngày chín) trong [3,6] => season. Ngày 60 là 1/3 theo calendar.
    const v = cropPerDay(cropById('xoai'), { day: 60, ripeDay: 60 });
    expect(v.revenue).toBe(Math.round(5 * 1.5) * 21600); // 162000
    expect(v.inSeasonNow).toBe(true);
    expect(v.perDay).toBeCloseTo((v.revenue - 60000) / 4, 1);
  });

  it('mùa vụ ra: xoài trái ngoài vụ chỉ nhân 1', () => {
    const v = cropPerDay(cropById('xoai'), { day: 200 }); // tháng 7 ngoài [3,6]
    expect(v.revenue).toBe(5 * 21600);
    expect(v.inSeasonNow).toBe(false);
  });

  it('mít (unlock 36) là giống LỖ: 90k giống > 86.400 thu về → perDay âm', () => {
    const v = cropPerDay(cropById('mit'), { day: 5 });
    expect(v.revenue).toBe(3 * 28800); // 86400
    expect(v.perDay).toBeCloseTo((86400 - 90000) / 5, 1);
    expect(v.perDay).toBeLessThan(0);
  });
});

describe('GĐ146 farmValue — cropRank (giống nào hời nhất)', () => {
  it('ở cấp 1 chỉ mở rau cải + bắp → rau cải hời hơn', () => {
    const rank = cropRank(1, 5);
    expect(rank[0].crop.id).toBe('rau_cai');
    expect(rank[1].crop.id).toBe('bap');
    expect(rank[0].perDay).toBeGreaterThan(rank[1].perDay);
  });

  it('bestCrop trả giống hời nhất theo cấp đang mở', () => {
    const best = bestCrop(38, 5);
    expect(best).not.toBeNull();
    expect(best!.crop.id).toBe(cropRank(38, 5)[0].crop.id);
  });
});

describe('GĐ146 farmValue — animalPerDay (giá trị con/ngày)', () => {
  const g = newGarden(); // bãi thả sao 0 → không giảm cám/boost

  it('gà đẻ: 0,9 quả → 0,09 vỉ × 39.600 = 3.564, cám 0,12×15.000 = 1.800 → net 1.764/con/ngày', () => {
    const v = animalPerDay('chicken', g);
    expect(v.mode).toBe('egg');
    expect(v.revenuePerDay).toBeCloseTo(3564, 1);
    expect(v.feedPerDay).toBe(1800);
    expect(v.perDay).toBeCloseTo(1764, 1);
  });

  it('ngỗng trứng to: 0,05 vỉ × 420.000 − 3.750 cám = 17.250/con/ngày (hời hơn gà)', () => {
    const v = animalPerDay('goose', g);
    expect(v.revenuePerDay).toBeCloseTo(21000, 1);
    expect(v.perDay).toBeCloseTo(17250, 1);
    expect(v.perDay).toBeGreaterThan(animalPerDay('chicken', g).perDay);
  });

  it('bò sữa: 2 lốc × 45.600 − cám 2,5kg×11.000 = 27.500 → net 63.700/con/ngày', () => {
    const v = animalPerDay('cow', g);
    expect(v.mode).toBe('milk');
    expect(v.feedPerDay).toBe(27500);
    expect(v.perDay).toBeCloseTo(63700, 1);
  });

  it('heo vỗ béo: 12 ngày, thu 30kg×45.600 − (700k giống + 2kg×13.000×12 cám) / 12 = 29.666,67/con/ngày', () => {
    const v = animalPerDay('pig', g);
    expect(v.mode).toBe('fatten');
    expect(v.perDay).toBeCloseTo(29666.6667, 1);
    expect(v.fattenRemaining).toBe(12); // chưa cho ăn ngày nào
  });

  it('gà Đông Tảo: 20 ngày, 3kg×540.000 − 760k chi phí / 20 = 43.000/con/ngày', () => {
    const v = animalPerDay('dong_tao', g);
    expect(v.perDay).toBe(43000);
  });

  it('fattenRemaining giảm theo số ngày đã vỗ — đủ ngày là 0', () => {
    const g2 = { ...newGarden(), pens: { pig: { count: 1, fedDay: 1, feedKg: 0, pending: 0, fattened: 5, lateJoins: 0 } } };
    expect(animalPerDay('pig', g2).fattenRemaining).toBe(7); // 12 − 5
  });
});

describe('GĐ146 farmValue — animalRank + bestAnimal (con nào đáng nuôi)', () => {
  it('chỉ xếp loài đang nuôi (chuồng có con)', () => {
    const g = { ...newGarden(), pens: { chicken: { count: 2, fedDay: 1, feedKg: 0, pending: 0 }, cow: { count: 1, fedDay: 1, feedKg: 0, pending: 0 } } };
    const rank = animalRank(g);
    expect(rank.map((v) => v.kind)).toEqual(['cow', 'chicken']);
    expect(bestAnimal(g)!.kind).toBe('cow');
  });

  it('chưa nuôi con nào → bestAnimal null', () => {
    expect(bestAnimal(newGarden())).toBeNull();
  });
});

describe('GĐ146 farmValue — orderVsShelf (đơn quán xóm ×1,25 vs bán lẻ ×1,2)', () => {
  it('trứng gà: lẻ 39.600, đơn 41.250 → đơn +4,2%', () => {
    const o = orderVsShelf('trung');
    expect(o.shelf).toBe(39600);
    expect(o.order).toBe(41250);
    expect(o.percent).toBeCloseTo(4.2, 1);
  });
});
