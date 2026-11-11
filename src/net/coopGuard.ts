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
  buyExpansionTile: () => 'shop:tile',
  buyMaterialPack: () => 'ware:materials',
  paintZone: (a) => `zone:${a[0]}:${a[1]}`,
  setPrice: (a) => `price:${a[0]}`,
  // GĐ793 — đòi khách quen bị rival lôi kéo: cả hẻm dùng chung danh sách bị lôi kéo, hai người bấm cùng lúc
  // thì người sau được báo "đợi một chút" thay vì đòi trùng một người.
  rescuePoachedRegular: () => 'rival:poach',
  // GĐ Hệ2-L3 — Việc nhà trong hẻm: một việc một lúc (biz.lifeEvent chung), hai người bấm cùng lúc
  // thì người sau đợi một chút (SPEC §2.9: khoá chung 'lifeEvent').
  acceptLifeEvent: () => 'lifeEvent',
  declineLifeEvent: () => 'lifeEvent',
  deliverLifeEvent: () => 'lifeEvent',
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
  // Hệ 1 · Phơi · Muối · Ủ (SPEC §1.9): giàn phơi là một chỗ chung — mẻ mới/Gỡ/Đổi giàn/Mua bạt
  // cùng sửa giàn nên khoá chung "preserve:*" để hai người không đè nhau trong 3 giây.
  startPreserve: () => 'preserve:start',
  collectPreserve: (a) => `preserve:${a[0]}`,
  setRackCovered: () => 'preserve:rack',
  buyRackTarp: () => 'preserve:tarp',  // Quán nước đầu ngõ: cả cụm mua/tuyển/nghỉ/đổi giá là một chỗ chung "quan"
  buyQuanNuoc: () => 'quan',
  hireQuanNuoc: () => 'quan',
  buyTiemXoi: () => 'xoi', hireTiemXoi: () => 'xoi', fireTiemXoi: () => 'xoi', steamXoiHand: () => 'xoi', expandTiemXoi: () => 'xoi', openZone: (a) => `zone:${a[0]}`, rentSapLot: () => 'sap', cycleSapKind: () => 'sap', upgradeSapLot: () => 'sap', tendSapHand: () => 'sap',
  fireQuanNuoc: () => 'quan',
  setQuanNuocPrice: () => 'quan',
  toggleQuanRecipe: () => 'quan',
  brewQuanHand: () => 'quan',
  upgradeQuanTier: () => 'quan',
  // GĐ2219 — mua quảng cáo: một đợt quảng cáo dùng chung cho cả hẻm (ad.state), hai người mua cùng
  // lúc chỉ một người thành công (người sau đợi một chút rồi bấm lại).
  buyAd: () => 'shop:ad',
  // Hệ 8 — Biến cố dài (SPEC-CHIEU-RONG §8.6): làm việc chuẩn bị / chọn cảnh cùng sửa crisis state
  // dùng chung cho cả hẻm → khoá chung "crisis" để hai người không đè nhau trong đợt.
  doCrisisPrep: () => 'crisis',
  chooseCrisisScene: () => 'crisis',
  setCalmYears: () => 'crisis',
  // Hệ 3 — Biển định vị (SPEC §3.9): biển là của cả tiệm, treo/gỡ cùng sửa biz.stance chung → khoá 'stance'.
  chooseStance: () => 'stance',
  dropStance: () => 'stance',
  // Hệ 4 — Nhãn hàng riêng (SPEC §4.10): nhãn/xưởng dùng chung cả hẻm → khoá 'brand'.
  foundBrand: () => 'brand',
  addBrandLine: () => 'brand',
  dropBrandLine: () => 'brand',
  buyBrandWorkshop: () => 'brand',
  hireBrandWorker: () => 'brand',
  fireBrandWorker: () => 'brand',
  acceptBrandDeal: () => 'brand',
  commitBrandDeal: () => 'brand',
  releaseBrandDeal: () => 'brand',
  deliverBrandDeal: () => 'brand',
  acceptRivalSupply: () => 'brand',
  openFranchise: () => 'brand',
  closeFranchise: () => 'brand',
  // Hệ 7 — Trò khéo tay lễ (SPEC-CHIEU-RONG §7.7): mỗi trò là một chỗ thưởng chung trong ngày → khoá 'mini:<id>'.
  scoreFestivalMini: (a) => `mini:${a[0]}`,
  // Hệ 5 — Chuyến đi tỉnh (SPEC-CHIEU-RONG §5.10): một chuyến tại một thời điểm → khoá chung 'trip'.
  startTrip: () => 'trip',
  tripSetCart: () => 'trip',
  tripHaggle: () => 'trip',
  tripAcceptPrice: () => 'trip',
  tripChoose: () => 'trip',
  tripArrive: () => 'trip',
};
