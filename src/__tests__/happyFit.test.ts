import { describe, expect, it } from 'vitest';
import { HAPPY_FROM_MAX, HAPPY_FROM_MIN, happyWindowFit, TIME_BANDS } from '../data/rhythm';

/** Giờ vàng tự đặt (happy hour): đặt đúng giờ vắng để "mua" khách biên rẻ nhất, tránh trùng giờ vàng tự nhiên. */

describe('happyWindowFit — cửa sổ giờ vàng tự đặt so với nhịp tự nhiên', () => {
  it('9h–11h nằm trọn giữa buổi vắng (0.6) → dead, không phút nào trùng giờ vàng', () => {
    const fit = happyWindowFit(9);
    expect(fit.verdict).toBe('dead');
    expect(fit.goldenMinutes).toBe(0);
    expect(fit.traffic).toBeCloseTo(0.6);
  });

  it('11h–13h nằm trọn cao điểm trưa (1.35) → golden toàn bộ 120 phút', () => {
    const fit = happyWindowFit(11);
    expect(fit.verdict).toBe('golden');
    expect(fit.goldenMinutes).toBe(120);
    expect(fit.traffic).toBeCloseTo(1.35);
  });

  it('17h–19h nằm trọn cao điểm tối (1.7) → golden (giảm giá cho khách vốn đã đông, lãng phí)', () => {
    const fit = happyWindowFit(17);
    expect(fit.verdict).toBe('golden');
    expect(fit.goldenMinutes).toBe(120);
    expect(fit.traffic).toBeCloseTo(1.7);
  });

  it('13h–15h nằm trọn buổi chiều vắng (0.6) → dead', () => {
    const fit = happyWindowFit(13);
    expect(fit.verdict).toBe('dead');
    expect(fit.goldenMinutes).toBe(0);
  });

  it('10h–12h vắt ngang ranh giới (vắng→trưa): nửa đầu dead, nửa sau golden → mixed 60 phút', () => {
    const fit = happyWindowFit(10);
    expect(fit.verdict).toBe('mixed');
    expect(fit.goldenMinutes).toBe(60);
  });

  it('19h–21h vắt ngang ranh giới (tối golden→khuya vắng): mixed 60 phút, traffic bình quân giữa hai mức', () => {
    const fit = happyWindowFit(19);
    expect(fit.verdict).toBe('mixed');
    expect(fit.goldenMinutes).toBe(60);
    expect(fit.traffic).toBeCloseTo((60 * 1.7 + 60 * 0.8) / 120);
  });

  it('16h–18h: 1h chiều vắng + 1h tối golden → mixed, traffic bình quân đúng phép', () => {
    const fit = happyWindowFit(16);
    expect(fit.verdict).toBe('mixed');
    expect(fit.goldenMinutes).toBe(60);
    expect(fit.traffic).toBeCloseTo((60 * 0.6 + 60 * 1.7) / 120);
  });

  it('20h–22h nằm trọn tối muộn (0.8, không phải giờ vàng vì <1.3) → dead', () => {
    const fit = happyWindowFit(20);
    expect(fit.verdict).toBe('dead');
    expect(fit.goldenMinutes).toBe(0);
  });

  it('mọi giờ bắt đầu hợp lệ 9–20 đều trả verdict hợp lệ và 0 ≤ goldenMinutes ≤ 120', () => {
    for (let from = HAPPY_FROM_MIN; from <= HAPPY_FROM_MAX; from++) {
      const fit = happyWindowFit(from);
      expect(['golden', 'mixed', 'dead']).toContain(fit.verdict);
      expect(fit.goldenMinutes).toBeGreaterThanOrEqual(0);
      expect(fit.goldenMinutes).toBeLessThanOrEqual(120);
      expect(Number.isFinite(fit.traffic)).toBe(true);
    }
  });

  it('dải 9–20 có đủ cả ba loại verdict (người chơi có lựa chọn thật, không trống)', () => {
    const seen = new Set(happyWindowFitVerifyAll().map(({ v }) => v));
    expect(seen).toEqual(new Set(['golden', 'mixed', 'dead']));
  });

  it('helper thuần: hai lần cùng đầu vào cho kết quả giống hệt', () => {
    const a = happyWindowFit(14);
    const b = happyWindowFit(14);
    expect(a).toEqual(b);
  });

  it('nhịp TIme_BANDS đối chiếu không tự thay đổi ngưỡng giờ vàng (guard ngầm chiều sâu này)', () => {
    // Nếu ai đó đổi GOLDEN_TRAFFIC hoặc TIME_BANDS, test này buộc xem lại cửa sổ đang đánh giá đúng
    const trua = TIME_BANDS.find((b) => b.id === 'trua')!;
    expect(trua.traffic).toBeGreaterThanOrEqual(1.3);
    const chieu = TIME_BANDS.find((b) => b.id === 'chieu')!;
    expect(chieu.traffic).toBeLessThan(1.3);
  });
});

// Quét toàn dải giờ hợp lệ, trả mảng {h, v} để assert tập verdict — giữ phần này tách khỏi vòng trên.
function happyWindowFitVerifyAll(): { h: number; v: string }[] {
  const out: { h: number; v: string }[] = [];
  for (let from = HAPPY_FROM_MIN; from <= HAPPY_FROM_MAX; from++) {
    out.push({ h: from, v: happyWindowFit(from).verdict });
  }
  return out;
}
