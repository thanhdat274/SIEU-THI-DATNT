# THONG-KE — Bảng theo dõi phát triển & hiện trạng triển khai

> **Bổ sung tiến độ 2026-10-01:** OpenSpec `reference-gameplay-expansion`: code tiền giả, tín dụng khách quen và dine-in MVP đã có trong working tree; dine-in cho khách chọn ăn tại bàn bằng món đóng gói, lưu occupancy/bàn bẩn, dọn bởi người chơi hoặc nhân viên, server replay. Tín dụng có hạn mức, tài khoản tuần tự, hạn trả/quá hạn/nợ xấu, thu hồi, ledger/save và server replay. Chưa chạy test/typecheck/build/browser QA trong lượt này (đang gom test về cuối), balance/thời lượng provisional. Bổ sung 02/10/2026: Wave B sản xuất công thức (bếp nướng/ấm nước, 3 công thức, mẻ lưu save, server replay, UI trạm bếp) đã có code, `tsc -b` và test lõi sản xuất PASS; chưa browser QA. Wave C prestige (sao sau cấp 35, HUD, test lõi) và Wave D (biểu đồ giá/doanh số, heatmap, checklist, âm thanh, replay lõi) đã có code, chưa browser QA. Xem `tổng hợp.md` và `openspec/changes/reference-gameplay-expansion`.

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
| `packages/game-core` | Logic thuần, không DOM: `GameSimulation` (`simulation.ts` ≈3.920 dòng (03/10/2026; đã tách 5 Manager)), khách, kho/lô, ledger, thị trường, thời tiết, ánh sáng pha, `WorldRuntime` (co-op), thuế (registry) |
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
| S47 | An ninh: trộm lẻ/đột nhập, camera, bảo vệ, hồ sơ công an | 🟡 | `game-core/src/security.ts`, `simulation.ts`, `customers.ts`, `game-data/src/security.ts`, `SecurityModal.tsx`, `security.test.ts` (OpenSpec `theft-and-security`) | Code + test có trong working tree, chưa commit. Level 5 mở khóa; camera/bảo vệ ảnh hưởng phát hiện và trộm đêm; có sự cố, recovery, ledger/net profit và save/load. Lỗi đổi ngày hoàn giỏ trên bản sao đã sửa: `abandonAllBaskets` cập nhật khách thật; test hồi quy xác nhận giỏ được hoàn/xóa một lần. Kiểm chứng mới 2026-10-01: `tsc -b`, core `test-runner.ts` (security + 7 TAP), server TS build, web Vite production build PASS. Chưa browser QA, playtest cân bằng; `security_action` mới ở allow-list, chưa server replay; camera chưa vào mô-đun thuế. |
| S48 | Tiền giả: nguy cơ giao dịch, phát hiện tại checkout, tổn thất/ledger | 🟡 | `game-data/src/security.ts` (`COUNTERFEIT_RULES`), `game-core/src/counterfeit.ts`, `simulation.ts`, `DaySummaryModal.tsx` | Code first pass trong working tree, chưa kiểm thử. Kết quả xác định theo ngày/checkout ID; player/thu ngân có tỉ lệ phát hiện khác nhau; tiền giả lọt qua trừ tiền mặt và lãi ròng nhưng doanh thu bán hàng vẫn giữ nguyên, có toast và dòng tổng kết ngày. Tỷ lệ/mệnh giá chỉ là tham số ban đầu; replay co-op/đối soát ledger, test và cân bằng còn phải làm trong đợt test gom cuối. |
| S25 | Độ ướt mặt đường | ✅ | `core/weather.ts` `roadWetnessAt`, `simulation.ts getRoadWetness`, `renderer/road-surface.ts`, `road.test.ts` | Đã commit (2f2af38): hàm thuần có test, renderer gọi `setWetness` (`viewport.ts:1050`). Chỉ hình ảnh, chưa kiểm browser. |
| S26 | Menu khởi đầu, đăng nhập, sổ tay hướng dẫn | 🟡 | `LoginScreen.tsx` (1.004 dòng), `AccountBar.tsx` | Có Chơi tiếp/Chơi mới/Hẻm chung/Cách chơi/sổ tay. Bảng xếp hạng là dữ liệu giả (S28). |
| S27 | Thuế: registry quy tắc + theo dõi doanh thu năm | 🟡 | `core/tax/*`, `TaxModal.tsx`, `docs/tax/*` | Registry khóa `UNVERIFIED`; modal chỉ hiển thị doanh thu năm so ngưỡng tham khảo, **không tính/trừ thuế**. Engine xem S41. |
| S28 | Bảng xếp hạng ("Bảng vàng thành tích") | 🟡 | `LoginScreen.tsx`, `world.repository.ts` (`leaderboard`), `bootstrap.ts` (`GET /api/v1/leaderboard`) | Đã thay dữ liệu cứng bằng top 10 hẻm theo tổng doanh thu từ Mongo (2026-10-01, I-02). Test Mongo PASS; chưa kiểm đăng nhập thật; doanh thu do client báo nên chưa chống gian lận; chưa có tuần/mùa/opt-out. |
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
| S45 | Nhiều cơ sở/ghé thăm tiệm khác | 🟡 | `game-data/buildings.ts`, `map.ts`, `land.ts`, `game-core/store-layout.ts`, `customers.ts`, `renderer/viewport.ts`, `StoreLayoutModal.tsx` | Mới có **một** cơ sở thêm: tiệm xôi riêng trên cùng bản đồ (OpenSpec `xoi-shop-same-land-strip`, xem `tổng hợp.md` 02/10/2026). Chợ, cổng trường, khu công nghiệp và luân chuyển nội bộ vẫn chưa có. |

---

## 3. Vấn đề còn tồn tại và chênh lệch

### 3.1. Danh sách vấn đề

> "Xác nhận" chỉ dùng khi đã đọc đúng đoạn mã gây ra hành vi; còn lại ghi "Nghi vấn qua phân tích tĩnh".

### Bảng tóm tắt vấn đề

