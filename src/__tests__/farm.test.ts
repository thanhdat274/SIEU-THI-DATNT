import { describe, expect, it } from 'vitest';
import {
  ANIMALS, ANIMAL_ORDER, animalMode, EGG_PER_TRAY, farmhandChores, gardenNight, harvestYield, inSeason, LAND_TIERS, makeFarmOrder, newGarden, penCap, fattenReady, plotReady,
  type GardenState, type Pen,
} from '../data/garden';
import { formatMoney, productById } from '../data/products';
import { applySnapshot } from '../core/save';
import { newGameData, useGame } from '../core/store';

const seed = (over: Partial<ReturnType<typeof newGameData>>) => useGame.setState({ ...newGameData(), ...over });

describe('trang trại — bậc đất và sức chuồng', () => {
  it('mặc định: 4 luống, chuồng gà 3 con, chưa nuôi được loài khác', () => {
    const g = newGarden();
    expect(g.land).toBe(0);
    expect(g.plots.length).toBe(LAND_TIERS[0].plots);
    expect(penCap(0, 'chicken')).toBe(3);
    expect(penCap(0, 'duck')).toBe(0);
    expect(penCap(0, 'cow')).toBe(0);
  });

  it('bậc cao nhất: chuồng đủ 7 loài', () => {
    expect(penCap(2, 'chicken')).toBe(16);
    expect(penCap(2, 'duck')).toBe(8);
    expect(penCap(2, 'goose')).toBe(8);
    expect(penCap(2, 'pig')).toBe(4);
    expect(penCap(2, 'cow')).toBe(3);
    expect(penCap(2, 'goat')).toBe(3);
    expect(penCap(2, 'dong_tao')).toBe(3);
  });

  it('expandFarm: chặn thiếu cấp/tiền, đủ thì tăng luống và sức chuồng', () => {
    seed({ level: 16, money: 20_000_000, garden: newGarden() });
    useGame.getState().expandFarm();
    const s = useGame.getState();
    expect(s.garden.land).toBe(1);
    expect(s.garden.plots.length).toBe(8);
    expect(penCap(1, 'duck')).toBe(4);
    expect(s.money).toBe(20_000_000 - LAND_TIERS[1].cost);
    useGame.getState().expandFarm();
    expect(useGame.getState().garden.land).toBe(1); // bậc 3 cần cấp 24
  });
});

describe('trang trại — mua và cho ăn theo loài', () => {
  it('buyAnimal chặn cấp / đất / đầy chuồng, đủ điều kiện thì mua được', () => {
    seed({ level: 16, money: 100_000_000, garden: newGarden() });
    useGame.getState().buyAnimal('duck');
    expect(useGame.getState().garden.pens.duck).toBeUndefined(); // cần đất bậc 2
    seed({ level: 16, money: 100_000_000, garden: newGarden() });
    const g = useGame.getState().garden;
    useGame.setState({ garden: { ...g, land: 1 } });
    useGame.getState().buyAnimal('duck');
    expect(useGame.getState().garden.pens.duck?.count).toBe(1);
    // Vịt bậc 2 chứa 4 con
    for (let i = 0; i < 5; i++) useGame.getState().buyAnimal('duck');
    expect(useGame.getState().garden.pens.duck?.count).toBe(4);
  });

  it('cho gà ăn: ăn cám máng trước, thiếu mở túi từ kho, dư nằm lại trong máng', () => {
    const pen: Pen = { count: 3, fedDay: 0, feedKg: 0, pending: 0 };
    seed({ day: 5, storage: { cam_ga: 2 }, garden: { ...newGarden(), pens: { chicken: pen } } });
    useGame.getState().feedPen('chicken');
    const s = useGame.getState();
    expect(s.garden.pens.chicken!.fedDay).toBe(5);
    expect(s.storage.cam_ga).toBe(1); // mở 1 túi là đủ 3×0,12=0,36 kg
    expect(s.garden.pens.chicken!.feedKg).toBeCloseTo(1 - 3 * ANIMALS.chicken.feedKgPerDay, 5);
  });

  it('cho bò ăn theo bao 5 kg: kho thiếu thì mua lẻ đắt thêm 50%', () => {
    const pen: Pen = { count: 2, fedDay: 0, feedKg: 0, pending: 0 };
    seed({ day: 5, storage: {}, money: 1_000_000, garden: { ...newGarden(), pens: { cow: pen } } });
    const money = useGame.getState().money;
    useGame.getState().feedPen('cow');
    const s = useGame.getState();
    // 2 bò × 2,5 kg = 5 kg = đúng 1 bao, kho không có → mua lẻ 1 bao +50% giá
    expect(s.money).toBe(money - Math.round(productById('cam_bo').buy * 1.5));
    expect(s.garden.pens.cow!.fedDay).toBe(5);
  });

  it('kho hết cám và không đủ tiền mua lẻ: chuồng nhịn, tiền không đổi', () => {
    const pen: Pen = { count: 3, fedDay: 0, feedKg: 0, pending: 0 };
    seed({ day: 5, storage: {}, money: 1000, garden: { ...newGarden(), pens: { chicken: pen } } });
    useGame.getState().feedPen('chicken');
    expect(useGame.getState().garden.pens.chicken!.fedDay).toBe(0);
    expect(useGame.getState().money).toBe(1000);
  });
});

