# BẢNG THEO DÕI CÔNG VIỆC (TASKS PROGRESS)

## OpenSpec `store-layout-expansion` — 30/09/2026 (kiểm chứng)

- Chức năng tasks 1.1–6.4 đã được code: audit/định nghĩa hai plot phía đông (giá/level tạm), layout core + validator đường đi, editor local/touch, save schema 3/migration backup, cập nhật map/collision/routing/renderer và batch command server-authoritative.
- Đã chạy `yarn test`: PASS, gồm `store-layout.test.ts` mới cho rotation, biên, overlap, cashier bất động, stow/retrieve giữ fixture ID/tồn/lô, điều kiện mua đất, duplicate idempotency, batch nguyên tử và plot mở khóa.
- Đã chạy `yarn typecheck`: PASS toàn monorepo; `yarn build`: PASS server + web (840 modules). Còn cảnh báo bundle web >500 kB và dynamic/static import `api.ts`.
- Đã chạy `yarn --cwd apps/server test:gateway`: PASS (2 socket/session; chưa bao gồm layout batch). `test:worlds` không đạt được do MongoDB hiện tại standalone, không hỗ trợ transaction.
- Browser local đã mở được save hiện có, đóng tiệm và mở editor; xác nhận grid, fixtures, plot gate theo level/tiền. QA move/rotate/apply/reload chưa hoàn tất vì browser automation mất kết nối. Chưa chạy viewport mobile landscape.
- Chưa xác minh race revision/idempotency cho layout qua DB, broadcast layout hai client, disconnect rollback/reconnect, hoặc cân bằng giá/level bằng playtest. Giữ các mục tương ứng mở; không ghi nhận PASS toàn bộ.
- Tham chiếu: `openspec/changes/store-layout-expansion/tasks.md`; giá đất 250.000/600.000 VND và level 5/10 vẫn là đề xuất chưa playtest.

## ĐỀ XUẤT THAM KHẢO GAME — 30/09/2026

- OpenSpec `adapt-reference-shop-operations`:
  - [x] Nhóm 1: A — Bảo vệ save và chuẩn hóa chuyển hàng (tasks 1.1 - 1.5 đã xong: tách lỗi DB/recovery, runtime save validation schema 2, backup snapshot tuần tự, transferToShelf/transferFromShelf với actualQuantity/reason, fix handleAutoRestock theo shelfCapacity, 2-actor concurrent transfer test).
  - [x] Nhóm 2: A — Giỏ khách và thu ngân hợp lệ (tasks 2.1 - 2.5 đã xong: CustomerManager đa khách, giỏ hàng basket, hàng đợi cashier (9, 8..10), loại bỏ bán ảo - chỉ bán khi có khách ở quầy, replay checkout idempotent qua receipt ID, bảo toàn phương trình kho+kệ+giỏ+bán+hỏng khi khách bỏ về/hết hạn, migration save schema 2, CashierModal hiển thị giỏ/bill/hàng đợi, Pixi renderer vẽ đa khách).
  - [x] Nhóm 3: B — Catalog chọn lọc (tasks 3.1 - 3.4 đã xong: snapshot 335 món catalog-source.csv, catalog-manifest.ts đối chiếu chi tiết 335 dòng, CURATED_PRODUCTS thêm 20 món đạt tổng 56 món bảo toàn 36 món legacy, procedural pixel art silhouettes trong pixel-art.ts & premium-textures.ts, search & category filter trong SupplierModal và WarehouseModal).
  - [x] Nhóm 4: B — Mối nhập và hàng chờ (tasks 4.1 - 4.5 đã xong: 3 nhà cung cấp SUPPLIERS dai_ly_dau_hem, cho_dau_moi, giao_hoa_toc; atomic cart validation & commit; hàng chờ holdingArea và cơ chế cất stow; migrate pendingOrders; WarehouseDock/Modal UI; typecheck/test/build PASS).
  - [x] Nhóm 5: B — Sơ đồ bày kệ (tasks 5.1 - 5.3 đã xong: planogram mapping fixtureId -> productId, lưu/tải bản lưu, bảo vệ kệ đang chứa món khác không bị đổi hàng, kệ trống gán món từ sơ đồ, châm hàng FEFO từ kho, tính đúng hao giảm kho = tổng actualQuantity, API restock job targets cho nhân viên sau này, tích hợp ShelfModal và tự động châm kệ, typecheck/test/build PASS).
  - [x] Nhóm 6: C — Giá vốn và báo cáo ngày (tasks 6.1 - 6.4 đã xong: unitCost/provenance vào từng lô hàng bảo toàn qua delivery/stock/basket/holding, FEFO tính đúng COGS theo lô bán ra, GAAP ledger mua/bán/hỏng không trừ trùng tiền mua hàng vào lợi nhuận, DailyRecord ngày chốt idempotent có closedAt timestamp, tách riêng số khách/giao dịch/món bán, tab báo cáo ngày trong CashierModal, ledger.test.ts 18 suites test PASS, typecheck/build PASS).
  - [x] Nhóm 7: C — Gợi ý nhập (tasks 7.1 - 7.3 đã triển khai: lịch sử 3/7 ngày & fallback, tồn dùng được/đơn đang về/hạn, cắt theo ngân sách/kho lạnh/mối/đơn tối thiểu, giỏ sửa được trong SupplierModal; core tests/typecheck/build có bằng chứng lịch sử, browser smoke chưa có chứng cứ mới được lưu).
  - [>] Nhóm 8–10: code chức năng 8.1–8.4, 9.1–9.4 và 10.1–10.3 đã triển khai; batch cuối `yarn typecheck`, `yarn test` (có operations regression) và `yarn build` PASS. Browser acceptance 8.4/9.4 và Nhóm 11 (vòng 3 ngày, thiết bị thật, multiplayer replay) còn mở.
