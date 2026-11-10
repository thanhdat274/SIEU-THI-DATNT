import { rainSpell, nextWeather, WEATHER, type RainSpell, type Weather } from './weather';
import { productById } from './products';
import { upcomingFestival, FESTIVAL_NOTICE_DAYS } from './calendar';

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
  /** muoi (lát L5): ngày "nắng nóng" cộng dồn — mỗi ngày Nắng đẹp tính nhanh thêm 0,25 ngày
   *  cho mẻ muối (SPEC §1.5 "trời nắng nóng làm chua nhanh"). Save cũ thiếu → tự bù 0 (R2). */
  heat?: number;
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

// ── Lát L5: VẠI MUỐI (SPEC §1.5) ──
/**
 * Tuổi hiệu dụng của mẻ muối: (ngày bắt đầu → hôm nay) cộng nhiệt đã gom (mỗi ngày Nắng đẹp +0,25).
 * Trời nắng nóng làm chua nhanh — dùng để mở cửa sổ vớt sớm hơn. THUẦN.
 */
export const pickleAge = (job: PreserveJob, day: number) => (day - job.startDay) + (job.heat ?? 0);

export type PickleState =
  | 'haran'  // Mới muối chưa tới cửa sổ — còn hăng, chưa chua, không vớt được.
  | 'ngon'   // Đúng đầu cửa sổ (window[0]..window[0]+1) — vớt ra Ngon (toàn lô nhãn nhà trồng).
  | 'dat'    // Giữa cửa sổ — vớt ra Đạt (đủ sản lượng, nhãn chỉ khi toàn nhà trồng).
  | 'kem'    // Vớt trễ, sau window[1] tối đa 2 ngày — "khú", sản lượng ×0,6.
  | 'hong';  // Vớt quá trễ — hỏng, phải đổ bỏ (không cho sản lượng).

/** Chất lượng vớt của mẻ muối theo tuổi hiệu dụng (SPEC §1.5 bảng "Vớt vào lúc"). */
export function pickleState(job: PreserveJob, def: PreserveDef, day: number): PickleState {
  const w = def.window!;
  const age = pickleAge(job, day);
  if (age < w[0]) return 'haran';
  if (age <= w[0] + 1) return 'ngon';
  if (age <= w[1]) return 'dat';
  if (age <= w[1] + 2) return 'kem';
  return 'hong';
}

/** Sức chứa vại muối theo sao (SPEC §1.3: 2/4/6 vại) — lát L5 chặn farm (R7). */
export const VAI_CAPACITY: Record<number, number> = { 1: 2, 2: 4, 3: 6 };
export const vaiCap = (star: number) => VAI_CAPACITY[star] ?? 0;

// ── Lát L6: NHÀ CHUM Ủ (SPEC §1.5) ──
/** Sức chứa chum ủ theo sao (SPEC §1.3: 1/2/4 chum) — lát L6 chặn farm (R7). */
export const CHUM_CAPACITY: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
export const chumCap = (star: number) => CHUM_CAPACITY[star] ?? 0;