describe('trang trại — đêm cho sản phẩm (7 loài)', () => {
  it('gà được cho ăn thì đẻ trứng theo xác suất', () => {
    const g = { ...newGarden(), pens: { chicken: { count: 10, fedDay: 1, feedKg: 1, pending: 0 } } };
    const { garden, news } = gardenNight(g, { day: 2, weather: 'sunny', fed: { chicken: true }, rng: () => 0.1 });
    expect(garden.pens.chicken!.pending).toBe(10);
    expect(news.some((n) => n.includes('đẻ'))).toBe(true);
  });

  it('vịt đẻ theo xác suất (rng thấp thì cả đàn đẻ); bò cho sữa chắc chắn', () => {
    const g = { ...newGarden(), pens: { duck: { count: 10, fedDay: 1, feedKg: 1, pending: 0 }, cow: { count: 2, fedDay: 1, feedKg: 5, pending: 0 } } };
    const { garden } = gardenNight(g, { day: 2, weather: 'sunny', fed: { duck: true, cow: true }, rng: () => 0 });
    expect(garden.pens.duck!.pending).toBe(10); // rng 0 < layChance nên cả 10 con đẻ
    expect(garden.pens.cow!.pending).toBe(2 * ANIMALS.cow.outputPerDay!);
  });

  it('ngỗng đẻ ít hơn gà nhưng trứng to; dê cho 1 lốc sữa mỗi con mỗi ngày', () => {
    const g = { ...newGarden(), pens: { goose: { count: 4, fedDay: 1, feedKg: 1, pending: 0 }, goat: { count: 3, fedDay: 1, feedKg: 5, pending: 0 } } };
    const { garden } = gardenNight(g, { day: 2, weather: 'sunny', fed: { goose: true, goat: true }, rng: () => 0 });
    expect(garden.pens.goose!.pending).toBe(4); // rng 0 < 0,5 nên cả đàn đẻ
    expect(garden.pens.goat!.pending).toBe(3 * ANIMALS.goat.outputPerDay!);
    expect(animalMode(ANIMALS.goose)).toBe('egg');
    expect(animalMode(ANIMALS.goat)).toBe('milk');
    expect(animalMode(ANIMALS.dong_tao)).toBe('fatten');
  });

  it('heo ăn no thì thêm một ngày vỗ béo, đủ 12 ngày là xuất chuồng được; đói thì không lớn', () => {
    let g: GardenState = { ...newGarden(), pens: { pig: { count: 2, fedDay: 1, feedKg: 10, pending: 0, fattened: 0 } } };
    for (let d = 2; d <= 13; d++) g = gardenNight(g, { day: d, weather: 'sunny', fed: { pig: true }, rng: () => 0.5 }).garden;
    expect(fattenReady('pig', g.pens.pig)).toBe(true);
    const hungry = gardenNight(g, { day: 14, weather: 'sunny', fed: {}, rng: () => 0.5 });
    expect(hungry.garden.pens.pig!.fattened).toBe(12); // đói không tăng
  });

  it('gà Đông Tảo vỗ béo 20 ngày; bãi thả nâng xác suất đẻ của gia cầm', () => {
    let g: GardenState = { ...newGarden(), buildings: { bai_tha: 2 }, pens: { dong_tao: { count: 1, fedDay: 1, feedKg: 1, pending: 0, fattened: 0 }, chicken: { count: 10, fedDay: 1, feedKg: 1, pending: 0 } } };
    for (let d = 2; d <= 21; d++) g = gardenNight(g, { day: d, weather: 'sunny', fed: { dong_tao: true }, rng: () => 0.9 }).garden;
    expect(fattenReady('dong_tao', g.pens.dong_tao)).toBe(true);
    // gà layChance 0,9 + bãi thả 2 sao (+0,16) = 1,06 → bị chặn trên 0,95: rng 0,94 đẻ, 0,96 không
    const laid = gardenNight(g, { day: 22, weather: 'sunny', fed: { chicken: true }, rng: () => 0.94 });
    expect(laid.garden.pens.chicken!.pending).toBe(10);
    const noLay = gardenNight(g, { day: 22, weather: 'sunny', fed: { chicken: true }, rng: () => 0.96 });
    expect(noLay.garden.pens.chicken!.pending).toBe(0);
  });

  it('thu trứng gói vỉ đúng số; vắt sữa lấy hết lốc (gà, bò, ngỗng, dê)', () => {
    seed({
      day: 5, garden: {
        ...newGarden(), pens: {
          chicken: { count: 3, fedDay: 5, feedKg: 0, pending: 23 },
          goose: { count: 2, fedDay: 5, feedKg: 0, pending: 12 },
          cow: { count: 1, fedDay: 5, feedKg: 0, pending: 6 },
          goat: { count: 2, fedDay: 5, feedKg: 0, pending: 5 },
        },
      },
    });
    useGame.getState().collectPen('chicken');
    expect(useGame.getState().storage.trung).toBe(2);
    expect(useGame.getState().garden.pens.chicken!.pending).toBe(3);
    useGame.getState().collectPen('goose');
    expect(useGame.getState().storage.trung_goos).toBe(1);
    useGame.getState().collectPen('cow');
    expect(useGame.getState().storage.sua_tuoi).toBe(6);
    useGame.getState().collectPen('goat');
    expect(useGame.getState().storage.sua_de).toBe(5);
  });

  it('xuất chuồng heo: thịt về kho đúng số kg, chuồng rỗng nuôi lứa mới', () => {
    seed({ day: 5, garden: { ...newGarden(), pens: { pig: { count: 2, fedDay: 5, feedKg: 0, pending: 0, fattened: 12 } } } });
    useGame.getState().sellFattened('pig');
    const s = useGame.getState();
    expect(s.storage.x_thit_heo).toBe(2 * ANIMALS.pig.meatPerHead!);
    expect(s.garden.pens.pig!.count).toBe(0);
    expect((s.garden.homegrown.x_thit_heo ?? 0)).toBe(2 * ANIMALS.pig.meatPerHead!);
  });

  it('xuất chuồng gà Đông Tảo: 3 đơn vị thịt quý mỗi con về kho', () => {
    seed({ day: 5, garden: { ...newGarden(), pens: { dong_tao: { count: 3, fedDay: 5, feedKg: 0, pending: 0, fattened: 20 } } } });
    useGame.getState().sellFattened('dong_tao');
    const s = useGame.getState();
    expect(s.storage.thit_ga_dt).toBe(3 * ANIMALS.dong_tao.meatPerHead!);
    expect(s.garden.pens.dong_tao!.count).toBe(0);
  });
});

