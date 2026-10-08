# Tasks

Trạng thái 07/10/2026: phần THUẦN AN TOÀN của các task 1.1, 1.2, 2.3 ĐÃ CÓ CODE (module + test), CÓ CỨU trong test-runner, typecheck workspace PASS; phần lệnh core (2.1/2.2), schema 10 (3.1), server/UI (3.2/3.3), test/build/browser (4.1) CHỜ MÁY THẬT (schema 10 D8 đổi `ownedParcelIds` → `ParcelTenure` là refactor toàn hệ phá land-reclamation — không làm trong sandbox). Phụ thuộc `open-world-land-reclamation` (mở, renderer/browser chờ máy thật).

**Ghi chú phần thuần vòng 4 đã làm (3 subagent, 07/10/2026):**
- 1.1 THUẦN: `game-data/world/land-lease.ts` — `ParcelTenure` (owned/leased), `LAND_LEASE_CONSTANTS` (LEASE_DAILY_RATE 0.02, LEASE_CREDIT_RATE 0.5, DEBT_CLOSURE_DAYS 3, NEARBY_BONUS 0.05, TIER_FACTOR [1,1.1,1.25,1.45,1.7,2], PRICE_CAP 2.5), helpers isLeased/isOwned/rentDebtThresholdMet. Test `runLandLeaseTests`.
- 1.2 THUẦN: `game-core/parcel-price.ts` — `parcelPrice(params)` theo D6 (amplification clamp PRICE_CAP 2.5, TIER_FACTOR + NEARBY_BONUS), `amplificationFactor`, `priceTrend` up/down/flat. Test `runParcelPriceTests`.
- 2.3 THUẦN: `game-core/land-lease-sim.ts` — `simulateLeaseRun` 60 ngày PROVISIONAL (giá cap, tổng tiền thuê, nợ/closed, khấu trừ mua). Test `runLandLeaseSimTests`.
- Wire: game-data index export land-lease (module + test); test-runner nối 3 test (runLandLeaseTests/runParcelPriceTests/runLandLeaseSimTests). `yarn typecheck` toàn workspace PASS (7.01s); runtime chờ máy thật (`spawn EPERM`; subagent verify bằng node strip-types/CJS — assert PASS, KHÔNG qua suite chuẩn).
- LƯU Ý cần thống nhất khi nối thật: `TIER_FACTOR` hiện dùng 2 bộ số — game-data `LAND_LEASE_CONSTANTS` [1,1.1,1.25,1.45,1.7,2] (đúng D6) vs game-core sim local [1,1.2,1.4,1.6,1.8,2]. Chốt dùng game-data làm nguồn duy nhất khi nối core.
- CHỜ MÁY THẬT (chưa làm — ngoài phạm vi sandbox): 2.1 lệnh `lease_parcel`/`end_lease`/`pay_rent_debt` + mua khấu trừ; 2.2 thu tiền thuê đầu ngày (`processedRentDayIds`) + nợ/`closedForRent`; 3.1 schema 10 + migration 9→10 (đổi ownedParcelIds → ParcelTenure — refactor toàn hệ, cẩn thận không phá land-reclamation); 3.2 server replay + quyền/phiếu theo Bước 5; 3.3 UI quy hoạch (Thuê/Mua, giá + xu hướng, bản tin sáng, cảnh báo); 4.1 `yarn test`/`build`/browser QA.

## 1. Dữ liệu và luật

- [ ] 1.1 `ParcelTenure`, `LEASE_DAILY_RATE`, `LEASE_CREDIT_RATE`, `tierFactor`, `NEARBY_BONUS`, trần (provisional).
- [ ] 1.2 `parcelPrice(save, parcelId)` dùng chung client/server; test đơn điệu và trần.

## 2. Core

- [ ] 2.1 Lệnh `lease_parcel`, `end_lease`, `pay_rent_debt`; mua lô đang thuê có khấu trừ.
- [ ] 2.2 Thu tiền thuê đầu ngày (`processedRentDayIds`), nợ, `closedForRent` (dùng lại trạng thái đóng của thi công).
- [ ] 2.3 Mô phỏng tiến độ 60 ngày với giá động; chỉnh số provisional.

## 3. Save, server, giao diện

- [ ] 3.1 Schema 10 + migration 9→10; test.
- [ ] 3.2 Server phát lại các lệnh mới; quyền/phiếu theo Bước 5.
- [ ] 3.3 UI quy hoạch: nút Thuê/Mua, giá hiện tại + xu hướng; bản tin sáng có tiền thuê/nợ; cảnh báo trước khi đóng tòa.

## 4. Kiểm chứng và tài liệu

- [ ] 4.1 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); Browser QA theo tiêu chí proposal.
- [ ] 4.2 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