- Thứ tự/phụ thuộc/kiểm chứng theo `openspec/changes/adapt-reference-shop-operations/tasks.md`; phối hợp command với `shared-alley-multiplayer`, không tạo backend thứ hai.

## CO-OP — TRẠNG THÁI 30/09/2026 (sau integration)
- [x] Màn đăng nhập: có nút “Đăng xuất” riêng khi đã đăng nhập; khi chưa đăng nhập hiện “Đăng nhập Google”.
- [ ] OAuth thật/browser QA chưa chạy. Typecheck gần nhất dừng ở `GameSimulation.updateStaffWorkers` chưa tồn tại (task nhân viên 9.2 đang triển khai); lỗi JSX nút tài khoản đã sửa nhưng chưa thể xác minh toàn app do blocker đó.
- [ ] Lượt tiếp tục task 3.4/4.2: checkpoint được xếp hàng; runtime idle chỉ evict sau flush thành công, checkpoint lỗi giữ runtime; heartbeat-timeout đóng socket và gửi event. Gateway integration trên Mongo local PASS cho idle eviction rồi khôi phục clock/avatar bằng runtime mới. Client khóa mutation khi disconnect, chặn lưu/reset online save vào Dexie, rollback nếu commit lỗi/từ chối; store status, stow và planogram gửi snapshot commit. Core tests/server typecheck PASS; monorepo typecheck gần nhất FAIL do `GameSimulation.updateStaffWorkers` chưa tồn tại (9.2); chưa build/browser reconnect QA.
- [ ] Mongo service người dùng đang standalone. Đã tạo replica set single-node tạm port 27018 ở `%TEMP%`, chạy health/auth + transaction commit/rollback PASS, chạy transaction-backed world repository + ticket tests PASS; data/process tạm đã dọn, không đổi service/DB local. Muốn dùng bền cần cấu hình service local replication và URI `replicaSet=rs0`.
- [x] Thêm WS input authoritative, time-vote/cancel, ticket one-use TTL 30s, origin allowlist, heartbeat timeout 15s, snapshot 500ms và session replacement. `test:gateway` hai session PASS: spoof account bị bỏ qua, movement/avatar snapshot, cùng duyệt ngày, thay session.
- [x] `commitCommand` dùng Mongo transaction; world repository test PASS cho idempotent retry, command tranh revision (một thắng), checkpoint stale không overwrite; ticket TTL/one-use/origin assertions PASS.
- [x] 30/09/2026: `yarn typecheck`, `yarn test`, `yarn build` PASS; local browser smoke vào game PASS. Build chunk chính 736.6 kB cảnh báo.
- [ ] Còn thiếu full browser flow hai tài khoản, OAuth thật, RTT/drop ACK/DB outage, mobile browser/device QA và restart tiến trình thật. Xem `openspec/changes/shared-alley-multiplayer/tasks.md`.
## ĐỊNH HƯỚNG CO-OP — 30/09/2026
- Trạng thái mới nhất: WS ticket dùng một lần TTL 30 giây thay Firebase token trên URL; gateway kiểm tra origin, broadcast snapshot mỗi 500ms, timeout heartbeat 15 giây; client dùng POST `/api/v1/ws-ticket`. Chưa có input/time-vote qua socket; runtime không restore checkpoint sau restart; checkpoint async chưa serialize với command; transaction cross-collection chưa được chứng minh; chưa có hai browser nghiệm thu.
- Kiểm tra `yarn typecheck`, `yarn test`, `yarn build` ngày 30/09/2026: PASS toàn bộ monorepo (18 test suites core pass, build 832 modules).
- OpenSpec `shared-alley-multiplayer`: 5.1/5.2 còn chờ MongoDB replica set và hai browser; 5.3 còn mở do browser regression chưa chạy. Trong lượt rà soát 30/09/2026, `yarn typecheck`, `yarn test`, `yarn build`, gateway PASS; `test:worlds` bị chặn bởi Mongo standalone. Các mục 3.x/4.x có code nền nhưng chưa đủ chứng cứ end-to-end; xem `openspec/changes/shared-alley-multiplayer/tasks.md`.
- Đã thêm màn hình đăng nhập đầu game theo phong cách pixel ấm, có Google và chơi khách; không sao chép các nút gameplay từ ảnh tham khảo. Login/logout không xóa local IndexedDB; cloud load chưa có. Đây là nền UI, chưa hoàn thành OpenSpec 4.1.
- Backend có HTTP auth/ACL, Mongo world repository và gateway WS. Repository test lịch sử trên Mongo dev; WS chưa test integration. Mongo transaction probe trước đó bị topology standalone code 20.
- Tasks 2.3/2.4 hoàn thành: customer checkout có reservation/receipt qua reload; command coordinator tuần tự, scope/revision/idempotency; test/build PASS. Chưa có transport hoặc receipt DB bền.
- Task 2.3 hoàn thành: customer checkout ID, giữ món, receipt chống lặp qua save/reload; test/build PASS. Chưa có kiểm tra tranh chấp qua mạng vì chưa có transport.
- Task 2.2 hoàn thành: avatar controller theo account với sequence, thời gian nhận server, cap tốc độ, va chạm và interaction range; test/build PASS. Chưa có transport/WebSocket nối controller.
- Task 2.1 hoàn thành: core nhận input interface, fixed-step runner tách khỏi renderer; headless regression cùng typecheck/test/build PASS. Chưa online command/avatar.
- Task 1.2/1.3 hoàn thành: online types/validators và seed world riêng có test; yarn typecheck/test PASS. Task 1.1 còn mở do MongoDB standalone, chưa transaction.
- Cập nhật kiểm tra Firebase/MongoDB: typecheck/build, HTTP health và token thiếu/sai 401 PASS. MongoDB đã kết nối thật nhưng là standalone (hello không có replicaSet/mongos), transaction code 20; task 1.1 vẫn mở, chưa bỏ yêu cầu transaction hoặc dùng Docker.
- Đã nối project Firebase hem-buon: AccountBar Google popup/logout, Admin credentials qua `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` và /api/v1/me; có fallback file local cũ trong giai đoạn chuyển đổi. Chưa nghiệm thu OAuth thật, chưa world ACL/cloud save nên tasks 3.1/4.1 chưa xong. Không import key Admin vào web; key được ignore Git.
- Task 1.1 đang làm: NestJS /health, /ready, MongoDB pool/.env và script transaction đã có; typecheck và HTTP health PASS. Chưa có MONGO_URI dành cho database game để kiểm chứng transaction, chưa login Google/lưu world; checkbox OpenSpec vẫn để mở. Không cần Docker theo yêu cầu mới; chờ chủ dự án chỉ file cấu hình cluster chung/database riêng.
- [x] Tạo proposal/design/ba delta specs/tasks tại `openspec/changes/shared-alley-multiplayer`; đây là tài liệu kế hoạch, chưa là multiplayer chạy thật.
- [ ] Triển khai theo tasks của change: schema world/cơ sở → core headless/giao dịch → server/auth/persistence → client hai người → nghiệm thu reconnect/chơi lệch giờ.
- [ ] Bản đầu: một tiệm chung, tối đa hai thành viên, owner offline member vẫn chơi; tất cả offline world pause; giữ save local riêng.
- [ ] Hướng sau: nhiều cơ sở độc lập trong cùng hẻm và quyền ghé thăm/phụ việc; chuyển/gộp tiệm chưa thuộc bản đầu.
- Ưu tiên kiến trúc multiplayer trước mở rộng building/nhân viên; kiểm tra giao dịch/save và Phase 3 vẫn là nền cần hoàn thiện, không coi đã nghiệm thu.

