import type { ProductionJob, SaveGameData } from '@game/shared';
import { sanitizeProductionJobs } from './production';

/** Quản lý danh sách production jobs. */
export class ProductionManager {
  private productionJobs: ProductionJob[] = [];

  constructor(initialSave: SaveGameData) {
    this.load(initialSave);
  }

  public load(saveData: SaveGameData): void {
    this.productionJobs = sanitizeProductionJobs(saveData.productionJobs);
  }

  public export(): { productionJobs: ProductionJob[] } {
    return { productionJobs: this.productionJobs.map((job) => ({ ...job })) };
  }

  /** Tham chiếu trực tiếp đến productionJobs (dùng để ghi/push/filter). */
  public getRef(): ProductionJob[] {
    return this.productionJobs;
  }

  /** Xóa các jobs đã hoàn thành khỏi danh sách. */
  public removeCompleted(completedIds: Set<string>): void {
    this.productionJobs = this.productionJobs.filter((job) => !completedIds.has(job.id));
  }

  public getJobs(): ProductionJob[] {
    return this.productionJobs.map((job) => ({ ...job }));
  }
}
