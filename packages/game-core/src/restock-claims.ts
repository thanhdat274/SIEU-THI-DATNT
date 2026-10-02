/** Quản lý việc claiming (đặt chỗ) các restock job theo fixture. Prevents multiple staff from restocking the same fixture. */
export class RestockClaimManager {
  private claims = new Map<string, { actorId: string; fixtureId: string }>();

  /** Lấy claim hiện tại cho một fixture (dùng trong assignRefillJob). */
  public get(fixtureId: string): { actorId: string; fixtureId: string } | undefined {
    return this.claims.get(fixtureId);
  }

  /** Kiểm tra có claim active cho fixture không. */
  public isActive(fixtureId: string): boolean {
    return this.claims.has(fixtureId);
  }

  /** Lấy actorId hiện tại đang claim fixture. */
  public getActorId(fixtureId: string): string | undefined {
    return this.claims.get(fixtureId)?.actorId;
  }

  /** Thiết lập claim mới (dùng trong assignRefillJob). */
  public set(fixtureId: string, actorId: string): void {
    this.claims.set(fixtureId, { actorId, fixtureId });
  }

  /** Xóa claim của một actor cho fixture (dùng trong releaseRestockJob). */
  public delete(fixtureId: string): boolean {
    return this.claims.delete(fixtureId);
  }

  /** Xóa tất cả claims (dùng khi import lại save data). */
  public clear(): void {
    this.claims.clear();
  }

  /** Thêm claim từ workerTask của staff (dùng khi khởi tạo simulation từ save). */
  public addFromWorkerTask(fixtureId: string, actorId: string): void {
    this.claims.set(fixtureId, { actorId, fixtureId });
  }
}
