import type { Vector2D, GameTileMap } from '@game/shared';
import { TILE_SIZE } from '@game/shared';
import { CollisionSystem } from './collision';
import { findPath, tileCenter, type GridPoint } from './pathfinding';
import { getRainProtection, rainSpeedMultiplier, type RainProtection } from './rain-protection';
import { DailyRoutineState, DAILY_SCHEDULE, parseClockMinutes, INVENTORY_CALC_MINUTE, WAKE_UP_MINUTES, HOME_DOOR_TILE, type InventorySummary, type DailyRoutineCallbacks, type RoutineWorld, type RoutineTickInput, type RoutineTickOutput } from './daily-routine';

// ==========================================
// CO-OP DAILY ROUTINE — TWO PLAYERS, ONE WORLD
// ==========================================
// Mỗi player có:
//   - homeId / bedId riêng
//   - vị trí spawn / cửa nhà riêng
//   - route đi làm riêng (tận dụng pathfinding hiện tại)
// Nhưng chia sẻ:
//   - store state (mở/đóng 08:00 / 22:00)
//   - inventory system
//   - game clock & day transition
//   - weather, npc, traffic
//
// Day transition chỉ xảy ra khi CẢ HAI player đều ở trạng thái SLEEPING.
// Nếu một player disconnect, hệ thống sẽ AI-autopilot player đó về nhà và ngủ.

export type CoopPlayerId = string;

export interface CoopPlayerRoutineConfig {
  playerId: CoopPlayerId;
  homeDoorTile: GridPoint;
  bedTile?: GridPoint; // Optional: vị trí giường (cho animation/fade)
  workLocationTile?: GridPoint; // Mặc định = store door
}

export interface CoopPlayerState {
  state: DailyRoutineState;
  path: Vector2D[];
  pathIndex: number;
  pathTarget: 'store' | 'home' | null;
  routeFailed: boolean;
  commuteCancelled: boolean;
  openedDay: number;
  closedDay: number;
  inventoryDay: number;
  lastTickDay: number;
  lastProgress: { x: number; y: number };
  stuckSeconds: number;
  sleepReady: boolean;
  sleeping: boolean;
  /** Số giây thực người chơi online đã ở trạng thái RETURNING_HOME mà chưa tới nhà (đứng AFK, tab treo). */
  returningSeconds: number;
}

export interface CoopRoutineCallbacks extends DailyRoutineCallbacks {
  /** Số player đang online trong session này. */
  getActivePlayerCount: () => number;
  /** Lấy danh sách playerId đang active. */
  getActivePlayerIds: () => string[];
  /** Player đã sẵn sàng ngủ (về tới nhà + entered home). */
  isPlayerSleepReady: (playerId: string) => boolean;
  /** Player đã thực sự sleeping (fade/ngủ hoàn tất). */
  isPlayerSleeping: (playerId: string) => boolean;
  /** Đặt trạng thái sleeping cho player. */
  setPlayerSleeping: (playerId: string, sleeping: boolean) => void;
  /** AI fallback: điều khiển player offline về nhà tự động. */
  onPlayerOffline?: (playerId: string) => void;
}

export interface CoopRoutineWorld extends RoutineWorld {
  /** Map playerId → config (home door, bed, work location). */
  playerConfigs: Record<CoopPlayerId, CoopPlayerRoutineConfig>;
}

export interface CoopRoutineState {
  playerId: CoopPlayerId;
  state: DailyRoutineState;
  isOnline: boolean;
  isSleeping: boolean;
  homeDoorTile: GridPoint;
}

export interface CoopRoutineTickInput {
  minute: number;
  day: number;
  /** Map playerId → player position & input state. */
  players: Record<CoopPlayerId, {
    position: Vector2D;
    manualInput: boolean;
    isOnline: boolean;
  }>;
  rainIntensity: number;
}

