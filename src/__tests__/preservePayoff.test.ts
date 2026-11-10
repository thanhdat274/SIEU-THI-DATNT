import { describe, expect, it } from 'vitest';
import { preservePayoff, preserveFinishDays } from '../data/preservePayoff';
import { PRESERVE_DEFS } from '../data/preserve';
import { preserveMorningTips } from '../data/preserve';
import { productById } from '../data/products';
import { dayOfYear } from '../data/calendar';

// Hệ 1 L7 (SPEC §1.7/§1.8) — BẠT KÉO + NHẮC ĐẾM LÙI LỄ + preservePayoff (tự làm vs mua hàng xóm).
//  - Payoff hiện CẢ HAI VẾ: tiết kiệm (buyCost − rawCost) VÀ mối quen tháng bị hao (hoàn cuối tháng giảm).
//  - Khoá §1.7: giá vốn một mẻ = 55–65% giá NHẬP thành phẩm.
// Bạt kéo (tarp = preserveNight opts.tarp) đã có ở GĐ L3/L5 — không lặp lại ở đây.

describe('Hệ1-L7 — preservePayoff: khoá tỉ lệ giá vốn §1.7 (55–65%)', () => {
  it('mọi mẻ muối/ủ (không phơi, mở ≤ 120) có giá vốn trong 55–65% của giá nhập thành phẩm', () => {
    const defs = PRESERVE_DEFS.filter((d) => d.kind !== 'phoi' && d.unlock <= 120);
    expect(defs.length).toBeGreaterThanOrEqual(12);
    for (const d of defs) {
      const raw = d.inputs.reduce((n, i) => n + i.quantity * productById(i.productId).buy, 0);
      const buy = d.outputQty * productById(d.outputId).buy;
      const margin = raw / buy;
      expect(margin, `${d.id} margin ${(margin * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(0.55);
      expect(margin, `${d.id} margin ${(margin * 100).toFixed(1)}%`).toBeLessThanOrEqual(0.65);
    }
  });

  it('một hàng cụ thể: dưa muối tiết ~ ~quantified đúng rawCost/buyCost/netSave', () => {
    const p = preservePayoff({ level: 120 });
    const row = p.rows.find((r) => r.defId === 'ps_dua_muoi')!;
    expect(row.kind).toBe('muoi');
    // vốn = nguyên liệu thô; mua ngoài = giá nhập thành phẩm × sản lượng
    expect(row.rawCost).toBeGreaterThan(0);
    expect(row.buyCost).toBeGreaterThan(row.rawCost);
    expect(row.netSave).toBe(row.buyCost - row.rawCost);
    expect(p.rows.filter((r) => r.kind === 'muoi' || r.kind === 'u')).toHaveLength(12);
  });

  it('headline phản ánh cả hai vế (tiết + mối quen giảm hoàn)', () => {
    const p = preservePayoff({ level: 120, neighborSpentLife: 151_000_000, neighborSpentMonth: 40_000_000 });
    expect(p.headline).toContain('tiết');
    expect(p.headline).toContain('mối quen tháng giảm hoàn');
    // Ở bậc vàng (life ≥ 150tr), chi bớt một khoản ở mối → hoàn tháng bị bỏ lỡ dương.
    expect(p.totalRebateLost).toBeGreaterThan(0);
    expect(p.rows.every((r) => r.rebateLost >= 0)).toBe(true);
  });
});

describe('Hệ1-L7 — preservePayoff: có monetized số, không bịa', () => {
  it('mọi mẻ mở ở cấp tối đa đều có rawCost/buyCost từ giá thật và finishDays dương', () => {
    const p = preservePayoff({ level: 999 });
    expect(p.rows.length).toBe(PRESERVE_DEFS.length);
    for (const r of p.rows) {
      expect(r.rawCost).toBeGreaterThan(0);
      expect(r.buyCost).toBeGreaterThan(0);
      expect(r.finishDays).toBeGreaterThan(0);
      if (r.kind === 'muoi' || r.kind === 'u') {
        expect(r.marginPct).toBeGreaterThan(0.55);
        expect(r.marginPct).toBeLessThanOrEqual(0.65);
      }
    }
    // finishDays đo đúng: muối = window[1], ủ = need
    expect(preserveFinishDays(PRESERVE_DEFS.find((d) => d.id === 'ps_dua_muoi')!)).toBe(4);
    expect(preserveFinishDays(PRESERVE_DEFS.find((d) => d.id === 'ps_nuoc_mam')!)).toBe(14);
  });

  it('chưa mở món nào (level thấp hơn mọi def) → headline trống việc', () => {
    const p = preservePayoff({ level: 0 });
    expect(p.rows).toHaveLength(0);
    expect(p.headline).toContain('Chưa mở');
  });
});

describe('Hệ1-L7 — nhắc đếm lùi lễ trong thẻ phơi (SPEC §1.8)', () => {
  // Tết Nguyên Đán: dayOfYear(md(1,28)) = 31 → game day 32. Hôm trước 6 ngày = game day 26.
  // Củ kiệu (5–8 ngày) và tôm chua Huế (7 ngày) "vừa khít" (finish 8 và 7 trong [6,8]) → nhắc làm HÔM NAY.
  const preTet = 26;
  it('còn ~6 ngày tới Tết → nhắc dưa/củ kiệu làm hôm nay cho kịp lễ', () => {
    expect(dayOfYear(preTet)).toBe(25);
    const tips = preserveMorningTips({ day: preTet, seed: 1, weather: 'sunny', jobs: [] });
    const fest = tips.find((t) => t.icon === '🏮');
    expect(fest).toBeTruthy();
    expect(fest!.text).toContain('Tết');
    expect(fest!.text).toContain('làm HÔM NAY cho kịp lễ');
  });

  it('quá xa lễ (không trong cửa sổ nhắc) → không nhắc', () => {
    const far = 10; // dayOfYear 9 — chưa tới cửa sổ đếm lùi của lễ nào
    const tips = preserveMorningTips({ day: far, seed: 1, weather: 'sunny', jobs: [] });
    expect(tips.find((t) => t.icon === '🏮')).toBeUndefined();
  });

  it('không phụ thuộc thời tiết rủi ro (đếm lùi thuần từ lịch)', () => {
    const a = preserveMorningTips({ day: preTet, seed: 5, weather: 'rain', jobs: [] });
    const b = preserveMorningTips({ day: preTet, seed: 99, weather: 'sunny', jobs: [] });
    expect(a.find((t) => t.icon === '🏮')).toBeTruthy();
    expect(b.find((t) => t.icon === '🏮')).toBeTruthy();
  });
});