describe('trang trại — phân bón và cây lâu năm', () => {
  it('bón phân rút bớt 30% thời gian còn lại (tối thiểu 1 ngày), mỗi vụ chỉ bón một lần', () => {
    seed({ day: 5, storage: { phan_bon: 2 }, garden: { ...newGarden(), plots: [{ crop: 'rau_cai', growth: 0, wateredDay: 5 }] } });
    useGame.getState().fertilizePlot(0);
    const s = useGame.getState();
    expect(s.garden.plots[0].growth).toBe(1); // 30% của 3 ngày = 0,9 → tối thiểu 1 ngày
    expect(s.storage.phan_bon).toBe(1);
    useGame.getState().fertilizePlot(0);
    expect(useGame.getState().storage.phan_bon).toBe(1); // đã bón vụ này rồi
  });

  it('bón giữa vụ tính theo thời gian còn lại; cây lâu năm bón một lần lúc trồng là đủ', () => {
    seed({ day: 5, storage: { phan_bon: 3 }, garden: { ...newGarden(), plots: [{ crop: 'cam', growth: 5, wateredDay: 5 }, { crop: 'traicay_nam', growth: 0, wateredDay: 5 }] } });
    useGame.getState().fertilizePlot(0); // cam còn 5/10 ngày → +2
    expect(useGame.getState().garden.plots[0].growth).toBe(7);
    useGame.getState().fertilizePlot(1); // cây lâu năm 7 ngày còn đủ → +2
    expect(useGame.getState().garden.plots[1].growth).toBe(2);
    // thu hoạch cây lâu năm xong: nhãn đã bón GIỮ NGUYÊN, bón lại bị chặn (hết vòng lặp bón mỗi chu kỳ)
    useGame.setState({ garden: { ...useGame.getState().garden, plots: [{ crop: 'cam', growth: 5, wateredDay: 5 }, { crop: 'traicay_nam', growth: 7, wateredDay: 5, fertilizedDay: 5 }] } });
    useGame.getState().harvestPlot(1);
    expect(useGame.getState().garden.plots[1].fertilizedDay).toBe(5);
    useGame.getState().fertilizePlot(1);
    expect(useGame.getState().storage.phan_bon).toBe(1); // không bón được nữa
  });

  it('cây lâu năm thu hoạch xong không mất gốc, hạ về đầu chu kỳ ra trái', () => {
    seed({ day: 5, garden: { ...newGarden(), plots: [{ crop: 'traicay_nam', growth: 7, wateredDay: 5 }] } });
    useGame.getState().harvestPlot(0);
    const p = useGame.getState().garden.plots[0];
    expect(p.crop).toBe('traicay_nam');
    expect(p.growth).toBe(7 - 3);
    expect(plotReady(p)).toBe(false);
  });

  it('mua heo giữa kỳ vỗ béo: xuất chuồng chỉ tính thịt lứa gốc, con mua trễ nhận lại giá giống', () => {
    seed({ level: 30, money: 100_000_000, garden: { ...newGarden(), land: 2, pens: { pig: { count: 2, fedDay: 5, feedKg: 0, pending: 0, fattened: 12 } } } });
    useGame.getState().buyAnimal('pig'); // lứa đang vỗ béo dở → con mới là "mua trễ"
    expect(useGame.getState().garden.pens.pig?.lateJoins).toBe(1);
    const money = useGame.getState().money;
    useGame.getState().sellFattened('pig');
    const s = useGame.getState();
    expect(s.storage.x_thit_heo).toBe(2 * ANIMALS.pig.meatPerHead!); // chỉ 2 con gốc ra thịt
    expect(s.money).toBe(money + ANIMALS.pig.price); // con mua trễ nhận lại đúng giá giống, không lời
    expect(s.garden.pens.pig?.count).toBe(0);
    expect(s.garden.pens.pig?.lateJoins).toBe(0);
  });
});

