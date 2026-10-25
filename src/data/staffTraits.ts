/**
 * Tính cách và tay nghề của nhân viên: mỗi người một tính (ẩn lúc mới thuê, lộ dần khi làm),
 * làm lâu thì lên sao, chủ bỏ tiền đào tạo thì lên nhanh hơn. Có người "tắt mắt" lén ăn bớt tiền
 * két hoặc lấy hàng trong kho; camera và quản lý giúp bắt quả tang.
 * Chỉ có dữ liệu và hàm thuần; áp vào trạng thái ở `core/slices/endDay` và `core/slices/staff`.
 */
import { skillSpeed, type Staff } from './staff';

export type StaffTrait = 'steady' | 'diligent' | 'friendly' | 'lazy' | 'sticky';

export interface TraitDef {
  name: string;
  icon: string;
  desc: string;
  /** Nhân tốc độ làm việc. */
  speedMul: number;
  /** Nhân kinh nghiệm nhận được mỗi ngày. */
  expMul: number;
  /** Tỉ trọng khi sinh ứng viên. */
  weight: number;
}

export const TRAITS: Record<StaffTrait, TraitDef> = {
  steady: { name: 'Bình thường', icon: '🙂', desc: 'Làm đúng việc, không có gì đặc biệt', speedMul: 1, expMul: 1, weight: 4 },
  diligent: { name: 'Chăm chỉ', icon: '💪', desc: 'Làm nhanh hơn 15%, học việc nhanh gấp rưỡi', speedMul: 1.15, expMul: 1.5, weight: 2 },
  friendly: { name: 'Niềm nở', icon: '😊', desc: 'Đứng quầy hay chăm sóc khách thì khách hay khen tiệm và boa thêm', speedMul: 1, expMul: 1, weight: 2 },
  lazy: { name: 'Lười', icon: '🥱', desc: 'Làm chậm 20%, học việc chậm một nửa', speedMul: 0.8, expMul: 0.5, weight: 1.5 },
  sticky: { name: 'Tắt mắt', icon: '🦝', desc: 'Lén ăn bớt tiền két hoặc lấy hàng trong kho', speedMul: 1, expMul: 1, weight: 1 },
};

/** Làm chừng này ngày thì lộ tính thật (trừ người tắt mắt: chỉ lộ khi bị bắt, trông như người bình thường). */
export const REVEAL_AFTER_DAYS = 3;
/** Kinh nghiệm cần để lên sao kế tiếp. */
export const expToNext = (skill: number) => skill * 4;
/** Mỗi lần đào tạo cộng chừng này kinh nghiệm (nhân theo tính). */
export const TRAIN_EXP = 4;
/** Giá một buổi đào tạo theo số sao hiện tại. */
export const trainCost = (skill: number) => skill * 60000;
/** Lên một sao thì đòi tăng lương chừng này phần. */
export const RAISE_PER_STAR = 0.12;

/** Người tắt mắt đứng quầy ăn bớt chừng này phần doanh thu ngày. */
export const SKIM_RANGE: [number, number] = [0.02, 0.05];
/** Người tắt mắt làm việc khác lấy chừng này món trong kho mỗi ngày. */
export const PILFER_RANGE: [number, number] = [2, 5];
/** Xác suất bắt quả tang mỗi ngày: cơ bản, có camera, có quản lý. */
export const CATCH_BASE = 0.12;
export const CATCH_CAMERA = 0.35;
export const CATCH_MANAGER = 0.2;
/** Người niềm nở đứng quầy: xác suất mỗi ngày có thêm một lời khen 5★, và phần boa thêm trên doanh thu. */
export const FRIENDLY_REVIEW_CHANCE = 0.4;
export const FRIENDLY_TIP = 0.004;

export const traitOf = (st: Staff): StaffTrait => st.trait ?? 'steady';

/** Tính chủ tiệm đang thấy: chưa lộ thì "Chưa rõ", người tắt mắt chưa bị bắt thì trông như bình thường. */
export function shownTrait(st: Staff): StaffTrait | null {
  const t = traitOf(st);
  if (t === 'sticky') return st.caught ? 'sticky' : (st.daysWorked ?? 0) >= REVEAL_AFTER_DAYS ? 'steady' : null;
  return (st.daysWorked ?? 0) >= REVEAL_AFTER_DAYS ? t : null;
}

/** Tốc độ làm việc thật: theo sao và tính cách. */
export const workSpeed = (st: Staff) => skillSpeed(st.skill) * TRAITS[traitOf(st)].speedMul;

