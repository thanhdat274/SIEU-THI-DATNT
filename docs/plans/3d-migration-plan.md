# Kế hoạch chuyển sang 3D (Babylon.js, phong cách pixel nổi khối)

> Trạng thái: A ✅, B ✅ (khung 3D chạy bằng `?r=3d`). Ngày lập: 2026-10-19.
> Nguyên tắc: mỗi bước là một thay đổi nhỏ, chạy được, test được, có thể dừng ở bất kỳ bước nào mà game vẫn chơi được.

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

**C1. Định dạng bản đồ 3D**: thêm vào `game-data` mô tả nhẹ cho mỗi tòa: `modelId`, chiều cao tầng, màu mái, biển hiệu. Hình học ô (bounds, cửa) **vẫn lấy từ `MapBuilding`** đã có.
- ✅ Kiểm: `content:validate` bắt lỗi thiếu `modelId`.

**C2. Dựng khối nhà bằng code**: tường đùn từ `bounds`, mái, ô cửa khoét theo `doorTiles`, mái hiên theo `awning`. Texture pixel 16px dùng chung atlas.
- ✅ Kiểm: tiệm tạp hóa + tiệm xôi đứng đúng chỗ, cửa trùng ô cửa logic.

**C3. Đường, vỉa hè, vạch kẻ, đèn giao thông** (tái dùng dữ liệu `road-surface`, `street-signal`).

**C4. Đồ trang trí ngoài phố** (cây, cột điện, xe máy đỗ) từ Kenney `.glb` qua `SceneLoader.ImportMeshAsync`, nhân bản bằng instances/thin instances.

**C5. Đập & làm lại bản đồ** (tùy chọn, chỉ khi C1–C4 ổn): sửa layout `game-data` cho hợp 3D (đường rộng hơn, lô vuông vức hơn). Tăng `schemaVersion` + migration save nếu vị trí tòa đổi.
- ✅ Kiểm: test `world-golden`, `reclamation-map`, `neighborhood` cập nhật & xanh; save cũ nạp được.

---

## Giai đoạn D — Nhân vật & thứ chuyển động

**D1. Người chơi + bạn co-op**: billboard sprite (`Sprite`/`SpriteManager` hoặc plane `BILLBOARDMODE_Y`) (dùng lại sprite NPC hiện có, luôn quay về camera) — rẻ và giữ chất pixel. Sau này mới đổi sang model 3D nếu muốn.
**D2. Khách hàng, NPC khu phố**: `SpriteManager` của Babylon (billboard có sẵn, vẽ hàng trăm sprite một lần).
**D3. Bong bóng nhu cầu, tên khách quen, số tiền bay**: dùng lớp HTML/CSS đè lên canvas (chiếu toạ độ 3D → màn hình) thay vì vẽ trong WebGL — chữ tiếng Việt nét hơn, dễ làm UI.
**D4. Click**: `scene.pick` → ô → gọi `onParcelTap`, chọn tòa nhà.
- ✅ Kiểm mỗi bước: so sánh với Pixi cùng save QA (`window.__seedQaSave`).

---

## Giai đoạn E — Vào trong cửa hàng

**E1. Chế độ "bóc mái"**: khi người chơi bước qua ô cửa (`getRoofProximity` đã có) → mái và tường mặt trước mờ dần/ẩn, camera zoom gần.
**E2. Nội thất từ dữ liệu thật**: kệ, tủ mát, quầy theo `store-layout` / planogram; hàng hóa trên kệ là sprite nhỏ lấy từ `product-sprites`. Kệ trống hiện trống thật.
**E3. Tối ưu**: chỉ dựng nội thất tòa đang xem; tòa khác chỉ là vỏ ngoài (LOD).
- ✅ Kiểm: thêm/bớt hàng trong `StorePlanogramModal` → kệ 3D đổi theo.

---

## Giai đoạn F — Nút "chi tiết tòa nhà"

**F1. Chạm vào tòa đang mở** → panel React (bottom-sheet trên mobile): doanh thu hôm nay/7 ngày, khách, tồn kho thấp, nhân viên, trạng thái đóng/mở. Dữ liệu từ `market-summary` và các selector có sẵn.
**F2. Nút "Vào trong"** từ panel → camera bay vào chế độ E1.
> Có thể làm F trước C nếu muốn có lợi sớm — panel không phụ thuộc 3D.

---

## Giai đoạn G — Thời tiết, ánh sáng, ngày đêm

**G1.** `DirectionalLight` theo giờ trong game + `ShadowGenerator`; đổ bóng bậc (toon ramp 3 mức) qua `NodeMaterial` hoặc `ShaderMaterial`.
**G2.** Mưa: `ParticleSystem` (hoặc `GPUParticleSystem`), sàn ướt (đổi màu/độ bóng), tái dùng `getWeatherVisualState`.
**G3.** Đèn đêm: biển hiệu và cửa sổ phát sáng (emissive), không dùng nhiều đèn thật.

---

## Giai đoạn H — Thay hẳn Pixi

**H1.** 3D thành mặc định; Pixi còn trong cài đặt "Đồ họa nhẹ" 1–2 bản.
**H2.** Gỡ code Pixi không dùng, cập nhật `ARCHITECTURE.md`, `ART-BIBLE.md`.

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