export interface CoopRoutineTickOutput {
  /** Map playerId → move vector (null = manual/locked) */
  moves: Record<CoopPlayerId, Vector2D | null>;
  /** Map playerId → control locked? */
  controlLocked: Record<CoopPlayerId, boolean>;
  /** Map playerId → speed multiplier */
  speedMultipliers: Record<CoopPlayerId, number>;
  /** Map playerId → rain gear */
  gears: Record<CoopPlayerId, RainProtection>;
  /** True khi cả hai player đã sleeping → sẵn sàng chuyển ngày. */
  allPlayersSleeping: boolean;
  /** Player nào còn đang di chuyển/ngủ. */
  sleepingPlayers: Set<CoopPlayerId>;
}

const ARRIVE_DISTANCE = 18;
const WAYPOINT_DISTANCE = 6;
const STUCK_REPATH_SECONDS = 2;

/**
 * CoopRoutineSystem: Quản lý daily routine cho 2+ player trong cùng world.
 * - Mỗi player có routine state riêng (AT_HOME, GOING_TO_WORK, WORKING, CLOSING_STORE, INVENTORY, RETURNING_HOME, GOING_TO_SLEEP, SLEEPING)
 * - Store đóng/mở đồng bộ theo global clock
 * - Inventory đồng bộ theo global clock
 * - Ngày chỉ chuyển khi TẤT CẢ player đang sleeping
 */
export class CoopRoutineSystem {
  private readonly playerStates: Map<CoopPlayerId, CoopPlayerState>;

  private world: CoopRoutineWorld | null = null;
  private storeDoorTile: GridPoint;
  private routineMode = false;
  private dayAdvanceTriggered = -1;
  private offlinePlayers = new Set<CoopPlayerId>();
  /**
   * Người online mà sau chừng này giây thực kể từ 23:30 vẫn chưa về tới nhà (AFK, tab treo) thì coi như đã về ngủ để không giữ cả hẻm.
   * Chỉ server bật (Infinity = tắt): máy khách tự đi bộ về nên không được kết luận thay.
   */
  public afkHomeGraceSeconds = Number.POSITIVE_INFINITY;

  constructor(private readonly callbacks: CoopRoutineCallbacks) {
    this.playerStates = new Map();
    this.storeDoorTile = HOME_DOOR_TILE;
  }

  public setWorld(world: CoopRoutineWorld): void {
    const changed = !this.world || this.world.tileMap !== world.tileMap || this.world.collision !== world.collision;
    this.world = world;
    this.storeDoorTile = world.storeDoorTile;
    if (changed) {
      for (const playerId of this.playerStates.keys()) {
        this.resetPlayerPath(playerId);
      }
    }
  }

  public registerPlayer(config: CoopPlayerRoutineConfig): void {
    if (this.playerStates.has(config.playerId)) return;
    this.playerStates.set(config.playerId, {
      state: 'AT_HOME',
      path: [],
      pathIndex: 0,
      pathTarget: null,
      routeFailed: false,
      commuteCancelled: false,
      openedDay: -1,
      closedDay: -1,
      inventoryDay: -1,
      lastTickDay: -1,
      lastProgress: { x: NaN, y: NaN },
      stuckSeconds: 0,
      sleepReady: false,
      sleeping: false,
      returningSeconds: 0,
    });
  }

  public unregisterPlayer(playerId: CoopPlayerId): void {
    this.playerStates.delete(playerId);
    this.offlinePlayers.delete(playerId);
  }

  public getState(playerId: CoopPlayerId): DailyRoutineState | null {
    return this.playerStates.get(playerId)?.state ?? null;
  }

  public isControlLocked(playerId: CoopPlayerId): boolean {
    const s = this.playerStates.get(playerId);
    if (!s) return false;
    return s.state === 'RETURNING_HOME' || s.state === 'GOING_TO_SLEEP' || s.state === 'SLEEPING';
  }

  public isPlayerSleeping(playerId: CoopPlayerId): boolean {
    return this.playerStates.get(playerId)?.sleeping ?? false;
  }

  public setPlayerSleeping(playerId: CoopPlayerId, sleeping: boolean): void {
    const s = this.playerStates.get(playerId);
    if (!s) return;
    s.sleeping = sleeping;
    if (sleeping) {
      s.state = 'SLEEPING';
      this.callbacks.onToast?.(`🌙 ${playerId} đã ngủ.`, 'info');
      this.callbacks.onSleep?.();
    }
  }

