# Phân tích tham khảo: Xóm Nông Trại (nongtrai.jackle.dev)

Ngày rà soát: 29/10/2026 · Phương pháp: chơi thử trực tiếp bằng trình duyệt + đọc bundle JS/manifest asset của game (không có bài viết công khai nào về game này, toàn bộ số liệu dưới đây là tự xác minh từ source chạy thật).

## Tóm tắt

Xóm Nông Trại là game nông trại multiplayer trên web, đồ họa low-poly 3D đẹp và rất "Việt" (nhà Bắc, tre, chuồng gà, nón lá, bản đồ 63 tỉnh 3D). **Stack y hệt game mình: React + Zustand + Vite + Three.js.** Vẻ đẹp của nó KHÔNG đến từ kỹ thuật render đặc biệt nào — mà đến từ **quy trình asset**: kit model Blender low-poly nén thành GLB + texture atlas nướng sẵn + build manifest có kiểm kê số triangle, tải lười theo module. Toàn bộ cảnh 3D chỉ nặng ~790KB GLB. Về kỹ thuật render thuần, game mình đang đi trước nó (WebGPU, adaptive resolution, gió vertex shader); cái đáng bê là **pipeline asset + juice phản hồi + mấy cơ chế giữ chân xã hội**.

## Công nghệ xác nhận được (bằng chứng cụ thể)

### Frontend

| Thành phần | Bằng chứng | So với game mình |
|---|---|---|
| React + Zustand + Vite | chunk `vendor-react-*`, `vendor-state-*` (9KB, chứa "zustand"), filename hash kiểu Vite | **Giống hệt** (mình: React 19 + Zustand + Vite 8) |
| Three.js qua WebGL2 | canvas duy nhất full màn hình, `getContext("webgl2")`, chunk `ThreeRenderer-*` + `worldScene-*` | Mình dùng `WebGPURenderer` (three 0.186) tự rơi về WebGL2 — **mới hơn** |
| `antialias: false`, alpha:true | getContextAttributes canvas đang chạy | Mình bật MSAA + adaptive resolution — **không bê ngược** |
| `toneMapping = 0` (NoToneMapping) + set outputColorSpace | regex trong bundle chính | Lý do màu nó tươi rói; mình đang tune ngày/đêm riêng |
| Shadow + fog + PerspectiveCamera | `castShadow`, `shadow.camera`, `fog` trong `worldScene-*` | Mình có sẵn |
| InstancedMesh (21 chỗ) + BatchedMesh (24 chỗ) + frustumCulled | đếm trong bundle | Mình gộp mesh bằng `mergeGeometries` theo luống — hai đường khác nhau, cùng mục tiêu giảm draw call |
| Raycaster bấm chọn vật thể | 3 chỗ trong bundle | Mình đã có raycast quầy/kệ |
| Code-splitting theo màn hình | chunk `MapScreen-*`, `VillageScreen-*`, `WatchPanel-*`... mỗi panel một chunk | Mình build 1 bundle lớn (có warning bundle-size) — **đáng bê** |
| framePacing + rendererGuard chunk riêng | 2 chunk nhỏ 20KB | Guard context-lost: mình chưa thấy có — **đáng bê** |
| PWA (manifest + service worker) + Speculation Rules API prefetch | `manifest.webmanifest`, navigator.serviceWorker, request "speculation" | Mình có manifest + sw.js sẵn |

### Asset — đây mới là "công nghệ đồ họa" thật sự của nó