| ID | Vấn đề | Ưu tiên | Trạng thái |
|---|---|---|---|
| I-01 | Co-op: server chỉ replay một phần lệnh | High | Đã làm 2026-10-03: 38 loại lệnh được server phát lại (`test:coop` PASS trên Mongo local); `layout_move/store/retrieve` FE không gửi; chưa kiểm 2 client thật |
| I-02 | Bảng xếp hạng dữ liệu giả | Medium | Đã thay bằng dữ liệu thật 2026-10-01 (chưa kiểm đăng nhập thật) |
| I-03 | Quyền sửa bố cục cho mọi thành viên chưa ghi spec | Medium | Đã ghi spec 2026-10-01 |
| I-04 | ID `Date.now()/Math.random()` | Medium | Đã làm 2026-10-01 |
| I-05 | Nhân viên chưa vào co-op | Medium | Đã làm 2026-10-01 (đường commit; chưa kiểm hai trình duyệt) |
| I-07 | Tài liệu lạc hậu | Medium | Mở |
| I-08 | Service worker version cố định | Low | Đã đóng: `sw.js` dùng `__SW_VERSION__`, Vite thay theo build (đọc mã 2026-10-03) |
| I-09 | Test server ngoài `yarn test` | Medium | Đã làm: `test:all`/`test:all:db` + CI; run GitHub `37039000966` XANH 2026-10-02 (chưa merge vào `main`) |
| I-10 | Bundle lớn | Low | Mở |
| I-11 | `server/main.ts` lỗi thời | Low | Đã xóa 2026-10-03 |
| I-12 | Save local một slot, xuất/nhập file | Medium | Xuất/nhập file, 3 ô lưu và khóa nhiều tab đã làm 2026-10-01 |
| I-13 | Mưa chỉ dùng ngưỡng 0,4 | Low | Xử lý một phần: cường độ mưa liên tục (`rainIntensity`) đã vào `customers`, `arrival-mode`, `reviews`, `street-traffic`; ngưỡng mưa của `street-traffic` nay nằm trong `STREET_PEDESTRIANS` (`game-data/traffic.ts`, 03/10/2026); chưa có bảng hệ số theo dải |
| I-14 | Khóa bí mật trong thư mục dự án | Low | Đã `.gitignore`, `git ls-files` không theo dõi (kiểm 2026-10-03); file vẫn nằm trong thư mục làm việc |
| I-15 | Server không giới hạn payload/tần suất | Medium | Xử lý một phần 2026-10-01 |
| I-16 | Chưa có migration schema world Mongo | Medium | Đã có code (03/10/2026): `world-migrations.ts` chạy lúc khởi động server; chưa chạy thật (mới dry-run) |
| I-17 | Thiếu tài liệu triển khai/vận hành | Low | Đã viết `docs/deploy.md` 2026-10-03 (từ mã, chưa kiểm bằng deploy thật) |
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
- **Hướng B (2026-10-01, đã chọn và làm):** `apps/server/src/save-invariants.ts` (`checkSaveInvariants`) chạy trên mọi lệnh không được server phát lại: tiền/số lượng kho không âm và hữu hạn, cấp ≤ 35, doanh thu/khách/cấp/XP/XP kỹ năng/đặc quyền/danh hiệu/mục tiêu đã nhận **không được giảm**, tiền và doanh thu tăng không quá 20.000₫ mỗi phút game trôi qua (+ tối đa 1.000.000₫ cho lệnh nhận thưởng/đơn tiệc), `store_status` phải khớp `isOpen`. Ngưỡng cố ý rộng nên **chưa chống gian lận triệt để** (có thể tăng ~19M₫/ngày game, kho/giá chưa được kiểm), và ngưỡng chưa đối chiếu với cân bằng thực tế (có thể từ chối người chơi cuối game giàu — cần playtest). Test: `save-invariants.test.ts` (đơn vị) và ca "cheat-money"/"honest-price" trong `coop-commands.test.ts`.
- **Tiến độ 2026-10-01 (một phần):** `bootstrap.ts` nay có `ALLOWED_COMMAND_TYPES` và từ chối loại lệnh lạ ("Loại lệnh không được hỗ trợ"); `coop-commands.test.ts` có ca `give_money` bị từ chối. **Chưa giải quyết lõi I-01:** các lệnh client vẫn gửi (`set_price`, `restock`, `unstock`, `checkout`, `order`, `stow*`, `planogram_*`, `auto_restock`, `store_status`, `buy_stall`, `claim_quest`, `advance_day`, `change_speed`) vẫn tin save client. **Phân tích bổ sung (đọc mã, chưa chạy):** vấn đề gốc là trạng thái bị tách ba nơi — mỗi client chạy `GameSimulation` đầy đủ (bán hàng, tiền, kho đổi liên tục), `WorldGateway` giữ một `WorldRuntime` riêng có checkpoint, còn `commitCommand` dựng `WorldRuntime` mới từ save trong DB. Replay lệnh trên save DB cũ sẽ trả "save chuẩn hóa" làm mất doanh thu/kho client đã tạo từ commit trước, và các lệnh phụ thuộc trạng thái tạm (`checkout` cần khách đang đứng quầy, `auto_restock`, `advance_day`, `store_status`) không replay được trên save tĩnh. Vì vậy chuyển từng lệnh sang replay đòi quyết định kiến trúc: (A) server là nguồn sự thật duy nhất, client chỉ gửi ý định và nhận snapshot; hoặc (B) giữ client-sim nhưng server chỉ kiểm bất biến (tiền/kho/XP đổi trong ngưỡng hợp lý theo loại lệnh). Chưa chọn. Ngoài ra không thể chỉ thêm vào danh sách replay vì payload client lệch `WorldRuntime` (client gửi `order` còn runtime là `order_supplier`; `checkout` thiếu `checkoutId`; `store_status`, `stow*`, `planogram_*`, `auto_restock` runtime chưa có).
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
- **Đã làm 2026-10-01:** bỏ danh sách cứng. `WorldRepository.leaderboard` (`world.repository.ts`, aggregate Mongo) + route `GET /api/v1/leaderboard` (sau `FirebaseAuthGuard`, chịu rate limit I-15): top 10 hẻm theo tổng doanh thu (hòa thì theo `_id`), mỗi dòng chỉ có `rank, name, totalRevenue, day, level, members, mine`; **không** trả uid hay id hẻm; `myRank` cho hẻm tốt nhất của người gọi kể cả ngoài top. Client: `getLeaderboard` (`services/api.ts`), `LoginScreen.tsx` gọi khi mở bảng, có trạng thái chưa đăng nhập/đang tải/lỗi/trống, đánh dấu hẻm của mình. Test: `apps/server/src/leaderboard.test.ts` (Mongo thật, trong `test:db`): thứ tự, hòa ổn định, giới hạn, mine, hạng ngoài top, không lộ ID.
- **Còn lại / giới hạn:** doanh thu là số do client báo, server mới kiểm bất biến ở mức rộng (I-01 hướng B: có thể tăng tới 20.000₫/phút game), nên bảng **chưa chống gian lận**; chưa có opt-out hiển thị tên hẻm (tên hẻm do người chơi đặt, hiện công khai với mọi tài khoản đăng nhập, chưa lọc từ ngữ); chỉ tổng doanh thu mọi thời gian (chưa có theo tuần/mùa); aggregate quét toàn bộ collection mỗi lần gọi (chưa có chỉ mục/bộ nhớ đệm, ổn với quy mô nhỏ); tiệm chơi một mình không lên bảng; **chưa kiểm đường đăng nhập thật** (cần Firebase) nên mới xem được trạng thái chưa đăng nhập trong Browser pane (không còn dữ liệu giả); Browser pane ghi hai lỗi tải tài nguyên 500 chưa xác định nguồn (mọi module chính trả 200; có thể do dev server lúc việc khác đang sửa file), chưa xác nhận liên quan.
- **Verification:** `test:leaderboard` PASS (Mongo thật), `tsc` server/web sạch, `eslint` sạch.

