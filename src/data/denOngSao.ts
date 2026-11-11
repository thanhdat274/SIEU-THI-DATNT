/**
 * Hệ 7-L5 — trò ④ Phất đèn ông sao (SPEC-CHIEU-RONG §7.5). THUẦN, test được.
 *
 * Trung thu, gắn với đồ trang trí đèn ông sao. Khung tre 5 cánh, hai bước:
 *   1) Nối các nan theo đúng thứ tự để thành ngôi sao MỘT NÉT (vẽ ngôi sao 5 cánh bằng một nét
 *      liền — nối tip theo thứ tự [0,2,4,1,3], không phải theo vòng tròn);
 *   2) Dán giấy màu vào 5 cánh + tâm (chạm đúng vùng).
 * Điểm 0–100 = 60 (nối đúng ngôi sao một nét) + 40 (dán kín 5 cánh + tâm).
 * Đề (thứ tự các cánh hiển thị) không đổi theo seed — bố cục cố định, chỉ cách chơi quyết định.
 */
export const STAR_TIPS = 5;

/** Thứ tự một nét của ngôi sao 5 cánh: nối tip 0 → 2 → 4 → 1 → 3 (rồi về 0). */
export const STAR_TIP_ORDER: number[] = [0, 2, 4, 1, 3];

/** Cạnh "đúng" của ngôi sao — các cặp (không kể hướng) trong `STAR_TIP_ORDER`. */
export const starEdge = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);

export const STAR_EDGES: ReadonlySet<string> = new Set(
  STAR_TIP_ORDER.map((_, i) => starEdge(STAR_TIP_ORDER[i], STAR_TIP_ORDER[(i + 1) % STAR_TIPS])),
);

/**
 * Các cạnh đã vẽ từ một chuỗi tip người chơi bấm (nối tip kế tiếp; khi đủ 5 tip thì thêm
 * cạnh khép vòng từ tip cuối về tip đầu). Trả mảng cạnh "đã phân tích".
 */
export function connectEdges(seq: number[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < seq.length - 1; i++) out.push(starEdge(seq[i], seq[i + 1]));
  if (seq.length === STAR_TIPS) out.push(starEdge(seq[seq.length - 1], seq[0]));
  return out;
}

/** Số cạnh khớp ngôi sao một nét trong chuỗi tip đã bấm (0..5). */
export function starCorrectEdges(seq: number[]): number {
  return connectEdges(seq).filter((e) => STAR_EDGES.has(e)).length;
}

/**
 * Điểm nối nan — 60/100: tỉ lệ cạnh khớp ngôi sao một nét. Chưa nối được 2 tip → 0.
 * Nối đúng đủ cả 5 cạnh (theo [0,2,4,1,3]) → 60.
 */
export function scoreStarConnect(seq: number[]): number {
  if (seq.length < 2) return 0;
  const ok = starCorrectEdges(seq);
  return Math.max(0, Math.min(60, Math.round((ok / STAR_TIPS) * 60)));
}

/** Số vùng cần dán: 5 cánh + tâm. */
export const DEN_SECTIONS = 6;

/**
 * Điểm dán giấy — 40/100: tỉ lệ 6 vùng (5 cánh + tâm) đã dán kín.
 */
export function scoreDenPaste(covered: number): number {
  return Math.max(0, Math.min(40, Math.round((Math.min(DEN_SECTIONS, covered) / DEN_SECTIONS) * 40)));
}

/** Tổng điểm 0–100 = nối nan 60 + dán giấy 40. Kẹp an toàn. */
export function scoreDenOngSao(seq: number[], covered: number): number {
  return scoreStarConnect(seq) + scoreDenPaste(covered);
}
