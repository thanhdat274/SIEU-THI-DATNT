/**
 * Nguồn số "ngẫu nhiên" cho sim (GĐ27) — bước nền của kế hoạch Seeded RNG.
 *
 * Mục tiêu: để bot cân bằng / playtest tái lập được (cùng seed → cùng chuỗi kết quả) mà KHÔNG đổi
 * hành vi mặc định của game đang chạy. Nguyên tắc:
 *  - Không seed (`setSimSeed` chưa gọi): `simRng()` trả về `Math.random` TRỰC TIẾP tại lúc gọi —
 *    nên test mock `Math.random` vẫn hoạt động y hệt như trước (không bắt buộc phải seed).
 *  - Có seed: `simRng()` trả về chuỗi `mulberry32` xác định — mọi quyết định rẽ ngẫu nhiên trong sim
 *    đọc cùng một nguồn này sẽ chạy giống hệt nhau giữa các lần chạy cùng seed.
 * `mulberry32` là PRNG nhỏ, nhanh, chuỗi dài (2^32), đủ cho lưới sim.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chuỗi seed đang bật (null = đang ở chế độ Math.random mặc định). */
let seeded: (() => number) | null = null;

/** Đọc nguồn số ngẫu nhiên hiện tại của sim — Math.random khi chưa seed, chuỗi cố định khi đã seed. */
export const simRng = (): (() => number) => seeded ?? Math.random;

/** Có seed đang bật hay không (để test/logger biết mình đang ở chế độ nào). */
export const isSimSeeded = (): boolean => seeded !== null;

/** Bật seed: từ giờ `simRng()` trả chuỗi xác định theo `seed` (chỉ ảnh hưởng code đọc qua simRng). */
export function setSimSeed(seed: number): void {
  seeded = mulberry32(seed);
}

/** Tắt seed, quay về Math.random mặc định. */
export function clearSimSeed(): void {
  seeded = null;
}
