# Tasks

Trạng thái 11/10/2026: ĐÃ CÓ CODE cho W1/W3 (chủ dự án chọn hướng A). W2/W4 (đường nam) đã làm theo hướng 2 (lô y 16..23, một hàng vỉa hè y=24, region tới y=25). Test game-core 111/0, typecheck/build PASS; server `test:coop` đã chạy PASS với Mongo local; chưa kiểm mobile.

## 0. Quyết định

- [x] 0.1 Chủ dự án chốt Q1 = A (11/10/2026); bảng kích thước W1/W3 ghi trong design (PROVISIONAL, chờ duyệt). Hướng 2 cho W2/W4 chốt 11/10/2026 (xem design).
- [ ] 0.2 Chụp ảnh khu phố hiện tại tại W1/W2 để chốt rect lô mới không đè công trình hiện có.

## 1. Dữ liệu

- [x] 1.1 Sửa rect lô W1–W4 theo 0.1 — **đã sửa cả W1–W4** (W2/W4: lô y 16..23, region y 16..25, `wave-infrastructure.ts` vỉa hè một hàng + rãnh ở bó vỉa; test dữ liệu/hạ tầng/play-area cập nhật) (`waves.ts`; `reclamation-data.test.ts` đổi số lô w1 3→2, corner x 42..51, thêm kiểm lô chứa vừa tòa + y1=10); hạ tầng `wave-infrastructure.ts` chưa chỉnh lại (đèn/cây/chỗ đỗ nằm ở khe ngoài lô, y 11–12, vẫn nằm ngoài lô mới nên không đụng) — cần xem ảnh; cập nhật `waves.ts`, `wave-infrastructure.ts`, test `reclamation-data.test.ts`/hạ tầng đợt.
- [x] 1.2 `resolveParcel(id)` + `ALL_PARCELS` + `WAVE_LAND_PARCELS` (`parcels.ts`); thay chỗ tra ở `placements.ts`, `footprint.ts`, `store-layout.ts`; `frontRow` KHÔNG làm (W1/W3 cùng y=10). Gốc: thay chỗ tra `PARCEL_MAP` ở `placements.ts`, `store-layout.ts`, `reclamation.ts`; W0 giữ y=10, golden không đổi.
- [x] 1.3 `validatePlacement`/`validatePlacements` nhận lô đợt mới (`parcelFitBounds`), `resolvePlacements` không bỏ vị trí vì thiếu danh sách lô sở hữu; test `new-parcel-placement.test.ts`. Gốc: test: tòa vừa lô mới, vượt lô (`outside_parcel`), lô chưa mua (`parcel_not_owned`), cửa bị cây chặn, W0 không đổi.

## 2. Core

- [x] 2.1 `placementOptions` duyệt `ALL_PARCELS` (lô đợt mới chỉ khi đã mua và đợt đã mở); `buy_plot`/`relocate_building` chạy trên lô mới.
- [x] 2.2 (kiểm trình duyệt: tòa dựng đúng ở w1-corner, nội thất/biển hiệu hiện) `generateTileMapForWaves` + `layoutBuildings` dựng tòa, cửa, mái hiên trên lô mới; va chạm và đường đi khách.
- [ ] 2.3 (W2/W4: headless 6 ngày, quán nước đường nam `w2-1` bán 150 đồ uống vs 191 ở W0 ≈ ×0,75–0,8; `w4-corner` (W1/W3 đã mở) 176 ≈ ×0,9 — khớp hệ số khách D5; đã chạy mô phỏng headless 6 ngày × 2 hạt giống, quán nước ở w1-corner vs lot-east-2: khách 1528 vs 1461 và 1574 vs 1505, đồ uống bán 252 vs 200 và 284 vs 220 ≈ +26–29% khớp hệ số góc 1,25; số PROVISIONAL, script tạm đã xóa; CHƯA đổi `*-balance-sim.ts` sang lô thật) Khách tới tòa trên lô mới; kiểm hệ số vị trí và doanh thu bằng mô phỏng nhiều ngày; cập nhật `*-balance-sim.ts` sang lô thật.

## 3. Save và server

- [x] 3.1 (kiểm: `exportSaveData` ghi `buildingPlacements` với `parcelId` lô mới — test `new-parcel-placement.test.ts`; server lưu và đọc lại qua Mongo — `test:coop`; không đổi schema) Save: `buildingPlacements` với `parcelId` lô đợt mới nạp/lưu đúng; không đổi schema nếu không cần (nếu cần, bump + migration).
- [x] 3.2 Server: `coop-commands.test.ts` cho `buy_plot` kèm `placement` trên lô đợt mới. **(11/10/2026, CHẠY THẬT với Mongo local, `yarn --cwd apps/server test:coop` PASS:** world riêng, owner mua quán nước ở `w1-corner` (gốc 42,3; −1.500.000 ₫) và quán ăn vặt ở `w2-2` (gốc 10,16, nội thất y 16..23), mua lại là no-op, dời `w2-2`→`w2-3` dịch nội thất dx=+8; từ chối: lô chưa mua, lô đợt chưa mở, tòa vượt lô, sai gốc x, dời tới lô chưa mua, không đổi revision. **Tìm ra và sửa LỖI THẬT ở server:** `bootstrap.ts` gọi `placementsProblem` không truyền `ownedParcelIds` nên mọi `buy_plot` lên lô đợt mới bị từ chối `parcel_not_owned`. Cũng sửa số cũ trong test `buy_parcel` (giá `w1-corner` 576.000→1.536.000 vì lô 10×8). Cũng chạy PASS: `test:unit`, `test:worlds`, `test:gateway`.)

