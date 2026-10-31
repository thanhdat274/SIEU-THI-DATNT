/** Mồi "Sắp đạt": lọc những cột mốc (level/ngày/doanh thu/món/khách…) người chơi còn cách không xa,
 *  để UI nhắc "gần xong rồi, thêm chút nữa" — câu giữ chân dạng gần đạt, không đổi kinh tế. */

export type MilestoneKey = 'level' | 'day' | 'revenue' | 'itemsSold' | 'customers';

export interface MilestoneDef {
  id: string;
  icon: string;
  name: string;
  key: MilestoneKey;
  target: number;
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'lv10', icon: '🛒', name: 'Cấp 10', key: 'level', target: 10 },
  { id: 'lv20', icon: '⭐', name: 'Cấp 20', key: 'level', target: 20 },
  { id: 'lv30', icon: '🏪', name: 'Cấp 30', key: 'level', target: 30 },
  { id: 'lv40', icon: '🎖️', name: 'Cấp 40', key: 'level', target: 40 },
  { id: 'lv50', icon: '🏬', name: 'Cấp 50', key: 'level', target: 50 },
  { id: 'lv60', icon: '👑', name: 'Cấp 60', key: 'level', target: 60 },
  { id: 'lv80', icon: '🌟', name: 'Cấp 80', key: 'level', target: 80 },
  { id: 'lv90', icon: '💎', name: 'Cấp 90', key: 'level', target: 90 },
  { id: 'day7', icon: '☀️', name: 'Tròn 1 tuần mở tiệm', key: 'day', target: 7 },
  { id: 'day30', icon: '🗓️', name: 'Tròn 1 tháng buôn bán', key: 'day', target: 30 },
  { id: 'day90', icon: '🗓️', name: 'Tròn 3 tháng', key: 'day', target: 90 },
  { id: 'day365', icon: '📅', name: 'Tròn 1 năm', key: 'day', target: 365 },
  { id: 'rev1m', icon: '💰', name: 'Doanh thu 1 triệu', key: 'revenue', target: 1_000_000 },
  { id: 'rev50m', icon: '🏦', name: 'Doanh thu 50 triệu', key: 'revenue', target: 50_000_000 },
  { id: 'rev100m', icon: '🏦', name: 'Doanh thu 100 triệu', key: 'revenue', target: 100_000_000 },
  { id: 'rev500m', icon: '🏬', name: 'Doanh thu nửa tỷ', key: 'revenue', target: 500_000_000 },
  { id: 'items1k', icon: '📦', name: 'Bán 1.000 món', key: 'itemsSold', target: 1000 },
  { id: 'items10k', icon: '🏭', name: 'Bán 10.000 món', key: 'itemsSold', target: 10_000 },
  { id: 'items100k', icon: '🏭', name: 'Bán 100.000 món', key: 'itemsSold', target: 100_000 },
  { id: 'cust1k', icon: '👥', name: '1.000 lượt khách', key: 'customers', target: 1000 },
  { id: 'cust5k', icon: '🎪', name: '5.000 lượt khách', key: 'customers', target: 5000 },
];

export interface MilestoneDossier {
  level: number;
  day: number;
  revenue: number;
  itemsSold: number;
  customers: number;
}

/** Tiến độ (0–1) của một cột mốc hướng theo dossier hiện tại; đạt thì 1. */
export const milestonePct = (m: MilestoneDef, d: MilestoneDossier): number =>
  Math.min(1, Math.max(0, d[m.key] / m.target));

/** Mốc đã đạt chưa. */
export const milestoneDone = (m: MilestoneDef, d: MilestoneDossier): boolean => d[m.key] >= m.target;

export interface MilestoneStep {
  m: MilestoneDef;
  pct: number;
  /** Còn thiếu bao nhiêu (đơn vị của cột mốc) — dùng để hiện "còn X đơn vị nữa". */
  remaining: number;
}

/** Các mốc gần đạt nhất (đã lọc bỏ mốc đã xong), sắp theo tiến độ giảm dần, tối đa `n`. */
export function nearestMilestones(d: MilestoneDossier, n = 3): MilestoneStep[] {
  return MILESTONES
    .filter((m) => !milestoneDone(m, d) && milestonePct(m, d) > 0)
    .map((m) => ({ m, pct: milestonePct(m, d), remaining: m.target - d[m.key] }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n);
}
