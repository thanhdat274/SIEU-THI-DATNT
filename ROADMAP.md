# LỘ TRÌNH PHÁT TRIỂN (DEVELOPMENT ROADMAP)

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
Trạng thái cập nhật 30/09/2026: `yarn typecheck`, `yarn test`, `yarn build` PASS; browser smoke local PASS. Mongo transaction và gateway/world integration PASS trên replica set single-node tạm port 27018 (test data/process đã dọn), trong khi Mongo service đang dùng vẫn standalone. WS giờ nhận movement/time-vote, ticket one-use, replacement; integration hai socket PASS. Còn mở full browser flow hai tài khoản, crash/restart thật, network failure/RTT, OAuth thật, mobile QA và cấu hình replica set bền. Chi tiết OpenSpec tasks.

Trạng thái triển khai 30/09/2026: HTTP/Mongo world API và core runtime có code; gateway WS đã có ticket dùng một lần (TTL 30s), origin allowlist theo `WEB_ORIGIN`, heartbeat 10s/timeout 15s, checkpoint 5s và snapshot 500ms. Đã khắc phục lỗi typecheck server (ActivityRecord revision, WebSocketTicketDoc và Cast findOneAndDelete), monorepo `yarn typecheck`, `yarn test` (18 test suites PASS), và `yarn build` PASS sạch sẽ. Chưa nối authoritative movement/time vote thành command realtime; gateway chưa restore runtime sau process restart, checkpoint async chưa serialize với command, transaction cross-collection chưa có chứng cứ, và chưa nghiệm thu hai browser. Xem OpenSpec `shared-alley-multiplayer/tasks.md`, không archive hoặc tuyên bố multiplayer đạt.

Tasks 2.3/2.4 hoàn thành: receipt checkout bền trong core save và command coordinator ngăn duplicate/revision races trong process; typecheck/test/build PASS. Chưa test race nhiều socket/DB restart. Tiếp server auth/session (3.1–3.2); task 3.3 cần MongoDB replica set, database hiện tại chưa hỗ trợ transaction.

UI đăng nhập đầu game đã được thêm: đăng nhập Google hoặc chơi khách, kèm nhận diện tài khoản đã đăng nhập; save local vẫn giữ nguyên khi login/logout. Đây chỉ là entry screen, chưa tải cloud save hoặc chọn/join world; OpenSpec task 4.1 còn mở.

Backend cũ có Nest HTTP routes, Firebase guard, world ACL và Mongo repository tests. Transaction probe trước đây code 20 trên standalone; gateway mới chưa integration-test.

Task 2.3 đã thêm receipt checkout bền trong save và giữ sản phẩm khách đang mua; unit regression, typecheck/build PASS. Race đa client còn cần task 2.4/server Mongo transactions, hiện topology DB chưa hỗ trợ transaction.

Task 2.2 hoàn thành: authoritative avatar input có sequence/time cap/collision/range checks; typecheck/test/build PASS. Controller chưa có socket transport. Tiếp task 2.3 checkout hàng giữ chỗ. Task 1.1 Mongo transaction còn chặn persistence nhiều collection.

Task 2.1 hoàn thành: renderer chuyển sang core fixed-step runner và simulation dùng input interface; headless test, regression, typecheck/build PASS. Tiếp task 2.2 avatar/input intent. Task 1.1 đang mở do database hiện tại là standalone.

Tasks 1.2/1.3 đã có hợp đồng dữ liệu/version validator và seed online tách local save; typecheck/test PASS. Tiếp theo task 2.1 tách vòng tick/browser input, trong khi task 1.1 transaction DB vẫn chờ replica set.

Kiểm tra mới: Firebase web/Admin build đạt, thiếu/sai token trả 401; OAuth thật chưa nghiệm thu. MongoDB kết nối được nhưng standalone, chưa hỗ trợ transaction (code 20); cần replica set có sẵn/Atlas để hoàn tất task 1.1, không yêu cầu Docker.

Firebase hem-buon đã được cấu hình web/Admin và có code login popup/logout, backend verify token; chưa nghiệm thu OAuth thật, chưa nối lưu MongoDB/world ACL. Đây là phần nền task 3.1/4.1, không đánh dấu hoàn thành toàn task hoặc Phase 7.