### Issue: I-03 Quyền sửa bố cục chuyển từ chủ hẻm sang mọi thành viên (đã chốt hướng B 06/10/2026: mọi thành viên; UI đã khớp server; đã thêm khóa mềm 06/10/2026, chưa QA 2 trình duyệt)

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
- **Đã làm 2026-10-01:** ID đơn nhập là `ord-N`, ID sổ cái là `led-N` từ hai bộ đếm `orderSequence`/`ledgerSequence` (trường mới tùy chọn trong `SaveGameData`, lưu/nạp cùng save; khi nạp lấy max(bộ đếm đã lưu, số lớn nhất của ID dạng `ord-N`/`led-N`)). Save cũ (ID theo giờ thật) vẫn nạp được, ID cũ không khớp mẫu nên không va chạm. Không đổi schemaVersion vì trường tùy chọn. Test `deterministic-ids.test.ts` (trong `yarn test` game-core): hai mô phỏng cùng lệnh ra cùng ID, ID không trùng, nạp lại save không trùng, save cũ, bộ đếm đã lưu được tiếp tục.
- **Còn lại / giới hạn:** `timestamp` của sổ cái và `closedAt` vẫn lấy giờ thật (siêu dữ liệu kiểm toán, không dùng để định danh/logic; nếu cần so snapshot hai bên thì phải bỏ qua các trường này); ID khách/xe/người đi bộ đã dùng bộ đếm/seed sẵn (chưa rà lại ngoài hai chỗ này; `grep` `Date.now`/`Math.random` trong `game-core/data/shared` chỉ còn các hàm thời gian của `world-runtime.ts`); chưa có test replay client–server so sánh save đầy đủ (I-01).
- **Verification:** `yarn --cwd packages/game-core test` PASS (7 tests, 0 fail, gồm nhóm ID mới), `tsc` server/web sạch, `test:db` PASS.

### Issue: I-05 Nhân viên chưa tham gia co-op đầy đủ

