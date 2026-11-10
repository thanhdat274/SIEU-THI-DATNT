import { dateOfDoy, dayOfYear } from './calendar';
import type { Category } from './products';

/**
 * Hệ 8 — Biến cố dài (SPEC-CHIEU-RONG §8).
 *
 * Mỗi năm game có 0–2 đợt biến cố kéo 2–4 tuần: báo trước vài ngày → cao điểm → dịu dần.
 * THUẦN: không import store, không rút simRng (R1). Lịch suy từ `hash(weatherSeed, năm)` nên
 * TẤT ĐỊNH — hai máy cùng seed ra cùng lịch, dự báo luôn đúng.
 *
 * L1 (lát này): kiểu dữ liệu + `crisisFor` (lịch) + `crisisEffects` (hệ số nhân) + test lịch.
 *   - Cấp mở ≥ 36 (R1: golden cấp 30 không đổi), mọi hệ số trả 1 khi `biz.crisis` trống.
 *   - Không bao giờ đè 10 ngày trước Tết tới hết Tết, không rơi vào 30 ngày đầu ván,
 *     hai đợt cùng năm cách nhau ≥ 60 ngày.
 *
 * Nội dung đầy đủ của từng biến cố (việc chuẩn bị, cảnh lựa chọn, hậu quả) nhét vào lát L3+,
 * ở đây chỉ có khung dữ liệu + ① Đào đường với 3 giai đoạn hệ số để khung có gì mà chạy.
 * Mọi con số là ĐIỂM KHỞI ĐẦU — cân bằng thật qua crisisBalance.test.ts (L4) + simEconomy.
 */

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CrisisPhaseDef {
  label: string;
  /** Số ngày của giai đoạn. */
  days: number;
  /** Nhân lượng khách ghé. Bỏ trống = 1. */
  traffic?: number;
  /** Nhân giá nhập theo ngành (bão giá, dịch tả...). */
  cost?: Partial<Record<Category, number>>;
  /** Nhân giá nhập theo từng món. */
  costIds?: Record<string, number>;
  /** Cầu theo món: tăng + giảm. */
  demand?: { up: string[]; down: string[]; downMul?: number };
  /** Nhân số đơn kênh xa. */
  channel?: { online?: number; phone?: number };
  /** Khách nhạy giá hơn (thừa số tolerance). */
  sensitivity?: number;
  /** Bẩn sàn nhân thêm (đào đường). */
  dirt?: number;
  /** Hàng từ mối có `delayDays: 1` bị trễ một ngày với xác suất này (0–1, tất định theo ngày). */
  supplyDelay?: number;
  /** Trại bị ảnh hưởng đặc biệt. */
  farm?: 'flood' | 'drought' | 'swine';
}

export interface CrisisPrep {
  id: string;
  label: string;
  cost: number;
  needStock?: Record<string, number>;
  effect: string;
  /** Làm thì khách tối thiểu đạt mức này — crisisEffects lấy max giữa traffic giai đoạn và prep đã làm (cáp ≤ 1, nhiều prep lấy mức tốt nhất). */
  traffic?: number;
  /** Làm thì thay hệ số kênh (giữ đơn online/điện thoại ổn định hơn). */
  channel?: { online?: number; phone?: number };
}

export interface CrisisBoon {
  kind: 'road';
  /** Nhân khách ghé vĩnh viễn (cùng kiểu landmarkCustomerFactor). */
  traffic: number;
  label: string;
}

export interface CrisisDef {
  id: string;
  name: string;
  icon: string;
  unlock: number;
  /** Tháng dương lịch (1–12) cho phép biến cố xảy ra; bỏ trống = năm nào cũng được. */
  months?: number[];
  phases: CrisisPhaseDef[];
  preps: CrisisPrep[];
  /** Cảnh lựa chọn theo ngày thứ của đợt (0-based từ startDay) — lát L3. */
  scenes: { atDay: number; text: string; options: string[] }[];
  aftermath?: CrisisBoon;
}

