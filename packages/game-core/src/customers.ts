import {
  BasketItem,
  CustomerState,
  CheckoutResult,
  GameTileMap,
  isSalesFixture,
  StockLot,
  StoreFixture,
  getFixtureDimensions,
  TILE_SIZE,
  Vector2D,
  InventoryItem,
} from '@game/shared';
import { STORE_BOUNDS, PRODUCT_MAP } from '@game/data';
import { CollisionSystem } from './collision';
import { findPath, GridPoint, tileCenter } from './pathfinding';
import { mergeLots, sumLots, takeLots } from './stock';
import { Mulberry32Rng, daySeed } from './staff';

export const CASHIER_QUEUE_TILES: GridPoint[] = [
  { x: 9, y: 8 },  // Position 0: front of checkout counter
  { x: 9, y: 9 },  // Position 1: behind pos 0
  { x: 9, y: 10 }, // Position 2: behind pos 1
];

export const ENTRANCE_TILE: GridPoint = { x: 9, y: 11 };

/** Cách khách chọn món khi có thị trường: trọng số nhu cầu theo món và hệ số lưu lượng. */
export interface CustomerDemandChoice {
  traffic: number;
  weightOf: (productId: string) => number;
}

export interface CustomerMovementPath {
  customerId: string;
  waypoints: Vector2D[];
}

export class CustomerManager {
  private customers: CustomerState[] = [];
  private paths = new Map<string, Vector2D[]>();
  private customerSequence = 0;
  private spawnCooldown = 12;
  private readonly maxConcurrentCustomers = 2;

  constructor(
    initialCustomers: CustomerState[] = [],
    customerSequence = 0,
    spawnCooldown = 12
  ) {
    this.customerSequence = customerSequence;
    this.spawnCooldown = spawnCooldown;
    this.importCustomers(initialCustomers);
  }

