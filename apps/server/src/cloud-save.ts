import { validateSaveGameData, type SaveGameData } from '@game/shared';
import { connectDatabase } from './database.js';

/** Tài liệu save cloud: một bản mỗi tài khoản, tách biệt với save hẻm online (`worlds`). */
interface CloudSaveDoc {
  _id: string;
  save: SaveGameData;
  /** Dấu thời gian server khi ghi; client dùng làm `expectedUpdatedAt` cho lần ghi kế tiếp. */
  updatedAt: string;
}

export interface CloudSaveSummary {
  updatedAt: string;
  day: number;
  level: number;
  money: number;
  totalRevenue: number;
}

export type CloudSaveWriteDecision =
  | { ok: true }
  | { ok: false; status: 400 | 409; message: string };

export function summarizeCloudSave(save: SaveGameData, updatedAt: string): CloudSaveSummary {
  return { updatedAt, day: save.worldTime.day, level: save.player.level, money: save.player.money, totalRevenue: save.statistics.totalRevenue };
}

/**
 * Quyết định có được ghi đè không. Ghi lạc quan: client phải trích dẫn `updatedAt` của bản cloud đã thấy
 * (null nếu chưa có). Không khớp = thiết bị khác đã ghi sau đó, trả 409 để client hỏi người chơi thay vì ghi đè im lặng.
 */
export function decideCloudSaveWrite(existing: { updatedAt: string } | null, expectedUpdatedAt: unknown, candidate: unknown): CloudSaveWriteDecision {
  if (expectedUpdatedAt !== null && typeof expectedUpdatedAt !== 'string') return { ok: false, status: 400, message: 'expectedUpdatedAt phải là chuỗi hoặc null.' };
  const validation = validateSaveGameData(candidate);
  if (!validation.valid || !validation.data) return { ok: false, status: 400, message: validation.error ?? 'Bản lưu không hợp lệ.' };
  if ((existing?.updatedAt ?? null) !== expectedUpdatedAt) return { ok: false, status: 409, message: 'Bản lưu cloud đã thay đổi từ thiết bị khác.' };
  return { ok: true };
}

const collection = async () => (await connectDatabase()).collection<CloudSaveDoc>('cloud_saves');

export const cloudSaveRepository = {
  async get(uid: string): Promise<{ save: SaveGameData; summary: CloudSaveSummary } | null> {
    const doc = await (await collection()).findOne({ _id: uid });
    return doc ? { save: doc.save, summary: summarizeCloudSave(doc.save, doc.updatedAt) } : null;
  },
  async put(uid: string, save: SaveGameData, expectedUpdatedAt: string | null): Promise<CloudSaveSummary | { conflict: CloudSaveSummary | null }> {
    const coll = await collection();
    const updatedAt = new Date().toISOString();
    const doc: CloudSaveDoc = { _id: uid, save, updatedAt };
    if (expectedUpdatedAt === null) {
      try {
        await coll.insertOne(doc);
      } catch (err) {
        if ((err as { code?: number }).code === 11000) return { conflict: await currentSummary(uid) };
        throw err;
      }
    } else {
      const res = await coll.replaceOne({ _id: uid, updatedAt: expectedUpdatedAt }, doc);
      if (res.matchedCount === 0) return { conflict: await currentSummary(uid) };
    }
    return summarizeCloudSave(save, updatedAt);
  },
};

async function currentSummary(uid: string): Promise<CloudSaveSummary | null> {
  const doc = await (await collection()).findOne({ _id: uid });
  return doc ? summarizeCloudSave(doc.save, doc.updatedAt) : null;
}