## 4. Giao diện

- [x] 4.1 (kiểm trình duyệt: select lô có "Lô góc đợt 1 · w1-corner", mở quán nước ở đó trừ 1.500.000 ₫, áp dụng bố cục thành công) `StoreLayoutModal` tab "Mở đất": liệt kê lô đợt mới đã mua, nhãn lô (thay `LOT_LABELS` cứng), xem trước tòa đặt ở đó.
- [ ] 4.2 Biển lô/minimap/bảng Thành phố phản ánh lô đã có tòa; renderer kiểm tòa trên lô mặt đường nam (ảnh chụp: quán ăn vặt ở `w2-2` hiện đúng, có biển, nội thất, vỉa hè y=24 và đường nam bên dưới).

## 5. Kiểm chứng và tài liệu

- [x] 5.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (ghi kết quả thật). **(11/10/2026: typecheck PASS; game-core 111 pass/0 fail; build PASS; `yarn --cwd apps/server test:coop`, `test:unit`, `test:worlds`, `test:gateway` PASS với Mongo local.)**
- [x] 5.2 Browser QA: mở W1 → mua `w1-corner` → mở quán nước (UI) → khách tới → doanh thu; lưu/nạp; đêm/mưa; mobile; co-op. Ghi riêng từng mục. **(11/10/2026, ghi từng mục:**
  - Mở W1, mua `w1-corner`: ĐẠT bằng lệnh `reclaimWave`/`buyParcel` trong `window.__sim` (mua lô còn chạm lô trên bản đồ đã kiểm ở change land-reclamation).
  - Mở quán nước trên `w1-corner` bằng UI "Mở đất" + "Áp dụng bố cục": ĐẠT (ảnh chụp: tòa, biển hiệu, nội thất đúng vị trí; trừ 1.500.000 ₫). Lưu ý: bấm "Hủy" sẽ bỏ bản nháp.
  - Quán ăn vặt trên `w2-2` (đường nam): ĐẠT qua `purchaseLand` (ảnh chụp: tòa, biển hiệu, vỉa hè y=24, đường nam bên dưới), không đi qua UI.
  - Khách tới + doanh thu: ĐẠT bằng MÔ PHỎNG HEADLESS (không phải khách trong trình duyệt): đồ uống bán 252 (w1-corner) vs 200 (lot-east-2); 150 (w2-1) vs 191; 176 (w4-corner). Tìm ra và sửa lỗi hàng biên y=24 chặn lối vào W2/W4. Số provisional.
  - Lưu/nạp: ĐẠT một phần (save thử giữ đợt/lô qua nhiều lần reload; vị trí tòa kiểm qua test + server), chưa tự tay reload khi có tòa trên lô mới.
  - Đêm/mưa: ĐẠT bằng mắt ở khu W1/W2 từ trước khi có tòa; chưa chụp lại sau khi có tòa.
  - Co-op: ĐẠT mức server (`test:coop` PASS, hai tài khoản cùng thế giới); chưa chơi co-op hai trình duyệt.
  - Mobile/cảm ứng: CHƯA kiểm (pane chỉ ở khổ hẹp, canvas vẽ lỗi nửa dưới).)**
- [x] 5.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`. **(11/10/2026, gồm ghi việc hoãn.)**

## Việc hoãn khi archive (chủ dự án đồng ý archive 11/10/2026)

Giữ chưa tick, nêu rõ để không coi là đã xong:

- 0.2 Chụp ảnh khu phố W1/W2 để chốt/chỉnh rect lô và hạ tầng (đèn/cây/chỗ đỗ ở khe) — kích thước lô hiện PROVISIONAL.
- 2.3 Đổi `drink/xoi-balance-sim.ts` sang lô thật (hiện dùng lô tổng hợp); cân bằng giá lô/khách chưa playtest.
- 4.2 Minimap/bảng Thành phố phản ánh lô đã có tòa; chưa kiểm cảm ứng/mobile.
- Mobile/cảm ứng và co-op hai trình duyệt (xem 5.2); W4 chỉ tới được khi đã mở W1/W3 hoặc W2 (khách sinh ở hai mép y=12).