- **Current State:** Lệnh thuê/ca/giao việc không nằm trong replay; `layout_batch` bị từ chối khi có `workerTask`.
- **Expected State:** Nhân viên hoạt động nhất quán trong world chung.
- **Impact:** Có thể lệch trạng thái hoặc chặn sắp xếp tiệm.
- **Related Files:** `bootstrap.ts`, `world-runtime.ts`, `staff.ts`.
- **Root Cause:** Staff phát triển sau schema co-op.
- **Suggested Fix:** Thêm lệnh `hire_staff`, `set_staff_shift`, `assign_refill` vào runtime và danh sách replay.
- **Đã làm 2026-10-01:** ba lệnh `hire_staff`, `set_staff_shift`, `assign_refill_job`: thêm vào `GameCommandPayload` + validator (`shared`), `WorldRuntime.executeCommand`, danh sách cho phép của server; client (`App.tsx`) bỏ chặn "chưa đồng bộ co-op" — mô phỏng cục bộ rồi `commitBusinessChange` (máy chủ từ chối thì khôi phục như các lệnh khác; trước đây `assign_refill_job` chạy cục bộ không gửi gì nên hai bên lệch). Server kiểm bất biến nhân viên trong `save-invariants.ts`: số nhân viên chỉ tăng tối đa 1 và chỉ qua `hire_staff`, không vượt `staffSlotsAtLevel`, không có nhân viên mới ngoài lệnh tuyển. Test: `save-invariants.test.ts` (các ca nhân viên) và `coop-commands.test.ts` (tuyển hợp lệ được commit và thành viên kia thấy; thêm người ngoài lệnh bị từ chối).
- **Còn lại / giới hạn:** lệnh vẫn thuộc nhóm "client báo, server kiểm bất biến" (I-01 hướng B), không replay phía server; **mỗi client chạy AI nhân viên (châm kệ/thu ngân) cục bộ** nên trạng thái việc đang làm của nhân viên giữa hai client chưa được đồng bộ ngoài các lần commit — chưa kiểm hai trình duyệt; `layout_batch` vẫn bị chặn khi có `workerTask`; chưa có lệnh sa thải (game chưa có chức năng này); lương/nợ lương chỉ được kiểm gián tiếp qua bất biến tiền; `WorldRuntime` đã biết 3 lệnh nhưng đường commit không dùng nó để replay.
- **Priority:** Medium
- **Verification:** `test:coop` (gồm ca tuyển), `test:unit`, `test:worlds`, `test:gateway`, `test:leaderboard` PASS; `yarn test` game-core PASS (một lần chạy đầu thoát mã 1 lúc phiên khác đang sửa file, chạy lại PASS); `tsc` server/web sạch; chưa Browser QA hai tài khoản (cần Firebase).

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
- **Tiến độ 2026-10-03 (một phần):** đã có script `test:all` / `test:all:db` và `.github/workflows/ci.yml`. `yarn test:all` chạy thật PASS 03/10/2026 (sau khi sửa 3 hồi quy setter Manager no-op, xem `tổng hợp.md`). CI chạy thật trên PR #2 (02/10/2026): run `37039000966` xanh cả hai job, gồm test Mongo. Còn lại: merge vào `main` để CI chạy trên push.
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
- **Đã làm 2026-10-01:** xuất/nhập file JSON. `apps/web/src/save-file.ts` (phong bì `{format, formatVersion, exportedAt, save}`, `parseSaveFile` từ chối JSON hỏng/file lạ/định dạng tương lai/schema tương lai/save không qua `validateSaveGameData`/file >5 MB, nâng save schema cũ), `db.ts` `replaceSaveWithImported` (transaction, giữ bản cũ làm backup, revision đi tiếp), `App.tsx` `handleExportSave`/`handleImportSave`, `SaveModal.tsx` có nút Xuất/Nhập + hộp xác nhận hiện tóm tắt (ngày, cấp, tiền, doanh thu). Bị chặn khi đang chơi online. Test: `apps/web/src/save-file.test.ts` (script `yarn --cwd apps/web test`, nằm trong `test:all`). **Đã xem trong Browser pane (dev server, desktop):** xuất ra file đúng định dạng (25,8 KB), file hỏng báo lỗi rõ, nhập file sửa tiền/ngày hiện xác nhận đúng, sau khi đồng ý HUD đổi, IndexedDB có bản dự phòng cũ + bản mới với revision liên tục; không có lỗi console. Save dev đã được nhập lại về trạng thái ban đầu sau khi thử.
- **Ba ô lưu + khóa nhiều tab (2026-10-01):** `db.ts` có `SAVE_SLOT_IDS` (ô 1 giữ khóa cũ `local_save_default` nên save hiện có không cần migration; ô 2/3 là `local_save_slot_2/3`), mỗi ô một backup (`backupKeyFor`), `getActiveSlotId/setActiveSlotId` (ô chọn giữ trong bộ nhớ từng tab, nhớ qua localStorage), `listSaveSlots`, `deleteSaveSlot`; mọi hàm đọc/ghi/nhập/xuất dùng ô đang chọn. `slot-lock.ts` dùng Web Locks API (`navigator.locks`, `ifAvailable`): tab giữ khóa ô khi vào chơi một mình, nhả khi về menu hoặc đóng tab; tab khác thấy ô "Đang mở ở thẻ khác" và không vào được (kể cả "Bắt đầu tiệm mới", xin khóa trước khi ghi đè). `LoginScreen.tsx` có chọn ô, xóa ô (xác nhận), làm mới khi quay lại tab. **Đã xem trong Browser pane (hai tab):** chip ba ô đúng trạng thái; tab thứ hai thấy ô đang mở bị khóa và bấm tiếp tục thì ở lại menu kèm thông báo; về menu ở tab đầu thì tab hai vào được ô đó sau khi làm mới; save ô 2 lưu riêng cùng backup riêng, ô 1 không bị đụng; xóa ô 2 xóa cả backup; dữ liệu thử đã dọn. Ô 1 lúc thử đang được một tab khác chơi (có khóa của tab đó), cũng chứng minh khóa chéo tab.
- **Điều chỉnh menu (01/10/2026):** `LoginScreen.tsx` chỉ hiện bộ chọn ô khi ít nhất hai ô có save, để menu một tiệm gọn hơn. "Bắt đầu tiệm mới" dùng ô trống trước; nếu cả ba đã có save thì mới xác nhận ghi đè ô đang chọn. Đây là thay đổi code chưa được kiểm tra browser/build trong lượt này. Save chơi đơn lưu cục bộ trong IndexedDB; Google login không đồng nghĩa đồng bộ cloud realtime cho save đó. Hẻm co-op là luồng online/server riêng.
- **Điều chỉnh giao diện (2026-10-02):** hàng chọn ô trước đó luôn hiện (rối mắt); commit `b0b2bfa` của chủ dự án đã ẩn khi có dưới 2 bản lưu nhưng khi đó không còn cách tạo ô thứ hai. Nay `LoginScreen.tsx` chỉ hiện hàng ô khi có từ hai bản lưu, hoặc bản lưu duy nhất không ở ô đang chọn, hoặc người chơi bấm liên kết "+ Thêm ô lưu khác" (hiện khi hàng đang ẩn). Đã xem trong Browser pane: một bản lưu thì hàng ẩn + có liên kết, bấm thì hiện ba ô. **Chưa xem được trường hợp tự hiện khi có hai bản lưu** (trang bị tải lại giữa chừng do dev server đổi file); logic dùng cùng điều kiện đã có.
- **Còn lại / giới hạn:** test tự động cho `db.ts`/`slot-lock.ts` đã có (xem Verification) nhưng chạy trên IndexedDB/Web Locks giả, còn Browser pane desktop là bằng chứng duy nhất trên trình duyệt thật; trình duyệt không có Web Locks thì không khóa (còn kiểm revision trong `persistSave`, ghi đè nhau vẫn có thể báo lỗi 'Bản lưu đã thay đổi'); chưa kiểm Safari/Firefox/mobile; không đổi tên ô, không sao chép ô; nhập file (`replaceSaveWithImported`) và "Khôi phục" dùng ô đang chọn; chọn ô ở menu chưa cập nhật các tab đang mở ở menu theo thời gian thực (chỉ khi tab lấy lại focus); `weatherSeed = save.id` nên mỗi ô có thời tiết khác nhau (ID ô khác nhau); fallback `'local_save_default'` còn ở vài chỗ trong `App.tsx` chỉ dùng làm ID tạm cho snapshot khôi phục/bố cục, không ghi DB; file không mã hóa/không ký nên người chơi có thể sửa tay (chỉ dùng cho save cục bộ, không đưa lên hẻm online); chưa kiểm trên mobile/iOS Safari (tải file, chọn file) và chưa kiểm khi save lớn gần 5 MB; ngoài `validateSaveGameData` chưa có kiểm tra bất biến nội dung (tiền cực lớn vẫn nhập được); lúc nhập qua giao diện tôi đẩy file bằng script `DataTransfer`, chưa dùng hộp chọn file thật.
- **Verification:** `save-file.test.ts` PASS; `db.test.ts` + `slot-lock.test.ts` PASS 2026-10-02 (`yarn --cwd apps/web test`: `fake-indexeddb` làm devDependency của apps/web, `tsconfig.test.json` ánh xạ `@game/data` sang `src/test-stubs/game-data.ts` vì gói thật không import được dưới ESM của `tsx`; `navigator.locks` giả tự viết nên chưa phản ánh hành vi Web Locks của từng trình duyệt), `tsc` web sạch, `eslint` sạch cho các file đã sửa; thao tác thủ công như trên.

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
- **Đã làm 2026-10-01:** `apps/server/src/rate-limit.ts` (cửa sổ cố định trong bộ nhớ, không thêm dependency): HTTP theo IP 600/phút (middleware, trước xác thực), theo tài khoản 240/phút (`auth.guard.ts`), commit 120/phút (`commitCommand`) → 429; thân JSON tối đa 2 MB (`useBodyParser`, trả 413); WebSocket `maxPayload` 64 KB và 40 thông điệp/giây/kết nối, vượt 20 lần trong 10 s thì đóng 1008. Hạn mức ghi đè bằng biến `RATE_LIMIT_*`. Test: `rate-limit.test.ts` (limiter, `allowSocketMessage`, HTTP 413 qua server thật).
- **Còn lại / giới hạn:** bộ đếm theo từng tiến trình (nhiều instance thì mỗi cái đếm riêng); sau reverse proxy `req.ip` có thể là IP proxy (cần cấu hình trust proxy); ngưỡng chưa đối chiếu với lưu lượng thật (client commit mỗi hành động, input 10 Hz); 2 MB chưa đối chiếu với kích thước save cuối game (ledger tăng dần; save khởi tạo chỉ ~1,7 KB); chưa giới hạn số kết nối WS theo IP/tài khoản; hành vi 429 của client (toast/thử lại) chưa kiểm tra.
- **Verification:** `test:unit` (invariants + rate-limit), `test:db`, `verify:runtime` PASS cục bộ ngày 2026-10-01; chưa test tải.

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
| 8 | "Bảng xếp hạng" như tính năng menu | Lúc kiểm kê: dữ liệu cứng; nay đã nối dữ liệu thật (S28, I-02) |
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

