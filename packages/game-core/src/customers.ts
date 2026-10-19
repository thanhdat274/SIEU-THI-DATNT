import {
  CustomerState,
  CheckoutResult,
  GameTileMap,
  isSalesFixture,
  StoreFixture,
  getFixtureDimensions,
  TILE_SIZE,
  Vector2D,
  InventoryItem,
  CustomerArrivalMode,
  PedestrianSignal,
  tileIndex,
  tileInMap,
} from '@game/shared';
import { BUILDING_MAP, BUILDING_TRAFFIC_SHARE, foodClusterMultiplier, PLAY_REGION, buildingAt, entranceOf, fixtureBuilding, inMainExpansionZone, STORE_BOUNDS, PRODUCT_MAP, effectiveShelfCapacity, RegularCustomerDefinition, STREET_PARKING_SPOTS, CAR_PARKING_SPOTS, STORE_FRONT_CROSSWALK, type BuildingId, DEFAULT_PLACEMENTS, buildingTypeOfInstance, isExtraInstanceId } from '@game/data';
import { arrivalModeWeights, pickArrivalMode } from './arrival-mode';
import { CollisionSystem } from './collision';
import { findPath, findPathToAny, GridPoint, tileCenter } from './pathfinding';
import { mergeLots, sumLots, takeLots } from './stock';
import { removeExpiredLots } from './spoilage';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';
import type { CustomerFeedbackReason } from './reputation';

/**
 * Vạch qua đường trước cửa tiệm chính cho KHÁCH THẬT đi bộ (OpenSpec `traffic-light-crosswalk-yielding` 4.5).
 * Khách đi bộ vào/rời tiệm băng qua đây, chờ đèn người đi bộ xanh (`walk`) rồi mới qua.
 */
const CROSSWALK = STORE_FRONT_CROSSWALK;
/** Trục x (px) khách đi bộ băng qua vạch — tâm dải vạch, trong phạm vi che cửa chính. */
const CROSSWALK_X = (CROSSWALK.x0 + CROSSWALK.x1) / 2; // 320
/** Điểm chờ phía bên kia đường (mép xa của vạch, đáy bản đồ); khách chờ ở đây khi đèn đi bộ chưa xanh. */
const CROSSWALK_FAR = { x: CROSSWALK_X, y: CROSSWALK.farY }; // (320, 512)
/** Điểm chờ phía cửa tiệm (mép gần của vạch); khách rời tiệm tới đây rồi chờ đèn để băng về phía xa. */
const CROSSWALK_NEAR = { x: CROSSWALK_X, y: CROSSWALK.nearY }; // (320, 416)
/** Ô đích (tile) khi khách tiếp cận mép xa: hàng 15 (đáy bản đồ, trong dải vạch nên đi được). */
const CROSSWALK_FAR_TILE = { x: Math.floor(CROSSWALK_X / TILE_SIZE), y: Math.floor((CROSSWALK.farY - 1) / TILE_SIZE) }; // (10, 15)
/** Ô đích (tile) khi khách tiếp cận mép gần: hàng 13 (đầu đường, trong dải vạch). */
const CROSSWALK_NEAR_TILE = { x: Math.floor(CROSSWALK_X / TILE_SIZE), y: Math.floor(CROSSWALK.nearY / TILE_SIZE) }; // (10, 13)
/** Hàng đường chính khách không tự đi qua được (chỉ băng trong dải vạch). */
const CROSSWALK_ROAD_Y0 = Math.floor(CROSSWALK.nearY / TILE_SIZE); // 13
const CROSSWALK_ROAD_Y1 = Math.floor((CROSSWALK.farY - 1) / TILE_SIZE); // 15
/** Dải cột (tile) của vạch: x trong [x0 tile, x1 tile) được phép qua. */
const CROSSWALK_TILE_X0 = Math.floor(CROSSWALK.x0 / TILE_SIZE); // 8
const CROSSWALK_TILE_X1 = Math.floor((CROSSWALK.x1 - 1) / TILE_SIZE) + 1; // 12
/** Tốc độ băng qua đường (px/s) của khách đi bộ khi đèn đi bộ xanh. */
const CROSSWALK_SPEED = 90;

/** Hàng chờ thu ngân cũ của tiệm chính: cột cửa trái, từ hai ô trong cửa ra tới ô cửa (vị trí mặc định: (9,8), (9,9), (9,10)).
 *  Tiệm chính cố định ở vị trí mặc định (`main_fixed` trong `placementsProblem`) nên tra tĩnh là đúng; tòa phụ đọc ô cửa từ bản đồ. */
const MAIN_DOOR = BUILDING_MAP.main.doorTiles[0];
export const CASHIER_QUEUE_TILES: GridPoint[] = [
  { x: MAIN_DOOR.x, y: MAIN_DOOR.y - 2 }, // Position 0: front of checkout counter
  { x: MAIN_DOOR.x, y: MAIN_DOOR.y - 1 }, // Position 1: behind pos 0
  { x: MAIN_DOOR.x, y: MAIN_DOOR.y },     // Position 2: behind pos 1
];

/** Ô vỉa hè trước cửa tiệm chính, suy từ vị trí đặt (mặc định (9,11)). */
export const ENTRANCE_TILE: GridPoint = { ...BUILDING_MAP.main.entranceTile };
/** Cột vỉa hè hai mép vùng chơi nơi khách đi bộ xuất hiện/rời đi (trong viền va chạm một ô). */
/** Mép đi bộ theo bản đồ hiện tại (vùng chơi lớn lên khi khai hoang); bản đồ 36×22 cho đúng 1 và 34 như cũ. */
const walkEdgeWest = (tileMap: GameTileMap): number => (tileMap.originTileX ?? PLAY_REGION.x0) + 1;
const walkEdgeEast = (tileMap: GameTileMap): number => (tileMap.originTileX ?? PLAY_REGION.x0) + tileMap.width - 2;

const QUEUE_LENGTH = CASHIER_QUEUE_TILES.length;
const tileKey = (x: number, y: number) => `${x},${y}`;

/**
 * Tòa có dòng khách không: tòa đã mua và đang mở cửa. Tòa đang thi công sau khi dời có `open: false`
 * (`layoutBuildings` đặt `open = !placement.constructionUntilDay`) nên không sinh khách cho tới sáng hôm sau (L3-C5).
 */
export const buildingSpawnsCustomers = (buildings: GameTileMap['buildings'], buildingId: BuildingId): boolean =>
  !buildings || buildings.some(building => building.id === buildingId && building.open);

/** Các quầy thu ngân đang đặt trên sàn, theo thứ tự ổn định (quầy gốc đứng trước). */
export const cashierCounters = (fixtures: readonly StoreFixture[]): StoreFixture[] =>
  fixtures.filter((fixture) => fixture.type === 'cashier_counter' && !fixture.parentId);

/**
 * Ô xếp hàng của từng quầy: ô đầu là ô đi được sát quầy (ưu tiên bên phải, dưới, trái, trên), các ô sau nối xuống dưới
 * (rồi lên trên). Quầy gốc ở vị trí mặc định cho đúng ba ô cũ (9,8) (9,9) (9,10). `taken` tránh trùng làn khác.
 */
export function queueTilesForCounter(counter: StoreFixture, tileMap: GameTileMap, fixtures: readonly StoreFixture[], taken: Set<string>): GridPoint[] {
  const ground = tileMap.layers.find((layer) => layer.name === 'ground')?.data ?? [];
  const blocked = new Set<string>();
  for (const fixture of fixtures) {
    if (fixture.parentId || fixture.type.startsWith('warehouse_')) continue;
    const { widthTiles, heightTiles } = getFixtureDimensions(fixture);
    for (let dx = 0; dx < widthTiles; dx++) for (let dy = 0; dy < heightTiles; dy++) blocked.add(tileKey(fixture.tileX + dx, fixture.tileY + dy));
  }
  const walkable = (x: number, y: number) => {
    const index = tileIndex(tileMap, x, y);
    return tileInMap(tileMap, x, y) && ground[index] === 3
      && !tileMap.collisionLayer[index] && !blocked.has(tileKey(x, y)) && !taken.has(tileKey(x, y));
  };
  const { widthTiles, heightTiles } = getFixtureDimensions(counter);
  const fronts: GridPoint[] = [
    { x: counter.tileX + widthTiles, y: counter.tileY }, { x: counter.tileX, y: counter.tileY + heightTiles },
    { x: counter.tileX - 1, y: counter.tileY }, { x: counter.tileX, y: counter.tileY - 1 },
  ];
  const front = fronts.find((tile) => walkable(tile.x, tile.y));
  if (!front) return [];
  const tiles = [front];
  for (const step of [1, -1]) {
    for (let y = front.y + step; tiles.length < QUEUE_LENGTH && walkable(front.x, y); y += step) tiles.push({ x: front.x, y });
  }
  return tiles;
}

