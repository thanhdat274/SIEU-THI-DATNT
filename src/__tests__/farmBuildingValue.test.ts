import { describe, expect, it } from 'vitest';
import { dailyFeedCost, farmBuildingValue } from '../data/farmValue';
import type { GardenState } from '../data/garden';

const mkG = (buildings: any, pens: any): GardenState => ({
  land: 0, plots: [], pens: pens ?? {}, buildings: buildings ?? {},
  wood: 0, stone: 0, fence: 0, plantRight: 0,
} as any);

const line = (g: GardenState, id: string) => farmBuildingValue(g).find(v => v.id === id);

describe('farmBuildingValue', () => {
  it('bãi thả chưa xây + chưa có vật nuôi: không giảm được đồng cám nào (hasMoney false)', () => {
    const g = mkG({}, {});
    const v = line(g, 'bai_tha')!;
    expect(v.owned).toBe(false);
    expect(v.hasMoney).toBe(false);
    expect(v.line).toContain('Chưa xây (9.000.000đ)');
    expect(v.line).toContain('chưa giảm được đồng cám nào');
  });

  it('bãi thả 1 sao + 1 gà: giảm đúng 10% cám (180đ/ngày), hasMoney true', () => {
    const g = mkG({ bai_tha: 1 }, { chicken: { count: 1 } });
    // chi phí cám 1 gà: 0.12kg × 15.000đ/kg = 1.800 (thô); bãi thả 10% → tiết 180
    expect(dailyFeedCost(g)).toBe(1800);
    const v = line(g, 'bai_tha')!;
    expect(v.hasMoney).toBe(true);
    expect(v.line).toContain('Bãi thả cấp 1');
    expect(v.line).toContain('~180đ cám/ngày');
    expect(v.line).toContain('1 chuồng đang nuôi');
  });

  it('bãi thả 2 sao trong trại nhiều vật nuôi: giảm 20% cám (hasMoney true)', () => {
    const g = mkG({ bai_tha: 2 }, { chicken: { count: 2 }, pig: { count: 1 }, cow: { count: 1 } });
    // feedCost thô = 57.100 (2 ga + 1 heo + 1 bo), bãi 2 sao 20% → tiết 11.420
    expect(dailyFeedCost(g)).toBe(57100);
    const v = line(g, 'bai_tha')!;
    expect(v.hasMoney).toBe(true);
    expect(v.line).toContain('~11.420đ cám/ngày');
    expect(v.line).toContain('3 chuồng đang nuôi');
  });

  it('bù nhìn 1 sao = 6%, 3 sao = 18% (định tính, không hasMoney)', () => {
    expect(line(mkG({ bu_nhin: 1 }, {}), 'bu_nhin')!.line).toContain('6%');
    const v3 = line(mkG({ bu_nhin: 3 }, {}), 'bu_nhin')!;
    expect(v3.line).toContain('18%');
    expect(v3.hasMoney).toBe(false);
  });

  it('chưa xây bù nhìn: hiện giá 6tr + lời khuyên chỉ đáng khi trồng nhiều', () => {
    const v = line(mkG({}, {}), 'bu_nhin')!;
    expect(v.owned).toBe(false);
    expect(v.line).toContain('Chưa xây (6.000.000đ)');
    expect(v.line).toContain('chỉ đáng khi bạn trồng nhiều');
  });

  it('tưới: sao 1 chỉ tự tưới (QoL), sao 3 +10% cây lớn nhanh', () => {
    expect(line(mkG({ tuoi_tu_dong: 1 }, {}), 'tuoi_tu_dong')!.line).toContain('khỏi thao tác');
    expect(line(mkG({ tuoi_tu_dong: 3 }, {}), 'tuoi_tu_dong')!.line).toContain('10%/sao');
  });

  it('nhà lưới: sao 1 +0.5 ngày/đêm, sao 2 +1 ngày/đêm', () => {
    expect(line(mkG({ nha_luoi: 1 }, {}), 'nha_luoi')!.line).toContain('0.5 ngày mỗi đêm');
    expect(line(mkG({ nha_luoi: 2 }, {}), 'nha_luoi')!.line).toContain('1 ngày mỗi đêm');
  });

  it('chi phí "hành động ngay" đúng: chưa xây = giá mua, đã xây = tiền lên sao tiếp, max = 0', () => {
    // bù nhìn: giá mua 6tr, lên sao 2 = 4tr
    expect(line(mkG({}, {}), 'bu_nhin')!.cost).toBe(6_000_000);
    expect(line(mkG({ bu_nhin: 1 }, {}), 'bu_nhin')!.cost).toBe(4_000_000);
    expect(line(mkG({ bu_nhin: 2 }, {}), 'bu_nhin')!.cost).toBe(6_000_000);
    expect(line(mkG({ bu_nhin: 3 }, {}), 'bu_nhin')!.cost).toBe(0); // tối sao
  });

  it('trả 7 công trình đủ thứ tự + thuần (hai lần gọi như nhau)', () => {
    const g = mkG({ bai_tha: 1 }, { chicken: { count: 1 } });
    const a = farmBuildingValue(g);
    const b = farmBuildingValue(g);
    expect(a.map(x => x.id)).toEqual(['bu_nhin', 'tuoi_tu_dong', 'bai_tha', 'nha_luoi', 'gian_phoi', 'vai_muoi', 'chum_u']);
    expect(a).toEqual(b);
    expect(a.length).toBe(7);
  });

  it('sân phơi: kể đúng số nong theo sao (2/4/6), chưa xây thì kể giá mua + cấp mở', () => {
    const mk = (b: Record<string, number>) => farmBuildingValue(mkG(b, {}));
    expect(mk({}).find(x => x.id === 'gian_phoi')!.cost).toBe(5_000_000);
    expect(mk({ gian_phoi: 1 }).find(x => x.id === 'gian_phoi')!.cost).toBe(3_500_000);
    expect(mk({ gian_phoi: 1 }).find(x => x.id === 'gian_phoi')!.line).toContain('2 nong');
    expect(mk({ gian_phoi: 3 }).find(x => x.id === 'gian_phoi')!.line).toContain('6 nong');

    // Dãy vại muối (lát L5): giá mua 6tr, cấp mở 38, kể số vại theo sao.
    expect(mk({}).find(x => x.id === 'vai_muoi')!.cost).toBe(6_000_000);
    expect(mk({ vai_muoi: 1 }).find(x => x.id === 'vai_muoi')!.line).toContain('2 vại');
    expect(mk({ vai_muoi: 3 }).find(x => x.id === 'vai_muoi')!.line).toContain('6 vại');

    // Nhà chum ủ (lát L6): giá mua 12tr, cấp mở 46, kể số chum theo sao (1/2/4).
    expect(mk({}).find(x => x.id === 'chum_u')!.cost).toBe(12_000_000);
    expect(mk({ chum_u: 1 }).find(x => x.id === 'chum_u')!.line).toContain('1 chum');
    expect(mk({ chum_u: 3 }).find(x => x.id === 'chum_u')!.line).toContain('4 chum');

    expect(mk({ gian_phoi: 3 }).find(x => x.id === 'gian_phoi')!.cost).toBe(0); // tối sao
  });
});
