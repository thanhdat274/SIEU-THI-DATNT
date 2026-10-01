# THONG-KE — Bảng theo dõi phát triển & hiện trạng triển khai

> **Tiệm Tạp Hóa Đầu Hẻm** (`tiem-tap-hoa-dau-hem` 0.1.0). Tài liệu sống: đọc file này trước khi cập nhật, giữ cấu trúc, không xóa lịch sử, cập nhật trạng thái tại chỗ và tính lại mục 9 sau mỗi đợt lớn.
>
> **Lần kiểm kê đầu tiên: 2026-10-01 (Asia/Saigon).** Phương pháp: rà soát **chỉ đọc** (đọc mã nguồn, cấu hình, test, OpenSpec, tài liệu; `git status/diff`). **Không chạy** ứng dụng, typecheck, test, build hay browser trong lượt này. Mọi câu "test PASS" dưới đây là **bằng chứng lấy từ tài liệu cũ** (`tổng hợp.md`, `TASKS.md`, OpenSpec) hoặc từ việc test tồn tại trong mã — không phải kết quả mới. Khi tài liệu và mã khác nhau, **mã là nguồn sự thật** và chênh lệch được ghi ở mục 3.2. Số dòng/số file nêu trong tài liệu là số liệu **tại thời điểm kiểm kê 2026-10-01**, sẽ lệch dần.

Quy ước trạng thái: ✅ Completed · 🟡 Partial · 🔴 Needs Fix · ⚪ Planned · 🔵 Improvement · 🔍 Needs Verification.
"✅" ở đây nghĩa là: có logic thật được nối vào luồng chơi **và** có test tự động trong repo (hoặc kiểm tra tương đương); không đồng nghĩa đã qua browser QA/playtest cân bằng.

---

## 1. Tổng quan dự án

**Là gì:** game quản lý tiệm tạp hóa Việt Nam thập niên 90 chạy trên trình duyệt (cảnh 2.5D pixel art, giao diện tiếng Việt, ngang màn hình desktop/mobile), có chế độ chơi một mình lưu cục bộ và chế độ "Hẻm Chơi Cùng" (co-op tối đa hai người, tiệm/quỹ/kho dùng chung).

**Mục tiêu chơi:** nhập hàng (nhiều mối) → hàng giao hôm sau → kiểm kho/hàng chờ → bày kệ, đặt giá → khách NPC chọn hàng, xếp hàng, thanh toán (người chơi hoặc nhân viên) → sổ cái/lãi lỗ → XP, cấp 1–35, kỹ năng, danh hiệu, nhiệm vụ/mục tiêu/đơn tiệc/ngày hội; chịu tác động của mùa, thời tiết, sự kiện thị trường, hạn dùng.

**Công nghệ (theo `package.json`):** TypeScript 7 strict · React 19 + Zustand 5 · PixiJS 8 · Vite 8 · Tailwind 4 + CSS riêng · Dexie 4 (IndexedDB) · Firebase Web SDK (đăng nhập) · NestJS 12 (HTTP + WS) · MongoDB driver 7 (không Mongoose) · firebase-admin 14 · ws · Yarn 1 workspaces · ESLint 10 · OpenSpec (quy trình đặc tả). Test: runner assert tự viết chạy bằng `tsx` (không Jest/Vitest/Playwright trong workspace).

**Kiến trúc (monorepo, ~31k dòng TS/TSX không tính manifest):**

| Gói | Vai trò thực tế |
|---|---|
| `packages/shared` | Kiểu dữ liệu, `SaveGameData` (schema **3**), validator runtime, giao thức multiplayer (protocol 1) |
| `packages/game-data` | Dữ liệu tĩnh: catalog (`catalog-manifest.ts` ~3.7k dòng sinh bằng script), nhà cung cấp, mùa/sự kiện, khách quen, kỹ năng, danh hiệu, bản đồ, tiến cấp 1–35, thời tiết |
| `packages/game-core` | Logic thuần, không DOM: `GameSimulation` (`simulation.ts` 2.940 dòng), khách, kho/lô, ledger, thị trường, thời tiết, ánh sáng pha, `WorldRuntime` (co-op), thuế (registry) |
| `packages/game-renderer` | Pixi: `viewport.ts` (1.368 dòng), texture procedural, `shop-lighting.ts`, camera, bóng cây |
| `apps/web` | React UI (`App.tsx` 1.508 dòng), modal, Dexie save, hook WebSocket, service worker/manifest |
| `apps/server` | NestJS dựng bằng decorator thủ công (`bootstrap.ts`), Firebase token guard, `WorldRepository` (Mongo), `WorldGateway` (WS) |
| `tools/content-editor` | Chỉ có README |

**Luồng dữ liệu cục bộ:** `game-data` → `db.ts` (Dexie) → `GameSimulation` (nguồn sự thật nghiệp vụ) → callback → Zustand/React; Pixi đọc trực tiếp simulation; `exportSaveData` → hàng đợi lưu → Dexie (một slot `local_save_default` + một bản backup, kiểm tra revision tuần tự).

**Multiplayer:** client đăng nhập Firebase → REST (`/api/v1/me`, worlds, invite, join, commit lệnh) + WS (`ws-ticket` một lần TTL 30s, origin allowlist, heartbeat 10s, snapshot 500 ms, input 10 Hz, time-vote). Server giữ `WorldRuntime` theo world, checkpoint vào Mongo. Mỗi lần commit là **một `updateOne` nguyên tử** trên một document (world + business + receipts cùng document), có `expectedRevision` và receipt idempotent; **không** dùng transaction/replica set. Chỉ **8 loại lệnh** được server tự phát lại (replay) — xem I-01.

**Deterministic/seed:** thời tiết, mưa, dự báo, ứng viên nhân viên, khách quen, giao thông hẻm dùng PRNG theo seed + ngày (`weatherSeed = save.id`). Ngoại lệ: một số ID dùng `Date.now()/Math.random()` (I-04).

**Ràng buộc kỹ thuật đáng chú ý:** bước mô phỏng cố định 1/60 s; bản đồ 26×22 ô; chỉ landscape (có overlay xoay); bundle chính ~700 kB (>500 kB); phụ thuộc Mongo thật cho test server; dev server/Vite từng bị sandbox chặn nên browser QA khó lặp lại.

---

## 2. Danh mục hệ thống đã có

> Mỗi dòng: trạng thái · file chính · phạm vi/thực tế chạy · giới hạn · liên kết. "Test" = file test có trong repo (đã chạy theo tài liệu, **chưa chạy lại** ở kiểm kê này).

