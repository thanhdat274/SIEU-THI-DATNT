# Tasks

> **TRẠNG THÁI: TẠM DỪNG (13-11-2026)** — GĐ2387 đã thử triển khai và REVERT vì phá 2 lock cân bằng
> (crisisBalance L45 + stanceBalance L65). Xem Outcome trong proposal.md. Giữ nguyên danh sách làm tư liệu thiết kế lại.


## 1. Data — 5 hàng đặc sản + công thức (recipes.ts)

- [x] 1.1 Thêm CB_PRODUCTS khối 5 món `cb_*` vào COOKED_PRODUCTS (chuối sấy dẻo 36, xoài sấy dẻo Cao Lãnh 37, vải sấy Bắc Giang 38, mít sấy 39, khoai lang sấy 40; `since: CONTENT_EPOCH_NOW`)
- [x] 1.2 Thêm 5 RECIPES trạm `food_grill` (mẻ 2 nông sản → 5 gói; duration 25-30; `since: CONTENT_EPOCH_NOW`)
- [x] 1.3 Kiểm tra id `x_khoai_lang` trong catalog + giá thật, tính mẻ đúng luật monKhuon cho cả 5

## 2. Tests

- [x] 2.1 monKhuon.test.ts +5 dòng (gd, trạm, inputs)
- [x] 2.2 monThat.test.ts +5 dòng (tên, trạm, cách chế biến thật kèm địa phương)
- [x] 2.3 unlockPacing.test.ts band(31,40) 283→293 (comment có chủ ý)

## 3. Docs

- [x] 3.1 `npm run unlock:curve` tái sinh docs/UNLOCK-CURVE.md (1878→1888 mốc)
- [x] 3.2 PROGRESS.md dòng GĐ2387 + mở đầu nhánh mở rộng "chuỗi sản xuất chế biến sâu"

## 4. Verify + commit

- [x] 4.1 tsc --noEmit sạch; 7 file test liên quan xanh; full suite xanh
- [x] 4.2 Commit "GD2387: chuoi san xuat che bien sau — 5 hang dac san cb_* tu nong san vuon"
