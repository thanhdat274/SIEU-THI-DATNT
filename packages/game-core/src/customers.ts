import { slotCategoryConflict } from './shelf-slots';
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
  CustomerArrivalMode
} from '@game/shared';
import { BUILDING_MAP, BUILDING_TRAFFIC_SHARE, MAP_WIDTH, buildingAt, fixtureBuilding, STORE_BOUNDS, PRODUCT_MAP, effectiveShelfCapacity, RegularCustomerDefinition, STREET_PARKING_SPOTS, CAR_PARKING_SPOTS, type BuildingId } from '@game/data';
import { arrivalModeWeights, pickArrivalMode } from './arrival-mode';
import { CollisionSystem } from './collision';
import { findPath, GridPoint, tileCenter } from './pathfinding';
import { mergeLots, sumLots, takeLots } from './stock';
import { removeExpiredLots } from './spoilage';
import { Mulberry32Rng, daySeed } from './staff';
import { hashSeed } from './weather';
import type { CustomerFeedbackReason } from './reputation';

export const CASHIER_QUEUE_TILES: GridPoint[] = [
  { x: 9, y: 8 },  // Position 0: front of checkout counter
  { x: 9, y: 9 },  // Position 1: behind pos 0
  { x: 9, y: 10 }, // Position 2: behind pos 1
];

export const ENTRANCE_TILE: GridPoint = { x: 9, y: 11 };

const QUEUE_LENGTH = CASHIER_QUEUE_TILES.length;
const tileKey = (x: number, y: number) => `${x},${y}`;

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
    const localY = y - (tileMap.originTileY ?? 0);
    const index = localY * tileMap.width + x;
    return x >= 0 && x < tileMap.width && localY >= 0 && localY < tileMap.height && ground[index] === 3
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
}

export interface CustomerMovementPath {
  customerId: string;
  waypoints: Vector2D[];
}

export class CustomerManager {
  private customers: CustomerState[] = [];
  private paths = new Map<string, Vector2D[]>();
  private customerSequence = 0;
  private spawnCooldown = 5.5;
  /** Nhịp sinh khách của các tòa phụ (không lưu trong save; nạp lại thì bắt đầu từ 5,5 s). */
  private streamCooldowns = new Map<string, number>();
  private readonly maxConcurrentCustomers = 3;

