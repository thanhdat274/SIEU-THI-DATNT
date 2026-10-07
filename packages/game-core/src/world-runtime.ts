import { GameWorld, BusinessState, GameSnapshot, GameInputIntent, GameAvatar, Direction, MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { GameSimulation } from './simulation';
import { WorldAvatarController } from './avatars';
import { GameCommandCoordinator, CommandResult } from './commands';
import { FixedStepSimulationRunner } from './runner';
import { generateStarterTileMap, NEIGHBORHOOD_WALK_BOUNDS } from '@game/data';
import { applyStoreLayoutActions, moveStoreFixture, retrieveStoreFixture, storeFixture, buyWarehouseTier, buyStorageRack } from './store-layout';

/** Trần tốc độ chấp nhận khi client báo vị trí (đi bộ 130 px/s, chừa dư cho chạy/lag). */
const MAX_REPORTED_SPEED = 600;

/** Cửa nhà của từng người chơi theo thứ tự trong hẻm (chủ hẻm trước). Client và server phải dùng cùng bảng này để ngày chỉ chuyển khi mọi người đã về đúng nhà. */
export const COOP_HOME_DOOR_TILES: ReadonlyArray<{ x: number; y: number }> = [{ x: 3, y: 12 }, { x: 5, y: 12 }];

export interface WorldRuntimeOptions {
  heartbeatTimeoutMs?: number;
  checkpointIntervalSeconds?: number;
  onCheckpoint?: (world: GameWorld, business: BusinessState) => Promise<void> | void;
}

export interface ActiveTimeVote {
  type: 'advance_day' | 'change_speed';
  targetSpeed?: number;
  initiatedBy: string;
  initiatedAtMs: number;
  expiresAtMs: number;
  approvals: Set<string>;
}

export class WorldRuntime {
  private readonly simulation: GameSimulation;
  private readonly avatarController: WorldAvatarController;
  private readonly commandCoordinator: GameCommandCoordinator;
  private readonly runner: FixedStepSimulationRunner;
  private readonly activeSessions = new Map<string, { lastHeartbeatMs: number }>();
  private activeTimeVote: ActiveTimeVote | null = null;
  private readonly heartbeatTimeoutMs: number;
  private readonly checkpointIntervalSeconds: number;
  private readonly positionReportedAt = new Map<string, number>();
  private timeSinceLastCheckpoint = 0;
  private isPaused = true;
  private currentWorld: GameWorld;
  private currentBusiness: BusinessState;
  private readonly onCheckpoint?: (world: GameWorld, business: BusinessState) => Promise<void> | void;

  constructor(
    world: GameWorld,
    business: BusinessState,
    options: WorldRuntimeOptions = {}
  ) {
    this.currentWorld = structuredClone(world);
    this.currentBusiness = structuredClone(business);
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15000;
    this.checkpointIntervalSeconds = options.checkpointIntervalSeconds ?? 5;
    this.onCheckpoint = options.onCheckpoint;

    const tileMap = generateStarterTileMap(business.save.storeLayout.unlockedPlotIds ?? [], [], business.save.storeLayout.buildingPlacements);
    const headlessInput = {
      getMovementVector: () => ({ x: 0, y: 0 }),
      consumeInteract: () => false,
      consumeInventoryToggle: () => false,
    };
    this.simulation = new GameSimulation(
      this.currentBusiness.save,
      tileMap,
      headlessInput
    );

    this.avatarController = new WorldAvatarController(
      this.currentWorld.avatars,
      tileMap,
      this.currentBusiness.save.storeLayout.fixtures
    );

    const memberIds = this.currentWorld.memberships.map((m) => m.accountId);
    this.commandCoordinator = new GameCommandCoordinator(
      this.currentWorld.id,
      new Set(this.currentWorld.businessIds),
      memberIds,
      this.currentWorld.revision
    );

    this.runner = new FixedStepSimulationRunner(this.simulation);

    // Server giữ đồng hồ/lịch ngày chung (mở cửa, đóng cửa, kiểm kê, ngủ rồi sang ngày); client chỉ nhận.
    this.simulation.setCoopMode(true);
    this.currentWorld.avatars.forEach((avatar, index) => this.registerCoopAvatar(avatar, index));
  }

  private registerCoopAvatar(avatar: GameAvatar, index: number): void {
    const homeDoorTile = COOP_HOME_DOOR_TILES[Math.min(index, COOP_HOME_DOOR_TILES.length - 1)];
    this.simulation.registerCoopPlayer({ playerId: avatar.accountId, homeDoorTile } as Parameters<GameSimulation['registerCoopPlayer']>[0]);
    this.simulation.setCoopPlayerPosition(avatar.accountId, { ...avatar.position });
  }

  /** Đưa vị trí/trạng thái online thật của từng người vào lịch ngày; người offline được tự về nhà để ngày không kẹt. */
  private feedCoopInputs(): void {
    this.currentWorld.avatars.forEach((avatar, index) => {
      const online = this.activeSessions.has(avatar.accountId);
      this.simulation.setCoopPlayerOnline(avatar.accountId, online);
      if (online) {
        this.simulation.setCoopPlayerPosition(avatar.accountId, { ...avatar.position });
      } else {
        // Người offline đứng ở cửa nhà riêng của mình để ngày không kẹt.
        const door = COOP_HOME_DOOR_TILES[Math.min(index, COOP_HOME_DOOR_TILES.length - 1)];
        this.simulation.setCoopPlayerPosition(avatar.accountId, { x: (door.x + 0.5) * 32, y: (door.y + 0.5) * 32 });
      }
    });
  }

  registerSession(accountId: string, nowMs = Date.now()): boolean {
    const isMember = this.currentWorld.memberships.some((m) => m.accountId === accountId);
    if (!isMember) return false;

    this.activeSessions.set(accountId, { lastHeartbeatMs: nowMs });
    this.avatarController.resetInputSession(accountId);
    if (this.isPaused) {
      this.isPaused = false;
    }
    return true;
  }

  /**
   * Adopts members/avatars that joined through HTTP after this runtime was loaded.
   * Without this the runtime keeps a stale member list: the new member's socket is
   * refused and every checkpoint overwrites `world.avatars`, erasing their avatar.
   */
  syncMembers(world: GameWorld): void {
    for (const membership of world.memberships) {
      if (this.currentWorld.memberships.some((m) => m.accountId === membership.accountId)) continue;
      this.currentWorld.memberships.push(structuredClone(membership));
      this.commandCoordinator.addMember(membership.accountId);
    }
    for (const avatar of world.avatars) {
      if (this.currentWorld.avatars.some((a) => a.accountId === avatar.accountId)) continue;
      this.currentWorld.avatars.push(structuredClone(avatar));
      this.avatarController.addAvatar(avatar);
      this.registerCoopAvatar(avatar, this.currentWorld.avatars.length - 1);
    }
  }

  getRevision(): number { return this.currentWorld.revision; }

  /**
   * Client báo vị trí thật của chính mình (mô phỏng chạy trên máy họ, nên server không tự suy ra từ input).
   * Chỉ nhận trong vùng đi được và giới hạn quãng nhảy theo thời gian; sai thì bỏ qua và giữ vị trí cũ.
   */
  reportPosition(accountId: string, position: { x: number; y: number }, direction: unknown, nowMs = Date.now()): GameAvatar | null {
    if (!this.activeSessions.has(accountId) || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
    const bounds = NEIGHBORHOOD_WALK_BOUNDS;
    if (position.x < bounds.x0 || position.x > bounds.x1 || position.y < bounds.y0 || position.y > bounds.y1) return null;
    const index = this.currentWorld.avatars.findIndex(item => item.accountId === accountId);
    if (index < 0) return null;
    const current = this.currentWorld.avatars[index];
    const lastAt = this.positionReportedAt.get(accountId);
    const dtSeconds = lastAt === undefined ? Infinity : Math.max(0, (nowMs - lastAt) / 1000);
    if (dtSeconds <= 1.5) {
      const maxJump = MAX_REPORTED_SPEED * dtSeconds + 48;
      if (Math.hypot(position.x - current.position.x, position.y - current.position.y) > maxJump) return null;
    }
    const facing: Direction = direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right' ? direction : current.direction;
    const next: GameAvatar = { ...current, position: { x: position.x, y: position.y }, direction: facing, updatedAt: new Date(nowMs).toISOString() };
    this.currentWorld.avatars[index] = next;
    this.positionReportedAt.set(accountId, nowMs);
    return { ...next, position: { ...next.position } };
  }

  getAvatars(): GameAvatar[] {
    return structuredClone(this.currentWorld.avatars);
  }

  /**
   * Nhận trạng thái đã commit qua HTTP. Không có bước này runtime giữ save/revision cũ, nên snapshot 0,5 giây
   * gửi cho mọi người là dữ liệu cũ (bạn cùng hẻm không thấy hàng/tiền mới) và checkpoint ghi đè ngược.
   */
  adoptCommitted(revision: number, business: BusinessState, force = false): boolean {
    if (!force && revision <= this.currentWorld.revision) return false;
    this.simulation.importSaveData(structuredClone(business.save));
    this.avatarController.updateMap(generateStarterTileMap(this.simulation.getUnlockedPlotIds(), [], this.simulation.getBuildingPlacements()), this.simulation.getFixtures());
    this.currentWorld.revision = revision;
    this.commandCoordinator.setRevision(revision, force);
    this.currentBusiness = structuredClone(business);
    this.currentBusiness.save = this.simulation.exportSaveData(business.save.id, revision);
    this.currentWorld.worldTime = this.simulation.getTime();
    this.currentWorld.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Có người rời hẻm (đóng tab, mất kết nối) khi đang bỏ phiếu: không hủy phiếu mà xét lại ngay với những người còn lại.
   * Mọi người còn lại đã đồng ý (vd người kia out, chỉ còn người đề nghị) thì thực hiện tức thì; không còn ai đã đồng ý thì hủy.
   * Kết quả để `takeVoteChange` giao cho gateway phát lại cho máy khách.
   */
  private resolveVoteAfterLeave(): void {
    const vote = this.activeTimeVote;
    if (!vote) return;
    const remaining = [...this.activeSessions.keys()];
    if (remaining.length === 0) { this.activeTimeVote = null; return; }
    if (!remaining.every((id) => vote.approvals.has(id))) {
      // Người đề nghị đã rời mà người còn lại chưa đồng ý: phiếu mồ côi, hủy.
      if (!remaining.some((id) => vote.approvals.has(id))) { this.activeTimeVote = null; this.voteChange = { executed: false, status: 'rejected' }; }
      return;
    }
    this.activeTimeVote = null;
    if (vote.type === 'advance_day') this.simulation.getClock().advanceToNextDay();
    else if (vote.type === 'change_speed' && typeof vote.targetSpeed === 'number') this.simulation.getClock().setTimeScale(vote.targetSpeed * 90);
    this.triggerCheckpoint();
    this.voteChange = { executed: true, status: 'executed' };
  }

  private voteChange: { executed: boolean; status: 'executed' | 'rejected' } | null = null;

  /** Phiếu vừa được tự thực hiện/hủy do có người rời (một lần); gateway dùng để báo cho máy khách còn lại. */
  takeVoteChange(): { executed: boolean; status: 'executed' | 'rejected' } | null {
    const change = this.voteChange;
    this.voteChange = null;
    return change;
  }

  unregisterSession(accountId: string): void {
    this.activeSessions.delete(accountId);
    this.resolveVoteAfterLeave();
    if (this.activeSessions.size === 0) {
      this.isPaused = true;
      this.triggerCheckpoint();
    }
  }

  heartbeat(accountId: string, nowMs = Date.now()): boolean {
    if (!this.activeSessions.has(accountId)) return false;
    this.activeSessions.set(accountId, { lastHeartbeatMs: nowMs });
    return true;
  }

  applyInputIntent(accountId: string, input: unknown, nowMs = Date.now()): GameSnapshot | null {
    if (!this.activeSessions.has(accountId) || !input || typeof input !== 'object') return null;
    const intent = input as Partial<GameInputIntent>;
    if (!Number.isSafeInteger(intent.sequence) || !intent.direction ||
        !Number.isFinite(intent.direction.x) || !Number.isFinite(intent.direction.y)) return null;
    const avatar = this.avatarController.applyInput({
      accountId,
      sequence: intent.sequence as number,
      direction: { x: intent.direction.x, y: intent.direction.y },
    }, nowMs);
    if (!avatar) return null;
    const index = this.currentWorld.avatars.findIndex(item => item.accountId === accountId);
    if (index < 0) return null;
    this.currentWorld.avatars[index] = avatar;
    this.currentWorld.updatedAt = new Date(nowMs).toISOString();
    return this.getSnapshot();
  }

  tick(elapsedSeconds: number, nowMs = Date.now()): string[] {
    const timedOutAccounts: string[] = [];
    // 1. Check for stale sessions
    for (const [accId, session] of this.activeSessions.entries()) {
      if (nowMs - session.lastHeartbeatMs > this.heartbeatTimeoutMs) {
        this.activeSessions.delete(accId);
        timedOutAccounts.push(accId);
      }
    }
    if (timedOutAccounts.length) this.resolveVoteAfterLeave();

    // 2. Check if active time vote expired
    if (this.activeTimeVote && nowMs > this.activeTimeVote.expiresAtMs) {
      this.activeTimeVote = null;
    }

    // 3. If no active sessions, pause simulation
    if (this.activeSessions.size === 0) {
      if (!this.isPaused) {
        this.isPaused = true;
        this.triggerCheckpoint();
      }
      return timedOutAccounts;
    }

    this.isPaused = false;

    // 4. Advance simulation
    this.feedCoopInputs();
    this.runner.advance(elapsedSeconds);

    // 5. Checkpoint check
    this.timeSinceLastCheckpoint += elapsedSeconds;
    if (this.timeSinceLastCheckpoint >= this.checkpointIntervalSeconds) {
      this.timeSinceLastCheckpoint = 0;
      this.triggerCheckpoint();
    }
    return timedOutAccounts;
  }

  async executeCommand(actorId: string, commandInput: unknown): Promise<CommandResult> {
    return this.commandCoordinator.submit(actorId, commandInput, async (cmd) => {
      // Execute command on simulation
      let success = false;
      const p = cmd.payload;
      if (p.type === 'restock') {
        success = this.simulation.restockShelf(p.fixtureId, p.productId, p.quantity);
      } else if (p.type === 'unstock') {
        success = this.simulation.unstockShelf(p.fixtureId, p.quantity);
      } else if (p.type === 'checkout') {
        success = this.simulation.completeCustomerCheckout(p.checkoutId, p.fixtureId, p.onCredit ?? false, p.dineIn ?? false);
      } else if (p.type === 'repay_customer_credit') {
        success = this.simulation.repayCustomerCredit(p.creditId);
      } else if (p.type === 'start_production') {
        success = this.simulation.startProduction(p.recipeId, p.stationId).success;
      } else if (p.type === 'clean_dining_table') {
        success = this.simulation.cleanDiningTable(p.fixtureId);
      } else if (p.type === 'assign_dining_cleanup') {
        success = this.simulation.assignDiningCleanup(p.staffId, p.fixtureId);
      } else if (p.type === 'set_price') {
        success = this.simulation.setSellingPrice(p.productId, p.price).success;
      } else if (p.type === 'reset_prices') {
        // Khớp hợp đồng của client (handleResetAllSellingPrices): client commit khi reset>0 dù có khách
        // đang thanh toán phải bỏ qua (blocked). Nếu dùng .success (= blocked===0) sẽ từ chối đúng phép
        // đặt lại một phần hợp lệ → client rollback cả lô. Dùng reset>0 để server chấp nhận phần đã làm.
        success = this.simulation.resetSellingPrices().reset > 0;
      } else if (p.type === 'buy_plot') {
        success = !!this.simulation.purchaseLand(p.plotId, p.placement).save;
      } else if (p.type === 'set_restock_options') {
        this.simulation.setRestockOptions(p.options);
        success = true;
      } else if (p.type === 'auto_buy_sync') {
        // Mô phỏng của server tự đặt đơn nhập tự động khi sang ngày; máy khách chỉ báo "đã có đơn", save của nó không được tin nên không áp gì.
        success = true;
      } else if (p.type === 'set_auto_buy_config') {
        success = this.simulation.setAutoBuyConfig(p.enabled, p.rules).success;
      } else if (p.type === 'set_auto_buy_stalls') {
        this.simulation.setAutoBuyStalls(p.enabled);
        success = true;
      } else if (p.type === 'order_supplier') {
        success = this.simulation.orderSupplierCart(p.supplierId, p.items).success;
      } else if (p.type === 'buy_stall') {
        success = this.simulation.buyStall(p.stallId).success;
      } else if (p.type === 'hire_staff') {
        success = this.simulation.hireStaff(p.candidateId).success;
      } else if (p.type === 'pay_wage_debt') {
        success = this.simulation.payWageDebt().success;
      } else if (p.type === 'set_staff_shift') {
        success = this.simulation.setStaffShift(p.staffId, p.shift);
      } else if (p.type === 'assign_refill_job') {
        success = this.simulation.assignRefillJob(p.staffId, p.fixtureId).success;
      } else if (p.type === 'open_branch') {
        success = this.simulation.openBranch(p.storeType, p.name, p.branchId).success;
      } else if (p.type === 'switch_branch') {
        success = this.simulation.switchBranch(p.branchId).success;
      } else if (p.type === 'set_branch_policy') {
        success = this.simulation.setBranchPolicy(p.branchId, p.policy).success;
      } else if (p.type === 'transfer_stock') {
        success = this.simulation.transferToBranch(p.branchId, p.items).success;
      } else if (p.type === 'return_stock') {
        success = this.simulation.returnFromBranch(p.branchId, p.items).success;
      } else if (p.type === 'set_tax_declaration') {
        success = this.simulation.setTaxUnderDeclare(p.underDeclare).success;
      } else if (p.type === 'store_status') {
        success = this.simulation.setStoreOpen(p.isOpen);
      } else if (p.type === 'advance_day') {
        // Hẻm nhiều người: ngày chỉ sang khi mọi người đã ngủ (lịch ngày của server) hoặc qua bỏ phiếu thời gian, không ép bằng lệnh.
        success = this.currentWorld.memberships.length <= 1;
        if (success) this.simulation.getClock().advanceToNextDay();
      } else if (p.type === 'stow') {
        success = this.simulation.stowHoldingItem(p.holdingId).success;
      } else if (p.type === 'stow_all') {
        success = this.simulation.stowAllHolding().success;
      } else if (p.type === 'planogram_assignment') {
        success = this.simulation.setPlanogramAssignment(p.fixtureId, p.productId ?? undefined).success;
      } else if (p.type === 'planogram_restock') {
        const res = this.simulation.applyPlanogramEntry(p.fixtureId);
        success = res.applied && res.actualQuantity > 0;
      } else if (p.type === 'auto_restock') {
        // Phải khớp client (onAutoFillAll, App.tsx): châm kệ đã gán trước, rồi tự gán + bày các ô trống.
        // Server phải tính CẢ `newAssignments` (tự gán sơ đồ) — nếu không, lệnh chỉ gán ô mới chưa bày
        // đơn vị (newAssignments>0, totalFilled=0) sẽ bị tính success=false → từ chối → rollback save client.
        const refilled = this.simulation.autoRestockShelves();
        const res = this.simulation.autoFillAllShelves();
        success = refilled + res.totalFilled > 0 || res.newAssignments > 0;
      } else if (p.type === 'auto_fill_shelf') {
        const res = this.simulation.autoFillShelf(p.fixtureId);
        success = res.filled > 0 || res.assigned;
      } else if (p.type === 'dispose_stock') {
        success = this.simulation.disposeStock(p.productId, p.quantity).success;
      } else if (p.type === 'open_case') {
        success = this.simulation.unpackMultipleCases(p.productId, p.count).success;
      } else if (p.type === 'claim_quest') {
        success = this.simulation.claimQuest(p.questId).success;
      } else if (p.type === 'respond_party_order') {
        success = this.simulation.respondPartyOrder(p.orderId, p.accept).success;
      } else if (p.type === 'fulfill_party_order') {
        success = this.simulation.fulfillPartyOrder(p.orderId).success;
      } else if (p.type === 'rush_fulfill_party_order') {
        success = this.simulation.rushFulfillPartyOrder(p.orderId).success;
      } else if (p.type === 'claim_goal') {
        success = this.simulation.claimGoal(p.goalId).success;
      } else if (p.type === 'claim_weekly_quest') {
        success = this.simulation.claimWeeklyQuest(p.questId).success;
      } else if (p.type === 'claim_festival_goal') {
        success = this.simulation.claimFestivalGoal(p.goalId).success;
      } else if (p.type === 'begin_story_chapter') {
        success = this.simulation.beginStoryChapter(p.chapterId).success;
      } else if (p.type === 'claim_story_chapter') {
        success = this.simulation.claimStoryChapter(p.chapterId).success;
      } else if (p.type === 'choose_perk') {
        success = this.simulation.chooseSkillPerk(p.perkId).success;
      } else if (p.type === 'set_title') {
        success = this.simulation.setActiveTitle(p.titleId).success;
      } else if (p.type === 'maintain_fixture') {
        success = this.simulation.maintainFixture(p.fixtureId, p.action).success;
      } else if (p.type === 'maintain_all_service') {
        success = this.simulation.maintainAllServices().success;
      } else if (p.type === 'security_action') {
        success = p.action === 'buy_camera' ? this.simulation.buyCamera().success : this.simulation.setCallPolice(p.action === 'police_on').success;
      } else if (p.type === 'layout_batch') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = applyStoreLayoutActions(current, p.actions, (ids, placements) => generateStarterTileMap(ids, [], placements));
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      } else if (p.type === 'buy_warehouse_tier') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = buyWarehouseTier(current, p.tier);
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      } else if (p.type === 'buy_storage_rack') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = buyStorageRack(current);
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      }

      if (success) {
        this.avatarController.updateMap(generateStarterTileMap(this.simulation.getUnlockedPlotIds(), [], this.simulation.getBuildingPlacements()), this.simulation.getFixtures());
        this.currentWorld.revision = this.commandCoordinator.getRevision() + 1;
        this.currentBusiness.save = this.simulation.exportSaveData(
          this.currentBusiness.save.id,
          this.currentWorld.revision
        );
        this.triggerCheckpoint();
      }
      return success;
    });
  }

  /** Ghi ngay trạng thái hiện tại (tắt server, đổi phiên bản...). */
  flushCheckpoint(): void { this.triggerCheckpoint(); }

  private triggerCheckpoint(): void {
    const updatedSave = this.simulation.exportSaveData(
      this.currentBusiness.save.id,
      this.currentWorld.revision
    );
    this.currentBusiness.save = updatedSave;
    this.currentWorld.worldTime = this.simulation.getTime();
    this.currentWorld.updatedAt = new Date().toISOString();
    void this.onCheckpoint?.(this.currentWorld, this.currentBusiness);
  }

  /** Trạng thái sống chỉ làm mới tối đa mỗi 250 ms (gateway gửi snapshot 500 ms/lần; export ~1 ms). */
  private static readonly LIVE_SNAPSHOT_MIN_MS = 250;
  private lastLiveSnapshotAt = 0;

  /**
   * Snapshot lấy từ mô phỏng đang chạy, không từ checkpoint: checkpoint (ghi DB, mặc định 30 s) quá thưa nên giờ/ngày, kho, tiền
   * ở máy khách bị cũ cả chục giây, và sang ngày mới (cả hai đã ngủ) chậm tới 30 s với màn hình tối.
   */
  private refreshLiveState(): void {
    const now = Date.now();
    if (this.isPaused || now - this.lastLiveSnapshotAt < WorldRuntime.LIVE_SNAPSHOT_MIN_MS) return;
    this.lastLiveSnapshotAt = now;
    this.currentBusiness.save = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
    this.currentWorld.worldTime = this.simulation.getTime();
  }

  getSnapshot(serverTime = new Date().toISOString()): GameSnapshot {
    this.refreshLiveState();
    return {
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
      world: structuredClone(this.currentWorld),
      businesses: [structuredClone(this.currentBusiness)],
      serverTime,
      coop: { players: this.simulation.getCoopRoutineStates().map((state) => ({ accountId: state.playerId, online: state.isOnline, sleeping: state.isSleeping })) },
    };
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  getActiveTimeVote(nowMs = Date.now()): {
    type: 'advance_day' | 'change_speed';
    targetSpeed?: number;
    initiatedBy: string;
    expiresInMs: number;
    approvalsCount: number;
    totalRequired: number;
  } | null {
    if (!this.activeTimeVote) return null;
    if (nowMs > this.activeTimeVote.expiresAtMs) {
      this.activeTimeVote = null;
      return null;
    }
    return {
      type: this.activeTimeVote.type,
      targetSpeed: this.activeTimeVote.targetSpeed,
      initiatedBy: this.activeTimeVote.initiatedBy,
      expiresInMs: Math.max(0, this.activeTimeVote.expiresAtMs - nowMs),
      approvalsCount: this.activeTimeVote.approvals.size,
      totalRequired: this.activeSessions.size,
    };
  }

  submitTimeVote(
    actorId: string,
    params: { type: 'advance_day' | 'change_speed'; targetSpeed?: number },
    nowMs = Date.now()
  ): { executed: boolean; status: 'executed' | 'pending' | 'rejected'; remainingSeconds?: number } {
    if (!this.activeSessions.has(actorId)) {
      return { executed: false, status: 'rejected' };
    }

    const totalActive = this.activeSessions.size;

    // Single player case: execute immediately without vote delay
    if (totalActive <= 1) {
      if (params.type === 'advance_day') {
        this.simulation.getClock().advanceToNextDay();
      } else if (params.type === 'change_speed' && typeof params.targetSpeed === 'number') {
        this.simulation.getClock().setTimeScale(params.targetSpeed * 90);
      }
      this.triggerCheckpoint();
      return { executed: true, status: 'executed' };
    }

    // Two players active case
    if (!this.activeTimeVote || nowMs > this.activeTimeVote.expiresAtMs) {
      // Start new vote
      this.activeTimeVote = {
        type: params.type,
        targetSpeed: params.targetSpeed,
        initiatedBy: actorId,
        initiatedAtMs: nowMs,
        expiresAtMs: nowMs + 30000, // 30-second voting window
        approvals: new Set([actorId]),
      };
      return {
        executed: false,
        status: 'pending',
        remainingSeconds: 30,
      };
    }

    // Ongoing vote exists: check compatibility
    if (this.activeTimeVote.type !== params.type || this.activeTimeVote.targetSpeed !== params.targetSpeed) {
      // Different vote proposed while current is ongoing
      return { executed: false, status: 'rejected' };
    }

    // Approve ongoing vote
    this.activeTimeVote.approvals.add(actorId);

    // If all active sessions approved
    let allApproved = true;
    for (const activeId of this.activeSessions.keys()) {
      if (!this.activeTimeVote.approvals.has(activeId)) {
        allApproved = false;
        break;
      }
    }

    if (allApproved) {
      const voteType = this.activeTimeVote.type;
      const speed = this.activeTimeVote.targetSpeed;
      this.activeTimeVote = null;

      if (voteType === 'advance_day') {
        this.simulation.getClock().advanceToNextDay();
      } else if (voteType === 'change_speed' && typeof speed === 'number') {
        this.simulation.getClock().setTimeScale(speed * 90);
      }
      this.triggerCheckpoint();
      return { executed: true, status: 'executed' };
    }

    return {
      executed: false,
      status: 'pending',
      remainingSeconds: Math.ceil((this.activeTimeVote.expiresAtMs - nowMs) / 1000),
    };
  }

  cancelTimeVote(actorId: string): boolean {
    if (!this.activeTimeVote) return false;
    if (this.activeTimeVote.initiatedBy === actorId || !this.activeSessions.has(this.activeTimeVote.initiatedBy)) {
      this.activeTimeVote = null;
      return true;
    }
    return false;
  }

  getSimulation(): GameSimulation {
    return this.simulation;
  }

  getAvatarController(): WorldAvatarController {
    return this.avatarController;
  }
}