  public getCustomers(): CustomerState[] {
    return this.customers.map((c) => ({
      ...c,
      position: { ...c.position },
      basket: c.basket?.map((b) => ({ ...b, lots: [...b.lots] })),
    }));
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

  public getSpawnCooldown(): number {
    return this.spawnCooldown;
  }

  public getCustomerSequence(): number {
    return this.customerSequence;
  }

  /**
   * Spawn a new customer if conditions allow
   */
  public maybeSpawnCustomer(
    dt: number,
    isStoreOpen: boolean,
    fixtures: StoreFixture[],
    tileMap: GameTileMap,
    currentDay: number,
    customersServed: number,
    demand?: CustomerDemandChoice
  ): CustomerState | null {
    if (!isStoreOpen) return null;
    if (this.customers.length >= this.maxConcurrentCustomers) return null;

    this.spawnCooldown -= dt;
    if (this.spawnCooldown > 0) return null;
    this.spawnCooldown = 12 / Math.max(0.25, demand?.traffic ?? 1);

    const stockedShelves = fixtures.filter(
      (f) => isSalesFixture(f) && f.currentStock > 0 && f.assignedProductId
    );
    if (!stockedShelves.length) return null;

    // Pick target shelf based on customer turn
    // Có bảng nhu cầu: chọn kệ theo xác suất tỉ lệ nhu cầu (xác định theo số thứ tự khách). Không có: xoay vòng như cũ.
    const target = demand
      ? this.pickShelfByDemand(stockedShelves, demand.weightOf, currentDay)
      : stockedShelves[customersServed % stockedShelves.length];
    this.customerSequence += 1;
    const customerId = `cust-${currentDay}-${this.customerSequence}`;
    const checkoutId = `checkout-${currentDay}-${this.customerSequence}`;

    const newCustomer: CustomerState = {
      id: customerId,
      position: tileCenter(ENTRANCE_TILE),
      stage: 'to_shelf',
      targetFixtureId: target.id,
      checkoutId,
      reservedProductId: target.assignedProductId,
      basket: [],
      patience: 45,
      checkoutWait: 2.5,
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
    } else if (stage === 'to_checkout' || stage === 'checkout') {
      const targetQueueTile = CASHIER_QUEUE_TILES[Math.min(queueIndex, CASHIER_QUEUE_TILES.length - 1)];
      goals.push(targetQueueTile);
    } else if (stage === 'leaving') {
      goals.push(ENTRANCE_TILE);
    }

    const customerMap = {
      ...tileMap,
      collisionLayer: tileMap.collisionLayer.map(
        (solid, i) => solid || Math.floor(i / tileMap.width) + (tileMap.originTileY ?? 0) <= STORE_BOUNDS.top
      ),
    };
    const customerCollision = new CollisionSystem(customerMap, fixtures);
    const paths = goals
      .map((goal) => findPath(customerMap, customerCollision, start, goal))
      .filter((p) => p.length);
    paths.sort((a, b) => a.length - b.length);

    const waypoints = paths[0]?.map(tileCenter).slice(1) ?? [];
    this.paths.set(customer.id ?? customer.checkoutId ?? 'default', waypoints);

    if (!paths.length && stage !== 'checkout') {
      // Unreachable goal, leave
      if (stage !== 'leaving') {
        this.abandonBasket(customer, fixtures, [], currentDay => {});
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
    onOutOfStock?: () => void
  ): void {
    const customerList = [...this.customers];
    for (const customer of customerList) {
      if (!this.customers.includes(customer)) continue;
      const key = customer.id ?? customer.checkoutId ?? 'default';

      // 1. Patience check (before checkout)
      if (customer.stage !== 'leaving') {
        customer.patience -= dt;
        if (customer.patience <= 0 || !isStoreOpen) {
          onReputationLoss?.(1);
          this.abandonBasket(customer, fixtures, inventory, onSpoiledGoods, currentDay);
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
          continue;
        }
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

        if (shelf && isSalesFixture(shelf) && prod && shelf.currentStock > 0 && shelf.stockLots && shelf.stockLots.length > 0) {
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
            unitPrice: prod.baseSellingPrice,
            lots: movedLots,
          });

          // Re-route to checkout queue
          const queueIndex = this.getQueueIndex(customer);
          this.routeCustomer(customer, 'to_checkout', tileMap, fixtures, queueIndex);
        } else {
          // Shelf is empty (taken by someone else or unstocked) -> no goods, customer leaves
          onOutOfStock?.();
          onReputationLoss?.(1);
          this.routeCustomer(customer, 'leaving', tileMap, fixtures);
        }
      } else if (customer.stage === 'to_checkout') {
        // Check position in queue
        const queueIndex = this.getQueueIndex(customer);
        if (queueIndex === 0) {
          customer.stage = 'checkout';
        }
      } else if (customer.stage === 'leaving') {
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
    currentDay = 1
  ): void {
    if (!customer.basket || customer.basket.length === 0) return;

    for (const item of customer.basket) {
      for (const lot of item.lots) {
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
          const shelfCap = prod ? Math.min(matchingShelf?.maxCapacity ?? 0, prod.shelfCapacity) : 0;

          if (matchingShelf && isSalesFixture(matchingShelf) && (!matchingShelf.assignedProductId || matchingShelf.assignedProductId === item.productId) && matchingShelf.currentStock < shelfCap) {
            matchingShelf.assignedProductId = item.productId;
            matchingShelf.stockLots ??= [];
            mergeLots(matchingShelf.stockLots, [lot]);
            matchingShelf.currentStock = sumLots(matchingShelf.stockLots);
            returnedToShelf = true;
          }

          if (!returnedToShelf) {
            // Return to warehouse inventory
            let invSlot = inventory.find((i) => i.productId === item.productId);
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
   * Process checkout at the cashier counter.
   * Only the customer at the front of the queue can checkout.
   */
  public completeCheckout(
    checkoutId: string | undefined,
    completedCheckoutIds: Set<string>,
    tileMap: GameTileMap,
    fixtures: StoreFixture[]
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
    const customer = this.customers.find((c) => c.stage === 'checkout');
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
    customer.basket = [];
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
    };
  }

  private getQueueIndex(customer: CustomerState): number {
    const queueCustomers = this.customers.filter(
      (c) => c.stage === 'to_checkout' || c.stage === 'checkout'
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
