import type { SaveGameData } from '@game/shared';

/** Quản lý tier kho hàng và storage rack count (dùng để tính dung lượng kho). */
export class StorageManager {
  private warehouseTier!: number;
  private storageRackCount!: number;

  constructor(initialSave: SaveGameData) {
    this.load(initialSave);
  }

  /** Tải từ save data. */
  public load(saveData: SaveGameData): void {
    this.warehouseTier = saveData.warehouseTier ?? 0;
    this.storageRackCount = saveData.storageRackCount ?? 0;
  }

  public getWarehouseTier(): number {
    return this.warehouseTier;
  }

  public getStorageRackCount(): number {
    return this.storageRackCount;
  }

  public getCapacity() {
    return {
      tier: this.warehouseTier,
      racks: this.storageRackCount,
    };
  }

  /** Export để serialize. */
  public export(): { warehouseTier: number; storageRackCount: number } {
    return { warehouseTier: this.warehouseTier, storageRackCount: this.storageRackCount };
  }
}