OpenSpec còn task mở (**số cũ lúc 01/10/2026; đếm lại 03/10/2026 là ≈100 task `[ ]` ở 17 change, xem `docs/RA-SOAT-2026-10-03.md`**) (đếm `- [ ]`; **chưa đếm** `traffic-light-crosswalk-yielding`: 5 task mở 4.2–4.6): adapt-reference-shop-operations 4, dynamic-economy-simulation 9, level-progression-roadmap 2, rain-intensity-forecast 4, seasonal-daylight-tree-shadows 2, shared-alley-multiplayer 11, stardew-inspired-management-loop 7, store-layout-expansion 6 (tổng 45); premium-vietnamese-pixel-ui 0.

---

## 7. Nợ kỹ thuật

- **Problem:** `simulation.ts` ≈3.920 dòng (03/10/2026; đã tách 5 Manager) gom kho, khách, ledger, quầy, thời tiết…
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

## 2026-10-02 (lượt 15 — sửa lỗi bãi bốc dỡ làm test:all đỏ)

### Changed
- `store-logistics.ts`: nhân viên bốc hàng đi bước lớn hơn khoảng cách còn lại (`dt` lớn, ví dụ 0,2 s ở `store-logistics.test.ts`) nên vượt qua điểm đích rồi dao động, không bao giờ vào ngưỡng "đã đến" (4 px) và chuyến không hoàn tất. Ngưỡng nay là `max(4, walkSpeed*dt)` ở cả bốc và xếp hàng. Lỗi có sẵn từ trước: xác nhận trên worktree sạch trước khi sửa.

