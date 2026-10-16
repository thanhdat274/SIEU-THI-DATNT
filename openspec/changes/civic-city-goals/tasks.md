# Tasks: civic-city-goals (Mục tiêu thành phố + Sổ góp xóm)

> **Cập nhật 16/10/2026:** Giai đoạn 0–3 ĐÃ xong kèm test chạy thật (game-core 112/112 pass, 0 lỗi, kitchen-sink khớp). Giai đoạn 3 (mục tiêu xóm phố cấp 4–10) đã hoàn thành với catalog riêng `civic-reveal-goals.ts` (KHÔNG nối vào `CITY_GOALS_CATALOG` để không chặn lên cấp/golden); simulation `claimCivicRevealGoal` + gieo `revealedBundleIds` theo cấp tải (không hồi tố) + ghi vào save (schema vẫn 11, additive). Các mục 3.x = Giai đoạn 4; 4.4 = Giai đoạn 6 **chưa bắt đầu**. Xem chi tiết ở design.md (đã đồng bộ + bảng cân bằng 4 trang).

## 0. Chốt với chủ dự án
- [x] 0.1 Mỗi ô hàng có ≥ 2 loại thay thế. **Đã chốt 16/10/2026.**
- [x] 0.2 Hàng góp phải còn hạn ≥ 1 ngày (`BUNDLE_MIN_SHELF_DAYS = 1`). **Đã chốt 16/10/2026.**
- [x] 0.3 Tiền chỉ vào ô "Quỹ xây dựng", không mua thẳng ô hàng. **Đã chốt 16/10/2026.**

## 1. Mục tiêu thành phố — Giai đoạn 3 (đã làm, code + test 16/10/2026)
- [x] 1.1–1.3 Nối `evaluateCivicGoalCondition` thật (3 loại: `civic_building_count`, `district_qol_at_least`, `total_population_at_least`) vào mục tiêu xóm phố; catalog riêng `CIVIC_REVEAL_GOALS` (4 mục tiêu cấp 4/5/7/9 khớp `revealedByCityLevel` từng sổ, KHÔNG vào `CITY_GOALS_CATALOG`); `revealBundleId`; `isBundleRevealed`; `revealedBundleIdsForLoadedLevel` không hồi tố; simulation `claimCivicRevealGoal` (giành riêng — không trùng milestone claim_city_goal) + gieo reveal theo cấp tải (constructor + importSaveData) + ghi `revealedBundleIds` vào save (schema vẫn 11). Test `runCivicRevealGoalsTests` chạy trong suite 112/112, 0 lỗi, golden khớp.
- [x] 1.2 Mục tiêu xóm phố cấp 4–10, thưởng `revealBundleId`; validate catalog + đánh dấu trang là "hiện" (`revealBundleId`). Chưa hồi tố.
- [x] 1.3 Không hồi tố với cấp đã qua; test tải save.