describe('trang trại — cây ăn trái theo mùa vụ', () => {
  it('harvestYield: đúng mùa sai gấp rưỡi, lệch mùa урож thường; mùa quấn năm (cam 11–2)', () => {
    const vai = { id: 'vai', productId: 'x_vai', name: 'Vải', icon: '🍒', days: 10, seedCost: 1, yieldQty: 6, unlock: 1, season: [5, 7] as [number, number] };
    // Ngày 1 của ván là 1/1 → ngày 160 ≈ đầu tháng 6 (giữa mùa vải)
    expect(inSeason(vai, 160)).toBe(true);
    expect(harvestYield(vai, 160)).toBe(9);
    expect(inSeason(vai, 20)).toBe(false); // tháng 1 ngoài mùa vải
    expect(harvestYield(vai, 20)).toBe(6);
    const cam = { id: 'cam', productId: 'x_cam', name: 'Cam', icon: '🍊', days: 10, seedCost: 1, yieldQty: 6, unlock: 1, season: [11, 2] as [number, number] };
    expect(inSeason(cam, 1)).toBe(true); // tháng 1 trong mùa cam
    expect(inSeason(cam, 60)).toBe(false); // tháng 3 hết mùa
    expect(inSeason(cam, 335)).toBe(true); // ngày 1/12 lại vào mùa
  });

  it('thu hoạch khi đúng mùa cho số món gấp rưỡi (vải tháng 6)', () => {
    seed({ day: 160, level: 40, garden: { ...newGarden(), plots: [{ crop: 'vai', growth: 10, wateredDay: 160 }] } });
    useGame.getState().harvestPlot(0);
    expect(useGame.getState().storage.x_vai).toBe(Math.round(6 * 1.5));
  });

  it('mùa vụ tính theo ngày CHÍN: chín ngoài mùa rồi chờ đúng mùa hái không được ×1,5', () => {
    // vải mùa 5–7: chín ngày 20 (tháng 1), để chín chờ tới ngày 160 (tháng 6) mới hái
    seed({ day: 160, level: 40, garden: { ...newGarden(), plots: [{ crop: 'vai', growth: 10, wateredDay: 20, ripeDay: 20 }] } });
    useGame.getState().harvestPlot(0);
    expect(useGame.getState().storage.x_vai).toBe(6);
  });

  it('gardenNight ghi lại ngày cây chín để tính mùa vụ', () => {
    const g: GardenState = { ...newGarden(), plots: [{ crop: 'vai', growth: 9.5, wateredDay: 160 }] };
    const { garden } = gardenNight(g, { day: 160, weather: 'sunny', fed: {} });
    expect(garden.plots[0].ripeDay).toBe(160);
    // chưa chín thì chưa ghi
    const young = gardenNight({ ...newGarden(), plots: [{ crop: 'vai', growth: 1, wateredDay: 160 }] }, { day: 160, weather: 'sunny', fed: {} });
    expect(young.garden.plots[0].ripeDay).toBeUndefined();
  });
});