  public setRoutineMode(on: boolean): void {
    this.routineMode = on;
  }

  public isRoutineMode(): boolean {
    return this.routineMode;
  }

  /** Reset tất cả player về AT_HOME khi ngày mới bắt đầu. */
  public resetForNewDay(): void {
    for (const playerId of this.playerStates.keys()) {
      this.resetPlayerPath(playerId);
      const s = this.playerStates.get(playerId);
      if (s) {
        s.state = 'AT_HOME';
        s.sleepReady = false;
        s.sleeping = false;
        s.returningSeconds = 0;
        s.openedDay = -1;
        s.closedDay = -1;
        s.inventoryDay = -1;
      }
    }
    this.dayAdvanceTriggered = -1;
  }

  public update(dt: number, input: CoopRoutineTickInput): CoopRoutineTickOutput {
    const idleMoves: Record<CoopPlayerId, Vector2D | null> = {};
    const idleLocked: Record<CoopPlayerId, boolean> = {};
    const idleSpeed: Record<CoopPlayerId, number> = {};
    const idleGear: Record<CoopPlayerId, RainProtection> = {};
    const sleepingPlayers = new Set<CoopPlayerId>();

    const { minute, day, players, rainIntensity } = input;

    // Init idle outputs for all registered players
    for (const playerId of this.playerStates.keys()) {
      idleMoves[playerId] = null;
      idleLocked[playerId] = false;
      idleSpeed[playerId] = 1;
      idleGear[playerId] = 'none';
    }

    // Handle day transition
    if (day !== this.dayAdvanceTriggered) {
      if (this.routineMode && this.isAllPlayersSleeping()) {
        this.dayAdvanceTriggered = day;
        this.callbacks.onToast?.('💤 Cả hai người đã ngủ. Ngày mới bắt đầu...', 'success');
        this.resetForNewDay();
        // Trigger global day advance via clock callback
        this.callbacks.setStoreOpen(false);
        // Note: actual day advance is handled by GameClock.advanceToNextDay()
      }
    }

    // Process each player
    const gear = getRainProtection({ rainIntensity }, { id: 'store-owner' }, day);
    const speedMultiplier = rainSpeedMultiplier(rainIntensity);

    for (const [playerId, playerState] of this.playerStates) {
      const playerInput = players[playerId];
      if (!playerInput) continue;

      // Handle offline players
      if (!playerInput.isOnline && !this.offlinePlayers.has(playerId)) {
        this.offlinePlayers.add(playerId);
        this.callbacks.onPlayerOffline?.(playerId);
      }

      if (day !== playerState.lastTickDay) {
        playerState.lastTickDay = day;
        playerState.commuteCancelled = false;
        if (playerState.state === 'SLEEPING') playerState.state = 'AT_HOME';
      }

      this.drivePlayerSchedule(playerId, playerState, minute, day);

      const locked = this.isControlLocked(playerId);
      let move: Vector2D | null = null;

      if (playerInput.isOnline) {
        if (playerState.state === 'GOING_TO_WORK' && !playerState.commuteCancelled && playerInput.manualInput) {
          playerState.commuteCancelled = true;
        }

        if (playerState.state === 'GOING_TO_WORK' && !playerState.commuteCancelled) {
          move = this.followPlayer(playerId, playerState, 'store', playerInput.position, dt);
        } else if (playerState.state === 'RETURNING_HOME') {
          move = this.followPlayer(playerId, playerState, 'home', playerInput.position, dt);
          playerState.returningSeconds += dt;
          if (this.reachedPlayer(playerId, playerState, 'home', playerInput.position) || playerState.returningSeconds >= this.afkHomeGraceSeconds) {
            playerState.state = 'GOING_TO_SLEEP';
            playerState.sleepReady = true;
            this.callbacks.setPlayerSleeping(playerId, true);
          }
        } else if (playerState.state === 'GOING_TO_SLEEP') {
          playerState.state = 'SLEEPING';
          playerState.sleeping = true;
          this.callbacks.onToast?.('🌙 Kết thúc ngày làm việc.', 'info');
          this.callbacks.onSleep?.();
          move = null;
        }
      } else {
        // Offline player: autopilot home if not already sleeping
        if (playerState.state !== 'SLEEPING' && playerState.state !== 'GOING_TO_SLEEP') {
          move = this.followPlayer(playerId, playerState, 'home', playerInput.position, dt);
          if (this.reachedPlayer(playerId, playerState, 'home', playerInput.position)) {
            playerState.state = 'GOING_TO_SLEEP';
            playerState.sleepReady = true;
            this.callbacks.setPlayerSleeping(playerId, true);
          }
        }
      }

      idleMoves[playerId] = move;
      idleLocked[playerId] = locked;
      idleSpeed[playerId] = speedMultiplier;
      idleGear[playerId] = gear;

      if (playerState.sleeping) {
        sleepingPlayers.add(playerId);
      }
    }

    return {
      moves: idleMoves,
      controlLocked: idleLocked,
      speedMultipliers: idleSpeed,
      gears: idleGear,
      allPlayersSleeping: this.isAllPlayersSleeping(),
      sleepingPlayers,
    };
  }

