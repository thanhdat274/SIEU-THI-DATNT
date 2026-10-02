/** Quản lý tier kho hàng và storage rack count (dùng để tính dung lượng kho). */
export class StorageManager {
  private warehouseTier: number;
  private storageRackCount: number;

  constructor(tier: number, rackCount: number) {
    this.warehouseTier = tier;
    this.storageRackCount = rackCount;
  }

  /** Tải từ save data. */
  public load(tier: number, rackCount: number): void {
    this.warehouseTier = tier;
    this.storageRackCount = rackCount;
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