describe('trang trại — công trình và dọn trại', () => {
  it('hệ tưới nhỏ giọt: tự tưới cả vườn qua đêm, khỏi tưới tay', () => {
    const g: GardenState = { ...newGarden(), buildings: { tuoi_tu_dong: 1 }, plots: [{ crop: 'rau_cai', growth: 0, wateredDay: 0 }] };
    const { garden, news } = gardenNight(g, { day: 2, weather: 'sunny', fed: {} });
    expect(garden.plots[0].wateredDay).toBe(2);
    expect(garden.plots[0].growth).toBe(1); // đủ nước lớn trọn ngày
    expect(news.some((n) => n.includes('tưới nhỏ giọt'))).toBe(true);
  });

  it('nhà lưới 1 sao: cây lớn thêm nửa ngày mỗi đêm (cộng thẳng, không còn % nhỏ xíu)', () => {
    const g: GardenState = { ...newGarden(), buildings: { nha_luoi: 1 }, plots: [{ crop: 'rau_cai', growth: 0, wateredDay: 2 }] };
    const { garden } = gardenNight(g, { day: 2, weather: 'sunny', fed: {} });
    expect(garden.plots[0].growth).toBeCloseTo(1.5, 5);
  });

  it('nhà lưới che giông bão: bão không còn sập luống; không có thì luống bị quét', () => {
    const g: GardenState = { ...newGarden(), buildings: { nha_luoi: 1 }, plots: [{ crop: 'rau_cai', growth: 1, wateredDay: 2 }] };
    const safe = gardenNight(g, { day: 2, weather: 'storm', fed: {}, rng: () => 0 });
    expect(safe.garden.plots[0].crop).toBe('rau_cai');
    expect(safe.news.some((n) => n.includes('nhà lưới che'))).toBe(true);
    const noNet = gardenNight({ ...newGarden(), plots: [{ crop: 'rau_cai', growth: 1, wateredDay: 2 }] }, { day: 2, weather: 'storm', fed: {}, rng: () => 0 });
    expect(noNet.garden.plots[0].crop).toBeNull();
  });

  it('bù nhìn: phụ trại thu hoạch có cơ hội gấp đôi', () => {
    const g: GardenState = { ...newGarden(), buildings: { bu_nhin: 1 }, plots: [{ crop: 'rau_cai', growth: 3, wateredDay: 5 }] };
    const done = farmhandChores(g, {}, 5, { crit: 0.5, rng: () => 0.1 }); // rng < crit → gấp đôi
    expect(done.picked).toContainEqual({ productId: 'rau', qty: 16 });
    const noCrit = farmhandChores(g, {}, 5, { crit: 0.5, rng: () => 0.9 });
    expect(noCrit.picked).toContainEqual({ productId: 'rau', qty: 8 });
  });

  it('mua + nâng sao công trình: tốn tiền, sao 2 trở lên cần gỗ đá; đủ 3 sao thì khoá', () => {
    seed({ level: 30, money: 100_000_000, garden: { ...newGarden(), wood: 20, stone: 20 } });
    useGame.getState().buyFarmBuilding('bu_nhin');
    expect(useGame.getState().garden.buildings.bu_nhin).toBe(1);
    useGame.getState().upgradeFarmBuilding('bu_nhin');
    expect(useGame.getState().garden.buildings.bu_nhin).toBe(2);
    useGame.getState().upgradeFarmBuilding('bu_nhin');
    expect(useGame.getState().garden.buildings.bu_nhin).toBe(3);
    const woodLeft = useGame.getState().garden.wood;
    useGame.getState().upgradeFarmBuilding('bu_nhin');
    expect(useGame.getState().garden.buildings.bu_nhin).toBe(3); // đã tối sao
    expect(useGame.getState().garden.wood).toBe(woodLeft);
  });

  it('nâng sao thiếu gỗ đá thì bị chặn', () => {
    seed({ level: 30, money: 100_000_000, garden: { ...newGarden(), wood: 0, stone: 0, buildings: { nha_luoi: 1 } } });
    useGame.getState().upgradeFarmBuilding('nha_luoi');
    expect(useGame.getState().garden.buildings.nha_luoi).toBe(1);
  });

  it('đêm mọc cỏ dại (bão rơi nhiều hơn), dọn trại nhặt gỗ đá', () => {
    let g = newGarden();
    g = gardenNight(g, { day: 1, weather: 'storm', fed: {}, rng: () => 0.9 }).garden; // bão +4 rác (rng 0,9 không sập luống trống)
    expect(g.debris).toBe(4);
    seed({ garden: { ...g } });
    useGame.getState().cleanupFarm();
    const s = useGame.getState();
    expect(s.garden.debris).toBe(0);
    expect(s.garden.stone).toBe(4); // mỗi đống chắc chắn ra 1 đá
    expect(s.garden.wood).toBeGreaterThanOrEqual(4); // mỗi đống 1 gỗ, nửa khả năng thêm 1 gỗ
    // Trại sạch thì dọn không có gì
    useGame.getState().cleanupFarm();
    expect(useGame.getState().garden.wood).toBe(s.garden.wood);
  });
});

