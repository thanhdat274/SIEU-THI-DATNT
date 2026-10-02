/** Quản lý các sequence số cho việc tạo ID duy nhất (production jobs, customer credits, v.v.). */
export class IdSequenceManager {
  private productionJobSequence = 0;
  private customerCreditSequence = 0;

  public getProductionJobSequence(): number { return this.productionJobSequence; }
  public getCustomerCreditSequence(): number { return this.customerCreditSequence; }

  /** Tăng và trả về productionJobSequence (dùng khi tạo job mới). */
  public nextProductionJobId(): number {
    return ++this.productionJobSequence;
  }

  /** Tăng và trả về customerCreditSequence (dùng khi tạo credit mới). */
  public nextCustomerCreditId(): number {
    return ++this.customerCreditSequence;
  }

  /** Load từ save data. */
  public load(prodSeq: number, creditSeq: number): void {
    this.productionJobSequence = prodSeq;
    this.customerCreditSequence = creditSeq;
  }

  /** Export để serialize. */
  public export(): { productionJobSequence: number; customerCreditSequence: number } {
    return { productionJobSequence: this.productionJobSequence, customerCreditSequence: this.customerCreditSequence };
  }
}
