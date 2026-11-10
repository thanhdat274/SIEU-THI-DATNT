import { rainSpell, type RainSpell, type Weather } from './weather';
import { productById } from './products';

/**
 * Hệ 1 — Phơi · Muối · Ủ (SPEC-CHIEU-SAU §1).
 *
 * L1 (lát này): NỀN PHƠI — kiểu dữ liệu + 3 mẻ phơi có nguyên liệu thật + hàm qua đêm `preserveNight`
 * (và `phoiDayGain` quyết định bảng "thời tiết × trạng thái giàn"). THUẦN, không đụng sim/save:
 * mọi kết quả suy ra từ thời tiết đã tất định `rainSpell(seed, day, weather)` — KHÔNG gọi simRng (R1).
 *
 * Đặt ở trại, không đặt trong tiệm: phơi cần trời, trại đã có khung công trình + phụ trại. Giàn phơi
 * để ngoài hay cất trong nhà do người chơi quyết (nút, lát L2); trạng thái `rackLog.out` (các khoảng
 * phút giàn ở ngoài) được dân sang đây tối nào để tính nắng nhận được.
 *
 * Mọi con số (need, outputQty, inputs) là ĐIỂM XUẤT PHÁT để sim — sẽ chốt qua preserveMargin.test
 * (L7, §1.7: tổng tiền nguyên liệu ≈ 55–65% giá nhập hàng xóm của thành phẩm). Nguyên liệu thiếu
 * món thô thì theo luật CLAUDE.md 4: thay bằng thứ gần nhất + ghi rõ trong comment.
 */

export type PreserveKind = 'phoi' | 'muoi' | 'u';

export interface PreserveInput { productId: string; quantity: number }

export interface PreserveDef {
  id: string;
  kind: PreserveKind;
  /** Sản phẩm ĐÃ CÓ trong game (homemade.ts), hệ phơi không thêm sản phẩm mới. */
  outputId: string;
  outputQty: number;
  inputs: PreserveInput[];
  /** Cấp mở = max(cấp mở trạm, cấp mở sản phẩm). */
  unlock: number;
  /** phoi: số "nắng" cần đủ. muoi/u: số ngày tới lúc dùng được. */
  need: number;
  /** muoi: [ngàyĐầu, ngàyCuối] cửa sổ vớt ngon (lát L5). */
  window?: [number, number];
  /** u: ủ lâu ra NHIỀU hơn, cùng sản phẩm (lát L6). */
  aged?: { day: number; outputQty: number };
  /** phoi: chỉ tính ngày nắng đẹp (mực MỘT NẮNG). */
  sunOnly?: boolean;
  /** phoi: sương mù cũng tính đủ nắng (bánh tráng phơi sương). */
  fogBonus?: boolean;
  /** Cổng "học nghề": bán quen món của hàng xóm ≥ số này mới được chỉ nghề. */
  learnAfterSold: number;
  /** Vùng miền + cách làm thật + thứ gì là thay thế (luật CLAUDE.md). */
  note: string;
}

/** Một mẻ đang trên giàn / trong vại / trong chum. */
export interface PreserveJob {
  id: number;
  defId: string;
  startDay: number;
  /** phoi: số nắng đã gom (thập phân). muoi/u: không dùng, tính từ startDay. */
  sun: number;
  /** phoi: giàn đang cất trong nhà (bão/mưa thì an toàn). */
  covered: boolean;
  /** phoi: số lần dính mưa. */
  wet: number;
  /** Nguyên liệu toàn nhà trồng/nhà nuôi → thành phẩm chắc chắn mang nhãn. */
  allHomegrown: boolean;
}

// ── Bảng nắng: "thời tiết × trạng thái giàn" (SPEC §1.5) ──
// Trạng thái giàn: ngoài cả ngày (không lọt cơn mưa) / cất kịp trước mưa phơi lại sau / cất cả ngày.
// Thời tiết | ngoài cả ngày | cất kịp mưa | cất cả ngày
//  Nắng đẹp | +1,0          | —           | 0
//  Sương mù | +0,7 (+1,2 nếu fogBonus) | — | 0
//  Nhiều mây| +0,6          | —           | 0
//  Mưa      | dính mưa (wet+1, +0) | +0,4 | 0
//  Giông bão| mất cả mẻ     | +0,1        | 0 (an toàn)

export interface PhoiGain {
  /** Nắng cộng cho mẻ. */
  sun: number;
  /** Giàn để ngoài lúc cơn mưa → dính mưa. */
  wet: boolean;
  /** Giông bão đánh mất cả mẻ (không có nhà lưới 3★ che, cũng không cất). */
  stormLost: boolean;
}

const GAIN_BY_WEATHER: Record<Weather, number> = { sunny: 1.0, fog: 0.7, cloudy: 0.6, rain: 0, storm: 0 };

