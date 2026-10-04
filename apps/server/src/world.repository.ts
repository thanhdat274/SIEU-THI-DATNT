import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createInitialOnlineWorld, ONLINE_SPAWN_POINTS } from '@game/data';
import type { GameAccount, GameAvatar, GameWorld, WorldMembership } from '@game/shared';
import { MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { connectDatabase } from './database.js';

interface InviteRecord { id: string; tokenHash: string; createdAt: Date; expiresAt: Date; usedAt: Date | null; revokedAt: Date | null }
export interface ReceiptRecord {
  commandId: string;
  actorId: string;
  status: 'accepted' | 'rejected' | 'stale' | 'invalid' | 'forbidden' | 'duplicate_conflict';
  revision: number;
  payloadJson: string;
  createdAt: string;
}
export interface ActivityRecord {
  id: string;
  actorId: string;
  type: string;
  description: string;
  revision: number;
  createdAt: string;
}
interface WorldDocument {
  _id: string;
  world: GameWorld;
  businesses: ReturnType<typeof createInitialOnlineWorld>['business'][];
  invites: InviteRecord[];
  receipts?: ReceiptRecord[];
  activities?: ActivityRecord[];
}

const collectionName = 'game_worlds';
const hashInvite = (token: string) => createHash('sha256').update(token).digest('hex');
const accountToGame = (account: { uid: string; name: string | null; email: string | null }): Pick<GameAccount, 'id' | 'displayName' | 'photoUrl'> => ({
  id: account.uid, displayName: account.name?.trim() || account.email || account.uid, photoUrl: null,
});

export class WorldRepository {
  async create(account: { uid: string; name: string | null; email: string | null }, name: string) {
    const worldId = randomUUID();
    const seeded = createInitialOnlineWorld(accountToGame(account), worldId);
    seeded.world.name = name.trim().slice(0, 48) || 'Hẻm mới';
    const doc: WorldDocument = { _id: worldId, world: seeded.world, businesses: [seeded.business], invites: [] };
    await (await connectDatabase()).collection<WorldDocument>(collectionName).insertOne(doc);
    return { world: doc.world, businesses: doc.businesses };
  }

  async list(accountId: string) {
    const docs = await (await connectDatabase()).collection<WorldDocument>(collectionName)
      .find({ 'world.memberships.accountId': accountId }, { projection: { world: 1 } }).toArray();
    return docs.map(doc => ({ id: doc.world.id, name: doc.world.name ?? 'Hẻm', role: doc.world.memberships.find(m => m.accountId === accountId)?.role, revision: doc.world.revision }));
  }

  /**
   * Bảng xếp hạng theo tổng doanh thu của tiệm trong mỗi hẻm. Chỉ trả tên hẻm và số liệu công khai; không bao giờ trả ID tài khoản
   * hay ID hẻm. Doanh thu lấy từ save do client báo cáo (chỉ được kiểm bất biến, xem THONG-KE.md I-01) nên chưa phải số đã xác minh.
   */
  async leaderboard(accountId: string, limit = 10) {
    const cap = Math.max(1, Math.min(50, Math.floor(limit)));
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    const revenueOf = { $ifNull: [{ $arrayElemAt: ['$businesses.save.statistics.totalRevenue', 0] }, 0] };
    const withStats = {
      $addFields: {
        revenue: revenueOf,
        day: { $ifNull: [{ $arrayElemAt: ['$businesses.save.worldTime.day', 0] }, 1] },
        level: { $ifNull: [{ $arrayElemAt: ['$businesses.save.player.level', 0] }, 1] },
        members: { $size: { $ifNull: ['$world.memberships', []] } },
        mine: { $in: [accountId, { $ifNull: ['$world.memberships.accountId', []] }] },
      },
    };
    const rows = await collection.aggregate<{ _id: string; name?: string; revenue: number; day: number; level: number; members: number; mine: boolean }>([
      withStats,
      { $sort: { revenue: -1, _id: 1 } },
      { $limit: cap },
      { $project: { name: '$world.name', revenue: 1, day: 1, level: 1, members: 1, mine: 1 } },
    ]).toArray();
    const entries = rows.map((row, index) => ({
      rank: index + 1,
      name: (row.name ?? 'Hẻm').slice(0, 48),
      totalRevenue: Math.max(0, Math.floor(Number(row.revenue) || 0)),
      day: Math.max(1, Math.floor(Number(row.day) || 1)),
      level: Math.max(1, Math.floor(Number(row.level) || 1)),
      members: row.members,
      mine: row.mine,
    }));
    // Hạng của hẻm tốt nhất của người gọi nếu nằm ngoài top (cùng thứ tự: doanh thu giảm dần, hòa thì theo _id).
    let myRank: number | null = entries.find((entry) => entry.mine)?.rank ?? null;
    if (myRank === null) {
      const best = await collection.aggregate<{ _id: string; revenue: number }>([
        { $match: { 'world.memberships.accountId': accountId } },
        { $addFields: { revenue: revenueOf } },
        { $sort: { revenue: -1, _id: 1 } },
        { $limit: 1 },
        { $project: { revenue: 1 } },
      ]).next();
      if (best) {
        const ahead = await collection.aggregate<{ n: number }>([
          { $addFields: { revenue: revenueOf } },
          { $match: { $or: [{ revenue: { $gt: best.revenue } }, { revenue: best.revenue, _id: { $lt: best._id } }] } },
          { $count: 'n' },
        ]).next();
        myRank = (ahead?.n ?? 0) + 1;
      }
    }
    return { entries, myRank };
  }

  async getForMember(worldId: string, accountId: string) {
    const doc = await (await connectDatabase()).collection<WorldDocument>(collectionName)
      .findOne({ _id: worldId, 'world.memberships.accountId': accountId }, { projection: { invites: 0 } });
    if (!doc) throw new NotFoundException('Không tìm thấy hẻm hoặc bạn chưa tham gia.');
    return { world: doc.world, businesses: doc.businesses };
  }

  async findReceipt(worldId: string, actorId: string, commandId: string): Promise<ReceiptRecord | undefined> {
    const doc = await (await connectDatabase()).collection<WorldDocument>(collectionName).findOne(
      { _id: worldId, 'world.memberships.accountId': actorId, 'receipts.commandId': commandId, 'receipts.actorId': actorId },
      { projection: { receipts: 1 } }
    );
    return doc?.receipts?.find(receipt => receipt.commandId === commandId && receipt.actorId === actorId);
  }

  /** Called once when a member enters the game to record their lastSeenRevision
   * (used for absence activity filtering). Does not return world data. */
  async touchSession(worldId: string, accountId: string): Promise<{ revision: number }> {
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    const doc = await collection.findOne(
      { _id: worldId, 'world.memberships.accountId': accountId },
      { projection: { 'world.revision': 1 } }
    );
    if (!doc) throw new NotFoundException('Không tìm thấy hẻm hoặc bạn chưa tham gia.');
    const currentRevision = doc.world.revision;
    await collection.updateOne(
      { _id: worldId, 'world.memberships.accountId': accountId },
      { $set: { 'world.memberships.$[m].lastSeenRevision': currentRevision } },
      { arrayFilters: [{ 'm.accountId': accountId }] }
    );
    return { revision: currentRevision };
  }

  /** Persist runtime checkpoint (called by WorldRuntime.onCheckpoint callback) */
  async saveCheckpoint(worldId: string, world: import('@game/shared').GameWorld, business: import('@game/shared').BusinessState): Promise<void> {
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    // Update avatars element by element: a member who joined over HTTP after this
    // runtime was loaded must keep their stored avatar instead of being overwritten.
    const avatarSets: Record<string, unknown> = {};
    const avatarFilters: Record<string, string>[] = [];
    world.avatars.forEach((avatar, index) => {
      avatarSets[`world.avatars.$[a${index}]`] = avatar;
      avatarFilters.push({ [`a${index}.accountId`]: avatar.accountId });
    });
    await collection.updateOne(
      { _id: worldId, 'world.revision': world.revision },
      { $set: {
        'world.worldTime': world.worldTime,
        ...avatarSets,
        'world.updatedAt': world.updatedAt,
        'businesses.0.save': business.save,
      } },
      avatarFilters.length ? { arrayFilters: avatarFilters } : undefined
    );
  }

  async createInvite(worldId: string, accountId: string) {
    const now = new Date();
    const inviteId = randomUUID();
    const token = randomBytes(24).toString('base64url');
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    const current = await collection.findOne({ _id: worldId, 'world.memberships': { $elemMatch: { accountId, role: 'owner' } } });
    if (!current) {
      const exists = await collection.findOne({ _id: worldId }, { projection: { _id: 1 } });
      if (!exists) throw new NotFoundException('Không tìm thấy hẻm.');
      throw new ForbiddenException('Chỉ chủ hẻm mới mời được người khác.');
    }
    const result = await collection.updateOne({
      _id: worldId,
      'world.memberships': { $elemMatch: { accountId, role: 'owner' } },
      'world.memberships.1': { $exists: false },
    }, { $push: { invites: { id: inviteId, tokenHash: hashInvite(token), createdAt: now, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), usedAt: null, revokedAt: null } } });
    if (!result.modifiedCount) {
      throw new ForbiddenException('Hẻm đã đủ thành viên; không thể tạo lời mời mới.');
    }
    return { inviteId, token, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() };
  }

  async revokeInvite(worldId: string, accountId: string, inviteId: string) {
    const now = new Date();
    const result = await (await connectDatabase()).collection<WorldDocument>(collectionName).updateOne({
      _id: worldId, 'world.memberships': { $elemMatch: { accountId, role: 'owner' } },
      invites: { $elemMatch: { id: inviteId, usedAt: null, revokedAt: null } },
    }, { $set: { 'invites.$[invite].revokedAt': now } }, { arrayFilters: [{ 'invite.id': inviteId, 'invite.usedAt': null, 'invite.revokedAt': null }] });
    if (!result.modifiedCount) throw new NotFoundException('Không tìm thấy lời mời còn hiệu lực hoặc bạn không có quyền.');
    return { revoked: true };
  }

  async join(account: { uid: string; name: string | null; email: string | null }, token: string) {
    if (!token || token.length > 128) throw new ForbiddenException('Mã mời không hợp lệ.');
    const now = new Date();
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    const doc = await collection.findOneAndUpdate({
      'invites': { $elemMatch: { tokenHash: hashInvite(token), usedAt: null, revokedAt: null, expiresAt: { $gt: now } } },
      'world.memberships.accountId': { $ne: account.uid },
      'world.memberships.1': { $exists: false },
    }, {
      $set: { 'invites.$.usedAt': now },
      $push: {
        'world.memberships': { accountId: account.uid, role: 'member', joinedAt: now.toISOString(), lastSeenRevision: 0 } satisfies WorldMembership,
        'world.avatars': { accountId: account.uid, position: { ...ONLINE_SPAWN_POINTS[1] }, direction: 'up', updatedAt: now.toISOString(), displayName: (account.name?.trim() || account.email || account.uid).slice(0, 64) } satisfies GameAvatar,
      },
    }, { returnDocument: 'after', projection: { invites: 0 } });
    if (!doc) throw new ForbiddenException('Mã mời hết hạn, đã dùng, bị thu hồi hoặc hẻm đã đủ người.');
    return { world: doc.world, businesses: doc.businesses };
  }

  async kick(worldId: string, ownerId: string, memberId: string) {
    if (!memberId || ownerId === memberId) throw new ForbiddenException('Không thể loại chủ hẻm.');
    const result = await (await connectDatabase()).collection<WorldDocument>(collectionName).updateOne({
      _id: worldId, 'world.memberships': { $elemMatch: { accountId: ownerId, role: 'owner' } },
      'world.memberships.accountId': memberId,
    }, { $pull: { 'world.memberships': { accountId: memberId }, 'world.avatars': { accountId: memberId } } });
    if (!result.modifiedCount) throw new NotFoundException('Không tìm thấy thành viên hoặc bạn không có quyền.');
    return { removed: true };
  }

  async reset(worldId: string, ownerId: string) {
    const seeded = createInitialOnlineWorld({ id: ownerId, displayName: ownerId, photoUrl: null }, worldId);
    const now = new Date().toISOString();
    seeded.business.save.revision = 0;
    seeded.business.save.updatedAt = now;
    const result = await (await connectDatabase()).collection<WorldDocument>(collectionName).updateOne({
      _id: worldId, 'world.memberships': { $elemMatch: { accountId: ownerId, role: 'owner' } },
    }, {
      $set: {
        businesses: [seeded.business],
        'world.revision': 0,
        'world.worldTime': seeded.world.worldTime,
        'world.updatedAt': now,
        'world.avatars': seeded.world.avatars,
      },
      $unset: { invites: '' },
    });
    if (!result.modifiedCount) {
      const exists = await (await connectDatabase()).collection<WorldDocument>(collectionName).findOne({ _id: worldId });
      if (!exists) throw new NotFoundException('Không tìm thấy hẻm.');
      throw new ForbiddenException('Chỉ chủ hẻm mới đặt lại tiệm.');
    }
    return { reset: true, revision: 0 };
  }

  /** Chỉ chủ hẻm được xóa; xóa cả tiệm, lời mời, biên nhận và hoạt động trong cùng document. */
  async deleteWorld(worldId: string, ownerId: string) {
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    const result = await collection.deleteOne({ _id: worldId, 'world.memberships': { $elemMatch: { accountId: ownerId, role: 'owner' } } });
    if (!result.deletedCount) {
      const exists = await collection.findOne({ _id: worldId }, { projection: { _id: 1 } });
      if (!exists) throw new NotFoundException('Không tìm thấy hẻm.');
      throw new ForbiddenException('Chỉ chủ hẻm mới xóa được hẻm.');
    }
    return { deleted: true };
  }

  async leave(worldId: string, accountId: string) {
    const result = await (await connectDatabase()).collection<WorldDocument>(collectionName).updateOne({
      _id: worldId,
      'world.memberships': { $elemMatch: { accountId, role: 'member' } },
    }, { $pull: { 'world.memberships': { accountId }, 'world.avatars': { accountId } } });
    if (!result.modifiedCount) throw new NotFoundException('Không tìm thấy tư cách thành viên hoặc chỉ chủ hẻm mới có thể rời.');
    return { left: true };
  }

  async commitCommand(params: {
    worldId: string;
    actorId: string;
    expectedRevision: number;
    protocolVersion?: number;
    receipt: ReceiptRecord;
    updatedBusiness: ReturnType<typeof createInitialOnlineWorld>['business'];
    activity?: Omit<ActivityRecord, 'id' | 'createdAt'>;
  }): Promise<{ committed: boolean; revision: number; receipt: ReceiptRecord }> {
    // Protocol version gate: reject outdated clients before touching DB
    if (params.protocolVersion !== undefined && params.protocolVersion !== MULTIPLAYER_PROTOCOL_VERSION) {
      throw new BadRequestException(`Phiên bản giao thức không được hỗ trợ: ${params.protocolVersion}. Yêu cầu phiên bản ${MULTIPLAYER_PROTOCOL_VERSION}. Vui lòng cập nhật trò chơi.`);
    }
    const collection = (await connectDatabase()).collection<WorldDocument>(collectionName);
    // Toàn bộ dữ liệu hẻm nằm trong một document nên một updateOne đã nguyên tử, không cần transaction.
    const existing = await collection.findOne({
      _id: params.worldId,
      'world.memberships.accountId': params.actorId,
    });
    if (!existing) throw new NotFoundException('Không tìm thấy hẻm hoặc bạn không có quyền.');

    const priorReceipt = existing.receipts?.find(r => r.commandId === params.receipt.commandId && r.actorId === params.actorId);
    if (priorReceipt) {
      if (priorReceipt.payloadJson === params.receipt.payloadJson) {
        return { committed: true, revision: priorReceipt.revision, receipt: priorReceipt };
      }
      throw new ForbiddenException('Trùng mã lệnh với nội dung khác.');
    }
    if (existing.world.revision !== params.expectedRevision) {
      throw new ForbiddenException('Bản cập nhật không khớp revision hiện tại.');
    }

    const nextRevision = params.expectedRevision + 1;
    const now = new Date().toISOString();
    const receiptToSave: ReceiptRecord = { ...params.receipt, revision: nextRevision, createdAt: now };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic Mongo update document with positional array filters
    const updateOps: any = {
      $set: { 'world.revision': nextRevision, 'world.updatedAt': now, 'businesses.$[b]': params.updatedBusiness },
      $push: { receipts: { $each: [receiptToSave], $slice: -200 } },
    };
    if (params.activity) {
      const activityRecord: ActivityRecord = { ...params.activity, id: randomUUID(), revision: nextRevision, createdAt: now };
      updateOps.$push.activities = { $each: [activityRecord], $slice: -100 };
    }
    const result = await collection.updateOne({
      _id: params.worldId,
      'world.revision': params.expectedRevision,
      'world.memberships.accountId': params.actorId,
      receipts: { $not: { $elemMatch: { commandId: params.receipt.commandId, actorId: params.actorId } } },
    }, updateOps, { arrayFilters: [{ 'b.id': params.updatedBusiness.id }] });
    if (!result.modifiedCount) throw new ForbiddenException('Không thể lưu trạng thái do xung đột phiên bản.');
    return { committed: true, revision: nextRevision, receipt: receiptToSave };
  }

  async listActivities(
    worldId: string,
    accountId: string,
    params?: { lastSeenRevision?: number; limit?: number }
  ): Promise<{ activities: ActivityRecord[]; totalCount: number; hasMore: boolean }> {
    const doc = await (await connectDatabase()).collection<WorldDocument>(collectionName)
      .findOne({ _id: worldId, 'world.memberships.accountId': accountId }, { projection: { activities: 1 } });
    if (!doc) throw new NotFoundException('Không tìm thấy hẻm hoặc bạn không có quyền.');

    const allActivities = doc.activities || [];
    const limit = Math.min(100, Math.max(1, params?.limit ?? 100));
    
    let filtered = allActivities;
    if (typeof params?.lastSeenRevision === 'number') {
      filtered = allActivities.filter(a => a.revision > params!.lastSeenRevision!);
    }

    const totalCount = filtered.length;
    const hasMore = totalCount > limit;
    const activities = filtered.slice(-limit).reverse();

    return {
      activities,
      totalCount,
      hasMore,
    };
  }
}

export const worldRepository = new WorldRepository();
