import { beforeEach, describe, expect, it } from 'vitest';
import { newGameData, useGame } from '../core/store';
import { CROPS, emptyPlot, GARDEN_UNLOCK } from '../data/garden';

/** plantCrop / waterPlot / waterGarden — trồng (cấp, tiền giống, luống trống), tưới từng luống và tưới cả vườn (mưa, tưới tự động). */

const g = () => useGame.getState();
const cai = CROPS.find((c) => c.id === 'rau_cai')!;

beforeEach(() => {
  const d = newGameData();
  useGame.setState({
    ...d,
    level: GARDEN_UNLOCK,
    money: 1_000_000,
    day: 5,
    weather: 'sunny',
    garden: { ...d.garden, plots: [emptyPlot(), emptyPlot(), emptyPlot()], buildings: {} },
  });
});

describe('plantCrop', () => {
  it('đủ cấp, đủ tiền, luống trống: trồng, trừ tiền giống, tính là tưới hôm nay', () => {
    g().plantCrop(0, cai.id);
    expect(g().garden.plots[0]).toMatchObject({ crop: cai.id, growth: 0, wateredDay: 5 });
    expect(g().money).toBe(1_000_000 - cai.seedCost);
    expect(g().stats.spent).toBe(newGameData().stats.spent + cai.seedCost);
  });

  it('chưa tới cấp mở trang trại: không trồng', () => {
    useGame.setState({ level: GARDEN_UNLOCK - 1 });
    g().plantCrop(0, cai.id);
    expect(g().garden.plots[0].crop).toBeFalsy();
    expect(g().money).toBe(1_000_000);
  });

  it('luống đã có cây: không trồng đè, không trừ tiền', () => {
    g().plantCrop(0, cai.id);
    g().plantCrop(0, cai.id);
    expect(g().money).toBe(1_000_000 - cai.seedCost);
  });

  it('thiếu tiền giống hoặc giống lạ: bỏ qua', () => {
    useGame.setState({ money: cai.seedCost - 1 });
    g().plantCrop(0, cai.id);
    g().plantCrop(1, 'khong_co');
    expect(g().garden.plots.every((p) => !p.crop)).toBe(true);
    expect(g().money).toBe(cai.seedCost - 1);
  });
});

describe('waterPlot / waterGarden', () => {
  beforeEach(() => {
    g().plantCrop(0, cai.id);
    g().plantCrop(1, cai.id);
    useGame.setState({ day: 6 });
  });

  it('waterPlot: chỉ tưới đúng luống có cây', () => {
    g().waterPlot(1);
    expect(g().garden.plots.map((p) => p.wateredDay)).toEqual([5, 6, emptyPlot().wateredDay]);
    g().waterPlot(2);
    expect(g().garden.plots[2].crop).toBeFalsy();
  });

  it('waterGarden: tưới mọi luống có cây, bỏ luống trống', () => {
    g().waterGarden();
    expect(g().garden.plots[0].wateredDay).toBe(6);
    expect(g().garden.plots[1].wateredDay).toBe(6);
    expect(g().garden.plots[2].crop).toBeFalsy();
  });

  it('trời mưa hoặc có tưới tự động: không đổi trạng thái tưới', () => {
    useGame.setState({ weather: 'rain' });
    g().waterGarden();
    g().waterPlot(0);
    expect(g().garden.plots[0].wateredDay).toBe(5);
    useGame.setState({ weather: 'sunny', garden: { ...g().garden, buildings: { tuoi_tu_dong: 1 } } });
    g().waterGarden();
    g().waterPlot(1);
    expect(g().garden.plots[1].wateredDay).toBe(5);
  });
});
