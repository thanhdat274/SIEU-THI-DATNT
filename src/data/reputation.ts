/**
 * Danh tiếng có nguyên nhân: mỗi lượt khách về chấm 5 mặt (0–1), giữ các lượt gần nhất rồi lấy trung bình.
 * Người chơi thấy mặt nào kéo điểm xuống để sửa đúng chỗ.
 */
import { COOKED_PRODUCT_IDS, RECIPES } from './recipes';

export type RepFactor = 'price' | 'stock' | 'clean' | 'speed' | 'quality';

export const REP_FACTORS: RepFactor[] = ['price', 'stock', 'clean', 'speed', 'quality'];

export const REP_INFO: Record<RepFactor, { icon: string; name: string; low: string }> = {
  price: { icon: '🏷️', name: 'Giá cả', low: 'Nhiều khách thấy đắt, bỏ món lại kệ. Hạ giá về gần giá gợi ý.' },
  stock: { icon: '📦', name: 'Hàng có sẵn', low: 'Khách hay tìm món mà kệ trống. Châm kệ và nhập đủ món bán chạy.' },
  clean: { icon: '🧹', name: 'Vệ sinh', low: 'Tiệm bẩn lúc khách ghé. Quét dọn giờ vắng hoặc thuê lao công.' },
  speed: { icon: '⏱️', name: 'Tốc độ phục vụ', low: 'Khách chờ quầy lâu, có người bỏ về. Đứng quầy hoặc thuê thu ngân.' },
  quality: { icon: '🍲', name: 'Chất lượng món', low: 'Khách mua phải hàng cận hạn. Bán lô cũ sớm, nấu thêm món nhà làm.' },
};

/** Điểm một lượt khách; `quality` trống khi khách không mua gì. */
export type RepSample = Partial<Record<RepFactor, number>>;

/** Giữ bao nhiêu lượt khách gần nhất. */
export const REP_CAP = 80;
/** Dưới chừng này lượt thì chưa đủ để nói, coi như 3 sao. */
export const REP_MIN_SAMPLES = 10;
export const REP_NEUTRAL = 3;

const RECIPE_GAIN = new Map(RECIPES.map((r) => [r.outputId, r.reputationGain]));

/** Chất lượng một món: hàng thường 0.8, hàng cận hạn (bán giảm giá) 0.4, món nhà làm theo độ ngon của công thức. */
export function itemQuality(id: string, nearExpiry: boolean): number {
  if (nearExpiry) return 0.4;
  if (COOKED_PRODUCT_IDS.has(id)) return Math.min(1, 0.6 + 0.1 * (RECIPE_GAIN.get(id) ?? 1));
  return 0.8;
}

export interface VisitFacts {
  bought: { id: string; nearExpiry: boolean }[];
  priceMisses: number;
  stockMisses: number;
  /** Bỏ về vì chờ quầy quá lâu. */
  walkedOut: boolean;
  waitedMinutes: number;
  patience: number;
  /** Độ bẩn 0–1 lúc khách về. */
  dirt: number;
}

export function sampleVisit(f: VisitFacts): RepSample {
  const wanted = f.bought.length + f.priceMisses + f.stockMisses + (f.walkedOut ? 1 : 0);
  const out: RepSample = {
    clean: 1 - Math.min(1, f.dirt),
    speed: f.walkedOut ? 0 : 1 - Math.min(1, f.waitedMinutes / Math.max(1, f.patience)) * 0.8,
  };
  if (wanted > 0) {
    out.price = 1 - f.priceMisses / wanted;
    out.stock = 1 - f.stockMisses / wanted;
  }
  if (f.bought.length) out.quality = f.bought.reduce((n, b) => n + itemQuality(b.id, b.nearExpiry), 0) / f.bought.length;
  return out;
}

const toStars = (v: number) => 1 + 4 * v;

export interface Reputation {
  /** Sao 1–5 theo từng mặt (chưa có dữ liệu thì 3). */
  factors: Record<RepFactor, number>;
  overall: number;
  samples: number;
  /** Mặt yếu nhất, để gợi ý sửa. */
  weakest: RepFactor | null;
}

export function reputationOf(log: RepSample[] | undefined): Reputation {
  const samples = log?.length ?? 0;
  const factors = {} as Record<RepFactor, number>;
  for (const k of REP_FACTORS) {
    const vals = (log ?? []).map((s) => s[k]).filter((v): v is number => v !== undefined);
    factors[k] = samples < REP_MIN_SAMPLES || !vals.length ? REP_NEUTRAL : toStars(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const overall = REP_FACTORS.reduce((n, k) => n + factors[k], 0) / REP_FACTORS.length;
  const weakest = samples < REP_MIN_SAMPLES ? null : [...REP_FACTORS].sort((a, b) => factors[a] - factors[b])[0];
  return { factors, overall, samples, weakest };
}

/** Điều kiện danh tiếng: một mặt cụ thể, hoặc điểm chung khi không ghi mặt. */
export interface RepNeed {
  factor?: RepFactor;
  min: number;
}

export const repScore = (rep: Reputation, need: RepNeed) => need.factor ? rep.factors[need.factor] : rep.overall;
export const meetsRep = (rep: Reputation, need: RepNeed | undefined) => !need || repScore(rep, need) >= need.min;
export const describeRep = (need: RepNeed) =>
  `${need.factor ? `${REP_INFO[need.factor].icon} ${REP_INFO[need.factor].name}` : '⭐ Danh tiếng'} ≥ ${need.min.toFixed(1)}★`;

/** Tiếng lành đồn xa: 3 sao như cũ, 5 sao +10% người ghé, 1 sao −10%. */
export const repVisitBonus = (rep: Reputation) => (rep.samples < REP_MIN_SAMPLES ? 0 : (rep.overall - 3) * 0.05);