| ID | Hệ thống | TT | File chính | Phạm vi thực tế & giới hạn |
|---|---|---|---|---|
| S01 | Bản đồ, di chuyển, va chạm, đồng hồ | ✅ | `game-data/map.ts`, `core/collision.ts`, `input.ts`, `clock.ts`, `pathfinding.ts` | WASD/cảm ứng, AABB theo ô, A*, 1 s thật = 1 phút game, 1×/2×. Test: `input.test`, `runner.test`, `test-runner`. Hàng rào/đèn đường/cây có va chạm từ dữ liệu. |
| S02 | Danh mục sản phẩm & dữ liệu catalog | ✅ | `game-data/products.ts`, `catalog-source.csv`, `catalog-manifest.ts` | Tài liệu nêu 56 món + 4 món Tết/Trung Thu; số chính xác **không đếm lại** (manifest 335 dòng nguồn, phần lớn `unsupported/deferred`). Test `catalog.test`. |
| S03 | Nhập hàng nhiều mối, giao hôm sau/ngay, hàng chờ | ✅ | `core/suppliers`(trong `simulation.ts`), `game-data/suppliers.ts`, `supplier-market.ts`, `SupplierModal.tsx` | 3 mối (giá/chiết khấu/phụ phí/đơn tối thiểu), giỏ nguyên tử, hàng chờ khi kho mát đầy. Test `suppliers.test`, `supplier-market.test`. |
| S04 | Lô hàng FEFO, hạn dùng, hư hỏng, tiêu hủy | ✅ | `core/stock.ts`, `spoilage.ts`, `game-data/spoilage.ts` | Hao hạn theo điều kiện bảo quản × sự kiện mất điện; `dispose_stock`. **Chưa có nút tiêu hủy trong UI kho** (theo tài liệu); điều kiện suy từ `storageType`, không theo từng tủ. Test `spoilage.test`, `warehouse.test`. |
| S05 | Sổ cái & báo cáo ngày (GAAP đơn giản) | ✅ | `simulation.ts` (ledger, `DailyRecord`), `ledger.test`, `CashierModal.tsx` | COGS theo lô thực, chốt ngày idempotent. Thưởng nằm ngoài sổ GAAP (có chủ ý). |
| S06 | Gợi ý nhập, sơ đồ kệ (planogram), tự nhập theo luật | ✅ | `core/suggestions.ts`, `forecast.ts`, `planogram.test`, `SupplierModal.tsx` | Tính vận tốc bán 3/7 ngày, đơn đang về, hệ số mùa/thời tiết, kẹp hàng tươi. Test `suggestions.test` (475 dòng), `forecast.test`. |
| S07 | Khách NPC, giỏ nhiều món, hàng đợi thu ngân, checkout idempotent | ✅ | `core/customers.ts` (595), `simulation.ts` | Nhiều khách đồng thời, người chơi/AI thu ngân. Trần khách đồng thời theo cấp (2/3/4/5). Cân bằng nhịp khách **chưa playtest** (🔍 S39). Test `customers.test`, `integration.test`. |
| S08 | Giá bán người chơi đặt + đánh giá sao/uy tín | ✅ | `core/price.ts`, `reputation.ts`, `ShelfModal.tsx` | Dải 0,8–1,3, bước 100 ₫; sao theo lượt (30 gần nhất) ảnh hưởng traffic. Test `price.test`. Chưa có review chữ (S44). |
| S09 | Thị trường: nhu cầu, sự kiện, dự báo, kế hoạch tồn | ✅ | `core/market.ts`, `demand.ts`, `game-data/market-events.ts`, `modifiers.ts`, `MarketModal.tsx` | Test `market.test`, `market-events.test`, `scenarios.test`, `performance.test`; `balance-sweep.ts` (script). Hằng số cân bằng chưa đổi sau playtest. |
| S10 | Thời tiết 8 loại, dải mưa, dự báo khung giờ | ✅ | `core/weather.ts`, `game-data/weather.ts` | Seed xác định; `rainForecastForDay` khớp thực tế. Hành vi khách/xe vẫn dùng ngưỡng mưa 0,4 (chưa dùng dải). Test `rain.test`. |
| S11 | Khách quen hẻm (6 nhân vật) | ✅ | `core/regulars.ts`, `game-data/regulars.ts`, `RegularsModal.tsx` | Ghé theo seed ngày, thân thiết (+2/ngày), đặc quyền. Test `regulars.test`. |
| S12 | Nhiệm vụ ngày, mục tiêu dài hạn, nhiệm vụ tuần | ✅ | `core/quests.ts`, `goals.ts`, `game-data/goals.ts`, `QuestModal.tsx` | Nhận thưởng một lần, idempotent. Test `quests.test`, `goals.test`. |
| S13 | Đơn tiệc (FEFO, ghi sổ) | ✅ | `core/party-orders.ts`, `game-data/partyOrders.ts` | Test `party-orders.test`. |
| S14 | Mùa, ngày hội, mục tiêu ngày hội, quầy ăn uống | ✅ | `game-data/seasons.ts`, `core/stalls.ts`, `goals.ts`, `StallModal.tsx` | Quầy bán theo mô hình **nhu cầu tổng hợp** (`processStalls`), không có NPC ghé quầy (xem S33). Ân hạn 1 ngày nhận thưởng. Test `seasons.test`, `goals.test`. |
| S15 | Kỹ năng & 9 perk | ✅ | `core/skills.ts`, `game-data/skills.ts`, `SkillsModal.tsx` | Chín modifier nối vào simulation. Test `skills.test`, `perks.test`. Cân bằng chưa playtest. |
| S16 | Danh hiệu cột mốc (9) | ✅ | `core/titles.ts`, `TitlesModal.tsx` | Test `titles.test`. |
| S17 | Giao thông hẻm & phương thức đến (walk/motorbike/car) — logic | ✅ | `core/street-traffic.ts`, `game-data/map.ts`, `customers.ts` | Làn, đỗ lề, trần 2 actor, không va chạm. Test `street-traffic.test`. Hình ảnh xem S33. **Lưu ý:** đèn/nhường đường đã thêm vào `street-traffic.ts` ở commit `24a2fab` (S46). |
| S18 | Server HTTP: world, ACL, invite, receipt, commit nguyên tử | ✅ | `apps/server/src/world.repository.ts`, `bootstrap.ts`, `auth.guard.ts`, `firebase-admin.ts` | Test `world.repository.test` (Mongo thật). Chưa test qua Firebase guard thật (S36). |
| S19 | WS gateway + `WorldRuntime` (avatar authoritative, time-vote, session) | ✅ | `world.gateway.ts`, `core/world-runtime.ts`, `avatars.ts` | Test `world.gateway.test`, `world-runtime.test`, `avatars.test`. Chưa test reconnect trình duyệt (S38). |
| S20 | Công cụ debug giờ/ngày/mưa (chỉ dev) | ✅ | `apps/web/src/main.tsx`, `renderer/debug-time.ts` | Chỉ hiển thị, không đổi save/mô phỏng; chỉ bật khi `import.meta.env.DEV`. |
| S21 | Nhân viên (tuyển, ca, lương, AI châm kệ/thu ngân, bảo vệ xe) | 🟡 | `core/staff.ts`, `simulation.ts`, `StaffModal.tsx`, `viewport.ts` (workerSprites) | Có logic + test (`staff.test`, `workers.test`) và **có render** (`viewport.ts:921`). Thiếu: lệnh nhân viên không nằm trong danh sách server-replay; `layout_batch` bị chặn khi có `workerTask`; chưa browser QA vòng 3 ngày; vị trí bảo vệ hard-code `(4*32, 13*32)`. |
| S22 | Co-op: replay lệnh phía server | 🟡 | `apps/server/src/bootstrap.ts:83-190`, `world-runtime.ts` | Server replay `respond/fulfill_party_order, claim_goal, claim_weekly_quest, claim_festival_goal, choose_perk, set_title` + `layout_batch`. `WorldRuntime` biết thêm `restock, unstock, checkout, set_price, order_supplier, buy_stall, dispose_stock, claim_quest, buy_plot...` nhưng đường commit **không** replay chúng (I-01). Test `coop-commands.test` gọi controller trực tiếp. |
| S23 | Bố cục cửa hàng & mua đất mở rộng | 🟡 | `core/store-layout.ts`, `game-data/land.ts`, `StoreLayoutModal.tsx` | Editor khi đóng cửa, validation, save schema 3, migration có backup. Còn mở (OpenSpec 6 task): mobile, 2-session, routing sau layout, giá đất 250k/600k chưa cân bằng. |
| S24 | Mặt đường: vạch, cống, vạch qua đường | 🟡 | `renderer/road-surface.ts` (commit 2f2af38), `viewport.ts`, `game-data/map.ts` (`ROAD_PROFILE`, `STORM_DRAINS`, `CROSSWALK`) | Mặt cắt/cống/vạch lấy từ dữ liệu bản đồ, đã commit. Cống/vạch là **hình ảnh**, không có thoát nước thật; chưa xem browser. Phần đèn tín hiệu tách ra S46. |
| S46 | Đèn tín hiệu chu kỳ, người đi bộ qua đường, xe nhường đường | 🟡 | `core/traffic-signal.ts` (+`.test.ts`), `core/street-traffic.ts`, `game-data/traffic.ts`, `renderer/street-signal.ts`, `viewport.ts`, `shared` (`TrafficSignalState`, `StreetPedestrianState`) | **Có code, đã commit `24a2fab`, kèm OpenSpec `traffic-light-crosswalk-yielding` (tasks 1–3 và 4.1 đánh [x], 4.2–4.6 còn mở).** Pha xanh 26/vàng 3/đỏ 15 s; người đi bộ chờ đèn walk rồi qua; xe dừng trước vạch khi đèn không xanh hoặc có người qua, giữ khoảng cách xe trước. Typecheck + `yarn test` PASS ngày 2026-10-01 (tôi chạy trước commit 24a2fab); `yarn build` PASS ngày 2026-10-01 sau commit 24a2fab (892 modules). Browser QA mới thấy hình tĩnh (đèn đổi pha/xe dừng/người qua chưa xem được, task 4.2); chưa đo hiệu năng (4.4); chưa rõ ảnh hưởng tới thời gian đến cửa của khách đi xe (`customers.ts`); đồng bộ đèn giữa client và khách thật qua đường là **non-goal có chủ ý** của change (giao thông hẻm ambient cục bộ, không lưu): `signalClock` về 0 khi `reset`, hai client co-op có thể lệch pha (task 4.5). Người đi bộ chỉ hình ảnh, không phải khách. |
| S25 | Độ ướt mặt đường | ✅ | `core/weather.ts` `roadWetnessAt`, `simulation.ts getRoadWetness`, `renderer/road-surface.ts`, `road.test.ts` | Đã commit (2f2af38): hàm thuần có test, renderer gọi `setWetness` (`viewport.ts:1050`). Chỉ hình ảnh, chưa kiểm browser. |
| S26 | Menu khởi đầu, đăng nhập, sổ tay hướng dẫn | 🟡 | `LoginScreen.tsx` (1.004 dòng), `AccountBar.tsx` | Có Chơi tiếp/Chơi mới/Hẻm chung/Cách chơi/sổ tay. Bảng xếp hạng là dữ liệu giả (S28). |
| S27 | Thuế: registry quy tắc + theo dõi doanh thu năm | 🟡 | `core/tax/*`, `TaxModal.tsx`, `docs/tax/*` | Registry khóa `UNVERIFIED`; modal chỉ hiển thị doanh thu năm so ngưỡng tham khảo, **không tính/trừ thuế**. Engine xem S41. |
| S28 | Bảng xếp hạng ("Bảng vàng thành tích") | 🔴 | `LoginScreen.tsx:896-940` | Danh sách **cứng** ("Tiệm Cô Tư Hẻm 4 15.420.000₫"…), không có API/DB; chữ trong UI nói sẽ cập nhật khi có máy chủ. Hiện như dữ liệu thật. |
| S29 | Lưu cục bộ (Dexie/IndexedDB) | 🔵 | `apps/web/src/db.ts` | Chạy tốt: revision tuần tự, backup 1 bản, migration schema 2→3 có backup, lỗi đọc **không** ghi đè save (đã sửa so với tài liệu cũ), màn khôi phục. Thiếu: nhiều slot, export/import file, xử lý nhiều tab. |
| S30 | HUD/Modal/UI pixel | 🔵 | `components/*`, `pixel/index.tsx`, `index.css` | Chức năng đủ; `App.tsx` gom ~34 hook/handler; `LoginScreen.css` 1.872 dòng; cần chia nhỏ và QA bàn phím/focus. |
| S31 | Ánh sáng theo mùa, vị trí mặt trời, bóng cây | 🔵 | `core/lighting-phase.ts`, `tree-shadow.ts`, `renderer/viewport.ts` | Mốc mọc/lặn 12 điểm nội suy; bóng mỗi cây theo `TREE_PROPS`. Test `lighting-phase.test`, `tree-shadow.test`. Bóng là elip đơn giản, chưa theo mây, `height/crownRadius` chưa cân bằng mắt, mốc là xấp xỉ. |
| S32 | Kiểm thử & lint | 🔵 | `core/test-runner.ts` (48 hàm `run*Tests`), `eslint.config.mjs` | 45 file `*.test.ts` trong repo (kể cả server/shared); `yarn test` chỉ chạy `game-core`; test server cần Mongo và chạy tay; **không** test cho `apps/web`/renderer; không CI. |
| S33 | Đồ họa procedural: sprite, cảnh quan, xe, quầy, NPC bán hàng | 🔍 | `premium-textures.ts`, `textures.ts`, `viewport.ts` | Chỉ đánh giá được bằng mắt. NPC bán hàng sau quầy chỉ là sprite trang trí. |
| S34 | Ánh sáng trong tiệm/đèn đường/lớp tối | 🔍 | `renderer/shop-lighting.ts` | Cường độ vừa chỉnh giảm (chói tủ mát); chưa đo FPS, chưa cảm ứng thật. |
| S35 | Lên cấp 1–35, XP, mở khóa | 🔍 | `game-data/progression.ts`, `core/progression.ts`, `LevelRoadmapModal.tsx` | Có code; OpenSpec `level-progression-roadmap` còn 2 task mở; chưa playtest cấp cao. |
| S36 | Firebase Auth (Google/khách) | 🔍 | `services/firebase.ts`, `LoginScreen.tsx`, `auth.guard.ts` | Chưa nghiệm thu Google OAuth/Authorized domains thật; test server không qua token thật. |
| S37 | PWA (manifest + service worker) | 🔍 | `apps/web/public/manifest.webmanifest`, `sw.js`, `main.tsx` | **Có code** (đăng ký ở production). Tài liệu cũ ghi "chưa có PWA". Chưa kiểm cài đặt/offline/cập nhật. |
| S38 | Multiplayer đầu–cuối 2 trình duyệt | 🔍 | `useWorldSocket.ts`, `App.tsx`, OpenSpec `shared-alley-multiplayer` (11 mở) | Reconnect, mất mạng, restart server, interpolation partner, UI phiếu chưa kiểm. |
| S39 | Hiệu năng, responsive mobile, cân bằng kinh tế | 🔍 | toàn bộ | Chưa có số đo trên máy thật; headless cũ p95 ~67–83 ms. |
| S40 | Âm thanh trong game | ⚪ | — | Không có hệ phát âm thanh. Chỉ có chime Web Audio ở `LoginScreen.tsx:11-33`. |
| S41 | Engine tính/nộp thuế | ⚪ | `docs/tax/*` | Phụ thuộc thẩm định pháp lý (TAX-0). |
| S42 | Content editor (catalog/map) | ⚪ | `tools/content-editor/README.md` | Chỉ README. |
| S43 | CI/CD, formatter | ⚪ | — | Không có `.github`, không formatter. |
| S44 | Nhật ký đánh giá bằng chữ / khách quay lại theo review | ⚪ | — | Mới có sao + lý do walkout. |
| S45 | Nhiều cơ sở/ghé thăm tiệm khác | ⚪ | — | Được ghi "hướng sau". |