## GIAI ĐOẠN 0: THIẾT LẬP NỀN TẢNG DỰ ÁN (PHASE 0)
- [x] Tạo cấu trúc Monorepo (`pnpm-workspace.yaml`, `package.json`).
- [x] Khởi tạo các packages: `shared`, `game-data`, `game-core`, `game-renderer`, `game-ui`.
- [x] Khởi tạo ứng dụng chính `apps/web` (Vite, React 18, Tailwind CSS, TypeScript).
- [x] Khởi tạo khung ứng dụng `apps/server` (NestJS structure chuẩn bị cho Phase 7).
- [x] Viết tài liệu kỹ thuật: `GAME_DESIGN.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DATABASE_SCHEMA.md`, `TASKS.md`.

---

## GIAI ĐOẠN 1: BẢN ĐỒ & NHÂN VẬT CHƠI ĐƯỢC (PHASE 1 VERTICAL SLICE)
- [x] **Hệ thống dữ liệu game (game-data & shared)**:
  - [x] Định nghĩa 5 sản phẩm Việt Nam đầu tiên (Mì Hảo Hảo, Xá xị Chương Dương, Kẹo Big Babol, Sữa đặc Ông Thọ, Bánh mì que).
  - [x] Định nghĩa cấu trúc bản đồ khởi đầu (Cửa hàng 8x8 + vỉa hè + đường hẻm).