/** Bốc một tính theo tỉ trọng. */
export function rollTrait(rng: () => number = Math.random): StaffTrait {
  const ids = Object.keys(TRAITS) as StaffTrait[];
  let r = rng() * ids.reduce((n, id) => n + TRAITS[id].weight, 0);
  for (const id of ids) {
    r -= TRAITS[id].weight;
    if (r < 0) return id;
  }
  return 'steady';
}

/** Cộng kinh nghiệm, đủ thì lên sao (tối đa 5) và tăng lương. */
export function gainExp(st: Staff, amount: number): { staff: Staff; leveled: boolean } {
  let exp = (st.exp ?? 0) + amount * TRAITS[traitOf(st)].expMul;
  let { skill, wage } = st;
  let leveled = false;
  while (skill < 5 && exp >= expToNext(skill)) {
    exp -= expToNext(skill);
    skill++;
    wage = Math.round((wage * (1 + RAISE_PER_STAR)) / 1000) * 1000;
    leveled = true;
  }
  if (skill >= 5) exp = 0;
  return { staff: { ...st, exp: Math.round(exp * 10) / 10, skill, wage }, leveled };
}

export interface StaffDayCtx {
  revenue: number;
  storage: Record<string, number>;
  hasCamera: boolean;
  hasManager: boolean;
  rng?: () => number;
}

export interface StaffDayResult {
  staff: Staff[];
  /** Tiền két bị ăn bớt mà không ai biết. */
  cashLoss: number;
  /** Hàng trong kho bị lấy mà không ai biết. */
  goodsTaken: Record<string, number>;
  /** Số lời khen 5★ thêm nhờ người niềm nở, và tiền boa thêm. */
  praises: number;
  tips: number;
  news: string[];
}

/** Hết ngày: ai cũng thêm một ngày công và kinh nghiệm; người tắt mắt ra tay; người niềm nở được khen. */
export function staffDayEnd(list: Staff[], ctx: StaffDayCtx): StaffDayResult {
  const rng = ctx.rng ?? Math.random;
  const between = ([a, b]: [number, number]) => a + rng() * (b - a);
  const goodsTaken: Record<string, number> = {};
  const left = { ...ctx.storage };
  const news: string[] = [];
  let cashLoss = 0;
  let praises = 0;
  let tips = 0;
  const staff = list.map((st0) => {
    const { staff: st, leveled } = gainExp({ ...st0, daysWorked: (st0.daysWorked ?? 0) + 1 }, 1);
    if (leveled) news.push(`⭐ ${st.name} lên tay nghề ${st.skill}★ (lương mới ${Math.round(st.wage / 1000)}k/ca)`);
    if (shownTrait(st0) === null && shownTrait(st) !== null && traitOf(st) !== 'sticky') news.push(`${TRAITS[traitOf(st)].icon} Làm được mấy hôm, mới biết ${st.name} là người ${TRAITS[traitOf(st)].name.toLowerCase()}`);
    const front = st.role === 'cashier' || st.role === 'customer_care';
    if (traitOf(st) === 'friendly' && front) {
      if (rng() < FRIENDLY_REVIEW_CHANCE) praises++;
      tips += Math.round((ctx.revenue * FRIENDLY_TIP) / 1000) * 1000;
    }
    if (traitOf(st) !== 'sticky' || st.caught) return st;
    // Người tắt mắt: đứng quầy thì ăn bớt tiền két, làm việc khác thì lấy hàng trong kho
    let cash = 0;
    const took: Record<string, number> = {};
    if (st.role === 'cashier') cash = Math.round((ctx.revenue * between(SKIM_RANGE)) / 1000) * 1000;
    else {
      const pool = Object.keys(left).filter((id) => left[id] > 0);
      for (let n = Math.round(between(PILFER_RANGE)); n > 0 && pool.length; n--) {
        const id = pool[Math.floor(rng() * pool.length)];
        if (left[id] <= 0) continue;
        left[id]--;
        took[id] = (took[id] ?? 0) + 1;
      }
    }
    const items = Object.values(took).reduce((n, q) => n + q, 0);
    if (!cash && !items) return st;
    const chance = Math.min(0.85, CATCH_BASE + (ctx.hasCamera ? CATCH_CAMERA : 0) + (ctx.hasManager ? CATCH_MANAGER : 0));
    if (rng() < chance) {
      news.push(`🚨 Bắt quả tang ${st.name} ${cash ? `ăn bớt ${Math.round(cash / 1000)}k tiền két` : `lấy ${items} món trong kho`}! Đã thu lại, xem ở bảng Nhân viên để xử lý`);
      return { ...st, caught: true };
    }
    cashLoss += cash;
    for (const [id, q] of Object.entries(took)) goodsTaken[id] = (goodsTaken[id] ?? 0) + q;
    return st;
  });
  return { staff, cashLoss, goodsTaken, praises, tips, news };
}