---

## 3. Vấn đề còn tồn tại và chênh lệch

### 3.1. Danh sách vấn đề

> "Xác nhận" chỉ dùng khi đã đọc đúng đoạn mã gây ra hành vi; còn lại ghi "Nghi vấn qua phân tích tĩnh".

### Bảng tóm tắt vấn đề

| ID | Vấn đề | Ưu tiên | Trạng thái |
|---|---|---|---|
| I-01 | Co-op: server chỉ replay một phần lệnh | High | Mở |
| I-02 | Bảng xếp hạng dữ liệu giả | Medium | Mở |
| I-03 | Quyền sửa bố cục cho mọi thành viên chưa ghi spec | Medium | Mở (code đã commit) |
| I-04 | ID `Date.now()/Math.random()` | Medium | Mở |
| I-05 | Nhân viên chưa vào co-op | Medium | Mở |
| I-07 | Tài liệu lạc hậu | Medium | Mở |
| I-08 | Service worker version cố định | Low | Mở |
| I-09 | Test server ngoài `yarn test` | Medium | Mở |
| I-10 | Bundle lớn | Low | Mở |
| I-11 | `server/main.ts` lỗi thời | Low | Mở |
| I-12 | Save local một slot | Medium | Mở |
| I-13 | Mưa chỉ dùng ngưỡng 0,4 | Low | Mở |
| I-14 | Khóa bí mật trong thư mục dự án | Low | Mở |
| I-15 | Server không giới hạn payload/tần suất | Medium | Mở |
| I-16 | Chưa có migration schema world Mongo | Medium | Mở |
| I-17 | Thiếu tài liệu triển khai/vận hành | Low | Mở |
| I-18 | A11y/cảm ứng chưa kiểm | Low | Mở |
| I-19 | Đèn tín hiệu: QA browser dở, pha không đồng bộ co-op (chủ ý) | Medium | Mở |
| I-06 | Hằng số đường chưa nối | Low | Đã đóng 2026-10-01 (commit 2f2af38) |

### Issue: I-01 Co-op: đa số lệnh do client quyết định, server chỉ kiểm hình học bố cục

- **Current State:** `commitCommand` nhận cả `updatedBusiness.save` từ client. Chỉ 7 lệnh (+ `layout_batch`) được server phát lại. Với các lệnh khác (nhập hàng, bán, đặt giá, bày kệ, mua quầy, tiêu hủy, nhận nhiệm vụ ngày…), nhánh `else` chỉ kiểm tra `sameLayout()` rồi lưu save do client gửi (`bootstrap.ts` ~164-186). `WorldRuntime.executeCommand` đã hiểu các lệnh này (`world-runtime.ts:190-234`) nhưng không được dùng ở đây.
- **Expected State:** Mọi lệnh làm đổi tiền/kho/tiến độ đều được server phát lại hoặc kiểm bất biến (tiền, kho, XP) trước khi ghi.
- **Impact:** Nghi vấn qua phân tích tĩnh: một client sửa đổi có thể gửi save có tiền/kho/XP tùy ý và được ghi vào hẻm chung. Ảnh hưởng độ tin cậy co-op, bảng xếp hạng tương lai.
- **Related Files:** `apps/server/src/bootstrap.ts`, `packages/game-core/src/world-runtime.ts`, `apps/web/src/App.tsx` (`persistSimulationMutation`).
- **Root Cause:** Mô hình ban đầu "client xuất save"; replay được thêm dần cho từng lệnh.
- **Suggested Fix:** Mở rộng `serverReplayedCommands` cho mọi lệnh `WorldRuntime` đã hỗ trợ; từ chối commit khi `payload.type` không nằm trong danh sách; thêm test như `coop-commands.test.ts` cho từng lệnh.
- **Tiến độ 2026-10-01 (một phần):** `bootstrap.ts` nay có `ALLOWED_COMMAND_TYPES` và từ chối loại lệnh lạ ("Loại lệnh không được hỗ trợ"); `coop-commands.test.ts` có ca `give_money` bị từ chối. **Chưa giải quyết lõi I-01:** các lệnh client vẫn gửi (`set_price`, `restock`, `unstock`, `checkout`, `order`, `stow*`, `planogram_*`, `auto_restock`, `store_status`, `buy_stall`, `claim_quest`, `advance_day`, `change_speed`) vẫn tin save client. Không thể chỉ thêm vào danh sách replay vì payload client lệch `WorldRuntime` (client gửi `order` còn runtime là `order_supplier`; `checkout` thiếu `checkoutId`; `store_status`, `stow*`, `planogram_*`, `auto_restock` runtime chưa có).
- **Priority:** High
- **Verification:** Chưa tái hiện. Cần test: gửi save sửa tiền với payload `restock` và kiểm bị từ chối. Liên kết: OpenSpec `shared-alley-multiplayer`; test dự kiến `apps/server/src/coop-commands.test.ts` (thêm ca lệnh không replay).

