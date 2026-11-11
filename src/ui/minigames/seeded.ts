// ─────────────────────────────────────────────────────────────
// Seeded đề bài cho trò khéo tay (Hệ 7 · SPEC-CHIEU-RONG §7.3)
// ─────────────────────────────────────────────────────────────
// Mọi đề bài của các trò suy từ `miniSeed(weatherSeed, day, miniId)` → TẤT ĐỊNH (R4):
// hai máy trong hẻm cùng seed ra cùng đề, và lặp lại cùng dịp mỗi năm ra cùng một "hình mẫu"
// nhờ seed thời tiết cố định theo ván. Không rút simRng (R1).

/** Băm chuỗi miniId ra một số 32-bit (Fowler–Noll–Vo kiểu rút gọn — chỉ nội bộ, không cần đồng nhất). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Chốt một seed số nguyên cho một trò trong một ngày — truyền vào `miniRand` để rút ra từng phần đề. */
export function miniSeed(weatherSeed: number, day: number, miniId: string): number {
  return (weatherSeed ^ Math.imul(hashString(miniId), 0x9e3779b1) ^ Math.imul(day, 0x85ebca6b)) >>> 0;
}

/** Rút ngẫu nhiên tất định trong [0,1) từ seed — salt tách từng phần đề (chọn món quà, hướng...). */
export function miniRand(seed: number, n: number, salt: number): number {
  let h = (seed >>> 0) ^ Math.imul(n, 2654435761) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Chọn ngẫu nhiên (tất định) một phần tử mảng. */
export function miniPick<T>(seed: number, n: number, salt: number, arr: readonly T[]): T {
  return arr[Math.min(arr.length - 1, Math.floor(miniRand(seed, n, salt) * arr.length))];
}
