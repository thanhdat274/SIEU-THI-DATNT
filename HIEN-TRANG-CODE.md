# BÁO CÁO HIỆN TRẠNG CODE — SIÊU THỊ TẠP HÓA ĐẦU HẦM

> **Cập nhật cuối:** 15/10/2026 (rà lại; sửa ESLint ignore `.qa/**`, đồng bộ số liệu, mục 6.3/6.6 đã lỗi thời)
> **Trạng thái:** ⚠️ **CHƯA "hoàn tất 100%"**: còn ~**161 task `[ ]` + 22 task `[>]`** ở 29 OpenSpec change; phần lớn là QA trình duyệt/playtest, một phần là code thật chưa viết (Bước 4–6d thế giới mở).
>
> **Lưu ý:** Nhiều issue P1/P2 đã được fix từ 06→13/10: dead code (useOnlineSync, main.ts), layout_move/store/retrieve đã xóa khỏi allow-list, auto-fill handlers đã có guard, homeDoorTile co-op đã đúng. HIEN-TRANG-CODE.md được làm mới phần xác nhận.

> Nguồn chi tiết: `tổng hợp.md`, `THONG-KE.md`, `TASKS.md`, `ROADMAP.md`, `openspec/changes/*/tasks.md`, `docs/RA-SOAT-2026-10-03.md`. Khi lệch nhau, **mã và các lần chạy lệnh là nguồn đúng**.

---

## 0. KẾT QUẢ KIỂM TRA THỰC TẾ (chạy trong lượt rà 13/10/2026)

| Lệnh | Kết quả |
|---|---|
| `yarn typecheck` | ✅ PASS (0 lỗi, `tsc -b` 6 project, **3.52s**) |
| `yarn test` (game-core + game-data) | ✅ PASS (toàn bộ 112 tests, 30 suites, exit 0, **125s**) |
| `yarn --cwd apps/web test` | ✅ PASS 7 file (voice-utils, useGameStore, save-file, supplier-cart, db, slot-lock, responsive) |
| `yarn --cwd apps/server test:unit` | ✅ PASS 7/7 suites (authguard, voice, layoutlock, invariants, ratelimit, migrations, cloudsave) |
| `yarn lint` (15/10/2026) | ✅ **0 lỗi**, ⚠️ 139 cảnh báo. Trước đó 3306 lỗi do ESLint quét `.qa/chrome-profile` (đã thêm `.qa/**` vào ignores) + 1 lỗi thật ở `premium-textures.ts` (đã sửa) |
| `yarn build` | ✅ PASS (server `tsc` + web Vite); còn cảnh báo chunk >500 kB (`vendor-pixi`) và `api.ts` import kép |
| test:db, browser QA, thiết bị thật | ❌ chưa chạy (sandbox EPERM / cần Mongo) |

### Đã xác nhận fix (so với 06/10/2026)

| Issue | Trạng thái 06/10 | Trạng thái 13/10 | Chi tiết |
|---|---|---|---|
| I-11 `main.ts` lỗi thời | 🔴 file dead code | ✅ **Đã xóa** | File đã xóa khỏi repo |
| 6.5 Dead code `useOnlineSync` | 🔴 229 dòng không import | ✅ **Đã xóa** | Grep `useOnlineSync` = 0 matches |
| 6.2 layout_move/store/retrieve | 🟠 đường chết trong allow-list | ✅ **Đã xóa** | Không còn trong `ALLOWED_COMMAND_TYPES` + `serverReplayedCommands` |
| 6.4 auto-fill thiếu guard | 🟠 gọi sim mutation trước commit | ✅ **Đã fix** | `blockOfflineOnlineMutation()` gọi trước `sim.autoFillShelf()` ở cả 2 handler |
| 6.1 homeDoorTile co-op | 🟠 coop-routine không lưu config | ✅ **Đã fix** | `registerCoopAvatar` truyền `homeDoorTile` từ `COOP_HOME_DOOR_TILES`, `homeDoors` map đúng |
| 6.10 comment lệch | 🟠 comment sai ở line 105 | ✅ **Đã đúng** | Comment "cửa nhà riêng" khớp code hiện tại |