### Issue: I-02 Bảng xếp hạng là dữ liệu giả

- **Current State:** `LoginScreen.tsx` hiển thị các tiệm và doanh thu viết cứng.
- **Expected State:** Dữ liệu từ server hoặc ẩn/ghi rõ "minh họa".
- **Impact:** Người chơi hiểu nhầm; tài liệu cũ liệt kê như tính năng.
- **Related Files:** `apps/web/src/components/LoginScreen.tsx:896-940`.
- **Root Cause:** Placeholder UI chưa nối backend.
- **Suggested Fix:** Ẩn mục hoặc thêm API `/leaderboard` (xem Feature F-05); sau I-01.
- **Priority:** Medium
- **Verification:** Xác nhận bằng đọc mã.

### Issue: I-03 Quyền sửa bố cục chuyển từ chủ hẻm sang mọi thành viên (đã commit 46f7466; còn thiếu quyết định thiết kế)

- **Current State:** `git diff` cho thấy `layout_batch` giờ cho mọi `membership` sửa bố cục và mua đất; test mới trong `coop-commands.test.ts` cố ý kiểm điều đó.
- **Expected State:** Quyết định thiết kế được ghi nhận (OpenSpec/tài liệu), vì mua đất tiêu **quỹ chung**.
- **Impact:** Thành viên có thể tiêu tiền chung; thông báo lỗi/comment lẫn tiếng Anh–Việt.
- **Related Files:** `apps/server/src/bootstrap.ts:~138`, `apps/server/src/coop-commands.test.ts`, `shared-alley-multiplayer` spec.
- **Root Cause:** Thay đổi đang dở, chưa đồng bộ tài liệu.
- **Suggested Fix:** Xác nhận ý đồ, ghi vào spec; cân nhắc giới hạn mua đất cho chủ.
- **Priority:** Medium
- **Verification:** Test mới chưa được chạy trong kiểm kê này.

### Issue: I-04 ID sinh bằng `Date.now()` + `Math.random()` trong lõi mô phỏng

- **Current State:** `simulation.ts:1542` (id sổ cái) và `:2420` (id đơn nhập) không xác định.
- **Expected State:** ID suy ra từ trạng thái/seed hoặc do lệnh cung cấp.
- **Impact:** Nghi vấn: phát lại cùng lệnh trên server/client cho ID khác nhau, khó so sánh/replay/test snapshot. Server hiện trả save chuẩn hóa nên rủi ro chưa thành lỗi rõ.
- **Related Files:** `packages/game-core/src/simulation.ts`.
- **Root Cause:** Sinh ID tiện lợi ở giai đoạn đơn người chơi.
- **Suggested Fix:** Bộ đếm tuần tự trong save hoặc `commandId` + chỉ số.
- **Priority:** Medium
- **Verification:** Cần test replay hai lần so sánh ID.

### Issue: I-05 Nhân viên chưa tham gia co-op đầy đủ

- **Current State:** Lệnh thuê/ca/giao việc không nằm trong replay; `layout_batch` bị từ chối khi có `workerTask`.
- **Expected State:** Nhân viên hoạt động nhất quán trong world chung.
- **Impact:** Có thể lệch trạng thái hoặc chặn sắp xếp tiệm.
- **Related Files:** `bootstrap.ts`, `world-runtime.ts`, `staff.ts`.
- **Root Cause:** Staff phát triển sau schema co-op.
- **Suggested Fix:** Thêm lệnh `hire_staff`, `set_staff_shift`, `assign_refill` vào runtime và danh sách replay.
- **Priority:** Medium
- **Verification:** Nghi vấn qua phân tích tĩnh; cần test hai tài khoản.

### Issue: I-06 [ĐÃ XỬ LÝ 2026-10-01] Mã dở dang chưa nối: độ ướt mặt đường và hằng số đường

- **Current State:** Lúc kiểm kê đầu các hàm/hằng số này chưa có nơi tiêu thụ/test. Đã giải quyết bởi commit 2f2af38 (`road-surface.ts`, `road.test.ts`, OpenSpec `road-cross-section-drainage`). Giữ lại làm lịch sử.
- **Expected State:** Renderer đọc hoặc bỏ mã chưa dùng.
- **Impact:** Mã chết, dễ bị hiểu là tính năng đã xong.
- **Related Files:** `core/weather.ts`, `simulation.ts`, `game-data/map.ts`.
- **Root Cause:** Công việc đang làm dở (working tree chưa commit).
- **Suggested Fix:** Hoàn thành change "đường ướt/cống" kèm test, hoặc hoàn nguyên.
- **Priority:** Low
- **Verification:** `grep` toàn repo chỉ thấy định nghĩa.

### Issue: I-07 Tài liệu `tổng hợp.md` lạc hậu so với mã

