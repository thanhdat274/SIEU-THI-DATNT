import { CURRENT_SAVE_SCHEMA_VERSION, validateSaveGameData, type GameWorld, type SaveGameData } from '@game/shared';
import { connectDatabase } from './database.js';

const collectionName = 'game_worlds';

interface MigratableDoc { _id: string; world: GameWorld; businesses: Array<{ save: SaveGameData }> }

export interface SaveMigrationPlan { index: number; from: number; save: SaveGameData }
export interface MigrationSummary { scanned: number; migrated: number; skipped: number; failed: Array<{ worldId: string; reason: string }> }

/** Thuần: tìm save trong document còn schema cũ và trả bản đã nâng cấp. Không sửa document đầu vào. */
export function planWorldMigration(doc: MigratableDoc): { plans: SaveMigrationPlan[]; error?: string } {
  const plans: SaveMigrationPlan[] = [];
  for (let index = 0; index < doc.businesses.length; index++) {
    const save = doc.businesses[index]?.save;
    if (!save || save.schemaVersion === CURRENT_SAVE_SCHEMA_VERSION) continue;
    const result = validateSaveGameData(save);
    if (!result.valid || !result.data) return { plans: [], error: result.error ?? 'Save không hợp lệ' };
    if (result.data.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) return { plans: [], error: `Chưa có đường nâng cấp từ schema ${save.schemaVersion}` };
    plans.push({ index, from: save.schemaVersion, save: result.data });
  }
  return { plans };
}

/**
 * Nâng cấp save trong Mongo lên schema hiện tại. Idempotent; mỗi ghi có điều kiện `world.revision` và schema cũ,
 * nên nếu phòng vừa có lệnh commit thì bỏ qua (lần khởi động sau sẽ làm tiếp). Không bao giờ xóa/ghi đè save lỗi.
 */
export async function migrateWorldSaves(options: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
  const collection = (await connectDatabase()).collection<MigratableDoc>(collectionName);
  const summary: MigrationSummary = { scanned: 0, migrated: 0, skipped: 0, failed: [] };
  const cursor = collection.find({ 'businesses.save.schemaVersion': { $lt: CURRENT_SAVE_SCHEMA_VERSION } });
  for await (const doc of cursor) {
    summary.scanned++;
    const { plans, error } = planWorldMigration(doc);
    if (error) { summary.failed.push({ worldId: doc._id, reason: error }); continue; }
    if (!plans.length) { summary.skipped++; continue; }
    if (options.dryRun) { summary.migrated += plans.length; continue; }
    for (const plan of plans) {
      const result = await collection.updateOne(
        { _id: doc._id, 'world.revision': doc.world.revision, [`businesses.${plan.index}.save.schemaVersion`]: plan.from },
        { $set: { [`businesses.${plan.index}.save`]: plan.save } },
      );
      if (result.modifiedCount === 1) summary.migrated++; else summary.skipped++;
    }
  }
  return summary;
}
