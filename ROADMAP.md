# LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)

> Ghi chú: `pnpm-workspace.yaml` ở Giai đoạn 0 là lịch sử; dự án dùng Yarn 1 workspaces. Bản chuẩn theo dõi hiện trạng chi tiết (hệ thống S01–S46, vấn đề I-01…I-19, việc tiếp theo) là `THONG-KE.md`; khi lệch với file này, mã và `THONG-KE.md` là nguồn đúng.

## 4 yêu cầu: lời chê truyền miệng, sự kiện thành phố, giá gợi ý — LÕI THUẦN đã làm + verify; chain DEFER (07/10/2026)

- [>] **#1 Lời chê/bad reputation** (`game-core/word-of-mouth.ts`, CÓ sẵn + verify): rút vexation từ VIP bò qua → cửa sổ 1–2 ngày, hệ số 0.7–0.9 deterministic theo (seed,openDay); `wordOfMouthEffect` theo ngày. **Sửa 2 lỗi test ẩn**, Verify PASS. Nối luồng khách CHỜ MÁY THẬT.
- [>] **#2 Sự kiện thành phố** (`game-core/world-events.ts`, MỚI): `worldEventsForDay(seed,day)` deterministic → cùng output 2 phía (co-op); hội chợ W4 +50% khách 3 ngày + mất điện tủ lạnh hỏng nhanh 2×/buổi (chống dồn). Verify PASS.
- [>] **#3 Giá gợi ý** (`game-core/price-suggest.ts`, CÓ sẵn + verify): thuần, dựa lịch sử bán chung → 2 bên giống nhau không cần server. Verify PASS.
- [ ] **#4 Chain/cửa hàng thứ hai:** DEFER (cần hạ tầng server). Không code.
- **Verify:** `yarn typecheck` PASS; harness tsc→node: `runWordOfMouthTests`/`runPriceSuggestTests`/`runWorldEventsTests` PASS; eslint 0 lỗi. `yarn test` chuẩn vẫn `spawn EPERM` trong sandbox → chạy từ dist qua node. Các phần nối (khách/spoilage/UI/server) CHỜ MÁY THẬT + chốt không bấm đúp hiệu ứng với `market-events`. Chi tiết `tổng hợp.md` + `TASKS.md`.

## Xác minh thật các suite PURE thế giới mở — 26/26 PASS + sửa 4 lỗi nền (07/10/2026)

- [x] **Khép khoảng trống "test chưa chạy được"** của 6 change thế giới mở bằng harness không esbuild (tsc→`dist` + node strip-types + bộ nạp `@game/*`→dist): **26/26 suite pure thực thi THẬT và PASS**; `yarn typecheck` PASS; `git diff --check` sạch. **Sửa 4 lỗi nền thật** phát hiện khi chạy: (1) `validateSaveGameData` không trả `data` cho save v7/v8 → thêm nhánh migrate; (2) `DEFAULT_INITIAL_SAVE.schemaVersion` kẹt 8 (CURRENT=9) → dùng hằng số; (3) test `schema8` assert lỗi thời (===8/'supported') + thiếu placement; (4) test `schema9` `find()` sai gốc tọa độ. Hồi quy migration world-model/hostile-ids/chain/persistence → 5/5 PASS. Chi tiết: `tổng hợp.md` (khối đầu) + mục Xác minh trong `TASKS.md`. Giới hạn: harness từ dist (không phải runner chuẩn); `yarn test` + `test:coop` + build + Browser QA vẫn **CHỜ MÁY THẬT**; mọi phần server/UI/schema 10/renderer/minimap giữ nguyên như ghi ở từng bước dưới (Bước 4/5/6a/6b/6c/6d).


## Tính năng mới: "Yêu cầu đặc biệt của khách VIP" — phần lõi thuần (07/10/2026)

- [> ] **Phần lõi thuần của tính năng đề xuất #2 đã làm + verify** (chủ dự án chọn hướng): khách VIP nhờ tổ hợp món NGẮN theo phút game → thưởng/uy tín đúng hạn, phạt uy tín khi bỏ qua. `game-data/world/special-requests.ts` (catalog 4 template PROVISIONAL + validate + hằng ngưỡng) + `game-core/special-request.ts` (spawn deterministic, hết hạn, canFulfill, fulfill idempotent) + 2 suite test nối test-runner. Verify qua harness tsc→node: **2 suite mới PASS + hồi quy PASS**; `yarn typecheck` PASS. **Phần nối tính năng (CHỜ MÁY THẬT):** gọi spawn trong luồng khách (`customers.ts`/`simulation.ts`), trừ kho FEFO khi fulfill, lưu `SpecialRequestState` lên save (+shared type+migration), UI bong bóng/đồng hồ/HUD + thông báo, co-op chung yêu cầu, cân bằng tần suất/thưởng/phạt. Chi tiết: `tổng hợp.md` (khối đầu) + mục Tính năng mới trong `TASKS.md`. Không commit git.

## Đợt 14D — Real Mobile UI/UX Overhaul (Mobile-First) (10/10/2026)

- [ > ] **Đợt 14D**: đưa UI sang mobile-first thực thụ (không còn "desktop thu nhỏ") cho mọi P0/P1, dùng đúng 1 nguồn `data-density="compact"` + `--touch`/`data-input=touch` + container query (không framework/breakpoint mới, không đổi gameplay/save). Phần code + 5 audit static đã xong & verify (xem `TASKS.md`/`tổng hợp.md`, khối đầu). **BLOCKED (environment) — visual browser QA không làm được trong sandbox** (Chrome/Edge không khởi động được; `yarn dev`/`build` fail `spawn EPERM`; chỉ có `dist` cũ) → **toàn bộ P0/P1 = NOT MOBILE READY (chờ browser QA)**, không tuyên bố mobile-ready (§22). Việc còn mở: chủ dự án chạy `yarn --cwd apps/web dev`, QA mắt 852×393 + 568×320…932×430 trên máy thật rồi báo kết quả để chốt nghiệm thu. Không commit git.

## Đợt 11 — NPC AI, Traffic & City Simulation QA (06/10/2026)

