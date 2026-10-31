// ───── Nhu cầu quầy: dự báo cầu theo giờ của tiệm chính (GĐ78) ─────
// Toàn bộ các pha "soi hộp đen" (GĐ41–77) đều ở PHÍA CUNG (giá nhập / tự sản xuất / bày kệ /
// nhân sự / hoàn vốn). Phía CẦU — số khách đông/vắng theo giờ của tiệm chính — chưa hề được
// số hóa cho người chơi. Helper này THUẦN ĐỌC: tái dựng trung thực đường cong khách của sim
// (customers.ts) từ data sẵn có (nhịp giờ + lễ/thời tiết + giờ vàng tự đặt + tiếng lành) thành
// vài khung "khoảng bao nhiêu khách, giờ nào đỉnh". Nhãn rõ hàng "ước lượng" — bỏ hẳn các nhân
// volatile (xác suất vào tiệm/giá/độ sạch) nên đúng bậc độ lớn + đúng hình dạng, không phải cam kết.
// Không import store → không đụng coopGuard; không đổi kinh tế.

import { TIME_BANDS, HAPPY_HOURS, happyTraffic, type HappyHour, type TimeBand } from './rhythm';
import { customersPerDay } from './levels';
import { dayEffects } from './calendar';

export interface DemandBand {
  id: string;
  /** Nhãn giờ, vd "6h–8h30". */
  label: string;
  /** Số khách ước tính trong khung. */
  expected: number;
  /** Khách/giờ trong khung. */
  perHour: number;
  /** 0–100 theo đỉnh cao nhất trong ngày. */
  pressure: number;
  /** Là một trong những giờ cao điểm hôm nay. */
  peak: boolean;
}

export interface DemandForecast {
  bands: DemandBand[];
  /** Tổng khách ước tính cả ngày. */
  expectedTotal: number;
  /** Nhãn các khung cao điểm. */
  peakBands: string[];
}

export interface DemandArg {
  level: number;
  day: number;
  weatherSeed: number;
  /** Có kỹ năng "Tiếng lành đồn xa" (local_legend) hay không. */
  localLegend?: boolean;
  /** Khung giờ vàng tự đặt (nếu đang bật). */
  happy?: HappyHour | null;
}

/** Nhãn giờ của một khung: "6h–8h30" / "11h–13h". */
function bandLabel(b: TimeBand): string {
  const from = Math.floor(b.from / 60);
  const toH = Math.floor(b.to / 60);
  const toM = b.to % 60 ? '30' : '';
  return `${from}h–${toH}h${toM}`;
}

/**
 * Dự báo cầu theo giờ cho tiệm chính: phân bổ customersPerDay(level) qua các khung giờ theo
 * nhịp (rhythm) × lễ/thời tiết (dayEffects.traffic) × tiếng lành × giờ vàng tự đặt. Mỗi khung
 * giờ vàng kéo một phần khách bổ sung đúng khung (tái dùng happyTraffic). Thuần xác định.
 */
export function demandForecast(a: DemandArg): DemandForecast {
  const total = customersPerDay(a.level);
  const dayTraffic = dayEffects(a.weatherSeed, a.day, a.level).traffic;
  const legend = a.localLegend ? 1.1 : 1;

  // Trọng số mỗi khung = traffic × dayTraffic × legend × (hiệu ứng giờ vàng nếu trùng khung) × độ dài
  const weights = TIME_BANDS.map((b): { b: TimeBand; w: number } => {
    const dur = b.to - b.from;
    let happyMul = 1;
    if (a.happy) {
      const hs = a.happy.from * 60;
      const he = hs + HAPPY_HOURS * 60;
      const overlap = Math.min(b.to, he) - Math.max(b.from, hs);
      if (overlap > 0) happyMul = ((dur - overlap) + overlap * happyTraffic(a.happy.off)) / dur;
    }
    const mul = b.traffic * dayTraffic * legend * happyMul;
    return { b, w: mul * dur };
  });

  const sumW = weights.reduce((n, x) => n + x.w, 0) || 1;
  let assigned = 0;
  const alloc = weights.map(({ b, w }, i) => {
    const expected = i === weights.length - 1
      ? Math.round(total - assigned) // khung cuối nhận phần dư để tổng khép đúng
      : Math.round(total * w / sumW);
    assigned += expected;
    return { b, expected };
  });

  const maxPerHour = Math.max(...alloc.map(x => x.expected / ((x.b.to - x.b.from) / 60)), 0.0001);
  const bands: DemandBand[] = alloc.map(({ b, expected }) => {
    const perHour = expected / ((b.to - b.from) / 60);
    return {
      id: b.id,
      label: bandLabel(b),
      expected,
      perHour: Math.round(perHour),
      pressure: Math.round(perHour / maxPerHour * 100),
      peak: perHour / maxPerHour >= 0.6,
    };
  });

  return {
    bands,
    expectedTotal: total,
    peakBands: bands.filter((b) => b.peak).map((b) => b.label),
  };
}
