# Kế hoạch chuyển sang 3D (Babylon.js, phong cách pixel nổi khối)

> Trạng thái: A ✅, B ✅, C1–C4 ✅ (đã tích hợp asset Kenney 3D cho civic, cây, đèn, phụ kiện), C5 chưa làm, D ✅, E1–E3 ✅, F1–F2 ✅, G1–G3 ✅, H1 ✅ (3D là mặc định từ 2026-10-21; `?r=2d` hoặc cài đặt để về 2D cổ điển), H2 chưa làm. Bước 4.7 (QA tạp hóa v1): ĐÃ QA MỘT PHẦN, CHƯA KHÓA — kiểm tra runtime ngày/đêm/mưa, mở bảng tòa và vào nội thất; FPS trung bình 57.0–57.6, 125–142 draw calls/khung ở render target 426×184. Ảnh được xem trong phiên QA nhưng chưa lưu thành file trong `.qa`; giới hạn cấu hình và tiêu chí khóa ở mục Bước 4.7. Ngày cập nhật: 2026-10-22.
> Nguyên tắc: mỗi bước là một thay đổi nhỏ, chạy được, test được, có thể dừng ở bất kỳ bước nào mà game vẫn chơi được.

## Bước 4.7 — Khóa và QA tạp hóa v1 (2026-10-22)

**Trạng thái: QA runtime một phần; chưa ký khóa v1.** Phạm vi: cảnh tạp hóa ngày/đêm/mưa, bảng chi tiết tòa, vào nội thất, FPS và draw calls. Đây là QA renderer hiện tại, không thay đổi gameplay/save.

### Kết quả runtime

| Cảnh | FPS TB | p1 | p95 khung | Khung chậm nhất | Draw calls/khung | Ghi chú |
|---|---:|---:|---:|---:|---:|---|
| Ngày (`?debugTime=1:12:30:0`) | 57.2 | 26.2 | 25.0 ms | 49.9 ms | 127 | 287 mẫu / cửa sổ 5 giây |
| Đêm (`?debugTime=1:22:0:0`) | 57.0 | 29.9 | 17.0 ms | 91.8 ms | 142 | 285 mẫu / cửa sổ 5 giây |
| Mưa (`?debugTime=1:14:30:0.9`) | 57.6 | 29.9 | 17.0 ms | 98.0 ms | 125 | 289 mẫu / cửa sổ 5 giây |

- Cấu hình: trình duyệt QA local, viewport 1280×720, DPR 1; màn hình báo 1920×1080. Canvas cảnh game là 1280×554 CSS và render target 426×184 (độ phân giải nội bộ 1/3 chiều rộng/cao). Đo bằng `?perf=1`, cửa sổ trượt 5 giây sau khi tải cảnh ổn định; FPS là trung bình frame-time, p1 là FPS tính từ frame chậm nhất 1%, p95 là frame-time phân vị 95.
- Đã quan sát bằng mắt ba cảnh; ban đêm có ánh sáng cửa sổ/đèn đường, mưa có hạt mưa và mặt đường ướt. Ảnh là output chụp trong phiên trình duyệt ngày 22/10 nhưng công cụ giao diện không cung cấp đường lưu PNG, nên chưa có file tham chiếu bền vững trong `.qa`.
- Tương tác: click tòa tạp hóa mở bảng chi tiết (tình trạng, doanh thu, khách, nhân viên, tồn kho); nút “Vào trong” chuyển camera vào nội thất. PASS trong phiên local demo.
- Console lỗi trình duyệt: 0. `yarn typecheck`: PASS. `yarn --cwd packages/game-renderer-3d test`: PASS (toàn bộ test runner). `yarn --cwd apps/web build`: PASS; `npx eslint apps/web/src/services/perf-overlay.ts packages/game-renderer-3d/src/babylon-viewport.ts`: PASS; build có cảnh báo chunk lớn và một dynamic import không tách chunk (không phát sinh bởi đo QA).

### Công cụ đo

