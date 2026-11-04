import { describe, expect, it } from 'vitest';
import { farmPopIcon, farmPopLabel, harvestPops } from '../data/farmJuice';
import { plotBedPos, penCenter, FARM_CENTER } from '../world/farm';
import type { GardenState, Plot } from '../data/garden';

const mkPlot = (crop: string | null, growth: number): Plot => ({ crop, wateredDay: 0, growth });

const mkG = (plots: Plot[], homegrown: Record<string, number>): GardenState => ({
  land: 0, plots, pens: {}, buildings: {}, wood: 0, stone: 0, fence: 0, plantRight: 0, homegrown,
} as unknown as GardenState);

describe('farmJuice (GĐ1255 — juice thu hoạch trại)', () => {
  it('farmPopIcon: rau → 🥬, trứng gà → 🐔, sản phẩm lạ → 🌿 trung tính', () => {
    expect(farmPopIcon('rau')).toBe('🥬');
    expect(farmPopIcon('trung')).toBe('🐔');
    expect(farmPopIcon('khong_biet')).toBe('🌿');
  });

  it('farmPopLabel: "+3 🥬" — số thu thêm + icon sản phẩm', () => {
    expect(farmPopLabel('rau', 3)).toBe('+3 🥬');
  });

  it('thu luống chín → pop tại đúng luống với số lượng tăng của homegrown', () => {
    const prev = mkG([mkPlot('rau_cai', 3)], {}); // rau_cai chín ở ngày 3
    const next = mkG([mkPlot(null, 0)], { rau: 8 });
    const pops = harvestPops(prev, next);
    expect(pops.length).toBe(1);
    expect(pops[0]).toMatchObject({ productId: 'rau', qty: 8, label: '+8 🥬', source: 'plot', x: plotBedPos(0).x, z: plotBedPos(0).z });
  });

  it('cây lâu năm regrow (chín → non cùng giống) vẫn neo đúng luống', () => {
    const prev = mkG([mkPlot('traicay_nam', 7)], {}); // days 7 — đã chín
    const next = mkG([mkPlot('traicay_nam', 4)], { traicay: 8 }); // regrowDays 3 → growth 4
    const pops = harvestPops(prev, next);
    expect(pops.length).toBe(1);
    expect(pops[0].source).toBe('plot');
    expect(pops[0].productId).toBe('traicay');
    expect(pops[0].x).toBe(plotBedPos(0).x);
  });

  it('luống chưa chín thì không tính là thu hoạch (trồng/xảy ra tăng homegrown từ nguồn khác vẫn fallback)', () => {
    const prev = mkG([mkPlot('rau_cai', 1)], {}); // non
    const next = mkG([mkPlot('rau_cai', 2)], { rau: 8 });
    const pops = harvestPops(prev, next);
    expect(pops.length).toBe(1);
    expect(pops[0].source).toBe('farm'); // không xác định được luống → neo cổng trại
    expect(pops[0].x).toBeNull();
  });

  it('lấy trứng gà → pop tại tâm sân thả gà', () => {
    const prev = mkG([], {});
    const next = mkG([], { trung: 1 });
    const pops = harvestPops(prev, next);
    expect(pops.length).toBe(1);
    expect(pops[0]).toMatchObject({ productId: 'trung', qty: 1, label: '+1 🐔', source: 'pen', x: penCenter('chicken').x, z: penCenter('chicken').z });
  });

  it('homegrown giảm (bán/giao đơn) thì không pop — chỉ khoe thu vào', () => {
    const prev = mkG([], { rau: 10 });
    const next = mkG([], { rau: 4 });
    expect(harvestPops(prev, next)).toEqual([]);
    expect(harvestPops(prev, prev)).toEqual([]);
  });

  it('trần 4 pop mỗi lần soi — thu dồn dập vẫn có phản hồi nhưng không spam', () => {
    const prev = mkG([], {});
    const next = mkG([], { rau: 1, bap: 1, mia: 1, traicay: 1, gao: 1, trung: 1, sua_tuoi: 1 });
    expect(harvestPops(prev, next).length).toBe(4);
  });

  it('toạ độ là cục bộ trong trại — caller cộng FARM_CENTER ra vị trí thế giới', () => {
    // farmPopFx.spawn dùng FARM_CENTER + anchor; đảm bảo anchor nằm trong biên trại (±13) để bong bóng không bay lạc
    for (let i = 0; i < 12; i++) {
      const p = plotBedPos(i);
      expect(Math.abs(p.x)).toBeLessThan(13);
      expect(Math.abs(p.z)).toBeLessThan(13);
    }
    expect(Math.abs(FARM_CENTER.x)).toBeGreaterThan(0); // trại nằm xa tiệm — cần cộng offset
  });
});