- [x] **Bộ dựng hình PixiJS v8 pixel-art (game-renderer)**:
  - [x] Khởi tạo Canvas với Nearest-Neighbor filtering và integer scaling.
  - [x] Tải / tạo texture pixel-art chuẩn 32x32: Nền gạch bông cổ điển, vỉa hè lát đá, tường vôi vàng, kệ gỗ, quầy thu ngân, nhân vật người chơi.
  - [x] Camera pixel-perfect bám theo người chơi, hạn chế rung giật (sub-pixel jittering).
  - [x] Render theo thứ tự trục Y (Y-sort) để nhân vật hiển thị tự nhiên trước và sau kệ hàng.
- [x] **Logic lõi & ECS (game-core)**:
  - [x] Xử lý đầu vào: WASD, Phím mũi tên, Phím [E]/[Space] tương tác, Phím [I] mở túi đồ.
  - [x] Hệ thống va chạm (AABB tile collision check).
  - [x] Hệ thống tương tác (Interaction system) phát hiện kệ hàng và bàn thu ngân trong cự ly.
  - [x] Vòng lặp mô phỏng với bước thời gian cố định (Fixed timestep).
  - [x] Đồng hồ game (Game Clock) từ 06:00 đến 22:00, tua nhanh theo nhịp chơi.