/** Ủ (chum): đủ `need` ngày là rút được hàng thường. */
export const uRipe = (job: PreserveJob, def: PreserveDef, day: number) => pickleAge(job, day) >= def.need;
/** Ủ tới mốc lâu (`aged.day`) → rút ra CÙNG sản phẩm nhưng NHIỀU hơn (×~1,6), cả lô mang nhãn. */
export const uAged = (job: PreserveJob, def: PreserveDef, day: number) =>
  !!def.aged && pickleAge(job, day) >= def.aged.day;

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
  // 3. Mẻ muối vào cửa sổ vớt ngon hôm nay (lát L5) — đặt sau hai việc phơi cho nổi.
  for (const j of args.jobs) {
    const d = preserveDefById(j.defId);
    if (d.kind !== 'muoi') continue;
    const st = pickleState(j, d, args.day);
    if (st === 'ngon') {
      tips.push({ icon: '🫙', text: `${productById(d.outputId).name} đã vớt NGON — hôm nay/ngày mai là đẹp nhất`, act: 'Trang trại → Vại muối' });
    } else if (st === 'hong') {
      tips.push({ icon: '🗑️', text: `${productById(d.outputId).name} muối đã HOẢNG — đổ bỏ để trống vại`, act: 'Trang trại → Vại muối' });
    }
  }
  // 4. Mẻ ủ (chum) vừa đủ ngày hoặc tới mốc ủ lâu hôm nay (lát L6).
  for (const j of args.jobs) {
    const d = preserveDefById(j.defId);
    if (d.kind !== 'u') continue;
    const ripe = pickleAge(j, args.day) >= d.need;
    const aged = !!d.aged && pickleAge(j, args.day) >= d.aged.day;
    if (aged) {
      tips.push({ icon: '🫛', text: `${productById(d.outputId).name} đã ủ TỚI MỐC LÂU — rút ra NHIỀU hơn (${d.aged!.outputQty})`, act: 'Trang trại → Nhà chum' });
    } else if (ripe) {
      tips.push({ icon: '🫛', text: `${productById(d.outputId).name} đủ ngày ủ — có thể rút (giữ ẩm tới mốc lâu sẽ ra nhiều hơn)`, act: 'Trang trại → Nhà chum' });
    }
  }
  // 5. Lịch lễ (lát L7, SPEC §1.8): đếm lùi tới dịp sắp tới. Nếu có mẻ muối/ủ "vừa khít" thời gian
  //    (finish trong khoảng inDays..inDays+2 → chỉ kịp nếu làm NGAY) thì nhắc "làm HÔM NAY cho kịp lễ".
  const soon = upcomingFestival(args.day, FESTIVAL_NOTICE_DAYS + FESTIVAL_NOTICE_DAYS);
  if (soon) {
    const tight = PRESERVE_DEFS.filter((d) => {
      if (d.kind === 'phoi') return false;
      const f = d.kind === 'u' ? d.need : d.window![1];
      return f >= soon.inDays && f <= soon.inDays + 2;
    });
    if (tight.length > 0) {
      tips.push({
        icon: '🏮',
        text: `Còn ${soon.inDays} ngày tới ${soon.festival.icon} ${soon.festival.name} — ${tight.map((d) => `${productById(d.outputId).name} cần ${d.kind === 'u' ? d.need : d.window![1]} ngày`).join(', ')}: làm HÔM NAY cho kịp lễ`,
        act: 'Trang trại → Phơi · Muối · Ủ',
      });
    }
  }
  return tips;
}

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
    if (def.kind === 'muoi') {
      // Muối không phụ thuộc thời tiết rủi ro — chỉ nắng nóng làm chua nhanh hơn (heat +0,25/ngày nắng).
      // Mẻ nào đã quá hạn hỏng (đổ bỏ) vẫn nằm đó cho người chơi hoặc phụ trại nhặt đổ (lát L5).
      next.push({ ...job, heat: (job.heat ?? 0) + (ctx.weather === 'sunny' ? 0.25 : 0) });
      continue;
    }
    if (def.kind !== 'phoi') { next.push(job); continue; } // u (lát L6) giữ nguyên
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

/** Lát L4 — một món phụ trại thu hộ từ giàn. */
export interface PreservePick { productId: string; qty: number; homegrown: boolean }

/**
 * L4 — phụ trại lo sân phơi hộ mỗi tối (SPEC §1.8): (1) thu mẻ đã đủ nắng cho vào kho (+ nhãn
 * nhà trồng nếu toàn nhà trồng); (2) mai có mưa/giông thì CẤT giàn còn phơi, mai tạnh thì MANG RA.
 * Trả mẻ thu + trạng thái giàn cho ngày mai (rackLog) + tin. THUẦN, tất định từ `nextWeather`
 * (weatherSeed + ngày mai, chuỗi Markov R5) — KHÔNG gọi simRng (R1). Không mẻ phơi → không việc.
 */