describe('trang trại — phụ trại AI', () => {
  it('farmhandChores: tưới hết luống khô, đổ cám từ kho, gom trứng đủ vỉ và thu hoạch giùm', () => {
    const g: GardenState = {
      ...newGarden(),
      plots: [
        { crop: 'rau_cai', growth: 3, wateredDay: 5 }, // chín rồi → phụ trại thu giùm
        { crop: 'rau_cai', growth: 1, wateredDay: 4 }, // còn khô → tưới hộ
      ],
      pens: { chicken: { count: 3, fedDay: 4, feedKg: 0, pending: 15 } },
    };
    const storage = { cam_ga: 2 };
    const done = farmhandChores(g, storage, 5);
    expect(done.garden.plots[0].crop).toBeNull(); // luống chín được thu
    expect(done.garden.plots[1].wateredDay).toBe(5);
    expect(done.fedKinds).toContain('chicken');
    expect(done.feedUsed).toContainEqual({ productId: 'cam_ga', bags: 1 });
    // Luống chín được thu, trứng 15 quả gói 1 vỉ
    expect(done.picked).toContainEqual({ productId: 'rau', qty: 8 });
    expect(done.picked).toContainEqual({ productId: 'trung', qty: 1 });
    expect(done.garden.pens.chicken!.pending).toBe(5);
  });

  it('farmhandChores gom sữa dê như sữa bò, kho hết cám thì không tự mua lẻ', () => {
    const g = { ...newGarden(), pens: { goat: { count: 2, fedDay: 5, feedKg: 10, pending: 4 }, chicken: { count: 3, fedDay: 4, feedKg: 0, pending: 0 } } };
    const done = farmhandChores(g, {}, 5);
    expect(done.picked).toContainEqual({ productId: 'sua_de', qty: 4 });
    expect(done.fedKinds).not.toContain('chicken');
    expect(done.feedUsed).toHaveLength(0);
  });
});

