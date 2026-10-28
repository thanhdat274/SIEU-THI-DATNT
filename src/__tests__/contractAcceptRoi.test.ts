import { describe, expect, it } from 'vitest';
import { contractAcceptRoi, contractValue, SUPPLY_CONTRACTS, supplyContractById } from '../data/contracts';

/** ROI nhận hợp đồng (GĐ150): quyết định "có nên ký hợp đồng không" ra con số — lời THẬT sau vốn,
 *  nhượng bao nhiêu % so với bán lẻ cùng lô. Thuần đọc định nghĩa, không đụng state/save/kinh tế. */

describe('contractAcceptRoi — tính đúng theo dữ liệu thật', () => {
  it('quán nhậu (0.9): lời thật 98.800đ/kỳ ~33.000đ/ngày, nhượng 10%, verdict Đáng ký', () => {
    const r = contractAcceptRoi(supplyContractById('quan_nhau')!);
    expect(r.retailValue).toBe(472000); // Σ sell×q
    expect(r.costOfGoods).toBe(326000); // Σ buy×q
    expect(r.retailNet).toBe(146000);   // lãi nếu bán lẻ hết lô
    expect(r.contractNet).toBe(98800);  // 424800 − 326000
    expect(r.giveUp).toBe(47200);       // 146000 − 98800 = chiết khấu sỉ
    expect(r.giveUpPct).toBeCloseTo(0.1, 5);
    expect(r.netPerDay).toBe(33000);    // round(98800/3/1000)*1000
    expect(r.verdict).toBe('worth');
  });

  it('xưởng gỗ (0.88): nhượng 12% (13%→tight ranh giới), verdict Cân nhắc', () => {
    const r = contractAcceptRoi(supplyContractById('xuong_go')!);
    expect(r.contractNet).toBe(89680);
    expect(r.netPerDay).toBe(18000);
    expect(r.giveUpPct).toBeCloseTo(0.12, 5);
    expect(r.verdict).toBe('tight');
  });

  it('bếp ăn công nhân (0.9): lời thật 358.800đ/kỳ ~90.000đ/ngày — Đáng ký', () => {
    const r = contractAcceptRoi(supplyContractById('bep_an_cong_nhan')!);
    expect(r.retailNet).toBe(552000);
    expect(r.contractNet).toBe(358800);
    expect(r.netPerDay).toBe(90000);
    expect(r.verdict).toBe('worth');
  });

  it('cửa hàng bánh (0.86): nhượng 14% — Cân nhắc (ranh giới trên của tight)', () => {
    const r = contractAcceptRoi(supplyContractById('cua_hang_banh')!);
    expect(r.giveUpPct).toBeCloseTo(0.14, 5);
    expect(r.verdict).toBe('tight');
  });

  it('giá trị khớp nhau: giveUp = retailNet − contractNet = retailValue − contractValue', () => {
    for (const c of SUPPLY_CONTRACTS) {
      const r = contractAcceptRoi(c);
      expect(r.giveUp).toBe(r.retailNet - r.contractNet);
      expect(r.giveUp).toBe(r.retailValue - c.pricePerUnit * r.retailValue);
      expect(r.contractNet).toBe(contractValue(c) - r.costOfGoods);
    }
  });
});

describe('verdict mapping theo mức nhượng giá', () => {
  it('≤ 10% → worth · ≤ 14% → tight · > 14% → skip (biên)', () => {
    const mk = (pu: number) => contractAcceptRoi({ ...supplyContractById('quan_nhau')!, pricePerUnit: pu });
    expect(mk(0.90).verdict).toBe('worth');   // nhượng 10%
    expect(mk(0.92).verdict).toBe('worth');   // nhượng 8%
    expect(mk(0.87).verdict).toBe('tight');   // nhượng 13%
    expect(mk(0.85).verdict).toBe('skip');    // nhượng 15%
    expect(mk(0.80).verdict).toBe('skip');    // nhượng 20%
  });
});

describe('tính bền: mọi hợp đồng hiện tại vẫn LỜI sau vốn', () => {
  it('contractNet dương với mọi hợp đồng (giá nhập < giá sỉ trả)', () => {
    for (const c of SUPPLY_CONTRACTS) {
      const r = contractAcceptRoi(c);
      expect(r.contractNet).toBeGreaterThan(0);
      expect(r.netPerDay).toBeGreaterThan(0);
    }
  });
});