  private drivePlayerSchedule(playerId: CoopPlayerId, state: CoopPlayerState, minute: number, day: number): void {
    if (state.state === 'SLEEPING') return;

    const M = {
      wake: parseClockMinutes(DAILY_SCHEDULE.wakeUp),
      open: parseClockMinutes(DAILY_SCHEDULE.storeOpen),
      close: parseClockMinutes(DAILY_SCHEDULE.storeClose),
      inventoryCalc: parseClockMinutes(INVENTORY_CALC_MINUTE),
      home: parseClockMinutes(DAILY_SCHEDULE.returnHome),
    };

    if (minute >= M.home) {
      if (state.state !== 'RETURNING_HOME' && state.state !== 'GOING_TO_SLEEP') {
        this.ensureClosedAndInventoried(day, true);
        state.pathTarget = null;
        state.routeFailed = false;
        state.state = 'RETURNING_HOME';
        this.callbacks.onToast?.(`🌙 ${playerId} đang về nhà...`, 'info');
      }
      return;
    }
    if (state.state === 'RETURNING_HOME' || state.state === 'GOING_TO_SLEEP') return;

    if (minute >= M.close) {
      if (state.closedDay !== day) {
        state.closedDay = day;
        this.callbacks.setStoreOpen(false);
        this.callbacks.onToast?.('🔒 22:00 — Cửa hàng đã đóng cửa.', 'warn');
      }
      if (this.callbacks.getActiveCustomerCount() > 0 && state.state !== 'INVENTORY') {
        state.state = 'CLOSING_STORE';
        return;
      }
      if (state.state !== 'INVENTORY') {
        state.state = 'INVENTORY';
        this.callbacks.onToast?.('📦 Đang kiểm kê hàng...', 'info');
      }
      if (minute >= M.inventoryCalc && state.inventoryDay !== day) this.completeInventory(day);
      return;
    }

    if (minute >= M.open) {
      if (state.openedDay !== day) {
        state.openedDay = day;
        this.callbacks.setStoreOpen(true);
        this.callbacks.onToast?.('🏪 Cửa hàng đã mở — Bắt đầu ngày mới.', 'success');
      }
      if (state.state !== 'WORKING') state.state = 'WORKING';
      return;
    }

    if (minute >= M.wake) {
      const next = minute < M.wake + WAKE_UP_MINUTES ? 'AT_HOME' : 'GOING_TO_WORK';
      if (next !== state.state) {
        state.state = next;
        if (next === 'AT_HOME' && minute === M.wake) {
          this.callbacks.onToast?.(`☀️ Một ngày mới bắt đầu cho ${playerId}.`, 'info');
        }
      }
    }
  }

  private ensureClosedAndInventoried(day: number, force: boolean): void {
    if (this.dayAdvanceTriggered !== day) {
      this.callbacks.setStoreOpen(false);
    }
    if (force && this.dayAdvanceTriggered !== day) this.completeInventory(day);
  }

