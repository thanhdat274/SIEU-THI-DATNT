/**
 * Bộ save dựng sẵn cho QA. Web gắn `window.__seedQaSave(kind)` (chỉ DEV) ghi vào ô Chơi Thử (`local_save_demo`), không đụng ô thật.
 * Các bộ: 'snack' | 'fair' | 'complaints' | 'rain' — xem mục "CÔNG CỤ DỰNG SAVE QA" trong tổng hợp.md.
 */
import { isSalesFixture, type BuildingPlacementRecord, type CustomerReview, type SaveGameData } from '@game/shared';
import { ALL_PARCELS, DEFAULT_INITIAL_SAVE, PRODUCT_MAP, SNACK_PLOT_ID, generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions } from './store-layout';
import { createMarketState } from './market';
import { weatherOnDay } from './weather';
import { worldEventsForDay } from './world-events';

export const QA_SEED_KINDS = ['snack', 'fair', 'complaints', 'rain'] as const;
export type QaSeedKind = (typeof QA_SEED_KINDS)[number];

const SEED = 'qa-seed';
const MAIN_PRODUCTS = ['nuoc_suoi', 'mi_hao_hao', 'ca_phe_hoa_tan', 'ao_mua_bo', 'xa_phong', 'banh_quy'];
const SNACK_PRODUCTS = ['bap_xao_tp', 'ca_vien_chien_tp', 'banh_trang_tron_tp'];
const mapWith = (waves: readonly string[]) => (ids: readonly string[], placements?: readonly BuildingPlacementRecord[]) => generateStarterTileMap(ids, [], placements, waves);
const mapFor = mapWith(['w0']);

/** Bố cục chỉ đổi được khi tiệm đóng, nên dựng ở trạng thái đóng rồi mới đặt giờ thật bằng `at`. */
function base(day: number, level = 26): SaveGameData {
  const save: SaveGameData = { ...structuredClone(DEFAULT_INITIAL_SAVE), market: createMarketState(SEED, day) };
  save.player = { ...save.player, level, money: 10_000_000 };
  save.worldTime = { ...save.worldTime, day, hour: 6, minute: 0, isStoreOpen: false };
  save.statistics = { ...save.statistics, totalDaysPassed: day - 1 };
  return save;
}

function layout(save: SaveGameData, actions: Parameters<typeof applyStoreLayoutActions>[1]): SaveGameData {
  const result = applyStoreLayoutActions(save, actions, mapFor);
  if (!result.save) throw new Error(`QA seed: không dựng được bố cục (${JSON.stringify(result)})`);
  return result.save;
}

/** Kệ bán của tiệm chính + quán ăn vặt đầy hàng (giá vốn thật, không hết hạn). */
function fillShelves(save: SaveGameData): SaveGameData {
  let mainIndex = 0;
  let snackIndex = 0;
  const fixtures = save.storeLayout.fixtures.map(f => {
    if (!isSalesFixture(f) || f.id.startsWith('xoi_') || f.id.startsWith('drink_')) return f;
    const isSnack = f.id === 'snack_shelf' || f.id.startsWith('snack_shelf#');
    const productId = isSnack ? SNACK_PRODUCTS[snackIndex++ % SNACK_PRODUCTS.length] : MAIN_PRODUCTS[mainIndex++ % MAIN_PRODUCTS.length];
    const stockLots = [{ quantity: 14, expiresOnDay: 99999, unitCost: PRODUCT_MAP[productId]?.purchasePrice ?? 3_000, provenance: 'known' as const }];
    return { ...f, assignedProductId: productId, currentStock: 14, stockLots };
  });
  return { ...save, storeLayout: { ...save.storeLayout, fixtures } };
}

const at = (save: SaveGameData, hour: number, minute: number): SaveGameData =>
  ({ ...save, worldTime: { ...save.worldTime, hour, minute, isStoreOpen: hour >= 6 && hour < 22 } });

const findDay = (match: (day: number) => boolean) => {
  for (let day = 2; day < 400; day++) if (match(day)) return day;
  throw new Error('QA seed: không tìm được ngày phù hợp');
};

function snackSave(day = 5): SaveGameData {
  return fillShelves(layout(base(day), [{ type: 'buy_plot', plotId: SNACK_PLOT_ID }]));
}

function fairSave(): SaveGameData {
  const day = findDay(d => worldEventsForDay(SEED, d).events.some(e => e.kind === 'w4_fair'));
  const save = snackSave(day);
  const parcel = ALL_PARCELS.find(p => p.districtId === 'am_thuc_nam')!;
  // Lô W4 phải nằm trong vùng đã khai hoang và thuộc sở hữu thì mới đặt tòa được.
  const openedWaves = ['w0', 'w1', 'w2', 'w3', 'w4'];
  const owned = { ...save, world: { openedWaves, wavesUnderConstruction: {} }, storeLayout: { ...save.storeLayout, ownedParcelIds: [...(save.storeLayout.ownedParcelIds ?? []), parcel.id], parcelTenure: { ...save.storeLayout.parcelTenure, [parcel.id]: { kind: 'owned' as const, day } } } };
  for (let originX = parcel.rect.x0; originX <= parcel.rect.x1; originX++) {
    const moved = applyStoreLayoutActions(owned, [{ type: 'relocate_building', buildingId: 'snack', placement: { parcelId: parcel.id, originX } }], mapWith(openedWaves));
    if (!moved.save) continue;
    // Dời tòa để lại công trường tới hôm sau; QA cần quán mở ngay trong ngày hội chợ.
    const placements = moved.save.storeLayout.buildingPlacements?.map(({ constructionUntilDay: _, ...p }) => p);
    return at({ ...moved.save, storeLayout: { ...moved.save.storeLayout, buildingPlacements: placements } }, 10, 0);
  }
  throw new Error(`QA seed: không dời được quán ăn vặt sang lô ${parcel.id}`);
}

function complaintsSave(): SaveGameData {
  const save = at(fillShelves(base(5, 10)), 9, 0);
  const reviews: CustomerReview[] = [
    { id: 'qa-complaint-1', day: 3, hour: 10, minute: 15, stars: 1, author: 'Cô Hoa', text: 'Chờ tính tiền lâu quá.', reason: 'wait', reputationLost: 2 },
    { id: 'qa-complaint-2', day: 4, hour: 14, minute: 40, stars: 2, author: 'Anh Tuấn', text: 'Mì hết hàng mất rồi.', reason: 'out_of_stock', productId: 'mi_hao_hao', reputationLost: 2 },
    { id: 'qa-complaint-3', day: 5, hour: 8, minute: 30, stars: 1, author: 'Chị Mai', text: 'Nước suối bán đắt hơn chỗ khác.', reason: 'price', productId: 'nuoc_suoi', reputationLost: 1 },
  ];
  return { ...save, reviews };
}

function rainSave(): SaveGameData {
  // Tránh ngày trùng sự kiện thành phố (mất điện/hội chợ) để chỉ còn tác động của mưa.
  const day = findDay(d => weatherOnDay(SEED, d) === 'heavy_rain' && worldEventsForDay(SEED, d).events.length === 0);
  return at(fillShelves(base(day, 10)), 21, 30);
}

export function buildQaSave(kind: QaSeedKind): SaveGameData {
  const save = kind === 'snack' ? at(snackSave(), 15, 30) : kind === 'fair' ? fairSave() : kind === 'complaints' ? complaintsSave() : rainSave();
  const now = new Date().toISOString();
  return { ...save, createdAt: now, updatedAt: now };
}