/**
 * Nắng một ngày phơi: quyết định từ các khoảng phút giàn để NGOÀI (`out`) so với cơn mưa (`spell`).
 * `tarp`: đã mua Bạt kéo → mưa thường không ướt (nhưng mọi ngày chỉ nhận 80% nắng — SPEC §1.5, lát L7).
 * `stormSafe`: nhà lưới 3★ che sân phơi khỏi bão (SPEC §1.8).
 * `fogBonus`: mẻ này sương mù cũng tính đủ nắng. THUẦN — không simRng.
 */
export function phoiDayGain(
  out: [number, number][],
  spell: RainSpell | null,
  weather: Weather,
  opts: { tarp?: boolean; stormSafe?: boolean; fogBonus?: boolean } = {},
): PhoiGain {
  const exposedAll = !spell || out.some((o) => o[0] < spell.end && spell.start < o[1]);
  if (!out.length) return { sun: 0, wet: false, stormLost: false }; // cất cả ngày
  if (!spell) {
    // trời khô (nắng/mây/sương), không mưa
    const sun = weather === 'fog' ? (opts.fogBonus ? 1.2 : 0.7) : GAIN_BY_WEATHER[weather];
    return { sun, wet: false, stormLost: false };
  }
  if (!exposedAll) {
    // trời mưa/bão nhưng giàn đã cất kịp, phơi lại sau cơn
    return weather === 'storm' ? { sun: 0.1, wet: false, stormLost: false } : { sun: 0.4, wet: false, stormLost: false };
  }
  // giàn để ngoài lọt vào cơn mưa
  if (weather === 'storm') {
    if (opts.stormSafe) return { sun: 0.1, wet: false, stormLost: false };
    return { sun: 0, wet: true, stormLost: true };
  }
  if (weather === 'rain') {
    if (opts.tarp) return { sun: 0.4, wet: false, stormLost: false }; // bạt chặn mưa
    return { sun: 0, wet: true, stormLost: false };
  }
  return { sun: GAIN_BY_WEATHER[weather], wet: false, stormLost: false };
}

/** Mẻ phơi đủ nắng chưa (chuyển "chờ thu"). */
export const phoiReady = (job: PreserveJob, def: PreserveDef) => job.sun >= def.need;

/** Mẻ PHƠI đang để NGOÀI giàn (chưa cất) — thẻ Sổ đầu ngày + rackRainAgenda dùng để biết
 *  "giàn còn đang phơi" (lát L3): đếm theo nong, mẻ phơi nào chưa cất là một nong phơi.
 *  Mẻ muối/ủ (lát L5/L6) không có khái niệm giàn nên không tính. THUẦN. */
export function rackInTheOpen(jobs: PreserveJob[]): PreserveJob[] {
  return jobs.filter((j) => {
    const d = preserveDefById(j.defId);
    return d.kind === 'phoi' && !j.covered;
  });
}

/** Một dòng cho thẻ Sổ đầu ngày "🏺 Phơi · Muối · Ủ" (SPEC §1.10). */
export interface PreserveMorningTip { icon: string; text: string; act: string }

/** L3 — nội dung thẻ Sổ đầu ngày liên quan trạm: mẻ chín chờ thu + hôm nay mưa mà giàn đang phơi
 *  (kèm giờ mưa). Chỉ trả tip khi CÓ việc → UI ẩn thẻ khi rỗng. Muối/ủ (lát L5/L6) sẽ thêm dòng
 *  "dưa vào cửa sổ ngon hôm nay" — móc sẵn chỗ này. THUẦN, dựa trên thời tiết tất định (R5). */
export function preserveMorningTips(args: {
  day: number;
  seed: number;
  weather: Weather;
  jobs: PreserveJob[];
}): PreserveMorningTip[] {
  const tips: PreserveMorningTip[] = [];
  // 1. Mẻ phơi đã đủ nắng, chờ thu.
  for (const j of args.jobs) {
    const d = preserveDefById(j.defId);
    if (d.kind !== 'phoi' || !phoiReady(j, d)) continue;
    tips.push({ icon: '✅', text: `${productById(d.outputId).name} đủ nắng — gỡ về để thu`, act: 'Trang trại → Phơi' });
  }
  // 2. Hôm nay có mưa/giông mà giàn còn để ngoài → nhắc CẤT GIÀN kịp (kèm giờ mưa). Đặt lên đầu cho nổi.
  const inOpen = rackInTheOpen(args.jobs).length;
  if (inOpen > 0) {
    const spell = rainSpell(args.seed, args.day, args.weather);
    if (spell) {
      const h = String(Math.floor(spell.start / 60)).padStart(2, '0');
      const m = String(spell.start % 60).padStart(2, '0');
      tips.unshift({ icon: '☂️', text: `Mưa ${h}:${m} — giàn còn ${inOpen} nong đang phơi, cất kịp trước mưa`, act: 'Trang trại → Phơi' });
    }
  }
  return tips;
}

/** Cấp mở sớm nhất mà trạm phơi có mẻ (để mở công trình gian_phoi, lát L2). */
export const PHOI_UNLOCK = 34;