### Verified
- `yarn --ignore-engines test:all` PASS toàn bộ (exit 0) trên working tree có thay đổi chưa commit của phiên khác. Chưa chạy CI.
- Chạy 2026-10-02: `yarn --ignore-engines build` (server `tsc -p tsconfig.build.json` + web `tsc && vite build`, 889 modules) PASS, exit 0, 6,12 s, trên working tree có thay đổi chưa commit của phiên khác nên không phải bản commit sạch. Bundle: index 1.090,08 kB (gzip 305,47), vendor-pixi 534,54 kB, vendor-firebase 154,20 kB, css 84,56 kB. Vẫn cảnh báo chunk >500 kB và `api.ts` import tĩnh+động (I-10 còn nguyên); index tăng mạnh so với 710,53 kB ở lần build trước (01/10/2026), nguyên nhân đã tách (02/10/2026, build có sourcemap rồi cộng byte đầu ra theo file nguồn): không có một thay đổi đột biến mà là dữ liệu và UI mới cộng dồn vào cùng một chunk. Lớn nhất trong 1.090 kB: react-dom 203 kB, `game-data/products.ts` 95 kB (catalog ~3.300 dòng mới so với 24a2fab), dexie 93 kB, `game-core/simulation.ts` 87 kB, `game-renderer/ref-pixelart.ts` 57 kB (mới, dữ liệu pixel art), `App.tsx` 38 kB, `viewport.ts` 37 kB, `premium-textures.ts` 36 kB, `LoginScreen.tsx` 32 kB, rồi các modal Sắp xếp/Sơ đồ kệ/Nhập hàng (21+11+15 kB). Cộng phần tăng của products + ref-pixelart + premium-textures + simulation + các modal mới ≈ 380 kB, khớp mức tăng 710→1.090 kB; đây là ước lượng từ diff và sourcemap, chưa build lại từng commit cũ để đối chiếu. **Đã làm một phần cùng ngày (code trong working tree, chưa commit vì `App.tsx` đang lẫn thay đổi chưa commit của phiên khác):** `App.tsx` nạp 20 modal ít mở bằng `React.lazy` (helper `lazyModal` + một `<Suspense fallback={null}>` bao khối modal; giữ import tĩnh `ShelfModal`, `CashierModal`, `WarehouseModal`, `InventoryModal`). Kết quả build web: index 1.090,08 → 611,30 kB (gzip 305,47 → 181,52), thêm 20 chunk modal nhỏ (2–23 kB) và tách css Layout/Planogram; `tsc -p apps/web` sạch, `yarn --cwd apps/web test` PASS; dev server: modal Lưu và Nhập hàng nạp và mở đúng, không lỗi console (chưa mở từng modal còn lại, chưa đo thời gian nạp chunk khi mạng chậm). index vẫn >500 kB nên cảnh báo chunk lớn còn. **Tách `ref-pixelart.ts` (02/10/2026, đã commit):** `PRODUCT_SPRITES` (~2.160 dòng, 335 sprite món) chuyển sang `game-renderer/src/product-sprites.ts`; không module nào import nó (chỉ `FURNITURE_SPRITES`/`PALETTE` được dùng qua `fixture-preview.ts`) nên bundler loại khỏi bản build: index 611,30 → 561,67 kB (gzip 172,30). Dữ liệu giữ nguyên (so `deepEqual` với bản cũ: 335 sprite món, 25 nội thất, `PALETTE`). **Không tách `products.ts` thành chunk nạp sau:** `PRODUCT_MAP`/`ALL_PRODUCTS` được import đồng bộ ở 61 file (simulation, UI, tutorial) và game cần ngay khi vào tiệm, nên chỉ tách được nếu đổi sang nạp bất đồng bộ hoặc tách riêng "màn menu" và "màn chơi" ở `App.tsx` (việc lớn, chưa làm). `furnitureSpriteTexture` dùng đồng bộ trong `viewport.ts`, nạp muộn sẽ phải vẽ lại. **`manualChunks` cho `dexie` và `react` (02/10/2026, đã commit):** `vite.config.ts` thêm chunk `vendor-dexie` (95 kB, gzip 31) và `vendor-react` (chỉ `react`/`react-dom`/`scheduler`, 219 kB, gzip 68; không gom thư viện khác để tránh vòng phụ thuộc đã gây "React undefined" như ghi chú cũ trong file). index 561,67 → 255,44 kB (gzip 75,74); tổng không giảm, nhưng thư viện ít đổi được cache riêng và tải song song. Kiểm chứng: `tsc` sạch, build PASS, `vite preview` bản production: menu hiển thị, bắt đầu tiệm mới vào được game (Pixi vẽ, HUD, kho), không có "React undefined". Console có lỗi "An unknown error occurred when fetching the script" ở cả bản này; chưa tìm ra nguồn (chunk, sw.js, manifest và icon đều trả 200; nghi do Browser pane/service worker, chưa kiểm chứng, cùng loại lỗi 500 chưa giải thích ở I-12). Còn lại: tách `products.ts`/`ref-pixelart.ts` thành chunk nạp sau, `manualChunks` cho `dexie`/`react-dom`; I-10. Node 20.19 cục bộ thấp hơn `engines` >=22, nên dùng `--ignore-engines`.

## 2026-10-02 (lượt 14 — test tự động db.ts và slot-lock.ts)

### Changed
- `apps/web/src/db.test.ts`, `slot-lock.test.ts`, `test-stubs/game-data.ts`, `tsconfig.test.json`; script `test` của apps/web; devDependency `fake-indexeddb`.

### Verified
- `yarn --ignore-engines --cwd apps/web test` PASS (4 file); `tsc -p apps/web` sạch. Chưa chạy lại `test:all` toàn repo/CI.

### Remaining
- Kiểm trình duyệt khác/mobile, đặt tên/sao chép ô.

## 2026-10-01 (lượt 13 — I-12 ba ô lưu và khóa nhiều tab)

### Changed
- `db.ts` (ô lưu), `slot-lock.ts` (mới), `LoginScreen.tsx`/`.css` (chọn/xóa ô, khóa), `App.tsx` (`getActiveSlotId` khi lưu/xuất, nhả khóa khi về menu).

### Verified
- `tsc -p apps/web` sạch, `eslint` sạch; Browser pane hai tab như mô tả ở I-12. Không có test tự động mới, chưa chạy `test:all`/build.

### Remaining
- Test tự động (cần môi trường IndexedDB/Web Locks), kiểm trình duyệt khác/mobile, đặt tên/sao chép ô.

## 2026-10-01 (lượt 12 — I-03 ghi quyết định quyền bố cục)

### Changed
- Chỉ tài liệu/spec và một ca test: `openspec/changes/store-layout-expansion/specs/store-layout/spec.md` (yêu cầu "Authoritative multiplayer layout changes" nói rõ member được sửa/mua đất, thêm 2 scenario), `openspec/changes/shared-alley-multiplayer/specs/world-membership/spec.md` (scenario member sắp xếp/mua đất), `store-layout-expansion/design.md` (mục "Quyết định quyền sửa bố cục": lý do, rủi ro, điều kiện xem lại), `coop-commands.test.ts` (tài khoản ngoài hẻm bị từ chối lệnh bố cục).

### Verified
- `test:coop` PASS (Mongo thật). Không đổi mã chạy. `openspec validate store-layout-expansion` báo lỗi: `specs/store-layout/spec.md` dùng tiêu đề `## Requirements` thay vì `## ADDED/MODIFIED Requirements`, nên CLI coi là không có delta. Lỗi này có sẵn từ trước (đã kiểm với bản trong HEAD), không do lượt này; chưa sửa định dạng spec.