---

## 1. TỔNG QUAN KIẾN TRÚC

```
Monorepo Yarn 1 workspaces
├── packages/game-core/    → Logic thuần: 86 file nguồn (simulation.ts 6.152 dòng); toàn repo có 108 file *.test.ts
├── packages/game-data/    → Dữ liệu tĩnh: world/ (grid, parcels, placements, footprint, templates), catalog 3.794 dòng
├── packages/game-renderer → PixiJS: viewport.ts 2.774 dòng, product-sprites.ts 2.164 dòng, chỉ test atlas sprite
├── packages/shared/       → Save schema (index.ts 1.448 dòng) + protocol multiplayer
├── apps/web/              → React 19 + Vite + Pixi: App.tsx 2.456 dòng, 48 component, 7 hook
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

**Khoảng trống test (cập nhật 15/10/2026):** `game-data` thực tế có 12 file test (chạy qua runner của `game-core`, thêm `data-integrity.test.ts`: công thức, nhà cung cấp, hao hụt, lịch mùa); `game-renderer` có 3 test (atlas, `camera.test.ts`, `weather-settings.test.ts`), chưa test Pixi/viewport/sprite vẽ; `apps/web` có 8 file test, **mới 1 test component** (`TutorialChecklist`, render phía server bằng `react-dom/server`, chưa có jsdom nên chưa test tương tác click/state); vẫn không có `simulation.test.ts` riêng.

---

> **15/10/2026 — Bước 6a (`open-world-building-types`):** `open_building` nay tạo hình học tòa thật (tường/cửa/va chạm, qua lưu/nạp, kiểm vị trí). **Đã có (15/10, task 2.2 phần logic):** nội thất mặc định, dòng khách theo giờ cao điểm, bãi xe thưởng khách + thu phí. **Còn thiếu:** hình/biển riêng ở renderer, công thức cà phê riêng, UI chỉnh phí xe, `FIXTURE_SHOP.allowedBuildings`, cân bằng, browser QA. Lọc món theo loại tòa (1.3) chỉ áp cho chi nhánh tạp hóa và bãi xe.

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

### 6.1 ✅ Đã sửa: Co-op `homeDoorTile` — mỗi người về đúng cửa nhà

- **Status:** FIXED (đã xác nhận trong code 13/10/2026)
- **Root cause cũ:** `registerCoopAvatar` trong `world-runtime.ts` đã truyền `homeDoorTile` từ `COOP_HOME_DOOR_TILES` vào `simulation.registerCoopPlayer()`, và `coop-routine.homeDoors` map được set đúng trong `registerPlayer()`.
- **Code hiện tại:** `world-runtime.ts:90-94` — `registerCoopAvatar` lấy `COOP_HOME_DOOR_TILES[Math.min(index, ...)]`; `coop-routine.ts:150` — `this.homeDoors.set(config.playerId, config.homeDoorTile)`.
- **Người offline:** `world-runtime.ts:104-106` — đặt đúng vị trí cửa nhà riêng (index mapping khớp).
- **Không còn lỗi.**

### 6.2 ✅ Đã sửa: `layout_move` / `layout_store` / `layout_retrieve` — đã xóa khỏi allow-list

- **Status:** FIXED (đã xác nhận trong code 13/10/2026)
- **Root cause cũ:** 3 loại lệnh này nằm trong allow-list nhưng không có trong `serverReplayedCommands` → luôn trả 400.
- **Code hiện tại:** `bootstrap.ts:45-54` — `ALLOWED_COMMAND_TYPES` **không còn** `layout_move`, `layout_store`, `layout_retrieve`.
- **Không còn bẫy.**

### 6.3 ✅ Đã đồng bộ: quyền sửa bố cục

- 15/10/2026: `App.tsx` truyền `canEditLayout` luôn bật cho HUD (không còn kiểm chủ hẻm); khớp server cho phép mọi thành viên `layout_batch` (I-03). Mục này trong báo cáo cũ đã lỗi thời. Chưa test 2 trình duyệt.

### 6.4 ✅ Đã sửa: FE auto-fill đã có `blockOfflineOnlineMutation` guard

- **Status:** FIXED (đã xác nhận trong code 13/10/2026)
- **Root cause cũ:** `onAutoFill` và `onAutoFillAll` gọi `sim.autoFillShelf()`/`autoRestockShelves()` trước commit, không có guard → sửa cục bộ khi mất kết nối → bị server ghi đè.
- **Code hiện tại:** `App.tsx:2318` — `if (blockOfflineOnlineMutation()) return { assigned: false, ... }` trước `sim.autoFillShelf()`; `App.tsx:2330` — guard tương tự trước `sim.autoRestockShelves()`.
- **Không còn lỗi.**

### 6.5 ✅ Đã sửa: Dead code `useOnlineSync` và `main.ts` — đã xóa

- **Status:** FIXED (đã xác nhận trong code 13/10/2026)
- **Root cause cũ:** `useOnlineSync.ts` (229 dòng) và `main.ts` tồn tại nhưng không file nào import. App.tsx giữ bản sao inline.
- **Code hiện tại:** Grep toàn `apps/web/src` cho `useOnlineSync` = **0 matches**. File đã xóa khỏi repo. `main.ts` cũng đã xóa (I-11).
- **Không còn dead code.**

### 6.6 ✅ Đã có: tự nối lại WebSocket

- `useWorldSocket.ts`: `onclose` gọi `scheduleRetry` với backoff 1 s → 10 s, lấy ticket mới mỗi lần, reset `attempt` khi `onopen`. Mục cũ lỗi thời. **Chưa có test tự động và chưa thử ngắt mạng thật** (mục tiêu reconnect ≤ 10 s chưa đo).

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

### 6.10 ✅ Đã sửa: Comment lệch `world-runtime.ts:105` — đã đúng

- **Status:** FIXED (đã xác nhận trong code 13/10/2026)
- **Root cause cũ:** Comment nói "chưa được coop-routine dùng" nhưng thực tế coop-routine ĐÃ dùng `homeDoorTile`.
- **Code hiện tại:** `world-runtime.ts:105` — comment "Người offline đứng ở cửa nhà riêng của mình" khớp hoàn toàn với code `this.simulation.setCoopPlayerPosition(...)` ở dòng 106.
- **Không còn lệch.**

### 6.11 ✅ Đã kiểm và **không** phải lỗi (ghi lại để khỏi rà lại)

- `processBranches` truyền `money` mới cho từng chi nhánh (đọc lại `this.playerData.money` mỗi vòng `map`) → không âm ví.
- `checkFootprintTiles` chỉ kiểm 2 đường chéo (`x±1,y±1`) nhưng với **hình chữ nhật** là đủ để chặn mọi cạnh/góc (đã đối chiếu test `footprint.test.ts:50-51, 181-201`).
- `closeDailyRecord` idempotent, `taxDueOnClose` trừ đúng phần các ngày khác đã nộp, `applyAuditToState` xoá `hiddenTax` sau truy thu.
- `expireStock`/`decayStock`/`disposeStock`/`stowHoldingItem` giữ bảo toàn số lượng (đánh giá qua đọc + test hiện có).
- 6 cảnh báo `no-useless-assignment` (`customers.ts:278`, `maintenance.ts:98`, `simulation.ts:5046`, `db.ts:133`, `generate-manifest.js`) chỉ là khởi tạo giá trị thừa, không sai logic.

### 6.12 Tổng kết mức độ vấn đề (13/10/2026)

| Mức | Số lượng | Trạng thái |
|---|---|---|
| 🔴 P1 (có bằng chứng, ảnh hưởng gameplay) | **0** | Tất cả 4 issue P1 đã được fix (6.1, 6.2, 6.4, 6.5) |
| 🟠 P2 (lệch thiết kế, rủi ro regression) | **7** | Ghi nhận để sau — cần chốt thiết kế trước khi sửa |
| 🟢 P3 (nhỏ, cosmetic, cleanup) | **4** | Ghi nhận, ưu tiên thấp |
| ✅ Đã fix | **6** | 6.1, 6.2, 6.4, 6.5, 6.10, I-11 |

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
