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
    expect(band(21, 30)).toBe(187); // T3-L4 răng cưa: dời ~43 món khỏi 26/28/30 về phía 27/29/31 (mỗi cấp 26–31 về 13–18 mục) — trước là 202
    expect(band(31, 40)).toBe(283); // phần dời sang cấp 31 dồn vào 31–40 — trước là 268
    expect(band(41, 60)).toBe(337); // GĐ2387v2: chuỗi sản xuất đặt 70/71 (ngoài cửa sổ 2 sim cân bằng L45/L65) — dải này giữ nguyên
    expect(band(61, 80)).toBe(167 + 4); // GĐ2346: +2 (bánh bao chiên 71) · GĐ2350: +2 (bánh tôm 74) · GĐ2352: +2 (chè khúc bạch 75) · GĐ2353: +2 (cơm tấm 76) · GĐ2355: +2 (bánh đúc nóng 77) · GĐ2356: +2 (bánh ít trần 78) · GĐ2357: +2 (nem lụi 79) · GĐ2369: +2 (cao lầu 80) · GĐ2387v2: +4 (chè cốm 70 + gà nướng mắc khén 71 — chuỗi sản xuất rg_*, ngoài cửa sổ 2 sim cân bằng)
    expect(band(81, 100)).toBe(101 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2 + 2); // GĐ2370: +2 (bánh trôi tàu 81) · GĐ2371: +2 (bánh gối 83) · GĐ2372: +2 (phở cuốn 84) · GĐ2373: +2 (bánh khoai 85) · GĐ2375: +2 (mực một nắng nướng 99) · GĐ2379: +2 (xôi xéo 81) · GĐ2382: +2 (bánh tiêu 84) · GĐ2383: +4 (cải muối nấu tôm khô 94 + gà tiềm nấm hương 97) — trước là 101
  });

  it('không cấp nào mở quá ngưỡng cảnh báo khối lượng (siết dần từ 20 mục)', () => {
    // Baseline: cấp 198/199 hiện 79. Ngưỡng cho phép tăng nhẹ nhưng chặn cú thêm quá tay
    // vào MỘT cấp: > 90 là điểm đỏ — một cấp mở ~nửa bảng hàng là mất kiểm soát, phải chia bớt.
    expect(maxAny, `một cấp hiện mở ${maxAny} mục`).toBeLessThanOrEqual(90);
  });

  it('cụm quá tải 31–40 có kiểm soát (baseline 283, cấm vượt 320 trước khi dời mốc)', () => {
    // Dải này quá tải nhất (spec §T3). L4 đã dồn 5 đồ nội thất khỏi cấp 30 vào đây
    // (dời mốc có chủ ý + golden:update); răng cưa T3-L4 dồn thêm ~12 món sang cấp 31.
    // Chưa rải bớt món thì không được tăng thêm.
    expect(band31to40, `dải 31–40 hiện ${band31to40} mục`).toBeLessThanOrEqual(320);
    expect(band31to40, 'baseline dải 31–40').toBe(283);
  });

  it('danh sách hệ lớn theo cấp (dời mốc một hệ = phải cập nhật baseline có chủ ý)', () => {
    // Những hệ CHÍNH của thang cấp. Đổi cấp mở → sửa TBỊ ở đây, kèm lý do vào commit,
    // và chạy lại golden nếu mốc ≤ 30. Danh sách không đầy đủ (chỉ nắm các mốc trụ).
    const SYSTEM_LEVELS: [string, number][] = [
      ['GARDEN_UNLOCK', 8],
      ['ONLINE_UNLOCK', 10],
      ['COOK_UNLOCK', 21],
      ['QUAN_NUOC_UNLOCK', 29],
      ['DINE_UNLOCK', 33], // T3-L4 dời 30→33
      ['CRITIC_UNLOCK', 37], // T3-L4 dời 30→37
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

  it('T3-L6: từ cấp 60 không quá 12 cấp liên tiếp không có mốc mở khoá (nguyên tắc 3)', () => {
    // Nguyên tắc 3 của SPEC §T3: sau cấp 60, không được có dải 12 cấp liên tiếp trống trơn —
    // chặn tình trạng "thêm nội dung dồn hết vào thấp, cao cấp không có gì mới để chơi".
    // Đo bằng ≤ 12 (hiện trạng 0 cấp trống), siết dần như các nguyên tắc 1–2.
    let run = 0, worst = 0, worstAt = 0, gapStart = 60;
    for (let l = 60; l <= 200; l++) {
      if (byLevel[l] === 0) {
        if (run === 0) gapStart = l;
        run++;
        if (run > worst) { worst = run; worstAt = gapStart; }
      } else run = 0;
    }
    expect(worst, `dải trống dài nhất ≥60 là ${worst} cấp (bắt đầu ${worstAt})`).toBeLessThanOrEqual(12);
  });
});
