import { PROFESSIONS } from './professions';
import { ADS, activeAds, adById, type AdDef } from './biz';

/** Nhân khẩu học khách vãng lai (GĐ62): mỗi nghề một dòng tích lũy trong ván.
 *  Chỉ khách lẻ có `profession`; khách quen ⇒ profession null nên không vào đây.
 *  Bản lưu cũ thiếu `biz.demographics` → tự bù {} qua MERGE_DEEP (NO SAVE_VERSION). */
export interface DemoTally {
  visits: number;
  revenue: number;
  walkouts: number;
}

export type Demographics = Record<string, DemoTally>;

export const emptyDemographics = (): Demographics => ({});

/** Cộng dồn một mảnh (số dương) vào dòng của nghề; không tồn tại thì tạo mới. */
export const demoAdd = (d: Demographics, id: string, patch: Partial<DemoTally>): Demographics => {
  const cur = d[id] ?? { visits: 0, revenue: 0, walkouts: 0 };
  return {
    ...d,
    [id]: {
      visits: cur.visits + (patch.visits ?? 0),
      revenue: cur.revenue + (patch.revenue ?? 0),
      walkouts: cur.walkouts + (patch.walkouts ?? 0),
    },
  };
};

export interface DemogRow {
  id: string;
  name: string;
  icon: string;
  visits: number;
  revenue: number;
  /** Tỷ trọng doanh thu 0-100 (1 chữ số thập phân). */
  revenuePct: number;
  walkouts: number;
  /** Tỷ lệ bỏ về không mua 0-1. */
  walkoutRate: number;
}

const PROF_NAME = new Map(PROFESSIONS.map((p) => [p.id, p]));

/** Tổng kết nhân khẩu học: sắp theo doanh thu (phá bằng lượt), bỏ nghề toàn 0. Thuần, xác định. */
export function summarizeDemographics(tally: Demographics | undefined): DemogRow[] {
  const d = tally ?? {};
  const totalRevenue = Object.keys(d).reduce((n, id) => n + (d[id]?.revenue ?? 0), 0);
  return Object.keys(d)
    .map((id) => {
      const t = d[id] ?? { visits: 0, revenue: 0, walkouts: 0 };
      const prof = PROF_NAME.get(id);
      return {
        id,
        name: prof?.name ?? id,
        icon: prof?.icon ?? '🧑',
        visits: t.visits,
        revenue: t.revenue,
        revenuePct: totalRevenue > 0 ? Math.round((t.revenue / totalRevenue) * 1000) / 10 : 0,
        walkouts: t.walkouts,
        walkoutRate: t.visits > 0 ? t.walkouts / t.visits : 0,
      };
    })
    .filter((r) => r.visits > 0 || r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);
}

export interface AdReachTarget {
  id: string;
  name: string;
  icon: string;
  /** Nghề này đã ghé (visits>0) — ad "chạm tới" nhóm đó hay chưa. */
  matched: boolean;
}

export interface AdReach {
  targets: AdReachTarget[];
  /** Phần nhóm mục tiêu đã ghé 0-1. */
  coverage: number;
}

/** Với một quảng cáo (có targets), nhóm mục tiêu nào ĐÃ ghé theo nhân khẩu học. Thuần. */
export function adReach(ad: { targets?: string[] }, tally: Demographics | undefined): AdReach {
  const d = tally ?? {};
  const targets = (ad.targets ?? []).map((id) => {
    const prof = PROF_NAME.get(id);
    return {
      id,
      name: prof?.name ?? id,
      icon: prof?.icon ?? '🧑',
      matched: (d[id]?.visits ?? 0) > 0,
    };
  });
  const coverage = targets.length ? targets.filter((t) => t.matched).length / targets.length : 0;
  return { targets, coverage };
}

export interface AdSuggestion {
  profession: DemogRow;
  ad: AdDef;
  reason: string;
}

/** GĐ63 — mồi hành động cho vòng quảng cáo: trong các nghề khách đông nhất chưa bị ad đang chạy phủ,
 *  tìm nghề đầu tiên có một ad MỞ KHÓA nhắm đúng, trả kèm lý do. Không có → null. Thuần, không đổi gì. */
export function adTargetSuggest(
  tally: Demographics | undefined,
  ads: { id: string; untilDay: number }[],
  level: number,
  day: number,
): AdSuggestion | null {
  const rows = summarizeDemographics(tally);
  if (!rows.length) return null;
  const running = activeAds(ads, day);
  const covered = new Set(running.flatMap((a) => adById(a.id)?.targets ?? []));
  const runningIds = new Set(running.map((a) => a.id));
  for (const row of rows) {
    if (covered.has(row.id)) continue;
    const ad = ADS.find((a) => a.unlock <= level && a.targets?.includes(row.id) && !runningIds.has(a.id));
    if (ad) {
      return {
        profession: row,
        ad,
        reason: `${row.icon} ${row.name} đang là khách đông nhất (${row.revenuePct}% doanh thu) mà chưa ad nào chạm`,
      };
    }
  }
  return null;
}