- **57 file GLB, tổng ~791KB đã nén** cho cả cảnh: `farm_kit` (145KB), `houses_v2_bac__nha_v2_bac` (58KB), `buildings_misc__kho` (53KB), `pens__chuong_ga` (43KB), `flora__tre` (21KB), `crops_a__lua` (21KB)… Mỗi model 15–150KB — cực nhẹ, load tức thì.
- **12 texture atlas `kit-tex-*.png` (~358KB)** dùng chung cho cả kit → màu sắc đồng bộ, style "vẽ tay" thống nhất, tiết kiệm bộ nhớ swap texture.
- **Build manifest JSON** (`index-*.json`): mỗi module asset ghi `file`, `built_at`, `count` (số mesh), `tris` (số triangle), `errors`, `warnings` — tức là có **pipeline Blender→GLB tự động kèm kiểm kê chất lượng**. Ví dụ `animals.glb`: 10 mesh, 5.064 tris. Đây là chi tiết quy trình rất đáng học.
- **UI 2D bằng sprite atlas WebP + JSON**: `atlas_pages.json` + manifest theo nhóm (`animals`, `crops_a/b/c`, `decor_a/b`, `critters`…), 37 sheet ~5,5MB (đây mới là phần nặng nhất trang — art icon/UI vẽ riêng).
- **Font Việt**: Be Vietnam Pro (500–900) + Baloo 2 (800), subset woff2 riêng cho tiếng Việt — tít mềm mại, rất "game Việt".
- BGM mp3 4,1MB ("Morning in the Bamboo Grove").
- **Tổng lần tải đầu ~12,2MB**, 250 request, vào chơi liền trên laptop card rời GTX 1650 Ti chạy 60fps.

### Backend & xã hội

- API riêng (`/api/health` chạm được), WebSocket cho **chat live** trong game (thấy người chơi chat tiếng Việt thật), login Google (GSI) + chơi khách, host Cloudflare (beacon + cdn-cgi/rum).
- **"Đua tỉnh" theo mùa**: bản đồ Việt Nam 3D nổi khối (dữ liệu ranh giới tỉnh từ OpenStreetMap, có attribution), điểm nông của mỗi người góp về tỉnh quê, bảng xếp hạng tỉnh theo tháng, có cơ chế giữ người (đổi tỉnh phải chờ 30 ngày), Hà Nội đang có 1.472 người chơi.
- Leaderboard có tab **"Top góp ý"** — xếp hạng người đóng góp ý kiến cho game. Chi phí gần bằng 0, hiệu quả giữ cộng đồng dev–người chơi rất cao.
- Bộ panel kinh doanh hóa đầy đủ: Xem quảng cáo nhận thưởng (`WatchPanel`/`watchSlots`), Battle pass mùa vụ (`PassPanel`), Mời bạn (`InvitePanel`), Chia sẻ ảnh (`PhotoSharePanel`), Điểm danh hằng ngày, Uy tín, và modal "chơi công bằng" chống multi-nick/exploit ngay lần đầu vào.

### Gameplay nhìn thấy được (để đối chiếu cảm giác)

- Thu hoạch lúa: bấm bụi lúa chín → **icon cây trồng bay lên + popup "+202" vàng** — juice rẻ mà sướng tay. Bong bóng thu hoạch nổi trên luống đúng kiểu Hay Day.
- Mở đất theo cấp ("Mở đất · Cấp 8" khoá viền vàng), nhiệm vụ ngắn ("Vụ kế đầu tiên 0/4"), banner tip xoay vòng "Bạn có biết?".
- HUD: xu/ngọc/cấp (12/150) + XP bar; dock phải: Sự kiện, Mùa vụ, Điểm danh, Bạn bè, Túi, Mời bạn, Cửa hàng; trái: leaderboard hôm nay + chat.

## Đối chiếu với game mình (đã có gì, thiếu gì)

| Hạng mục | Xóm Nông Trại | Tạp Hóa Đầu Ngõ hiện tại |
|---|---|---|
| Stack FE | React + Zustand + Vite + Three.js (WebGL2) | **Giống**, renderer còn mới hơn (WebGPU + WebGL2 fallback) |
| Hiệu năng render | instancing/batching, NoToneMapping, antialias off | adaptive resolution, light budget, wind sway, gộp mesh — **không thua** |
| Model 3D | kit Blender → GLB + atlas (790KB cả cảnh) | **100% procedural code** (`buildings.ts`, `riceModel.ts`…), `public/models` rỗng |
| Icon/UI 2D | atlas WebP + manifest JSON | emoji nhất quán (đã là lựa chọn chủ đích GĐ đầu) |
| Social | chat live, đua tỉnh, leaderboard, bạn bè | single-player-first; đã có server express/ws + Firebase trong source |
| Giữ chân | điểm danh, pass, xem QC, mời bạn, share ảnh | ngày/tuần/tháng/mùa/năm/NG+ đã bão hòa (audit 28/10) |

## Đáng bê — xếp theo ưu tiên

