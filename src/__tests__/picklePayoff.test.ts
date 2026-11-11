import { describe, it, expect } from 'vitest';
import { picklePayoff } from '../data/picklePayoff';
import { PRESERVE_DEFS, type PreserveDef, type PreserveJob } from '../data/preserve';
import { referenceSell } from '../data/pricing';

// Mẻ muối giả: dưa cải (window 2–4) — nhìn trong PRESERVE_DEFS để khớp id thật.
const defById = (id: string) => PRESERVE_DEFS.find((d) => d.id === id)!;

const muoiDef = defById('ps_dua_cai');   // dưa cải muối: window [2,4], outputQty 4
const uDef = defById('ps_nuoc_mam');     // nước mắm ủ: need 14, aged 28 -> 5

const job = (def: PreserveDef, startDay: number, extra: Partial<PreserveJob> = {}): PreserveJob => ({
  id: 1, defId: def.id, startDay, sun: 0, covered: false, wet: 0, allHomegrown: false, ...extra,
});

const priceOf = (id: string) => referenceSell(id);
const ngon = (p: { valueBest: number; valueNow: number }) => p;

describe('picklePayoff — mẻ MUỐI (cửa sổ chất lượng)', () => {
  it('còn hăng (haran): vớt ngay 0 đơn vị, báo thời điểm NGON + tiền', () => {
    const def = muoiDef; // window [2,4]
    const p = picklePayoff({ job: job(def, 10), def, day: 11, priceOf }); // age 1 < 2
    expect(p.qtyNow).toBe(0);
    expect(p.valueNow).toBe(0);
    expect(p.qtyBest).toBe(def.outputQty);
    expect(p.labBest).toBe(true); // NGON toàn lô nhà trồng → +20%
    expect(p.dayToBest).toBe(1); // còn 1 ngày nữa tới window[0]=2
    expect(p.valueBest).toBe(Math.round(def.outputQty * priceOf(def.outputId) * 1.2));
  });

  it('NGON (đúng đầu cửa sổ): vớt ngay đủ lô + toàn lô nhà trồng +20%, bonus 0', () => {
    const def = muoiDef;
    const p = picklePayoff({ job: job(def, 10), def, day: 12, priceOf }); // age 2 trong [2,3] ngon
    expect(p.qtyNow).toBe(def.outputQty);
    expect(p.labNow).toBe(true);
    expect(p.valueNow).toBe(p.valueBest);
    expect(p.bonus).toBe(0);
  });

  it('Đạt (giữa cửa sổ): đủ lô nhưng nhãn chỉ khi toàn nhà trồng, nhắc lỡ NGON', () => {
    const def = muoiDef;
    const p = picklePayoff({ job: job(def, 10), def, day: 14, priceOf }); // age 4 > w0+1=3 -> dat, ≤ w1=4
    expect(p.qtyNow).toBe(def.outputQty);
    expect(p.labNow).toBe(false); // không toàn nhà trồng
    expect(p.valueNow).toBe(Math.round(def.outputQty * priceOf(def.outputId)));
    expect(p.valueBest).toBeGreaterThan(p.valueNow); // nếu vớt NGON sớm được hơn
  });

  it('khú (kem): sản lượng ×0,6, vẫn nhắc giá trị nếu vớt NGON', () => {
    const def = muoiDef; // w[1]=4, kem khi age 5–6
    const p = picklePayoff({ job: job(def, 10), def, day: 15, priceOf }); // age 5
    expect(p.qtyNow).toBe(Math.round(def.outputQty * 0.6));
    expect(p.labNow).toBe(false); // kem: nhãn chỉ khi toàn nhà trồng
    expect(p.valueNow).toBe(Math.round(p.qtyNow * priceOf(def.outputId)));
    expect(p.valueBest).toBeGreaterThan(p.valueNow); // vớt NGON sớm hơn thì đắt hơn
    expect(p.valueBest).toBe(Math.round(def.outputQty * priceOf(def.outputId) * 1.2));
  });

  it('hỏng (hong): vớt ngay 0, dòng báo đổ bỏ', () => {
    const def = muoiDef;
    const p = picklePayoff({ job: job(def, 10), def, day: 17, priceOf }); // age 7 > w1+2=6
    expect(p.qtyNow).toBe(0);
    expect(p.valueNow).toBe(0);
    expect(p.line).toContain('hoảng');
  });
});

describe('picklePayoff — mẻ Ủ (mốc ủ lâu)', () => {
  it('chưa đủ ngày: vớt ngay 0, báo mốc ủ LÂU + tiền', () => {
    const def = uDef; // need 14, aged 28 -> 5
    const p = picklePayoff({ job: job(def, 10), def, day: 18, priceOf }); // age 8
    expect(p.qtyNow).toBe(0);
    expect(p.valueNow).toBe(0);
    expect(p.qtyBest).toBe(def.aged!.outputQty); // 5
    expect(p.labBest).toBe(true);
    expect(p.dayToBest).toBe(def.aged!.day - 8); // 20
  });

  it('đủ ngày nhưng chưa tới mốc LÂU: rút ngay thường, báo chờ mốc ra nhiều hơn + nhãn', () => {
    const def = uDef;
    const p = picklePayoff({ job: job(def, 10), def, day: 25, priceOf }); // age 15 >= 14 ripe, < 28
    expect(p.qtyNow).toBe(def.outputQty);
    expect(p.valueNow).toBe(Math.round(def.outputQty * priceOf(def.outputId)));
    expect(p.qtyBest).toBe(def.aged!.outputQty);
    expect(p.valueBest).toBe(Math.round(def.aged!.outputQty * priceOf(def.outputId) * 1.2));
    expect(p.dayToBest).toBe(28 - 15);
  });

  it('đạt mốc ủ LÂU: rút ngay ra NHIỀU hơn + toàn lô nhãn, bonus 0', () => {
    const def = uDef;
    const p = picklePayoff({ job: job(def, 10), def, day: 39, priceOf }); // age 29 >= 28
    expect(p.qtyNow).toBe(def.aged!.outputQty);
    expect(p.labNow).toBe(true);
    expect(p.valueNow).toBe(p.valueBest);
    expect(p.bonus).toBe(0);
  });
});

describe('picklePayoff — đặc tính chung', () => {
  it('thuần: không đụng sim/hằng khác, cùng state → cùng kết quả (tất định)', () => {
    const def = muoiDef;
    const a = picklePayoff({ job: job(def, 10), def, day: 13, priceOf });
    const b = picklePayoff({ job: job(def, 10), def, day: 13, priceOf });
    expect(a).toEqual(b);
    expect(ngon(a).valueNow).not.toBeNaN();
  });
});