  constructor(
    initialCustomers: CustomerState[] = [],
    customerSequence = 0,
    spawnCooldown = 5.5
  ) {
    this.customerSequence = customerSequence;
    this.spawnCooldown = spawnCooldown;
    this.importCustomers(initialCustomers);
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
      this.abandonBasket(customer, fixtures, inventory, onSpoiledGoods, currentDay, shelfCapacityMultiplier);
      customer.cashierStaffId = undefined;
      customer.reservedProductId = undefined;
      this.routeCustomer(customer, 'leaving', tileMap, fixtures);
    }
  }

  /** Tính lại đường đi của khách thật (không phải bản sao) sau khi bản đồ hoặc đồ đạc đổi. */
  public rerouteAll(tileMap: GameTileMap, fixtures: StoreFixture[]): void {
    for (const customer of this.customers) {
      if (customer.stage !== 'checkout') this.routeCustomer(customer, customer.stage, tileMap, fixtures);
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
    arrivalContext?: { hour: number; weekday: number }
  ): CustomerState | null {
    if (!isStoreOpen) return null;
    const streams: Array<readonly [BuildingId, number]> = [['main', 1], ...BUILDING_TRAFFIC_SHARE];
    for (const [streamId, factor] of streams) {
      const spawned = this.spawnForBuilding(streamId, factor, dt, fixtures, tileMap, currentDay, customersServed, demand, streamId === 'main' ? regularCandidate : null, rainIntensity, hasBikeSecurity, arrivalContext);
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
    // Tòa phụ: cùng công thức rồi chia cho `factor` (cả trần 1,5 s), để nhịp sinh khách tỉ lệ đúng với tiệm chính kể cả khi lưu lượng đã chạm trần.
    this.setStreamCooldown(streamId, Math.max(1.5, 5.5 / Math.max(0.25, demand?.traffic ?? 1)) / factor);

    const stockedShelves = fixtures.filter(
      (f) => isSalesFixture(f) && !f.broken && f.currentStock > 0 && f.assignedProductId && (fixtureBuilding(f) ?? 'main') === streamId
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
    const buildingId = fixtureBuilding(target) ?? 'main';

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
    const entrance = BUILDING_MAP[buildingId].entranceTile;
    const distanceToDoor = (s: Vector2D) => Math.abs(s.x / TILE_SIZE - (entrance.x + 0.5));
    // Chỉ chỗ đỗ trong vòng 15 ô tới cửa tòa; tiệm chính giữ cách chọn cũ (xoay vòng), tòa phụ chọn chỗ gần cửa nhất.
    const nearDoor = (spots: ReadonlyArray<Vector2D>) => spots.filter(isFree).filter(s => distanceToDoor(s) <= 15).sort((a, b) => buildingId === 'main' ? 0 : distanceToDoor(a) - distanceToDoor(b));
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
        vehicleSpot = availableSpots[buildingId === 'main' ? this.customerSequence % availableSpots.length : 0];
        vehicleVariant = this.customerSequence % 3;
      } else {
        arrivalMode = 'walk';
      }
    } else if (arrivalMode === 'car') {
      if (availableCarSpots.length > 0) {
        vehicleSpot = availableCarSpots[buildingId === 'main' ? this.customerSequence % availableCarSpots.length : 0];
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
    } else {
      const doorTileX = entrance.x;
      const leftX = 1;
      const rightX = MAP_WIDTH - 2;
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
    };

    this.customers.push(newCustomer);
    this.routeCustomer(newCustomer, 'to_shelf', tileMap, fixtures);
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
      const counters = cashierCounters(fixtures).filter((counter) => (fixtureBuilding(counter) ?? 'main') === home);
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
      } else {
        const exitX = (customer.id ? customer.id.charCodeAt(customer.id.length - 1) : 0) % 2 === 0 ? 1 : MAP_WIDTH - 2;
        goals.push({ x: exitX, y: 12 });
      }
    }

    // Khách không vào kho/phía sau tiệm chính (hàng y <= STORE_BOUNDS.top), trừ phần mở rộng phía bắc của tòa phụ (sàn tòa mở).
    const customerMap = {
      ...tileMap,
      collisionLayer: tileMap.collisionLayer.map((solid, i) => {
        const y = Math.floor(i / tileMap.width) + (tileMap.originTileY ?? 0);
        if (solid || y > STORE_BOUNDS.top) return solid;
        const building = buildingAt(i % tileMap.width, y);
        return !building || building === 'main'; // cửa kho nằm ở hàng tường sau tiệm chính nên vẫn chặn
      }),
    };
    const customerCollision = new CollisionSystem(customerMap, fixtures);
    const paths = goals
      .map((goal) => findPath(customerMap, customerCollision, start, goal))
      .filter((p) => p.length);
    paths.sort((a, b) => a.length - b.length);

    let chosenPath = paths[0];
    if (!chosenPath && stage === 'leaving' && !customer.vehicleSpot) {
      chosenPath = findPath(customerMap, customerCollision, start, BUILDING_MAP[(customer.buildingId as BuildingId | undefined) ?? 'main']?.entranceTile ?? ENTRANCE_TILE);
    }
    const waypoints = chosenPath?.map(tileCenter).slice(1) ?? [];
    this.paths.set(customer.id ?? customer.checkoutId ?? 'default', waypoints);

    if (!paths.length && stage !== 'checkout') {
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

      // 1. Patience check (before checkout)
      if (customer.stage !== 'leaving' && customer.stage !== 'eating') {
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

      // 3. Follow waypoints
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
          const movedLots = takeLots(shelf.stockLots, 1);
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

          if (matchingShelf && isSalesFixture(matchingShelf) && (!matchingShelf.assignedProductId || matchingShelf.assignedProductId === item.productId) && !slotCategoryConflict(fixtures, matchingShelf, item.productId) && matchingShelf.currentStock < shelfCap) {
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

  public addTestCustomer(customer: CustomerState): void {
    customer.basket ??= [];
    this.customers.push(customer);
  }
}
