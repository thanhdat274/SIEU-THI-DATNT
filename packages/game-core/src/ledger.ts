import type { DailyRecord, LedgerEntry, SaveGameData } from '@game/shared';
import { summarizeAnnualRevenue, calculateDailyTax } from './tax/annual-revenue';

/** Quản lý sổ cái (ledger), nhật ký hàng ngày (daily records), thống kê (statistics).
 * Pattern: nhận dữ liệu từ constructor, không nhận `this`.
 * Các phương thức phức tạp (closeDailyRecord, tax) ở simulation.ts gọi qua manager.
 */
export class LedgerManager {
  private ledger: LedgerEntry[] = [];
  private ledgerSequence = 0;
  private dailyRecords: Record<number, DailyRecord> = {};
  private currentDayRecord!: DailyRecord;
  private closedDayIds = new Set<number>();
  private statistics: SaveGameData['statistics'] = {} as SaveGameData['statistics'];

  constructor(initialSave: SaveGameData) {
    this.load(initialSave);
  }

  // --- Load / Save ---

  public load(saveData: SaveGameData): void {
    this.dailyRecords = saveData.dailyRecords ? structuredClone(saveData.dailyRecords) : {};
    this.closedDayIds = new Set(saveData.closedDayIds ?? []);
    this.ledger = (saveData.ledger ?? []).map((e) => ({ ...e }));
    if (saveData.currentDayRecord) {
      this.currentDayRecord = { ...saveData.currentDayRecord };
    } else {
      this.currentDayRecord = this.createEmptyDailyRecord(saveData.worldTime.day);
    }
    this.currentDayRecord.productSales ??= {};
    this.statistics = { ...saveData.statistics };
    // Ledger sequence
    const maxLedgerId = this.ledger.reduce((max, e) => {
      const num = parseLedgerSuffix(e.id);
      return num > max ? num : max;
    }, 0);
    this.ledgerSequence = maxLedgerId;
  }

  public export(): {
    dailyRecords: Record<number, DailyRecord>;
    currentDayRecord: DailyRecord;
    ledger: LedgerEntry[];
    closedDayIds: number[];
    ledgerSequence: number;
    statistics: SaveGameData['statistics'];
  } {
    return {
      dailyRecords: structuredClone(this.dailyRecords),
      currentDayRecord: { ...this.currentDayRecord },
      ledger: this.ledger.map((e) => ({ ...e })),
      closedDayIds: [...this.closedDayIds],
      ledgerSequence: this.ledgerSequence,
      statistics: { ...this.statistics },
    };
  }

  // --- Getters ---

  public getLedger(): LedgerEntry[] {
    return this.ledger.map((e) => ({ ...e }));
  }

  public getDailyRecords(): Record<number, DailyRecord> {
    return structuredClone(this.dailyRecords);
  }

  public getCurrentDayRecord(): DailyRecord {
    return { ...this.currentDayRecord };
  }

  /** Trả về tham chiếu trực tiếp đến currentDayRecord (dùng để ghi, không clone). */
  public getCurrentDayRecordRef(): DailyRecord {
    return this.currentDayRecord;
  }

  public getStatistics(): SaveGameData['statistics'] {
    return { ...this.statistics };
  }

  /** Tham chiếu trực tiếp đến statistics (dùng để ghi). */
  public getStatisticsRef(): SaveGameData['statistics'] {
    return this.statistics;
  }

  public getClosedDayIds(): number[] {
    return [...this.closedDayIds];
  }

  /** Tham chiếu trực tiếp đến dailyRecords (dùng để ghi). */
  public getDailyRecordsRef(): Record<number, DailyRecord> {
    return this.dailyRecords;
  }

  /** Tham chiếu trực tiếp đến closedDayIds (dùng để ghi). */
  public getClosedDayIdsRef(): Set<number> {
    return this.closedDayIds;
  }

  public getLedgerSequence(): number { return this.ledgerSequence; }
  public setLedgerSequence(val: number): void { this.ledgerSequence = val; }

  // --- Daily record helpers ---

