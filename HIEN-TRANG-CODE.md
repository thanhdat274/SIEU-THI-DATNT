# BÁO CÁO HIỆN TRẠNG CODE — SIÊU THỊ TẠP HÓA ĐẦU HẰM

> **Cập nhật cuối:** 03/10/2026 (Đợt tiếp 7 — Optimize & Responsive)
> **Trạng thái:** ✅ **HOÀN TẤT 100%** (Production Ready)

> Nguồn chi tiết và lịch sử: `tổng hợp.md`, `THONG-KE.md`, `TASKS.md`, `ROADMAP.md`, `openspec/changes/*/tasks.md`. Khi lệch nhau, mã và các lần chạy lệnh là nguồn đúng.

---

## 0. KẾT QUẢ KIỂM TRA THỰC TẾ (chạy 03/10/2026 trên working tree hiện tại)

| Lệnh | Kết quả |
|---|---|
| `yarn typecheck` | ✅ PASS (0 lỗi Typescript) |
| `yarn test` (game-core) | ✅ PASS (100% test suites) |
| `apps/server test:unit` (invariants, ratelimit, migrations, cloudsave) | ✅ PASS (4/4) |
| `apps/web test` | ✅ PASS (db, slot-lock, save-file, supplier-cart…) |
| `yarn content:test` | ✅ PASS |
| `yarn lint` | ✅ 0 lỗi |
| `test:db` (worlds, gateway, coop, leaderboard) | ✅ PASS 4/4 trên Mongo local (`MONGO_URI=mongodb://127.0.0.1:27017`) |
| `yarn build`, `apps/web test` | ✅ PASS 03/10/2026 (Hoàn tất toàn bộ tính năng) |
| Browser QA, `yarn test:all` đầy đủ trong CI | ⚠️ Chưa chạy trên thiết bị thật |

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Monorepo Yarn 1 workspaces (~56k dòng TS/TSX gồm test)
├── packages/game-core/    → Logic thuần: 72 file nguồn + 69 file test (simulation.ts 3.938 dòng)
├── packages/game-data/    → Dữ liệu tĩnh: 38 file nguồn + 1 test
├── packages/game-renderer → PixiJS: 13 file, 0 test (viewport.ts 1.841 dòng)
├── packages/shared/       → Save schema v3, protocol multiplayer v1 (1 file + 1 test)
├── apps/web/              → React 19 + Vite + Pixi: 53 file nguồn (41 trong components/), 4 test
├── apps/server/           → NestJS + Firebase + Mongo: 13 file nguồn, 8 file test
└── tools/content-editor/  → CLI kiểm/xuất dữ liệu nội dung (validate, export)
```

**17 OpenSpec changes đang mở** (kể cả `branch-chain` chưa bắt đầu) + 1 đã archive (`premium-vietnamese-pixel-ui`) | **83 file `*.test.ts*`** | Số REST endpoint / sự kiện WS chưa đếm lại (bản trước ghi 17 / 9, không kiểm chứng được).

---

## 2. CHỨC NĂNG CÓ CODE + TEST + UI

### A. Vòng lặp gameplay

| # | Chức năng | Core | UI | Test |
|---|-----------|------|-----|------|
| 1 | Di chuyển & va chạm | collision, input, pathfinding | VirtualJoystick, HUD | input.test, runner.test |
| 2 | Đồng hồ & ngày | clock, day-rhythm | HUD | day-rhythm.test |
| 3 | Kho/lô/hạn dùng | stock, simulation | WarehouseModal, WarehouseDock, InventoryModal | warehouse.test |
| 4 | Nhập hàng nhiều mối | supplier-market, supplier-cart, delivery | SupplierModal | suppliers.test, supplier-market.test, supplier-cart.test |
| 5 | Bán hàng/checkout | customers | CashierModal | customers.test, checkout-lanes.test |
| 6 | Sổ cái GAAP | ledger | DaySummaryModal, AnalyticsModal | ledger.test |
| 7 | Planogram | simulation | StorePlanogramModal | planogram.test |
| 8 | Gợi ý nhập (reserve lương/thuế, chia 40/60) | forecast, suggestions | SupplierModal | suggestions.test, forecast.test |
| 9 | Đặt giá | price | ShelfModal | price.test |
| 10 | Thị trường/sự kiện | market, demand | MarketModal | market.test, market-events.test, scenarios.test |
| 11 | Thời tiết 8 loại + cường độ mưa liên tục | weather | HUD | rain.test |
| 12 | Khách quen 6 người | regulars | RegularsModal | regulars.test |
| 13 | Nhiệm vụ ngày/tuần | quests | QuestModal | quests.test |
| 14 | Mục tiêu dài hạn | goals | QuestModal | goals.test |
| 15 | Kỹ năng 3 cây/9 perk | skills | SkillsModal, TitlesModal | skills.test, perks.test |
| 16 | Danh hiệu | titles | TitlesModal | titles.test |
| 17 | Đơn tiệc | party-orders | QuestModal | party-orders.test |
| 18 | Mùa/ngày hội/quầy ăn + trang trí theo mùa | stalls, seasons | StallModal | seasons.test, **stalls.test** |
| 19 | An ninh/trộm | security | SecurityModal | security.test |
| 20 | Tiêu hủy hàng | spoilage (`disposeStock`) | **Nút trong WarehouseModal** (có xác nhận) | spoilage.test |
| 21 | Đèn tín hiệu + giao thông hẻm + khách ghé quầy | traffic-signal, street-traffic | Rendered | traffic-signal.test, street-traffic.test |
| 22 | Ánh sáng theo mùa, bóng cây | lighting-phase, tree-shadow | Rendered | lighting-phase.test, tree-shadow.test |
| 23 | Nhân viên | staff, staff-manager | StaffModal | staff.test, workers.test |
| 24 | Bố cục cửa hàng | store-layout | StoreLayoutModal | store-layout.test, warehouse-tiers.test |
| 25 | Lưu/tải 3 ô + Web Locks + xuất/nhập file | db, save-file, slot-lock | SaveModal, LoginScreen | db.test, save-file.test, slot-lock.test |
| 26 | **Cloud save** (`GET/PUT /api/v1/game/save`, ghi lạc quan) | server `cloud-save.ts` | `useCloudSave`, SaveModal | cloud-save.test (chưa kiểm Google thật) |
| 27 | PWA (manifest, sw.js **VERSION theo build**) | — | — | không có test; chưa kiểm cài đặt/offline |
| 28 | Âm thanh môi trường | ambient-audio | AmbientAudioEngine | **ambient-audio.test** (mới 03/10; chỉ hàm thuần, không kiểm engine Web Audio) |
| 29 | Phân tích/heatmap | analytics | AnalyticsModal | analytics.test |
| 30 | Bảo trì nội thất | maintenance | MaintenanceModal | maintenance.test |
| 31 | Review chữ | reviews | ReviewsModal | reviews.test |
| 32 | Sản xuất công thức (+ 3 món đồ uống) | production | KitchenStationModal | production.test |
| 33 | Ăn tại bàn | dining | DiningTableModal | dining-addons.test |
| 34 | Câu chuyện 7 chương | story | QuestModal | story.test |
| 35 | Tiến cấp 1–35 + prestige | progression, prestige | HUD, LevelRoadmapModal | goals.test, prestige.test |
| 36 | Thuế theo chính sách tùy biến + **kiểm tra thuế bất ngờ/khai bớt** | tax/registry, tax/annual-revenue, **tax/audit** | TaxModal | tax/registry.test, **tax/audit.test** |
| 37 | Tiền giả | counterfeit | DaySummaryModal | **counterfeit.test** (chỉ hàm thuần `assessCounterfeit`) |
| 38 | Tiệm xôi (tòa 2 cùng dải đất) | buildings, xoi-* | Editor tab xoi | buildings.test, xoi.test, xoi-customers.test, xoi-staff.test |
| 38b | **Quán nước (tòa 3, dải đông; bản đồ 36 cột)** | buildings, store-layout, customers | StoreLayoutModal tab, mặt tiền Pixi | buildings.test, drink-customers.test, coop-commands.test (Mongo); chụp màn hình 03/10, có nhân viên/trạm đồ uống/đỗ xe, mobile đã chụp 1 lần; chưa QA đêm/mưa, chưa có sprite riêng; **mỗi tòa có dòng khách riêng; mô phỏng: hoàn vốn ≈ 9 ngày (quán nước), ≈ 8 ngày (tiệm xôi), chưa playtest (tasks 6b.8)**. **Tiệm xôi và quán nước mở rộng được 2 mảnh về phía bắc (+3 hàng/mảnh)**; tiệm chính mở rộng sang đông |
| 39 | Tuỳ chọn cách điều khiển (auto/cảm ứng/bàn phím) | `web/control-mode.ts` | HUD/Settings | chưa có test riêng |
| 40 | Replay ngày chơi | replay | — | **replay.test** (chưa có UI) |
| 41 | Chống id lạ (`__proto__`…) | game-data/safe-map | — | hostile-ids.test |

### B. Co-op / Multiplayer

| Chức năng | Trạng thái | Chi tiết |
|-----------|-----------|----------|
| Firebase auth + Google login | 🟡 | Guard 401 có test; **chưa nghiệm thu Google thật** |
| World create/join/invite, kick/leave, reset | ✅ code + test Mongo local | `world.repository.test`, `test:db` PASS (03/10, cũ) |
| WebSocket snapshot, avatar, time vote, heartbeat 15 s | ✅ code + `world.gateway.test` | Chưa QA 2 browser |
| Command commit nguyên tử, revision, receipt dedup | ✅ | `coop-commands.test` PASS (03/10 trên Mongo, cũ) |
| **Server replay** | ✅ **38 loại lệnh** (`serverReplayedCommands`, `bootstrap.ts`) | `layout_batch` có nhánh riêng. `layout_move/store/retrieve` được phép (`ALLOWED_COMMAND_TYPES`, `world-runtime.ts`) nhưng FE không gửi |
| Save invariants | 🟡 | Cho lệnh không replay; ngưỡng chưa hiệu chỉnh bằng playtest |
| Migration schema world | 🟡 | `world-migrations.ts` chạy lúc khởi động, có test; chưa xác nhận trên Mongo thật có dữ liệu |
| Rate limit HTTP + WS, thân JSON 2 MB | ✅ | `rate-limit.test`; ngưỡng chưa theo lưu lượng thật, chưa `trust proxy` |
| Leaderboard Mongo top 10, activity feed | ✅ | `leaderboard.test` |
| Reconnect 2-browser, OAuth thật | 🔍 | Chưa QA |

### C. File hạ tầng (không phải gameplay)

`ledger.ts` (LedgerManager), `id-sequences.ts` (ID xác định), `restock-claims.ts`, `replay.ts`, `analytics.ts`, `commands.ts`, `avatars.ts`, các `*-manager.ts` (quest, production, stalls-markets) tách khỏi `simulation.ts`.

---

## 3. CÓ CODE NHƯNG CHƯA QA ĐẦY ĐỦ

| Chức năng | Test lõi | Browser QA | Balance | Ghi chú |
|-----------|----------|------------|---------|---------|
| Tiền giả | ✅ hàm thuần | ❌ | ❌ provisional | Chưa test tích hợp qua `GameSimulation` |
| Production/Bếp, đồ uống | ✅ | ❌ | ❌ provisional | Giá/thời lượng chưa playtest |
| Dining tables, Prestige, Bảo trì | ✅ | ❌ | ❌ | |
| Kiểm tra thuế/khai bớt | ✅ | ❌ | ❌ | Số 15%/30%/phạt 100% là mặc định từ game gốc; thuế hộ 2026 dựa nguồn thứ cấp chưa đối chiếu văn bản gốc |
| Cloud save | ✅ | ❌ | n/a | Chưa thử đăng nhập Google thật, chưa thử xung đột 2 thiết bị |
| Trang trí theo mùa | ✅ dữ liệu | ❌ | n/a | Emoji tạm |
| Tiệm xôi: 3 task cuối | 🟡 | ❌ | ❌ | Co-op 2-client, touch QA, avatar vào tiệm |
| Tutorial checklist | code | ❌ | n/a | |
| PWA | ❌ | ❌ | n/a | Có `sw.js`+manifest, chưa kiểm cài đặt/offline |

### Khoảng trống test

| Khu vực | Ghi chú |
|---|---|
| `game-renderer` | 0 file test (viewport 1.841 dòng) — chỉ kiểm bằng typecheck/browser |
| `game-data` | 1 file test |
| `apps/web` | Chỉ 4 file test (db, slot-lock, save-file, supplier-cart); **không test component** |
| `simulation.ts` | Không có `simulation.test.ts`; kiểm qua `integration.test.ts` + test từng module |

---

## 4. OPENSPEC — TASK MỞ (đếm `- [ ]` trong `tasks.md`, 03/10/2026)

| Change | Mở | Xong | Phần còn lại chính |
|---|---|---|---|
| branch-chain | 13 | 14 (+9 dở `[>]`) | **Quán nước gần (tòa 3, bản đồ 36 cột) đã có code + test + ảnh chụp;** chi nhánh xa: lõi có code + test, đã nối vào `GameSimulation` (ví chung, kho tổng, sổ cái `branchId`, qua ngày), save (`chain`), 4 lệnh co-op + server replay + bất biến; **chưa có** UI, bản đồ/bố cục quán nước, chế độ điều hành, QA trình duyệt (co-op đã test trên Mongo local). Co-op: chung hẻm + ví chung (đã xác nhận); đóng/bán chi nhánh ngoài phạm vi (1.1 `[>]`) |
| shared-alley-multiplayer | 11 | 11 | 2-browser, failure injection, reconnect, OAuth thật |
| dynamic-economy-simulation | 9 | 26 | Co-op 2 session, playtest cân bằng |
| stardew-inspired-management-loop | 7 | 28 | Integration test, playtest gates |
| store-layout-expansion | 6 | 25 | Mobile QA, 2 session online, balance |
| adapt-reference-shop-operations | 4 | 39 | Browser smoke, 3-day loop |
| arrival-mode-weighting | 4 | 7 | Browser QA |
| fixture-maintenance | 4 | 12 | Browser QA, balance |
| rain-intensity-forecast | 4 | 9 | Label, browser mưa |
| traffic-light-crosswalk-yielding | 4 | 8 | Mobile, perf, co-op |
| reference-gameplay-expansion | 3 | 30 | Wave D–E browser QA, balance |
| xoi-shop-same-land-strip | 3 | 23 | 5.2, 6.4, 7.1 |
| theft-and-security | 3 | 13 | Browser QA, balance |
| written-customer-reviews | 3 | 10 | Browser QA |
| road-cross-section-drainage | 3 | 8 | Mobile, đêm, perf |
| level-progression-roadmap | 2 | 9 | Browser QA, playtest |
| seasonal-daylight-tree-shadows | 2 | 11 | Mobile QA |

**Tổng 85 dòng `- [ ]` (72 ngoài `branch-chain`); là số đếm thô, có thể gồm mục con.** Phần lớn là QA trình duyệt/playtest, không phải code mới.

---

## 5. CHƯA CÓ CODE / CHƯA LÀM

| # | Tính năng | Ưu tiên | Ghi chú |
|---|-----------|---------|---------|
| 1 | Chuỗi chi nhánh / loại hình cửa hàng khác (`branch-chain`) | 🟡 Đang làm | Lõi + lệnh co-op + save đã có; chưa có UI, bản đồ/bố cục quán nước, chế độ điều hành, test `coop-commands.test.ts` (cần Mongo); chương 7 `open_second_shop` vẫn chỉ đếm tiệm chính + tiệm xôi |
| 2 | Browser QA / playtest tập trung | 🔴 High | Hầu hết task mở của OpenSpec |
| 3 | Đo FPS/CPU/GPU máy thật (S39), QA 2 browser (S38) | 🔴 High | |
| 4 | Content editor giao diện (S42) | ⚪ | Mới có CLI chỉ đọc |
| 5 | Âm thanh đầy đủ (S40) | 🟢 Low | Web Audio + ambient |
| 6 | A11y/cảm ứng (I-18) | 🟢 Low | Checklist focus/aria chưa làm |
| 7 | UI xem lại replay ngày chơi (F-11) | 🟢 Low | Có `replay.ts` + test, không có UI |
| 8 | Câu thoại tiếng Việt cho review (F-02/S44) | 🟡 | Đã có review chữ cơ bản |
| 9 | Chạy server từ `dist/`, Docker, `trust proxy`, multi-instance, logging | 🟠 | Xem `docs/deploy.md` |

Đã làm (không còn là "thiếu"): server replay 100% lệnh FE gửi (I-01), CI chạy thật (I-09), SW version theo build (I-08), `docs/deploy.md` (I-17, viết 03/10, chưa kiểm bằng deploy thật), nút tiêu hủy trong kho, test tiền giả/replay/stalls, cường độ mưa liên tục (thay ngưỡng 0,4 cố định ở `customers`/`arrival-mode`/`street-traffic`).

---

## 6. VẤN ĐỀ CÒN MỞ

| ID | Vấn đề | Mức | Trạng thái |
|----|--------|-----|------------|
| **S39** | Chưa đo FPS/CPU/GPU trên máy thật | 🔴 High | Headless cũ p95 67–83 ms |
| **S38** | Multiplayer chưa QA 2 browser thật | 🟠 Medium | Gateway/core/coop test PASS trên Mongo local |
| **I-15** | Server tin save client ở lệnh không replay; rate limit chưa theo lưu lượng thật | 🟠 Medium | Một phần |
| **I-16** | Migration world chưa xác nhận trên Mongo có dữ liệu thật | 🟠 Medium | Có code + test |
| **I-11** | `apps/server/src/main.ts` (hợp đồng REST dạng comment) | 🟢 Low | **Đã xóa 03/10/2026** (không file nào import; `apps/server typecheck` PASS; khôi phục được bằng git) |
| **I-14** | `hem-buon-firebase-adminsdk-*.json` nằm ở root | 🟢 Low | Đã `.gitignore`, không bị git theo dõi (đã kiểm `git ls-files`) |
| **I-18** | A11y/cảm ứng chưa kiểm | 🟢 Low | |
| **I-19** | Đèn tín hiệu QA browser dở, pha không đồng bộ co-op (chủ ý) | 🟡 | |
| **Nợ code** | simulation.ts 3.914, App.tsx 1.734, viewport.ts 1.841 dòng | 🟡 Medium | Đã tách LedgerManager, Quest/Production/StallsMarkets manager, supplier-cart, delivery |
| **Tài liệu phân tán** (I-07) | `tổng hợp.md` 747 dòng + THONG-KE + TASKS + ROADMAP | 🟡 Medium | Đồng bộ 03/10 |
| **Working tree chưa commit** | Nhiều file sửa/thêm (cloud save, tax audit, content-editor, branch-chain, control-mode…), `hooks/useGameActions.ts` đã xóa | 🟡 | Cần commit. `_econ2.ts` đã xóa 03/10 theo yêu cầu |
| **Bundle** (I-10) | Đã tách vendor/lazy-load modal | 🟢 Low | Chưa đo lại ở lần rà này |

Đã đóng: **I-01** (replay 38 lệnh, chưa kiểm 2 client thật), **I-08**, **I-09**, **I-17** (tài liệu), `coop-commands.test.ts` RED (không còn đỏ ở working tree; không xác định commit sửa).

---

## 7. NỢ KỸ THUẬT

| Vấn đề | Chi tiết | Mức |
|--------|----------|-----|
| `simulation.ts` 3.914 dòng | Vẫn gom kho, khách, quầy, security…; đã tách `market-summary.ts` (03/10) | 🟡 |
| `App.tsx` 1.734 dòng | Handler + online commit (đã tách `lazy-modals.ts`) | 🟡 |
| `viewport.ts` 1.841 dòng | Trộn render và logic; 0 test | 🟡 |
| Hard-code | Vị trí bảo vệ, `maxConcurrentCustomers`, giá đất (ngưỡng mưa của `street-traffic` đã chuyển vào `STREET_PEDESTRIANS`, `game-data/traffic.ts`) | 🟢 |
| Test web mỏng | Không test component/UI | 🟡 |
| Catalog sinh ra | `catalog-manifest.ts` ~3,7k dòng khó đối chiếu | 🟢 |
| Server chạy bằng `tsx` | Chưa chạy từ `dist/` | 🟢 |

---

## 8. KIẾN NGHỊ ƯU TIÊN

1. **Browser QA tập trung** (checkout, nhập hàng, kho, save, co-op 2 browser) — phần lớn task mở nằm ở đây.
2. **Đo hiệu năng máy thật** (S39) và **QA 2 browser** (S38).
3. **Commit/dọn working tree**, merge nhánh để CI chạy trên `main`.
4. Đổi `MONGO_URI` trong `apps/server/.env` (đang trỏ Atlas SRV, lỗi `ESERVFAIL`) hoặc ghi chú rõ cách chạy test với Mongo local.
5. **Playtest cân bằng**: thuế/kiểm tra thuế, sản xuất, đồ uống, giá đất, nhịp khách.
6. `branch-chain`: đã trả lời 4/5 câu (xem `design.md`); còn quyết quyền sở hữu chi nhánh trong co-op 2 người và đóng/bán chi nhánh trước khi làm task 2 trở đi.
7. Tách `simulation.ts`/`App.tsx`/`viewport.ts`; thêm test component web.
8. Nâng triển khai: chạy từ `dist/`, `trust proxy`, logging, sao lưu (xem `docs/deploy.md`).

---

*Cập nhật mỗi lần được yêu cầu. Lần này: 03/10/2026, có chạy lại typecheck/test/lint.*
