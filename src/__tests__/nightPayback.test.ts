import { describe, expect, it } from 'vitest';
import { nightPayback, nightPaybackLabel, NIGHT_UPGRADE_PRICE, type NightPnl } from '../data/nightReport';

/**
 * GĐ192 — "Mở ca đêm hồi vốn sau bao lâu?": món đầu tư lớn nhất game (15tr) trước nay không nơi nào
 * cho thấy ngày hồi vốn. Helper thuần `nightPayback(np, cost)` lấy lời ròng mỗi đêm (đã trừ lương ca đêm
 * ×1.5) chia vốn → số đêm hồi; verdict theo tốc độ. THUẦN — chỉ đọc nightPnl + NIGHT_UPGRADE_PRICE, không
 * đổi kinh tế/save. UI ghi rõ caveat trộm đêm ×2 & dậy trễ nên không hứa quá.
 */
const pnl = (net: number, revenue = 0, wages = 0, verdict: NightPnl['verdict'] = net > 0 ? 'ok' : 'warn'): NightPnl =>
  ({ revenue, wages, net, verdict });

describe('GĐ192 — hồi vốn ca đêm', () => {
  it('chưa mở ca đêm (idle) → losing, không có số đêm hồi', () => {
    const p = nightPayback(pnl(0, 0, 0, 'idle'));
    expect(p.verdict).toBe('losing');
    expect(p.paybackNights).toBeNull();
    expect(p.cost).toBe(NIGHT_UPGRADE_PRICE);
  });

  it('lời đáng (hồi vốn trong ~1 tháng) → verdict good với số đêm làm tròn lên', () => {
    // net 1_000_000/đêm → 15tr / 1tr = 15 đêm
    const p = nightPayback(pnl(1_000_000));
    expect(p.verdict).toBe('good');
    expect(p.paybackNights).toBe(15);
    expect(p.netPerNight).toBe(1_000_000);
    // vừa trượt mốc 30 → slow
    const p2 = nightPayback(pnl(500_000)); // 30 đêm ≈ 15tr/500k = 30
    expect(p2.paybackNights).toBe(30);
    expect(p2.verdict).toBe('good'); // ≤30
    const p3 = nightPayback(pnl(499_999)); // 30.06 → 31 đêm
    expect(p3.paybackNights).toBe(31);
    expect(p3.verdict).toBe('slow');
  });

  it('mẹo làm tròn lên: net không chia chẵn → dôi 1 đêm', () => {
    const p = nightPayback(pnl(600_000)); // 15tr/600k = 25 chẵn
    expect(p.paybackNights).toBe(25);
    const p2 = nightPayback(pnl(700_000)); // 21.43 → 22
    expect(p2.paybackNights).toBe(22);
  });

  it('đang lỗ (net ≤ 0) → losing, chưa hồi vốn', () => {
    const p = nightPayback(pnl(-300_000));
    expect(p.verdict).toBe('losing');
    expect(p.paybackNights).toBeNull();
    expect(p.netPerNight).toBe(-300_000);
  });

  it('tôn trọng cost truyền vào (nhạy với giá nâng cấp)', () => {
    const p = nightPayback(pnl(2_000_000), 20_000_000); // 10 đêm
    expect(p.paybackNights).toBe(10);
    expect(p.cost).toBe(20_000_000);
  });

  it('nhãn ngắn phản ánh verdict', () => {
    expect(nightPaybackLabel(nightPayback(pnl(1_000_000)))).toBe('hồi vốn sau ~15 đêm');
    expect(nightPaybackLabel(nightPayback(pnl(200_000)))).toContain('chậm');
    expect(nightPaybackLabel(nightPayback(pnl(-100_000)))).toBe('đang lỗ — chưa hồi vốn');
  });
});
