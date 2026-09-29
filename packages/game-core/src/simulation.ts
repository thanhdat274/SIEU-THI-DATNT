import {
  Direction,
  GameTileMap,
  InventoryItem,
  PlayerData,
  SaveGameData,
  StoreFixture,
  TILE_SIZE,
  Vector2D,
  WorldTime,
  SupplierOrder,
  COLD_WAREHOUSE_CAPACITY,
} from '@game/shared';
import { INITIAL_REFRIGERATOR, PRODUCT_MAP } from '@game/data';
import { CollisionSystem } from './collision';
import { InputManager } from './input';
import { GameClock } from './clock';
import { expiryDay, mergeLots, normalizeLots, sumLots, takeLots } from './stock';

export interface GameSimulationCallbacks {
  onInteractionAvailable?: (fixture: StoreFixture | null) => void;
  onOpenFixtureModal?: (fixture: StoreFixture) => void;
  onOpenInventoryModal?: () => void;
  onDayChanged?: (newDay: number) => void;
  onTimeChanged?: () => void;
  onStockExpired?: (quantity: number) => void;
  onStateChanged?: () => void;
}

export class GameSimulation {
  private playerData: PlayerData;
  private fixtures: StoreFixture[];
  private inventory: InventoryItem[];
  private pendingOrders: SupplierOrder[];
  private statistics: SaveGameData['statistics'];
  private createdAt: string;
  private tileMap: GameTileMap;
  private collisionSystem: CollisionSystem;
  private clock: GameClock;
  private inputManager: InputManager;
  private callbacks: GameSimulationCallbacks;

  private activeFixture: StoreFixture | null = null;
  private playerSpeed: number = 130; // Pixels per second
  private isMoving: boolean = false;

  constructor(
    initialSave: SaveGameData,
    tileMap: GameTileMap,
    inputManager: InputManager,
    callbacks: GameSimulationCallbacks = {}
  ) {
    this.playerData = { ...initialSave.player };
    this.fixtures = initialSave.storeLayout.fixtures.map((f) => ({ ...f }));
    this.inventory = initialSave.inventory.map((i) => ({ ...i }));
    this.pendingOrders = (initialSave.pendingOrders ?? []).map((order) => ({ ...order }));
    this.statistics = { ...initialSave.statistics };
    this.createdAt = initialSave.createdAt;
    this.tileMap = tileMap;
    this.inputManager = inputManager;
    this.callbacks = callbacks;
    this.hydrateStock(initialSave.worldTime.day);

    this.collisionSystem = new CollisionSystem(this.tileMap, this.fixtures);
    this.clock = new GameClock(initialSave.worldTime, (day) => {
      const spoiled = this.expireStock(day);
      this.deliverOrders(day);
      this.statistics.totalDaysPassed = Math.max(this.statistics.totalDaysPassed, day - 1);
      if (spoiled > 0) this.callbacks.onStockExpired?.(spoiled);
      if (this.callbacks.onDayChanged) {
        this.callbacks.onDayChanged(day);
      }
      this.notifyStateChanged();
    }, () => this.callbacks.onTimeChanged?.());
  }

  public getPlayerData(): PlayerData {
    return { ...this.playerData };
  }

  public getFixtures(): StoreFixture[] {
    return this.fixtures;
  }

  public getInventory(): InventoryItem[] {
    return this.inventory.map((item) => ({ ...item, lots: item.lots?.map((lot) => ({ ...lot })) }));
  }

  public getColdWarehouseCount(): number {
    return this.inventory.reduce((count, item) => count + (PRODUCT_MAP[item.productId]?.storageType === 'cold' ? item.quantity : 0), 0);
  }

  public getPendingOrders(): SupplierOrder[] {
    return this.pendingOrders.map((order) => ({ ...order }));
  }

  public getStatistics(): SaveGameData['statistics'] {
    return { ...this.statistics };
  }

  public getClock(): GameClock {
    return this.clock;
  }

  public getTime(): WorldTime {
    return this.clock.getTime();
  }

  public getActiveFixture(): StoreFixture | null {
    return this.activeFixture;
  }

  public getIsMoving(): boolean {
    return this.isMoving;
  }

