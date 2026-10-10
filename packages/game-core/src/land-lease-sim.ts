/**
 * Mô phỏng TIẾN ĐỘ 60 NGÀY cho cho thuê + mua lại lô đất (OpenSpec `open-world-land-lease` task 2.3, D2/D3/D4/D6 — PROVISIONAL).
 *
 * Mục đích: KIỂM TRA số (chốt số trước khi nối thật) — giá đất động và cơ chế thuê/mua có bùng phát
 * (bùng nổ giá, nợ chất đống, đóng cửa vĩnh viễn, khấu trừ mua quá hào phóng) hay không khi thành phố
 * tăng trưởng tối đa, khi quỹ cạn giữa chừng, v.v.
 *
 * Module THUẦN, không phụ thuộc socket/gateway/UI/save. KHÔNG sửa file sẵn có.
 * CÁC HẰNG SỐ local PROVISIONAL (LEASE_DAILY_RATE, LEASE_CREDIT_RATE, TIER_FACTOR, NEARBY_BONUS, PRICE_CAP_MULTIPLIER)
 * đồng bộ với sibling task 1.2 `parcel-price.ts` và `@game/data/world/land-lease.ts` (`LAND_LEASE_CONSTANTS`) —
 * khi nối thật nên import 1 nguồn duy nhất để tránh trùng lặp (import chéo hiện gây typecheck fail tạm, như sibling đã note).
 * Nối lệnh `lease_parcel`/`end_lease`/`pay_rent_debt` + thu tiền đầu ngày + UI là SAU (máy thật —
 * schema tương lai đổi `ownedParcelIds` thành bản ghi là refactor toàn hệ), ngoài phạm vi file này.
 */

/** Số ngày mô phỏng chuẩn (60 ngày) — PROVISIONAL, để chốt số trước khi nối thật. */
export const LEASE_SIM_DAYS = 60;

// ---------------------------------------------------------------------------------------------------------------------
// Hằng số cho thuê đất (design D2/D3/D4/D6, PROVISIONAL — chốt sau mô phỏng/playtest)
// ---------------------------------------------------------------------------------------------------------------------

/** Phí thuê mỗi ngày = % giá lô mỗi ngày. D2: 0.02/ngày */
export const LEASE_DAILY_RATE = 0.02;

/** Tín dụng khi mua lô đang thuê: mỗi đồng đã trả tiền thuê được trừ 50% vào giá mua (D4). */
export const LEASE_CREDIT_RATE = 0.5;

/** Số ngày nợ liên tiếp trước khi tòa bị "đóng cửa vì nợ thuê" (`closedForRent`). D2: ≥3. */
export const LEASE_DEBT_LIMIT = 3;

/** Hệ số cộng giá theo mỗi tòa nhà gần lô (D3, PROVISIONAL — chốt sau playtest). */
export const NEARBY_BONUS = 0.05;

/** Trần giá đất: giá không vượt quá `PRICE_CAP_MULTIPLIER` × mức gốc của lô (D3/D6). */
export const PRICE_CAP_MULTIPLIER = 2.5;

/**
 * Hệ số giá theo cấp thành phố `tierFactor[cityTier]` (D3, PROVISIONAL theo `cityTierFrom` 0..5).
 * Cấp 0 (ban đầu, chỉ W0) ra 1.0 để mặt bằng giá mốc không đổi; tăng dần theo cấp.
 * GIỮ ĐỒNG BỘ với sibling task 1.2 `parcel-price.ts` và `@game/data/world/land-lease.ts`
 * (`LAND_LEASE_CONSTANTS.tierFactor`) — khi nối thật nên import 1 nguồn duy nhất từ đó.
 */
export const TIER_FACTOR: readonly number[] = [1, 1.1, 1.25, 1.45, 1.7, 2];

const tierClamped = (tier: number): number => {
  const t = Number.isFinite(tier) ? Math.floor(tier) : 0;
  return Math.max(0, Math.min(TIER_FACTOR.length - 1, t));
};