- **Current State:** Xem mục 3.2.
- **Expected State:** Tài liệu phản ánh mã.
- **Impact:** Quyết định sai (ví dụ làm lại PWA, "sửa" lỗi đã sửa).
- **Related Files:** `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `docs/README.md`.
- **Root Cause:** Bảng ghi chú chồng lớp theo thời gian, nhiều đoạn "cũ" không gạch bỏ.
- **Suggested Fix:** Dùng `THONG-KE.md` làm bản chuẩn; rút gọn/đánh dấu lịch sử trong `tổng hợp.md`.
- **Priority:** Medium
- **Verification:** Đối chiếu trực tiếp mã.

### Issue: I-08 Service worker: phiên bản cache cố định và đường dẫn tuyệt đối

- **Current State:** `sw.js` dùng `VERSION='v1'`; đăng ký tại `/sw.js` (tuyệt đối) trong khi manifest dùng `./`.
- **Expected State:** Phiên bản gắn build; đường dẫn tương đối nếu triển khai dưới subpath.
- **Impact:** Nghi vấn: máy khách có thể giữ tài nguyên cũ; không chạy nếu host dưới subpath. Điều hướng luôn network-first nên ít rủi ro trên Vercel gốc.
- **Related Files:** `apps/web/public/sw.js`, `apps/web/src/main.tsx`.
- **Root Cause:** Chưa quy trình bump version.
- **Suggested Fix:** Sinh `VERSION` từ hash build; dùng `import.meta.env.BASE_URL`.
- **Priority:** Low
- **Verification:** Cần kiểm cập nhật hai bản build trên trình duyệt.

### Issue: I-09 Test server không nằm trong `yarn test` và cần Mongo

- **Current State:** Root `test` chỉ chạy `packages/game-core`; `test:worlds/gateway/coop` chạy tay, cần `MONGO_URI`.
- **Expected State:** Một lệnh/CI chạy toàn bộ, test server có thể bỏ qua rõ ràng khi thiếu DB.
- **Impact:** Hồi quy co-op không tự phát hiện.
- **Related Files:** `package.json`, `apps/server/package.json`.
- **Root Cause:** Chưa có CI.
- **Suggested Fix:** Script `test:all`, Mongo in-memory/service trong CI.
- **Priority:** Medium
- **Verification:** Xác nhận qua `package.json`.

### Issue: I-10 Bundle lớn và import `api.ts` vừa tĩnh vừa động

- **Current State:** Tài liệu ghi chunk >500 kB (index ~699 kB, vendor-pixi ~547 kB) và cảnh báo import kép.
- **Expected State:** Code-splitting hợp lý (màn đăng nhập, modal).
- **Impact:** Thời gian tải đầu trên mobile.
- **Related Files:** `apps/web/vite.config.ts`, `services/api.ts`.
- **Root Cause:** Chưa tách động; chunk React tách vòng từng gây lỗi (đã bỏ).
- **Suggested Fix:** `React.lazy` cho modal lớn; thống nhất kiểu import.
- **Priority:** Low
- **Verification:** Build 2026-10-01 xác nhận: index 710,53 kB, vendor-pixi 547,40 kB, cảnh báo chunk >500 kB và import kép `api.ts` còn nguyên.

### Issue: I-11 `apps/server/src/main.ts` lỗi thời

- **Current State:** File chứa "hợp đồng REST" (`/api/v1/game/save`…) dạng comment, không phải route thật; runtime thật là `bootstrap.ts`.
- **Expected State:** Xóa hoặc cập nhật.
- **Impact:** Gây hiểu nhầm API.
- **Related Files:** `apps/server/src/main.ts`.
- **Root Cause:** Phase 0 bị bỏ lại.
- **Suggested Fix:** Xóa hoặc thay bằng tài liệu route thực.
- **Priority:** Low
- **Verification:** Xác nhận qua đọc mã.

### Issue: I-12 Save cục bộ chỉ một slot, không xuất/nhập, chưa xử lý nhiều tab

- **Current State:** `db.ts` một slot + một backup; `persistSave` ném lỗi khi revision lệch.
- **Expected State:** Có export/import file; thông báo thân thiện khi hai tab.
- **Impact:** Mất tiến trình nếu xóa dữ liệu trình duyệt; lỗi khó hiểu khi mở hai tab.
- **Related Files:** `apps/web/src/db.ts`, `App.tsx`.
- **Root Cause:** Phạm vi MVP.
- **Suggested Fix:** Nút xuất/nhập JSON (dùng `validateSaveGameData`), khóa tab (`BroadcastChannel`).
- **Priority:** Medium
- **Verification:** Xác nhận qua đọc mã.

### Issue: I-13 Hành vi mưa/đường chỉ dùng ngưỡng cố định

- **Current State:** `customers.ts`/`street-traffic.ts` dùng ngưỡng 0,4; không dùng 5 dải `RAIN_BANDS`.
- **Expected State:** Hành vi khách/xe theo dải.
- **Impact:** Dự báo "Mưa giông" không khác gameplay "mưa vừa".
- **Related Files:** `core/customers.ts`, `street-traffic.ts`, `game-data/weather.ts`.
- **Root Cause:** OpenSpec ghi rõ chưa làm.
- **Suggested Fix:** Bảng hệ số theo dải trong dữ liệu.
- **Priority:** Low
- **Verification:** Đọc mã.

### Issue: I-14 Tệp bí mật nằm trong thư mục dự án

- **Current State:** `hem-buon-firebase-adminsdk-*.json` ở root (không bị git theo dõi, đã `.gitignore`), cùng `debug.log`.
- **Expected State:** Khóa ngoài repo; dùng biến môi trường.
- **Impact:** Rủi ro lộ khi nén/chia sẻ thư mục.
- **Related Files:** root, `.gitignore`, `apps/server/src/firebase-admin.ts`.
- **Root Cause:** Fallback `GOOGLE_APPLICATION_CREDENTIALS` cục bộ.
- **Suggested Fix:** Chuyển sang env/secret store; cân nhắc xoay khóa nếu từng chia sẻ thư mục.
- **Priority:** Low
- **Verification:** `git ls-files` không chứa; `git check-ignore` xác nhận bị bỏ qua.

### Issue: I-15 Server chưa giới hạn payload/tần suất và tin save của client

- **Current State:** `commitCommand` nhận cả `updatedBusiness.save` (xem I-01); chưa thấy rate limit REST/WS hay giới hạn kích thước save (nghi vấn qua phân tích tĩnh, chưa kiểm cấu hình Nest).
- **Expected State:** Giới hạn body, rate limit theo uid/IP, validate save bằng `validateSaveGameData` và bất biến tài nguyên trước khi ghi.
- **Impact:** Lạm dụng/DoS nhẹ, ghi document Mongo quá lớn.
- **Related Files:** `apps/server/src/bootstrap.ts`, `world.gateway.ts`, `world.repository.ts`.
- **Root Cause:** Ưu tiên chạy được co-op trước.
- **Suggested Fix:** Throttler cho REST, giới hạn kích thước message WS, giới hạn kích thước save khi commit.
- **Priority:** Medium
- **Verification:** Cần đọc lại cấu hình Nest và test tải.

### Issue: I-16 Chưa có kế hoạch migration schema phía world Mongo

- **Current State:** Migration 2→3 chỉ có phía Dexie (local) có backup. Document world trên Mongo chứa save; tính năng cần schema 4 (ví dụ F-01) sẽ phải nâng cả world đang tồn tại.
- **Expected State:** Quy trình nâng schema world có backup/rollback.
- **Impact:** Rủi ro hỏng hẻm chung khi nâng schema.
- **Related Files:** `packages/shared` (validator), `apps/server/src/world.repository.ts`.
- **Root Cause:** Chưa gặp nhu cầu.
- **Suggested Fix:** Hàm migrate dùng chung trong `shared`, chạy khi load world, kèm test fixture schema cũ.
- **Priority:** Medium
- **Verification:** Chưa kiểm; ghi nhận từ đọc kiến trúc.

### Issue: I-17 Thiếu thông tin triển khai/vận hành

- **Current State:** Chưa có tài liệu nơi deploy, danh sách biến môi trường bắt buộc, sao lưu Mongo, logging/monitoring. Mới có I-14 về khóa Firebase.
- **Expected State:** Một mục trong `docs/` mô tả deploy, env, backup, giám sát.
- **Impact:** Khó dựng lại môi trường, khó xử lý sự cố.
- **Related Files:** `apps/web/vite.config.ts`, `apps/server/src/bootstrap.ts`.
- **Root Cause:** Chưa ưu tiên.
- **Suggested Fix:** Viết `docs/deploy.md`, liệt kê tên biến (không ghi giá trị).
- **Priority:** Low
- **Verification:** Chưa kiểm.

### Issue: I-18 Khả năng truy cập, cảm ứng và chỉ landscape

- **Current State:** Chỉ landscape (overlay xoay); QA bàn phím/focus chưa làm (S30); chưa kiểm `prefers-reduced-motion`/đọc màn hình.
- **Expected State:** Checklist a11y tối thiểu cho modal/HUD và kiểm cảm ứng thật.
- **Impact:** Người dùng bàn phím/cảm ứng gặp khó; không rõ mức hỗ trợ.
- **Related Files:** `apps/web/src/components/*`, `index.css`.
- **Root Cause:** Ưu tiên chức năng.
- **Suggested Fix:** Checklist focus trap/phím tắt/aria cho modal; thử trên thiết bị thật.
- **Priority:** Low
- **Verification:** Chưa kiểm.

### Issue: I-19 Đèn tín hiệu: QA browser còn dở, pha không đồng bộ co-op (chủ ý)

- **Current State:** Xem S46 (commit `24a2fab`). Thay đổi trải qua `shared`, `game-data`, `game-core`, `game-renderer`; `signalClock` là bộ đếm cục bộ trong `StreetTrafficManager`, không nằm trong save.
- **Expected State:** Hoàn tất QA browser (4.2–4.4) và quyết định giữ ambient cục bộ hay đồng bộ pha đèn giữa hai client (4.5).
- **Impact:** Nguy cơ lệch hình ảnh giữa hai người chơi; tính năng chưa được theo dõi chính thức.
- **Related Files:** `core/street-traffic.ts`, `core/traffic-signal.ts`, `game-data/traffic.ts`, `renderer/street-signal.ts`.
- **Root Cause:** Non-goal của change hiện tại; QA bị chặn vì Browser pane ẩn làm game giảm tốc.
- **Suggested Fix:** Chạy QA khi pane hiển thị; nếu cần đồng bộ co-op, suy pha từ thời gian mô phỏng chung (`trafficSignalAt(elapsed)` đã là hàm thuần) thay vì `signalClock` cục bộ.
- **Priority:** Medium
- **Verification:** Typecheck + test lõi PASS (2026-10-01); chưa chạy browser.

### 3.2. Chênh lệch giữa tài liệu và mã (mã là sự thật)

| # | Tài liệu nói | Thực tế trong mã |
|---|---|---|
| 1 | PWA "Chưa có manifest/service worker" (`tổng hợp.md` §2.1, §4) | Có `manifest.webmanifest`, `sw.js`, đăng ký ở production (`main.tsx`) |
| 2 | "Nhân viên chưa được render" | `viewport.ts` có `workerSprites` vẽ tối đa 4 nhân viên |
| 3 | P1: toast `handleAutoRestock` cộng lượng yêu cầu | Đã dùng `actualQuantity` thực chuyển (`App.tsx:1107-1135`) |
| 4 | P1: lỗi đọc DB fallback về game mới | `db.ts` ném lỗi, không ghi đè; `App.tsx` có màn Thử lại/Khôi phục/Khởi tạo mới |
| 5 | NestJS "chưa có API auth/world/realtime" | Có đủ REST world/invite/commit + WS gateway |
| 6 | Mongo cần replica set/transaction | Đã bỏ; commit `updateOne` nguyên tử trên standalone |
| 7 | `FestivalGoal` "chỉ metadata" (dòng lịch sử) | Đã có logic nhận thưởng, UI, replay (phần đầu `tổng hợp.md` đúng, dòng lịch sử cũ sai) |
| 8 | "Bảng xếp hạng" như tính năng menu | Dữ liệu cứng (S28) |
| 9 | Đợt E: "đèn giao thông, cống, vạch qua đường" | Cống/vạch: hình ảnh đã commit (S24). Đèn tín hiệu + nhường đường: có logic, đã commit 24a2fab (S46) |
| 10 | `TASKS.md`/`ROADMAP.md` nhắc pnpm | Dự án dùng Yarn 1 |
| 11 | Số test "10 nhóm"/"18 nhóm" | `test-runner.ts` có 48 lời gọi `run*Tests` (45 file `*.test.ts`) |

---

## 4. Tính năng còn thiếu

**Required** (cần để hoàn thành hệ thống đã xây):
- Replay phía server cho mọi lệnh làm đổi tài nguyên (I-01) — hệ co-op đã khai báo "authoritative".
- Lệnh nhân viên trong co-op (I-05).
- Nút tiêu hủy hàng trong UI kho (core đã có `dispose_stock`).
- Đồng bộ tài liệu tiến độ (I-07).
- Browser QA/Playtest các gate đang mở trong OpenSpec (tổng 45 task `[ ]` — xem mục 6).

**Recommended:**
- Xuất/nhập save file, nhiều slot (I-12).
- Hành vi khách/xe theo dải mưa (I-13). (Độ ướt mặt đường đã nối renderer, S25 ✅.)
- Hoàn tất đèn tín hiệu + nhường đường (S46, I-19): QA browser/hiệu năng (tasks 4.2–4.4), quyết định đồng bộ co-op/khách thật qua đường (4.5).
- Giới hạn payload/tần suất server (I-15), migration schema world (I-16), tài liệu triển khai (I-17), a11y (I-18).
- Test `apps/web` (hook/modal) và CI (S32, S43).
- Âm thanh môi trường/UI (S40).

**Optional:** engine thuế (sau thẩm định), content editor, bảng xếp hạng thật, review chữ, nhiều chi nhánh, cải thiện hình bóng/mây.

---

## 5. Đề xuất tính năng mới (chỉ lập kế hoạch)

### Feature: F-01 Hao mòn & sửa chữa nội thất
- **Purpose:** Chi phí duy trì và quyết định bảo trì.
- **Why It Fits:** Fixture/layout/ledger/nhân viên đã có; game tham khảo có `maintenance`.
- **Gameplay / UX Value:** Quyết định đầu tư vs. rủi ro hỏng tủ mát (hàng lạnh hao nhanh — dùng lại `spoilage`).
- **Integration Points:** `store-layout`, `ledger`, `spoilage`, `StaffModal` (thợ sửa).
- **Dependencies:** Trường mới trong save (migration schema 4), lệnh replay.
- **Implementation Complexity:** Medium
- **Potential Risks:** Cân bằng; tăng độ phức tạp save.
- **Priority:** Medium

### Feature: F-02 Đánh giá bằng chữ gắn lý do + khách quen quay lại
- **Purpose:** Phản hồi giải thích được.
- **Why It Fits:** Đã có sao, `CustomerFeedbackReason`, regulars.
- **Gameplay / UX Value:** Biết vì sao khách bỏ đi, hành động theo.
- **Integration Points:** `reputation.ts`, `regulars.ts`, `DaySummaryModal`.
- **Dependencies:** Bảng câu thoại tiếng Việt trong `game-data`.
- **Implementation Complexity:** Low
- **Potential Risks:** Nội dung lặp; giữ chọn câu theo seed để xác định.
- **Priority:** High

### Feature: F-03 Đèn tín hiệu chu kỳ & nhường đường — đã commit 24a2fab, QA browser dở (S46)
- **Purpose:** Biến trang trí đường thành hệ thống nhất quán.
- **Why It Fits:** `street-traffic`, `CROSSWALK`, arrival mode.
- **Gameplay / UX Value:** Nhịp xe dừng/đi tạo cửa sổ cho khách đi bộ.
- **Integration Points:** `street-traffic.ts`, `viewport.ts`, thời tiết.
- **Dependencies:** Pha đèn là hàm thuần theo thời gian game.
- **Implementation Complexity:** Medium
- **Potential Risks:** Hiệu năng actor; giữ trần actor.
- **Priority:** Medium (đã có code)

### Feature: F-04 Xuất/nhập save + sao lưu có tên
- **Purpose:** Bảo vệ tiến trình.
- **Why It Fits:** `validateSaveGameData`, migration, backup đã có.
- **Gameplay / UX Value:** An tâm, chuyển máy.
- **Integration Points:** `db.ts`, `SaveModal`.
- **Dependencies:** Không.
- **Implementation Complexity:** Low
- **Potential Risks:** Nhập save online sai phạm vi (chỉ cho local).
- **Priority:** High

### Feature: F-05 Bảng xếp hạng thật (hẻm/tuần)
- **Purpose:** Thay S28 bằng dữ liệu thật.
- **Why It Fits:** Mongo, `DailyRecord`, danh hiệu.
- **Gameplay / UX Value:** Mục tiêu dài hạn.
- **Integration Points:** server API, `LoginScreen`.
- **Dependencies:** **I-01** phải xong trước (chống gian lận).
- **Implementation Complexity:** Medium
- **Potential Risks:** Gian lận, quyền riêng tư (tên hiển thị).
- **Priority:** Medium

### Feature: F-06 Biểu đồ lịch sử giá/doanh số theo mặt hàng
- **Purpose:** Hỗ trợ quyết định đặt giá.
- **Why It Fits:** `DailyRecord.productSales`, giá override, thị trường.
- **Gameplay / UX Value:** Thấy tác động giá lên nhu cầu.
- **Integration Points:** `MarketModal`, `ShelfModal`.
- **Dependencies:** Lưu lịch sử đủ dài (đã có theo ngày).
- **Implementation Complexity:** Low
- **Potential Risks:** Kích thước save.
- **Priority:** Medium

### Feature: F-07 Âm thanh môi trường theo thời tiết/giờ
- **Purpose:** Tăng nhập vai.
- **Why It Fits:** Có thời tiết, ánh sáng, cửa/chuông.
- **Gameplay / UX Value:** Mưa, chuông cửa, đồng hồ giờ cao điểm.
- **Integration Points:** module audio web đọc simulation; tôn trọng `prefers-reduced-motion`/mute.
- **Dependencies:** Asset hoặc tổng hợp Web Audio.
- **Implementation Complexity:** Medium
- **Potential Risks:** Chính sách autoplay, dung lượng.
- **Priority:** Low

### Feature: F-08 Bản đồ nhiệt khách và lộ trình trong tiệm
- **Purpose:** Giúp người chơi tối ưu bố cục.
- **Why It Fits:** Đã có `pathfinding`, editor bố cục, khách NPC.
- **Gameplay / UX Value:** Thấy nút thắt hàng chờ, khu kệ ít người qua.
- **Integration Points:** `customers.ts`, `StoreLayoutModal`, lớp phủ renderer.
- **Dependencies:** Tổng hợp vị trí khách theo ô theo ngày (không lưu chi tiết vào save).
- **Implementation Complexity:** Medium
- **Potential Risks:** Chi phí vẽ lớp phủ trên mobile.
- **Priority:** Low

### Feature: F-09 Sự kiện ngẫu nhiên nhỏ (mất điện, kiểm tra vệ sinh, trộm vặt)
- **Purpose:** Thêm biến động vận hành.
- **Why It Fits:** `market-events`, `spoilage` (mất điện), nhân viên bảo vệ.
- **Gameplay / UX Value:** Quyết định phản ứng; bảo vệ có giá trị thật.
- **Integration Points:** `game-data/market-events.ts`, `staff.ts`, ledger.
- **Dependencies:** Seed theo ngày để xác định; lệnh replay nếu co-op.
- **Implementation Complexity:** Medium
- **Potential Risks:** Cân bằng, cảm giác bất công.
- **Priority:** Low

### Feature: F-10 Hướng dẫn trong game theo checklist cấp độ
- **Purpose:** Thay sổ tay tĩnh bằng onboarding có tiến độ.
- **Why It Fits:** `LevelRoadmapModal`, `QuestModal`, goals.
- **Gameplay / UX Value:** Người mới biết bước tiếp theo.
- **Integration Points:** `core/goals.ts`, sổ tay trong `LoginScreen`.
- **Dependencies:** Nội dung tiếng Việt trong `game-data`.
- **Implementation Complexity:** Low
- **Potential Risks:** Rườm rà với người chơi cũ (cho phép tắt).
- **Priority:** Medium

### Feature: F-11 Ghi lại và phát lại ngày chơi (replay)
- **Purpose:** Gỡ lỗi, chia sẻ, so sánh lệch client/server.
- **Why It Fits:** Mô phỏng bước cố định 1/60 s, seed xác định.
- **Gameplay / UX Value:** Xem lại một ngày.
- **Integration Points:** `simulation.ts`, log lệnh.
- **Dependencies:** I-04 (ID xác định) phải xong trước.
- **Implementation Complexity:** High
- **Potential Risks:** Kích thước log, phiên bản logic.
- **Priority:** Low

---

## 6. Hệ thống cần kiểm chứng thêm

Tất cả 🔍; không phải lỗi trừ khi có bằng chứng.

| ID | Cần kiểm chứng | Cách kiểm |
|---|---|---|
| S33 | Chất lượng/tỉ lệ sprite xe, cảnh quan, NPC | Browser ở độ phóng game, ảnh chụp |
| S34 | Ánh sáng 19–22h, bình minh, tủ mát | Dùng `?debugTime=`, nhiều viewport |
| S35 | Cân bằng XP cấp 1–35 | Playtest, `balance-sweep` mở rộng |
| S36 | Google OAuth, Authorized domains | Đăng nhập thật |
| S37 | Cài PWA, offline, cập nhật | Hai bản build |
| S38 | Reconnect, mất mạng, restart server, kick | Hai trình duyệt + failure injection |
| S39 | FPS/CPU/GPU, mobile thật, chơi lâu | Profiling máy thật |
| — | Thời tiết/ánh sáng chuyển tiếp mượt | Chơi một ngày đầy đủ |
| — | Bóng cây mobile (bị thanh UI che theo ghi chú cũ) | Thiết bị thật |
| — | Replay server vs client cùng kết quả | Test so sánh snapshot |

### Tiêu chí nghiệm thu đề xuất (chưa phải số đo thật)

| Hạng mục | Tiêu chí đề xuất | Hiện trạng |
|---|---|---|
| FPS (S39) | ≥ 45 FPS trung bình, p95 frame ≤ 33 ms trên máy mục tiêu; mobile tầm trung ≥ 30 FPS | Chưa đo (headless cũ p95 ~67–83 ms) |
| Tải cảnh | Không tụt FPS ở trần khách + xe + người đi bộ (S46) | Chưa đo |
| Co-op (S38) | Reconnect ≤ 10 s, không mất lệnh đã có receipt | Chưa kiểm |
| Save | Đóng/mở tab không mất quá 1 lệnh gần nhất | Chưa kiểm browser |

### Liên kết vấn đề, OpenSpec và test dự kiến

| Vấn đề | OpenSpec change | Test dự kiến |
|---|---|---|
| I-01, I-05, I-15 | `shared-alley-multiplayer` | `coop-commands.test.ts` (ca lệnh lạ, save sửa tiền, payload quá lớn) |
| I-03 | `store-layout-expansion`, `shared-alley-multiplayer` | Đã có ca thành viên gửi `layout_batch`; thêm ca giới hạn mua đất nếu đổi thiết kế |
| I-04 | (chưa có) | Replay hai lần, so sánh ID |
| I-13 | `rain-intensity-forecast` | `customers.test`/`street-traffic.test` theo dải |
| I-19, S46 | `traffic-light-crosswalk-yielding` | `traffic-signal.test.ts` (đã có), thêm test đồng bộ pha nếu đổi quyết định 4.5 |
| I-16 | (chưa có) | Fixture save schema cũ, world migrate |

OpenSpec còn task mở (đếm `- [ ]`; **chưa đếm** `traffic-light-crosswalk-yielding`: 5 task mở 4.2–4.6): adapt-reference-shop-operations 4, dynamic-economy-simulation 9, level-progression-roadmap 2, rain-intensity-forecast 4, seasonal-daylight-tree-shadows 2, shared-alley-multiplayer 11, stardew-inspired-management-loop 7, store-layout-expansion 6 (tổng 45); premium-vietnamese-pixel-ui 0.

---

## 7. Nợ kỹ thuật

- **Problem:** `simulation.ts` 2.940 dòng gom kho, khách, ledger, quầy, thời tiết…
  - **Current Implementation:** Một class lớn.
  - **Risk:** Khó đồng bộ co-op, khó test cô lập, xung đột merge.
  - **Recommended Direction:** Tách module theo miền (đã có `stock.ts`, `ledger`…), giữ API.
  - **Priority:** Medium
- **Problem:** `App.tsx` 1.508 dòng, logic handler + online commit.
  - **Current Implementation:** ~34 hook/handler, lặp `blockOfflineOnlineMutation`.
  - **Risk:** Dễ lỗi khi thêm lệnh.
  - **Recommended Direction:** Hook `useOnlineCommit`, tách handler theo modal.
  - **Priority:** Medium
- **Problem:** Trộn render và logic (`viewport.ts` 1.368 dòng; bóng/đường/đèn/xe).
  - **Current Implementation:** Renderer chứa hằng số bố trí.
  - **Risk:** Khó tái dùng, khó đo hiệu năng.
  - **Recommended Direction:** Tách `street`, `stalls`, `actors`; đưa hằng số vào `game-data`.
  - **Priority:** Low
- **Problem:** Hard-code: vị trí bảo vệ, `maxConcurrentCustomers = 3`, vị trí cây/đèn, giá đất, ngưỡng mưa 0,4.
  - **Current Implementation:** Nằm trong mã logic/renderer.
  - **Risk:** Cân bằng khó chỉnh; lệch client/server.
  - **Recommended Direction:** Chuyển sang `game-data`, có test dữ liệu.
  - **Priority:** Low
- **Problem:** Mã chết/dư: `server/main.ts`, `lucide-react` khai báo nhưng không import trong `apps/web/src`, hằng số đường chưa dùng.
  - **Current Implementation:** Còn trong repo.
  - **Risk:** Nhiễu, hiểu nhầm.
  - **Recommended Direction:** Xóa sau xác nhận.
  - **Priority:** Low
- **Problem:** Không CI, không test web, test server ngoài `yarn test`.
  - **Current Implementation:** Script QA `.cjs` Playwright không khai báo dependency.
  - **Risk:** Hồi quy im lặng.
  - **Recommended Direction:** Workflow typecheck/test/lint/build; Playwright smoke riêng.
  - **Priority:** High
- **Problem:** Tài liệu phân tán, lạc hậu (`tổng hợp.md` ~500 dòng, nhiều lớp).
  - **Current Implementation:** Ghi chú chồng theo ngày, xung đột.
  - **Risk:** Quyết định sai (I-07).
  - **Recommended Direction:** Giữ `THONG-KE.md` là bản chuẩn.
  - **Priority:** Medium
- **Problem:** `catalog-manifest.ts` ~3,7k dòng sinh ra được commit.
  - **Current Implementation:** `scripts/generate-manifest.js`.
  - **Risk:** Lệch khi sửa CSV.
  - **Recommended Direction:** Test đối chiếu CSV↔manifest trong CI.
  - **Priority:** Low

---

## 8. Lịch sử phát triển

## 2026-10-01 (lượt 4 — I-01 một phần)

### Changed
- `apps/server/src/bootstrap.ts`: thêm `ALLOWED_COMMAND_TYPES`, từ chối loại lệnh lạ. `coop-commands.test.ts`: thêm ca lệnh `give_money` bị từ chối và revision không đổi.

### Verified
- `test:coop`, `test:worlds`, `test:gateway` (Mongo thật, DB ngẫu nhiên): **PASS**. `tsc` server `--noEmit`: không lỗi. `yarn typecheck` ở root lần này không chạy được vì shell báo engine node >=22 nhưng đang là 20.19.0 (đã chạy `tsc` trực tiếp thay thế). Chưa qua Firebase guard thật, chưa browser.

### Remaining
- Lõi I-01: replay phía server cho các lệnh còn lại; cần thống nhất payload client–`WorldRuntime` và đồng hồ server trước.

## 2026-10-01 (lượt 3 — cập nhật tài liệu theo rà soát)

### Verified
- `yarn typecheck`: **PASS**. `yarn test` (`game-core`): **PASS** — `# tests 7, # suites 2, pass 7, fail 0`. Runner TAP gộp các nhóm thành 7 test/2 suite; con số này không so sánh được với 48 lời gọi `run*Tests` (số hàm nhóm, không phải số TAP test). Test server và browser **không chạy lại** lượt này.
- `yarn build` (server tsc + web vite, 892 modules, sau commit `24a2fab`): **PASS**, exit 0, 11,87 s. Bundle: index 710,53 kB (gzip 225,67), vendor-pixi 547,40 kB, vendor-firebase 230,62 kB, css 61,29 kB. Vẫn cảnh báo chunk >500 kB và `api.ts` import tĩnh+động (I-10 còn nguyên; index tăng từ 704,56 kB lên 710,53 kB).
- Lúc rà soát, đèn tín hiệu + người đi bộ + nhường đường nằm trong working tree chưa commit; sau đó đã được commit `24a2fab` cùng OpenSpec `traffic-light-crosswalk-yielding`. Các câu "chưa commit/chưa có OpenSpec" trong commit tài liệu 9cbfa43 là sai và đã sửa.

### Changed
- Thêm S46, I-15…I-19, F-08…F-11, bảng tóm tắt vấn đề, tiêu chí nghiệm thu, bảng liên kết OpenSpec/test; sửa S17, S24, mục 3.2 dòng 9, mục 4, mục 9, mục 10. Không đổi mã.

## 2026-10-01 (kiểm chứng sau kiểm kê)

### Verified
- `yarn typecheck` (tsc -b 6 project): **PASS**, 0 lỗi.
- `yarn test` (`game-core`): **PASS** — 7 tests / 2 suites TAP, 0 fail, runner thoát mã 0 (đã gồm `road.test`). Test server chạy sau đó với Mongo thật (`apps/server/.env`, DB ngẫu nhiên do test tự tạo): `test:worlds` **PASS**, `test:gateway` **PASS**, `test:coop` **PASS** (gồm ca mới thành viên không phải chủ gửi `layout_batch`, xác nhận I-03 hoạt động đúng thiết kế hiện tại). Giới hạn: gọi controller/gateway trực tiếp, chưa qua Firebase guard thật (S36) và chưa có browser (S38); I-01 chưa bị test nào bao phủ (không có ca "gửi save sửa tiền với lệnh không replay").
- `yarn build` (server tsc + web vite, 889 modules): **PASS**. Bundle: index 704,56 kB, vendor-pixi 547,40 kB, vendor-firebase 230,62 kB; vẫn cảnh báo chunk >500 kB và `api.ts` import tĩnh+động (I-10 xác nhận).
- Không chạy browser/playtest.
- Ảnh hưởng trạng thái: S18, S19, S22 có thêm bằng chứng chạy thật lần này; trạng thái giữ nguyên.

### Changed
- Giữa hai lượt, working tree đã được commit: 46f7466 (quyền sửa bố cục cho mọi thành viên) và 2f2af38 (mặt cắt đường, cống, vạch, đường ướt + `road.test.ts`). Cập nhật S24, S25 (→ ✅), I-03, I-06 (đã xử lý); Completed 20→21, Partial 7→6.

## 2026-10-01

### Added
- Tạo `THONG-KE.md` từ kiểm kê chỉ đọc toàn repo.

### Fixed
- Không có (kiểm kê không sửa mã).

### Improved
- Chuẩn hóa trạng thái hệ thống theo 6 nhãn; ghi nhận chênh lệch tài liệu–mã (mục 3.2).

### Changed
- Không đổi mã. Ghi nhận working tree có thay đổi **chưa commit** từ trước kiểm kê: `roadWetnessAt`/`getRoadWetness`/`ROAD_PROFILE`/`STORM_DRAINS`/`CROSSWALK` (I-06) và quyền sửa bố cục cho mọi thành viên + test (I-03).

### Remaining
- Toàn bộ mục Next Steps; typecheck/test/build **chưa chạy lại** trong kiểm kê này.

### Lịch sử tóm tắt trước khi có tài liệu này (từ `tổng hợp.md`, `TASKS.md`; không kiểm chứng lại)
- 2026-09-30: lõi kho/nhập hàng/ledger/nhân viên, multiplayer nền (HTTP+WS), Firebase, ánh sáng theo giờ, đồ họa 2.5D, hàng rào/đèn đường.
- 2026-10-01 (trước kiểm kê): đặt giá/đánh giá/tổng kết ngày, khách quen, bản tin sáng, đơn tiệc, mục tiêu/kỹ năng/danh hiệu, ngày hội + quầy, giao thông hẻm, daylight theo mùa + bóng cây, dải mưa + dự báo, co-op replay 7 lệnh, test co-op hai tài khoản (PASS theo tài liệu).

---

## 9. Trạng thái hiện tại

| Category | Count |
|---|---:|
| Completed | 21 |
| Partial | 7 |
| Needs Fix | 1 |
| Planned | 6 |
| Improvement | 4 |
| Needs Verification | 7 |

(46 hệ thống S01–S46 ở mục 2; S46 mới là 🟡. Số vấn đề I-01…I-19 là danh sách riêng: 19, trong đó I-06 đã đóng.)

**Mức độ hoàn thiện:** lõi mô phỏng đơn người chơi rộng và có test lõi dày; co-op có hạ tầng nhưng chưa nghiệm thu đầu–cuối; kiểm chứng bằng browser/máy thật còn thiếu.
**Hệ thống chính đã xong (mức mã + test):** kho/lô/hạn, nhập hàng, ledger, khách/thu ngân, thị trường/thời tiết, khách quen, mục tiêu, đơn tiệc, kỹ năng, danh hiệu, server world + gateway.
**Vấn đề lớn:** I-01 (tin cậy lệnh co-op), I-15 (server tin save, không giới hạn), I-02 (bảng xếp hạng giả), I-03 (chưa ghi quyết định thiết kế), I-09 (không CI), I-19 (đèn tín hiệu: QA dở).
**Rủi ro kỹ thuật:** đồng bộ co-op, ID không xác định, `simulation.ts`/`App.tsx`/`viewport.ts` quá lớn, bundle >500 kB.
**Thiếu hệ thống:** âm thanh, thuế, content editor, CI, review chữ.
**Tập trung phát triển hiện tại (theo git):** đèn tín hiệu, người đi bộ qua đường và xe nhường đường (commit 24a2fab, QA dở); trước đó là mặt cắt đường/độ ướt.

---

## 10. Next Steps

### 🔴 High Priority
- [ ] Server replay cho mọi lệnh đổi tài nguyên (I-01, S22). Đã xong: từ chối `payload.type` lạ (2026-10-01). Còn: thống nhất payload client–`WorldRuntime`, rồi chuyển từng lệnh sang replay.
- [ ] Thiết lập CI: typecheck + `yarn test` + lint + build; chạy test server với Mongo (I-09, S32, S43).
- [x] Chạy lại typecheck/test/build (2026-10-01: PASS, mục 8). Lặp lại sau mỗi đợt thay đổi.
- [ ] Browser QA hai tài khoản: tạo hẻm → mời → nhập → bán → reconnect → restart server (S38).

### 🟠 Medium Priority
- [ ] Thêm test I-01 cho lệnh hợp lệ nhưng không replay (gửi save sửa tiền) — chỉ viết được khi đã có replay/bất biến; ca lệnh lạ đã có.
- [ ] Hoàn tất đèn tín hiệu (S46, I-19): QA browser/hiệu năng (OpenSpec `traffic-light-crosswalk-yielding` 4.2–4.6), quyết định 4.5.
- [ ] Giới hạn payload/tần suất server (I-15); kế hoạch migration schema world Mongo (I-16).
- [ ] Ghi quyết định thiết kế quyền sửa bố cục/mua đất của thành viên vào spec (I-03; code đã commit 46f7466).
- [ ] Lệnh nhân viên trong co-op (I-05, S21).
- [ ] Thay bảng xếp hạng giả (I-02, S28, F-05).
- [ ] ID xác định thay `Date.now()/Math.random()` (I-04).
- [ ] Xuất/nhập save (I-12, F-04).
- [ ] Đồng bộ/rút gọn `tổng hợp.md`, `TASKS.md`, `ROADMAP.md` (I-07).
- [ ] Playtest cân bằng: XP cấp 1–35, perk, nhịp khách, giá đất (S35, S39).
- [ ] Xác minh Google OAuth và PWA (S36, S37).

### 🟢 Low Priority
- [ ] Hành vi khách/xe theo dải mưa (I-13).
- [ ] Bump version service worker theo build, đường dẫn tương đối (I-08).
- [ ] Code-splitting, gỡ `lucide-react` nếu dư, xóa `server/main.ts` (I-10, I-11).
- [ ] Cân nhắc F-01, F-02, F-06, F-07, F-08…F-11.
- [ ] Viết `docs/deploy.md` (I-17); checklist a11y/cảm ứng (I-18).
- [ ] Chuyển hằng số hard-code sang `game-data` (mục 7).
- [ ] Chuyển khóa Firebase Admin ra ngoài thư mục dự án (I-14).