/**
 * Một đêm trại: các mẻ phơi nhận "nắng" theo thời tiết ngày vừa qua + trạng thái giàn (`out`).
 * Gọi trong endDay ngay sau `gardenNight`. Mẻ muối/ủ (lát L5/L6) giữ nguyên — chưa chạy.
 * THUẦN: mọi kết quả từ `rainSpell` (tất định), không rút simRng → golden cấp 30 vẫn nguyên.
 */
export function preserveNight(
  jobs: PreserveJob[],
  out: [number, number][],
  ctx: { day: number; weather: Weather; seed: number; tarp?: boolean; stormSafe?: boolean },
): { jobs: PreserveJob[]; news: string[] } {
  const spell = rainSpell(ctx.seed, ctx.day, ctx.weather);
  const news: string[] = [];
  const next: PreserveJob[] = [];
  for (const job of jobs) {
    const def = preserveDefById(job.defId);
    if (def.kind !== 'phoi') { next.push(job); continue; } // muoi/u để lát sau
    const g = phoiDayGain(out, spell, ctx.weather, { tarp: ctx.tarp, stormSafe: ctx.stormSafe, fogBonus: def.fogBonus });
    if (g.stormLost) {
      news.push(`⛈️ Giông bão làm mất cả mẻ ${def.outputId} đang phơi ngoài giàn — cất kịp mới an toàn`);
      continue; // bỏ job
    }
    // mẻ "một nắng" chỉ ăn ngày nắng đẹp, các ngày khác không tiến
    const gain = def.sunOnly ? (ctx.weather === 'sunny' ? g.sun : 0) : g.sun;
    next.push({ ...job, sun: job.sun + gain, wet: job.wet + (g.wet ? 1 : 0) });
  }
  return { jobs: next, news };
}

// ── 3 mẻ phơi đầu (L1): toàn nguyên liệu thô đã có, đúng cách phơi thật ──
export const PRESERVE_DEFS: PreserveDef[] = [
  {
    id: 'ps_banh_trang', kind: 'phoi', outputId: 'hx_banh_trang', outputQty: 5,
    // Bánh tráng phơi sương — miền Nam: tráng bánh tráng mỏng xong phơi qua sương đêm cho dẻo đều.
    // Game: phơi bánh tráng tươi (banhtrang) — sương sớm cũng tính đủ nắng (fogBonus).
    inputs: [{ productId: 'banhtrang', quantity: 3 }], unlock: 34, need: 2,
    fogBonus: true, learnAfterSold: 30,
    note: 'Miền Nam — bánh tráng tươi phơi đêm sương cho mềm đều; 2 nắng, sương mù tính đủ.',
  },
  {
    id: 'ps_tom_kho', kind: 'phoi', outputId: 'hx_tom_kho', outputQty: 6,
    // Tôm khô — khắp miền: tôm tươi phơi nắng nhiều ngày cho teo lại giữ vị. Game dùng tôm đông lạnh
    // (hai_san) làm thay cho tôm tươi vì game chưa có món tôm sống phơi; ghi rõ là thay thế (CLAUDE.md 4).
    inputs: [{ productId: 'hai_san', quantity: 2 }], unlock: 52, need: 3, learnAfterSold: 30,
    note: 'Miền biển — tôm tươi phơi 3 nắng teo khô; game thay bằng tôm đông lạnh (hai_san).',
  },
  {
    id: 'ps_muc_mot_nang', kind: 'phoi', outputId: 'hx_muc_mot_nang', outputQty: 6,
    // Mực một nắng — miền biển: mực tươi phơi ĐÚNG một nắng cho vừa dai, phơi thêm thì khô quá.
    // Đúng tên "một nắng": chỉ ăn ngày nắng đẹp, xong đúng khi đủ 1,0 (sunOnly, need 1).
    inputs: [{ productId: 'muc_ong_tuoi', quantity: 1 }], unlock: 98, need: 1,
    sunOnly: true, learnAfterSold: 30,
    note: 'Miền biển — mực ống tươi phơi đúng một nắng; chỉ ngày nắng đẹp mới tính, đủ 1 nắng là xong.',
  },
];

/** Mở khóa cho lát L5/L6 (nền trước; các mẻ muối/ủ chưa có trong danh mục L1). */
export const preserveDefById = (id: string) => PRESERVE_DEFS.find((d) => d.id === id)!;
export const preserveDefsOf = (kind: PreserveKind) => PRESERVE_DEFS.filter((d) => d.kind === kind);
/** Sức chứa trạm theo sao (SPEC §1.3) — lát L2/L5/L6 đọc để chặn farm (R7). */
export const RACK_CAPACITY: Record<number, number> = { 1: 2, 2: 4, 3: 6 };
/** Trần số nong phơi một giàn. */
export const rackCap = (star: number) => RACK_CAPACITY[star] ?? 0;
