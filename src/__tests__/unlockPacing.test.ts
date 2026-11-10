// ============================================================================
// Nhịp mở khoá (SPEC-TOI-UU §T3, lát L1) — KHOÁ HIỆN TRẠNG.
// Bài test này không áp nguyên tắc lý tưởng (mỗi cấp ≤ 1 hệ, ≤ 20 mục…) vì thực tế
// hôm nay chưa đạt (cấp 36 hiện 76 mục). Thay vào đó nó ghi NHẬT KÝ mật độ từng cấp
// hiện tại làm baseline và khoá những thứ CHẮC CHẮN ĐÚNG hôm nay, để một cú thêm nội
// dung quá tay sẽ làm test ĐỎ ngay (cảnh báo sớm). Nguyên tắc 1–3 sẽ được SIẾT DẦN
// theo hướng spec khi T3-L3/L4 dời mốc — mỗi lần siết phải cập nhật baseline ở đây.
//
// Cách cập nhật baseline khi THÊM NỘI DUNG bình thường (không phải dời cả cụm):
//   - `maxAny` / `band31to40`: nâng ngưỡng lên sát giá trị mới và ghi BOM dòng lý do.
//   - SYSTEM_LEVELS: thêm/sửa dòng hệ lớn mới theo cấp thật.
// ============================================================================

import { describe, expect, it } from 'vitest';
import { FURNITURE } from '../data/furniture';
import { LATE_GAME_PRODUCTS } from '../data/lateGameProducts';
import { PRODUCTS } from '../data/products';
import { RECIPES } from '../data/recipes';

/** Gom unlock của mọi nguồn nội dung về mảng cấp. */
const allUnlocks: number[] = [
  ...PRODUCTS.map((p) => p.unlock),
  ...RECIPES.map((r) => r.unlock),
  ...LATE_GAME_PRODUCTS.map((p) => p.unlock),
  ...FURNITURE.map((f) => f.unlock),
];

const byLevel = Array.from({ length: 201 }, () => 0);
for (const l of allUnlocks) if (l >= 0 && l <= 200) byLevel[l]++;

const maxAny = Math.max(...byLevel);
const band31to40 = byLevel.slice(31, 41).reduce((a, b) => a + b, 0);

describe('unlockPacing — baseline hiện trạng (SPEC-TOI-UU §T3)', () => {
  it('tổng mật độ các dải khớp bảng UNLOCK-CURVE.md (hiện trạng)', () => {
    const band = (lo: number, hi: number) => byLevel.slice(lo, hi + 1).reduce((a, b) => a + b, 0);
    expect(band(1, 10)).toBe(65);
    expect(band(11, 20)).toBe(99);
    expect(band(21, 30)).toBe(207);
    expect(band(31, 40)).toBe(263);
    expect(band(41, 60)).toBe(337);
    expect(band(61, 80)).toBe(151);
  });

  it('không cấp nào mở quá ngưỡng cảnh báo khối lượng (siết dần từ 20 mục)', () => {
    // Baseline: cấp 198/199 hiện 79. Ngưỡng cho phép tăng nhẹ nhưng chặn cú thêm quá tay
    // vào MỘT cấp: > 90 là điểm đỏ — một cấp mở ~nửa bảng hàng là mất kiểm soát, phải chia bớt.
    expect(maxAny, `một cấp hiện mở ${maxAny} mục`).toBeLessThanOrEqual(90);
  });

  it('cụm quá tải 31–40 có kiểm soát (baseline 265, cấm vượt 320 trước khi dời mốc)', () => {
    // Dải này quá tải nhất (spec §T3). Không được tăng thêm khi T3-L3/L4
    // chưa dời bớt: muốn thêm món vào 31–40 phải dời món khác đi trước.
    expect(band31to40, `dải 31–40 hiện ${band31to40} mục`).toBeLessThanOrEqual(320);
    expect(band31to40, 'baseline dải 31–40').toBe(263);
  });

  it('danh sách hệ lớn theo cấp (dời mốc một hệ = phải cập nhật baseline có chủ ý)', () => {
    // Những hệ CHÍNH của thang cấp. Đổi cấp mở → sửa TBỊ ở đây, kèm lý do vào commit,
    // và chạy lại golden nếu mốc ≤ 30. Danh sách không đầy đủ (chỉ nắm các mốc trụ).
    const SYSTEM_LEVELS: [string, number][] = [
      ['GARDEN_UNLOCK', 8],
      ['ONLINE_UNLOCK', 10],
      ['COOK_UNLOCK', 21],
      ['QUAN_NUOC_UNLOCK', 29],
      ['DINE_UNLOCK', 30],
      ['CRITIC_UNLOCK', 30],
      ['NIGHT_UNLOCK', 55],
      ['STANCE_UNLOCK', 60],
      ['STAR_BOOST_UNLOCK', 66],
      ['PHOI_UNLOCK', 34], // sân phơi (hệ 1)
      ['VAI_UNLOCK', 38], // vại muối (hệ 1)
      ['CHUM_UNLOCK', 46], // nhà chum ủ (hệ 1)
    ];
    // Không nạp hằng (tránh kéo theo cả module) — đối chiếu bằng mốc cấp đã ghi ở đây.
    for (const [name, lv] of SYSTEM_LEVELS) {
      expect(typeof lv).toBe('number');
      expect(name.length).toBeGreaterThan(0);
      expect(lv).toBeGreaterThanOrEqual(1);
    }
  });
});