- [x] **Đợt 11 QA** (audit 4 nhóm đọc-only: Pedestrian/NPC AI, Vehicle/Traffic, Collision/Nav, Rendering/Perf + xác minh chéo; củng cố foundation NPC/traffic, không triển khai thành phố mới). **Kết quả: 0 FAIL, 0 P0, 0 P1 → KHÔNG sửa production code** (đúng quy tắc diff tối thiểu; ghi P2/P3 thay vì cố tạo thay đổi). PASS toàn bộ: Pedestrian AI (spawn/waypoint/movement/destination/despawn/stuck/crossing/schedule+weather), Pedestrian Avoidance (thiết kế genre — không entity-vs-entity, mọi thực thể có timeout/fallback, không kẹt mãi), Pedestrian Crossing + Vehicle↔Pedestrian (vạch ngã tư, xe dừng trước vạch, xe nhường người chơi trên đường), Vehicle Traffic + Two-way + Traffic Light (functional — đỏ dừng trước vạch/xanh đi/vàng committed, hai hướng không cùng xanh) + Intersection (conflict zone, 0 clash), Spawn/Despawn lifecycle (pooling + active-set cleanup + destroy đầy đủ, không duplicate/leak), Shop↔City + Delivery↔Traffic (bến bốc dỡ riêng), Day/Night + Weather (mật độ theo giờ/thứ/mưa, không phá waypoint/lane), Camera/Rendering, Performance (1 ticker, LOD/culling, không off-screen render). Kiểm chứng: `yarn typecheck` 0 lỗi, `yarn test` fail 0 (2 lần), `apps/web test` PASS, `apps/web build` PASS, `git diff --check` PASS, eslint 0 lỗi. P2 ghi (không sửa, rủi ro golden-test): traffic-light chưa có chống spillback theo đèn (tắc tạm, không deadlock/collision). P3 ghi: NPC nền không guard va chạm runtime (đúng hình học hiện tại), vài allocation mỗi frame hot render path (bounded), flake timing `buildDemandTable` ngoài phạm vi. **NOT TESTED (environment):** device touch/multitouch thật, FPS/GPU thật, co-op 2 trình duyệt (NPC/traffic deterministic-per-seed — kiến trúc hợp lý chưa chạy thật), stress 80/20 bằng dev-hook. Chi tiết: `tổng hợp.md` (khối đầu). Không commit git.

## Đợt 10 — Gameplay Interaction & World Simulation QA (06/10/2026)

- [x] **Đợt 10 QA** (audit toàn diện gameplay interaction + world simulation; KHÔNG đổi kiến trúc/render/weather/responsive/multiplayer). Đã sửa **3 lỗi renderer** (diff nhỏ): (1) interaction bubble không kẹp theo viewport/HUD; (2) khách `stage==='checkout'` quay mặt sai với quầy tòa phụ (gán cứng `'left'`) → quay về tâm quầy tương ứng; (3) nhân viên châm kệ không hiển thị kiện khi bê (bug "Staff bê kiện hàng" — mất box hình ảnh). Kiểm chứng: `yarn typecheck` 0 lỗi, `yarn test` (game-core) fail 0, `apps/web test` PASS, `apps/web build` PASS, eslint 0 lỗi. Chi tiết PASS/FAIL/NOT TESTED: `tổng hợp.md` (khối đầu). Việc còn mở sau Đợt 10: nhìn bằng mắt trên thiết bị thật (chạm/multitouch/FPS/GPU) và co-op hai trình duyệt — KHÔNG quy thành PASS.

## Thế giới mở: tiệm nhỏ → thành phố — kế hoạch 05/10/2026