- [x] **Giao diện người dùng & Điều khiển (game-ui & apps/web)**:
  - [x] HUD đầu game: Tiền (VND), Ngày, Giờ, Cấp độ, Thanh kinh nghiệm, Nút mở túi đồ, Nút lưu game.
  - [x] Bảng túi đồ / kho hàng (Inventory Modal) phong cách cổ điển, xem thông tin chi tiết từng món.
  - [x] Hộp thoại tương tác kệ hàng: Cho phép bày sản phẩm từ túi đồ lên kệ, xem số lượng tồn trên kệ.
  - [x] Hộp thoại bàn thu ngân: Quản lý đóng/mở cửa tiệm, kiểm tra tiền trong hòm.
  - [x] Virtual Joystick và nút cảm ứng trên màn hình điện thoại / máy tính bảng.
  - [x] Màn hình cảnh báo xoay ngang (Rotate Device Overlay) khi phát hiện màn hình dọc.
- [x] **Hệ thống lưu cục bộ (Dexie IndexedDB)**:
  - [x] Lưu và khôi phục trạng thái vị trí người chơi, số tiền, ngày giờ, hàng hóa trên kệ, túi đồ.
  - [x] Cơ chế tự động lưu (Autosave) kèm thông báo trực quan.
- [x] **Kiểm thử & Đóng gói sản phẩm**:
  - [x] Chạy kiểm tra kiểu TypeScript (`tsc`).
  - [x] Chạy kiểm tra bộ build sản phẩm (`pnpm build`).
  - [ ] Đo FPS và kiểm tra console trên trình duyệt desktop/mobile thật.

---

## ĐỢT RÀ SOÁT HIỆN TẠI
- [x] Sửa race khởi tạo Pixi trong React StrictMode: lượt dọn dẹp cũ không còn phá canvas của lượt mới; hiển thị lỗi khởi động và nút tải lại nếu dựng bản đồ thất bại.
- [x] Sửa đồng hồ HUD cập nhật mỗi phút và vòng mô phỏng cố định theo thời gian thực, không theo số khung hình.
- [x] Sửa lưu IndexedDB: revision chỉ tăng một lần, ghi tuần tự và từ chối bản lưu cũ.
- [x] Đặt hàng nhà phân phối bằng tiền thật; đơn chờ được lưu và giao vào kho sáng ngày kế.
- [x] Bán từng món từ tồn kệ tại quầy; cộng tiền, XP, doanh thu và lưu thống kê.
- [x] Kiểm thử nghiệp vụ đặt hàng, giao hàng, bán hàng và khôi phục dữ liệu.
- [x] Mở rộng danh mục lên 36 sản phẩm và đủ 10 nhóm; giá nhập/bán và cấp mở khóa dùng chung trong đặt hàng, kho và quầy.
- [x] Quản lý hạn sử dụng theo lô, loại hàng quá hạn qua ngày, giới hạn kho lạnh 40 món và tủ mát 12 món. Bản lưu cũ được bổ sung lô/tủ mát mà vẫn giữ số hàng.
- [x] Khách NPC đầu tiên dùng A* đi từ cửa tới kệ, quầy và rời tiệm; giao dịch trừ hàng trên kệ, cộng tiền/XP/thống kê; trạng thái khách đang đi được lưu/tải.
- [x] Báo cáo tài chính theo ngày (Nhóm 6: Giá vốn lô, ledger & báo cáo ngày) và gợi ý nhập hàng thông minh (Nhóm 7: tính vận tốc 3/7 ngày & cắt giảm giỏ theo ngân sách/kho/mối sỉ/đơn tối thiểu).
- [ ] Nhiệm vụ và mở khóa cấp độ sâu hơn.
- [ ] Đo FPS trên thiết bị thật. Đã kiểm tra giao diện 960×540, 844×390 và màn hình dọc 390×844 trong trình duyệt thử nghiệm; chưa kiểm tra điện thoại thật.
- [ ] Thiết lập lint script và chạy lint; dự án hiện chưa có cấu hình lint.

