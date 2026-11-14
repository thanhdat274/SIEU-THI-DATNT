/**
 * Hệ 1 — CHIỀU SÂU "SOI SÁNG" GIÀN PHƠI (SPEC §1.3/§1.5). Nong đang phơi đáng bao nhiêu tiền THẬT khi thu:
 * `progressPct` (nắng đã gom / need), `valueReady` quy ra tiền với nhãn nhà trồng (+HOMEGROWN_PREMIUM),
 * và trạng thái an toàn (đã dính mưa mấy lần). Nút Gỡ xuống vốn chỉ hiện "⏳ A/B nắng" — giờ thêm con số tiền.
 *
 * THUẦN, tất định (không simRng). Không đổi state/sim/save/kinh tế → golden không đụng.
 * Đồng bộ cặp với picklePayoff.ts (muối/ủ) — cùng phong cách, cùng tiện ích phản hồi (định lý thiết kế a).
 */
import { HOMEGROWN_PREMIUM } from './garden';
import { phoiReady, type PreserveDef, type PreserveJob } from './preserve';
import { productById } from './products';
import { referenceSell } from './pricing';
import { fmtNum } from '../core/format';

export interface PhoiBatchPayoff {
  defId: string;
  name: string;
  sunNow: number;
  need: number;
  /** Phần trăm nắng đã đủ (0–100). */
  progressPct: number;
  /** Đủ nắng → thu được ngay. */
  ready: boolean;
  wet: number;
  qty: number;
  /** Toàn nhà trồng → thành phẩm mang nhãn +20%. */
  lab: boolean;
  /** Giá bán thật nếu thu và bán (đã tính nhãn nhà trồng nếu có). */
  valueReady: number;
  /** Một dòng giải thích ngắn cho thẻ UI. */
  line: string;
}

const fmt = (n: number) => fmtNum(n);

export function phoiPayoff(opts: {
  job: PreserveJob;
  def: PreserveDef;
  priceOf?: (productId: string) => number;
}): PhoiBatchPayoff {
  const { job, def } = opts;
  const priceFn = opts.priceOf ?? referenceSell;
  const out = productById(def.outputId);
  const ready = phoiReady(job, def);
  const progressPct = Math.min(100, Math.round((job.sun / def.need) * 100));
  const lab = job.allHomegrown;
  const valueReady = Math.round(def.outputQty * priceFn(def.outputId) * (lab ? 1 + HOMEGROWN_PREMIUM : 1));
  const line = ready
    ? `${out.name}: thu ${def.outputQty} ≈ ${fmt(valueReady)}${lab ? ' (nhà trồng +20%)' : ''}${job.wet > 0 ? ` · đã dính mưa ${job.wet} lần` : ''}`
    : `${out.name}: ${job.sun.toFixed(1)}/${def.need} nắng (${progressPct}%) ≈ ${fmt(valueReady)}${lab ? ' (nhà trồng +20%)' : ''} khi thu`;
  return {
    defId: def.id, name: out.name, sunNow: job.sun, need: def.need, progressPct, ready,
    wet: job.wet, qty: def.outputQty, lab, valueReady, line,
  };
}
