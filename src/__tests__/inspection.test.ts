import { beforeEach, describe, expect, it } from 'vitest';
import {
  DIRT_FAIL_AT, INSPECTION_FINE_MAX, INSPECTION_FINE_MIN, INSPECTION_NOTES, INSPECTION_PRAISE,
  inspectionFine, inspectionOutcome, pickNote, QUICK_CAUGHT_CHANCE,
} from '../data/inspection';
import { inspectionDue } from '../core/inspection';
import { setSimSeed, metaRng } from '../core/rand';

describe('inspection — đoàn kiểm tra vệ sinh (GĐ1506)', () => {
  beforeEach(() => setSimSeed(42));

  it('phạt = 5% doanh thu hôm nay, khung 20.000–150.000, làm tròn nghìn', () => {
    expect(inspectionFine(800000)).toBe(40000);
    expect(inspectionFine(200000)).toBe(INSPECTION_FINE_MIN); // 10.000 → sàn 20.000
    expect(inspectionFine(9_999_999)).toBe(INSPECTION_FINE_MAX); // ~500k → trần 150.000
    expect(inspectionFine(1234567) % 1000).toBe(0);
  });

  it('câu kiểm tra/khen: ngắn ≤90 ký tự, pickNote theo rng ổn định', () => {
    for (const n of [...INSPECTION_NOTES, ...INSPECTION_PRAISE]) expect(n.length).toBeLessThanOrEqual(90);
    const a = pickNote(INSPECTION_NOTES, metaRng);
    expect(INSPECTION_NOTES).toContain(a);
  });

  it('chọn "Nhận phạt": trừ đủ phạt, không quét sàn', () => {
    const out = inspectionOutcome(0, 40000, 60, metaRng);
    expect(out.money).toBe(40000);
    expect(out.dirt).toBe(60);
    expect(out.message.length).toBeLessThanOrEqual(90);
  });

  it('chọn "Vệ sinh gấp": trả 30% + sàn giảm nửa; 25% bị soi thêm +50% (deterministic theo seed)', () => {
    // Gieo tới khi gặp nhánh caught và nhánh sạch để chốt cả hai đường
    let sawCaught = false;
    let sawClean = false;
    for (let i = 0; i < 200 && !(sawCaught && sawClean); i++) {
      const out = inspectionOutcome(1, 100000, 60, metaRng);
      const quick = 30000;
      if (out.money > quick) {
        sawCaught = true;
        expect(out.money).toBe(30000 + 50000);
        expect(out.message).toContain('soi thấy');
      } else {
        sawClean = true;
        expect(out.money).toBe(30000);
      }
      expect(out.dirt).toBe(30); // quét xong giảm một nửa
      expect(out.message.length).toBeLessThanOrEqual(90);
    }
    expect(sawCaught && sawClean).toBe(true);
    expect(QUICK_CAUGHT_CHANCE).toBe(0.25);
  });

  it('điều kiện ghé: đủ cấp + tiệm mở + trong giờ bán + chưa có câu hỏi quầy đang treo', () => {
    expect(inspectionDue(17, true, 12 * 60, false)).toBe(false); // chưa đủ cấp
    expect(inspectionDue(30, false, 12 * 60, false)).toBe(false); // tiệm đóng
    expect(inspectionDue(30, true, 8 * 60, false)).toBe(false); // trước 9h
    expect(inspectionDue(30, true, 21 * 60, false)).toBe(false); // sau 20h
    expect(inspectionDue(30, true, 12 * 60, true)).toBe(false); // đang có câu hỏi khác
    expect(inspectionDue(30, true, 12 * 60, false)).toBe(true);
  });

  it('sàn dưới ngưỡng thì không lập biên bản (chỉ khen) — ngưỡng 30/100', () => {
    expect(DIRT_FAIL_AT).toBe(30);
  });
});