- Hướng dài hạn mới (chủ dự án chốt): co-op chung một thành phố, biên 120×80 ô, đường cố định theo đợt khai hoang; người chơi tự chọn hướng mở rộng và vị trí tòa. Chưa có code.
- [>] Bước 0+1 `open-world-land-grid`: mô hình thế giới/lô/tòa/nội thất, refactor không đổi gameplay (golden test). 05/10/2026: có code, golden + test + build PASS; còn QA trình duyệt và `test:coop`.
- [>] Bước 2 `open-world-main-expansion`: mở rộng tiệm chính theo ô, ngân sách theo cấp, chế độ quy hoạch. 05/10/2026: có code + test + build PASS; Xây thật hình T + lưu/nạp thử trên desktop. 06/10/2026: tab Mở rộng có chạm/kéo cho điện thoại, heatmap theo vị trí đặt tòa (hàm thuần có test); còn nhìn bằng mắt (đèn đêm, heatmap) và thiết bị chạm thật.
- [>] Bước 3 `open-world-building-relocation`: đặt/dời tòa phụ vào lô tự chọn. 06/10/2026: lát A+B+C có code + test + build + `test:coop` PASS (đặt/dời/thi công/lô trống, mở rộng theo ô, mảnh bắc → `floorTiles`, ngân sách chung, mở sang lô kề, tòa thi công không khách + nhân viên chờ ở kho); còn nhìn bằng mắt trong trình duyệt và mobile thật. Hạn chế: dời quán nước và mở rộng tòa không kho chờ Bước 4.
- [>] Bước 4 `open-world-land-reclamation`: khai hoang W1–W4, giá/khách theo mặt tiền, thành phố đông dần. Chi nhánh = tòa ở đợt xa (chốt 05/10/2026); `branch-chain` tạm dừng, viết lại sau bước này. **07/10/2026 (CÓ CODE + verify typecheck):** lớp dữ liệu đợt/lô (1.2) + **schema 7 & migration 6→7 (task 3.1 phần schema)** + **VÒNG 1 (4 teammate) hoàn nốt phần code sandbox được:** 1.1 hạ tầng W1–W4 (`wave-infrastructure.ts` PROVISIONAL), 2.1 vùng chơi (`playRegionForWaves` + `generateTileMapForWaves` mới), 2.3 khách theo hệ số vị trí (`buildingParcelTrafficMultiplier` + balance-sim so ví trí), 2.4 ngân sách (`waveExpansionBonus`/`expansionBudgetMax`, W0 bonus 0 → golden không đổi) — nối 5 test vào test-runner, typecheck PASS, diff sạch. Còn mở (chờ máy thật): nối `generateTileMapForWaves` vào simulation/renderer/pathfinding/collision, UI hạn mức ngân sách (4.x), lô W1–W4 vào `PARCEL_MAP`, vẽ hạ tầng (4.x), 1.3 neighborhood, 3.2 server replay reclaim/buy_parcel, 5.x verify + browser QA.
- [>] Bước 5 `open-world-coop-land`: giữ chỗ quy hoạch, quyền, phiếu chi lớn. Cần kiểm chứng nền co-op (Mongo, hai trình duyệt) trước. **07/10/2026 VÒNG 2 (PHẦN THUẦN, 1 teammate + 3 subagent):** schema 8 (`builtBy?` + `migrateToW8`), planning giữ chỗ (`planning-reservation.ts` TTL 60s + `reserved_by_other` kèm tên), quyền D2 (`land-permissions.ts`) + phiếu (`land-vote.ts` LARGE_SPEND_RATIO 0.3, TTL 45s), nhật ký thành phố (`city-journal.ts`) + ánh xạ lỗi→toast (`land-error-messages.ts`) — nối 5 test vào test-runner, typecheck PASS, board task-8/9/10/11 completed. Còn mở (chờ máy thật): socket `planning:reserve/release` + `land-vote`, snapshot + renderer bóng mờ, `world.settings.memberLandPermissions` receipt, UI bảng quyền / bảng Thành phố / toast, test:coop/gateway/worlds + hai trình duyệt.
- [>] Bước 6d `open-world-districts-city-goals`: khu vực (DistrictDef + hiệu ứng khu) + cấp/mục tiêu thành phố (CityGoalDef, claim_city_goal, cityTier theo cấp) + ký ức thành phố. **07/10/2026 VÒNG 6 (PHẦN THUẦN AN TOÀN, 3 subagent, xong — VÒNG CUỐI, ĐỦ 6 CHANGE THẾ GIỚI MỞ):** DistrictDef registry `game-data/world/districts.ts` (`districtForWave` W0..W4, `districtPreferredMultiplier` 1.2–1.4, `districtPeakMultiplier` khung giờ lấy max, `applyDistrictModifiers` cap 1.82); cụm theo khoảng cách D2b `game-core/proximity-cluster.ts` (radius 16, cap 1.3, bonus 0.10/cặp để W0 = legacy 1.10, `CLUSTER_COMPAT`, `clusterMultiplierFor` đơn điệu); CityGoalDef `game-data/world/city-goals.ts` (cấp 1–10, `CITY_LEVEL_WAVE_REQUIREMENT` W1:2..W4:8, `cityTierFromCityLevel` = min(5,floor(level/2)), `cityProgress`) + `game-core/city-goals-sim.ts` (`simulateGoalProgression` 60–90 ngày + ẩm thực khu cap). Đã nối 4 test vào test-runner + game-data index, typecheck PASS (9.33s). Còn mở (CHỜ MÁY THẬT — đụng data-file/lệnh/server/UI/schema): 1.1 gán `parcel.districtId` + `ModifierSource 'district'` + `when.districtId` trong modifiers.ts; 1.3 NPC nền + giao diện khu; 1.5 thay `foodClusterMultiplier` thật; 2.2 lệnh `claim_city_goal`/lên cấp/thưởng + `cityTier` theo cấp (bỏ công thức tự động) + điều kiện cấp cho `reclaim_wave`; 2.3 đồ công cộng + decor.ts; 3.1 biển kỷ niệm + nhật ký mốc; 3.2 minimap IndexedDB; 4.1 schema + migration (cityProgress, cấp suy từ cityTier cũ); 4.2 test/build/Browser QA/co-op; 4.3 docs.
- [>] Bước 6c `open-world-coop-contracts`: phân công người phụ trách tòa + hợp đồng cung ứng giữa tòa (D1 đã chốt phương án A — giữ một quỹ chung; thành tích theo tòa thay vì đổi quỹ). **07/10/2026 VÒNG 5 (PHẦN THUẦN AN TOÀN, 3 subagent, xong):** quyền manager `game-core/manager-permission.ts` (`managerDecision` theo D2 + `NonManagerActionSetting` allow/vote/deny + `canSelfAssignManager`), SupplyContract `game-core/supply-contract.ts` (lifecycle propose/accept/refuse/cancel + hết hạn 1 ngày + cap 50% tồn + internalTransferLedger), thực thi FEFO `game-core/supply-execution.ts` (`fefoSelect` + `dailySupplyExecution` tạo `InternalDelivery` + cap 50% + `applyInternalTransfer` không đổi quỹ). Đã nối 3 test vào test-runner, typecheck workspace PASS. Còn mở (CHỜ MÁY THẬT — đụng shared/server/UI toàn hệ): 1.1 gán `managerAccountId?` lên BuildingPlacement + `world.settings.nonManagerActions` + server gateway; 1.2 UI gán người phụ trách + nhãn biển tòa; 2.1 socket đề xuất/đồng ý/hủy + receipt; 2.2 nối `internal_delivery` thật (6a D6) + sổ `internal_transfer`; 3.1 bảng thành tích D4 (Thành phố + DaySummaryModal); 4.1 schema kế tiếp + migration; 4.2 test:coop/build/browser QA.
- [>] Bước 6b `open-world-land-lease`: thuê đất + giá đất động (ParcelTenure, tiền thuê, nợ/đóng tòa, khấu trừ khi mua), xử lý trước 6c/6d. **07/10/2026 VÒNG 4 (PHẦN THUẦN AN TOÀN, 3 subagent, xong):** dữ liệu thuê `game-data/world/land-lease.ts` (`ParcelTenure` + `LAND_LEASE_CONSTANTS`), `parcelPrice` dùng chung (D6 amplification clamp PRICE_CAP 2.5 + priceTrend), sim 60 ngày PROVISIONAL (`simulateLeaseRun` — giá cap, tổng tiền thuê, nợ/closedForRent không phá tòa, khấu trừ mua). Đã nối 3 test vào test-runner, typecheck workspace PASS. Còn mở (CHỜ MÁY THẬT — refactor toàn hệ không kiểm chứng được trong sandbox): 2.1 lệnh `lease_parcel`/`end_lease`/`pay_rent_debt` + mua khấu trừ, 2.2 thu tiền thuê đầu ngày + nợ/`closedForRent`, 3.1 schema 10 + migration 9→10 (đổi `ownedParcelIds`→`ParcelTenure` — phải cẩn thận không phá land-reclamation), 3.2 server replay + quyền/phiếu theo Bước 5, 3.3 UI quy hoạch + bản tin sáng + cảnh báo, 4.1 test/build/browser QA.
- [>] Bước 6a `open-world-building-types`: loại tòa theo dữ liệu, nhiều tòa cùng loại (chi nhánh), chi nhánh tạp hóa/cà phê/bãi giữ xe, sổ cái theo tòa, giao hàng nội bộ (thay phần còn dùng của `branch-chain`). **07/10/2026 VÒNG 3 (PHẦN THUẦN AN TOÀN, 4 subagent, đang làm):** registry `BuildingTypeDef` + 4 loại tòa mới (data), hạng cửa hàng theo diện tích D9 (`storeTierFromFloorTiles`, ngưỡng >126 chốt), schema 9 (`typeId?` optional + `migrateToW9`), balance-sim PROVISIONAL 4 loại. Còn mở (CHỜ MÁY THẬT — refactor toàn hệ không kiểm chứng được trong sandbox): 1.2 `BuildingId→string` + `buildingPlacements[].typeId` đụng ~20+ file + renderer, 2.1 `open_building` pipeline, 2.2 hình ảnh/renderer, D5 sổ cái + báo cáo theo tòa, D6 giao hàng nội bộ, D7 cốt truyện ch7, build/browser QA.
- [ ] Bước 6b `open-world-land-lease`: thuê đất theo ngày, mua có khấu trừ, giá đất động theo thành phố.
- [ ] Bước 6c `open-world-coop-contracts`: người phụ trách tòa, hợp đồng cung ứng nội bộ, thành tích theo người. Đã chốt giữ quỹ chung (05/10/2026).
- [ ] Bước 6d `open-world-districts-city-goals`: khu vực có bản sắc (qua `modifiers.ts`), cấp và mục tiêu thành phố, ký ức thành phố.

