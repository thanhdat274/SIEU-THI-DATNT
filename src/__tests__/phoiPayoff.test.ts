import { describe, it, expect } from 'vitest';
import { phoiPayoff } from '../data/phoiPayoff';
import { PRESERVE_DEFS, type PreserveDef, type PreserveJob } from '../data/preserve';
import { referenceSell } from '../data/pricing';

const defById = (id: string) => PRESERVE_DEFS.find((d) => d.id === id)!;
// Một mẻ phơi bánh tráng (phơi sương) — kiểu phoi có fogBonus, outputQty 5.
const phoiDef: PreserveDef = defById('ps_banh_trang');

const job = (def: PreserveDef, sun: number, extra: Partial<PreserveJob> = {}): PreserveJob => ({
  id: 1, defId: def.id, startDay: 1, sun, covered: false, wet: 0, allHomegrown: false, ...extra,
});

describe('phoiPayoff — giàn phơi (giá trị thật khi thu)', () => {
  it('chưa đủ nắng: báo tiến độ % + giá trị khi thu (không nhãn)', () => {
    const def = phoiDef;
    const p = phoiPayoff({ job: job(def, def.need * 0.5), def });
    expect(p.ready).toBe(false);
    expect(p.progressPct).toBe(50);
    expect(p.lab).toBe(false);
    expect(p.valueReady).toBe(Math.round(def.outputQty * referenceSell(def.outputId)));
  });

  it('đủ nắng: thu ngay, sản lượng đủ, đúng giá', () => {
    const def = phoiDef;
    const p = phoiPayoff({ job: job(def, def.need), def });
    expect(p.ready).toBe(true);
    expect(p.qty).toBe(def.outputQty);
    expect(p.valueReady).toBe(Math.round(def.outputQty * referenceSell(def.outputId)));
  });

  it('toàn nhà trồng: thu bán +20% (nhãn nhà trồng)', () => {
    const def = phoiDef;
    const p = phoiPayoff({ job: job(def, def.need, { allHomegrown: true }), def });
    expect(p.lab).toBe(true);
    expect(p.valueReady).toBe(Math.round(def.outputQty * referenceSell(def.outputId) * 1.2));
  });

  it('dính mưa: vẫn tính nắng/gía, dòng nhắc số lần ướt', () => {
    const def = phoiDef;
    const p = phoiPayoff({ job: job(def, def.need, { wet: 2 }), def });
    expect(p.wet).toBe(2);
    expect(p.line).toContain('2 lần');
  });

  it('dùng priceOf truyền vào (giá người chơi tự đặt)', () => {
    const def = phoiDef;
    const p = phoiPayoff({ job: job(def, def.need), def, priceOf: () => 999999 });
    expect(p.valueReady).toBe(Math.round(def.outputQty * 999999));
  });

  it('tất định: cùng state → cùng kết quả', () => {
    const def = phoiDef;
    const a = phoiPayoff({ job: job(def, 2.5), def });
    const b = phoiPayoff({ job: job(def, 2.5), def });
    expect(a).toEqual(b);
  });
});