- Bổ sung phép đo draw calls chỉ trong DEV khi URL có `?perf=1`: bật `SceneInstrumentation` của Babylon trong cảnh QA và hiển thị draw calls/khung trong overlay hiệu năng. Không chạy trong production và không đổi logic game.
- File liên quan: `packages/game-renderer-3d/src/babylon-viewport.ts`, `apps/web/src/services/perf-overlay.ts`.

### Giới hạn và điều kiện để khóa

- Bộ save đang dùng là Local Demo mới, kho có hàng nhưng 30 kệ bán trống; đây không phải save QA đã nạp đủ kệ, nên ảnh nội thất chưa xác nhận chất lượng khi cửa hàng bày đủ hàng.
- Ảnh chưa được lưu thành file trong `.qa`; cần lưu được ba ảnh tham chiếu ngày/đêm/mưa vào thư mục QA để bản khóa có thể tái kiểm tra.
- Render target 426×184 và kết quả 57.0–57.6 FPS chưa đáp ứng chắc chắn mục tiêu 60 FPS ở màn hình desktop; p1 thấp và có frame chậm nhất 99.9 ms ở mưa. Cần xác nhận trên cảnh/save đại diện và quyết định chất lượng/resolution phù hợp trước khi ký khóa.
- Do các giới hạn trên, bước 4.7 vẫn mở. Không ghi nhận “tạp hóa v1 đã khóa”. Tiếp theo: chạy bằng save QA đủ hàng, lưu ba ảnh vào `.qa/qa-phase2/`, đo lại ở cấu hình render đã phục hồi/được chốt, rồi đánh giá ảnh trước khi khóa.
## 0. Quyết định nền

| Hạng mục | Chọn | Lý do |
|---|---|---|
| Engine | **Babylon.js** (`@babylonjs/core`, import theo đường dẫn con để tree-shake) | Ưu tiên **máy tính** (2026-10-19): dung lượng tải không còn là vấn đề chính; được Inspector để soi cảnh, TypeScript gốc, API ổn định giữa các bản, PBR/bóng/post-process/GUI có sẵn, WebGPU sẵn sàng. Bản điện thoại tối ưu sau. |
| Nền tảng ưu tiên | **Desktop** (chuột + bàn phím), mobile để sau | Quyết định của chủ dự án; QA 3D chạy trên desktop trước, mobile chỉ cần không vỡ. |
| Phong cách | Low-poly + texture pixel 16px (`NearestFilter`) + **vẽ ở độ phân giải thấp rồi phóng** + viền/đổ bóng bậc | Giữ chất pixel hiện tại nhưng nổi khối, xoay camera được. |
| Camera | Phối cảnh trực giao (`OrthographicCamera`) góc isometric, xoay 4 hướng 90°, zoom theo bậc | Kiểu City Skylines thu nhỏ, pixel không bị "bơi" khi xoay tự do. |
| Mô hình | Kenney 3D (City Kit Commercial/Suburban, Furniture Kit, Food Kit) dạng `.glb` + tự dựng khối bằng code cho tường/sàn | Miễn phí, cùng pipeline phi thương mại đang dùng. |
| Bản đồ | **Làm lại bản đồ** (được phép đập), nhưng vẫn dựa trên lưới ô của `GameTileMap` | Logic đi lại, va chạm, lô đất, đợt khai hoang trong `game-core` giữ nguyên → không phải viết lại mô phỏng/co-op. |
| Chuyển dần | Renderer 3D chạy **song song** với Pixi, bật bằng cờ `?r=3d` / setting | Lúc nào cũng còn bản 2D để chơi và so sánh. |

**Bất biến cần giữ:** `game-core`, `game-data` (trừ phần bản đồ), `apps/server`, giao thức WS, save schema — renderer 3D chỉ **đọc** trạng thái như Pixi đang đọc.

---

## Giai đoạn A — Tách giao diện renderer (chưa có 3D)

Mục tiêu: `App.tsx` không phụ thuộc trực tiếp `PixiGameViewport` nữa.