/** Cách khách chọn món khi có thị trường: trọng số nhu cầu theo món và hệ số lưu lượng. */
export interface CustomerDemandChoice {
  traffic: number;
  maxConcurrentCustomers?: number;
  weightOf: (productId: string) => number;
}

/** Giá bán và mức chấp nhận giá khi khách lấy hàng; không có thì dùng giá gợi ý và luôn lấy. */
export interface CustomerPricing {
  priceOf: (productId: string) => number;
  keepChance: (productId: string) => number;
  onReject: (productId: string) => void;
  /** Xác suất lấy thêm 1 món cùng kệ (dân số xóm, civic-population-demand); thiếu hoặc 0 ⇒ luôn 1 món. */
  extraUnitChance?: number;
}

export interface CustomerMovementPath {
  customerId: string;
  waypoints: Vector2D[];
}

/**
 * Mối chéo mua hàng giữa các tòa: sau khi khách hoàn tất mua sắm tại một tòa,
 * họ có xác suất chuyển sang tòa khác trong cùng chuyến (cross-sell).
 * Tỷ lệ PROVISIONAL, deterministic theo seed dùng Mulberry32Rng + hashSeed.
 * Chỉ áp dụng khi tòa đích đang mở và còn hàng.
 */
export interface CrossSellRule {
  fromBuilding: string;
  toBuilding: string;
  /** Xác suất khách chuyển tòa sau khi mua xong (0–1). */
  chance: number;
  /** Sản phẩm tại tòa đích kích hoạt cross-sell (rỗng = mọi sản phẩm). */
  triggeringProductIds?: string[];
}

/**
 * Quy tắc chuyển tòa: khách mua ở tiệm chính rồi ghé quán ăn vặt (hoặc ngược lại)
 * trong cùng chuyến. Xác suất deterministic theo seed.
 */
export const CROSS_SELL_RULES: CrossSellRule[] = [
  // Tiệm chính → quán ăn vặt: 15% khách mua hàng tạp hóa sau ghé ăn vặt
  { fromBuilding: 'main', toBuilding: 'snack', chance: 0.15 },
  // Quán ăn vặt → tiệm chính: 10% khách ăn vặt sau mua thêm đồ tạp hóa
  { fromBuilding: 'snack', toBuilding: 'main', chance: 0.10 },
  // Tiệm chính → tiệm xôi: 8%
  { fromBuilding: 'main', toBuilding: 'xoi', chance: 0.08 },
  // Tiệm xôi → tiệm chính: 5%
  { fromBuilding: 'xoi', toBuilding: 'main', chance: 0.05 },
];

/** Kiểm tra hash tất định xem khách có nên chuyển tòa không */
export function shouldCrossSell(customerId: string, fromBuilding: string, toBuilding: string): boolean {
  const rule = CROSS_SELL_RULES.find(
    r => r.fromBuilding === fromBuilding && r.toBuilding === toBuilding
  );
  if (!rule) return false;

  // Dùng hashSeed + Mulberry32Rng giống các hệ deterministic khác trong game
  const seed = hashSeed(`${customerId}:${toBuilding}`);
  const rng = new Mulberry32Rng(seed);
  return rng.next() < rule.chance;
}

/**
 * Khung giờ bổ trợ: quán ăn vặt đông khách vào giờ tiệm chính vắng (chiều tối 14:00–16:00,
 * trước giờ tan học 16:00–18:00). Hệ số nhân nhịp sinh khách theo khung giờ.
 */
export const SNACK_SUPPLEMENTARY_HOURS: ReadonlyArray<{ fromHour: number; toHour: number; multiplier: number }> = [
  // Giờ tan học: Bé Na và bạn bè ghé quán ăn vặt
  { fromHour: 16, toHour: 18, multiplier: 1.5 },
  // Giờ chiều sớm: khách mua sắm ít, ghé quán ăn vặt
  { fromHour: 14, toHour: 16, multiplier: 1.3 },
];

/** Lấy hệ số khung giờ bổ trợ cho quán ăn vặt */
export function snackSupplementaryMultiplier(hour: number | undefined): number {
  if (hour === undefined) return 1;
  for (const slot of SNACK_SUPPLEMENTARY_HOURS) {
    if (hour >= slot.fromHour && hour < slot.toHour) {
      return slot.multiplier;
    }
  }
  return 1;
}

/** Nhân nhịp khách của tòa mở thêm trong khung giờ cao điểm của loại (PROVISIONAL). */
export const EXTRA_PEAK_MULTIPLIER = 1.5;
export function extraBuildingPeakMultiplier(peaks: ReadonlyArray<{ fromHour: number; toHour: number }> | undefined, hour: number | undefined): number {
  if (!peaks?.length || hour === undefined) return 1;
  return peaks.some(p => hour >= p.fromHour && hour < p.toHour) ? EXTRA_PEAK_MULTIPLIER : 1;
}

/** Bãi giữ xe đang mở (không thi công, không đóng vì nợ thuê): vị trí cửa + bán kính + mức tăng khách đi xe. */
export function openParkingLots(buildings: GameTileMap['buildings']): Array<{ id: string; x: number; y: number; radius: number; bonus: number }> {
  const lots: Array<{ id: string; x: number; y: number; radius: number; bonus: number }> = [];
  for (const b of buildings ?? []) {
    if (!b.open || !isExtraInstanceId(b.id)) continue;
    const def = buildingTypeOfInstance(b.id);
    if (def?.typeId !== 'parking_lot') continue;
    const entrance = entranceOf(b.id, buildings);
    lots.push({ id: b.id, x: entrance.x, y: entrance.y, radius: def.effects?.carRadiusTiles ?? 0, bonus: def.effects?.carCustomerBonus ?? 0 });
  }
  return lots;
}

/** Bãi xe phục vụ tòa `buildingId`: bãi gần nhất có cửa nằm trong bán kính; undefined nếu không có (bãi không tự phục vụ chính nó). */
export function parkingLotFor(buildingId: string, buildings: GameTileMap['buildings'], lots: ReturnType<typeof openParkingLots>): ReturnType<typeof openParkingLots>[number] | undefined {
  if (!buildings?.some(b => b.id === buildingId) || lots.some(l => l.id === buildingId)) return undefined;
  const target = entranceOf(buildingId, buildings);
  let best: ReturnType<typeof openParkingLots>[number] | undefined;
  let bestDist = Infinity;
  for (const lot of lots) {
    const dist = Math.hypot(target.x - lot.x, target.y - lot.y);
    if (dist <= lot.radius && dist < bestDist) { best = lot; bestDist = dist; }
  }
  return best;
}

/** Mức tăng khách của tòa nhờ bãi xe phục vụ nó (không cộng dồn nhiều bãi); 0 nếu không có. */
export function parkingBonusFor(buildingId: string, buildings: GameTileMap['buildings'], lots: ReturnType<typeof openParkingLots>): number {
  return parkingLotFor(buildingId, buildings, lots)?.bonus ?? 0;
}

/** Phí gửi xe mỗi lượt (PROVISIONAL, ₫): xe máy rẻ hơn ô tô. */
export const PARKING_FEE: Readonly<Record<'motorbike' | 'car', number>> = { motorbike: 3_000, car: 15_000 };

export class CustomerManager {
  private customers: CustomerState[] = [];
  /** Hệ số đi nhanh của khách ngoài trời khi mưa (đặt bởi mô phỏng mỗi nhịp); 1 = bình thường. */
  public outdoorSpeedMultiplier = 1;
  private paths = new Map<string, Vector2D[]>();
  private customerSequence = 0;
  private spawnCooldown = 5.5;
  /** Nhịp sinh khách của các tòa phụ (không lưu trong save; nạp lại thì bắt đầu từ 5,5 s). */
  private streamCooldowns = new Map<string, number>();
  private readonly maxConcurrentCustomers = 3;
  /** Pha đèn người đi bộ trước cửa tiệm, đặt mỗi khung trước `update` (để khách chờ/qua vạch đọc được). */
  private storeFrontPedestrian: PedestrianSignal | undefined;
  /** Giây còn lại của pha (từ `getStoreFrontSignal`), để chỉ băng đường khi còn đủ thời gian qua hết vạch. */
  private storeFrontPedestrianSecondsLeft: number | undefined;

  constructor(
    initialCustomers: CustomerState[] = [],
    customerSequence = 0,
    spawnCooldown = 5.5
  ) {
    this.customerSequence = customerSequence;
    this.spawnCooldown = spawnCooldown;
    this.importCustomers(initialCustomers);
  }

  /**
   * Danh sách khách thật, KHÔNG sao chép: chỉ để đọc trong lượt gọi (vòng vẽ mỗi khung, kiểm tra mỗi bước).
   * Không sửa và không giữ lại tham chiếu; cần dữ liệu lâu dài/được sửa thì dùng `getCustomers()`.
   */
  public peekCustomers(): readonly Readonly<CustomerState>[] {
    return this.customers;
  }