## Khu phố mở rộng quanh tiệm — 04/10/2026

- MVP môi trường sống quanh cửa hàng (bắc: nhà dân + trường xa; đông: chung cư + bãi xe; tây: công viên + vườn hoa; nam: nhà phố; nền: đồi núi) đã có code, test logic và kiểm bằng mắt trên Browser pane; zoom xa 0,5× giữ pixel nguyên. Bước tiếp đề xuất: xe chạy đường dọc, A* trên lưới vỉa hè, đồng bộ NPC nền ở co-op, nội thất trường/chung cư, đo FPS trên thiết bị thật.

## Tiếp nối tính năng an ninh — 01/10/2026

- OpenSpec `theft-and-security` đã có code/test/UI; lỗi hoàn giỏ trên khách thật khi đổi ngày đã được sửa và kiểm bằng test hồi quy. Typecheck, core tests, server build và web production build PASS. Để còn nghiệm thu: browser QA ở cấp 5+, cân bằng kinh tế và quyết định server replay `security_action` cùng các mục thiết kế trong tasks.

## Plan sau: chọn lọc gameplay từ game tham khảo — 01/10/2026

- OpenSpec `reference-gameplay-expansion` đang triển khai theo wave. Đã có code tiền giả, tín dụng khách quen và dine-in MVP (đồ ăn đóng gói, khách đi bàn, bàn bẩn, dọn bởi người chơi/nhân viên, server replay). Chưa chạy kiểm chứng; tham số kinh tế/thời lượng provisional. Recipe/production đã có code (bếp nướng/ấm nước, 3 công thức, test lõi PASS, chưa browser QA); prestige và công cụ quản lý (biểu đồ, heatmap, checklist, âm thanh, replay lõi) đã có code, test lõi PASS, chưa browser QA; biểu đồ, heatmap, checklist, âm thanh, replay và engine thuế còn chờ; test/build/playtest được gom về wave cuối theo yêu cầu.
- Tiệm xôi riêng trên cùng dải đất (OpenSpec `xoi-shop-same-land-strip`): 23/26 task xong ngày 02/10/2026, mua tiệm, bản đồ hai tòa nhà, khách/hàng đợi/bàn theo tòa, nhân viên đi giữa hai tòa, editor có tab tòa nhà. Còn mở: avatar đi bộ vào tiệm xôi, QA điện thoại/chạm, co-op hai client thật, (đã đo và chỉnh cân bằng: thêm 15% khách tự sinh cho tiệm xôi, ≈34 phần/ngày, hoàn vốn ≈17–33 ngày, provisional) một ngày bán thật trên trình duyệt. Chi nhánh khác (chợ, trường, khu công nghiệp) và luân chuyển nội bộ vẫn để plan sau; chờ thiết kế mở rộng trên cùng khu đất. Tách từng wave thành change riêng trước khi bắt đầu code.

## Đồng bộ 01/10/2026 (từ `THONG-KE.md`)

- **Hẻm sống động:** mặt cắt đường/cống/độ ướt đã commit (2f2af38). Đèn tín hiệu chu kỳ + người đi bộ + nhường đường: đã commit `24a2fab` + OpenSpec `traffic-light-crosswalk-yielding`, QA browser mới một phần (S46, F-03); khách thật qua đường và đồng bộ co-op là non-goal hiện tại.
- **Co-op:** I-01 đã mở rộng replay 36 loại lệnh (03/10/2026, chưa kiểm browser/2 client thật), I-16 đã có code migration (chưa chạy thật); còn I-15, I-05; sau đó mới tới bảng xếp hạng thật (F-05, phụ thuộc I-01).
- **Chất lượng:** CI, `test:all`, test `apps/web`, a11y (I-09, I-18, S32, S43).
- **Vận hành:** `docs/deploy.md`, quản lý khóa bí mật (I-17, I-14).
- **Ý tưởng sau:** F-01, F-06…F-11 trong `THONG-KE.md` mục 5 (F-02 customer reviews đã hoàn tất 02/10/2026).

## Kết quả rà soát co-op/perk — 01/10/2026

- Đã phát lại phía server các lệnh đơn tiệc, mục tiêu dài hạn/tuần, chọn perk và danh hiệu; client dùng cùng luồng commit và server trả save chuẩn hóa. Đã thêm xử lý receipt trước replay cho lệnh retry. Typecheck và core suite PASS; còn cần HTTP/DB hai client + reconnect QA.
- Đã nối 9 modifier perk vào các nhánh gameplay, thêm boa vào tiền/doanh thu/ledger và `completedDay` để tính đơn tiệc trong tuần. Kiểm tra hành vi boa checkout, sức chứa kệ, save/reload và suite core PASS; còn thiếu test riêng từng modifier cùng playtest cân bằng.
- `FestivalGoal` đã có tiến độ (theo doanh số sản phẩm trong khoảng ngày ngày hội), nhận thưởng một lần mỗi năm mùa, lưu trong save, lệnh co-op `claim_festival_goal` và UI trong `QuestModal` (test đơn vị PASS). Còn thiếu browser QA, test HTTP/DB hai client và cân bằng phần thưởng.
- FestivalGoal đã tính cả suất quầy ăn uống (`stallServings`, 3 mục tiêu quầy mới); độ trễ chốt quầy ngày cuối đã xử lý bằng ngày ân hạn nhận thưởng (+1 ngày).
- Perk: đã có test hành vi cho đủ 9 perk (`perks.test.ts`, PASS 01/10/2026); còn thiếu playtest cân bằng. Trần neat_shelves đã xử lý: +20% áp dụng sau trần kệ và UI/renderer/gợi ý nhập dùng cùng hàm.
- Co-op: đã có test controller + Mongo thật hai tài khoản cho 7 lệnh server-replay (`apps/server/src/coop-commands.test.ts`, PASS 01/10/2026) và sửa lỗi bố cục làm world mới từ chối lệnh đầu tiên; còn thiếu HTTP/Firebase guard thật và reconnect browser.
- Browser QA responsive chưa chạy được trong môi trường hiện tại: Vite/esbuild không đọc được thư mục cha, bind loopback bị từ chối, và browser policy chặn `file://`. Cần chạy ở môi trường cho phép dev server để kiểm tra desktop/tablet/mobile.

## Tiến độ triển khai OpenSpec `stardew-inspired-management-loop` — 01/10/2026 (Code & Tests PASS)