**A1. Định nghĩa interface `GameViewport`** trong `packages/game-renderer/src/viewport-api.ts`
- Gom đúng các hàm `App.tsx` đang gọi: `initialize`, `destroy`, `updateTileMap`, `setStallSoldOut`, `setOpenedWaves`, `setPlanningReservations`, `showWaveOverlay`, `addFloatingGain`, `locateWarehouse`, `zoomIn`, `zoomOut`, `getZoom`, cùng `PixiGameViewportOptions` (`onZoomChange`, `onParcelTap`, `getPartnerAvatar`).
- `PixiGameViewport implements GameViewport`.
- ✅ Kiểm: `yarn typecheck`, game chạy y như cũ.

**A2. Factory `createViewport(kind, options)`**
- `App.tsx` gọi factory thay vì `new PixiGameViewport`. `kind` đọc từ `?r=3d` hoặc localStorage `renderer`.
- `kind = '3d'` lúc này trả lỗi rõ ràng "chưa có" → fallback Pixi.
- ✅ Kiểm: không đổi hành vi.

**A3. Tách các hàm tiện ích không phụ thuộc Pixi** (`getRoofProximity`, `getWeatherVisualState`, `planningOverlays`, `onThunder`) ra khỏi `viewport.ts` nếu chúng đang dính Pixi → để renderer 3D tái dùng.
- ✅ Kiểm: test renderer cũ vẫn xanh (`yarn --cwd packages/game-renderer test`).

---

## Giai đoạn B — Khung 3D trống (proof of concept)

Tạo package mới `packages/game-renderer-3d` (không sửa package Pixi).

**B1. Cài Babylon** (`@babylonjs/core`, `@babylonjs/loaders` cho `.glb`, `@babylonjs/inspector` chỉ ở dev) vào package mới. Import theo đường dẫn con (`@babylonjs/core/Meshes/mesh`) để Vite tree-shake; không import gốc `@babylonjs/core`.

**B2. `BabylonGameViewport` implements `GameViewport`**: tạo `Engine` trên canvas, `Scene`, `ArcRotateCamera` ở `Camera.ORTHOGRAPHIC_CAMERA`, `engine.runRenderLoop` gọi `FixedStepSimulationRunner` như Pixi đang làm. Các hàm chưa làm → no-op. Phím tắt dev (vd. `F9`) bật Inspector để soi cảnh.
- ✅ Kiểm: `?r=3d` mở ra màn hình nền xanh, mô phỏng vẫn chạy (tiền/giờ trên HUD thay đổi).

**B3. Sàn lưới từ `GameTileMap`**: một mesh ô vuông với thin instances (`thinInstanceAdd`), màu theo loại ô (đường/vỉa hè/cỏ/sàn tiệm). Tọa độ: 1 ô = 1 đơn vị, `x → X`, `y → Z`.
- ✅ Kiểm: nhìn thấy đúng hình bản đồ từ trên xuống; test đơn vị cho hàm `tileToWorld`/`worldToTile`.

**B4. Camera iso + điều khiển (desktop trước)**: kéo chuột phải/giữa để pan (WASD vẫn là đi lại; camera bám người chơi), lăn chuột zoom theo bậc, `Q`/`R` xoay 90° (khóa `alpha` theo bậc; `E` đã dùng cho tương tác). Chạm/pinch trên mobile để sau. Tái dùng logic chặn biên từ `camera.ts` nếu được.
- ✅ Kiểm: desktop 1280×720, 1920×1080; mobile chỉ cần không vỡ.

**B5. Pipeline "pixel"**: `engine.setHardwareScalingLevel(n)` hoặc `PassPostProcess` độ phân giải thấp (chiều cao ~360–540px) + lấy mẫu `NEAREST_SAMPLINGMODE`, canvas CSS `image-rendering: pixelated`. Snap camera theo bước 1 pixel ảo để không rung.
- ✅ Kiểm: ảnh chụp so sánh sắc nét, không nhòe; đo FPS desktop (mục tiêu 60fps ở 1080p trên máy tầm trung).

---

## Giai đoạn C — Bản đồ 3D mới (một dải phố)

