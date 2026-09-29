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
} from '@game/shared';
import { STARTER_PRODUCTS, PRODUCT_MAP } from '@game/data';
import { CollisionSystem } from './collision';
import { InputManager } from './input';
import { GameClock } from './clock';

export interface GameSimulationCallbacks {
  onInteractionAvailable?: (fixture: StoreFixture | null) => void;
  onOpenFixtureModal?: (fixture: StoreFixture) => void;
  onOpenInventoryModal?: () => void;
  onDayChanged?: (newDay: number) => void;
  onStateChanged?: () => void;
}

export class GameSimulation {
  private playerData: PlayerData;
  private fixtures: StoreFixture[];
  private inventory: InventoryItem[];
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
    this.tileMap = tileMap;
    this.inputManager = inputManager;
    this.callbacks = callbacks;

    this.collisionSystem = new CollisionSystem(this.tileMap, this.fixtures);
    this.clock = new GameClock(initialSave.worldTime, (day) => {
      if (this.callbacks.onDayChanged) {
        this.callbacks.onDayChanged(day);
      }
      this.notifyStateChanged();
    });
  }

  public getPlayerData(): PlayerData {
    return { ...this.playerData };
  }

  public getFixtures(): StoreFixture[] {
    return this.fixtures;
  }

  public getInventory(): InventoryItem[] {
    return this.inventory;
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
    if (!fixture) return false;

    const inventorySlot = this.inventory.find((i) => i.productId === productId);
    if (!inventorySlot || inventorySlot.quantity <= 0) return false;

    // If shelf already has a different product, can't mix
    if (fixture.assignedProductId && fixture.assignedProductId !== productId && fixture.currentStock > 0) {
      return false;
    }

    const availableSpace = fixture.maxCapacity - fixture.currentStock;
    if (availableSpace <= 0) return false;

    const actualTransfer = Math.min(amount, inventorySlot.quantity, availableSpace);
    if (actualTransfer <= 0) return false;

    inventorySlot.quantity -= actualTransfer;
    fixture.assignedProductId = productId;
    fixture.currentStock += actualTransfer;

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
    if (!fixture || !fixture.assignedProductId || fixture.currentStock <= 0) return false;

    const actualAmount = Math.min(amount, fixture.currentStock);
    fixture.currentStock -= actualAmount;

    let slot = this.inventory.find((i) => i.productId === fixture.assignedProductId);
    if (slot) {
      slot.quantity += actualAmount;
    } else {
      this.inventory.push({
        productId: fixture.assignedProductId,
        quantity: actualAmount,
      });
    }

    if (fixture.currentStock === 0) {
      // Shelf is now empty and can accept any product
      fixture.assignedProductId = undefined;
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
      schemaVersion: 1,
      revision: currentRevision + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      player: { ...this.playerData },
      worldTime: this.clock.getTime(),
      storeLayout: {
        widthTiles: 8,
        heightTiles: 8,
        fixtures: this.fixtures.map((f) => ({ ...f })),
      },
      inventory: this.inventory.map((i) => ({ ...i })),
      statistics: {
        totalRevenue: 0,
        totalCustomersServed: 0,
        totalDaysPassed: this.clock.getTime().day,
      },
    };
  }

  /**
   * Import saved game data
   */
  public importSaveData(saveData: SaveGameData): void {
    this.playerData = { ...saveData.player };
    this.fixtures = saveData.storeLayout.fixtures.map((f) => ({ ...f }));
    this.inventory = saveData.inventory.map((i) => ({ ...i }));
    this.clock.setTime(saveData.worldTime);
    this.collisionSystem.updateFixtures(this.fixtures);
    this.notifyStateChanged();
  }
}