### Remaining
- Cân bằng giá đất (task 7.7) và quyết định lại nếu nhóm >2 người.

## 2026-10-01 (lượt 11 — I-05 nhân viên trong co-op)

### Changed
- `shared` (3 loại lệnh + validator), `world-runtime.ts` (3 case), `bootstrap.ts` (allow-list), `save-invariants.ts` (bất biến nhân viên), `App.tsx` (hire/shift/assign gửi commit khi online), test mới trong `save-invariants.test.ts` và `coop-commands.test.ts`.

### Verified
- Các test server PASS (Mongo thật), `yarn test` game-core PASS, `tsc` sạch. Chưa Browser QA hai tài khoản, chưa build.

### Remaining
- Xem I-05 (giới hạn); đồng bộ trạng thái AI nhân viên giữa hai client; replay phía server khi chọn hướng A.

## 2026-10-01 (lượt 10 — I-02 bảng xếp hạng thật)

### Changed
- Thêm `leaderboard` vào `world.repository.ts`, route trong `bootstrap.ts`, `leaderboard.test.ts` (+ script `test:leaderboard` trong `test:db`), `getLeaderboard` trong `api.ts`, thay modal bảng vàng trong `LoginScreen.tsx`.

### Verified
- `test:leaderboard` PASS; `tsc` server/web sạch; Browser pane: trạng thái chưa đăng nhập đúng, không còn dữ liệu giả. Chưa kiểm đăng nhập thật/Firebase, chưa build.

### Remaining
- Xem I-02 (giới hạn); F-05 mở rộng (tuần/mùa) và chống gian lận phụ thuộc I-01.

## 2026-10-01 (lượt 9 — I-04 ID xác định)

### Changed
- `simulation.ts`: bỏ `Date.now()/Math.random()` ở `recordLedger` và `orderSupplierCart`, thêm `orderSequence`/`ledgerSequence` + `hydrateIdSequences`; `shared`: hai trường tùy chọn trong `SaveGameData`; thêm `deterministic-ids.test.ts` và đăng ký trong `test-runner.ts`.

### Verified
- `yarn --cwd packages/game-core test` PASS; `tsc` server/web sạch; `test:db` PASS. Chưa chạy build/browser.

