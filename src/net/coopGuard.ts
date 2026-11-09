/** Bảng khoá thao tác co-op (tách khỏi coop.ts, GĐ1000). */
/**
 * Thao tác sửa đúng một chỗ (ô kệ, món đồ, giá một món). Người khác vừa sửa chỗ đó trong GUARD_MS thì
 * từ chối, để hai người không đè lên nhau mà không biết. Trả về khoá của chỗ bị sửa.
 * (Xuất ra cho test phủ kín: mọi thao tác của store phải nằm trong bảng này hoặc là thuần cục bộ.)
 */
export const GUARDED: Record<string, (args: unknown[]) => string> = {
  stockTier: (a) => `tier:${a[0]}:${a[1]}`,
  unstockTier: (a) => `tier:${a[0]}:${a[1]}`,
  moveFurniture: (a) => `furn:${a[0]}`,
  moveMainCounter: () => 'counter',
  sellFurniture: (a) => `furn:${a[0]}`,
  stashFurniture: (a) => `furn:${a[0]}`,
  repairFurniture: (a) => `furn:${a[0]}`,
  paint: (a) => `style:${a[0]}`,
  paintZone: (a) => `zone:${a[0]}:${a[1]}`,
  setPrice: (a) => `price:${a[0]}`,
  // GĐ793 — đòi khách quen bị rival lôi kéo: cả hẻm dùng chung danh sách bị lôi kéo, hai người bấm cùng lúc
  // thì người sau được báo "đợi một chút" thay vì đòi trùng một người.
  rescuePoachedRegular: () => 'rival:poach',
  expandFarm: () => 'farm:land',
  feedPen: (a) => `pen:${a[0]}`,
  buyAnimal: (a) => `buyAnimal:${a[0]}`,
  sellFattened: (a) => `pen:${a[0]}`,
  collectPen: (a) => `pen:${a[0]}`,
  plantCrop: (a) => `plot:${a[0]}`,
  waterPlot: (a) => `plot:${a[0]}`,
  fertilizePlot: (a) => `plot:${a[0]}`,
  harvestPlot: (a) => `plot:${a[0]}`,
  waterGarden: () => 'farm:water',
  deliverFarmOrder: () => 'farm:order',
  cleanupFarm: () => 'farm:cleanup',
  buyFarmBuilding: (a) => `farm:building:${a[0]}`,
  upgradeFarmBuilding: (a) => `farm:building:${a[0]}`,
  // Quán nước đầu ngõ: cả cụm mua/tuyển/nghỉ/đổi giá là một chỗ chung "quan"
  buyQuanNuoc: () => 'quan',
  hireQuanNuoc: () => 'quan',
  buyTiemXoi: () => 'xoi', hireTiemXoi: () => 'xoi', fireTiemXoi: () => 'xoi', steamXoiHand: () => 'xoi', expandTiemXoi: () => 'xoi', openZone: (a) => `zone:${a[0]}`, rentSapLot: () => 'sap', cycleSapKind: () => 'sap', upgradeSapLot: () => 'sap', tendSapHand: () => 'sap',
  fireQuanNuoc: () => 'quan',
  setQuanNuocPrice: () => 'quan',
  toggleQuanRecipe: () => 'quan',
  brewQuanHand: () => 'quan',
  upgradeQuanTier: () => 'quan',
};
