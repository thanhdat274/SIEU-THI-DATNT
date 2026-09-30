import { GameWorld, BusinessState, GameSnapshot, GameInputIntent, MULTIPLAYER_PROTOCOL_VERSION } from '@game/shared';
import { GameSimulation } from './simulation';
import { WorldAvatarController } from './avatars';
import { GameCommandCoordinator, CommandResult } from './commands';
import { FixedStepSimulationRunner } from './runner';
import { generateStarterTileMap } from '@game/data';
import { applyStoreLayoutActions, moveStoreFixture, retrieveStoreFixture, storeFixture } from './store-layout';

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

    const tileMap = generateStarterTileMap(business.save.storeLayout.unlockedPlotIds ?? []);
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
  }

  registerSession(accountId: string, nowMs = Date.now()): boolean {
    const isMember = this.currentWorld.memberships.some((m) => m.accountId === accountId);
    if (!isMember) return false;

    this.activeSessions.set(accountId, { lastHeartbeatMs: nowMs });
    if (this.isPaused) {
      this.isPaused = false;
    }
    return true;
  }

  unregisterSession(accountId: string): void {
    this.activeSessions.delete(accountId);
    if (this.activeTimeVote) {
      this.activeTimeVote = null;
    }
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
        // If an active vote was ongoing, cancel it because participant list changed
        if (this.activeTimeVote) {
          this.activeTimeVote = null;
        }
      }
    }

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
        success = this.simulation.completeCustomerCheckout(p.checkoutId, p.fixtureId);
      } else if (p.type === 'layout_move') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = moveStoreFixture(current, p.fixtureId, p.tileX, p.tileY, p.rotation, generateStarterTileMap(current.storeLayout.unlockedPlotIds ?? []));
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      } else if (p.type === 'layout_store') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = storeFixture(current, p.fixtureId);
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      } else if (p.type === 'layout_retrieve') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = retrieveStoreFixture(current, p.fixtureId, p.tileX, p.tileY, generateStarterTileMap(current.storeLayout.unlockedPlotIds ?? []));
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      } else if (p.type === 'buy_plot') {
        success = !!this.simulation.purchaseLand(p.plotId).save;
      } else if (p.type === 'buy_stall') {
        success = this.simulation.buyStall(p.stallId).success;
      } else if (p.type === 'claim_quest') {
        success = this.simulation.claimQuest(p.questId).success;
      } else if (p.type === 'layout_batch') {
        const current = this.simulation.exportSaveData(this.currentBusiness.save.id, this.currentWorld.revision);
        const next = applyStoreLayoutActions(current, p.actions, ids => generateStarterTileMap(ids));
        success = !!next.save && !!this.simulation.applyStoreLayout(next.save).save;
      }

      if (success) {
        this.avatarController.updateMap(generateStarterTileMap(this.simulation.getUnlockedPlotIds()), this.simulation.getFixtures());
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

  getSnapshot(serverTime = new Date().toISOString()): GameSnapshot {
    return {
      protocolVersion: MULTIPLAYER_PROTOCOL_VERSION,
      world: structuredClone(this.currentWorld),
      businesses: [structuredClone(this.currentBusiness)],
      serverTime,
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
        this.simulation.getClock().setTimeScale(params.targetSpeed * 60);
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
        this.simulation.getClock().setTimeScale(speed * 60);
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