export interface LandLeaseConfig {
  /** Giá gốc mỗi ô của lô (đồng/ô) — tương ứng `PARCEL_BASE_PRICE`. */
  basePrice: number;
  /** Số ô của lô. */
  tileCount: number;
  /** Hệ số giá vị trí của lô (góc đường chính 1.6, ... ), mặc định 1.0. */
  landValueMultiplier: number;
  /** Cấp thành phố theo ngày, `(day) => tier` với 0..5 (đơn điệu để giá đơn điệu). */
  cityTierGrowth: (day: number) => number;
  /** Số tòa nhà gần lô theo ngày (đơn điệu để giá đơn điệu). */
  nearbyBuildings: (day: number) => number;
  /** Quỹ sẵn có mỗi ngày để trả tiền thuê (đồng), `(day) => funds`. */
  dailyFunds: (day: number) => number;
}

/** Mức gốc (mốc so sánh) của giá lô: `basePrice × số ô × hệ số vị trí` (D4). */
export function leaseBasePrice(config: LandLeaseConfig): number {
  return config.basePrice * config.tileCount * config.landValueMultiplier;
}

/**
 * Giá lô động (≤ trần ×2.5 so với mức gốc):
 * `basePrice × số ô × landValueMultiplier × tierFactor[cityTier] × (1 + NEARBY_BONUS × tòa gần)`,
 * cắt trần tại `PRICE_CAP_MULTIPLIER` × mức gốc (D3/D6).
 */
export function parcelPriceAt(config: LandLeaseConfig, day: number): number {
  const base = leaseBasePrice(config);
  const tier = tierClamped(config.cityTierGrowth(day));
  const nearby = Math.max(0, Number.isFinite(config.nearbyBuildings(day)) ? config.nearbyBuildings(day) : 0);
  const raw = base * TIER_FACTOR[tier] * (1 + NEARBY_BONUS * nearby);
  const cap = base * PRICE_CAP_MULTIPLIER;
  return Math.round(Math.min(raw, cap));
}

/** Phí thuê một ngày = giá lô × LEASE_DAILY_RATE, làm tròn (D2). */
export function leaseCharge(price: number): number {
  return Math.round(price * LEASE_DAILY_RATE);
}

/**
 * Tín dụng mua lại lô đang thuê (D4): mỗi đồng thuê đã trả được trừ 50%, nhưng không vượt quá 50% giá lô.
 * `saved = min(paidTotal × LEASE_CREDIT_RATE, price × 0.5)`; giá mua thực = `price − saved`.
 */
export function purchaseCredit(paidTotal: number, price: number): number {
  const paid = Math.max(0, Number.isFinite(paidTotal) ? paidTotal : 0);
  const p = Math.max(0, Number.isFinite(price) ? price : 0);
  return Math.min(paid * LEASE_CREDIT_RATE, p * 0.5);
}

export interface LandLeaseDay {
  day: number;
  /** Giá lô động của ngày (đã áp trần ×2.5). */
  price: number;
  /** Tiền thuê ngày đó (trần lên từ `price`). */
  dailyRent: number;
  /** Tiền thuê THỰC trả ngày đó (0 nếu quỹ thiếu). */
  rentPaid: number;
  /** Số ngày nợ liên tiếp đến hết ngày đó. */
  debtDays: number;
  /** `true` nếu hết ngày đó tòa đóng cửa vì nợ (debtDays ≥ 3) — KHÔNG phá tòa. */
  closed: boolean;
}

export interface LandLeaseSimResult {
  dayByDay: LandLeaseDay[];
  /** Tổng tiền thuê đã trả thực trong 60 ngày. */
  totalRentPaid: number;
  /** Số tiền được trừ khi mua lô cuối kỳ (tín dụng thuê) — `min(paidTotal×0.5, 50% giá cuối)`. */
  purchaseCreditSaved: number;
  /** Giá mua thực cuối kỳ = giá cuối − tín dụng. */
  finalPurchasePrice: number;
  /** `true` nếu từng đóng cửa vì nợ thuê ≥ 3 ngày liên tiếp. */
  everClosed: boolean;
  /** Ghi chú PROVISIONAL về con số/nhận xét để chốt. */
  notes: string[];
}