## 2. Sổ góp xóm — dữ liệu + core (Giai đoạn 0–2; ✔ = có code + test chạy thật)
- [x] 2.1 `game-data/world/civic-bundles.ts` 4 trang + `validateCivicBundles()` (id duy nhất, `acceptedProductIds` tồn tại, đúng 1 ô cash, mỗi ô hàng ≥ 2 loại, ô cash = công thức 80%, quỹ ≥ 0, tổng góp dự kiến ≤ giá xây) + export. **Giá quỹ KHÔNG ghi tay**, tính `civicBundleCashAmount = round50k(0,8×giá xây − hàng dự kiến)`. Bảng 4 trang: Park 2.5M → quỹ 1.75M / Clin 4M → 3.05M / Ward 1.8M → 1.2M / School 3M → 2.15M (tổng ≈78,8–80,7%). *(đã kiểm chứng)*
- [x] 2.2 `game-core/civic-bundles.ts`: kiểm hợp lệ, nhận phần thiếu, trừ kho FIFO (bỏ qua lô < 1 ngày hạn), hoàn thành; test thuần. *(đã kiểm chứng: từ chối + góp vượt + FIFO + value = giá vốn)*
- [~] 2.3 Lệnh `donate_to_bundle` + server replay **co-op** (Gđ 6: có code + test runtime 2 phiên; chưa test qua HTTP/gateway, chưa QA 2 client): `donateToBundle` ở simulation đã nối `takeDonationLots` + ledger + trừ quỹ chung; server-authoritative replay 6.2–6.7 chưa làm.
- [~] 6.R Rà soát Gđ 6 (16/10/2026): giá phiếu = tiền trừ (hàm đếm chung), sửa lỗi gốc `test:coop` (civic null), `reconcileDonateRejection`, test gateway thật (phiếu tạo/từ chối/duyệt/ô đã đủ→failed) + `coop-commands` (`donate_to_bundle`, `claim_city_goal` từ chối). Đã chạy: typecheck, game-core 112/112 x5, test:coop, test:gateway, web test đều EXIT 0. CHƯA: QA 2 client trình duyệt; trần góp tiền khi chủ hẻm offline và định nghĩa "quỹ" 30% (chờ chủ dự án).
- [x] 2.4 `LedgerEntryType` `civic_donation` (giá vốn) + báo cáo; test sổ cái. *(đã kiểm chứng: quantity/amount=giá vốn/cogs 1 lần/bundleId/slotId; không trừ 2 lần)*
- [x] 2.5 Schema KHÔNG nâng (vẫn 11); save `civic.bundles` optional/additive; `isSaveGameData`/validate chấp nhận schema 10 & 11; test. *(đã kiểm chứng: save 10 & 11 nạp được; slots âm / contribution thiếu slotId → từ chối)*
- [x] 2.6 Hoàn thành sổ → mở loại công trình + **tòa đầu trả `max(0, giá xây − giá trị đã góp)`** (`civicOpenCost` + `bundleDonatedValue`), tòa 2+ giá gốc, không âm. **Nhật ký mốc/thông báo khánh thành** (`city-journal.ts`, mốc `bundle_completed`/`civic_opened` trong save): làm xong Gđ 5, test thuần + replay không trùng. Luật mở civic giữ như hiện tại (chủ dự án chốt 3.3). *(mở công trình + giảm phí + mốc nhật ký: đã kiểm chứng)*

## 3. UI — Giai đoạn 4 (chưa làm)
- [~] 3.1 Tab "Sổ góp xóm" trong `CityModal.tsx` (`CivicBundlesPanel.tsx` + view-model `game-core/civic-bundle-view.ts`): lưới thẻ 4 trạng thái, trang chi tiết, bảng góp bottom sheet, tồn kho lô còn hạn, người góp nhiều nhất, huy hiệu "Xóm cần". **Có code; đã QA Browser (góp đủ công viên, giá còn phải trả 452.000₫, xây trừ đúng, landscape 667×375 không tràn); chưa kiểm chứng: badge Xóm cần bằng mắt, desktop rộng chụp ảnh, bố cục dọc (game khóa dọc), 2 client.** Còn thiếu hiển thị tên người góp co-op (chỉ `playerId`).
- [~] 3.2 Thông báo khánh thành (toast + popup + bản tin sáng): **có code + test logic; popup đã thấy trên Browser; toast/bản tin sáng chưa nhìn bằng mắt.** Audit P0/P1/P2, QA 7 viewport.

## 4. Kiểm tra
- [x] 4.1 Cân bằng: tổng góp dự kiến ≈80% giá xây (`validateCivicBundles` chặn tổng > giá xây), mọi trang trong [75%,85%]. **Sweep** chậm cấp 10 (`city-goals-sim`) + đo kinh tế (Gđ 7) chưa chạy. *(bảng 4 trang: đã kiểm chứng trong tổng hợp.md)*
- [x] 4.2 `yarn typecheck` EXIT 0; `yarn --cwd packages/game-core test` (bản dist) **112/112 pass, 0 fail, 0 lỗi** (16/10/2026).
- [~] 4.3 QA trình duyệt: góp đủ một trang → mở công trình — **đã làm 16/10/2026 (Gđ 4, một phần: xem 3.1)**; popup khánh thành (Gđ 5) chưa; co-op 2 client góp chung một trang (Gđ 6).
- [~] 4.4 Co-op (Gđ 6: **có code + test runtime `civic-coop.test.ts`; test:coop hiện FAIL ở bước layout_batch không liên quan; QA 2 client CHƯA làm**): quyền góp hàng/tiền, phiếu chi lớn ô quỹ (>30% quỹ → `land-vote.ts`), `memberLandPermissions='none'`, góp cùng lúc, kho ghi công theo phiên, hủy phiếu khi ô đủ, khánh thành phát cho cả hai; test replay + QA 2 client.