export function farmhandPreserve(args: {
  jobs: PreserveJob[];
  day: number;
  seed: number;
  weather: Weather;
}): { jobs: PreserveJob[]; rackLog: { day: number; out: [number, number][] }; picked: PreservePick[]; news: string[] } {
  const news: string[] = [];
  const picked: PreservePick[] = [];
  const tomorrow = nextWeather(args.seed, args.day + 1, args.weather);
  const wetTmr = tomorrow === 'rain' || tomorrow === 'storm';
  const kept: PreserveJob[] = [];
  const phoiKept: PreserveJob[] = [];
  for (const j of args.jobs) {
    const d = preserveDefById(j.defId);
    if (d.kind !== 'phoi') { kept.push(j); continue; }
    if (phoiReady(j, d)) {
      // Thu hộ mẻ chín — bỏ khỏi giàn.
      picked.push({ productId: d.outputId, qty: d.outputQty, homegrown: j.allHomegrown });
      continue;
    }
    // Còn phơi dở — để nguyên giàn, chỉ đổi trạng thái cất/mang theo TRỜI MAI.
    phoiKept.push({ ...j, covered: wetTmr });
  }
  const jobs = [...kept, ...phoiKept];
  if (picked.length) news.push(`gỡ ${picked.length} nong phơi đủ nắng đem vào`);
  if (phoiKept.length) {
    if (wetTmr) news.push(`cất ${phoiKept.length} nong vì mai ${WEATHER[tomorrow].name.toLowerCase()}`);
    else news.push(`mang ${phoiKept.length} nong ra phơi (mai ${WEATHER[tomorrow].name.toLowerCase()})`);
  }
  return { jobs, rackLog: { day: args.day + 1, out: wetTmr ? [] : [[0, 1440]] }, picked, news };
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
  // ── Lát L5: 6 VẠI MUỐI (SPEC §1.6) — toàn món muối chua thật, cửa sổ vớt theo từng món ──
  {
    id: 'ps_dua_muoi', kind: 'muoi', outputId: 'hx_dua_muoi', outputQty: 4,
    // Dưa muối (miền Bắc): rau cải phơi héo, ngâm nước muối pha loãng (x_muoi + x_rau_cai),
    // ủ 2–4 ngày chua giòn. Cửa sổ vớt ngon ngày 2–4.
    inputs: [{ productId: 'x_rau_cai', quantity: 1 }, { productId: 'x_muoi', quantity: 2 }],
    unlock: 38, need: 2, window: [2, 4], learnAfterSold: 30,
    note: 'Miền Bắc — cải muối chua ăn kèm; rau cải + muối ủ 2–4 ngày, vớt ngon đầu cửa sổ ngày 2–3.',
  },
  {
    id: 'ps_ca_phao', kind: 'muoi', outputId: 'hx_ca_phao', outputQty: 4,
    // Cà pháo muối (miền Nam): cà pháo ngâm nước muối cho giòn chua, ăn với mắm tôm/mắm nêm.
    // Game chưa có cà pháo → thay bằng cà tím (x_ca_tim), cùng họ cà; ghi rõ là thay thế (CLAUDE.md 4).
    inputs: [{ productId: 'x_ca_tim', quantity: 1 }, { productId: 'x_muoi', quantity: 2 }],
    unlock: 38, need: 3, window: [3, 5], learnAfterSold: 30,
    note: 'Miền Nam — cà pháo muối giòn chua; game thay cà pháo bằng cà tím (x_ca_tim). Cửa sổ vớt ngày 3–5.',
  },
  {
    id: 'ps_chanh_muoi', kind: 'muoi', outputId: 'hx_chanh_muoi', outputQty: 3,
    // Chanh muối (miền Bắc, đặc sản Hà Nội): chanh đào/chanh xanh chôn trong muối 7–12 ngày
    // cho ruột chuyển nâu, dùng pha nước chanh muối giải nhiệt. Muối lâu hơn thì mặn quá.
    inputs: [{ productId: 'x_chanh_khong_hat', quantity: 5 }, { productId: 'x_muoi', quantity: 2 }],
    unlock: 40, need: 7, window: [7, 12], learnAfterSold: 30,
    note: 'Miền Bắc — chanh muối Hà Nội; chanh + muối chôn 7–12 ngày, vớt ngon quanh ngày 7–8.',
  },
  {
    id: 'ps_cu_kieu', kind: 'muoi', outputId: 'hx_cu_kieu', outputQty: 3,
    // Củ kiệu muối (miền Nam, Tết): củ kiệu ngâm nước muối + đường cho chua giòn trong, ăn kèm bánh tét.
    // Game chưa có củ kiệu → thay bằng hành khô (x_hanh_kho), cùng họ hành/tỏi (Allium); ghi rõ thay thế.
    inputs: [{ productId: 'x_hanh_kho', quantity: 4 }, { productId: 'x_muoi', quantity: 1 }, { productId: 'x_duong', quantity: 1 }],
    unlock: 68, need: 5, window: [5, 8], learnAfterSold: 30,
    note: 'Miền Nam Tết — củ kiệu muối; game thay củ kiệu bằng hành khô (x_hanh_kho). Cửa sổ vớt ngày 5–8.',
  },
  {
    id: 'ps_dua_hanh', kind: 'muoi', outputId: 'hx_dua_hanh', outputQty: 3,
    // Dưa hành muối (miền Bắc, Tết): hành củ nhúng nước sôi, ủ với muối cho chua giòn, ăn kèm thịt đông.
    inputs: [{ productId: 'x_hanh_kho', quantity: 6 }, { productId: 'x_muoi', quantity: 1 }],
    unlock: 102, need: 3, window: [3, 5], learnAfterSold: 30,
    note: 'Miền Bắc Tết — dưa hành muối; hành khô + muối ủ 3–5 ngày, vớt ngon ngày 3–4.',
  },
  {
    id: 'ps_dua_cai', kind: 'muoi', outputId: 'hx_dua_cai', outputQty: 4,
    // Dưa cải chua (miền Nam): bẹ cải xanh phơi héo, ủ với nước muối cho chua, ăn kèm cá kho.
    inputs: [{ productId: 'x_rau_cai', quantity: 10 }, { productId: 'x_muoi', quantity: 1 }],
    unlock: 105, need: 2, window: [2, 4], learnAfterSold: 30,
    note: 'Miền Nam — dưa cải chua; bẹ cải + muối ủ 2–4 ngày, vớt ngon đầu cửa sổ ngày 2–3.',
  },
  // ── Lát L6: 6 CHUM Ủ (SPEC §1.6) — chum không hỏng theo thời gian; ủ lâu ra NHIỀU hơn (aged) ──
  {
    id: 'ps_mam_tep', kind: 'u', outputId: 'hx_mam_tep', outputQty: 6,
    // Mắm tép (miền Trung): tép tươi trộn muối ủ chín thành mắm đặc sánh, dùng chấm rau luộc.
    // Game không có tép → thay bằng tôm tươi (x_tom_tuoi) cùng họ tôm tép; ghi rõ thay thế (CLAUDE.md 4).
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    unlock: 46, need: 10, learnAfterSold: 30,
    note: 'Miền Trung — mắm tép tươi ủ muối; game thay tép bằng tôm tươi (x_tom_tuoi). Ủ 10 ngày.',
  },
  {
    id: 'ps_tuong_ban', kind: 'u', outputId: 'hx_tuong_ban', outputQty: 7,
    // Tương bần (Hưng Yên, miền Bắc): đậu tương (đậu nành) + gạo nếp làm mốc + muối, ủ 14 ngày
    // cho vị mặn ngọt đặc trưng 'Tương Cự Đà, đậu Hà Nội'.
    inputs: [{ productId: 'x_dau_nanh_hat', quantity: 1 }, { productId: 'x_nep', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    unlock: 46, need: 14, learnAfterSold: 30,
    note: 'Miền Bắc (Hưng Yên) — tương bần: đậu nành + nếp mốc + muối ủ 14 ngày.',
  },
  {
    id: 'ps_nuoc_mam', kind: 'u', outputId: 'hx_nuoc_mam', outputQty: 3,
    // Nước mắm cá cơm (miền biển): cá cơm tươi + muối ủ 12 tháng rút cốt. Game nén còn 14 ngày;
    // ủ tiếp 28 ngày ra NHIỀU hơn ×~1,6 (đã chốt: không thêm sản phẩm mới). Cá cơm → thay cá basa (x_ca_basa).
    inputs: [{ productId: 'x_ca_basa', quantity: 1 }, { productId: 'x_muoi', quantity: 2 }],
    unlock: 46, need: 14, aged: { day: 28, outputQty: 5 }, learnAfterSold: 30,
    note: 'Miền biển — nước mắm cá cơm; game thay cá cơm bằng cá basa (x_ca_basa), ủ 14 ngày, lâu 28 ngày ra thêm (thật 12 tháng, game nén).',
  },
  {
    id: 'ps_toi_den', kind: 'u', outputId: 'hx_toi_den', outputQty: 2,
    // Tỏi đen (khắp nơi, phổ biến Phú Yên): nguyên củ tỏi ủ ở nhiệt ẩm ổn định 21 ngày cho lên men
    // đen ngọt; giữ nhiệt ủ lâu ra NHIỀU hơn cùng sản phẩm.
    inputs: [{ productId: 'x_toi', quantity: 11 }],
    unlock: 58, need: 21, aged: { day: 40, outputQty: 3 }, learnAfterSold: 30,
    note: 'Khắp miền (Phú Yên nổi tiếng) — tỏi đen: củ tỏi ủ ẩm 21 ngày lên men đen ngọt; ủ 40 ngày ra thêm.',
  },
  {
    id: 'ps_tom_chua', kind: 'u', outputId: 'hx_tom_chua', outputQty: 3,
    // Tôm chua Huế (miền Trung): tôm sú bóc vỏ ủ với thính gạo + riềng sả + ớt + tỏi + nước mắm + đường,
    // chua cay ăn kèm bánh tráng cuốn. Ủ ~7 ngày.
    inputs: [{ productId: 'x_tom_tuoi', quantity: 1 }, { productId: 'x_sa', quantity: 1 }, { productId: 'x_toi', quantity: 1 }, { productId: 'x_muoi', quantity: 1 }],
    unlock: 67, need: 7, learnAfterSold: 30,
    note: 'Miền Trung (Huế) — tôm chua: tôm + sả + tỏi + muối ủ ~7 ngày chua cay.',
  },
  {
    id: 'ps_tuong_hot', kind: 'u', outputId: 'hx_tuong_hot', outputQty: 3,
    // Tương hột (miền Tây): đậu nành hột nguyên ủ với nếp mốc + muối, tương còn nguyên hột vàng.
    inputs: [{ productId: 'x_dau_nanh_hat', quantity: 1 }, { productId: 'x_nep', quantity: 1 }, { productId: 'x_muoi', quantity: 2 }],
    unlock: 78, need: 14, learnAfterSold: 30,
    note: 'Miền Tây — tương hột: hột đậu nành + nếp mốc + muối ủ 14 ngày.',
  },
];

/** Cấp mở sớm nhất mà trạm phơi có mẻ (để mở công trình gian_phoi, lát L2). */
export const PHOI_UNLOCK = 34;
/** Cấp mở sớm nhất mà vại muối có mẻ (để mở công trình vai_muoi, lát L5). */
export const VAI_UNLOCK = 38;
/** Cấp mở sớm nhất mà nhà chum ủ có mẻ (để mở công trình chum_u, lát L6). */
export const CHUM_UNLOCK = 46;

/** Mở khóa cho lát L5/L6 (nền trước; các mẻ muối/ủ chưa có trong danh mục L1). */
export const preserveDefById = (id: string) => PRESERVE_DEFS.find((d) => d.id === id)!;
export const preserveDefsOf = (kind: PreserveKind) => PRESERVE_DEFS.filter((d) => d.kind === kind);
/** Sức chứa trạm theo sao (SPEC §1.3) — lát L2/L5/L6 đọc để chặn farm (R7). */
export const RACK_CAPACITY: Record<number, number> = { 1: 2, 2: 4, 3: 6 };
/** Trần số nong phơi một giàn. */
export const rackCap = (star: number) => RACK_CAPACITY[star] ?? 0;
