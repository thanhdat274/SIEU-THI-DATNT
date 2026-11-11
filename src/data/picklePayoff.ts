/**
 * Hệ 1 — CHIỀU SÂU "SOI SÁNG" CỬA SỔ CHẤT LƯỢNG mẻ muối/ủ (SPEC §1.5/§1.6).
 * Mỗi mẻ đang ngâm trong vại/chum đáng bao nhiêu tiền THẬT nếu vớt/rút NGAY so với đợi đúng thời điểm
 * (muối: vớt NGON đầu cửa sổ = toàn lô nhà trồng +20%; ủ: giữ tới mốc ủ LÂU ra nhiều hơn + toàn lô nhãn).
 * Định lý thiết kế (a) "mọi quyết định hằng ngày phải có dữ liệu phản hồi, không hộp đen": nút Vớt/Rút
 * đã có chữ "NGON/khú" nhưng chưa cho người chơi con số tiền — helper này quy ra tiền.
 *
 * THUẦN, tất định (không simRng): chỉ đọc def/job/giá. Không đổi state/sim/save/kinh tế → golden không đụng.
 *
 * Lưu ý giá: dùng `priceOf(outputId)` nếu truyền (giá người chơi tự đặt), mặc định referenceSell. Tiền
 * làm tròn theo cách game tính premium nhà trồng (HOMEGROWN_PREMIUM = +20%; bỏ qua bậc sao món/phí thanh toán).
 */
import { HOMEGROWN_PREMIUM } from './garden';
import { pickleAge, pickleState, uRipe, uAged, type PickleState, type PreserveDef, type PreserveJob } from './preserve';
import { productById } from './products';
import { referenceSell } from './pricing';

export interface PickleBatchPayoff {
  defId: string;
  name: string;
  kind: 'muoi' | 'u';
  /** Trạng thái chất lượng hiện tại (muối) — ủ không dùng. */
  state: PickleState;
  /** Tuổi hiệu dụng (ngày game, + heat đối với muối). */
  age: number;
  /** Sản lượng + nhãn NHÀ TRỒNG + tiền nếu VỚT/RÚT NGAY (0 khi chưa vớt được / hỏng). */
  qtyNow: number;
  labNow: boolean;
  valueNow: number;
  /** Sản lượng + nhãn + tiền ở thời điểm TỐT NHẤT (muối: NGON; ủ: mốc ủ LÂU). */
  qtyBest: number;
  labBest: boolean;
  valueBest: number;
  /** valueBest − valueNow: phần hơn nếu đợi đúng (âm = đã lỡ mất "tươi"). */
  bonus: number;
  /** Ngày game còn lại tới thời điểm tốt nhất; 0 = đã tới / đã qua. */
  dayToBest: number;
  /** Một dòng giải thích ngắn cho thẻ UI. */
  line: string;
}

const fmt = (n: number) => n.toLocaleString('vi-VN');

export function picklePayoff(opts: {
  job: PreserveJob;
  def: PreserveDef;
  day: number;
  priceOf?: (productId: string) => number;
}): PickleBatchPayoff {
  const { job, def, day } = opts;
  const priceFn = opts.priceOf ?? referenceSell;
  const price = priceFn(def.outputId);
  const age = pickleAge(job, day);
  const out = productById(def.outputId);
  const sellWithLab = (qty: number, lab: boolean) => Math.round(qty * price * (lab ? 1 + HOMEGROWN_PREMIUM : 1));

  if (def.kind === 'muoi') {
    const w = def.window!;
    const st = pickleState(job, def, day);
    // Sản lượng theo trạng thái NGAY (giống collectPreserve: ngon/dat = đủ, kem = ×0,6, haran/hong = 0).
    const qtyNow = st === 'ngon' || st === 'dat' ? def.outputQty : st === 'kem' ? Math.round(def.outputQty * 0.6) : 0;
    const labNow = st === 'ngon' || job.allHomegrown;
    const valueNow = sellWithLab(qtyNow, labNow);
    // Thời điểm tốt nhất = NGON (đầu cửa sổ, toàn lô +20%).
    const qtyBest = def.outputQty;
    const labBest = true;
    const valueBest = sellWithLab(qtyBest, labBest);
    const dayToBest = st === 'haran' ? Math.max(0, Math.ceil(w[0] - age)) : 0;
    const line =
      st === 'haran'
        ? `${out.name}: ${qtyNow} · còn hăng — vớt NGON ngày ${w[0]} = ~${fmt(valueBest)} (đang ngày ${age.toFixed(0)})`
        : st === 'ngon'
          ? `${out.name}: NGON ${qtyNow} = ~${fmt(valueNow)}${job.allHomegrown ? ' (toàn nhà trồng)' : ''} — vớt ngay kẻo khú`
          : st === 'hong'
            ? `${out.name}: đã hoảng — đổ bỏ`
            : `${out.name}: ${st === 'kem' ? `khú — còn ${qtyNow} = ~${fmt(valueNow)}` : `Đạt ${qtyNow} = ~${fmt(valueNow)}`} (vớt NGON ngày ${w[0]}–${w[0] + 1} được ~${fmt(valueBest)})`;
    return { defId: def.id, name: out.name, kind: 'muoi', state: st, age, qtyNow, labNow, valueNow, qtyBest, labBest, valueBest, bonus: valueBest - valueNow, dayToBest, line };
  }

  // ── Nhà chum ủ ──
  const ripe = uRipe(job, def, day);
  const aged = uAged(job, def, day);
  const qtyNow = ripe ? (aged ? def.aged!.outputQty : def.outputQty) : 0;
  const labNow = ripe && (aged || job.allHomegrown);
  const valueNow = sellWithLab(qtyNow, labNow);
  // Tốt nhất = mốc ủ LÂU (ra nhiều hơn + toàn lô nhãn) nếu có; không có mốc thì tốt nhất = rút ngay khi đủ.
  const bestAged = !!def.aged;
  const qtyBest = bestAged ? def.aged!.outputQty : def.outputQty;
  const labBest = bestAged ? true : job.allHomegrown;
  const valueBest = sellWithLab(qtyBest, labBest);
  const dayToBest = bestAged ? Math.max(0, def.aged!.day - age) : ripe ? 0 : Math.max(0, def.need - age);
  const line =
    !bestAged
      ? `${out.name}: đủ ngày rút ${qtyNow} ~${fmt(valueNow)}${labNow ? ' (nhà làm +20%)' : ''}`
      : aged
        ? `${out.name}: ủ LÂU ${qtyNow} ~${fmt(valueNow)} (hơn ${fmt(def.outputQty * price * (job.allHomegrown ? 1 + HOMEGROWN_PREMIUM : 1))} nếu rút thường)`
        : ripe
          ? `${out.name}: rút ngay ${qtyNow} ~${fmt(valueNow)} · ủ LÂU tới ngày ${def.aged!.day} ra ${qtyBest} ~${fmt(valueBest)} (chờ ${dayToBest} ngày)`
          : `${out.name}: ${age.toFixed(0)}/${def.need} ngày — chưa rút được · ${bestAged ? `ủ LÂU ngày ${def.aged!.day} ra ${qtyBest} ~${fmt(valueBest)}` : `đủ ${def.need} ngày ra ${qtyBest}`}`;
  return { defId: def.id, name: out.name, kind: 'u', state: 'dat', age, qtyNow, labNow, valueNow, qtyBest, labBest, valueBest, bonus: valueBest - valueNow, dayToBest, line };
}