**C1. ✅ Định dạng bản đồ 3D**: thêm vào `game-data` mô tả nhẹ cho mỗi tòa: `modelId`, chiều cao tầng, màu mái, biển hiệu. Hình học ô (bounds, cửa) **vẫn lấy từ `MapBuilding`** đã có. Model catalog trong 3D renderer ánh xạ sang các asset glb của Kenney City Kit (`building_civic_clinic`, `building_civic_police`, `building_civic_school`, `building_low_detail_wide_a`).
- ✅ Kiểm: test unit trong `packages/game-renderer-3d` bắt buộc mọi `modelId` trong `BUILDING_VISUALS` phải tồn tại trong `MODEL_CATALOG`.

**C2. ✅ Dựng khối nhà bằng code**: tường đùn từ `bounds`, mái, ô cửa khoét theo `doorTiles`, mái hiên theo `awning`. Texture pixel 16px dùng chung atlas.

**C3. ✅ Đường, vỉa hè, vạch kẻ, đèn giao thông** (tái dùng dữ liệu `road-surface`, `street-signal`).

**C4. ✅ Đồ trang trí ngoài phố** (cây, cột điện, xe máy đỗ, rào chắn, cọc tiêu, thùng rác) từ Kenney `.glb` qua `ModelLibrary`, nhân bản bằng thin instances.

**C5. Đập & làm lại bản đồ** (tùy chọn, chỉ khi C1–C4 ổn): sửa layout `game-data` cho hợp 3D (đường rộng hơn, lô vuông vức hơn). Tăng `schemaVersion` + migration save nếu vị trí tòa đổi.
- Kiểm: test `world-golden`, `reclamation-map`, `neighborhood` cập nhật & xanh; save cũ nạp được.

---

## Giai đoạn D — Nhân vật & thứ chuyển động

**D1. ✅ Người chơi + bạn co-op**: `Characters3D` dùng model GLB khi đủ 12 model tải xong; đường lỗi/chưa sẵn sàng còn fallback `Actors3D` billboard.
**D2. ✅ Khách hàng, NPC khu phố**: `Characters3D` dùng model GLB, giữ `Crowd3D` billboard làm fallback; xe cộ chạy trên đường (`Vehicles3D`), người đi bộ qua đường trước tiệm. (22/10/2026: đang làm registry ngoại hình theo role và prototype xe đẩy 3D cho vendor; xem `docs/plans/character-style/2026-10-22-role-diversity-plan.md`. Chưa QA prototype bằng ảnh.)
**D3. ✅ Bong bóng nhu cầu, tên khách quen, số tiền bay, bong bóng thoại cư dân**: dùng lớp HTML/CSS đè lên canvas (`Overlay3D`, chiếu toạ độ 3D → màn hình) thay vì vẽ trong WebGL — chữ tiếng Việt nét hơn, dễ làm UI.
**D4. ✅ Click**: `scene.pick` → ô → gọi `onParcelTap`, chọn tòa nhà.

---

## Giai đoạn E — Vào trong cửa hàng

**E1. ✅ Chế độ "bóc mái"**: khi người chơi bước qua ô cửa (`getRoofProximity` đã có) hoặc chọn xem tòa → mái và tường mặt trước mờ dần/ẩn qua `roof-fade`.
**E2. ✅ Nội thất từ dữ liệu thật**: kệ, tủ mát, quầy theo `store-layout` / planogram; hàng hóa trên kệ là sprite nhỏ lấy từ `product-sprites`. Kệ trống hiện trống thật (`Fixtures3D`, `Stock3D`).
**E3. ✅ Tối ưu**: chỉ dựng/hiện nội thất của tòa đang bóc mái hoặc nằm trong phạm vi gần camera; các tòa khác chỉ là vỏ ngoài.

---

## Giai đoạn F — Nút "chi tiết tòa nhà"

**F1. ✅ Bảng thông tin tòa nhà**: panel React (`BuildingPanel.tsx`, bottom-sheet trên mobile) hiển thị doanh thu hôm nay/7 ngày, số khách, mặt hàng tồn kho thấp, nhân viên đang làm, trạng thái đóng/mở lấy từ selector có sẵn và simulation.
**F2. ✅ Nút "Vào trong"**: trượt camera tới cửa tòa, zoom gần, mái bóc (dùng roof-fade). Phím Esc hoặc người chơi di chuyển trả camera về vị trí cũ.

