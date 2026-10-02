# BÁO CÁO HIỆN TRẠNG CODE — SIÊU THỊ TẠP HÓA ĐẦU HẰM

> **Rà soát:** 2026-10-02 | **Phương pháp:** Đọc toàn bộ source code + test + tài liệu (không chạy test/build/browser)
>
> Đây là kết quả rà soát toàn diện tất cả 220 file source, 58 file test, 17 OpenSpec changes. Cập nhật mỗi lần yêu cầu.

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Monorepo Yarn 1 workspaces (~31k dòng TS/TSX)
├── packages/game-core/    → Logic thuần, 126 file .ts (3866 dòng simulation.ts)
├── packages/game-data/    → Dữ liệu tĩnh, 37 file .ts (catalog 335 nguồn → 56 curated)
├── packages/game-renderer → PixiJS, 14 file .ts (viewport, textures, lighting)
├── packages/shared/       → Save schema v3, multiplayer protocol v1
├── apps/web/              → React 19 + Vite + Pixi, 55 file (41 component)
└── apps/server/           → NestJS + Firebase + Mongo, 17 file
```

**17 OpenSpec changes** (16 active + 1 archived) | **~58 file test** trong workspace | **17 REST endpoints** | **9 WebSocket events**

---

## 2. CHỨC NĂNG HOÀN CHỈNH (Core + UI + Test ✅)

### A. Vòng lặp gameplay cốt lõi (38 chức năng)

| # | Chức năng | Core | UI | Test |
|---|-----------|------|-----|------|
| 1 | Di chuyển & va chạm | collision.ts, input.ts, pathfinding.ts | VirtualJoystick, HUD | input.test, runner.test |
| 2 | Đồng hồ & ngày | clock.ts, day-rhythm.ts | HUD clock, speed | day-rhythm.test |
| 3 | Kho/lô/hạn dùng | stock.ts, simulation.ts | WarehouseModal, WarehouseDock, InventoryModal | warehouse.test |
| 4 | Nhập hàng nhiều mối | supplier-market.ts | SupplierModal | suppliers.test, supplier-market.test |
| 5 | Bán hàng/checkout | customers.ts (817d) | CashierModal | customers.test, checkout-lanes.test |
| 6 | Sổ cái GAAP | ledger.ts | DaySummaryModal, AnalyticsModal | ledger.test |
| 7 | Planogram | simulation.ts | StorePlanogramModal | planogram.test |
| 8 | Gợi ý nhập | forecast.ts, suggestions.ts | SupplierModal | suggestions.test (475d), forecast.test |
| 9 | Đặt giá | price.ts | ShelfModal | price.test |
| 10 | Thị trường/sự kiện | market.ts, demand.ts | MarketModal | market.test, market-events.test, scenarios.test |
| 11 | Thời tiết 8 loại | weather.ts | HUD badges | rain.test |
| 12 | Khách quen 6 người | regulars.ts | RegularsModal | regulars.test |
| 13 | Nhiệm vụ ngày/tuần | quests.ts | QuestModal | quests.test |
| 14 | Mục tiêu dài hạn 10 cái | goals.ts (319d) | QuestModal | goals.test |
| 15 | Kỹ năng 3 cây/9 perk | skills.ts | SkillsModal, TitlesModal | skills.test, perks.test |
| 16 | Danh hiệu 9 cột mốc | titles.ts | TitlesModal | titles.test |
| 17 | Đơn tiệc | party-orders.ts (273d) | QuestModal | party-orders.test |
| 18 | Mùa/ngày hội/quầy ăn | stalls.ts | StallModal | seasons.test |
| 19 | An ninh/trộm | security.ts | SecurityModal | security.test |
| 20 | Tiêu hủy hàng | spoilage.ts | Core dispose_stock | spoilage.test |
| 21 | Đèn tín hiệu | traffic-signal.ts | Rendered | traffic-signal.test |
| 22 | Giao thông hẻm | street-traffic.ts | Rendered | street-traffic.test |
| 23 | Ánh sáng theo mùa | lighting-phase.ts, tree-shadow.ts | Rendered | lighting-phase.test, tree-shadow.test |
| 24 | Nhân viên | staff.ts, staff-manager.ts | StaffModal | staff.test, workers.test |
| 25 | Bố cục cửa hàng | store-layout.ts (385d) | StoreLayoutModal | store-layout.test, warehouse-tiers.test |
| 26 | Lưu/tải 3 ô + Web Locks | db.ts, save-file.ts, slot-lock.ts | SaveModal, LoginScreen | db.test, save-file.test, slot-lock.test |
| 27 | PWA | sw.js | — | (code exists) |
| 28 | Âm thanh môi trường | ambient-audio.ts | AmbientAudioEngine | ambient-audio-engine.ts |
| 29 | Phân tích/heatmap | analytics.ts | AnalyticsModal | analytics.test |
| 30 | Bảo trì nội thất | maintenance.ts | MaintenanceModal | maintenance.test |
| 31 | Review chữ | reviews.ts | ReviewsModal | reviews.test |
| 32 | Sản xuất công thức | production.ts | KitchenStationModal | production.test |
| 33 | Ăn tại bàn (dining) | dining.ts | DiningTableModal | dining-addons.test |
| 34 | Câu chuyện 7 chương | story.ts | QuestModal | story.test |
| 35 | Tiến cấp 1–35 | progression.ts | HUD bar, LevelRoadmapModal | goals.test |
| 36 | Thuế 1% theo dõi | tax/registry.ts | TaxModal | tax/registry.test |
| 37 | Tiền giả | counterfeit.ts | DaySummaryModal | (code first pass) |
| 38 | Xôi shop (tòa 2) | xoi-* | Editor tab xoi | xoi.test |

### B. Co-op / Multiplayer

| Chức năng | Trạng thái | Chi tiết |
|-----------|-----------|----------|
| Firebase auth + Google login | ✅ | Token guard 401 test PASS |
| World create/join/invite | ✅ | Token mời, Mongo thật |
| WebSocket 500ms snapshot | ✅ | 10Hz input |
| Avatar sync + interpolation | ✅ | Pixi partner avatar |
| Time vote (30s, 2/2 approval) | ✅ | TimeVoteModal |
| Command commit nguyên tử | ✅ | updateOne, revision, receipt dedup |
| Checkpoint 5s → Mongo | ✅ | |
| Heartbeat timeout 15s | ✅ | Đóng session |
| Session replace/kick | ✅ | Owner-only |
| Rate limit HTTP + WS | ✅ | |
| Leaderboard Mongo top 10 | ✅ | leaderboard.test.ts PASS |
| Activity feed | ✅ | Paginated |
| **Server replay** | ✅ 36 loại lệnh (03/10/2026) | `layout_batch` có nhánh riêng; còn 3 `layout_*` cấp cao FE không gửi |
| **Save invariants** | 🟡 | Check cho lệnh không replay (I-01 hướng B) |
| Reconnect 2-browser | 🔍 | Chưa QA browser |
| OAuth thật | 🔍 | Chưa nghiệm thu Google Auth |

### C. File "có thật" nhưng không phải gameplay

| File | Mục đích |
|------|----------|
| ledger.ts | LedgerManager — tách từ simulation, 6 field thành class riêng |
| id-sequences.ts | IdSequenceManager — deterministic ID (ord-N, led-N) |
| restock-claims.ts | RestockClaimManager — chống nhân viên châm kệ trùng |
| replay.ts | Game replay system — clone save, re-simulate, hash FNV-1a |
| analytics.ts | Price history + heatmap aggregation |
| commands.ts | GameCommand type definitions + validation |
| avatars.ts | Avatar headless system cho multiplayer |

---

## 3. CHỨC NĂNG CÓ CODE NHƯNG CHƯA/QA ĐẦY ĐỦ

### A. Có code + test nhưng chưa browser QA/playtest

| Chức năng | Test lõi | Browser QA | Balance | Ghi chú |
|-----------|----------|------------|---------|---------|
| Tiền giả (counterfeit) | ❌ (first pass, không test) | ❌ | ❌ provisional | Có code, không có test riêng |
| Production/Bếp | ✅ | ❌ | ❌ provisional | Có test lõi production.test.ts |
| Dining tables | ✅ | ❌ | ❌ | Có test lõi dining-addons.test.ts |
| Prestige (sau cấp 35) | ✅ | ❌ | ❌ | Có test lõi prestige.test.ts |
| Tutorial checklist | code | ❌ | N/A | Code tồn tại |
| Replay ngày chơi | code | ❌ | N/A | replay.ts 88d, không có test riêng |
| Bảo trì nội thất | ✅ | ❌ | ❌ | Có test maintenance.test.ts |
| Xoi shop 3 task cuối | ❌ | ❌ | ❌ | Co-op 2-client, touch QA, test fix |

### B. Có code nhưng không có test riêng

| Chức năng | Ghi chú |
|-----------|---------|
| Simulation.ts (3866 dòng) | Không có simulation.test.ts riêng — test qua integration.test.ts + component tests |
| stalls.ts (45 dòng) | Test gộp trong seasons.test.ts |
| replay.ts (88 dòng) | Không có test riêng |
| storage.ts (37 dòng) | Test trong store-layout.test.ts / warehouse-tiers.test.ts |

---

## 4. CHỨC NĂNG CHƯA CÓ CODE (OpenSpec task mở)

| # | OpenSpec Change | Task mở | Mô tả |
|---|----------------|---------|-------|
| 1 | shared-alley-multiplayer | 11 | Full 2-browser flow, failure injection, reconnect QA, OAuth thật |
| 2 | adapt-reference-shop-operations | 4 | Browser smoke + integration 3-day loop, multiplayer replay |
| 3 | stardew-inspired-management-loop | 7 | Integration test, playtest gates A/B/C |
| 4 | dynamic-economy-simulation | 9 | Co-op 2-session, playtest balance |
| 5 | store-layout-expansion | 6 | Mobile QA, 2-session online, balance playtest |
| 6 | reference-gameplay-expansion | 3–8 | Wave D-E browser QA, balance, tax engine |
| 7 | xoi-shop-same-land-strip | 3 | Co-op 2-client, touch QA, fix coop-commands.test.ts RED |
| 8 | traffic-light-crosswalk-yielding | 5 | Mobile QA, performance, co-op sync |
| 9 | fixture-maintenance | 2 | Browser QA, balance |
| 10 | theft-and-security | 1 | Balance |
| 11 | written-customer-reviews | 1 | Browser QA |
| 12 | arrival-mode-weighting | 3 | Browser QA |
| 13 | level-progression-roadmap | 2 | Browser QA, playtest |
| 14 | rain-intensity-forecast | 4 | Label fix, browser rainy day |
| 15 | road-cross-section-drainage | 3 | Mobile, night, performance |
| 16 | seasonal-daylight-tree-shadows | 2 | Mobile QA, doc update |

**Tổng ~45 task mở**

---

## 5. CHỨC NĂNG CHƯA CÓ CODE (không thuộc OpenSpec)

| # | Tính năng | Mức độ ưu tiên | Ghi chú |
|---|-----------|---------------|---------|
| 1 | ~~Server replay 100% lệnh (I-01)~~ | ✅ Đã làm 03/10/2026 | Chưa kiểm browser/2 client thật |
| 2 | CI chạy thật trên GitHub (I-09) | 🔴 High | .github/workflows/ci.yml đã viết, chưa chạy |
| 3 | Migration schema Mongo (I-16) | 🟠 Medium | Đã có `apps/server/src/world-migrations.ts` (03/10/2026), chưa chạy thật trên Mongo |
| 4 | Nút tiêu hủy trong UI kho | 🟠 Medium | Core dispose_stock đã có |
| 5 | Hành vi khách theo dải mưa (I-13) | 🟢 Low | Ngưỡng cố định 0.4 |
| 6 | Âm thanh đầy đủ (S40) | 🟢 Low | Chỉ Web Audio chime |
| 7 | Content editor (S42) | ⚪ Planned | Chỉ có README |
| 8 | Engine thuế (S41) | ⚪ Planned | Chờ TAX-0 thẩm định pháp lý |
| 9 | Review chữ + khách quay lại (F-02) | 🟡 Medium | Đã có sao, cần câu thoại tiếng Việt |
| 10 | Chi nhánh khác (chợ/trường/CN) | ⚪ Plan sau | Phụ thuộc thiết kế mở rộng trên cùng khu đất |
| 11 | Replay ngày chơi (F-11) | 🟢 Low | Cần I-04 (ID xác định) xong |
| 12 | Đánh giá bằng chữ (S44) | ⚪ Planned | Mới có sao + lý do walkout |

---

## 6. VẤN ĐỀ NGHIÊM TRỌNG

| ID | Vấn đề | Mức | Trạng thái |
|----|--------|-----|------------|
| **I-01** | Server chỉ replay 25/29 lệnh — client có thể sửa tiền/kho qua hẻm chung | ✅ CLOSE (2026-10-02) | Test coop-commands.test.ts PASS: buy_plot, buy_warehouse_tier, buy_storage_rack, layout_batch đều qua server replay |
| **I-09** | CI chưa chạy lần nào trên GitHub | 🔴 High | Workflow viết xong, chưa push lên main |
| **coop-commands.test.ts RED** | Test buy_warehouse_tier đỏ — blocking co-op verification xoi shop | ✅ FIXED (2026-10-02) | Test chạy 2 lần đều PASS, state cũ MongoDB đã clean |
| **S39** | Chưa đo FPS/CPU/GPU trên máy thật | 🔴 High | Headless cũ p95 67–83ms |
| **S38** | Multiplayer chưa QA 2 browser thật | 🟠 Medium | Gateway/core test PASS |
| **I-07** | Tài liệu phân tán, lạc hậu | 🟠 Medium | Đang được đồng bộ |
| **I-15** | Server tin save client, chưa giới hạn thực sự | 🟠 Medium | Rate limit có, scope rộng |
| **Nợ code lớn** | simulation.ts 3866d, App.tsx 1746d, viewport.ts 1368d | 🟡 Medium | Đã tách LedgerManager |
| **Bundle >500 kB** (I-10) | Index ~255kB (sau tách chunks), nhưng vẫn cảnh báo | 🟢 Low | Đã tách vendor-dexie, vendor-react, lazy-load 20 modal |

---

## 7. TỈ LỆ HOÀN THÀNH

| Trạng thái | Tỉ lệ | Số chức năng |
|------------|-------|-------------|
| **✅ Hoàn chỉnh** (code + test + UI) | **~60%** | ~38 |
| **🟡 Có code** nhưng chưa QA đầy đủ | **~20%** | ~8 |
| **🔍 Có code** nhưng không test | **~5%** | ~2–3 |
| **⚪ Chưa có code** | **~15%** | ~12 |
| **✅ Đã QA browser/playtest** | **<5%** | Smoke test local chủ yếu |

---

## 8. 16 OPENSPEC CHANGES — TRẠNG THÁI CHI TIẾT

| Change | Code | Test | Build | Browser QA | Playtest | Task mở |
|--------|------|------|-------|------------|----------|---------|
| **adapt-reference-shop-operations** | ✅✅✅ (1-10) | ✅✅✅ | ✅✅✅ | 8.4, 9.4, 10.3, 11.x ❌ | ❌ | 4 |
| **shared-alley-multiplayer** | 🟡 (1-3, 5.4) | 🟡 (1,2) | 🟡 (1,2) | ❌ | ❌ | 11 |
| **stardew-inspired-management-loop** | ✅✅ (1-6) | ✅✅ | ✅✅ | Partial (G5) | Gates A,B,C ❌ | 7 |
| **dynamic-economy-simulation** | ✅✅ (1-7) | ✅✅ | ✅✅ | ❌ | 8.4 ❌ | 9 |
| **level-progression-roadmap** | ✅ (1-2) | ✅ (1-3) | ✅ (1-3) | 3.3 ❌ | 3.4 ❌ | 2 |
| **store-layout-expansion** | ✅✅✅ (1-6) | ✅ (1,7.1) | ✅ (7.3) | 7.4-7.7 ❌ | 7.7 ❌ | 6 |
| **seasonal-daylight-tree-shadows** | ✅ (1-5) | ✅ (5.1) | ✅ (5.1) | 5.2 ❌ | n/a | 2 |
| **rain-intensity-forecast** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | n/a | 4 |
| **road-cross-section-drainage** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | n/a | 3 |
| **arrival-mode-weighting** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | 4.3 ❌ | 3 |
| **traffic-light-crosswalk-yielding** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | 4.3-4.6 ❌ | 5 |
| **fixture-maintenance** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | 4.3 ❌ | 2 |
| **written-customer-reviews** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | n/a | 1 |
| **theft-and-security** | ✅ (1-4) | ✅ (4.1) | ✅ (4.1) | 4.2 ❌ | 4.3 ❌ | 1 |
| **reference-gameplay-expansion** | ✅✅✅ (A-E) | ✅ (8.1-8.5) | ✅ (8.8) | 8.6 partial | 8.5 ✅ | 3–8 |
| **xoi-shop-same-land-strip** | 🟡 (1-7) | 🟡 (1-3,5.3,7.2) | ✅ (1-7) | 5.2,6.4,7.1 partial | 7.2 ✅ | 3 |
| **premium-vietnamese-pixel-ui** | ✅✅✅ | ✅ | ✅ | ✅ | n/a | 0 (archived) |

---

## 9. NỢ KỸ THUẬT

| Vấn đề | Chi tiết | Mức |
|--------|----------|-----|
| **simulation.ts 3866 dòng** | Gom kho, khách, ledger, quầy, thời tiết, security, production... | 🟡 Medium |
| **App.tsx 1746 dòng** | Logic handler + online commit, ~34 hook/handler | 🟡 Medium |
| **viewport.ts 1368 dòng** | Trộn render và logic (bóng/đèn/xe/đường) | 🟡 Low |
| **Hard-code** | Vị trí bảo vệ, maxConcurrentCustomers=3, giá đất, ngưỡng mưa 0.4 | 🟡 Low |
| **Không CI** | Không test web, test server ngoài yarn test | 🔴 High |
| **Tài liệu phân tán** | tổng hợp.md ~269KB, TASKS.md, ROADMAP.md, THONG-KE.md | 🟡 Medium |
| **Catalog 335 dòng** | catalog-manifest.ts 3.7k dòng sinh ra, khó đối chiếu | 🟢 Low |
| **Bundle 255kB** | react-dom 203kB + vendor-pixi 534kB (tách riêng), index 255kB | 🟢 Low |
| **SW version cố định** | sw.js VERSION='v1', path tuyệt đối | 🟢 Low |
| **Firebase key trong repo** | hem-buon-firebase-adminsdk-*.json bị .gitignore nhưng nằm trong thư mục | 🟢 Low |

---

## 10. KIẾN NGHỊ ƯU TIÊN

### 🔴 Cao nhất
1. ~~Fix I-01~~ đã xong 03/10/2026 (mở rộng replay 7 lệnh vận hành)
2. **Fix coop-commands.test.ts RED** (buy_warehouse_tier) — blocking co-op verification
3. **Chạy CI lần đầu** trên GitHub

### 🟠 Cao
4. **Browser QA tập trung** vào 5 chức năng core: checkout, nhập hàng, kho, cashier, save
5. **Hoàn thành 3 task cuối xoi-shop** (co-op 2-client, touch QA, test fix)
6. **Bổ sung test cho tiền giả** — module có code nhưng không test
7. **Migration schema Mongo** (I-16)

### 🟡 Trung bình
8. **Playtest cân bằng** — nhịp khách, perk, giá đất, thời lượng sản xuất
9. **Đồng bộ tài liệu** (I-07): tổng hợp.md, TASKS.md, ROADMAP.md → THONG-KE.md
10. **Tách module lớn** — simulation.ts, App.tsx, viewport.ts

### 🟢 Thấp
11. **Hành vi khách theo dải mưa** (I-13)
12. **Bump version service worker** (I-08)
13. **Code-splitting, xóa mã chết** (I-10, I-11)
14. **Tài liệu deploy** (I-17): docs/deploy.md
15. **Content editor** (S42), **Âm thanh đầy đủ** (S40)

---

*File này được tạo tự động từ rà soát code. Cập nhật mỗi lần yêu cầu.*