## BÀN GIAO PHIÊN 2026-09-30
- Giai đoạn hiện tại: Phase 3. Phase 2 đã hoàn thành và được kiểm tra bằng typecheck, 10 nhóm test lõi, build production và lưu/tải trên trình duyệt.
- Tiếp theo: bổ sung hàng đợi nhiều NPC, để người chơi thu tiền tại quầy, phản hồi kiên nhẫn/uy tín; kiểm tra hiệu năng và thiết bị thật.
- Vấn đề còn biết: không có lint script; NestJS/MongoDB/Firebase/PWA/ECS đầy đủ vẫn thuộc các giai đoạn sau. Bản build hiện cảnh báo JS chunk chính trên 500 kB.

## THUẾ — TAX-0 VÀ MODULE NỀN
## PREMIUM VIETNAMESE PIXEL UI
- [x] Nhà kho vật lý sau tiệm đã triển khai: cửa/lối đi, art stock thật, panel kiểm kê/nhận hàng, tương thích save cũ và kiểm thử tích hợp. Bằng chứng docs/ui/WAREHOUSE.md và docs/ui/qa/warehouse-*.
- [x] Bộ giao diện mới, asset original, modal focus/input và save feedback đã triển khai.
- [x] Typecheck/test/build và smoke purchase → delivery → restock → sale → save/reload; ảnh năm viewport nằm trong docs/ui/qa.
- [ ] Hoàn thành các kiểm tra còn mở ở openspec/changes/premium-vietnamese-pixel-ui/tasks.md. Báo cáo pass/thiếu bằng chứng và hạn chế hiệu năng: docs/ui/VERIFICATION.md.

## THUẾ — TAX-0 VÀ MODULE NỀN
- [x] Đọc tài liệu và kiểm tra trạng thái repository; giữ các thay đổi đang có.
- [x] Tạo tám tài liệu docs/tax; phân biệt nguồn chính thức với quy tắc đủ điều kiện chạy.
- [x] Thêm registry bất biến và kiểm thử ngày/phiên bản/khôi phục JSON/khóa UNVERIFIED.
- [ ] Đối chiếu bản ký, sửa đổi đến 30/09/2026, điều khoản chuyển tiếp và thông tư; TAX-0 chưa hoàn tất.
- [ ] Xác minh cụ thể PIT/VAT đa hoạt động, thuế suất CIT và điều kiện miễn, NĐ 254 về hóa đơn, đăng ký, thực phẩm/BHXH.
- [ ] Thêm TAX-1 sau thẩm định điều kiện; tích hợp năm pháp lý và taxRuleVersion vào save có migration.
- [ ] Triển khai engine, kế toán, UI, trợ lý và persistence theo từng phase; không kích hoạt công thức giả định.
- 30/09/2026: Bỏ transaction/replica set; 1 Mongo node là đủ. `commitCommand` = một updateOne nguyên tử (revision + receipt). `test:worlds`, `test:gateway`, `verify:runtime`, typecheck PASS trên Mongo standalone. Các ghi chú cũ về 'Mongo standalone chặn test' và 'cần replica set rs0' ở trên không còn hiệu lực.
- 30/09/2026 (ROADMAP giai đoạn 4/8): thêm `packages/game-core/src/quests.ts` (nhiệm vụ ngày, chuỗi cốt truyện, mốc cấp), `claimQuest`/`getQuests` trong simulation, lệnh co-op `claim_quest`, `QuestModal` + nút HUD, PWA (manifest/sw/icon). `yarn typecheck`, `yarn test` (gồm quests.test và claim co-op trong world-runtime.test), `yarn --cwd apps/web build` PASS. Chưa QA browser/thiết bị; mùa Việt Nam (GĐ 9), quầy ăn uống (GĐ 10), bảo vệ dắt xe, TAX-1..8 chưa làm.
- 30/09/2026 (GĐ 9–10): thêm `game-data/seasons.ts`, `stalls.ts`, `game-core/stalls.ts`; khách theo mùa trong `CustomerManager.maybeSpawnCustomer`; `buyStall/getStalls/getSeason` + `processStalls` (mỗi ngày một lần, idempotent, ghi ledger có cogs); lệnh co-op `buy_stall`; `StallModal`, biểu ngữ mùa HUD. `yarn typecheck`, `yarn test` (seasons.test, runtime buy_stall), web build PASS. Chưa QA browser, chưa art/sản phẩm theo mùa, chưa hiển thị quầy trên map.
