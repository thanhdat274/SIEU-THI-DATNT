import type { SaveGameData, StallState, MarketState } from '@game/shared';
import { advanceMarketState, assertMarketData, marketNoticesForDay, normalizeMarketState, NoticeThrottle } from './market';
import { buildDemandTable, type DemandTable } from './demand';
import { effectiveWeatherId, timeBandFor, visibleMarketEvents, weekdayOf } from './market';

/** Quản lý stalls, market state, demand table và notice throttle. */
export class StallsMarketsManager {
  private stalls: StallState;
  private market!: MarketState;
  private noticeThrottle: NoticeThrottle;
  private demandTable?: DemandTable;
  private demandBuildCount = 0;
  private currentSeed: string;

  constructor(initialSave: SaveGameData) {
    this.stalls = normalizeStallState(initialSave.stalls);
    this.currentSeed = initialSave.id ?? 'local_save';
    this.noticeThrottle = new NoticeThrottle();
    this.loadMarket(initialSave);
  }

  private loadMarket(saveData: SaveGameData): void {
    assertMarketData();
    this.market = normalizeMarketState(saveData.market, this.currentSeed, saveData.worldTime.day);
    this.demandTable = undefined;
    this.stalls = normalizeStallState(saveData.stalls);
  }

  public load(saveData: SaveGameData): void {
    this.loadMarket(saveData);
  }

  public export(): {
    stalls: StallState;
    market: MarketState;
    noticeThrottleState: { kind: string; day: number; hour: number }[];
    demandBuildCount: number;
  } {
    return {
      stalls: this.stalls,
      market: structuredClone(this.market),
      noticeThrottleState: [],
      demandBuildCount: this.demandBuildCount,
    };
  }

  /** Tham chiếu trực tiếp đến stalls (dùng để ghi owned, lastReport, processedDayIds). */
  public getStallsRef(): StallState {
    return this.stalls;
  }

  /** Tham chiếu trực tiếp đến market (dùng để ghi). */
  public setStalls(val: StallState): void { this.stalls = val; }
  public setMarket(val: MarketState): void { this.market = val; }

  public getMarketRef(): MarketState {
    return this.market;
  }

  /** Tham chiếu trực tiếp đến noticeThrottle (dùng để gọi .allow()). */
  public getNoticeThrottle(): NoticeThrottle {
    return this.noticeThrottle;
  }

  /** Demand table (đọc). */
  public getDemandTable(): DemandTable | undefined {
    return this.demandTable;
  }

  /** Demand build count (đọc). */
  public getDemandBuildCount(): number {
    return this.demandBuildCount;
  }

  /** Increment build count (đặt key khác). */
  public bumpDemandTable(key: string): void {
    this.demandBuildCount++;
  }

  /** Cập nhật demand table. */
  public setDemandTable(table: DemandTable | undefined): void {
    this.demandTable = table;
  }

  /** Cập nhật demand table với auto-bump. */
  public setDemandTableBump(table: DemandTable | undefined, key: string): void {
    this.demandTable = table;
    this.bumpDemandTable(key);
  }

  /** Advance market to new day. */
  public advanceMarket(day: number): void {
    this.market = advanceMarketState(this.market, day);
  }

  /** Mutate market with partial update. */
  public mutateMarket(updates: Partial<MarketState>): void {
    Object.assign(this.market, updates);
  }

  /** Market notices cho ngày hiện tại. */
  public getMarketNotices(day: number, hour: number, onNotice: (notice: import('./market').MarketNotice) => void): void {
    for (const notice of marketNoticesForDay(this.market, day)) {
      if (this.noticeThrottle.allow(notice.kind, day, hour)) {
        onNotice(notice);
      }
    }
  }

  /** Reset demand table cache. */
  public invalidateDemand(): void {
    this.demandTable = undefined;
  }
}

function normalizeStallState(state: StallState | undefined): StallState {
  return state ?? { owned: [], processedDayIds: [], lastReport: undefined };
}