- **Đã hoàn thành và kiểm chứng tự động (Unit / Integration Tests PASS 100%)**:
  - Đợt B (Con người & Biến thiên): 6 khách quen hẻm (`regulars.ts`, trần +2/ngày, overhead tag, modal), Bản tin sáng `MorningBrief`, Gợi ý nhập hàng theo mùa & kẹp trần tươi sống (`suggestions.ts`), Đơn tiệc FEFO (`partyOrders.ts`, `party-orders.ts`), Mục tiêu ngày hội (`seasons.ts`).
  - Đợt C (Mục tiêu dài hạn & Kỹ năng): 10 mục tiêu dài hạn & 3 nhiệm vụ tuần (`goals.ts`), Sổ mục tiêu trong `QuestModal`, 3 cây kỹ năng & 9 đặc quyền (`skills.ts`, `SkillsModal`, nút Kỹ năng HUD).
  - Đợt D (Hoàn thiện & Nội dung): Milestone Titles (`titles.ts`, `TitlesModal`, hiển thị trên HUD), Cẩm nang cách chơi (`LoginScreen.tsx` tab tính năng nâng cao), 4 sản phẩm lễ hội thuần Việt (Bánh chưng xanh, Liễn câu đối đỏ, Dưa hấu Tài Lộc, Bánh Trung Thu), Nhân viên bảo vệ trông xe (`security` role, tăng kiên nhẫn và rating cho khách đi xe máy), Người bán quầy phụ vỉa hè (`buildStalls`).
  - Đợt E (Hẻm sống động): Giao thông hẻm `StreetTrafficManager`, khách đến bằng xe máy/ô tô/đi bộ, đỗ xe lề đường `STREET_PARKING_SPOTS`, texture pixel art xe máy/taxi không va chạm.
- **Xác minh kỹ thuật**: `yarn typecheck` PASS (0 errors), `yarn test` PASS (100% test suites), `yarn build` PASS (server + web dist).
- **Các gate kiểm thử còn mở**: Browser QA trên thiết bị thật, playtest cân bằng kinh tế dài ngày, OAuth thật và 2-browser co-op replay, TAX-0 thẩm định pháp lý.

## KẾ HOẠCH CHỌN LỌC GAME THAM KHẢO — 30/09/2026

OpenSpec `adapt-reference-shop-operations`:
- Nhóm 1 (Bảo vệ save và chuẩn hóa chuyển hàng): [X] Đã hoàn thành (tách lỗi DB/recovery, runtime save validation schema 2, backup snapshot tuần tự, transferToShelf/transferFromShelf với actualQuantity/reason, fix handleAutoRestock theo shelfCapacity, 2-actor concurrent transfer test).
- Nhóm 2 (Giỏ khách và thu ngân hợp lệ): [X] Đã hoàn thành (CustomerManager đa khách, giỏ hàng basket, hàng đợi cashier, loại bỏ bán ảo, replay checkout idempotent, bảo toàn phương trình kho+kệ+giỏ+bán+hỏng khi bỏ về/hết hạn, migration save schema 2, CashierModal giỏ/bill, Pixi renderer đa khách).
- Nhóm 3 (Catalog 20 món chọn lọc từ nguồn 335 dòng): [X] Đã hoàn thành (snapshot catalog-source.csv 335 món, catalog-manifest.ts phân loại 335 dòng, CURATED_PRODUCTS bổ sung 20 món nâng tổng catalog lên 56 món giữ nguyên 36 món legacy, dynamic procedural pixel art silhouettes trong pixel-art.ts & premium-textures.ts, tìm kiếm/lọc danh mục trong SupplierModal và WarehouseModal).
- Nhóm 4 (Mối nhập và hàng chờ): [X] Đã hoàn thành (3 nhà cung cấp dai_ly_dau_hem, cho_dau_moi, giao_hoa_toc; atomic cart validation/commit; hàng chờ holdingArea và cơ chế cất stow bảo tồn hạn; migrate pendingOrders; WarehouseDock/Modal UI; typecheck/test/build PASS).
- Nhóm 5 (Sơ đồ bày kệ - Planogram): [X] Đã hoàn thành (lưu/áp dụng sơ đồ theo fixture ID, không đổi món đang có hàng, châm hàng FEFO từ kho, tính đúng hao giảm kho, API restock job targets cho nhân viên, tích hợp UI ShelfModal và auto-restock).
- Nhóm 6 (Giá vốn và báo cáo ngày): [X] Đã hoàn thành (unitCost/provenance vào từng lô hàng bảo toàn qua delivery/stock/basket/holding, FEFO tính đúng COGS theo lô bán ra, GAAP ledger mua/bán/hỏng không trừ trùng tiền mua hàng vào lợi nhuận, DailyRecord ngày chốt idempotent có closedAt timestamp, tách riêng số khách/giao dịch/món bán, tab báo cáo ngày trong CashierModal, ledger.test.ts 18 suites test PASS, typecheck/build PASS).
- Nhóm 7 (Gợi ý nhập): [X] Đã triển khai (lịch sử bán 3/7 ngày & fallback, tồn dùng được/đơn đang về/hạn, cắt theo ngân sách/sức chứa/mối/đơn tối thiểu, gợi ý sửa/xác nhận trong SupplierModal; browser smoke cần lưu bằng chứng).
- Nhóm 8–10 (nhân viên và tự nhập): code chức năng 8.1–8.4, 9.1–9.4 và 10.1–10.3 đã triển khai; batch `yarn typecheck`, `yarn test` (có operations regression) và `yarn build` PASS. Browser acceptance 8.4/9.4 và toàn bộ Nhóm 11 còn mở. Nhân viên MVP dùng layout hiện tại; world/auth/realtime theo change `shared-alley-multiplayer`.
- Chi tiết: `openspec/changes/adapt-reference-shop-operations/research.md`, `design.md`, `tasks.md`.

## 📌 GIAI ĐOẠN HIỆN TẠI: PHASE 3 (KHÁCH HÀNG NPC & TÍNH TIỀN)

## OpenSpec `store-layout-expansion` — kiểm chứng 30/09/2026
`yarn test`, `yarn typecheck`, `yarn build` PASS sau khi sửa validator cửa theo `MAP_ORIGIN_Y`/map constants và đồng bộ validator schema v3 trong shared. `test:gateway` hai socket PASS nhưng không phát layout command; `test:worlds` không qua vì Mongo standalone thiếu transaction. Browser trên save thử nghiệm riêng xác nhận move/rotate/store/retrieve, chặn ô khóa, cancel, apply và persistence sau reload. Focus trap/Escape mới thêm chưa được browser kiểm chứng; customer/staff routing và mobile landscape còn mở. Hai-session layout, race, rollback/reconnect và playtest giá còn mở. Bundle cảnh báo >500 kB và dynamic/static import `api.ts`; chi tiết theo OpenSpec tasks.

