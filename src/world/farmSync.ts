import { useGame, type GameState } from '../core/store';
import { ANIMAL_ORDER, type AnimalKind, type GardenState } from '../data/garden';
import { harvestPops, type FarmPop } from '../data/farmJuice';

/** Phần trang trại của world mà bộ đồng bộ cần (createFarm trả về). */
interface FarmView {
  rebuild(land: number): void;
  setBuildings(b: GameState['garden']['buildings']): void;
  setPlots(p: GameState['garden']['plots'], day: number): void;
  setAnimals(kind: AnimalKind, n: number): void;
}

/**
 * Trang trại: dựng hình theo bậc đất đang mở và đàn vật nuôi trong chuồng (đổi khi mua / mở rộng).
 * Chạy một lần ngay, rồi theo dõi store để dựng lại đúng phần đổi.
 * @param onPop GĐ1255 — juice thu hoạch trại: mỗi lần store đổi mà homegrown tăng (thu luống / lấy
 *        trứng / vắt sữa) thì gọi với bong bóng cần sinh tại luống/chuồng đó (farmJuice.harvestPops —
 *        thuần đọc, không đổi state, hẻm online máy khách cũng nhận state đồng bộ nên chạy giống nhau).
 */
export function installFarmSync(farm: FarmView, onPop?: (pop: FarmPop) => void) {
  const init = useGame.getState();
  farm.rebuild(init.garden.land);
  farm.setBuildings(init.garden.buildings);
  farm.setPlots(init.garden.plots, init.day);
  let lastFarmLand = init.garden.land;
  let lastPenCounts: Partial<Record<AnimalKind, number>> = {};
  let lastFarmBuildings = init.garden.buildings;
  let lastPlots = init.garden.plots;
  let lastFarmDay = init.day;
  let lastGarden: GardenState = init.garden;
  const syncFarmAnimals = (s: GameState) => {
    for (const kind of ANIMAL_ORDER) {
      const n = s.garden.pens[kind]?.count ?? 0;
      if (n !== lastPenCounts[kind]) {
        lastPenCounts[kind] = n;
        farm.setAnimals(kind, n);
      }
    }
  };
  syncFarmAnimals(init);
  useGame.subscribe((s) => {
    if (s.garden.land !== lastFarmLand) {
      lastFarmLand = s.garden.land;
      farm.rebuild(s.garden.land);
      farm.setPlots(s.garden.plots, s.day);
    }
    if (s.garden.buildings !== lastFarmBuildings) {
      lastFarmBuildings = s.garden.buildings;
      farm.setBuildings(s.garden.buildings);
    }
    // Cây trên luống đổi khi trồng/tưới/thu hoạch hoặc sang ngày (đổi màu đất tưới)
    if (s.garden.plots !== lastPlots || s.day !== lastFarmDay) {
      lastPlots = s.garden.plots;
      lastFarmDay = s.day;
      farm.setPlots(s.garden.plots, s.day);
    }
    syncFarmAnimals(s);
    // GĐ1255 — homegrown tăng (thu luống / lấy trứng / vắt sữa) → bong bóng tại luống/chuồng đó
    if (onPop && s.garden !== lastGarden) {
      for (const pop of harvestPops(lastGarden, s.garden)) onPop(pop);
      lastGarden = s.garden;
    }
  });
}