  public setCallbacks(callbacks: GameSimulationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private hydrateStock(day: number): void {
    // A version-1 save has no refrigerator or lot data. Preserve its quantities
    // and assign a fresh shelf life when first loaded into version 2.
    if (!this.fixtures.some((fixture) => fixture.id === INITIAL_REFRIGERATOR.id)) {
      this.fixtures.push({ ...INITIAL_REFRIGERATOR, stockLots: [] });
    }
    this.inventory = this.inventory.map((item) => {
      const lots = normalizeLots(item.quantity, item.lots, item.productId, day);
      return { productId: item.productId, quantity: sumLots(lots), lots };
    }).filter((item) => item.quantity > 0);
    this.fixtures = this.fixtures.map((fixture) => {
      if (!fixture.assignedProductId || fixture.currentStock <= 0) {
        return { ...fixture, assignedProductId: undefined, currentStock: 0, stockLots: [] };
      }
      const stockLots = normalizeLots(fixture.currentStock, fixture.stockLots, fixture.assignedProductId, day);
      return { ...fixture, currentStock: sumLots(stockLots), stockLots };
    });
    this.expireStock(day);
  }

  private expireStock(day: number): number {
    let spoiled = 0;
    this.inventory = this.inventory.map((item) => {
      const expired = (item.lots ?? []).filter((lot) => lot.expiresOnDay <= day);
      spoiled += sumLots(expired);
      const lots = (item.lots ?? []).filter((lot) => lot.expiresOnDay > day);
      return { ...item, lots, quantity: sumLots(lots) };
    }).filter((item) => item.quantity > 0);
    for (const fixture of this.fixtures) {
      const lots = fixture.stockLots ?? [];
      spoiled += sumLots(lots.filter((lot) => lot.expiresOnDay <= day));
      fixture.stockLots = lots.filter((lot) => lot.expiresOnDay > day);
      fixture.currentStock = sumLots(fixture.stockLots);
      if (fixture.currentStock === 0) fixture.assignedProductId = undefined;
    }
    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;
    return spoiled;
  }

  private reservedColdWarehouseCount(): number {
    return this.getColdWarehouseCount() + this.pendingOrders.reduce((count, order) =>
      count + (PRODUCT_MAP[order.productId]?.storageType === 'cold' ? order.quantity : 0), 0);
  }

  /**
   * Fixed update step
   */
  public update(dt: number): void {
    // 1. Advance game clock
    this.clock.update(dt);

    // 2. Process player movement
    const moveVec = this.inputManager.getMovementVector();
    this.isMoving = Math.abs(moveVec.x) > 0.05 || Math.abs(moveVec.y) > 0.05;

    if (this.isMoving) {
      this.playerData.direction = InputManager.vectorToDirection(
        moveVec,
        this.playerData.direction
      );

      const velocity: Vector2D = {
        x: moveVec.x * this.playerSpeed,
        y: moveVec.y * this.playerSpeed,
      };

      this.playerData.position = this.collisionSystem.resolveMovement(
        this.playerData.position,
        velocity,
        dt
      );
    }

    // 3. Check proximity to fixtures (Interaction detection)
    this.checkNearbyInteractions();

    // 4. Handle input action requests
    if (this.inputManager.consumeInteract()) {
      if (this.activeFixture && this.callbacks.onOpenFixtureModal) {
        this.callbacks.onOpenFixtureModal(this.activeFixture);
      }
    }

    if (this.inputManager.consumeInventoryToggle()) {
      if (this.callbacks.onOpenInventoryModal) {
        this.callbacks.onOpenInventoryModal();
      }
    }
  }

  private checkNearbyInteractions(): void {
    const pX = this.playerData.position.x;
    const pY = this.playerData.position.y;
    let closestFixture: StoreFixture | null = null;
    let minDistance = 56; // Interaction reach distance in pixels

    for (const fix of this.fixtures) {
      // Center of fixture
      const fCenterX = (fix.tileX + fix.widthTiles / 2) * TILE_SIZE;
      const fCenterY = (fix.tileY + fix.heightTiles / 2) * TILE_SIZE;

      const dist = Math.hypot(pX - fCenterX, pY - fCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        closestFixture = fix;
      }
    }

    if (this.activeFixture?.id !== closestFixture?.id) {
      this.activeFixture = closestFixture;
      if (this.callbacks.onInteractionAvailable) {
        this.callbacks.onInteractionAvailable(this.activeFixture);
      }
    }
  }

  /**
   * Restock a shelf from player's inventory
   */
  public restockShelf(fixtureId: string, productId: string, amount: number = 1): boolean {
    const fixture = this.fixtures.find((f) => f.id === fixtureId);
    if (!fixture || fixture.type === 'cashier_counter' || !Number.isSafeInteger(amount) || amount <= 0) return false;

    const product = PRODUCT_MAP[productId];
    if (!product || product.unlockLevel > this.playerData.level) return false;
    if (product.storageType === 'cold' && fixture.type !== 'refrigerator') return false;
    if (product.storageType !== 'cold' && fixture.type === 'refrigerator') return false;

    const inventorySlot = this.inventory.find((i) => i.productId === productId);
    if (!inventorySlot || inventorySlot.quantity <= 0) return false;

    // If shelf already has a different product, can't mix
    if (fixture.assignedProductId && fixture.assignedProductId !== productId && fixture.currentStock > 0) {
      return false;
    }

    const availableSpace = Math.min(fixture.maxCapacity, product.shelfCapacity) - fixture.currentStock;
    if (availableSpace <= 0) return false;

    const actualTransfer = Math.min(amount, inventorySlot.quantity, availableSpace);
    if (actualTransfer <= 0) return false;

    const moved = takeLots(inventorySlot.lots!, actualTransfer);
    inventorySlot.quantity = sumLots(inventorySlot.lots!);
    fixture.assignedProductId = productId;
    fixture.stockLots ??= [];
    mergeLots(fixture.stockLots, moved);
    fixture.currentStock = sumLots(fixture.stockLots);

    // Clean up empty inventory slots
    if (inventorySlot.quantity <= 0) {
      this.inventory = this.inventory.filter((i) => i.quantity > 0);
    }

    this.notifyStateChanged();
    return true;
  }

  /**
   * Remove items from shelf back into inventory
   */
  public unstockShelf(fixtureId: string, amount: number = 1): boolean {
    const fixture = this.fixtures.find((f) => f.id === fixtureId);
    if (!fixture || !fixture.assignedProductId || fixture.currentStock <= 0 || !Number.isSafeInteger(amount) || amount <= 0) return false;

    const actualAmount = Math.min(amount, fixture.currentStock);
    if (PRODUCT_MAP[fixture.assignedProductId]?.storageType === 'cold' &&
      this.reservedColdWarehouseCount() + actualAmount > COLD_WAREHOUSE_CAPACITY) return false;
    const moved = takeLots(fixture.stockLots!, actualAmount);
    fixture.currentStock = sumLots(fixture.stockLots!);

    let slot = this.inventory.find((i) => i.productId === fixture.assignedProductId);
    if (slot) {
      mergeLots(slot.lots!, moved);
      slot.quantity = sumLots(slot.lots!);
    } else {
      this.inventory.push({
        productId: fixture.assignedProductId,
        quantity: actualAmount,
        lots: moved,
      });
    }

    if (fixture.currentStock === 0) {
      // Shelf is now empty and can accept any product
      fixture.assignedProductId = undefined;
    }

    this.notifyStateChanged();
    return true;
  }

  /** Pay when ordering; goods arrive in the warehouse the following morning. */
  public orderFromSupplier(productId: string, quantity: number): boolean {
    const product = PRODUCT_MAP[productId];
    if (!product || product.unlockLevel > this.playerData.level || !Number.isSafeInteger(quantity) || quantity <= 0) return false;
    const cost = product.purchasePrice * quantity;
    if (!Number.isSafeInteger(cost) || cost > this.playerData.money) return false;
    if (product.storageType === 'cold' && this.reservedColdWarehouseCount() + quantity > COLD_WAREHOUSE_CAPACITY) return false;

    this.playerData.money -= cost;
    this.pendingOrders.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      productId,
      quantity,
      unitCost: product.purchasePrice,
      arrivalDay: this.clock.getTime().day + 1,
    });
    this.notifyStateChanged();
    return true;
  }

  private deliverOrders(day: number): void {
    const arrived = this.pendingOrders.filter((order) => order.arrivalDay <= day);
    this.pendingOrders = this.pendingOrders.filter((order) => order.arrivalDay > day);
    for (const order of arrived) {
      const slot = this.inventory.find((item) => item.productId === order.productId);
      const lot = { quantity: order.quantity, expiresOnDay: expiryDay(order.productId, day) };
      if (slot) {
        mergeLots(slot.lots!, [lot]);
        slot.quantity = sumLots(slot.lots!);
      } else this.inventory.push({ productId: order.productId, quantity: order.quantity, lots: [lot] });
    }
  }

  /** Complete one in-store sale from shelf stock at the cashier. */
  public checkoutShelf(fixtureId: string): boolean {
    if (!this.clock.getTime().isStoreOpen) return false;
    const fixture = this.fixtures.find((item) => item.id === fixtureId);
    if (!fixture || fixture.type === 'cashier_counter' || !fixture.assignedProductId || fixture.currentStock < 1) return false;
    const product = PRODUCT_MAP[fixture.assignedProductId];
    if (!product) return false;

    takeLots(fixture.stockLots!, 1);
    fixture.currentStock = sumLots(fixture.stockLots!);
    if (fixture.currentStock === 0) fixture.assignedProductId = undefined;
    this.playerData.money += product.baseSellingPrice;
    this.statistics.totalRevenue += product.baseSellingPrice;
    this.statistics.totalCustomersServed += 1;
    this.playerData.experience += 5;
    while (this.playerData.experience >= this.playerData.experienceToNextLevel) {
      this.playerData.experience -= this.playerData.experienceToNextLevel;
      this.playerData.level += 1;
      this.playerData.experienceToNextLevel = Math.floor(this.playerData.experienceToNextLevel * 1.5);
    }
    this.notifyStateChanged();
    return true;
  }

  /**
   * Add money to player
   */
  public addMoney(amount: number): void {
    this.playerData.money += amount;
    this.notifyStateChanged();
  }

  /**
   * Add experience points & handle level up
   */
  public addExperience(xp: number): void {
    this.playerData.experience += xp;
    while (this.playerData.experience >= this.playerData.experienceToNextLevel) {
      this.playerData.experience -= this.playerData.experienceToNextLevel;
      this.playerData.level += 1;
      this.playerData.experienceToNextLevel = Math.floor(
        this.playerData.experienceToNextLevel * 1.5
      );
    }
    this.notifyStateChanged();
  }

  private notifyStateChanged(): void {
    if (this.callbacks.onStateChanged) {
      this.callbacks.onStateChanged();
    }
  }

  /**
   * Export complete save game data snapshot
   */
  public exportSaveData(existingSaveId?: string, currentRevision: number = 1): SaveGameData {
    return {
      id: existingSaveId || 'local_save_default',
      schemaVersion: 2,
      revision: currentRevision + 1,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      player: { ...this.playerData },
      worldTime: this.clock.getTime(),
      storeLayout: {
        widthTiles: 8,
        heightTiles: 8,
        fixtures: this.fixtures.map((f) => ({ ...f, stockLots: f.stockLots?.map((lot) => ({ ...lot })) })),
      },
      inventory: this.getInventory(),
      pendingOrders: this.getPendingOrders(),
      statistics: { ...this.statistics },
    };
  }

  /**
   * Import saved game data
   */
  public importSaveData(saveData: SaveGameData): void {
    this.playerData = { ...saveData.player };
    this.fixtures = saveData.storeLayout.fixtures.map((f) => ({ ...f }));
    this.inventory = saveData.inventory.map((i) => ({ ...i }));
    this.pendingOrders = (saveData.pendingOrders ?? []).map((order) => ({ ...order }));
    this.statistics = { ...saveData.statistics };
    this.createdAt = saveData.createdAt;
    this.hydrateStock(saveData.worldTime.day);
    this.clock.setTime(saveData.worldTime);
    this.collisionSystem.updateFixtures(this.fixtures);
    this.activeFixture = null;
    this.notifyStateChanged();
  }
}