  public getCustomers(): CustomerState[] {
    return this.customers.map((c) => ({
      ...c,
      position: { ...c.position },
      basket: c.basket?.map((b) => ({ ...b, lots: b.lots ? [...b.lots] : [] })),
    }));
  }

  /** Hoàn giỏ cho khách thật trong danh sách nội bộ khi sang ngày. */
  public abandonAllBaskets(
    tileMap: GameTileMap,
    fixtures: StoreFixture[],
    inventory: InventoryItem[],
    onSpoiledGoods: (spoiledCount: number) => void,
    currentDay: number,
    shelfCapacityMultiplier = 1,
  ): void {
    for (const customer of this.customers) {
      // Khách đi bộ còn ở phía xa (chưa qua vạch vào tiệm) khi sang ngày: rời thẳng, không băng đường nữa.
      if (customer.stage === 'crosswalk' && !customer.crosswalk?.leaving) {
        this.removeCustomer(customer);
        continue;
      }
      this.abandonBasket(customer, fixtures, inventory, onSpoiledGoods, currentDay, shelfCapacityMultiplier);
      customer.cashierStaffId = undefined;
      customer.reservedProductId = undefined;
      this.routeCustomer(customer, 'leaving', tileMap, fixtures);
    }
  }

  /** Tính lại đường đi của khách thật (không phải bản sao) sau khi bản đồ hoặc đồ đạc đổi. */
  public rerouteAll(tileMap: GameTileMap, fixtures: StoreFixture[]): void {
    for (const customer of this.customers) {
      if (customer.stage !== 'checkout') {
        // Khách ở vạch đang chờ/băng không đi theo A*: giữ nguyên trạng thái (chỉ dựng lại đường khi đang tiếp cận).
        if (customer.stage === 'crosswalk' && customer.crosswalk?.phase !== 'approach') continue;
        this.routeCustomer(customer, customer.stage, tileMap, fixtures);
      }
    }
  }

  /** Khách luồng cũ (đặt 1 món) thanh toán xong: bỏ đặt chỗ và cho rời quầy, trên khách thật. */
  public leaveAfterLegacySale(checkoutId: string, tileMap: GameTileMap, fixtures: StoreFixture[], keepRoute = false): void {
    const customer = this.customers.find((item) => item.checkoutId === checkoutId);
    if (!customer) return;
    customer.reservedProductId = undefined;
    if (!keepRoute) this.routeCustomer(customer, 'leaving', tileMap, fixtures);
  }

  public assignCashier(checkoutId: string, staffId: string | undefined): boolean {
    const customer = this.customers.find((item) => item.checkoutId === checkoutId && item.stage === 'checkout');
    if (!customer) return false;
    customer.cashierStaffId = staffId;
    return true;
  }

  public getActiveCustomer(): CustomerState | null {
    // Returns customer currently at counter checkout, or head of queue
    const waiting = this.customers.find((c) => c.stage === 'checkout');
    if (waiting) return { ...waiting, position: { ...waiting.position } };
    return this.customers[0] ? { ...this.customers[0], position: { ...this.customers[0].position } } : null;
  }

  private setStreamCooldown(streamId: BuildingId, value: number): void {
    if (streamId === 'main') this.spawnCooldown = value;
    else this.streamCooldowns.set(streamId, value);
  }

  public getSpawnCooldown(): number {
    return this.spawnCooldown;
  }

  public getCustomerSequence(): number {
    return this.customerSequence;
  }

  /** Cập nhật pha đèn người đi bộ trước cửa tiệm (cho khách chờ/qua vạch); gọi mỗi frame trước `update`. */
  public setStoreFrontPedestrian(pedestrian: PedestrianSignal | undefined, secondsLeft?: number): void {
    this.storeFrontPedestrian = pedestrian;
    if (secondsLeft !== undefined) this.storeFrontPedestrianSecondsLeft = secondsLeft;
  }

  /**
   * Spawn a new customer if conditions allow. Mỗi tòa nhà có dòng khách riêng (nhịp sinh khách, trần đồng thời): tiệm chính
   * giữ nhịp cũ, tòa phụ (tiệm xôi, quán nước) sinh khách thêm theo `BUILDING_TRAFFIC_SHARE`; mỗi lần gọi sinh tối đa một khách.
   */
  public maybeSpawnCustomer(
    dt: number,
    isStoreOpen: boolean,
    fixtures: StoreFixture[],
    tileMap: GameTileMap,
    currentDay: number,
    customersServed: number,
    demand?: CustomerDemandChoice,
    regularCandidate?: RegularCustomerDefinition | null,
    rainIntensity = 0,
    hasBikeSecurity = false,
    arrivalContext?: { hour: number; weekday: number },
    parcelMultiplierFor?: (buildingId: BuildingId) => number,
    regularPreferredBuilding?: string | null
  ): CustomerState | null {
    if (!isStoreOpen) return null;
    // Cụm ẩm thực: càng nhiều tòa phụ đang mở thì các tòa phụ càng đông khách (tiệm chính giữ nhịp cũ).
    // D5 (open-world-land-reclamation): nhịp sinh khách mỗi tòa phụ ngoài share còn nhân hệ số khách của LÔ tòa đứng
    // (`parcelMultiplierFor`). Lô W0 mặt đường chính hệ số 1 → golden không đổi; khi tham số thiếu mặc định 1.
    const openSecondary = tileMap.buildings?.filter(building => building.id !== 'main' && building.open).length ?? 0;
    const cluster = foodClusterMultiplier(openSecondary);
    // Dòng khách mỗi tòa: tiệm chính = 1 (× sự kiện thành phố nếu caller truyền), tòa phụ = share × cụm × lô × khung giờ bổ trợ (riêng snack)
    const streams: Array<readonly [BuildingId, number]> = [['main', parcelMultiplierFor?.('main') ?? 1], ...BUILDING_TRAFFIC_SHARE.map(([id, share]) => {
      let factor = share * cluster * (parcelMultiplierFor?.(id) ?? 1);
      // Khung giờ bổ trợ: snack đông khách vào giờ chiều tối (tan học, trước giờ đóng tiệm)
      if (id === 'snack') {
        factor *= snackSupplementaryMultiplier(arrivalContext?.hour);
      }
      return [id, factor] as const;
    })];
    // Tòa mở thêm (chi nhánh, cà phê, quán cơm): nhịp = trafficShare của loại × giờ cao điểm × lô; bãi xe không có khách quầy.
    for (const building of tileMap.buildings ?? []) {
      if (!isExtraInstanceId(building.id)) continue;
      const def = buildingTypeOfInstance(building.id);
      if (!def || def.trafficShare <= 0) continue;
      streams.push([building.id, def.trafficShare * extraBuildingPeakMultiplier(def.effects?.peakHours, arrivalContext?.hour) * (parcelMultiplierFor?.(building.id) ?? 1)] as const);
    }
    // Bãi giữ xe đang mở: tòa có cửa trong bán kính nhận thêm khách đi xe.
    const lots = openParkingLots(tileMap.buildings);
    if (lots.length) {
      for (const stream of streams) {
        const bonus = parkingBonusFor(stream[0], tileMap.buildings, lots);
        if (bonus > 0) (stream as unknown as [BuildingId, number])[1] = stream[1] * (1 + bonus);
      }
    }
    // Nếu regular có preferredBuilding (Bé Na → snack), spawn ở đó trước, không ở main
    const firstStream = regularPreferredBuilding ? streams.find(s => s[0] === regularPreferredBuilding)?.[0] ?? 'main' : 'main';
    const orderedStreams = firstStream === 'main' ? streams : [streams.find(s => s[0] === firstStream)!, ...streams.filter(s => s[0] !== firstStream)];
    for (const [streamId, factor] of orderedStreams) {
      // Chỉ tòa đang có và không thi công mới sinh khách (tòa chưa mua/đang dời không có dòng khách).
      if (!buildingSpawnsCustomers(tileMap.buildings, streamId)) continue;
      // Regular chỉ spawn ở stream chính (hoặc preferredBuilding)
      const isMainStream = streamId === 'main';
      const isRegularStream = regularPreferredBuilding ? streamId === regularPreferredBuilding : isMainStream;
      const spawned = this.spawnForBuilding(streamId, factor, dt, fixtures, tileMap, currentDay, customersServed, demand, isRegularStream ? regularCandidate : null, rainIntensity, hasBikeSecurity, arrivalContext);
      if (spawned) return spawned;
    }
    return null;
  }

