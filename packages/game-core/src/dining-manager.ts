/** Quản lý bàn ăn bẩn của quán ăn (dirty dining tables). */
export class DiningManager {
  private dirtyTableIds = new Set<string>();

  constructor(initialDirtyIds?: Set<string>) {
    if (initialDirtyIds) {
      this.dirtyTableIds = new Set(initialDirtyIds);
    }
  }

  public load(saveData: { diningDirtyTableIds?: string[] }): void {
    this.dirtyTableIds = new Set((saveData.diningDirtyTableIds ?? []).filter((id) => typeof id === 'string'));
  }

  public export(): { diningDirtyTableIds: string[] } {
    return { diningDirtyTableIds: [...this.dirtyTableIds] };
  }

  /** Tham chiếu trực tiếp để `.add()` / `.delete()`. */
  public getRef(): Set<string> {
    return this.dirtyTableIds;
  }

  /** Kiểm tra bàn có bẩn không. */
  public isDirty(fixtureId: string): boolean {
    return this.dirtyTableIds.has(fixtureId);
  }

  /** Xóa tất cả các bàn bẩn (dùng khi dọn sạch). */
  public clearAll(): void {
    this.dirtyTableIds.clear();
  }
}
