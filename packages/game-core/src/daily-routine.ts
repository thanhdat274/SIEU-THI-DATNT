import type { GameTileMap, Vector2D } from '@game/shared';
import { TILE_SIZE } from '@game/shared';
import { CollisionSystem } from './collision';
import { findPath, tileCenter, type GridPoint } from './pathfinding';
import { getRainProtection, rainSpeedMultiplier, type RainProtection } from './rain-protection';

// ==========================================
// DAILY ROUTINE — STORE OWNER
// Máy trạng thái duy nhất cho nhịp ngày của chủ tiệm. Không có timer riêng: mọi mốc suy ra từ phút game của GameClock,
// chuyển động đi qua findPath + CollisionSystem sẵn có, thời tiết lấy từ weather/rain-protection sẵn có.
// ==========================================

export type DailyRoutineState =
  | 'AT_HOME'
  | 'GOING_TO_WORK'
  | 'WORKING'
  | 'CLOSING_STORE'
  | 'INVENTORY'
  | 'RETURNING_HOME'
  | 'GOING_TO_SLEEP'
  | 'SLEEPING';

export const DAILY_SCHEDULE = {
  wakeUp: '07:00',
  storeOpen: '08:00',
  storeClose: '22:00',
  inventoryStart: '22:00',
  returnHome: '23:30',
} as const;

/** Mốc tính tồn kho trong 22:00 → 23:30 (ví dụ spec: 23:00); xong sớm thì chờ tới 23:30. */
export const INVENTORY_CALC_MINUTE = '23:00';
/** Số phút game đầu ngày nhân vật còn ở nhà (thức dậy) trước khi ra cửa. */
export const WAKE_UP_MINUTES = 5;

/** Cửa nhà: vỉa hè đầu hẻm phía tây. Chưa có công trình nhà trên bản đồ; đây là điểm đến/xuất phát hợp lệ cho autopilot. */
export const HOME_DOOR_TILE: GridPoint = { x: 3, y: 12 };