describe('trang trại — đơn quán xóm', () => {
  it('makeFarmOrder luôn cho 2 món trong pool, hạn 2 ngày', () => {
    const o = makeFarmOrder(10, () => 0.5);
    expect(o.items).toHaveLength(2);
    expect(o.dueDay).toBe(12);
  });

  it('giao đơn: trừ kho lẫn nhãn nhà trồng, trả tiền theo giá bán ×1.25', () => {
    const order = makeFarmOrder(10, () => 0.5);
    seed({
      day: 11, money: 0,
      garden: { ...newGarden(), farmOrder: order, homegrown: Object.fromEntries(order.items.map((it) => [it.productId, it.qty])) },
      storage: Object.fromEntries(order.items.map((it) => [it.productId, it.qty])),
    });
    useGame.getState().deliverFarmOrder();
    const s = useGame.getState();
    expect(s.garden.farmOrder).toBeNull();
    const want = Math.round(order.items.reduce((n, it) => n + it.qty * productById(it.productId).sell, 0) * order.bonus);
    expect(s.money).toBe(want);
    // nhãn nhà trồng bị trừ đúng số giao
    for (const it of order.items) expect(s.garden.homegrown[it.productId] ?? 0).toBe(0);
  });

  it('thiếu hàng thì không giao được', () => {
    const order = makeFarmOrder(10, () => 0.5);
    seed({ day: 11, garden: { ...newGarden(), farmOrder: order }, storage: {} });
    useGame.getState().deliverFarmOrder();
    expect(useGame.getState().garden.farmOrder).not.toBeNull();
  });

  it('đơn quán chỉ nhận nông sản NHÀ TRỒNG — hàng mua lẻ về kho đủ cỡ mấy cũng không giao được', () => {
    const order = makeFarmOrder(10, () => 0.5);
    seed({
      day: 11, money: 0, garden: { ...newGarden(), farmOrder: order },
      storage: Object.fromEntries(order.items.map((it) => [it.productId, it.qty])),
    });
    useGame.getState().deliverFarmOrder();
    expect(useGame.getState().garden.farmOrder).not.toBeNull();
    expect(useGame.getState().money).toBe(0); // không có đồng nào "in" từ hàng mua lẻ
  });
});