/**
 * Mô phỏng tiến độ thuê lô qua `days` ngày (mặc định `LEASE_SIM_DAYS`).
 *
 * Luật nợ (D2): mỗi ngày, nếu quỹ ≥ phí thuê → trả đủ (debtDays về 0, nợ cũ xem như đã trả khi có tiền);
 * ngược lại → không trả, `debtDays += 1`, cộng dồn `rentDebt`. `debtDays ≥ 3` → tòa `closedForRent`
 * (đóng cửa, KHÔNG phá tòa); khi quỹ lại đủ thì mở lại được.
 */
export function simulateLeaseRun(config: LandLeaseConfig, days: number = LEASE_SIM_DAYS): LandLeaseSimResult {
  const dayByDay: LandLeaseDay[] = [];
  let debtDays = 0;
  let totalRentPaid = 0;
  let everClosed = false;

  for (let day = 1; day <= days; day++) {
    const price = parcelPriceAt(config, day);
    const rent = leaseCharge(price);
    const funds = config.dailyFunds(day);

    let rentPaid: number;
    if (funds >= rent) {
      rentPaid = rent;
      debtDays = 0;
      totalRentPaid += rent;
    } else {
      rentPaid = 0;
      debtDays += 1;
    }
    const closed = debtDays >= LEASE_DEBT_LIMIT;
    if (closed) everClosed = true;

    dayByDay.push({ day, price, dailyRent: rent, rentPaid, debtDays, closed });
  }

  const finalPrice = dayByDay[dayByDay.length - 1].price;
  const purchaseCreditSaved = purchaseCredit(totalRentPaid, finalPrice);
  const finalPurchasePrice = finalPrice - purchaseCreditSaved;
  const notes = buildNotes({ dayByDay, totalRentPaid, purchaseCreditSaved, finalPurchasePrice, everClosed });

  return {
    dayByDay,
    totalRentPaid,
    purchaseCreditSaved,
    finalPurchasePrice,
    everClosed,
    notes,
  };
}

/** Ghi chú PROVISIONAL tự động rút ra từ kết quả (để chốt số). */
function buildNotes(r: Pick<LandLeaseSimResult, 'dayByDay' | 'totalRentPaid' | 'purchaseCreditSaved' | 'finalPurchasePrice' | 'everClosed'>): string[] {
  const notes: string[] = [];
  const first = r.dayByDay[0];
  const last = r.dayByDay[r.dayByDay.length - 1];
  const base = first.price;

  notes.push(`PROVISIONAL: giá từ ${first.price} → ${last.price} (tăng ${(last.price / base - 1) * 100}%) qua ${r.dayByDay.length} ngày, cap ${PRICE_CAP_MULTIPLIER}× mức gốc.`);
  if (last.price >= leaseBasePriceFromDay(r.dayByDay[0]) * PRICE_CAP_MULTIPLIER) {
    notes.push('PROVISIONAL: giá đụng trần ×2.5 — cap đang chặn bùng nổ (đúng thiết kế D3/D6).');
  } else {
    notes.push('PROVISIONAL: giá chưa đụng trần trong kịch bản này.');
  }
  notes.push(`PROVISIONAL: tổng thuê đã trả ${r.totalRentPaid}, tín dụng mua lại ${r.purchaseCreditSaved}, giá mua thực ${r.finalPurchasePrice}.`);
  if (r.everClosed) {
    notes.push('PROVISIONAL: tòa từng đóng cửa vì nợ ≥3 ngày liên tiếp (KHÔNG phá tòa — trả nợ mở lại).');
  } else {
    notes.push('PROVISIONAL: không từng đóng cửa vì nợ trong 60 ngày.');
  }
  return notes;
}

// Tiện ích nội bộ: đọc mức gốc từ một LandLeaseDay (bằng giá ngày 1 khi cityTier/day1 === 0, tòa gần 0).
function leaseBasePriceFromDay(firstDay: LandLeaseDay): number {
  // Giá ngày 1 (khi tier 0, tòa gần 0) bằng mức gốc (landValueMultiplier × base × ô).
  return firstDay.price;
}