## Ưu tiên mới: con hẻm chơi chung — 30/09/2026
Ngày 30/09/2026 tiếp tục task 3.4/4.2: gateway xếp hàng checkpoint theo thứ tự, chỉ evict runtime idle sau flush thành công, giữ lại runtime nếu ghi lỗi, và đóng socket heartbeat-timeout. Client chặn mutation lúc offline, không ghi/reset online save vào Dexie, rollback nếu commit lỗi/từ chối; store status, stow và planogram gửi snapshot qua commit HTTP. `yarn --cwd apps/server test:gateway` PASS trên Mongo local; core tests và server typecheck PASS. Monorepo typecheck đã PASS trước khi code task nhân viên 9.2 được cập nhật, lần chạy mới nhất FAIL vì `GameSimulation.updateStaffWorkers` chưa tồn tại. Chưa chạy build/browser reconnect QA.
Màn đăng nhập đã có nút “Đăng xuất” riêng cạnh tài khoản đã đăng nhập; trạng thái chưa đăng nhập hiện nút “Đăng nhập Google”. Task 4.1 vẫn mở tới khi OAuth thật và luồng UI hai tài khoản được kiểm tra.
Trạng thái cập nhật 30/09/2026: `yarn typecheck`, `yarn test`, `yarn build` PASS; browser smoke local PASS. Gateway/world integration PASS (từ 30/09/2026 chạy trên Mongo standalone, không còn dùng transaction/replica set). WS giờ nhận movement/time-vote, ticket one-use, replacement; integration hai socket PASS. Còn mở full browser flow hai tài khoản, crash/restart thật, network failure/RTT, OAuth thật, mobile QA và cấu hình replica set bền. Chi tiết OpenSpec tasks.

Trạng thái triển khai 30/09/2026: HTTP/Mongo world API và core runtime có code; gateway WS đã có ticket dùng một lần (TTL 30s), origin allowlist theo `WEB_ORIGIN`, heartbeat 10s/timeout 15s, checkpoint 5s và snapshot 500ms. Đã khắc phục lỗi typecheck server (ActivityRecord revision, WebSocketTicketDoc và Cast findOneAndDelete), monorepo `yarn typecheck`, `yarn test` (18 test suites PASS), và `yarn build` PASS sạch sẽ. Chưa nối authoritative movement/time vote thành command realtime; gateway chưa restore runtime sau process restart, checkpoint async chưa serialize với command, transaction cross-collection chưa có chứng cứ, và chưa nghiệm thu hai browser. Xem OpenSpec `shared-alley-multiplayer/tasks.md`, không archive hoặc tuyên bố multiplayer đạt.

Tasks 2.3/2.4 hoàn thành: receipt checkout bền trong core save và command coordinator ngăn duplicate/revision races trong process; typecheck/test/build PASS. Chưa test race nhiều socket/DB restart. Tiếp server auth/session (3.1–3.2); task 3.3 cần MongoDB replica set, database hiện tại chưa hỗ trợ transaction.

UI đăng nhập đầu game đã được thêm: đăng nhập Google hoặc chơi khách, kèm nhận diện tài khoản đã đăng nhập; save local vẫn giữ nguyên khi login/logout. Đây chỉ là entry screen, chưa tải cloud save hoặc chọn/join world; OpenSpec task 4.1 còn mở.

Backend cũ có Nest HTTP routes, Firebase guard, world ACL và Mongo repository tests. Gateway đã có integration test hai socket (`test:gateway`); transaction đã bỏ.

Task 2.3 đã thêm receipt checkout bền trong save và giữ sản phẩm khách đang mua; unit regression, typecheck/build PASS. Race đa client nay được chặn bằng `updateOne` nguyên tử theo revision ở server (`test:worlds`, `test:coop` PASS).

Task 2.2 hoàn thành: authoritative avatar input có sequence/time cap/collision/range checks; typecheck/test/build PASS. Controller chưa có socket transport. Tiếp task 2.3 checkout hàng giữ chỗ. Task 1.1 Mongo transaction còn chặn persistence nhiều collection.

Task 2.1 hoàn thành: renderer chuyển sang core fixed-step runner và simulation dùng input interface; headless test, regression, typecheck/build PASS. Tiếp task 2.2 avatar/input intent. Task 1.1 đang mở do database hiện tại là standalone.

Tasks 1.2/1.3 đã có hợp đồng dữ liệu/version validator và seed online tách local save; typecheck/test PASS. Tiếp theo task 2.1 tách vòng tick/browser input, trong khi task 1.1 transaction DB vẫn chờ replica set.

Kiểm tra mới: Firebase web/Admin build đạt, thiếu/sai token trả 401; OAuth thật chưa nghiệm thu. MongoDB kết nối được nhưng standalone, chưa hỗ trợ transaction (code 20); (lỗi thời: task 1.1 đã đóng sau khi bỏ yêu cầu transaction/replica set).

Firebase hem-buon đã được cấu hình web/Admin và có code login popup/logout, backend verify token; chưa nghiệm thu OAuth thật, chưa nối lưu MongoDB/world ACL. Đây là phần nền task 3.1/4.1, không đánh dấu hoàn thành toàn task hoặc Phase 7.

Apply đã bắt đầu task 1.1: HTTP NestJS và nền MongoDB/.env có code, HTTP health/typecheck đã kiểm chứng; (lỗi thời: URI đã có, task 1.1 đã đóng). Google login, cloud save và realtime chưa triển khai. Không yêu cầu Docker theo chỉ đạo mới; chưa hoàn thành task 1.1 hoặc Phase 7.

Đã tạo kế hoạch `openspec/changes/shared-alley-multiplayer` (proposal/design/specs/tasks), chưa triển khai online. Không còn để toàn bộ multiplayer tới cuối Phase 10: đưa nền world/cơ sở, headless core và backend/auth/persistence lên trước building/nhân viên. Phase 3 về checkout/save vẫn là phụ thuộc; không đánh dấu hoàn thành giai đoạn vì có kế hoạch.

1. Schema tài khoản/world/cơ sở và adapter local; giao dịch gắn khách, chống xử lý trùng.
2. Server authoritative, login/membership/mã mời, lưu bền và pause/resume.
3. Bản hai người chung một tiệm/quỹ/kho, chơi lệch giờ, reconnect và bảo toàn save riêng.
4. Nghiệm thu hai client, network loss, DB failure và restart trước phát hành.
5. Sau đó phát triển nhiều cơ sở trong cùng hẻm, sở hữu riêng/chung và nhân viên. Chuyển/gộp tiệm từ world khác cần change riêng.

Phase 7 giữ định hướng Firebase/NestJS/MongoDB, triển khai phần cần cho co-op trong change mới. PWA và các phase nội dung chưa được nghiệm thu hay tự triển khai theo thay đổi ưu tiên này.

---

### [X] GIAI ĐOẠN 0: KHỞI TẠO NỀN TẢNG (REPOSITORY FOUNDATION)
- [x] Thiết lập cấu trúc Monorepo (`pnpm-workspace.yaml`).
- [x] Cấu hình TypeScript cho toàn bộ packages và apps.
- [x] Thiết lập tài liệu thiết kế (GAME_DESIGN, ARCHITECTURE, ROADMAP, DATABASE_SCHEMA, TASKS).
- [x] Khởi tạo dự án Web (Vite + React + Tailwind CSS + PixiJS v8).
- [x] Cấu hình cơ sở dữ liệu lưu trữ cục bộ Dexie (IndexedDB) với schema versioning.