  private completeInventory(day: number): void {
    if (this.dayAdvanceTriggered === day) return;
    const summary = this.callbacks.getInventorySummary();
    this.callbacks.onToast?.('✓ Đã hoàn tất kiểm kê.', 'success');
    this.callbacks.onInventoryComplete?.(summary);
  }

  public isAllPlayersSleeping(): boolean {
    const activeIds = this.callbacks.getActivePlayerIds();
    if (activeIds.length === 0) return false;
    for (const playerId of activeIds) {
      const s = this.playerStates.get(playerId);
      if (!s || !s.sleeping) return false;
    }
    return true;
  }

  /** Get current coop routine states for all registered players. */
  public getCoopRoutineStates(): CoopRoutineState[] {
    const states: CoopRoutineState[] = [];
    for (const [playerId, state] of this.playerStates.entries()) {
      states.push({
        playerId,
        state: state.state,
        isOnline: true, // Will be overridden by simulation
        isSleeping: state.sleeping,
        homeDoorTile: this.world?.playerConfigs[playerId]?.homeDoorTile ?? HOME_DOOR_TILE,
      });
    }
    return states;
  }

  private resetPlayerPath(playerId: CoopPlayerId): void {
    const s = this.playerStates.get(playerId);
    if (!s) return;
    s.path = [];
    s.pathIndex = 0;
    s.pathTarget = null;
    s.routeFailed = false;
    s.stuckSeconds = 0;
  }

  private targetTileForPlayer(playerId: CoopPlayerId, kind: 'store' | 'home'): GridPoint {
    if (kind === 'store') return this.storeDoorTile;
    const config = this.world?.playerConfigs[playerId];
    return config?.homeDoorTile ?? HOME_DOOR_TILE;
  }

  private reachedPlayer(playerId: CoopPlayerId, state: CoopPlayerState, kind: 'store' | 'home', player: Vector2D): boolean {
    const target = tileCenter(this.targetTileForPlayer(playerId, kind));
    return Math.hypot(target.x - player.x, target.y - player.y) <= ARRIVE_DISTANCE;
  }

  private planPlayer(playerId: CoopPlayerId, state: CoopPlayerState, kind: 'store' | 'home', player: Vector2D): void {
    const world = this.world!;
    state.pathTarget = kind;
    state.pathIndex = 0;
    const start: GridPoint = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
    const tiles = findPath(world.tileMap, world.collision, start, this.targetTileForPlayer(playerId, kind));
    state.path = tiles.map(tileCenter);
    state.routeFailed = state.path.length === 0;
    if (state.routeFailed) {
      const message = kind === 'home' ? `Unable to find home route for ${playerId}.` : `Unable to find store route for ${playerId}.`;
      (this.callbacks.warn ?? console.warn)(message);
    }
  }

  private followPlayer(playerId: CoopPlayerId, state: CoopPlayerState, kind: 'store' | 'home', player: Vector2D, dt: number): Vector2D | null {
    if (this.reachedPlayer(playerId, state, kind, player)) return null;
    if (state.pathTarget !== kind || (state.path.length === 0 && !state.routeFailed)) this.planPlayer(playerId, state, kind, player);

    if (Math.hypot(player.x - state.lastProgress.x, player.y - state.lastProgress.y) < 0.5) state.stuckSeconds += dt;
    else state.stuckSeconds = 0;
    state.lastProgress = { x: player.x, y: player.y };
    if (state.stuckSeconds >= STUCK_REPATH_SECONDS) { state.stuckSeconds = 0; this.planPlayer(playerId, state, kind, player); }

    let target: Vector2D;
    if (state.path.length === 0) {
      target = tileCenter(this.targetTileForPlayer(playerId, kind));
    } else {
      while (state.pathIndex < state.path.length - 1 && Math.hypot(state.path[state.pathIndex].x - player.x, state.path[state.pathIndex].y - player.y) <= WAYPOINT_DISTANCE) state.pathIndex++;
      target = state.path[Math.min(state.pathIndex, state.path.length - 1)];
    }
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) return null;
    return { x: dx / length, y: dy / length };
  }
}