  private spawnForBuilding(
    streamId: BuildingId,
    factor: number,
    dt: number,
    fixtures: StoreFixture[],
    tileMap: GameTileMap,
    currentDay: number,
    customersServed: number,
    demand: CustomerDemandChoice | undefined,
    regularCandidate: RegularCustomerDefinition | null | undefined,
    rainIntensity: number,
    hasBikeSecurity: boolean,
    arrivalContext?: { hour: number; weekday: number }
  ): CustomerState | null {
    const cap = demand?.maxConcurrentCustomers ?? this.maxConcurrentCustomers;
    if (this.customers.filter((c) => (c.buildingId ?? 'main') === streamId).length >= cap) return null;

    const cooldown = (streamId === 'main' ? this.spawnCooldown : this.streamCooldowns.get(streamId) ?? 5.5) - dt;
    if (cooldown > 0) { this.setStreamCooldown(streamId, cooldown); return null; }
    // Match the reference game's ~5.5s baseline while keeping high traffic
    // readable and preventing a very high level multiplier from flooding the shop.
    // Tòa phụ: cùng công thức rồi chia cho `factor` (cả trần 1 s), để nhịp sinh khách tỉ lệ đúng với tiệm chính kể cả khi lưu lượng đã chạm trần.
    this.setStreamCooldown(streamId, Math.max(1, 5.5 / Math.max(0.25, demand?.traffic ?? 1)) / factor);

    const stockedShelves = fixtures.filter(
      (f) => isSalesFixture(f) && !f.broken && f.currentStock > 0 && f.assignedProductId && (fixtureBuilding(f, tileMap.buildings) ?? 'main') === streamId
    );
    if (!stockedShelves.length) return null;

    // Ưu tiên kệ có món ưa thích nếu là khách quen
    let target: StoreFixture;
    if (regularCandidate) {
      const favShelves = stockedShelves.filter((s) => regularCandidate.favoriteProductIds.includes(s.assignedProductId!));
      target = favShelves.length > 0 ? favShelves[0] : (demand ? this.pickShelfByDemand(stockedShelves, demand.weightOf, currentDay) : stockedShelves[0]);
    } else if (demand) {
      target = this.pickShelfByDemand(stockedShelves, demand.weightOf, currentDay);
    } else {
      target = stockedShelves[customersServed % stockedShelves.length];
    }
    this.customerSequence += 1;
    const customerId = `cust-${currentDay}-${this.customerSequence}`;
    const checkoutId = `checkout-${currentDay}-${this.customerSequence}`;

    // Khách vào đúng tòa nhà của kệ mục tiêu (kệ trong tiệm xôi thì vào cửa tiệm xôi); xe đỗ ở chỗ gần cửa tòa đó.
    const buildingId = fixtureBuilding(target, tileMap.buildings) ?? 'main';
    // Xác định typeId: DEFAULT_PLACEMENTS (4 tòa gốc) → fallback buildingTypeOfInstance (tòa mở thêm).
    const defaultPlacement = DEFAULT_PLACEMENTS.find(p => p.buildingId === buildingId);
    const typeId = defaultPlacement?.typeId ?? buildingTypeOfInstance(buildingId)?.typeId;

    // Xác định phương thức ghé tiệm (arrivalMode)
    let arrivalMode: CustomerArrivalMode = 'walk';
    let vehicleSpot: Vector2D | undefined;
    let vehicleVariant: number | undefined;

    const occupiedSpots = new Set(
      this.customers
        .filter((c) => c.vehicleSpot)
        .map((c) => `${Math.round(c.vehicleSpot!.x)},${Math.round(c.vehicleSpot!.y)}`)
    );
    const isFree = (s: Vector2D) => !occupiedSpots.has(`${Math.round(s.x)},${Math.round(s.y)}`);
    const entrance = entranceOf(buildingId, tileMap.buildings);
    const distanceToDoor = (s: Vector2D) => Math.abs(s.x / TILE_SIZE - (entrance.x + 0.5));
    // Chỉ chỗ đỗ trong vòng 15 ô tới cửa tòa; tiệm chính giữ cách chọn cũ (xoay vòng), tòa phụ chọn chỗ gần cửa nhất.
    const nearDoor = (spots: ReadonlyArray<Vector2D>) => spots.filter(isFree).filter(s => distanceToDoor(s) <= 15).sort((a, b) => typeId === 'grocery_main' ? 0 : distanceToDoor(a) - distanceToDoor(b));
    const availableSpots = nearDoor(STREET_PARKING_SPOTS);
    const availableCarSpots = nearDoor(CAR_PARKING_SPOTS);

    const rng = new Mulberry32Rng(daySeed(this.customerSequence * 77 + currentDay, currentDay));
    const roll = rng.next();

    if (regularCandidate) {
      if (regularCandidate.id === 'regular-chuba') {
        arrivalMode = 'motorbike';
      } else if (regularCandidate.id === 'regular-chilan') {
        arrivalMode = roll < 0.7 ? 'motorbike' : 'walk';
      } else if (regularCandidate.id === 'regular-anhtuan') {
        arrivalMode = roll < 0.5 ? 'motorbike' : roll < 0.75 ? 'car' : 'walk';
      } else {
        arrivalMode = 'walk';
      }
    } else {
      arrivalMode = pickArrivalMode(
        arrivalModeWeights({
          hour: arrivalContext?.hour,
          weekday: arrivalContext?.weekday,
          rainIntensity,
          freeMotorbikeSpot: availableSpots.length > 0,
          freeCarSpot: availableCarSpots.length > 0,
        }),
        roll
      );
    }

    if (arrivalMode === 'motorbike') {
      if (availableSpots.length > 0) {
        vehicleSpot = availableSpots[typeId === 'grocery_main' ? this.customerSequence % availableSpots.length : 0];
        vehicleVariant = this.customerSequence % 3;
      } else {
        arrivalMode = 'walk';
      }
    } else if (arrivalMode === 'car') {
      if (availableCarSpots.length > 0) {
        vehicleSpot = availableCarSpots[typeId === 'grocery_main' ? this.customerSequence % availableCarSpots.length : 0];
        vehicleVariant = this.customerSequence % 3;
      } else {
        arrivalMode = 'walk';
      }
    }

    // Khách đi bộ xuất hiện ở mép bản đồ trên vỉa hè (hàng y = 12, cùng lối họ rời đi) rồi đi dọc vỉa hè tới cửa,
    // không hiện ra ngay trước cửa. Chọn bên theo số thứ tự khách; nếu bên đó quá xa cửa (> 16 ô) thì dùng bên gần hơn.
    let startPos: Vector2D;
    if (vehicleSpot) {
      startPos = { ...vehicleSpot };
    } else if (arrivalMode === 'walk') {
      // Khách đi bộ sinh phía bên kia đường, ngay mép xa của vạch trước cửa (chờ đèn rồi mới qua).
      startPos = { ...CROSSWALK_FAR };
    } else {
      const doorTileX = entrance.x;
      const leftX = walkEdgeWest(tileMap);
      const rightX = walkEdgeEast(tileMap);
      let fromLeft = this.customerSequence % 2 === 0;
      if (Math.abs((fromLeft ? leftX : rightX) - doorTileX) > 16) fromLeft = Math.abs(leftX - doorTileX) <= Math.abs(rightX - doorTileX);
      startPos = tileCenter({ x: fromLeft ? leftX : rightX, y: 12 });
    }

    const newCustomer: CustomerState = {
      id: customerId,
      position: startPos,
      stage: 'to_shelf',
      targetFixtureId: target.id,
      checkoutId,
      reservedProductId: target.assignedProductId,
      buildingId,
      basket: [],
      patience: (regularCandidate ? regularCandidate.patienceSeconds : 45) + (hasBikeSecurity && arrivalMode === 'motorbike' ? 15 : 0),
      checkoutWait: 2.5,
      regularId: regularCandidate?.id,
      regularName: regularCandidate?.name,
      arrivalMode,
      vehicleSpot,
      vehicleVariant,
      lookSeed: this.customerSequence,
    };

    this.customers.push(newCustomer);
    if (arrivalMode === 'walk') {
      // Khách đi bộ: vào tiệm qua vạch — chờ đèn rồi băng đường tới cửa, sau đó mới tới kệ như thường.
      newCustomer.stage = 'crosswalk';
      newCustomer.crosswalk = { leaving: false, phase: 'wait' };
      this.paths.delete(newCustomer.id ?? newCustomer.checkoutId ?? 'default');
    } else {
      this.routeCustomer(newCustomer, 'to_shelf', tileMap, fixtures);
    }
    return newCustomer;
  }