  public createEmptyDailyRecord(day: number): DailyRecord {
    return {
      day,
      revenue: 0,
      cogs: 0,
      purchaseTotal: 0,
      spoilageCost: 0,
      wagesPaid: 0,
      maintenanceCost: 0,
      theftCost: 0,
      theftRecovered: 0,
      counterfeitLoss: 0,
      badDebtCost: 0,
      grossProfit: 0,
      netProfit: 0,
      customersServed: 0,
      transactionsCount: 0,
      itemsSold: 0,
      spoilageCount: 0,
      productSales: {},
    };
  }

  public initDailyRecord(day: number): void {
    if (!this.dailyRecords[day]) {
      this.currentDayRecord = this.createEmptyDailyRecord(day);
    } else {
      this.currentDayRecord = { ...this.dailyRecords[day] };
      this.currentDayRecord.productSales ??= {};
    }
  }

  public setCurrentDayRecord(record: DailyRecord): void {
    this.currentDayRecord = record;
  }

  public getCurrentDay(): number {
    return this.currentDayRecord.day;
  }

  // --- Product sales tracking ---

  public recordProductSale(productId: string, quantity = 1): void {
    const day = this.currentDayRecord.day;
    this.currentDayRecord.productSales ??= {};
    this.currentDayRecord.productSales[productId] =
      (this.currentDayRecord.productSales[productId] ?? 0) + quantity;
  }

  /** Ghi product sale cho ngày cũ (hướng quá khứ). */
  public recordHistoricalSale(productId: string, quantity: number, targetDay: number): void {
    if (!this.dailyRecords[targetDay]) {
      this.dailyRecords[targetDay] = this.createEmptyDailyRecord(targetDay);
    }
    this.dailyRecords[targetDay].productSales ??= {};
    this.dailyRecords[targetDay].productSales![productId] =
      (this.dailyRecords[targetDay].productSales![productId] ?? 0) + quantity;
  }

  // --- Ledger ---

  /** Thêm 1 entry vào sổ cái. Trả về entry đã tạo. */
  public recordLedger(entry: Omit<LedgerEntry, 'id' | 'timestamp'>): LedgerEntry {
    const fullEntry: LedgerEntry = {
      ...entry,
      id: `led-${++this.ledgerSequence}`,
      timestamp: new Date().toISOString(),
    };
    this.ledger.push(fullEntry);
    return fullEntry;
  }

  // --- Statistics helpers ---

  /** Thêm doanh thu vào thống kê và daily record. */
  public addRevenue(amount: number): void {
    this.statistics.totalRevenue = (this.statistics.totalRevenue ?? 0) + amount;
    this.currentDayRecord.revenue += amount;
    this.recalcNetProfit();
  }

  /** Thêm khách đã phục vụ. */
  public addCustomersServed(count: number): void {
    this.statistics.totalCustomersServed = (this.statistics.totalCustomersServed ?? 0) + count;
    this.currentDayRecord.customersServed += count;
  }

  /** Ghi stats cho 1 giao dịch bán hàng. */
  public recordSale(paidTotal: number, cogs: number, itemCount: number): void {
    this.currentDayRecord.transactionsCount += 1;
    this.currentDayRecord.itemsSold += itemCount;
    this.currentDayRecord.revenue += paidTotal;
    this.currentDayRecord.cogs += cogs;
    this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
    this.recalcNetProfit();
  }

  /** Ghi thống kê hàng hỏng. */
  public recordSpoilage(spoiled: number, cost: number, quantity: number): void {
    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + spoiled;
    this.currentDayRecord.spoilageCount += quantity;
    this.currentDayRecord.spoilageCost += cost;
    this.recalcNetProfit();
  }

  /** Ghi chi phí bảo trì. */
  public addMaintenanceCost(cost: number): void {
    this.currentDayRecord.maintenanceCost = (this.currentDayRecord.maintenanceCost ?? 0) + cost;
    this.recalcNetProfit();
  }

  /** Ghi tổn thất do trộm. */
  public addTheftCost(value: number): void {
    this.currentDayRecord.theftCost = (this.currentDayRecord.theftCost ?? 0) + value;
    this.recalcNetProfit();
  }

