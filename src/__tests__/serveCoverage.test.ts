import { describe, it, expect } from 'vitest';
import { serveCoverage, SERVE_CROWD_MIN } from '../data/serveCoverage';

describe('serveCoverage — soi độ phủ nhân sự theo giờ so với khách', () => {
  it('empty khi cả ngày không có khách', () => {
    const r = serveCoverage({ staff: [{ shift: 'full' }], byHour: {} });
    expect(r.verdict).toBe('empty');
    expect(r.peak).toBeNull();
    expect(r.rows.length).toBe(17); // 6..22
  });

  it('ca sáng chỉ phủ 6–14: giờ tối đông mà vắng người → warn', () => {
    // 1 người ca sáng (6h–14h). Giờ 12 đông, giờ 17 đông hơn nhưng ca sáng đã tan.
    const r = serveCoverage({
      staff: [{ shift: 'morning' }],
      byHour: { 12: { customers: 40 }, 17: { customers: 50 } },
    });
    expect(r.verdict).toBe('warn');
    expect(r.peak?.hour).toBe(17);
    // giờ 12: 1 người trực → load = 40
    const h12 = r.rows.find((x) => x.hour === 12)!;
    expect(h12.onDuty).toBe(1);
    expect(h12.load).toBe(40);
    expect(h12.crowdedVacant).toBe(false);
    // giờ 17: không ai trực → vắng
    const h17 = r.rows.find((x) => x.hour === 17)!;
    expect(h17.onDuty).toBe(0);
    expect(h17.crowdedVacant).toBe(true);
    expect(r.vacantBusy.map((x) => x.hour)).toEqual([17]);
    // giờ đông nhất có người trực chỉ còn giờ 12
    expect(r.busiestStaffed.map((x) => x.hour)).toEqual([12]);
  });

  it('ca nguyên ngày phủ 6–22:30 → không giờ nào vắng, ok', () => {
    const r = serveCoverage({
      staff: [{ shift: 'full' }],
      byHour: { 11: { customers: 30 }, 19: { customers: 25 } },
    });
    expect(r.verdict).toBe('ok');
    expect(r.vacantBusy.length).toBe(0);
    expect(r.peak?.hour).toBe(11);
  });

  it('ca chiều phủ 14–22:30: giờ sáng đông mà vắng → warn', () => {
    const r = serveCoverage({
      staff: [{ shift: 'afternoon' }],
      byHour: { 8: { customers: 40 }, 15: { customers: 20 } },
    });
    expect(r.verdict).toBe('warn');
    const h8 = r.rows.find((x) => x.hour === 8)!;
    expect(h8.onDuty).toBe(0);
    expect(h8.crowdedVacant).toBe(true);
    const h15 = r.rows.find((x) => x.hour === 15)!;
    expect(h15.onDuty).toBe(1);
    expect(h15.crowdedVacant).toBe(false);
  });

  it('ngưỡng đông: dưới SERVE_CROWD_MIN thì không báo vắng dù không ai trực', () => {
    const r = serveCoverage({ staff: [{ shift: 'morning' }], byHour: { 19: { customers: SERVE_CROWD_MIN - 1 } } });
    expect(r.verdict).toBe('ok');
  });
});