  private pickShelfByDemand(shelves: StoreFixture[], weightOf: (productId: string) => number, currentDay: number): StoreFixture {
    const weights = shelves.map(shelf => Math.max(0.001, weightOf(shelf.assignedProductId!)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = new Mulberry32Rng(daySeed(this.customerSequence, currentDay)).next() * total;
    for (let i = 0; i < shelves.length; i++) {
      roll -= weights[i];
      if (roll < 0) return shelves[i];
    }
    return shelves[shelves.length - 1];
  }

  /**
   * Calculate path for a customer depending on target stage
   */
  public routeCustomer(
    customer: CustomerState,
    stage: CustomerState['stage'],
    tileMap: GameTileMap,
    fixtures: StoreFixture[],
    queueIndex = 0
  ): void {
    customer.stage = stage;
    const start: GridPoint = {
      x: Math.floor(customer.position.x / TILE_SIZE),
      y: Math.floor(customer.position.y / TILE_SIZE),
    };
    const goals: GridPoint[] = [];

    if (stage === 'to_shelf') {
      const fixture = fixtures.find((f) => f.id === customer.targetFixtureId);
      if (fixture) {
        const dimensions = getFixtureDimensions(fixture);
        for (let x = fixture.tileX; x < fixture.tileX + dimensions.widthTiles; x++) {
          goals.push({ x, y: fixture.tileY - 1 }, { x, y: fixture.tileY + dimensions.heightTiles });
        }
        for (let y = fixture.tileY; y < fixture.tileY + dimensions.heightTiles; y++) {
          goals.push({ x: fixture.tileX - 1, y }, { x: fixture.tileX + dimensions.widthTiles, y });
        }
      }
    } else if (stage === 'to_table') {
      const fixture = fixtures.find(f => f.id === customer.diningTableId && f.type === 'dining_table');
      if (fixture) {
        const dimensions = getFixtureDimensions(fixture);
        for (let x = fixture.tileX; x < fixture.tileX + dimensions.widthTiles; x++) goals.push({ x, y: fixture.tileY - 1 }, { x, y: fixture.tileY + dimensions.heightTiles });
        for (let y = fixture.tileY; y < fixture.tileY + dimensions.heightTiles; y++) goals.push({ x: fixture.tileX - 1, y }, { x: fixture.tileX + dimensions.widthTiles, y });
      }
    } else if (stage === 'to_checkout' || stage === 'checkout') {
      // Chỉ dùng quầy thu ngân của đúng tòa nhà khách đang ở.
      const home = customer.buildingId ?? 'main';
      const counters = cashierCounters(fixtures).filter((counter) => (fixtureBuilding(counter, tileMap.buildings) ?? 'main') === home);
      const lanes = this.laneTiles(counters, tileMap, fixtures);
      if (counters.length && lanes.size) {
        if (!customer.cashierFixtureId || !lanes.has(customer.cashierFixtureId)) customer.cashierFixtureId = this.leastBusyCounter(counters, lanes, customer);
        const tiles = lanes.get(customer.cashierFixtureId)!;
        goals.push(tiles[Math.min(this.getQueueIndex(customer), tiles.length - 1)]);
      } else {
        customer.cashierFixtureId = undefined;
        // Ô xếp hàng mặc định chỉ có ở tiệm chính; tòa khác không có quầy thì khách bỏ về (không có đích).
        if (home === 'main') goals.push(CASHIER_QUEUE_TILES[Math.min(queueIndex, CASHIER_QUEUE_TILES.length - 1)]);
      }
    } else if (stage === 'leaving') {
      if (customer.vehicleSpot) {
        goals.push({
          x: Math.floor(customer.vehicleSpot.x / TILE_SIZE),
          y: Math.floor(customer.vehicleSpot.y / TILE_SIZE),
        });
      } else if (customer.arrivalMode === 'walk') {
        // Khách đi bộ rời tiệm qua vạch: tới mép gần, chờ đèn rồi băng sang phía xa để biến mất.
        return this.beginCrosswalkLeave(customer, tileMap, fixtures);
      } else {
        const exitX = (customer.id ? customer.id.charCodeAt(customer.id.length - 1) : 0) % 2 === 0 ? walkEdgeWest(tileMap) : walkEdgeEast(tileMap);
        goals.push({ x: exitX, y: 12 });
      }
    } else if (stage === 'crosswalk') {
      // Khách đi bộ ở vạch (sau load/save hoặc yêu cầu reroute): dựng lại đường tiếp cận đúng mép vạch.
      const leaving = customer.crosswalk?.leaving ?? false;
      customer.crosswalk = { leaving, phase: 'approach' };
      goals.push(leaving ? CROSSWALK_NEAR_TILE : CROSSWALK_FAR_TILE);
    }

    // Khách không vào kho/phía sau tiệm chính (hàng y <= STORE_BOUNDS.top), trừ phần mở rộng phía bắc của tòa phụ (sàn tòa mở)
    // và ô sàn tiệm chính đã mở rộng lên phía bắc (ground 3, ngoài nhà kho).
    const groundLayer = tileMap.layers.find(layer => layer.name === 'ground')?.data;
    const customerMap = {
      ...tileMap,
      collisionLayer: tileMap.collisionLayer.map((solid, i) => {
        const x = (i % tileMap.width) + (tileMap.originTileX ?? 0);
        const y = Math.floor(i / tileMap.width) + (tileMap.originTileY ?? 0);
        // Lòng đường chính (hàng 13–15) ép khách chỉ băng qua trong dải vạch trước cửa: ngoài dải thì chặn,
        // trong dải (kể cả hàng 15 vốn là viền bản đồ) thì cho đi để khách qua đường đúng chỗ này.
        if (y >= CROSSWALK_ROAD_Y0 && y <= CROSSWALK_ROAD_Y1) {
          if (x >= CROSSWALK_TILE_X0 && x < CROSSWALK_TILE_X1) return false;
          return true;
        }
        if (solid || y > STORE_BOUNDS.top) return solid;
        if (groundLayer?.[i] === 3 && inMainExpansionZone(x, y)) return false;
        const building = buildingAt(x, y, tileMap.buildings);
        return !building || building === 'main'; // cửa kho nằm ở hàng tường sau tiệm chính nên vẫn chặn
      }),
    };
    const customerCollision = new CollisionSystem(customerMap, fixtures);
    // Một lần A* tới ô đích gần nhất (trước đây chạy A* riêng cho từng ô quanh kệ rồi chọn đường ngắn nhất: gai 40–50 ms mỗi lần định tuyến).
    const nearest = findPathToAny(customerMap, customerCollision, start, goals);
    const paths = nearest.length ? [nearest] : [];

    let chosenPath: GridPoint[] | undefined = paths[0];
    if (!chosenPath && stage === 'leaving' && customer.vehicleSpot) {
      // Ô chỗ đỗ bị chặn (vd. đặt quầy/đồ đè lên): tới ô đi được sát xe nhất, vòng 1 rồi vòng 2 quanh chỗ đỗ; tới nơi thì xe chạy đi như thường.
      const spot = goals[0];
      for (let radius = 1; radius <= 2 && !chosenPath; radius++) {
        const ring: GridPoint[] = [];
        for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) === radius) ring.push({ x: spot.x + dx, y: spot.y + dy });
        }
        const near = findPathToAny(customerMap, customerCollision, start, ring);
        if (near.length) chosenPath = near;
      }
    }
    if (!chosenPath && stage === 'leaving') {
      // Không có đường ra mép/tới xe: đi tới cửa tòa nhà rồi mới rời (xe, nếu có, chạy đi từ chỗ đỗ qua onCustomerDepart).
      const door = findPath(customerMap, customerCollision, start, entranceOf((customer.buildingId as BuildingId | undefined) ?? 'main', tileMap.buildings) ?? ENTRANCE_TILE);
      if (door.length) chosenPath = door;
    }
    const waypoints = chosenPath?.map(tileCenter).slice(1) ?? [];
    this.paths.set(customer.id ?? customer.checkoutId ?? 'default', waypoints);

