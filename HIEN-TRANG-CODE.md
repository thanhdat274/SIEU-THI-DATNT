# BÁO CÁO HIỆN TRẠNG CODE — SIÊU THỊ TẠP HÓA ĐẦU HẦM

> **Cập nhật cuối:** 06/10/2026 (Đợt tiếp 8 — rà soát logic toàn bộ)
> **Trạng thái:** ⚠️ **CHƯA "hoàn tất 100%"**: còn ~**161 task `[ ]` + 22 task `[>]`** ở 29 OpenSpec change; phần lớn là QA trình duyệt/playtest, một phần là code thật chưa viết (Bước 4–6d thế giới mở).

> Nguồn chi tiết: `tổng hợp.md`, `THONG-KE.md`, `TASKS.md`, `ROADMAP.md`, `openspec/changes/*/tasks.md`, `docs/RA-SOAT-2026-10-03.md`. Khi lệch nhau, **mã và các lần chạy lệnh là nguồn đúng**.

---

## 0. KẾT QUẢ KIỂM TRA THỰC TẾ (chạy trong lượt rà 06/10/2026)

| Lệnh | Kết quả |
|---|---|
| `yarn typecheck` | ✅ PASS (0 lỗi, `tsc -b` 6 project, 1,2 s) |
| `yarn test` (game-core) | ✅ PASS (toàn bộ suite, exit 0, ~67 s) |
| `yarn --cwd apps/web test` | ✅ PASS 6 file (voice-utils, useGameStore, save-file, supplier-cart, db, slot-lock) |
| `yarn --cwd apps/server test:unit` | ✅ PASS 4/4 (invariants ẩn, rate-limit, migrations, cloud-save) |
| `yarn lint` | ✅ **0 lỗi**, ⚠️ **104 cảnh báo** (91 unused-vars, 6 no-useless-assignment, 4 react-hooks/exhaustive-deps, 3 no-explicit-any) |
| `yarn build` | ✅ PASS (server `tsc` + web Vite 657 ms); còn cảnh báo chunk >500 kB (`vendor-pixi` 588 kB) và `api.ts` import vừa tĩnh vừa động |
| `git status` | ✅ cây làm việc **sạch** (ghi chú cũ "working tree chưa commit" đã hết giá trị) |
| `test:db` (`worlds`/`gateway`/`coop`/`leaderboard`), browser QA, thiết bị thật | ❌ chưa chạy trong lượt này (cần Mongo local + môi trường có dev server) |

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Monorepo Yarn 1 workspaces
├── packages/game-core/    → Logic thuần: 86 file nguồn (simulation.ts 5.103 dòng); toàn repo có 108 file *.test.ts
├── packages/game-data/    → Dữ liệu tĩnh: world/ (grid, parcels, placements, footprint, templates), catalog 3.794 dòng
├── packages/game-renderer → PixiJS: viewport.ts 2.158 dòng, product-sprites.ts 2.147 dòng, 0 test
├── packages/shared/       → Save schema (index.ts 1.448 dòng) + protocol multiplayer
├── apps/web/              → React 19 + Vite + Pixi: App.tsx 2.120 dòng, 48 component, 7 hook
├── apps/server/           → NestJS decorator tay + Firebase + Mongo: 14 file nguồn, 9 file test
└── tools/content-editor/  → CLI kiểm/xuất dữ liệu (validate, export)
```

**29 OpenSpec change đang mở** (5 change thuộc "Bước 2–6d thế giới mở") + 1 đã archive (`premium-vietnamese-pixel-ui`).

---

## 2. CHỨC NĂNG CÓ CODE + TEST + UI

Vẫn đúng như báo cáo trước (41 nhóm gameplay + co-op + hạ tầng), **bổ sung/xác nhận trong lượt này**:

| # | Chức năng | Ghi chú mới |
|---|-----------|-------------|
| 38b | Quán nước (tòa 3, bản đồ 36 cột) | Có code + test + ảnh chụp; **chưa có sprite bàn/quầy riêng**, chưa QA đêm/mưa |
| 42 | Chuỗi chi nhánh | **UI đã có `ChainModal`** (mở chi nhánh/đặt tên, chuyển–trả nhiều món, mức giá + thuê quản lý). `switchBranch`/`activeBranchId` **không có trên UI** → chết ở FE |
| 43 | Thế giới mở Bước 2–3 (`open-world-main-expansion`, `open-world-building-relocation`) | Mở rộng sàn theo ô, ngân sách theo cấp, đặt/dời tòa vào lô tự chọn, tòa thi công, tab "Đã Mở rộng" có chạm/kéo cho mobile, heatmap theo vị trí tòa |
| 44 | Voice chat P2P (WebRTC, signaling qua WS) | Có code + `voice-signal.test.ts`; **chưa thử 2 client thật** |

---

## 3. CÓ CODE NHƯNG CHƯA QA ĐẦY ĐỦ

Không thay đổi nhiều so với trước: tiền giả, production/bếp, dining, prestige, bảo trì, kiểm tra thuế/khai bớt, cloud save, trang trí mùa, tutorial checklist, PWA, đèn tín hiệu, bóng cây, quán nước/tiệm xôi (co-op 2 client), voice chat.

**Khoảng trống test (không đổi):** `game-renderer` 0 test; `game-data` 1 test; `apps/web` chỉ 6 file test (không test component); không có `simulation.test.ts`.

---

## 4. OPENSPEC — TASK MỞ (đếm lại trong lượt này)

| Change | `[ ]` mở | `[>]` dở | Phần còn lại chính |
|---|---|---|---|
| open-world-land-reclamation | 17 | 0 | **Bước 4**: khai hoang W1–W4, giá/khách theo mặt tiền, thành phố đông dần, chunk 16×16 + culling |
| open-world-building-types | 14 | 0 | **Bước 6a**: loại tòa theo dữ liệu, 4 loại mới (tạp hóa nhánh, cà phê, bãi xe, cơm), hạng theo diện tích, sổ cái theo tòa |
| open-world-districts-city-goals | 14 | 0 | **Bước 6d**: khu vực có bản sắc, cấp/mục tiêu thành phố, ký ức thành phố |
| open-world-coop-land | 13 | 0 | **Bước 5**: giữ chỗ quy hoạch, bảng quyền, phiếu chi lớn |
| open-world-land-lease | 10 | 0 | **Bước 6b**: thuê đất theo ngày, mua có khấu trừ, giá đất động |
| open-world-coop-contracts | 8 | 0 | **Bước 6c**: người phụ trách tòa, hợp đồng cung ứng nội bộ, thành tích theo người |
| branch-chain | 8 | 14 | Renderer biến theo loại hình, chương 7 đếm chi nhánh thật, goals theo chuỗi, browser QA 8.2, cân bằng 8.3 |
| shared-alley-multiplayer | 11 | 0 | 2 browser, failure injection, reconnect, OAuth thật |
| dynamic-economy-simulation | 9 | 0 | Co-op 2 phiên, nối giá người chơi vào nhu cầu, server kiểm giá, playtest |
| stardew-inspired-management-loop | 7 | 0 | Gate playtest |
| store-layout-expansion | 6 | 0 | Mobile, 2 session, balance giá đất |
| open-world-building-relocation / land-grid / main-expansion | 0 | 3+2+3 | Chỉ còn "nhìn bằng mắt": desktop/mobile/co-op |
| còn lại (adapt, arrival, fixture, level, voice, rain, reference-gameplay, road, seasonal, snack, theft, traffic-light, ve-so, written-reviews, xoi) | 3–4 mỗi change | 0 | Gần như toàn bộ là **browser QA + playtest cân bằng** |

**Tổng: 161 task `[ ]` + 22 task `[>]`.**

---

## 5. CHƯA CÓ CODE / CHƯA LÀM

| # | Tính năng | Ưu tiên | Ghi chú |
|---|-----------|---------|---------|
| 1 | Bước 4–6d "thế giới mở" (7 change) | 🟡 theo lộ trình | Xem bảng mục 4; đã chốt hướng, chưa code |
| 2 | Browser QA / playtest tập trung | 🔴 High | Chiếm đại đa số task mở |
| 3 | Đo FPS/CPU/GPU máy thật (S39), QA 2 browser (S38) | 🔴 High | Chưa có số đo thật |
| 4 | Content editor giao diện (S42) | ⚪ | Mới có CLI chỉ đọc |
| 5 | Âm thanh đầy đủ (S40) | 🟢 Low | Chỉ Web Audio + ambient |
| 6 | A11y/cảm ứng (I-18) | 🟢 Low | Checklist focus/aria chưa làm |
| 7 | UI xem lại replay ngày chơi (F-11) | 🟢 Low | Có `replay.ts` + test, không có UI |
| 8 | Thuế đầy đủ TAX-1…8 | 🟡 | Chỉ có khoán 1%/0,5% + audit; registry UNVERIFIED |
| 9 | Chợ/trường/khu công nghiệp, luân chuyển nội bộ (S45) | 🟢 | Sau Bước 6a |
| 10 | Bảng xếp hạng theo tuần/mùa + opt-out + chống gian lận (F-05) | 🟢 | Phụ thuộc I-01/Hướng A |
| 11 | Vận hành: chạy `dist/`, `trust proxy`, multi-instance, logging, sao lưu | 🟠 | Xem `docs/deploy.md` |
| 12 | Gỡ ~104 cảnh báo lint, tách `simulation.ts`/`App.tsx`/`viewport.ts` | 🟡 | Xem mục 8 |

---

## 6. LOGIC NGHI VẤN / SAI (rà mới trong lượt này)

> Mức: 🔴 có bằng chứng trong mã, ảnh hưởng hành vi · 🟠 lệch thiết kế/dead code · 🟢 nhỏ.
> **Chưa tái hiện bằng chơi thật** — đều là kết luận từ đọc mã + đối chiếu chéo.

### 6.1 🔴 Hẻm chung: `homeDoorTile` của từng người bị bỏ, ai cũng đi về **một** cửa nhà

- **Bằng chứng:**
  - `packages/game-core/src/coop-routine.ts:148-167` — `registerPlayer(config)` chỉ dùng `config.playerId`; `homeDoorTile`/`bedTile`/`workLocationTile` **không được lưu**.
  - `packages/game-core/src/coop-routine.ts:444-448` + `:428` — cửa nhà lấy từ `this.world.playerConfigs[playerId]`, thiếu thì rơi về `HOME_DOOR_TILE`.
  - `packages/game-core/src/simulation.ts:3910-3915` — `tickCoopRoutine` gọi `setWorld({ ..., playerConfigs: {} })`: **luôn rỗng**.
  - `packages/game-core/src/world-runtime.ts:14, 91-95` — server có `COOP_HOME_DOOR_TILES` (`{3,12}` và `{5,12}`) và truyền vào `registerCoopPlayer`, nhưng giá trị không tới được `coop-routine`.
  - `packages/game-core/src/world-runtime.ts:104-107` — người offline bị đặt về `HOME_DOOR_TILE` (nhà của người chơi 1) thay vì nhà của chính họ.
- **Hệ quả:** cả hai người (và mọi người offline) đều được autopilot dẫn về ô `(3,12)`; `getCoopRoutineStates().homeDoorTile` báo sai cho mọi người chơi khác; comment "cửa nhà riêng chưa được coop-routine dùng" ở `world-runtime.ts:105` **ngược với mã** (coop-routine có dùng, chỉ là không ai truyền vào). Nếu sau này thêm nhà riêng/bed cho từng người thì logic hiện tại sẽ ghi đè.
- **Đề xuất:** cho `CoopRoutineSystem.registerPlayer` lưu config (hoặc truyền `playerConfigs` trong `setWorld`), thêm 1 test: hai player có `homeDoorTile` khác nhau thì `reachedPlayer(..., 'home')` đúng theo từng người.

### 6.2 🟠 `layout_move` / `layout_store` / `layout_retrieve` là đường chết (nhưng vẫn nằm trong allow-list)

- `apps/server/src/bootstrap.ts:45-53` cho phép 3 loại lệnh này; `packages/game-core/src/world-runtime.ts:316-327` có nhánh xử lý đầy đủ.
- Nhưng cả 3 **không** nằm trong `serverReplayedCommands` (`bootstrap.ts:113-122`) → rơi vào nhánh `bootstrap.ts:227-229`: `!serverReplayedCommands.has(type) && !sameLayout()` → **luôn 400** "Thay đổi bố cục phải dùng layout_batch đã kiểm tra" (vì lệnh này đổi bố cục theo định nghĩa).
- FE không gửi 3 lệnh này (chỉ `layout_batch`), nên hiện không lộ ra người chơi, nhưng đây là **bẫy**: ai gọi lại tưởng đã hỗ trợ. **Đề xuất:** bỏ khỏi allow-list + xoá nhánh `world-runtime`, hoặc chuyển sang nhóm server-replay.

### 6.3 🟠 UI chặn quyền sửa bố cục khác server (mâu thuẫn với quyết định I-03)

- `apps/web/src/App.tsx:1759` — `canEditLayout={!onlineWorld || owner là mình}`: chỉ **chủ hẻm** mới thấy nút sửa bố cục.
- `apps/server/src/bootstrap.ts:191` — bất kỳ **thành viên** nào cũng được `layout_batch`/mua đất (đã ghi spec I-03).
- **Hệ quả:** thành viên thứ hai không mở được trình sửa bố cục trên UI dù server cho phép; nếu sau này siết quyền ở server thì phải sửa cả hai nơi. **Đề xuất:** chốt một nguồn quyền duy nhất (nên đưa `canEditLayout` theo `permissions` từ server).

### 6.4 🟠 FE: 2 handler bỏ qua `blockOfflineOnlineMutation` (sửa cục bộ khi mất kết nối hẻm chung)

- `apps/web/src/App.tsx:2148-2158` (`onAutoFill`) và `:2159-2174` (`onAutoFillAll`) gọi `sim.autoFillShelf(...)`/`autoRestockShelves()+autoFillAllShelves()` **trước**, rồi mới `if (onlineWorldRef.current) void commitBusinessChange(...)`.
- Mọi handler khác đều `if (blockOfflineOnlineMutation()) return;` trước khi sửa mô phỏng (≈25 chỗ).
- **Hệ quả:** khi đang chơi hẻm chung mà mất kết nối, kho/kệ bị sửa ở máy, lệnh không được lưu, rồi bị snapshot server ghi đè → người chơi thấy hàng "tự nhiên biến mất/quay lại". **Đề xuất:** thêm guard + `persistSimulationMutation` như các handler khác.

### 6.5 🟠 Dead code & trùng lặp sau refactor nửa vời

- `apps/web/src/hooks/useOnlineSync.ts` (229 dòng) và `apps/web/src/hooks/useSaveMgmt.ts`: **không file nào import** (đã grep toàn `apps/web`). App.tsx đang giữ bản sao inline: vòng poll 3 s `App.tsx:764-802` trùng ý tưởng với `startOnlinePolling` (`useOnlineSync.ts:164-199`), cùng `commitBusinessChange`/`persistSimulationMutation`/`resyncOnlineWorldAfterReject`.
- Bản trong hook còn 2 lỗi con: `consecutiveFailuresRef` khai mà không dùng (`useOnlineSync.ts:37`), và `useEffect(() => setOnlineConnectedReal(onlineConnected), [onlineConnected])` (`:40`) **tự gán chính nó** → state `onlineConnected` của hook luôn `true` (App dùng state riêng nên chưa lộ ra UI, nhưng nếu chuyển sang hook này thì băng-rôn "mất kết nối" sẽ không bao giờ hiện).
- **Đề xuất:** xoá 2 hook chết (hoặc chuyển App sang dùng chúng một lần, có test), tránh 2 bản logic co-op.

### 6.6 🟠 Co-op: client không tự kết nối lại WebSocket

- `apps/web/src/hooks/useWorldSocket.ts:118-121` — `socket.onclose` chỉ `setConnected(false)`, **không có retry/backoff**; effect chỉ chạy lại khi `worldId`/`token` đổi.
- Sau khi mạng chớp, chỉ còn vòng poll HTTP 3 s (`App.tsx:764-802`) làm kênh đồng bộ → snapshot 250 ms, avatar bạn cùng hẻm và phiếu thời gian đứng yên đến khi tải lại trang.
- Đối chiếu mục tiêu "Reconnect ≤ 10 s" (`THONG-KE.md` §6) → hiện chưa có cơ chế đáp ứng. **Đề xuất:** thêm reconnect có backoff + test bằng cách đóng socket.

### 6.7 🟡 Nghi vấn kiến trúc: client vẫn chạy mô phỏng đầy đủ trong hẻm chung

- Client gọi `simulation.setCoopMode(true)` (`App.tsx:688`) nhưng **không** dừng sinh khách/bán hàng cục bộ (chỉ `setPaused(true)` khi mở trình sửa bố cục, `App.tsx:1221-1226`).
- Lệnh `checkout` phải trỏ tới khách **đang tồn tại trên server** (`simulation.completeCustomerCheckout` trả `false` nếu không thấy `checkoutId`). Khách do client sinh (giữa 2 snapshot) rồi bấm thu ngân ⇒ nguy cơ 400 + toast "Máy chủ từ chối… Đã khôi phục dữ liệu" (commit c3804a1 đã giảm giật hình, chưa giải quyết nguồn).
- Cùng nhóm: `save-invariants.ts` chỉ kiểm **tiền/doanh thu tăng** ≤ 20.000 ₫/phút game, chưa kiểm kho/giá (đã ghi trong `docs/RA-SOAT-2026-10-03.md`).
- **Cách kiểm:** test 2 browser, đếm số lần bị 400 trong 1 ngày game; hoặc cho client `setPaused` khi `onlineWorld` đang bật.

### 6.8 🟡 `switchBranch` / `activeBranchId` không có đường vào từ UI

- Grep toàn `apps/web`: không có `switchBranch`/`activeBranchId`. UI chỉ có `onOpenBranch`/`onTransfer`/`onReturn`/`onPolicy` (`App.tsx:2086-2089`, `ChainModal.tsx`).
- Trong khi đó `processBranches` **chạy nền mọi chi nhánh kể cả chi nhánh đang chọn** (`simulation.ts:3031` ghi rõ là giới hạn).
- **Đề xuất:** chốt là bỏ khái niệm "chi nhánh đang chọn" (Bước 6a viết lại) hoặc làm chế độ điều hành; hiện đang mang cả hai nửa.

### 6.9 🟢 `saveCheckpoint` bỏ im lặng khi revision đã tiến

- `apps/server/src/world.repository.ts:154-164` — `updateOne({ _id, 'world.revision': world.revision })`; nếu có commit vừa chạy, `matchedCount = 0`, checkpoint (giờ + vị trí avatar) bị **huỷ không log, không retry**.
- Hiện tự phục hồi ở chu kỳ sau, nhưng khi debug "tại sao giờ/vị trí lệch" sẽ không có dấu vết. **Đề xuất:** log khi `matchedCount === 0`.

### 6.10 🟢 Lệch số liệu nhỏ giữa mã và tài liệu

| Chỗ | Mã | Tài liệu/comment |
|---|---|---|
| `apps/server/src/world.gateway.ts:65` | `SNAPSHOT_INTERVAL_MS = 250` | "snapshot 500 ms" (`:21` trong cùng file, `THONG-KE.md` §1) → thực tế gấp đôi lưu lượng |
| `packages/game-core/src/chain.ts:7` | đã nối save/lệnh/UI | "chưa nối vào lệnh, save, UI" |
| `packages/game-core/src/branch-ops.ts:10` | đã nối qua `processBranches` | "Chưa nối vào `GameSimulation`" |
| `packages/game-core/src/world-runtime.ts:105` | coop-routine **có** dùng `homeDoorTile` | "chưa được coop-routine dùng" |
| `apps/server/src/world.gateway.ts:136` | `cors: { origin: '*' }` cho WS | có kiểm origin thủ công khi `connect`, nhưng cấu hình vẫn mở (comment nói "narrowed by main.ts" — không đúng với WS) |

### 6.11 ✅ Đã kiểm và **không** phải lỗi (ghi lại để khỏi rà lại)

- `processBranches` truyền `money` mới cho từng chi nhánh (đọc lại `this.playerData.money` mỗi vòng `map`) → không âm ví.
- `checkFootprintTiles` chỉ kiểm 2 đường chéo (`x±1,y±1`) nhưng với **hình chữ nhật** là đủ để chặn mọi cạnh/góc (đã đối chiếu test `footprint.test.ts:50-51, 181-201`).
- `closeDailyRecord` idempotent, `taxDueOnClose` trừ đúng phần các ngày khác đã nộp, `applyAuditToState` xoá `hiddenTax` sau truy thu.
- `expireStock`/`decayStock`/`disposeStock`/`stowHoldingItem` giữ bảo toàn số lượng (đánh giá qua đọc + test hiện có).
- 6 cảnh báo `no-useless-assignment` (`customers.ts:278`, `maintenance.ts:98`, `simulation.ts:5046`, `db.ts:133`, `generate-manifest.js`) chỉ là khởi tạo giá trị thừa, không sai logic.

---

## 7. NỢ KỸ THUẬT

| Vấn đề | Chi tiết | Mức |
|--------|----------|-----|
| `simulation.ts` 5.103 dòng | Đã tách 5 manager (Ledger/Quest/Production/StallsMarkets/Dining) + `store-logistics`; vẫn gom kho, khách, quầy, an ninh, thuế | 🟡 |
| `App.tsx` 2.120 dòng | Handler + commit online inline; 2 hook đã tách ra thì bị bỏ quên (6.5) | 🟡 |
| `viewport.ts` 2.158 dòng, 0 test | Trộn render và logic | 🟡 |
| 104 cảnh báo lint | 91 unused imports/biến (trong đó 1 số ở file test) | 🟢 |
| Hard-code còn lại | vị trí bảo vệ, giá đất, hạng mở rộng (`EXPANSION_TILE_*`), số tạm của quán nước/quán ăn vặt | 🟢 |
| Test web mỏng | Không test component/UI | 🟡 |
| Catalog sinh ra | `catalog-manifest.ts` 3.729 dòng khó đối chiếu CSV | 🟢 |
| Bundle | Còn chunk >500 kB + `api.ts` import vừa tĩnh vừa động (I-10) | 🟢 |

---

## 8. KIẾN NGHỊ ƯU TIÊN

1. **Sửa 3 lỗi có bằng chứng rõ trong mã** (rẻ, ảnh hưởng thật): 6.1 (cửa nhà co-op), 6.4 (guard offline cho auto-fill), 6.2 (đường chết layout_move) + 6.5 (xoá hook chết).
2. **Browser QA tập trung**: 3–5 ngày game trên save sạch (mở cửa → nhập → bày → khách → thu ngân → qua ngày → báo cáo), rồi QA 2 browser cho hẻm chung (đây là nơi 6.6/6.7 sẽ lộ).
3. **Đo FPS/CPU máy thật** (S39) + mobile/iPad thật.
4. **Sửa tài liệu**: `tổng hợp.md` bỏ dòng "hoàn tất 100%", làm mới mục 5, cập nhật `THONG-KE.md` §6 (số task mở = 161/22), và các comment lệch ở 6.10.
5. **Playtest cân bằng**: thuế/kiểm tra thuế, sản xuất, đồ uống, giá đất, giá mở tòa mới, nhịp khách.
6. **Chốt thiết kế trước khi code tiếp**: quyền sửa bố cục trong co-op (I-03 + 6.3), số phận "chi nhánh đang chọn" (6.8), và **Hướng A/B cho I-01** (hiện đã nghiêng về server-replay: **50/55 loại lệnh** trong `ALLOWED_COMMAND_TYPES` được server phát lại; chỉ còn `layout_batch` (kiểm riêng), `auto_buy_sync`, `layout_move/store/retrieve` là tin save client — 3 lệnh sau thực tế không dùng được, xem 6.2).
7. **Bắt đầu Bước 4** (`open-world-land-reclamation`) chỉ sau khi 2 + 3 xong, vì mọi bước sau đều dựa trên nền co-op/lô đất đang chưa được kiểm chứng.

---

*Cập nhật mỗi lần được yêu cầu. Lần này: 06/10/2026 — có chạy lại `typecheck`, `test`, `test web`, `test:unit` server, `lint`, `build`.*