1. **Cao — Pipeline asset GLB "kit + atlas + manifest"** cho không gian ngoài trời đang rộng dần: sân sau, trại (GĐ146/147), chợ phiên (GĐ135–138), gánh hàng rong, quán nước. Procedural box đạt độ "đúng" nhưng không đạt độ "dễ thương được chăm chút" như kit Blender nướng atlas. Kèm theo: manifest build ghi `tris/errors/warnings` mỗi module + tên file content-hash + lazy-load theo khu — load gọn và biết ngay asset nào phình to. Nếu không vẽ Blender được, lấy kit CC0 (Kenney/Quaternius) rồi nướng lại atlas màu ấm theo palette hẻm mình.
2. **Cao — Juice kiểu thu hoạch**: icon sản phẩm bay lên + popup "+12.000đ" khi bán hàng/thu hợp đồng/đơn khách quen. Chi phí thấp, đúng nguyên tắc "mọi quyết định có dữ liệu phản hồi" — bán được hàng là thấy ngay bằng mắt. (Kiểm tra lại: mình đã có hiệu ứng tiền bay chưa — nếu có thì nâng chất lượng thay vì làm mới.)
3. **Trung — Tách chunk theo panel/vendor** (manualChunks của Vite: `vendor-react`, `vendor-state`, panel lớn thành chunk riêng) để gút warning bundle-size có sẵn và vào game nhanh hơn trên máy yếu.
4. **Trung — Guard mất ngữ cảnh WebGL** (`webglcontextlost`/`restored`, dispose sạch, thông báo "rảnh tay bấm Vẽ lại") — mobileaday dài hay bị kill GPU context; mình đã có GameRenderer interface chung nên chỗ cắm phù hợp là `createRenderer`.
5. **Trung — "Top góp ý" bản Việt**: khi mở giai đoạn cho người ngoài chơi thử, làm bảng xếp hạng người góp ý tưởng trong game (từ feedback thật), không cần multiplayer — chỉ cần 1 field lưu tên/điểm đóng góp. Rẻ nhất trong mọi cơ chế giữ chân cộng đồng mình thấy ở game này.
6. **Thấp — Sprite atlas 2D** cho icon sản phẩm/UI nếu sau này emoji thành điểm yếu thẩm mỹ: 1 lệnh build ghép PNG → WebP + JSON vị trí, giữ nguyên cách trỏ icon hiện tại.
7. **Thấp — Font display Việt** (Baloo 2/Be Vietnam Pro subset woff2) cho tiêu đề panel nếu muốn tít "bự tròn" kiểu game nông trại; chữ thân bài giữ nguyên hiện trạng.

## Không nên bê (và lý do)

- **Multiplayer thời gian thực + chat live + đua tỉnh server-side**: khác tầm nhìn — game mình là fantasy "chủ tiệm nhỏ ấm áp" single-player; hệ máy chủ tỉnh/đua mùa là gánh nặng vận hành lớn, chưa có người chơi thật thì không có gì để đua.
- **Battle pass / xem quảng cáo / mời bạn kiểu F2P mạnh tay**: sẽ phá nguyên tắc "phần thưởng phụ có cổng" và kinh tế trong game đã cân kỹ; chỉ cân nhắc khi ra public thật sự và cần doanh thu.
- **antialias:false + NoToneMapping**: là lựa chọn hiệu năng/phong cách của HỌ; mình đã có MSAA WebGPU + DRS + bảng màu riêng — bê ngược là lùi.
- **Bản đồ 3D 63 tỉnh**: đẹp nhưng phục vụ mechanic đua tỉnh (multiplayer); với mình chỉ đáng nhớ lại kiểu "extrude GeoJSON + màu theo dữ liệu" nếu sau này làm màn hình chọn khu phố/đồ hoạ dữ liệu.

## Bài học chính

Đồ họa "nhìn đẹp" của game web nhỏ không đến từ engine xịn — cùng một stack React+Zustand+Three, nó thắng ở **tính nhất quán của asset tay**: một bộ kit low-poly duy nhất, một bộ atlas màu duy nhất, một font duy nhất, mọi thứ cùng tông. Kỹ thuật render của mình đã đủ và hơn; mảnh ghép còn thiếu để "nhìn cũng đẹp đấy" là **bộ asset đồng bộ cho không gian ngoài trời** + juice phản hồi, chứ không phải đổi công nghệ render.
