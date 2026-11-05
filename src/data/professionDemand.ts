// ───── Phân khúc khách theo nghề: ai đang ghé trong khung giờ này ─────
// Chuỗi "soi hộp đen" đã đưa ra cho người chơi SỐ khách theo giờ (counterDemand.demandForecast),
// nhưng chưa cho biết HỌ LÀ AI: mỗi nghề (PROFESSIONS — 30+ phân khúc) có giờ hay ghé, món ưa thích,
// độ nhạy giá và độ kiên nhẫn chờ quầy, được mô phỏng trong customers.ts (pickProfession /
// professionWants) nhưng KHÔNG hề lộ ra — chủ bày kệ/định giá mà không biết khung này ai đến.
// Helper này THUẦN ĐỌC: tái dựng trung thực ĐÚNG trọng số pickProfession (giờ ghé ×4, ngoài giờ ×0.5,
// quảng cáo nhắm nghề ×3, PROFESSION_SHARE 0.55) + nhu cầu món (professionWants: món nghề ưa, đã mở
// khóa và đúng mùa theo offSeason) thành danh sách phân khúc nổi bật. Không import store → không đụng
// coopGuard; không đổi kinh tế/save/seed (Luật 5 an toàn); co-op an toàn.
import { PROFESSIONS, PROFESSION_SHARE, type ProfessionDef } from './professions';
import { offSeason } from './calendar';
import { productById } from './products';

/** Phần khung giờ cần cho phân tích phân khúc (TimeBand của rhythm hoặc DemandBand của demandForecast đều thừa đủ). */
export interface BandSlice {
  id: string;
  label?: string;
  from: number;
  to: number;
}

export interface SegmentReport {
  id: string;
  name: string;
  icon: string;
  /** Có đang trong khung giờ ghé của nghề (được ưu tiên ×4) hay ngoài giờ (×0.5). */
  inBand: boolean;
  /** Món ưa thích đã mở khóa + đúng mùa (món khách nghề này hay hỏi mua). */
  likes: string[];
  /** Độ nhạy giá trong hồ sơ nghề (~1 thường; <0.9 ít so đo giá; >1.3 kén giá). */
  sensitivity: number;
  /** Độ kiên nhẫn chờ quầy trong hồ sơ nghề (~1 thường; <0.8 sốt ruột; >1.4 thong thả). */
  patience: number;
  /** Chia sẻ kỳ vọng trong số khách CÓ NGHỀ của khung giờ (0–1, tổng = 1). */
  share: number;
}

export interface BandMix {
  band: BandSlice;
  /** Khách kỳ vọng trong khung (từ demandForecast, truyền vào để ước lượng số). */
  expected: number;
  /** Xác suất một khách ghé có nghề (PROFESSION_SHARE, quảng cáo nhắm nghề ×1.3). */
  professionalShare: number;
  /** Số khách có nghề kỳ vọng trong khung ≈ expected × professionalShare. */
  professionalCount: number;
  /** Các phân khúc nghề nổi bật, xếp theo chia sẻ giảm dần (khách có nghề). */
  segments: SegmentReport[];
}

/** Có trong giờ ghé của nghề không (điểm giữa khung — đại diện xác định cho khung giờ). */
function inBandAt(p: ProfessionDef, from: number, to: number): boolean {
  const mid = from + (to - from) / 2;
  return p.hours.some(([a, b]) => mid >= a && mid < b);
}

const overlap = (p: ProfessionDef, from: number, to: number): number => {
  const mid = from + (to - from) / 2;
  return p.hours.some(([a, b]) => mid >= a && mid < b) ? 4 : 0.5;
};

/**
 * Phân khúc khách theo nghề cho một khung giờ: trọng số mỗi nghề đúng `pickProfession`
 * (giờ ghé ×4, ngoài giờ ×0.5, quảng cáo nhắm nghề ×3), món ưa thích đúng `professionWants`
 * (mở khóa + đúng mùa). Số khách nghề kỳ vọng = expected × PROFESSION_SHARE (×1.3 nếu có quảng cáo
 * nhắm nghề — khớp pickProfession). THUẦN — không RNG/state, deterministic như sim.
 */
export function professionBandMix(opts: {
  level: number;
  day: number;
  band: BandSlice;
  /** Số khách kỳ vọng trong khung (thường từ demandForecast). */
  expected: number;
  /** Nghề đang được quảng cáo nhắm tới (hay ghé ×3). */
  boosted?: string[];
}): BandMix {
  const { level, day, band, expected, boosted = [] } = opts;
  const weights = PROFESSIONS.map((p) => ({
    p,
    w: overlap(p, band.from, band.to) * (boosted.includes(p.id) ? 3 : 1),
  }));
  const sumW = weights.reduce((n, x) => n + x.w, 0) || 1;

  const proShare = Math.min(1, PROFESSION_SHARE * (boosted.length ? 1.3 : 1));
  const segments: SegmentReport[] = weights
    .filter(({ w }) => w > 0)
    .map(({ p, w }) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      inBand: inBandAt(p, band.from, band.to),
      likes: p.likes.filter((id) => productById(id)?.unlock <= level && !offSeason(id, day)),
      sensitivity: p.sensitivity,
      patience: p.patience,
      share: sumW > 0 ? w / sumW : 0,
    }))
    .sort((a, b) => b.share - a.share);

  return {
    band,
    expected,
    professionalShare: proShare,
    professionalCount: Math.round(expected * proShare),
    segments,
  };
}

/** Truy vấn phân khúc nổi bật nhất cho một khung giờ (gọi bandMix + lấy đầu danh sách). */
export function topSegmentsOf(mix: BandMix, max = 3): SegmentReport[] {
  return mix.segments.slice(0, max);
}