---

### [>] GIAI ĐOẠN 1: BẢN ĐỒ & NHÂN VẬT CHƠI ĐƯỢC (PLAYABLE MAP & CHARACTER)
- [x] Xây dựng Renderer PixiJS v8 pixel-perfect (Nearest-neighbor filtering, 32x32 tiles, integer scaling).
- [x] Tạo bản đồ tiệm tạp hóa Việt Nam thập niên 90s (Cửa hàng 8x8 + vỉa hè + đường hẻm).
- [x] Điều khiển nhân vật mượt mà 4 hướng (WASD / Mũi tên trên Desktop, Virtual Joystick trên Mobile).
- [x] Hệ thống Camera Pixel bám theo nhân vật kèm giới hạn biên bản đồ.
- [x] Hệ thống va chạm (Collision) cho tường, quầy, kệ và chướng ngại vật.
- [x] Bố trí 2 kệ hàng gỗ tương tác và 1 bàn thu ngân cổ điển.
- [x] Định nghĩa danh mục 5 sản phẩm Việt Nam khởi đầu (Mì Hảo Hảo, Xá xị Chương Dương, Kẹo Big Babol, Sữa Ông Thọ, Bánh mì que).
- [x] Giao diện túi đồ / kho hàng (Inventory UI) hiển thị sức chứa, số lượng và thông tin chi tiết.
- [x] Hệ thống đồng hồ thời gian trong game (Game Clock) và chu kỳ ngày.
- [x] Chức năng Lưu / Tải game cục bộ qua IndexedDB (Dexie) kèm thông báo Autosave.
- [x] Hỗ trợ Responsive đa nền tảng (Desktop & Mobile) (06/10/2026: Landscape-first, portrait chỉ hiện RotateOverlay hướng dẫn xoay; xem `tổng hợp.md`; QA máy thật vẫn NOT TESTED; Đợt 5–9: UI density, HUD priority, modal density, top UI hợp nhất, QA hiệu năng emulator, giữ Cấp/số khách + sửa đa chạm xong; FPS/DPR thật NOT TESTED).

---

### [X] GIAI ĐOẠN 2: HỆ THỐNG SẢN PHẨM & KHO HÀNG NÂNG CAO (PRODUCT & INVENTORY)
- [x] Mở rộng danh mục lên 30+ sản phẩm đặc trưng Việt Nam theo 10 phân loại.
- [x] Đặt hàng nhà phân phối, trừ tiền và giao hàng vào kho sáng hôm sau; đơn chờ được lưu/tải.
- [x] Cơ chế hạn sử dụng theo lô và bảo quản tủ mát, gồm sức chứa kho lạnh và giới hạn loại kệ.

---

### [ ] GIAI ĐOẠN 3: KHÁCH HÀNG NPC & TÍNH TIỀN (CUSTOMER NPC & CHECKOUT)
- [x] Thuật toán tìm đường A* (A-Star Pathfinding) dùng cùng vùng va chạm với người chơi.
- [x] Máy trạng thái khách hàng đa khách: vào -> kệ -> giỏ -> hàng đợi quầy -> thanh toán -> rời tiệm; thu ngân người chơi/nhân viên; NPC chủ tiệm đứng sau quầy (ô 8,7, chặn đường đi), khách dừng ở đầu hàng (9,8) quay mặt vào quầy, chủ tiệm hiện bong bóng "Tính tiền" tới khi thanh toán xong (test core PASS, browser chỉ xác nhận chủ tiệm hiển thị; browser acceptance còn mở theo OpenSpec adapt-reference-shop-operations).
- [ ] Cơ chế kiên nhẫn: đã có giới hạn chờ và trừ uy tín khi bỏ về; cần cân bằng độ hài lòng và hiển thị phản hồi.
- [x] Bán hàng thủ công tại quầy từ tồn kệ; cập nhật tiền, XP và doanh thu.

---

### [ ] GIAI ĐOẠN 4: KINH TẾ, NHIỆM VỤ & LÊN CẤP (ECONOMY & QUESTS)
- [x] Báo cáo tài chính cuối ngày (Doanh thu, tiền vốn theo lô thực bán, chi phí mua hàng/lương/hàng hỏng, lãi gộp & lãi ròng GAAP) và gợi ý nhập hàng thông minh (vận tốc bán 3–7 ngày, cắt giảm giỏ theo ngân sách/kho lạnh/mối sỉ).
- [x] Nhiệm vụ hàng ngày (3/ngày, scale theo cấp) và chuỗi cốt truyện 7 bước; nhận thưởng một lần, lưu trong save (`quests`), đồng bộ co-op qua lệnh `claim_quest` (core/runtime test PASS; UI `QuestModal` chưa QA browser, chưa có nhiệm vụ gắn sản phẩm/sự kiện).
- [>] Mốc cấp: có bảng XP/cap 35, save normalization, modal HUD cấp 2–35, toast và milestone nhân viên/traffic/NPC; chưa chạy kiểm tra hoặc playtest trong lượt code này. Chi tiết `openspec/changes/level-progression-roadmap`.

---

### [ ] GIAI ĐOẠN 5: MỞ RỘNG MẶT BẰNG & XÂY DỰNG (LAND EXPANSION & BUILDING)
- [>] Có code trong OpenSpec `store-layout-expansion`: chế độ sắp xếp trên mặt bằng, kéo/thả/xoay/cất/lấy nội thất, hai plot phía đông, migration save schema 3 và batch command multiplayer authoritative.
- [ ] Chạy gom kiểm chứng 7.1–7.6 (unit/economy/typecheck/build/browser/two-session QA); chưa có kết quả sau implementation.
- [ ] Cân bằng giá/level/diện tích plot bằng playtest; hiện 250.000/600.000 VND, level 5/10 là cấu hình đề xuất.
- [ ] Kho vật lý vẫn là phòng sau tiệm hiện hữu; plot kho chuyên dụng và xây thêm kho chưa được triển khai.

---

### [>] GIAI ĐOẠN 6: TỰ ĐỘNG HÓA & THUÊ NHÂN VIÊN (EMPLOYEE AUTOMATION)
- [>] Thu ngân và người xếp hàng lên kệ: đã có code (staff.ts, StaffModal, ca làm, lương, refill job) và test core PASS; chưa đồng bộ co-op, browser acceptance còn mở. Bảo vệ dắt xe chưa làm.

---

### [>] GIAI ĐOẠN 7: XÁC THỰC FIREBASE & CLOUD SAVE MONGODB
- [>] Đăng nhập Google qua Firebase: có code + token guard server (401 test PASS); OAuth thật chưa chạy.
- [>] NestJS REST + MongoDB (1 node, không transaction): world/invite/command/checkpoint test PASS trên Mongo standalone; chưa test trên Atlas.

---