  /** Ghi thu hồi từ trộm. */
  public addTheftRecovered(value: number): void {
    this.currentDayRecord.theftRecovered = (this.currentDayRecord.theftRecovered ?? 0) + value;
    this.recalcNetProfit();
  }

  /** Ghi tiền giả. */
  public addCounterfeitLoss(loss: number): void {
    this.currentDayRecord.counterfeitLoss = (this.currentDayRecord.counterfeitLoss ?? 0) + loss;
    this.recalcNetProfit();
  }

  /** Ghi nợ xấu. */
  public addBadDebtCost(loss: number): void {
    this.currentDayRecord.badDebtCost = (this.currentDayRecord.badDebtCost ?? 0) + loss;
    this.recalcNetProfit();
  }

  /** Ghi tiền boa. */
  public addTip(tip: number): void {
    this.statistics.totalRevenue = (this.statistics.totalRevenue ?? 0) + tip;
    this.currentDayRecord.revenue += tip;
    this.recalcNetProfit();
  }

  /** Ghi giá trị hàng nhập. */
  public addPurchaseTotal(amount: number): void {
    this.currentDayRecord.purchaseTotal += amount;
  }

  /** Ghi giá trị hàng tồn kho loại bỏ. */
  public recordInventoryDispose(disposed: number, quantity: number): void {
    this.statistics.totalSpoiled = (this.statistics.totalSpoiled ?? 0) + disposed;
  }

  // --- Rating ---

  public addRating(stars: number): void {
    const previousCount = this.currentDayRecord.ratingCount ?? 0;
    this.currentDayRecord.averageStars = ((this.currentDayRecord.averageStars ?? 0) * previousCount + stars) / (previousCount + 1);
    this.currentDayRecord.ratingCount = previousCount + 1;
  }

  // --- Recalculate ---

  public recalcNetProfit(): void {
    this.currentDayRecord.netProfit =
      this.currentDayRecord.grossProfit
      - this.currentDayRecord.spoilageCost
      - this.currentDayRecord.wagesPaid
      - (this.currentDayRecord.maintenanceCost ?? 0)
      - (this.currentDayRecord.theftCost ?? 0)
      + (this.currentDayRecord.theftRecovered ?? 0)
      - (this.currentDayRecord.counterfeitLoss ?? 0)
      - (this.currentDayRecord.badDebtCost ?? 0);
  }

  /** Tính netProfit cuối ngày dựa trên revenue đã cập nhật. */
  public finalizeNetProfit(): void {
    this.currentDayRecord.grossProfit = this.currentDayRecord.revenue - this.currentDayRecord.cogs;
    this.recalcNetProfit();
  }

  // --- Summary stats ---

  public getStallSummary(): Record<string, { stallCount: number; stallServings: number }> {
    const result: Record<string, { stallCount: number; stallServings: number }> = {};
    for (const record of Object.values(this.dailyRecords)) {
      if (record.stallServings) {
        for (const [stallId, count] of Object.entries(record.stallServings)) {
          result[stallId] = result[stallId] || { stallCount: 0, stallServings: 0 };
          result[stallId].stallServings += count;
        }
      }
    }
    return result;
  }

  /** Tính tổng doanh thu các ngày đã đóng (trừ ngày hiện tại). */
  public getTotalClosedRevenue(): number {
    let total = 0;
    for (const day of this.closedDayIds) {
      if (day !== this.currentDayRecord.day) {
        total += this.dailyRecords[day]?.revenue ?? 0;
      }
    }
    return total;
  }

  /** Tổng sản phẩm đã bán theo ngày (trừ ngày hiện tại). */
  public getTotalItemsSoldExcludingCurrentDay(): number {
    let total = 0;
    for (const day of this.closedDayIds) {
      if (day !== this.currentDayRecord.day) {
        total += this.dailyRecords[day]?.itemsSold ?? 0;
      }
    }
    return total;
  }

  /** Tổng số ngày đã đóng. */
  public getClosedDayCount(): number {
    let count = 0;
    for (const day of this.closedDayIds) {
      if (day !== this.currentDayRecord.day) count++;
    }
    return count;
  }
}

function parseLedgerSuffix(id: string): number {
  const match = id.match(/^led-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}
