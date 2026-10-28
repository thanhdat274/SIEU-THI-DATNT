import { describe, expect, it, beforeEach } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { adTargetSuggest, type Demographics } from '../data/demographics';
import { ADS, adById } from '../data/biz';

/** GĐ63 "Nên quảng cáo nghề nào": đề xuất ad nhắm nghề khách đông nhất chưa được phủ — thuần đọc, không đổi gì. */

beforeEach(() => useGame.setState(newGameData()));

const d = (rows: Record<string, { visits: number; revenue: number; walkouts: number }>): Demographics => rows;

describe('adTargetSuggest (mồi hành động đóng vòng GĐ62)', () => {
  it('không có dữ liệu nhân khẩu học → null', () => {
    expect(adTargetSuggest(undefined, [], 10, 1)).toBeNull();
    expect(adTargetSuggest({}, [], 10, 1)).toBeNull();
  });

  it('nghề đông nhất chưa bị phủ → gợi ý ad mở khóa nhắm đúng nghề đó kèm reason', () => {
    // Công nhân (96k) là top; ad 'cong_truong' (unlock 6) nhắm construction.
    const sugg = adTargetSuggest(d({ construction: { visits: 8, revenue: 96000, walkouts: 0 } }), [], 10, 1);
    expect(sugg).not.toBeNull();
    expect(sugg!.profession.id).toBe('construction');
    expect(sugg!.ad.id).toBe('cong_truong');
    expect(sugg!.reason).toContain('Công nhân xây dựng');
    expect(sugg!.reason).toContain('% doanh thu');
  });

  it('nghề top đã bị ad đang chạy phủ → bỏ qua, chọn nghề top kế chưa phủ', () => {
    // Mom (54k) top nhưng ad cong_truong không nhắm mom... dùng construction đang chạy phủ → chọn nghề kế
    const running = [{ id: 'cong_truong', untilDay: 3 }]; // phủ construction/electrician/mechanic
    const sugg = adTargetSuggest(
      d({ construction: { visits: 8, revenue: 96000, walkouts: 0 }, mom: { visits: 6, revenue: 54000, walkouts: 3 } }),
      running, 20, 1);
    // construction bị phủ → bỏ; mom chưa phủ, ad truong_hoc (unlock 6) nhắm mom
    expect(sugg!.profession.id).toBe('mom');
    expect(sugg!.ad.id).toBe('truong_hoc');
  });

  it('ad nhắm nghề top bị khóa cấp → không dùng ad đó (chọn nghề khác có ad mở khóa hoặc null)', () => {
    // Mom là top duy nhất; ad nhắm mom (truong_hoc unlock 6) nhưng level 3 < 6 → không ad khả dụng → null
    const sugg = adTargetSuggest(d({ mom: { visits: 6, revenue: 54000, walkouts: 0 } }), [], 3, 1);
    expect(sugg).toBeNull();
    // Nâng level → có gợi ý
    expect(adTargetSuggest(d({ mom: { visits: 6, revenue: 54000, walkouts: 0 } }), [], 6, 1)!.ad.id).toBe('truong_hoc');
  });

  it('ad đang chạy bị loại khỏi ứng viên', () => {
    // Truong_hoc đang chạy → nghề mom không có ad khác khả dụng → null (hoặc nghề khác)
    const running = [{ id: 'truong_hoc', untilDay: 5 }];
    expect(adTargetSuggest(d({ mom: { visits: 6, revenue: 54000, walkouts: 0 } }), running, 20, 1)).toBeNull();
  });

  it('mọi nghề top đều bị phủ → null (đã ổn, không cần mua thêm ad)', () => {
    const running = [{ id: 'cong_truong', untilDay: 3 }, { id: 'truong_hoc', untilDay: 5 }, { id: 'benh_vien', untilDay: 8 }];
    const data = d({
      construction: { visits: 8, revenue: 96000, walkouts: 0 },
      mom: { visits: 6, revenue: 54000, walkouts: 3 },
      nurse: { visits: 5, revenue: 60000, walkouts: 0 },
    });
    expect(adTargetSuggest(data, running, 20, 1)).toBeNull();
  });

  it('chỉ trả ad mở khóa theo cấp và id ad hợp lệ', () => {
    const sugg = adTargetSuggest(d({ construction: { visits: 8, revenue: 96000, walkouts: 0 } }), [], 20, 1);
    expect(sugg).not.toBeNull();
    expect(ADS.some((a) => a.id === sugg!.ad.id && a.unlock <= 20 && a.targets?.includes('construction'))).toBe(true);
  });

  it('helper thuần (2 lần cùng đầu vào → kết quả giống hệt)', () => {
    const input = d({ construction: { visits: 8, revenue: 96000, walkouts: 0 }, guard: { visits: 2, revenue: 15000, walkouts: 0 } });
    const a = adTargetSuggest(input, [], 20, 1);
    const b = adTargetSuggest(input, [], 20, 1);
    expect(a).toEqual(b);
  });
});