    // Khách đang rời đi mà mép bản đồ bị chặn vẫn đi theo đường dự phòng tới cửa tòa nhà rồi mới rời (trước đây kiểm
    // `paths` nên đường dự phòng bị bỏ và khách biến mất ngay tại chỗ). Chỉ xóa tại chỗ khi cả đường dự phòng cũng không có.
    const routed = stage === 'leaving' ? !!chosenPath?.length : paths.length > 0;
    // Khách ở vạch được bỏ qua bước "unreachable": khách vào tiệm đã đứng sẵn mép xa (đường rỗng là bình thường),
    // khách rời tiệm tới mép gần luôn đi được; không rơi vào vòng lặp abandon → leaving → crosswalk.
    if (!routed && stage !== 'checkout' && stage !== 'crosswalk') {
      // Unreachable goal, leave
      if (stage !== 'leaving') {
        this.abandonBasket(customer, fixtures, [], () => {});
        this.routeCustomer(customer, 'leaving', tileMap, fixtures);
      } else {
        this.removeCustomer(customer);
      }
    }
  }

  /**
   * Bắt đầu cho khách đi bộ rời tiệm qua vạch: đặt stage 'crosswalk' hướng rời (leaving=true) rồi tiếp cận mép gần,
   * chờ đèn đi bộ rồi băng về phía xa để biến mất. Không dựng đường tới mép bản đồ như khách đi xe.
   */
  private beginCrosswalkLeave(customer: CustomerState, tileMap: GameTileMap, fixtures: StoreFixture[]): void {
    customer.crosswalk = { leaving: true, phase: 'approach' };
    this.routeCustomer(customer, 'crosswalk', tileMap, fixtures);
  }

  /** Khách đi bộ chỉ băng qua vạch khi đèn đi bộ xanh (hoặc chưa nối đèn) và còn đủ thời gian để đi hết chiều rộng đường. */
  private canCrossCrosswalk(): boolean {
    if (this.storeFrontPedestrian === 'dont_walk' || this.storeFrontPedestrian === 'clearing') return false;
    // 'walk' hoặc undefined (manager chưa nối đèn — test/bối cảnh không có tín hiệu): cho qua.
    const remaining = this.storeFrontPedestrianSecondsLeft;
    if (remaining === undefined) return true; // không có thông tin pha thì mặc định được qua
    // Pha walk còn lại (phút game) phải đủ để đi hết bề rộng đường (px) với tốc độ đi bộ.
    return remaining >= (CROSSWALK.farY - CROSSWALK.nearY) / CROSSWALK_SPEED;
  }

  /**
   * Xử lý cross-sell khi khách đi bộ đến mép gần vạch (đang rời tiệm): nếu tòa đích mở + còn hàng thì chuyển sang
   * tòa đó (đi bộ tới kệ, không teleport); nếu không chuyển được thì xóa pending và tiếp tục rời qua vạch. Trả true nếu đã chuyển.
   */
  private tryCrossSellTransfer(customer: CustomerState, tileMap: GameTileMap, fixtures: StoreFixture[]): boolean {
    const target = customer.pendingCrossSellTo;
    if (!target) return false;
    const targetBld = tileMap.buildings?.find(b => b.id === target);
    const targetOpen = targetBld?.open === true;
    const targetHasStock = fixtures.some(f => isSalesFixture(f) && fixtureBuilding(f) === target && f.currentStock > 0);
    delete customer.pendingCrossSellTo;
    if (targetOpen && targetHasStock) {
      const targetShelf = fixtures.find(f => isSalesFixture(f) && fixtureBuilding(f) === target);
      if (targetShelf) {
        customer.buildingId = target;
        customer.targetFixtureId = targetShelf.id;
        customer.crosswalk = undefined;
        customer.stage = 'to_shelf';
        this.routeCustomer(customer, 'to_shelf', tileMap, fixtures);
        return true;
      }
    }
    return false;
  }

  /**
   * Update all customers positions, shelf pickups, patience, and queue transitions
   */
  public update(
    dt: number,
    isStoreOpen: boolean,
    currentDay: number,
    tileMap: GameTileMap,
    fixtures: StoreFixture[],
    inventory: InventoryItem[],
    onReputationLoss?: (delta: number) => void,
    onSpoiledGoods?: (spoiledCount: number) => void,
    onOutOfStock?: () => void,
    pricing?: CustomerPricing,
    onExpiredOnShelf?: (productId: string, quantity: number, cost: number) => void,
    onWalkout?: (customer: CustomerState, reason: CustomerFeedbackReason) => void,
    shelfCapacityMultiplier = 1,
    onCustomerDepart?: (customer: CustomerState) => void,
    onDiningComplete?: (customer: CustomerState) => void,
    onDinerSeated?: (customer: CustomerState) => void
  ): void {
    const customerList = [...this.customers];
    for (const customer of customerList) {
      if (!this.customers.includes(customer)) continue;
      const key = customer.id ?? customer.checkoutId ?? 'default';

      // 1. Patience check (before checkout) — khách ở vạch chờ đèn không bị trừ kiên nhẫn (sẽ xử lý riêng dưới).
      if (customer.stage !== 'leaving' && customer.stage !== 'eating' && customer.stage !== 'crosswalk') {
        customer.patience -= dt;
        if (customer.patience <= 0 || !isStoreOpen) {
          onReputationLoss?.(1);
          onWalkout?.(customer, isStoreOpen ? 'wait' : 'store_closed');
          this.abandonBasket(customer, fixtures, inventory, onSpoiledGoods, currentDay, shelfCapacityMultiplier);
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
          continue;
        }
      }

      if (customer.stage === 'eating') {
        customer.diningTimeLeft = (customer.diningTimeLeft ?? 60) - dt;
        if (customer.diningTimeLeft <= 0) {
          onDiningComplete?.(customer);
          customer.diningTableId = undefined;
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
        }
        continue;
      }

      // 2. Checkout wait timer
      if (customer.stage === 'checkout') {
        customer.checkoutWait -= dt;
        // Wait expires: auto checkout if applicable, or leave if not served
        if (customer.checkoutWait <= 0) {
          // Handled externally or triggers auto checkout
        }
        continue;
      }

      // 2.5 Khách đi bộ ở vạch qua đường: tiếp cận mép vạch, chờ đèn, băng qua. Không chạy pathfinding mỗi khung — chỉ đọc pha đèn đã cache.
      if (customer.stage === 'crosswalk') {
        const cw = customer.crosswalk;
        if (!cw) {
          // Save cũ thiếu trạng thái vạch: phục hồi an toàn theo hướng đang di chuyển.
          this.routeCustomer(customer, 'crosswalk', tileMap, fixtures);
          continue;
        }
        // Tiệm đóng mà khách còn ở phía xa (chưa vào tiệm): rời thẳng trên phía xa.
        if (!isStoreOpen && !cw.leaving) {
          this.removeCustomer(customer);
          continue;
        }
        if (cw.phase === 'approach') {
          const waypoints = this.paths.get(key);
          if (waypoints && waypoints.length > 0) {
            const next = waypoints[0];
            const dx = next.x - customer.position.x;
            const dy = next.y - customer.position.y;
            const distance = Math.hypot(dx, dy);
            const step = 72 * dt;
            if (distance <= step) {
              customer.position = { ...next };
              waypoints.shift();
            } else {
              customer.position = { x: customer.position.x + (dx / distance) * step, y: customer.position.y + (dy / distance) * step };
            }
            continue;
          }
          // Đã tới mép vạch: nếu đang rời tiệm thì xử lý cross-sell trước khi chờ đèn.
          if (cw.leaving && this.tryCrossSellTransfer(customer, tileMap, fixtures)) continue;
          cw.phase = 'wait';
          continue;
        }
        if (cw.phase === 'wait') {
          // O(1): chỉ đọc pha đèn đã cache, không pathfinding.
          if (!this.canCrossCrosswalk()) continue;
          cw.phase = 'cross';
          continue;
        }
        // phase 'cross': băng qua đường theo chiều dọc trong dải vạch.
        const targetY = cw.leaving ? CROSSWALK.farY : CROSSWALK.nearY;
        const stepCross = CROSSWALK_SPEED * dt;
        if (cw.leaving) {
          customer.position.y = Math.min(targetY, customer.position.y + stepCross);
          if (customer.position.y >= targetY) {
            // Đã băng sang phía xa: biến mất trên phía bên kia đường.
            onCustomerDepart?.(customer);
            this.removeCustomer(customer);
          }
        } else {
          customer.position.y = Math.max(targetY, customer.position.y - stepCross);
          if (customer.position.y <= targetY) {
            // Đã tới mép gần (cửa tiệm): vào tiệm tới kệ như thường.
            customer.crosswalk = undefined;
            this.routeCustomer(customer, 'to_shelf', tileMap, fixtures);
          }
        }
        continue;
      }

      // 3. Follow waypoints
      const waypoints = this.paths.get(key);
      if (waypoints && waypoints.length > 0) {
        const next = waypoints[0];
        const dx = next.x - customer.position.x;
        const dy = next.y - customer.position.y;
        const distance = Math.hypot(dx, dy);
        // Mưa to thì khách ngoài trời đi nhanh hơn một chút (trong tiệm giữ nguyên).
        const step = 72 * dt * (customer.position.y >= (STORE_BOUNDS.bottom + 1) * TILE_SIZE ? this.outdoorSpeedMultiplier : 1);

        if (distance <= step) {
          customer.position = { ...next };
          waypoints.shift();
        } else {
          customer.position = {
            x: customer.position.x + (dx / distance) * step,
            y: customer.position.y + (dy / distance) * step,
          };
        }
        continue;
      }

      // 4. Arrived at goal
      if (customer.stage === 'to_shelf') {
        // Attempt pickup from target shelf
        const shelf = fixtures.find((f) => f.id === customer.targetFixtureId);
        const prodId = shelf?.assignedProductId;
        const prod = prodId ? PRODUCT_MAP[prodId] : undefined;

        // Hàng quá hạn còn trên kệ: khách nhìn thấy nên hủy, không bán và mất uy tín
        if (shelf && isSalesFixture(shelf) && prod && shelf.stockLots?.length) {
          const expired = removeExpiredLots(shelf.stockLots, currentDay);
          if (expired.length) {
            shelf.currentStock = sumLots(shelf.stockLots);
            if (shelf.currentStock === 0) shelf.assignedProductId = undefined;
            const quantity = sumLots(expired);
            onExpiredOnShelf?.(prod.id, quantity, expired.reduce((total, lot) => total + lot.quantity * (lot.unitCost ?? prod.purchasePrice), 0));
          }
        }

        if (shelf && isSalesFixture(shelf) && prod && shelf.currentStock > 0 && shelf.stockLots && shelf.stockLots.length > 0
          && pricing && new Mulberry32Rng(daySeed(hashSeed(customer.id ?? customer.checkoutId ?? 'customer'), currentDay)).next() >= pricing.keepChance(prod.id)) {
          // Giá cao hơn giá thị trường: khách không lấy, rời tiệm (không trừ uy tín)
          pricing.onReject(prod.id);
          onWalkout?.(customer, 'price');
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
        } else if (shelf && isSalesFixture(shelf) && prod && shelf.currentStock > 0 && shelf.stockLots && shelf.stockLots.length > 0) {
          // Pick 1 unit into basket
          // Xóm đông: có xác suất lấy 2 món (chỉ rút RNG khi xác suất > 0 để không đổi mô phỏng cũ).
          const extra = pricing?.extraUnitChance ?? 0;
          const units = extra > 0 && shelf.currentStock > 1 && new Mulberry32Rng(daySeed(hashSeed(`${customer.id ?? customer.checkoutId ?? 'customer'}:extra`), currentDay)).next() < extra ? 2 : 1;
          const movedLots = takeLots(shelf.stockLots, units);
          shelf.currentStock = sumLots(shelf.stockLots);
          if (shelf.currentStock === 0) {
            shelf.assignedProductId = undefined;
          }

          customer.basket ??= [];
          customer.basket.push({
            productId: prod.id,
            quantity: sumLots(movedLots),
            unitPrice: pricing?.priceOf(prod.id) ?? prod.baseSellingPrice,
            lots: movedLots,
          });

          // Re-route to checkout queue
          const queueIndex = this.getQueueIndex(customer);
          this.routeCustomer(customer, 'to_checkout', tileMap, fixtures, queueIndex);
        } else {
          // Shelf is empty (taken by someone else or unstocked) -> no goods, customer leaves
          onOutOfStock?.();
          onReputationLoss?.(1);
          onWalkout?.(customer, 'out_of_stock');
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
        }
      } else if (customer.stage === 'to_table') {
        customer.stage = 'eating';
        customer.diningTimeLeft = 60;
        onDinerSeated?.(customer);
      } else if (customer.stage === 'to_checkout') {
        // Check position in queue
        const queueIndex = this.getQueueIndex(customer);
        if (queueIndex === 0) {
          customer.stage = 'checkout';
        }
      } else if (customer.stage === 'leaving') {
        // Cross-sell: khi khách đến cửa ra, kiểm tra pendingCrossSellTo
        if (customer.pendingCrossSellTo) {
          const targetBld = tileMap.buildings?.find(b => b.id === customer.pendingCrossSellTo);
          const targetOpen = targetBld?.open === true;
          const targetHasStock = fixtures.some(f => isSalesFixture(f) && fixtureBuilding(f) === customer.pendingCrossSellTo && f.currentStock > 0);

          if (targetOpen && targetHasStock) {
            // Transfer to target building — khách đi bộ từ vị trí hiện tại (cửa tòa nguồn)
            // sang kệ tòa đích, KHÔNG teleport: giữ nguyên customer.position
            const targetShelf = fixtures.find(f => isSalesFixture(f) && fixtureBuilding(f) === customer.pendingCrossSellTo);
            if (targetShelf) {
              customer.buildingId = customer.pendingCrossSellTo;
              customer.targetFixtureId = targetShelf.id;
              delete customer.pendingCrossSellTo;
              customer.stage = 'to_shelf';
              this.routeCustomer(customer, 'to_shelf', tileMap, fixtures);
              continue;
            }
          }
          // Nếu không chuyển được, xóa pending và tiếp tục rời đi
          delete customer.pendingCrossSellTo;
        }
        onCustomerDepart?.(customer);
        this.removeCustomer(customer);
      }
    }
  }

  /**
   * Return unexpired goods from abandoned basket back to shelf or inventory.
   * If lots expired, record spoilage.
   */
  public abandonBasket(
    customer: CustomerState,
    fixtures: StoreFixture[],
    inventory: InventoryItem[],
    onSpoiledGoods?: (spoiledCount: number) => void,
    currentDay = 1,
    shelfCapacityMultiplier = 1
  ): void {
    if (!customer.basket || customer.basket.length === 0) return;

    for (const item of customer.basket) {
      for (const lot of item.lots ?? []) {
        if (lot.expiresOnDay <= currentDay) {
          // Spoiled
          onSpoiledGoods?.(lot.quantity);
        } else {
          // Good: return to matching shelf if possible, else inventory
          let returnedToShelf = false;
          const matchingShelf = fixtures.find(
            (f) => isSalesFixture(f) && (f.id === customer.targetFixtureId || f.assignedProductId === item.productId)
          );
          const prod = PRODUCT_MAP[item.productId];
          const shelfCap = prod ? effectiveShelfCapacity(matchingShelf?.maxCapacity ?? 0, prod.shelfCapacity, shelfCapacityMultiplier - 1) : 0;

          if (matchingShelf && isSalesFixture(matchingShelf) && (!matchingShelf.assignedProductId || matchingShelf.assignedProductId === item.productId) && matchingShelf.currentStock < shelfCap) {
            matchingShelf.assignedProductId = item.productId;
            matchingShelf.stockLots ??= [];
            mergeLots(matchingShelf.stockLots, [lot]);
            matchingShelf.currentStock = sumLots(matchingShelf.stockLots);
            returnedToShelf = true;
          }

          if (!returnedToShelf) {
            // Return to warehouse inventory
            const invSlot = inventory.find((i) => i.productId === item.productId);
            if (invSlot) {
              invSlot.lots ??= [];
              mergeLots(invSlot.lots, [lot]);
              invSlot.quantity = sumLots(invSlot.lots);
            } else {
              inventory.push({
                productId: item.productId,
                quantity: lot.quantity,
                lots: [lot],
              });
            }
          }
        }
      }
    }

    customer.basket = [];
  }

  /**
   * Kẻ trộm lẻ rời quầy mà không trả tiền (thao tác trên khách thật trong danh sách). Bị bắt thì hàng được trả về kệ hoặc kho,
   * không thì giỏ bị mang đi. Trả về tổng giá bán, giá vốn và số món của giỏ, hoặc null nếu không có khách đang ở quầy.
   */
  public finishShoplifter(
    checkoutId: string,
    caught: boolean,
    tileMap: GameTileMap,
    fixtures: StoreFixture[],
    inventory: InventoryItem[],
    onSpoiledGoods?: (spoiledCount: number) => void,
    currentDay = 1,
    shelfCapacityMultiplier = 1
  ): { retail: number; cost: number; count: number } | null {
    const customer = this.customers.find((item) => item.checkoutId === checkoutId && item.stage === 'checkout');
    if (!customer) return null;
    const items = customer.basket ?? [];
    const totals = {
      retail: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      cost: items.reduce((sum, item) => sum + (item.lots ?? []).reduce((n, lot) => n + lot.quantity * (lot.unitCost ?? PRODUCT_MAP[item.productId]?.purchasePrice ?? 0), 0), 0),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
    if (caught) this.abandonBasket(customer, fixtures, inventory, onSpoiledGoods, currentDay, shelfCapacityMultiplier);
    else customer.basket = [];
    customer.cashierStaffId = undefined;
    customer.reservedProductId = undefined;
    customer.stage = 'leaving';
    this.routeCustomer(customer, 'leaving', tileMap, fixtures);
    return totals;
  }

  /**
   * Process checkout at the cashier counter.
   * Only the customer at the front of the queue can checkout.
   */
  public completeCheckout(
    checkoutId: string | undefined,
    completedCheckoutIds: Set<string>,
    tileMap: GameTileMap,
    fixtures: StoreFixture[],
    diningTableId?: string
  ): CheckoutResult {
    // 1. Check idempotency: if already processed, return idempotent receipt without double charging
    if (checkoutId && completedCheckoutIds.has(checkoutId)) {
      return {
        success: true,
        checkoutId,
        paidTotal: 0,
        itemCount: 0,
        reason: 'already_processed',
      };
    }

    // 2. Find customer at checkout counter
    const customer = (checkoutId ? this.customers.find((c) => c.stage === 'checkout' && c.checkoutId === checkoutId) : undefined)
      ?? this.customers.find((c) => c.stage === 'checkout');
    if (!customer) {
      return {
        success: false,
        checkoutId: checkoutId ?? '',
        paidTotal: 0,
        itemCount: 0,
        reason: 'no_waiting_customer',
      };
    }

    if (checkoutId && customer.checkoutId && customer.checkoutId !== checkoutId) {
      return {
        success: false,
        checkoutId,
        paidTotal: 0,
        itemCount: 0,
        reason: 'no_waiting_customer',
      };
    }

    // 3. Basket check
    const effectiveCheckoutId = customer.checkoutId ?? checkoutId ?? 'unknown';
    if (!customer.basket || customer.basket.length === 0) {
      return {
        success: false,
        checkoutId: effectiveCheckoutId,
        paidTotal: 0,
        itemCount: 0,
        reason: 'empty_basket',
      };
    }

    // 4. Calculate total & COGS
    let paidTotal = 0;
    let itemCount = 0;
    let cogs = 0;
    const items: { productId: string; quantity: number }[] = [];
    for (const item of customer.basket) {
      paidTotal += item.quantity * item.unitPrice;
      itemCount += item.quantity;
      items.push({ productId: item.productId, quantity: item.quantity });
      const defaultCost = PRODUCT_MAP[item.productId]?.purchasePrice ?? 0;
      for (const lot of (item.lots ?? [])) {
        cogs += lot.quantity * (lot.unitCost ?? defaultCost);
      }
    }

    // 5. Commit
    completedCheckoutIds.add(effectiveCheckoutId);
    customer.diningProductIds = diningTableId ? customer.basket.map(item => item.productId) : undefined;
    customer.basket = [];
    customer.diningTableId = diningTableId;
    customer.diningTimeLeft = diningTableId ? 60 : undefined;

    // Cross-sell: sau khi mua xong, khách có xác suất ghé tòa khác
    // Không teleport — khách đi ra cửa tòa hiện tại, sau đó chuyển sang tòa đích
    // Chỉ chuyển khi tòa đích đang mở và kệ còn hàng
    if (!diningTableId && customer.id && customer.buildingId) {
      for (const rule of CROSS_SELL_RULES) {
        if (rule.fromBuilding === customer.buildingId && !customer.crossSellApplied?.includes(rule.toBuilding)) {
          if (shouldCrossSell(customer.id, rule.fromBuilding, rule.toBuilding)) {
            // Kiểm tra tòa đích có mở và còn hàng không
            const targetBuilding = tileMap.buildings?.find(b => b.id === rule.toBuilding);
            const targetOpen = targetBuilding?.open === true;
            const targetHasStock = fixtures.some(f => isSalesFixture(f) && fixtureBuilding(f) === rule.toBuilding && f.currentStock > 0);

            if (targetOpen && targetHasStock) {
              // Đánh dấu đã áp dụng (tránh lặp)
              if (!customer.crossSellApplied) customer.crossSellApplied = [];
              customer.crossSellApplied.push(rule.toBuilding);
              // Đánh dấu pending cross-sell — khách sẽ đi ra cửa tòa hiện tại,
              // sau đó trong tick tiếp theo sẽ được chuyển sang tòa đích
              customer.pendingCrossSellTo = rule.toBuilding;
              // Khách đi ra cửa tòa hiện tại trước (không teleport)
              customer.stage = 'leaving';
              this.routeCustomer(customer, 'leaving', tileMap, fixtures);
              return {
                success: true,
                checkoutId: effectiveCheckoutId,
                paidTotal,
                itemCount,
                cogs,
                items,
                reason: 'success',
                crossSellTo: rule.toBuilding,
              } as CheckoutResult & { crossSellTo: string };
            }
          }
        }
      }
    }

    customer.stage = diningTableId ? 'to_table' : 'leaving';
    this.routeCustomer(customer, diningTableId ? 'to_table' : 'leaving', tileMap, fixtures);

    return {
      success: true,
      checkoutId: effectiveCheckoutId,
      paidTotal,
      itemCount,
      cogs,
      items,
      reason: 'success',
    };
  }

  public getLiveCustomerByCheckoutId(checkoutId: string): CustomerState | undefined {
    return this.customers.find(customer => customer.checkoutId === checkoutId && customer.stage === 'checkout');
  }

  public diningOccupancy(tableId: string): number {
    return this.customers.filter(customer => customer.diningTableId === tableId && (customer.stage === 'to_table' || customer.stage === 'eating')).length;
  }

  public routeDinerToTable(checkoutId: string, tableId: string, tileMap: GameTileMap, fixtures: StoreFixture[]): boolean {
    const customer = this.customers.find(item => item.checkoutId === checkoutId);
    if (!customer) return false;
    customer.diningTableId = tableId;
    customer.diningTimeLeft = 60;
    this.routeCustomer(customer, 'to_table', tileMap, fixtures);
    return customer.stage === 'to_table';
  }

  public restoreDiningRoutes(tileMap: GameTileMap, fixtures: StoreFixture[]): void {
    for (const customer of this.customers) {
      if (customer.stage === 'to_table' && customer.diningTableId) this.routeCustomer(customer, 'to_table', tileMap, fixtures);
    }
  }

  /** Ô xếp hàng theo quầy; quầy không có chỗ đứng đi được thì bị bỏ qua (khách dồn sang quầy khác). */
  private laneTiles(counters: StoreFixture[], tileMap: GameTileMap, fixtures: StoreFixture[]): Map<string, GridPoint[]> {
    const lanes = new Map<string, GridPoint[]>();
    const taken = new Set<string>();
    for (const counter of counters) {
      const tiles = queueTilesForCounter(counter, tileMap, fixtures, taken);
      if (!tiles.length) continue;
      lanes.set(counter.id, tiles);
      for (const tile of tiles) taken.add(tileKey(tile.x, tile.y));
    }
    return lanes;
  }

  /** Quầy ít người xếp hàng nhất (hòa thì quầy đứng trước). */
  private leastBusyCounter(counters: StoreFixture[], lanes: Map<string, GridPoint[]>, customer: CustomerState): string {
    let best = '';
    let bestLoad = Infinity;
    for (const counter of counters) {
      if (!lanes.has(counter.id)) continue;
      const load = this.customers.filter((c) => c !== customer && c.cashierFixtureId === counter.id && (c.stage === 'to_checkout' || c.stage === 'checkout')).length;
      if (load < bestLoad) { best = counter.id; bestLoad = load; }
    }
    return best;
  }

  private getQueueIndex(customer: CustomerState): number {
    const queueCustomers = this.customers.filter(
      (c) => (c.stage === 'to_checkout' || c.stage === 'checkout') && c.cashierFixtureId === customer.cashierFixtureId
    );
    return Math.max(0, queueCustomers.indexOf(customer));
  }

  private removeCustomer(customer: CustomerState): void {
    const key = customer.id ?? customer.checkoutId ?? 'default';
    this.paths.delete(key);
    this.customers = this.customers.filter((c) => c !== customer);
  }

  /**
   * Migrate legacy customer without a basket
   */
  public importCustomers(customers: CustomerState[] = [], legacySingle?: CustomerState): void {
    const list: CustomerState[] = [];
    if (Array.isArray(customers) && customers.length > 0) {
      list.push(...customers);
    } else if (legacySingle) {
      list.push(legacySingle);
    }

    this.customers = list.map((c) => {
      const copy: CustomerState = { ...c };
      // Spec: if migrating a customer at checkout without a basket, do not fabricate free goods
      copy.basket ??= [];
      return copy;
    });
  }

  /**
   * Hẻm chung: snapshot server (4 lần/giây) ghi đè khách, còn máy này tự bước khách 60 lần/giây nên vị trí bị kéo giật lùi mỗi lần nhận.
   * Với khách cùng id/giai đoạn/đích đã có ở máy này, giữ vị trí cục bộ rồi chỉ kéo dần (`pull`) về vị trí server; lệch quá `snapDistance` thì nhận hẳn vị trí server.
   */
  public blendPositionsFrom(previous: readonly Readonly<CustomerState>[], pull: number, snapDistance: number): void {
    if (!previous.length) return;
    const before = new Map(previous.map((c) => [c.id, c]));
    for (const customer of this.customers) {
      const old = before.get(customer.id);
      if (!old || old.stage !== customer.stage || old.targetFixtureId !== customer.targetFixtureId) continue;
      const dx = customer.position.x - old.position.x;
      const dy = customer.position.y - old.position.y;
      if (Math.hypot(dx, dy) > snapDistance) continue;
      customer.position = { x: old.position.x + dx * pull, y: old.position.y + dy * pull };
    }
  }

  public addTestCustomer(customer: CustomerState): void {
    customer.basket ??= [];
    this.customers.push(customer);
  }
}