export interface CrisisState {
  defId: string;
  /** Ngày game bắt đầu đợt (ngày đầu của giai đoạn Báo trước). */
  startDay: number;
  /** Id các việc chuẩn bị đã làm. */
  preps: string[];
  /** Ngày thứ (0-based) → lựa chọn đã chốt. */
  choices: Record<number, number>;
  /** Số lựa chọn "ấm" đã chốt (dùng cho hậu quả + thân thiết — hệ 2). */
  kind: number;
}

/** Năm game có 0 / 1 / 2 / yên ả (xác suất 60/25/15 — SPEC §8.3). */
export const CRISIS_YEAR_NONE = 0.15;
export const CRISIS_YEAR_ONE = 0.60;

const YEAR_DAYS = 365;
/** Dãy ngày trong năm (0-based) bị khoá: 10 ngày trước Tết tới hết Tết. Tết từ md(1,28) = doy 27. */
const TET_BLOCK_FROM = 17; // 27 − 10
const TET_BLOCK_TO = 38;   // md(2,8) = 31 + 7

/** Hash tất định (không rút simRng — R1), cùng kiểu weather.ts hash01. */
function hash01(seed: number, n: number, salt: number): number {
  let h = (seed ^ Math.imul(n, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ───────────────────── Các biến cố đợt đầu ─────────────────────

/** ① Đào đường làm cống — mùa khô, cấp 36 (SPEC §8.4). Làm trước vì chỉ gồm hệ số + kênh có sẵn. */
const DAO_DUONG: CrisisDef = {
  id: 'dao_duong',
  name: 'Hẻm đào đường làm cống',
  icon: '🚧',
  unlock: 36,
  months: [1, 2, 3, 4, 11, 12], // mùa khô (điểm khởi đầu — cân bằng qua sim)
  phases: [
    { label: 'Báo trước', days: 4, traffic: 1 },
    { label: 'Cao điểm', days: 10, traffic: 0.65, channel: { online: 1.4, phone: 1.5 }, dirt: 2, supplyDelay: 0.3 },
    { label: 'Dịu dần', days: 4, traffic: 0.85 },
  ],
  // L3 — 3 việc chuẩn bị. Giá là ĐIỂM KHỞI ĐẦU; cân bằng thật qua crisisBalance (L4) + simEconomy.
  preps: [
    {
      id: 'courier', label: 'Thuê thêm người giao hàng', cost: 450_000,
      effect: 'Xe giao riêng tránh được đoạn đào — đơn online / điện thoại mất ít hơn.',
      channel: { online: 1.15, phone: 1.2 },
    },
    {
      id: 'banner', label: 'Treo băng rôn “Vẫn mở cửa — giao tận nhà”', cost: 180_000,
      traffic: 0.78, channel: { online: 1.1, phone: 1.2 },
      effect: 'Khách đọc băng rôn biết mình còn mở — khách đi bộ mất ít hơn (×0,78).',
    },
    {
      id: 'path', label: 'Góp tiền làm lối đi tạm bằng ván', cost: 1_500_000,
      traffic: 0.85,
      effect: 'Mọi người đi lại được nhờ — khách chỉ còn ×0,85 và xóm nhớ tấm lòng (thân thiết +).',
    },
  ],
  scenes: [
    {
      atDay: 3, // cuối tuần Báo trước / đầu Cao điểm
      text: 'Công nhân làm cống xin gửi nhờ xe cút kít trước cửa và mua chịu ít nước cho công trình.',
      options: ['Gửi nhờ + bán chịu (cả đợt có thêm khách công nhân, +thân thiết)', 'Từ chối, cứ làm việc của mình'],
    },
    {
      atDay: 9, // giữa Cao điểm
      text: 'Lúc mưa to, ống nước vỡ làm ngập trước cửa cả dãy nhà.',
      options: ['Tự bỏ tiền thuê bơm cho cả dãy (tốn tiền, +thân thiết lan theo cụm)', 'Chờ phường xử lý'],
    },
  ],
  aftermath: { kind: 'road', traffic: 1.03, label: 'Đường mới khang trang: khách ghé thêm' },
};

export const CRISIS_DEFS: CrisisDef[] = [DAO_DUONG];

export const crisisDefById = (id: string) => CRISIS_DEFS.find((c) => c.id === id);

export const crisisTotalDays = (def: CrisisDef) => def.phases.reduce((n, p) => n + p.days, 0);

// ───────────────────── Lịch biến cố (TẤT ĐỊNH) ─────────────────────

function eligibleDay(def: CrisisDef, year: number, day: number, prevStart: number): boolean {
  const doy = dayOfYear(day);
  const month = dateOfDoy(doy).month;
  if (def.months && !def.months.includes(month)) return false;
  // Không đè 10 ngày trước Tết tới hết Tết
  if (doy >= TET_BLOCK_FROM && doy <= TET_BLOCK_TO) return false;
  // Không rơi vào 30 ngày đầu của ván (năm 0) hay của một vòng tái sinh (vòng năm 0)
  if (year === 0 && day <= 30) return false;
  // Hai đợt cùng năm cách nhau ≥ 60 ngày (mốc trước chỉ tính trong cùng năm này)
  if (prevStart > 0 && day - prevStart < 60) return false;
  return true;
}

/**
 * Một đợt biến cố suy từ hash cho vị trí thứ `i` trong năm `year`.
 * Trả ngày bắt đầu (1-based), hoặc null nếu không đặt được (hiếm — năm chật).
 */
function crisisStart(seed: number, year: number, i: number, def: CrisisDef, prevStart: number): number | null {
  const base = year * YEAR_DAYS + 1;
  const startDoy = Math.floor(hash01(seed, year * 29 + i, 3000) * YEAR_DAYS);
  for (let probe = 0; probe < YEAR_DAYS; probe++) {
    const doy = (startDoy + probe) % YEAR_DAYS;
    const day = base + doy;
    if (eligibleDay(def, year, day, prevStart)) return day;
  }
  return null;
}

/** Các đợt biến cố của một năm game (0–2), tất định theo seed. Cách nhau ≥ 60 ngày. */
export function yearCrises(seed: number, year: number, level: number): { defId: string; startDay: number }[] {
  if (level < 36) return [];
  const r = hash01(seed, year, 1000);
  const n = r < CRISIS_YEAR_NONE ? 0 : r < CRISIS_YEAR_ONE ? 1 : 2;
  if (!n) return [];
  const pool = CRISIS_DEFS.filter((d) => level >= d.unlock);
  if (!pool.length) return [];
  const out: { defId: string; startDay: number }[] = [];
  let prevStart = -1;
  for (let i = 0; i < n && pool.length; i++) {
    const di = Math.floor(hash01(seed, year * 17 + i, 2000) * pool.length);
    const def = pool[di];
    const start = crisisStart(seed, year, i, def, prevStart);
    if (start === null) break;
    out.push({ defId: def.id, startDay: start });
    prevStart = start;
  }
  return out;
}

/**
 * Biến cố đang hoạt động cho ngày `day` (gồm giai đoạn Báo trước), nếu có.
 * `calm` = Năm yên ả (đã tắt biến cố dài trong cài đặt) → luôn null.
 * THUẦN — endDay mỗi đêm gọi để mở/đóng đợt.
 */
export function crisisFor(
  seed: number,
  day: number,
  level: number,
  calm = false,
): { defId: string; startDay: number } | null {
  if (calm) return null;
  const year = Math.floor((day - 1) / YEAR_DAYS);
  // Đợt mở ra có thể trải sang năm sau (bắt đầu cuối năm), nên phải tra cả năm hiện tại và năm trước.
  const years = year > 0 ? [year, year - 1] : [year];
  for (const y of years) {
    for (const slot of yearCrises(seed, y, level)) {
      const def = crisisDefById(slot.defId);
      if (!def) continue;
      const total = crisisTotalDays(def);
      if (day >= slot.startDay && day < slot.startDay + total) return slot;
    }
  }
  return null;
}

/** Biến cố đang có hiệu lực hiệu ứng cho ngày `day` (chỉ các giai đoạn có hiệu lực, không tính Báo trước nếu trống). */
export function crisisActive(
  seed: number,
  day: number,
  level: number,
  calm = false,
): { defId: string; startDay: number; phase: CrisisPhaseDef; dayIndex: number } | null {
  const slot = crisisFor(seed, day, level, calm);
  if (!slot) return null;
  const def = crisisDefById(slot.defId)!;
  let off = day - slot.startDay;
  for (const phase of def.phases) {
    if (off < phase.days) return { ...slot, phase, dayIndex: off };
    off -= phase.days;
  }
  return null;
}

// ───────────────────── Hiệu ứng nhân (R16) ─────────────────────

export interface CrisisEffects {
  /** Nhân lượng khách ghé (rush). */
  traffic: number;
  /** Nhân giá nhập của một món `productId` thuộc ngành `category`. */
  cost: (productId: string, category: Category) => number;
  /** Cầu theo món; undefined = không đổi. */
  demand?: { up: string[]; down: string[]; downMul?: number };
  /** Nhân số đơn online / điện thoại. */
  channel?: { online?: number; phone?: number };
  /** Thừa số độ nhạy giá của khách. */
  sensitivity?: number;
  /** Bẩn sàn nhân. */
  dirt?: number;
  /** Hàng giao sáng mai bị trễ một ngày xác suất này (dùng tại endDay khi xử deliveries, tất định theo ngày). */
  supplyDelay?: number;
  /** Trại bị ảnh hưởng đặc biệt. */
  farm?: 'flood' | 'drought' | 'swine';
}

/** Hiệu ứng biến cố cho ngày `day` khi biến cố `st` đang chạy. Mọi hệ số = 1 khi không có biến cố. */
export function crisisEffects(st: CrisisState | undefined, day: number): CrisisEffects {
  if (!st) return { traffic: 1, cost: () => 1 };
  const def = crisisDefById(st.defId);
  if (!def) return { traffic: 1, cost: () => 1 };
  let off = day - st.startDay;
  let phase: CrisisPhaseDef | null = null;
  for (const p of def.phases) {
    if (off < p.days) { phase = p; break; }
    off -= p.days;
  }
  if (!phase) return { traffic: 1, cost: () => 1 };
  // L3 — việc chuẩn bị đã làm làm dịu đợt: khách lấy mức tốt nhất (max), kênh dùng hiệu ứng prep (thay giai đoạn).
  const prepsDone = def.preps.filter((p) => st.preps.includes(p.id));
  const prepTraffic = prepsDone.reduce((m, p) => Math.max(m, p.traffic ?? 0), 0);
  const traffic = Math.max(phase.traffic ?? 1, prepTraffic);
  // Kênh chỉ có ý nghĩa ở giai đoạn nào vốn ghi hiệu ứng kênh (Cao điểm); prep làm thì override lên trên.
  const baseChannel = phase.channel;
  const chanOn = prepsDone.find((p) => p.channel?.online !== undefined)?.channel?.online;
  const chanPh = prepsDone.find((p) => p.channel?.phone !== undefined)?.channel?.phone;
  return {
    traffic,
    cost: (productId, category) => {
      if (phase.costIds?.[productId] !== undefined) return phase.costIds[productId];
      return phase.cost?.[category] ?? 1;
    },
    ...(phase.demand ? { demand: phase.demand } : {}),
    channel: baseChannel
      ? { online: chanOn ?? baseChannel.online, phone: chanPh ?? baseChannel.phone }
      : undefined,
    ...(phase.sensitivity !== undefined ? { sensitivity: phase.sensitivity } : {}),
    ...(phase.dirt !== undefined ? { dirt: phase.dirt } : {}),
    ...(phase.supplyDelay !== undefined ? { supplyDelay: phase.supplyDelay } : {}),
    ...(phase.farm ? { farm: phase.farm } : {}),
  };
}

/** Tên giai đoạn hiện tại cho chip HUD / thẻ Sổ đầu ngày. */
export function crisisPhaseLabel(def: CrisisDef, day: number, st: CrisisState): string {
  let off = day - st.startDay;
  for (const p of def.phases) {
    if (off < p.days) return p.label;
    off -= p.days;
  }
  return def.phases.at(-1)?.label ?? '';
}

// ───────────────────── Đêm đóng đợt / mở đợt (gọi từ endDay) ─────────────────────

/** Lát cắt biz mà `crisisNight` đọc/ghi — endDay gộp vào state. */
export interface CrisisBizSlice {
  crisis?: CrisisState;
  crisesSeen?: string[];
  calmYears?: boolean;
  roadBoon?: boolean;
  lastCrisis?: { defId: string; endDay: number; loss: number; saved: number };
}

export interface CrisisNightResult {
  crisis: CrisisState | undefined;
  crisesSeen: string[];
  roadBoon: boolean;
  lastCrisis: { defId: string; endDay: number; loss: number; saved: number } | undefined;
  /** Tin đêm để gộp vào bản tin ngày mai. */
  news: string[];
}

/**
 * Mỗi đêm, SỔ ĐẦU NGÀY tính đợt biến cố cho ngày mai từ lịch tất định và mở/đóng trạng thái:
 * - hết đợt đang chạy → ghi nhận aftermath (đường mới) + lastCrisis, xoá crisis;
 * - tới ngày đầu đợt mới (Báo trước) → tạo CrisisState + đếm vào crisesSeen;
 * - ECHO: đang giữa đợt → giữ nguyên crisis (để preps/choices không bị xoá).
 * THUẦN — không rút simRng (R1), lịch suy từ hash. Tắt bằng `calmYears` (Năm yên ả).
 */
export function crisisNight(
  seed: number,
  /** Ngày game sắp KẾT THÚC (đêm này); ta chuẩn bị cho ngày mai = day + 1. */
  day: number,
  level: number,
  biz: CrisisBizSlice,
  calm = false,
): CrisisNightResult {
  const calmOn = calm || (biz.calmYears ?? false);
  const next = day + 1;
  // Đợt sẽ còn hoạt động vào ngày mai? (gồm Báo trước)
  const willStay = crisisFor(seed, next, level, calmOn);
  const cur = biz.crisis;
  const crisesSeen = [...(biz.crisesSeen ?? [])];
  const news: string[] = [];
  let roadBoon = biz.roadBoon ?? false;
  let lastCrisis = biz.lastCrisis;

  const same = cur && willStay && willStay.defId === cur.defId && willStay.startDay === cur.startDay;
  // 1) Đóng đợt cũ đã hết (không còn trong lịch ngày mai, hoặc đổi đợt khác chưa xảy ra).
  if (cur && !same) {
    const def = crisisDefById(cur.defId);
    if (def?.aftermath?.kind === 'road') roadBoon = true;
    lastCrisis = { defId: cur.defId, endDay: next - 1, loss: 0, saved: cur.preps.length * 200000 };
    if (def) news.push(`${def.icon} ${def.name} đã kết thúc.${def.aftermath ? ` ${def.aftermath.label}.` : ''}`);
  }
  // 2) Mở đợt mới (hiện chưa chạy đợt cùng slot); giữ đợt đang giữa chừng (preps/choices).
  let crisis = cur && same ? cur : undefined;
  if (willStay && !same) {
    if (!crisesSeen.includes(willStay.defId)) crisesSeen.push(willStay.defId);
    const def = crisisDefById(willStay.defId)!;
    crisis = { defId: willStay.defId, startDay: willStay.startDay, preps: [], choices: {}, kind: 0 };
    news.push(`${def.icon} ${def.name}: ${crisisPhaseLabel(def, next, crisis)} — mở Sổ đầu ngày xem việc chuẩn bị.`);
  }
  return { crisis, crisesSeen, roadBoon, lastCrisis, news };
}
