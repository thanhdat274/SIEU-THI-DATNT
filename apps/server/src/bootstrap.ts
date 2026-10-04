import 'reflect-metadata';
import {
  BadRequestException, Body, Controller, Delete, Get, Module, Param, Post, Req,
  HttpException, HttpStatus, Put, ServiceUnavailableException, UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { isSaveGameData, type GameAccount, type SaveGameData } from '@game/shared';
import { generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, GameSimulation, validateStoreLayout, WorldRuntime } from '@game/core';
import { readRuntimeConfig } from './runtime-config.js';
import { checkSaveInvariants } from './save-invariants.js';
import { commitLimiter, httpIpLimiter, MAX_HTTP_BODY } from './rate-limit.js';
import { closeDatabase, connectDatabase } from './database.js';
import { migrateWorldSaves } from './world-migrations.js';
import { createWebSocketTicket, verifyAccount } from './firebase-admin.js';
import { FirebaseAuthGuard } from './auth.guard.js';
import { worldRepository } from './world.repository.js';
import { cloudSaveRepository, decideCloudSaveWrite } from './cloud-save.js';
import { WorldGateway } from './world.gateway.js';

interface AuthenticatedRequest {
  gameAccount: Awaited<ReturnType<typeof verifyAccount>>;
}

class HealthController {
  health() { return { status: 'ok', service: 'tap-hoa-server', protocolVersion: 1 }; }
  async readiness() {
    try {
      const db = await connectDatabase();
      await db.command({ ping: 1 });
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable or not configured');
    }
  }
}
Controller()(HealthController);
Get('health')(HealthController.prototype, 'health', Object.getOwnPropertyDescriptor(HealthController.prototype, 'health')!);
Get('ready')(HealthController.prototype, 'readiness', Object.getOwnPropertyDescriptor(HealthController.prototype, 'readiness')!);

/** Loại lệnh được commit. Chỉ một phần được server phát lại; phần còn lại vẫn tin save client (I-01, xem THONG-KE.md). */
const ALLOWED_COMMAND_TYPES: ReadonlySet<string> = new Set([
  'respond_party_order', 'fulfill_party_order', 'claim_goal', 'claim_weekly_quest', 'claim_festival_goal', 'begin_story_chapter', 'claim_story_chapter', 'choose_perk', 'set_title', 'layout_batch', 'repay_customer_credit', 'clean_dining_table', 'assign_dining_cleanup', 'start_production',
  'set_price', 'set_restock_options', 'restock', 'unstock', 'buy_stall', 'claim_quest',
  'checkout',
  'hire_staff', 'set_staff_shift', 'assign_refill_job', 'dispose_stock', 'open_case', 'buy_plot', 'order_supplier', 'layout_move', 'layout_store', 'layout_retrieve', 'maintain_fixture', 'security_action',
  'buy_warehouse_tier', 'buy_storage_rack',
  'store_status', 'set_tax_declaration', 'advance_day', 'stow', 'stow_all', 'planogram_assignment', 'planogram_restock', 'auto_restock',
  'open_branch', 'switch_branch', 'transfer_stock', 'return_stock', 'set_branch_policy',
]);

export class GameController {
  me(request: AuthenticatedRequest) {
    const account: GameAccount = { id: request.gameAccount.uid, displayName: request.gameAccount.name ?? request.gameAccount.email ?? request.gameAccount.uid, photoUrl: null, createdAt: new Date().toISOString() };
    return { account };
  }
  listWorlds(request: AuthenticatedRequest) { return worldRepository.list(request.gameAccount.uid); }
  createWorld(request: AuthenticatedRequest, body: { name?: unknown }) {
    if (body?.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length > 48)) throw new BadRequestException('name must be a string up to 48 characters');
    return worldRepository.create(request.gameAccount, typeof body?.name === 'string' ? body.name : 'Hẻm mới');
  }
  getWorld(request: AuthenticatedRequest, worldId: string) { return worldRepository.getForMember(worldId, request.gameAccount.uid); }
  createInvite(request: AuthenticatedRequest, worldId: string) { return worldRepository.createInvite(worldId, request.gameAccount.uid); }
  revokeInvite(request: AuthenticatedRequest, worldId: string, inviteId: string) { return worldRepository.revokeInvite(worldId, request.gameAccount.uid, inviteId); }
  joinWorld(request: AuthenticatedRequest, body: { token?: unknown }) {
    if (typeof body?.token !== 'string' || body.token.length > 128) throw new BadRequestException('token must be a string up to 128 characters');
    return worldRepository.join(request.gameAccount, body.token);
  }
  async kickMember(request: AuthenticatedRequest, worldId: string, memberId: string) {
    const res = await worldRepository.kick(worldId, request.gameAccount.uid, memberId);
    WorldGateway.kickMemberSession(worldId, memberId, 'Bị mời ra khỏi hẻm');
    return res;
  }
  async leaveWorld(request: AuthenticatedRequest, worldId: string) {
    const res = await worldRepository.leave(worldId, request.gameAccount.uid);
    WorldGateway.kickMemberSession(worldId, request.gameAccount.uid, 'Đã rời khỏi hẻm');
    return res;
  }
  resetWorld(request: AuthenticatedRequest, worldId: string, body: { confirmation?: unknown }) {
    if (body?.confirmation !== worldId) throw new BadRequestException('confirmation must equal worldId');
    return worldRepository.reset(worldId, request.gameAccount.uid);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON body, validated field by field below
  async commitCommand(request: AuthenticatedRequest, worldId: string, body: any) {
    if (!commitLimiter.take(request.gameAccount.uid)) {
      throw new HttpException('Gửi lệnh quá nhanh, vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!body || typeof body !== 'object' || typeof body.expectedRevision !== 'number' || !body.receipt || !body.updatedBusiness) {
      throw new BadRequestException('Invalid commitCommand payload');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- command payload shape depends on command type
    let payload: any;
    try { payload = JSON.parse(body.receipt.payloadJson); } catch { throw new BadRequestException('Command payload is not valid JSON'); }
    const commandWorld = await worldRepository.getForMember(worldId, request.gameAccount.uid);
    const commandBusiness = commandWorld.businesses.find((business) => business.id === body.updatedBusiness.id);
    if (!commandBusiness) throw new BadRequestException('Business is not part of this world.');
    if (JSON.stringify(commandBusiness.ownerAccountIds) !== JSON.stringify(body.updatedBusiness.ownerAccountIds) || body.updatedBusiness.save?.id !== commandBusiness.save.id) {
      throw new BadRequestException('Command cannot change business ownership or save identity.');
    }
    // Danh sách loại lệnh được phép commit: gồm cả lệnh client đang gửi nhưng server chưa phát lại (I-01), để chặn loại lệnh lạ.
    if (typeof payload?.type !== 'string' || !ALLOWED_COMMAND_TYPES.has(payload.type)) {
      throw new BadRequestException('Loại lệnh không được hỗ trợ.');
    }
    const serverReplayedCommands = new Set([
      'checkout', 'repay_customer_credit', 'clean_dining_table', 'assign_dining_cleanup', 'start_production', 'respond_party_order', 'fulfill_party_order', 'claim_goal',
      'claim_weekly_quest', 'claim_festival_goal', 'begin_story_chapter', 'claim_story_chapter', 'choose_perk', 'set_title', 'maintain_fixture', 'security_action',
      'order_supplier', 'buy_stall', 'dispose_stock', 'open_case', 'claim_quest',
      'restock', 'unstock', 'set_price', 'set_restock_options',
      'hire_staff', 'set_staff_shift', 'assign_refill_job',
      'buy_plot', 'buy_warehouse_tier', 'buy_storage_rack',
      'store_status', 'set_tax_declaration', 'advance_day', 'stow', 'stow_all', 'planogram_assignment', 'planogram_restock', 'auto_restock',
      'open_branch', 'switch_branch', 'transfer_stock', 'return_stock', 'set_branch_policy',
    ]);
    if (serverReplayedCommands.has(payload?.type)) {
      const priorReceipt = await worldRepository.findReceipt(worldId, request.gameAccount.uid, body.receipt.commandId);
      if (priorReceipt) {
        if (priorReceipt.payloadJson !== body.receipt.payloadJson) throw new BadRequestException('Trùng mã lệnh với nội dung khác.');
        return {
          committed: true,
          revision: commandWorld.world.revision,
          receipt: priorReceipt,
          updatedBusiness: commandBusiness,
        };
      }
      const runtime = new WorldRuntime(commandWorld.world, commandBusiness);
      const commandResult = await runtime.executeCommand(request.gameAccount.uid, {
        protocolVersion: typeof body.protocolVersion === 'number' ? body.protocolVersion : commandWorld.world.protocolVersion,
        worldId,
        businessId: commandBusiness.id,
        commandId: body.receipt.commandId,
        expectedRevision: body.expectedRevision,
        payload,
      });
      if (commandResult.status !== 'accepted') throw new BadRequestException(commandResult.reason ?? 'Lệnh không hợp lệ hoặc trạng thái đã thay đổi.');
      const canonicalSave = runtime.getSnapshot().businesses[0].save;
      canonicalSave.id = commandBusiness.save.id;
      canonicalSave.revision = body.expectedRevision + 1;
      canonicalSave.updatedAt = new Date().toISOString();
      body.updatedBusiness = {
        ...commandBusiness,
        ownerAccountIds: [...commandBusiness.ownerAccountIds],
        save: canonicalSave,
      };
    }
    const normalizeLayout = (save: SaveGameData) => ({
      ...save.storeLayout,
      storedFixtures: save.storeLayout.storedFixtures ?? [],
      unlockedPlotIds: save.storeLayout.unlockedPlotIds ?? [],
    });
    // Chỉ so hình học bố cục: save mới tạo chưa có `stockLots`, simulation chuẩn hóa thêm khi replay, không phải đổi bố cục.
    const layoutGeometry = (save: SaveGameData) => {
      const layout = normalizeLayout(save);
      const place = (f: ReturnType<typeof normalizeLayout>['fixtures'][number]) => ({ id: f.id, type: f.type, tileX: f.tileX, tileY: f.tileY, widthTiles: f.widthTiles, heightTiles: f.heightTiles, rotation: f.rotation });
      return {
        widthTiles: layout.widthTiles,
        heightTiles: layout.heightTiles,
        fixtures: layout.fixtures.map(place),
        storedFixtures: layout.storedFixtures.map((f) => f.id),
        unlockedPlotIds: layout.unlockedPlotIds,
      };
    };
    if (payload?.type === 'layout_batch') {
      const currentBusiness = commandBusiness;
      const nextSave = body.updatedBusiness.save as SaveGameData | undefined;
      // Any member of the shared alley may rearrange the shop and buy plots (getForMember already proved membership).
      if (!currentBusiness || !commandWorld.world.memberships.some((member) => member.accountId === request.gameAccount.uid)) throw new BadRequestException('Chỉ thành viên của hẻm được sửa bố cục cửa hàng.');
      if (!Array.isArray(payload.actions) || !isSaveGameData(nextSave) || currentBusiness.save.worldTime.isStoreOpen || (currentBusiness.save.customers ?? (currentBusiness.save.customer ? [currentBusiness.save.customer] : [])).some((customer) => customer.stage !== 'leaving') || (currentBusiness.save.staff ?? []).some((staff) => !!staff.workerTask || !!staff.diningTask)) {
        throw new BadRequestException('Cửa hàng phải đóng, không còn khách phục vụ hoặc nhân viên đang làm việc.');
      }
      const normalizedCurrent = { ...currentBusiness.save, schemaVersion: 3, storeLayout: normalizeLayout(currentBusiness.save) } as SaveGameData;
      const mapFor = (ids: readonly string[]) => generateStarterTileMap(ids);
      const headlessInput = { getMovementVector: () => ({ x: 0, y: 0 }), consumeInteract: () => false, consumeInventoryToggle: () => false };
      const canonicalSave = new GameSimulation(normalizedCurrent, mapFor(normalizedCurrent.storeLayout.unlockedPlotIds ?? []), headlessInput)
        .exportSaveData(normalizedCurrent.id, body.expectedRevision);
      const expected = applyStoreLayoutActions(canonicalSave, payload.actions, mapFor);
      if (!expected.save) throw new BadRequestException(`Bố cục không hợp lệ: ${expected.error ?? 'unknown'}`);
      const validation = validateStoreLayout(expected.save, mapFor(expected.save.storeLayout.unlockedPlotIds ?? []));
      if (validation.error) throw new BadRequestException(`Bố cục không hợp lệ: ${validation.error}`);
      expected.save.id = currentBusiness.save.id;
      expected.save.revision = body.expectedRevision + 1;
      expected.save.updatedAt = new Date().toISOString();
      // Persist the server-replayed result, never arbitrary client fields from the submitted snapshot.
      body.updatedBusiness = { ...body.updatedBusiness, ownerAccountIds: [...currentBusiness.ownerAccountIds], save: expected.save };
    } else {
      const nextSave = body.updatedBusiness.save as SaveGameData | undefined;
      const sameLayout = () => {
        if (!isSaveGameData(nextSave)) return false;
        const submitted = JSON.stringify(layoutGeometry(nextSave));
        if (JSON.stringify(layoutGeometry(commandBusiness.save)) === submitted) return true;
        // Save cũ/seed chưa qua simulation: lần load đầu migrate thêm fixture mặc định (kho...), nên so với bản đã chuẩn hóa.
        const baseline = new GameSimulation(
          { ...commandBusiness.save, schemaVersion: 3, storeLayout: normalizeLayout(commandBusiness.save) } as SaveGameData,
          generateStarterTileMap(commandBusiness.save.storeLayout.unlockedPlotIds ?? []),
          { getMovementVector: () => ({ x: 0, y: 0 }), consumeInteract: () => false, consumeInventoryToggle: () => false },
        ).exportSaveData(commandBusiness.save.id, body.expectedRevision);
        return JSON.stringify(layoutGeometry(baseline)) === submitted;
      };
      // Lệnh server tự phát lại (vd. buy_plot mở đất/tiệm xôi) tạo save chuẩn ngay tại server nên được phép đổi bố cục; chỉ save do client gửi mới phải giữ nguyên bố cục.
      if (!serverReplayedCommands.has(payload.type) && !sameLayout()) {
        throw new BadRequestException('Thay đổi bố cục phải dùng layout_batch đã kiểm tra.');
      }
      // Lệnh chưa được server phát lại: không tin tuyệt đối save client, kiểm bất biến so với save đã lưu (I-01, hướng B).
      if (!serverReplayedCommands.has(payload.type)) {
        const violation = checkSaveInvariants(commandBusiness.save, nextSave as SaveGameData, payload.type, payload);
        if (violation) throw new BadRequestException(`Save không hợp lệ: ${violation}`);
      }
    }
    const result = await worldRepository.commitCommand({
      worldId,
      actorId: request.gameAccount.uid,
      expectedRevision: body.expectedRevision,
      protocolVersion: typeof body.protocolVersion === 'number' ? body.protocolVersion : undefined,
      receipt: body.receipt,
      updatedBusiness: body.updatedBusiness,
      activity: body.activity,
    });
    // Push instant world:update to all WS clients (skip if no WS clients connected)
    if (result.committed) {
      WorldGateway.notifyCommit(worldId, { revision: result.revision, receipt: result.receipt });
    }
    return payload?.type === 'layout_batch' || serverReplayedCommands.has(payload?.type)
      ? { ...result, updatedBusiness: body.updatedBusiness }
      : result;
  }
  leaderboard(request: AuthenticatedRequest) {
    return worldRepository.leaderboard(request.gameAccount.uid);
  }
  async createWebSocketTicket(request: AuthenticatedRequest) {
    const account = request.gameAccount;
    return { ticket: await createWebSocketTicket(account.uid) };
  }
  listActivities(request: AuthenticatedRequest, worldId: string) {
    const rawUrl = (request as { url?: string }).url;
    const qIndex = rawUrl ? rawUrl.indexOf('?') : -1;
    const qs = qIndex >= 0 ? rawUrl!.slice(qIndex + 1) : '';
    const params = new URLSearchParams(qs);
    const lastSeenParam = params.get('lastSeenRevision');
    const limitParam = params.get('limit');
    const lastSeenRevision = lastSeenParam ? parseInt(lastSeenParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    return worldRepository.listActivities(worldId, request.gameAccount.uid, {
      lastSeenRevision: Number.isFinite(lastSeenRevision) ? lastSeenRevision : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }
  /** GET /game/save — bản lưu cloud của tài khoản (null nếu chưa có). */
  async getCloudSave(request: AuthenticatedRequest) {
    return (await cloudSaveRepository.get(request.gameAccount.uid)) ?? { save: null, summary: null };
  }
  /** PUT /game/save — ghi lạc quan theo `expectedUpdatedAt`; 409 kèm tóm tắt bản hiện có khi lệch. */
  async putCloudSave(request: AuthenticatedRequest, body: { save?: unknown; expectedUpdatedAt?: unknown }) {
    if (!commitLimiter.take(request.gameAccount.uid)) throw new HttpException('Gửi lệnh quá nhanh, vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS);
    const expected = body?.expectedUpdatedAt === undefined ? null : body.expectedUpdatedAt;
    const current = await cloudSaveRepository.get(request.gameAccount.uid);
    const decision = decideCloudSaveWrite(current ? { updatedAt: current.summary.updatedAt } : null, expected, body?.save);
    if (!decision.ok) {
      if (decision.status === 409) throw new HttpException({ statusCode: 409, message: decision.message, current: current?.summary ?? null }, HttpStatus.CONFLICT);
      throw new BadRequestException(decision.message);
    }
    const result = await cloudSaveRepository.put(request.gameAccount.uid, body.save as SaveGameData, expected as string | null);
    if ('conflict' in result) throw new HttpException({ statusCode: 409, message: 'Bản lưu cloud đã thay đổi từ thiết bị khác.', current: result.conflict }, HttpStatus.CONFLICT);
    return { summary: result };
  }
  /** POST /worlds/:worldId/session — records member's lastSeenRevision for absence tracking */
  touchSession(request: AuthenticatedRequest, worldId: string) {
    return worldRepository.touchSession(worldId, request.gameAccount.uid);
  }
}
Controller('api/v1')(GameController);
UseGuards(FirebaseAuthGuard)(GameController);
const game = GameController.prototype;
const route = (decorator: (path?: string) => MethodDecorator, method: keyof GameController, path?: string) => decorator(path)(game, method, Object.getOwnPropertyDescriptor(game, method)!);
const requestParam = (method: keyof GameController, index: number) => Req()(game, method, index);
const bodyParam = (method: keyof GameController, index: number) => Body()(game, method, index);
const namedParam = (method: keyof GameController, name: string, index: number) => Param(name)(game, method, index);
route(Get, 'me', 'me'); requestParam('me', 0);
route(Get, 'listWorlds', 'worlds'); requestParam('listWorlds', 0);
route(Get, 'leaderboard', 'leaderboard'); requestParam('leaderboard', 0);
route(Post, 'createWorld', 'worlds'); requestParam('createWorld', 0); bodyParam('createWorld', 1);
route(Get, 'getWorld', 'worlds/:worldId'); requestParam('getWorld', 0); namedParam('getWorld', 'worldId', 1);
route(Post, 'createInvite', 'worlds/:worldId/invites'); requestParam('createInvite', 0); namedParam('createInvite', 'worldId', 1);
route(Delete, 'revokeInvite', 'worlds/:worldId/invites/:inviteId'); requestParam('revokeInvite', 0); namedParam('revokeInvite', 'worldId', 1); namedParam('revokeInvite', 'inviteId', 2);
route(Post, 'joinWorld', 'worlds/join'); requestParam('joinWorld', 0); bodyParam('joinWorld', 1);
route(Delete, 'kickMember', 'worlds/:worldId/members/:memberId'); requestParam('kickMember', 0); namedParam('kickMember', 'worldId', 1); namedParam('kickMember', 'memberId', 2);
route(Delete, 'leaveWorld', 'worlds/:worldId/membership'); requestParam('leaveWorld', 0); namedParam('leaveWorld', 'worldId', 1);
route(Post, 'resetWorld', 'worlds/:worldId/reset'); requestParam('resetWorld', 0); namedParam('resetWorld', 'worldId', 1); bodyParam('resetWorld', 2);
route(Post, 'commitCommand', 'worlds/:worldId/commands'); requestParam('commitCommand', 0); namedParam('commitCommand', 'worldId', 1); bodyParam('commitCommand', 2);
route(Post, 'createWebSocketTicket', 'ws-ticket'); requestParam('createWebSocketTicket', 0);
route(Get, 'listActivities', 'worlds/:worldId/activities'); requestParam('listActivities', 0); namedParam('listActivities', 'worldId', 1);
route(Get, 'getCloudSave', 'game/save'); requestParam('getCloudSave', 0);
route(Put, 'putCloudSave', 'game/save'); requestParam('putCloudSave', 0); bodyParam('putCloudSave', 1);
route(Post, 'touchSession', 'worlds/:worldId/session'); requestParam('touchSession', 0); namedParam('touchSession', 'worldId', 1);

class RuntimeModule {
  async onApplicationShutdown() { await closeDatabase(); }
}
Module({ controllers: [HealthController, GameController], providers: [FirebaseAuthGuard, WorldGateway] })(RuntimeModule);

export async function createServer() {
  await migrateWorldSaves().then((m) => { if (m.migrated || m.failed.length) console.log(`[migrate] nâng cấp ${m.migrated}/${m.scanned} phòng, lỗi ${m.failed.length}`, m.failed); }).catch((err: unknown) => console.warn("[migrate] bỏ qua:", err instanceof Error ? err.message : err));
  const app = await NestFactory.create<NestExpressApplication>(RuntimeModule, { logger: ['error', 'warn', 'log'], bodyParser: false });
  // Thân JSON có giới hạn tường minh (save đầy đủ + sổ cái), thay cho mặc định ngầm của Express.
  app.useBodyParser('json', { limit: MAX_HTTP_BODY });
  // Giới hạn theo IP trước khi xác thực (bảo vệ bước verify token Firebase). Sau reverse proxy cần cấu hình trust proxy riêng.
  app.use((req: { ip?: string; socket?: { remoteAddress?: string } }, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
    if (httpIpLimiter.take(req.ip ?? req.socket?.remoteAddress ?? 'unknown')) return next();
    res.status(429).json({ statusCode: 429, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' });
  });
  app.useWebSocketAdapter(new WsAdapter(app));
  return app;
}

async function main() {
  const config = readRuntimeConfig();
  const app = await createServer();
  app.enableShutdownHooks();
  app.enableCors({ origin: config.webOrigin, allowedHeaders: ['Content-Type', 'Authorization'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] });
  await app.listen(config.port, config.host);
  console.log(`Server listening on ${config.host}:${config.port} — WS at ws://${config.host}:${config.port}/ws`);
}

if (require.main === module) void main().catch(() => {
  console.error('Server startup failed. Check runtime configuration.');
  process.exitCode = 1;
});