describe('trang trại — bản lưu cũ chuyển chuồng gà sang hệ pens', () => {
  it('applySnapshot đổi garden.coop cũ thành pens.chicken, giữ số gà và trứng', () => {
    const base = newGameData();
    applySnapshot({ ...base, garden: { ...base.garden, coop: { chickens: 5, fedDay: 3, eggs: 12, feedKg: 0.4 } } as typeof base.garden } as Parameters<typeof applySnapshot>[0]);
    const pens = useGame.getState().garden.pens;
    expect(pens.chicken).toEqual({ count: 5, fedDay: 3, pending: 12, feedKg: 0.4 });
  });

  it('bản lưu cũ thiếu công trình/gỗ đá thì có mặc định, không mất vườn', () => {
    const base = newGameData();
    const old = { ...base.garden } as typeof base.garden;
    delete (old as Partial<typeof old>).buildings;
    applySnapshot({ ...base, garden: { ...old, plots: [{ crop: 'chuoi', growth: 4, wateredDay: 3 }] } } as Parameters<typeof applySnapshot>[0]);
    const g = useGame.getState().garden;
    expect(g.buildings).toEqual({});
    expect(g.wood).toBe(0);
    expect(g.stone).toBe(0);
    expect(g.debris).toBe(0);
    expect(g.plots[0].crop).toBe('chuoi');
  });
});

describe('trang trại — kinh tế 7 loài (đối chiếu giá thật)', () => {
  it('lợi nhuận mỗi con mỗi ngày tăng dần theo bậc: gà < vịt < ngỗng < heo < gà Đông Tảo < dê < bò', () => {
    const daily = (kind: 'chicken' | 'duck' | 'goose' | 'cow' | 'goat') => {
      const def = ANIMALS[kind];
      // Loài đẻ trứng: sản phẩm là VỈ 10 quả nên mỗi quả đáng sell/10; bò/dê tính theo lốc
      const perUnit = def.layChance ? productById(def.productId).sell / EGG_PER_TRAY : productById(def.productId).sell;
      const out = def.layChance ?? (def.outputPerDay ?? 0);
      const revenue = out * perUnit * 1.2; // thưởng hàng nhà nuôi
      const feedCost = def.feedKgPerDay * productById(def.feedProduct).buy / def.feedBagKg;
      return revenue - feedCost;
    };
    const fatten = (kind: 'pig' | 'dong_tao') => {
      const def = ANIMALS[kind];
      return (def.meatPerHead! * productById(def.productId).sell * 1.2 - def.fattenDays! * def.feedKgPerDay * productById(def.feedProduct).buy / def.feedBagKg - def.price) / def.fattenDays!;
    };
    expect(daily('chicken')).toBeGreaterThan(0);
    expect(daily('duck')).toBeGreaterThan(daily('chicken'));
    expect(daily('goose')).toBeGreaterThan(daily('duck'));
    expect(fatten('pig')).toBeGreaterThan(daily('goose'));
    expect(fatten('dong_tao')).toBeGreaterThan(fatten('pig'));
    expect(daily('goat')).toBeGreaterThan(fatten('dong_tao'));
    expect(daily('cow')).toBeGreaterThan(daily('goat'));
    expect(formatMoney(ANIMALS.cow.price)).toContain('3');
    // ANIMAL_ORDER dùng cho HUD/panel — đủ 7 loài
    expect(ANIMAL_ORDER).toHaveLength(7);
    expect(EGG_PER_TRAY).toBe(10);
  });
});