Apply đã bắt đầu task 1.1: HTTP NestJS và nền MongoDB/.env có code, HTTP health/typecheck đã kiểm chứng; chờ URI cho database game riêng trong cluster chung để kiểm chứng transaction. Google login, cloud save và realtime chưa triển khai. Không yêu cầu Docker theo chỉ đạo mới; chưa hoàn thành task 1.1 hoặc Phase 7.

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
- [x] Hỗ trợ Responsive đa nền tảng (Desktop & Mobile) kèm màn hình nhắc xoay ngang khi ở chế độ dọc.

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
- [x] Mốc cấp: modal hiện món/mối hàng mở khóa ở cấp kế, toast khi lên cấp (dữ liệu từ `unlockLevel` có sẵn; chưa có phần thưởng vật phẩm riêng).

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
- [>] PWA: manifest, icon, meta iOS, service worker cache shell/asset (`apps/web/public`), đăng ký khi production; `yarn build` PASS. Chưa kiểm chứng cài đặt/offline trên trình duyệt hoặc iOS/Android thật.

---

### [>] GIAI ĐOẠN 9: SỰ KIỆN MÙA VIỆT NAM (SEASONAL EVENTS)
- [>] Tết, Trung Thu, Tựu trường, Mùa mưa: chu kỳ 120 ngày (`game-data/seasons.ts`), đổi tốc độ khách và nhóm hàng khách ưu tiên, nhân sản lượng quầy; biểu ngữ HUD + toast khi sự kiện bắt đầu; test core PASS. Chưa có sản phẩm/art riêng (bánh chưng, câu đối, dưa hấu, bánh trung thu), chưa trang trí cửa hàng, chưa cân bằng bằng playtest.

---

### [>] GIAI ĐOẠN 10: QUẦY ĂN UỐNG & ĐỊNH HƯỚNG MULTIPLAYER
- [>] Quầy cà phê vợt và bánh mì nướng muối ớt: mở bằng tiền/cấp (`StallModal`), doanh thu tính mỗi ngày theo mùa/uy tín, ghi sổ có giá vốn, lưu/tải, co-op qua lệnh `buy_stall` (test core + runtime PASS). Quầy hiện trên vỉa hè bên phải cửa tiệm (sprite pixel, chặn đường đi) và tiêu nguyên liệu từ nhà kho theo lô FEFO (cà phê: sữa đặc + đường; bánh mì: bánh mì gối + dầu ăn; thiếu hàng thì bán ít suất hơn, báo thiếu trong modal). Còn thiếu: nhân vật phục vụ/khách đứng mua tại quầy (doanh thu vẫn tính gộp theo ngày), cà phê bột/muối ớt chưa có trong catalog nên tính bằng tiền mặt; sprite chưa QA bằng mắt trong browser.

## GIAO DIỆN PIXEL VIỆT — 30/09/2026
- [x] Nhà kho vật lý liền phía trên tiệm: phòng đi vào được, giá khô/góc lạnh/khu nhận, WarehouseModal và migration save cũ. Unit/browser tests, năm viewport và joystick đã pass; xem docs/ui/WAREHOUSE.md.
- [x] Triển khai palette Nắng Hẻm, component pixel, HUD/kho/modal, original procedural art và integer camera.
- [x] Smoke giao dịch/lưu lại, lỗi revision, responsive năm viewport và kiểm tra build/test.
- [ ] Nghiệm thu chuyển động/occlusion, night/reduced motion, toàn bộ tổ hợp lỗi và hiệu năng thiết bị thật. Theo dõi OpenSpec premium-vietnamese-pixel-ui và docs/ui/VERIFICATION.md; chưa archive.

## HỆ THỐNG THUẾ — ĐỢT ĐẦU 01/10/2026
- [>] TAX-0: Có hồ sơ nguồn, ma trận và danh sách chưa xác minh tại docs/tax; thẩm định toàn bộ pháp luật chưa hoàn tất.
- [x] Module nền TaxRuleRegistry: phiên bản bất biến, chọn theo ngày/chủ thể/hoạt động, khóa UNVERIFIED, snapshot JSON và kiểm thử.
- [x] Báo cáo doanh thu năm so với ngưỡng tham khảo (`tax/annual-revenue.ts`, chỉ theo dõi, không trừ tiền; có code, chưa có test riêng, chưa xác minh trên browser).
- [x] Màn Thuế & sổ kinh doanh mở từ HUD: doanh thu năm game, trạng thái chưa có hồ sơ thuế, nguồn nghiên cứu và giải thích rõ chưa đủ căn cứ; không tính hoặc trừ tiền.
- [ ] TAX-1: Hồ sơ chủ thể và đăng ký/chuyển đổi độc lập cấp độ.
- [ ] TAX-2–4: Hoàn tất thẩm định, engine xác định, VAT/PIT hộ và CIT có điều kiện.
- [ ] TAX-5–8: Kế toán, hóa đơn, UI/nhiệm vụ, backend cố vấn, MongoDB và kiểm thử tích hợp.
- Quy tắc nghiên cứu 1 tỷ chưa hoạt động; chưa thu thuế hoặc đổi save của người chơi.