### Remaining
- Đã commit chỉ các hunk của I-04 (các hunk chưa commit của việc khác trong cùng file được giữ nguyên trong working tree). Sai sót phát hiện trước khi commit: regex quét ID viết `'d'` trong chuỗi JS nên mất dấu ``, không khớp chữ số; đã đổi thành `[0-9]` và thêm test `runDeterministicIdScanTests` (save không có bộ đếm, ID `ord-7`/`led-12` → mới là `ord-8`/`led-13`). Test cũ không bắt được lỗi này vì chỉ dùng bộ đếm đã lưu.
- Một lỗi cá nhân khi sửa: lần thay thế đầu dùng `String.replace` với chuỗi chứa `` $` `` làm nhân đôi nội dung `simulation.ts`; đã khôi phục (3.011 dòng) và kiểm bằng typecheck + test, nhưng nên xem `git diff` kỹ trước khi commit.

## 2026-10-01 (lượt 8 — I-12 xuất/nhập save)

### Changed
- Thêm `apps/web/src/save-file.ts` + `save-file.test.ts`, script `test` cho `apps/web` (vào `test:all`), `replaceSaveWithImported` trong `db.ts`, handler xuất/nhập trong `App.tsx`, nút và hộp xác nhận trong `SaveModal.tsx`.

### Verified
- `save-file.test.ts` PASS; `tsc -p apps/web` sạch; Browser pane: xuất, từ chối file hỏng, nhập có xác nhận, backup + revision liên tục, không lỗi console. Chưa chạy `test:all` đầy đủ (Node 20 cục bộ), chưa build, chưa mobile.

### Remaining
- Xem I-12 (giới hạn); nhiều slot, khóa nhiều tab, kiểm mobile.

## 2026-10-01 (lượt 7 — I-15 giới hạn payload/tần suất)

### Changed
- Thêm `rate-limit.ts`, `rate-limit.test.ts`, script `test:ratelimit` (nằm trong `test:unit`); nối vào `auth.guard.ts`, `bootstrap.ts` (`commitCommand`, `createServer` với `bodyParser: false` + `useBodyParser('json', {limit})`) và `world.gateway.ts` (`maxPayload`, `allowSocketMessage`).

### Verified
- `tsc` server sạch; `test:unit`, `test:db`, `verify:runtime` PASS (Node 20.19 cục bộ, `--ignore-engines` cho yarn root). Chưa chạy `test:all` trên Node 22, chưa test tải, chưa kiểm client xử lý 429.

### Remaining
- Xem I-15 (giới hạn); hiệu chỉnh ngưỡng; client hiển thị 429.

## 2026-10-01 (lượt 6 — test:all và CI)

### Changed
- Root: `test:all` (game-core + `apps/server test:unit`), `test:all:db` (thêm test Mongo). `apps/server`: `test:unit` (= `test:invariants`), `test:db` (worlds + gateway + coop). Thêm `.github/workflows/ci.yml`: job `checks` (typecheck, lint, `test:all`, build trên Node 22) và job `server-db` (service `mongo:7`, `MONGO_URI`, `test:db`).

### Verified
- Máy cục bộ chạy Node 20.19.0 trong khi `engines` yêu cầu >=22 nên `yarn` ở root từ chối chạy `test:all`/`typecheck` (lỗi môi trường, không phải lỗi mã). Đã chạy riêng: `yarn --cwd packages/game-core test` (7/7 PASS), `test:unit` PASS, `test:db` (Mongo thật cục bộ, 3 test) PASS, `eslint .` 0 lỗi / 6 cảnh báo. **Workflow CI chưa chạy lần nào** (chưa đẩy lên GitHub); `test:all` đầy đủ chưa chạy trên Node 22; chưa biết test server có cần biến Firebase trong CI hay không.

### Remaining
- Đẩy lên GitHub, xem lần chạy CI đầu và sửa nếu đỏ; cân nhắc `.nvmrc`/Node 22 cục bộ; chặn merge khi CI đỏ.

## 2026-10-01 (lượt 5 — I-01 hướng B)

### Changed
- Thêm `apps/server/src/save-invariants.ts` + `save-invariants.test.ts`, script `test:invariants`; `bootstrap.ts` gọi `checkSaveInvariants` cho lệnh không replay (trả `Save không hợp lệ: ...`); `coop-commands.test.ts` thêm ca save sửa tiền bị từ chối và save nguyên vẹn được nhận.

### Verified
- `tsc` server `--noEmit` sạch; `test:coop`, `test:worlds`, `test:gateway`, `test:invariants`: **PASS** (Mongo thật cho 3 test đầu). Chưa chạy `yarn test` game-core/build, chưa browser, chưa qua Firebase guard.

### Remaining
- Kiểm kho/giá theo lệnh; hiệu chỉnh ngưỡng bằng playtest; đưa `test:invariants` vào CI/`test:all` (I-09); rủi ro: hai client lệch pha có thể bị từ chối nếu một trong các chỉ số bị lùi.

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

### Cập nhật đồ trang trí cửa hàng — 01/10/2026

- Đã bỏ ghế xanh được dựng cứng trong `packages/game-renderer/src/viewport.ts` và nhánh texture riêng trong `premium-textures.ts`. Ghế cũ không thuộc `storeLayout`, không có hành vi gameplay nên không thể cất qua mục kho nội thất hiện có. Chưa thêm ghế mua được/bày được.
- Kiểm chứng lượt này: chỉ rà soát mã và xóa sprite; chưa chạy build, test hay browser QA.

| Category | Count |
|---|---:|
| Completed | 21 |
| Partial | 8 |
| Needs Fix | 0 |
| Planned | 6 |
| Improvement | 4 |
| Needs Verification | 7 |

(46 hệ thống S01–S46 ở mục 2; S46 mới là 🟡. Số vấn đề I-01…I-19 là danh sách riêng: 19, trong đó I-06 đã đóng.)

**Mức độ hoàn thiện:** lõi mô phỏng đơn người chơi rộng và có test lõi dày; co-op có hạ tầng nhưng chưa nghiệm thu đầu–cuối; kiểm chứng bằng browser/máy thật còn thiếu.
**Hệ thống chính đã xong (mức mã + test):** kho/lô/hạn, nhập hàng, ledger, khách/thu ngân, thị trường/thời tiết, khách quen, mục tiêu, đơn tiệc, kỹ năng, danh hiệu, server world + gateway.
**Vấn đề lớn:** I-01 (tin cậy lệnh co-op), I-15 (server tin save, không giới hạn), I-02 (bảng xếp hạng giả), I-03 (chưa ghi quyết định thiết kế), I-09 (không CI), I-19 (đèn tín hiệu: QA dở).
**Rủi ro kỹ thuật:** đồng bộ co-op, ID không xác định, `simulation.ts`/`App.tsx`/`viewport.ts` quá lớn, bundle >500 kB.
**Thiếu hệ thống:** công thức/sản xuất bếp, prestige sau cap, tín dụng/nợ khách, tiền giả, dining tại bàn/dọn bàn, biểu đồ lịch sử, heatmap khách/lối đi, checklist onboarding, âm thanh môi trường đầy đủ, engine thuế (gate TAX-0), content editor, CI. Chuỗi chi nhánh/loại tiệm/internal supply được để plan sau, phụ thuộc thiết kế mở rộng trên cùng khu đất. Kế hoạch: `openspec/changes/reference-gameplay-expansion`.
**Tập trung phát triển hiện tại (theo git):** đèn tín hiệu, người đi bộ qua đường và xe nhường đường (commit 24a2fab, QA dở); trước đó là mặt cắt đường/độ ướt.

---

## 10. Next Steps

### 🔴 High Priority
- [>] I-01: hướng B đã làm (bất biến save, 2026-10-01); còn kiểm kho/giá theo lệnh, hiệu chỉnh ngưỡng, và hướng A (server authoritative) về lâu dài. Trước đó: server replay mọi lệnh đổi tài nguyên (S22). Đã xong: từ chối `payload.type` lạ (2026-10-01). Còn: thống nhất payload client–`WorldRuntime`, rồi chuyển từng lệnh sang replay.
- [>] CI: `.github/workflows/ci.yml` đã viết (typecheck, lint, `test:all`, build, test Mongo) nhưng **chưa chạy trên GitHub** (I-09, S32, S43).
- [x] Chạy lại typecheck/test/build (2026-10-01: PASS, mục 8). Lặp lại sau mỗi đợt thay đổi.
- [ ] Browser QA hai tài khoản: tạo hẻm → mời → nhập → bán → reconnect → restart server (S38).

### 🟠 Medium Priority
- [ ] Thêm test I-01 cho lệnh hợp lệ nhưng không replay (gửi save sửa tiền) — chỉ viết được khi đã có replay/bất biến; ca lệnh lạ đã có.
- [ ] Hoàn tất đèn tín hiệu (S46, I-19): QA browser/hiệu năng (OpenSpec `traffic-light-crosswalk-yielding` 4.2–4.6), quyết định 4.5.
- [ ] Giới hạn payload/tần suất server (I-15); kế hoạch migration schema world Mongo (I-16).
- [x] Ghi quyết định thiết kế quyền sửa bố cục/mua đất của thành viên vào spec (I-03; 2026-10-01).
- [>] Lệnh nhân viên trong co-op (I-05, S21): đã làm đường commit + bất biến; còn Browser QA hai tài khoản và đồng bộ AI nhân viên.
- [>] Bảng xếp hạng thật (I-02, S28, F-05): đã nối dữ liệu thật; còn kiểm đăng nhập thật, tuần/mùa, opt-out, chống gian lận (I-01).
- [>] ID xác định thay `Date.now()/Math.random()` (I-04): code + test xong (đã commit).
- [>] Xuất/nhập save (I-12, F-04): xong xuất/nhập file, 3 ô lưu và khóa nhiều tab (2026-10-01); còn test tự động, kiểm mobile/trình duyệt khác.
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