---

## Giai đoạn G — Thời tiết, ánh sáng, ngày đêm

**G1. ✅ Ánh sáng & bóng đổ**: `DirectionalLight` theo giờ trong game + `ShadowGenerator` (map nhỏ, pixel crisp); chỉ tòa, cây, cột đèn đổ bóng; ban đêm tắt bóng, tự tắt khi `AdaptiveResolution` đang hạ độ phân giải.
**G2. ✅ Mưa & bão**: `Weather3D` hạt mưa, sàn ướt, ô che mưa (`Umbrellas3D`), chớp sáng toàn cảnh khi có sấm sét (`onThunder`), cây rung rinh lay theo gió (tôn trọng `prefers-reduced-motion`).
**G3. ✅ Đèn đêm**: biển hiệu, cửa sổ phát sáng (emissive), đèn đường bật sáng vệt mặt đất và glow nhẹ, cửa sổ các tòa civic sáng ấm khi trời tối (`lampsOn > 0.3`).

---

## Giai đoạn H — Thay hẳn Pixi

**H1.** ✅ (2026-10-21) 3D thành mặc định; Pixi còn trong cài đặt "Đồ họa: 3D / 2D cổ điển" (Sổ quản lý → Tiện ích & Lưu trữ, lưu localStorage `renderer`; `?r=2d|3d` thắng localStorage). Không có WebGL hoặc khởi tạo 3D lỗi thì tự quay về 2D (`apps/web/src/renderer-choice.ts`, có test).
**H2.** Gỡ code Pixi không dùng, cập nhật `ARCHITECTURE.md`, `ART-BIBLE.md`. Chưa làm: Pixi còn là đường lui nên giữ.

**Còn lại (chưa làm)**
- C5: Đập & làm lại layout bản đồ (khi có yêu cầu mở rộng phố).
- H2: Gỡ hẳn code Pixi và các file 2D cũ khi 3D đạt độ ổn định tuyệt đối trên mọi môi trường.
- Nội thất 3D Kenney: Chờ Furniture Kit nếu muốn đổi kệ/bàn từ khối code sang model glb.
- Tối ưu hóa điều khiển chạm/pinch chuyên sâu cho mobile.

---

## Rủi ro & cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| FPS thấp | Render độ phân giải thấp (vốn là phong cách), thin instances, `scene.freezeActiveMeshes` cho cảnh tĩnh, đo FPS mỗi giai đoạn. |
| Bundle Babylon nặng (tải chậm trên mạng yếu) | Import theo đường dẫn con, Inspector chỉ ở dev, tách chunk 3D tải sau màn hình chờ; tối ưu mobile để sau. |
| PBR mặc định làm mất chất pixel | Dùng `StandardMaterial` tắt specular hoặc shader riêng, texture `NEAREST_SAMPLINGMODE`. |
| Pixel rung khi camera chạy | Snap camera theo pixel ảo; chỉ xoay 90°. |
| Chữ/UI khó đọc trong 3D | Toàn bộ chữ là lớp HTML đè lên, không vẽ trong WebGL. |
| Save cũ hỏng khi đập bản đồ | Giai đoạn C5 mới đổi layout; có migration + test save cũ. |
| Co-op lệch hình | Renderer chỉ đọc state; giao thức WS không đổi. |
| Thiếu asset 3D đúng chất Việt (xôi, tạp hóa) | Dựng khối bằng code + texture pixel tự vẽ; Kenney chỉ cho đồ chung. |

## Ước lượng thô

| Giai đoạn | Khối lượng |
|---|---|
| A | nhỏ (1–2 phiên) |
| B | vừa (2–3 phiên) |
| C | lớn (4–6 phiên, C5 thêm 2–3) |
| D | vừa (3–4 phiên) |
| E | vừa–lớn (3–5 phiên) |
| F | nhỏ (1–2 phiên) |
| G | vừa (2–3 phiên) |
| H | nhỏ |

**Điểm dừng an toàn sau mỗi giai đoạn**: game vẫn chơi bằng Pixi; 3D chỉ bật bằng cờ cho tới H1.