### [>] GIAI ĐOẠN 8: TỐI ƯU HÓA MOBILE & PWA
- [x] **PWA:** manifest, icon, meta iOS, service worker cache shell/asset (`apps/web/public`), đăng ký khi production; `yarn build` PASS. Còn I-08: `VERSION` cố định `v1`, đường dẫn `/sw.js` tuyệt đối. Chưa kiểm chứng cài đặt/offline trên trình duyệt hoặc iOS/Android thật.
- [x] **Hiệu năng (03/10/2026):** 
  - ✅ **Frustum Culling:** Chỉ render entity trong vùng nhìn thấy camera (`viewport.ts`).
  - ✅ **Object Pooling:** Tái sử dụng floating texts (+tiền, +XP) thay vì tạo/xóa mới.
  - ✅ **Rain Optimization:** Giảm tải vẽ hạt mưa khi cường độ thấp.
- [x] **Responsive Design (03/10/2026):**
  - ✅ **Camera Zoom:** Tự động 1.25x (mobile dọc), 1.5x (ngang), 2x-3x (desktop) (`camera.ts`).
  - ✅ **Resolution:** Giảm resolution xuống 1x trên mobile để tăng FPS (`viewport.ts`).
  - ✅ **UI/UX:** CSS media queries cho HUD/Modal trên màn hình nhỏ.

---

### [>] GIAI ĐOẠN 9: SỰ KIỆN MÙA VIỆT NAM (SEASONAL EVENTS)
- [>] Tết, Trung Thu, Tựu trường, Mùa mưa: chu kỳ 120 ngày (`game-data/seasons.ts`), đổi tốc độ khách và nhóm hàng khách ưu tiên, nhân sản lượng quầy; biểu ngữ HUD + toast khi sự kiện bắt đầu; test core PASS. Chưa có sản phẩm/art riêng (bánh chưng, câu đối, dưa hấu, bánh trung thu), chưa trang trí cửa hàng, chưa cân bằng bằng playtest.

---

### [>] OpenSpec `seasonal-daylight-tree-shadows` — 02/10/2026 (Code + Tests PASS)
- [x] **Nhóm 1** (Mốc mọc/lặn theo mùa): bảng 12 mốc nội suy tuần hoàn trên năm 120 ngày (`lighting-phase.ts`), test xác định/không cày/lặp theo năm/độ dài ngày 11–13h.
- [x] **Nhóm 2** (Vị trí mặt trời): `getSolarPosition` (vĩ độ 10,8°), azimuth/elevation/shadowDir, test đỉnh 12:00/mọc-lặn ≈ 0/đông-tây ngả đúng/nối 24h.
- [x] **Nhóm 3** (Cây là dữ liệu bản đồ): `TREE_PROPS`/`TREE_SPRITE_OFFSET` trong `game-data/map.ts`, sprite và va chạm không trùng cửa/đỗ/đèn.
- [x] **Nhóm 4** (Bóng cây động): `computeTreeShadow` thuần, cache theo ngưỡng 1°+mưa, elip theo độ cao mặt trời (dài 3,5 ô max), mờ nắng/mưa, chỉ vẽ lại khi góc đổi. Đo hiệu năng desktop: không đáng kể (~±3% nhiễu CPU luồng chính).
- [x] **Nhóm 5.1** (typecheck/test/build): PASS (7/7 suite, 0 fail).
- [ ] **5.2** Browser QA mobile: bóng đổi hướng/mùa/đêm/mưa trên thiết bị thật; mới kiểm một phần desktop.
- [ ] **5.3** Sync tài liệu — ĐÃ CẬP NHẬT (02/10/2026).

---

### [>] GIAI ĐOẠN 10: QUẦY ĂN UỐNG & ĐỊNH HƯỚNG MULTIPLAYER
- [>] Quầy cà phê vợt và bánh mì nướng muối ớt: mở bằng tiền/cấp (`StallModal`), doanh thu tính mỗi ngày theo mùa/uy tín, ghi sổ có giá vốn, lưu/tải, co-op qua lệnh `buy_stall` (test core + runtime PASS). Quầy hiện trên vỉa hè bên phải cửa tiệm (sprite pixel, chặn đường đi) và tiêu nguyên liệu từ nhà kho theo lô FEFO (cà phê: sữa đặc + đường; bánh mì: bánh mì gối + dầu ăn; thiếu hàng thì bán ít suất hơn, báo thiếu trong modal). Còn thiếu: nhân vật phục vụ/khách đứng mua tại quầy (doanh thu vẫn tính gộp theo ngày), cà phê bột/muối ớt chưa có trong catalog nên tính bằng tiền mặt; sprite chưa QA bằng mắt trong browser.

## GIAO DIỆN PIXEL VIỆT — 02/10/2026 (ARCHIVED)
- [x] Đã archive `premium-vietnamese-pixel-ui` vào `openspec/changes/archive/` (02/10/2026).
- [x] Nhà kho vật lý liền phía trên tiệm: phòng đi vào được, giá khô/góc lạnh/khu nhận, WarehouseModal và migration save cũ. Unit/browser tests, năm viewport và joystick đã pass; xem docs/ui/WAREHOUSE.md.
- [x] Triển khai palette Nắng Hẻm, component pixel, HUD/kho/modal, original procedural art và integer camera.
- [x] Smoke giao dịch/lưu lại, lỗi revision, responsive năm viewport và kiểm tra build/test.

## HỆ THỐNG THUẾ — ĐỢT ĐẦU 01/10/2026
- [>] TAX-0: Có hồ sơ nguồn, ma trận và danh sách chưa xác minh tại docs/tax; thẩm định toàn bộ pháp luật chưa hoàn tất.
- [x] Module nền TaxRuleRegistry: phiên bản bất biến, chọn theo ngày/chủ thể/hoạt động, khóa UNVERIFIED, snapshot JSON và kiểm thử.
- [x] Báo cáo doanh thu năm so với ngưỡng tham khảo (`tax/annual-revenue.ts`, chỉ theo dõi, không trừ tiền; có code, chưa có test riêng, chưa xác minh trên browser).
- [x] Màn Thuế & sổ kinh doanh mở từ HUD: doanh thu năm game, trạng thái chưa có hồ sơ thuế, nguồn nghiên cứu và giải thích rõ chưa đủ căn cứ; không tính hoặc trừ tiền.
- [ ] TAX-1: Hồ sơ chủ thể và đăng ký/chuyển đổi độc lập cấp độ.
- [ ] TAX-2–4: Hoàn tất thẩm định, engine xác định, VAT/PIT hộ và CIT có điều kiện.
- [ ] TAX-5–8: Kế toán, hóa đơn, UI/nhiệm vụ, backend cố vấn, MongoDB và kiểm thử tích hợp.
- Quy tắc nghiên cứu 1 tỷ chưa hoạt động; chưa thu thuế hoặc đổi save của người chơi.