export function parseClockMinutes(text: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) throw new Error(`Invalid clock time: ${text}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

const M = {
  wake: parseClockMinutes(DAILY_SCHEDULE.wakeUp),
  open: parseClockMinutes(DAILY_SCHEDULE.storeOpen),
  close: parseClockMinutes(DAILY_SCHEDULE.storeClose),
  inventoryStart: parseClockMinutes(DAILY_SCHEDULE.inventoryStart),
  inventoryCalc: parseClockMinutes(INVENTORY_CALC_MINUTE),
  home: parseClockMinutes(DAILY_SCHEDULE.returnHome),
};

export interface InventorySummary { lowStock: number; outOfStock: number; overstock: number; revenue: number; orders: number }

export interface DailyRoutineCallbacks {
  onToast?: (message: string, type?: 'info' | 'success' | 'warn') => void;
  /** Mở/đóng cửa hàng qua hệ thống hiện có (clock.toggleStoreStatus). */
  setStoreOpen: (open: boolean) => void;
  /** Số khách còn trong quy trình mua (chưa rời). */
  getActiveCustomerCount: () => number;
  /** Tính kết quả kiểm kê từ dữ liệu thật của simulation. */
  getInventorySummary: () => InventorySummary;
  onInventoryComplete?: (summary: InventorySummary) => void;
  onStateChanged?: (state: DailyRoutineState, previous: DailyRoutineState) => void;
  /** Tới cửa nhà: simulation tự chuyển sang ngày mới (fade/ngủ). Gọi đúng một lần mỗi đêm. */
  onSleep?: () => void;
  warn?: (message: string) => void;
}

export interface RoutineWorld {
  tileMap: GameTileMap;
  collision: CollisionSystem;
  storeDoorTile: GridPoint;
  homeDoorTile?: GridPoint;
}

export interface RoutineTickInput {
  minute: number; // phút trong ngày (giờ*60+phút)
  day: number;
  player: Vector2D;
  /** Người chơi đang tự điều khiển (có input di chuyển) ở khung này. */
  manualInput: boolean;
  rainIntensity: number;
}

export interface RoutineTickOutput {
  /** Vector di chuyển (độ dài ≤ 1) khi autopilot đang lái; null = để người chơi tự điều khiển. */
  move: Vector2D | null;
  /** True khi người chơi không được điều khiển (đi về nhà / ngủ). */
  controlLocked: boolean;
  speedMultiplier: number;
  gear: RainProtection;
}

const ARRIVE_DISTANCE = 18;
const WAYPOINT_DISTANCE = 6;
const STUCK_REPATH_SECONDS = 2;

export class DailyRoutineSystem {
  private state: DailyRoutineState = 'AT_HOME';
  private world: RoutineWorld | null = null;
  private path: Vector2D[] = [];
  private pathIndex = 0;
  private pathTarget: 'store' | 'home' | null = null;
  private routeFailed = false;
  private commuteCancelled = false;
  private openedDay = -1;
  private closedDay = -1;
  private inventoryDay = -1;
  private lastTickDay = -1;
  private lastProgress = { x: NaN, y: NaN };
  private stuckSeconds = 0;

  constructor(private readonly callbacks: DailyRoutineCallbacks) {}

  public setWorld(world: RoutineWorld): void {
    const changed = !this.world || this.world.tileMap !== world.tileMap || this.world.collision !== world.collision;
    this.world = world;
    if (changed) this.path = [];
  }
  public getState(): DailyRoutineState { return this.state; }
  public isControlLocked(): boolean { return this.state === 'RETURNING_HOME' || this.state === 'GOING_TO_SLEEP' || this.state === 'SLEEPING'; }

  /** Đặt lại khi sang ngày mới (sau khi ngủ) hoặc khi nạp lại: nhân vật thức dậy ở nhà. */
  public resetForNewDay(): void {
    this.path = [];
    this.pathIndex = 0;
    this.pathTarget = null;
    this.routeFailed = false;
    this.commuteCancelled = false;
    this.stuckSeconds = 0;
    this.setState('AT_HOME');
  }

  /** Vị trí cửa nhà trong pixel (để simulation đặt người chơi khi thức dậy). */
  public getHomeDoorPosition(): Vector2D {
    return tileCenter(this.world?.homeDoorTile ?? HOME_DOOR_TILE);
  }

  public update(dt: number, input: RoutineTickInput): RoutineTickOutput {
    const idle: RoutineTickOutput = { move: null, controlLocked: false, speedMultiplier: 1, gear: 'none' };
    if (!this.world || !Number.isFinite(dt) || dt <= 0) return idle;
    const { minute, day } = input;

    if (day !== this.lastTickDay) {
      // Ngày mới (kể cả khi nạp save giữa ngày): chỉ reset cờ theo ngày, không dịch chuyển người chơi.
      this.lastTickDay = day;
      this.commuteCancelled = false;
      if (this.state === 'SLEEPING') this.setState('AT_HOME');
    }

    this.driveSchedule(minute, day);

    const gear = getRainProtection({ rainIntensity: input.rainIntensity }, { id: 'store-owner' }, day);
    const speedMultiplier = rainSpeedMultiplier(input.rainIntensity);
    const locked = this.isControlLocked();
    let move: Vector2D | null = null;

    if (input.manualInput && this.state === 'GOING_TO_WORK') this.commuteCancelled = true;

    if (this.state === 'GOING_TO_WORK' && !this.commuteCancelled) {
      move = this.follow('store', input.player, dt);
    } else if (this.state === 'RETURNING_HOME') {
      move = this.follow('home', input.player, dt);
      if (this.reached('home', input.player)) {
        this.setState('GOING_TO_SLEEP');
      }
    }
    if (this.state === 'GOING_TO_SLEEP') {
      this.setState('SLEEPING');
      this.callbacks.onToast?.('🌙 Ngủ thôi...', 'info');
      this.callbacks.onSleep?.();
      move = null;
    }
    return { move, controlLocked: locked, speedMultiplier, gear };
  }

  // ------------------------------------------------------------------
  private driveSchedule(minute: number, day: number): void {
    const cb = this.callbacks;
    if (this.state === 'SLEEPING') return;

    if (minute >= M.home) {
      if (this.state !== 'RETURNING_HOME' && this.state !== 'GOING_TO_SLEEP') {
        this.ensureClosedAndInventoried(day, true);
        this.pathTarget = null;
        this.routeFailed = false;
        this.setState('RETURNING_HOME');
        cb.onToast?.('🌙 Đã hết một ngày làm việc. Nhân vật đang về nhà...', 'info');
      }
      return;
    }
    if (this.state === 'RETURNING_HOME' || this.state === 'GOING_TO_SLEEP') return;

    if (minute >= M.close) {
      if (this.closedDay !== day) {
        this.closedDay = day;
        cb.setStoreOpen(false);
        cb.onToast?.('🔒 22:00 — Cửa hàng đã đóng cửa.', 'warn');
      }
      if (cb.getActiveCustomerCount() > 0 && this.state !== 'INVENTORY') {
        this.setState('CLOSING_STORE');
        return;
      }
      if (this.state !== 'INVENTORY') {
        this.setState('INVENTORY');
        cb.onToast?.('📦 Đang kiểm kê hàng...', 'info');
      }
      if (minute >= M.inventoryCalc && this.inventoryDay !== day) this.completeInventory(day);
      return;
    }

    if (minute >= M.open) {
      if (this.openedDay !== day) {
        this.openedDay = day;
        cb.setStoreOpen(true);
        cb.onToast?.('🏪 Cửa hàng đã mở — Bắt đầu ngày mới.', 'success');
      }
      if (this.state !== 'WORKING') this.setState('WORKING');
      return;
    }

    if (minute >= M.wake) {
      const next = minute < M.wake + WAKE_UP_MINUTES ? 'AT_HOME' : 'GOING_TO_WORK';
      if (next !== this.state) {
        this.setState(next);
        if (next === 'AT_HOME' && minute === M.wake) cb.onToast?.('☀️ Một ngày mới bắt đầu.', 'info');
      }
    }
  }

  private ensureClosedAndInventoried(day: number, force: boolean): void {
    if (this.closedDay !== day) { this.closedDay = day; this.callbacks.setStoreOpen(false); }
    if (force && this.inventoryDay !== day) this.completeInventory(day);
  }

  private completeInventory(day: number): void {
    this.inventoryDay = day;
    const summary = this.callbacks.getInventorySummary();
    this.callbacks.onToast?.('✓ Đã hoàn tất kiểm kê.', 'success');
    this.callbacks.onInventoryComplete?.(summary);
  }

  private setState(next: DailyRoutineState): void {
    if (next === this.state) return;
    const previous = this.state;
    this.state = next;
    this.callbacks.onStateChanged?.(next, previous);
  }

  // ---- Autopilot: findPath + collision hiện có, không teleport -------------------------------
  private targetTile(kind: 'store' | 'home'): GridPoint {
    return kind === 'store' ? this.world!.storeDoorTile : (this.world!.homeDoorTile ?? HOME_DOOR_TILE);
  }

  private reached(kind: 'store' | 'home', player: Vector2D): boolean {
    const target = tileCenter(this.targetTile(kind));
    return Math.hypot(target.x - player.x, target.y - player.y) <= ARRIVE_DISTANCE;
  }

  private plan(kind: 'store' | 'home', player: Vector2D): void {
    const world = this.world!;
    this.pathTarget = kind;
    this.pathIndex = 0;
    const start: GridPoint = { x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE) };
    const tiles = findPath(world.tileMap, world.collision, start, this.targetTile(kind));
    this.path = tiles.map(tileCenter);
    this.routeFailed = this.path.length === 0;
    if (this.routeFailed) {
      const message = kind === 'home' ? 'Unable to find home route for player.' : 'Unable to find store route for player.';
      (this.callbacks.warn ?? console.warn)(message);
    }
  }

  private follow(kind: 'store' | 'home', player: Vector2D, dt: number): Vector2D | null {
    if (this.reached(kind, player)) return null;
    if (this.pathTarget !== kind || (this.path.length === 0 && !this.routeFailed)) this.plan(kind, player);

    // Kẹt (vật cản động): tính lại đường, không teleport.
    if (Math.hypot(player.x - this.lastProgress.x, player.y - this.lastProgress.y) < 0.5) this.stuckSeconds += dt;
    else this.stuckSeconds = 0;
    this.lastProgress = { x: player.x, y: player.y };
    if (this.stuckSeconds >= STUCK_REPATH_SECONDS) { this.stuckSeconds = 0; this.plan(kind, player); }

    // Không có đường: dùng tuyến dự phòng là đi thẳng tới cửa (collision vẫn chặn); không teleport.
    let target: Vector2D;
    if (this.path.length === 0) {
      target = tileCenter(this.targetTile(kind));
    } else {
      while (this.pathIndex < this.path.length - 1 && Math.hypot(this.path[this.pathIndex].x - player.x, this.path[this.pathIndex].y - player.y) <= WAYPOINT_DISTANCE) this.pathIndex++;
      target = this.path[Math.min(this.pathIndex, this.path.length - 1)];
    }
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy);
    if (length < 1e-6) return null;
    return { x: dx / length, y: dy / length };
  }
}
