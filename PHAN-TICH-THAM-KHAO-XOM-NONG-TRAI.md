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

---

# ĐỢT 2 (07/11/2026): Chơi thật Lv1 + TRÍCH TRỌN BỘ CONFIG v3.8.0 CỦA GAME

> Phương pháp: tạo tài khoản khách, chọn quê Hà Nội (người chơi thứ 1.926 của tỉnh), chơi vòng lặp gieo lúa, mở Cửa hàng/Đơn xe tải/Túi/Chi tiết trang trí; đồng thời trích `xnt.config.cache.v1` từ localStorage (bundle config game đang chạy, có checksum) → **nguồn sự thật số liệu, chính xác 100% những gì game đang chạy**. File trích: `dev/research-xom/` (config-cache.json, xom-extract.json).
> Ghi chú quan trọng: comment trong config tự nhận "Sinh bởi tools/gen_content_v3.py — mặc định thiết kế" + nhiều hệ nằm sau feature flag. Con số dưới đây là *trạng thái bản v3.8.0 đang chạy*, có thể đổi theo cờ.

## 1. Quy mô nội dung (đo từ config)

| Hạng mục | Số | Ghi chú |
|---|---|---|
| Vật phẩm (items) | **544** | cat: crop 64, fruit 50, product 297, animal_product 7, feed 8, material 63, consumable 9, chó 42, rương 4 |
| Nhóm hàng (group) | 10 | nông sản 64, trái cây 50, **món ăn 90, bánh 46, chè/nước 67, mứt/khô 30**, sơ chế 37, chăn nuôi 57, thủ công 27, vật liệu 76 |
| Công thức | **304** | 18 nhà máy, từ 8 công thức (Máy xay cám) tới 44 (Quầy nước) |
| Nhà máy | **18** | mở Lv1→130, xem bảng dưới |
| Cây trồng (vụ ngắn) | **64** | Lúa 5 phút → Sắn 10 giờ; mỗi luống thu 8 |
| Cây lâu năm | **50** | Cam Lv10 600v → vải Thanh Hà Lv178 14.200v; chu kỳ 4h+, 4 chu kỳ trước héo, 3 bạn cứu cây |
| Vật nuôi | **7** | Gà Lv2 (20 phút), Bò sữa Lv6 (1h), Heo Lv9 (1,5h), Vịt Lv11 (45 phút), Cừu Lv13 (3h), Dê Lv16 (2h), Tổ ong Lv20 (4h) |
| Chuồng | 5 | 250v (gà) → 3.000v (vườn ong) |
| Đồ trang trí | **48** | 16 bán cửa hàng + 32 thuộc 4 bộ sưu tập vùng |
| Vật thể đặt được | **138** | luống, 18 nhà máy, 5 chuồng, 50 cây, nhà/hầm/kho/bảng đơn/sạp chợ/bến ghe/chuồng chó, 48 decor, 7 vật cản |
| Chó cảnh | 13 giống | chuồng Lv6, phối giống, chợ chó, mũ/nón cho chó |
| Cấp tối đa | **200** | 4 chặng 31–60 / 61–100 / 101–150 / 151–200 |

## 2. Chuỗi nhà máy (cột sống "nấu nướng")

Máy xay cám Lv1 → Nhà xay xát Lv3 → Lò nấu đường Lv5 → Nhà làm sữa Lv7 → Lò bánh Lv8 → **Quầy nước Lv10** → Khung dệt Lv11 → Bếp chè xôi Lv12 → Xưởng mứt Lv14 → Tiệm may Lv15 → Tiệm bánh ngọt Lv16 → Tiệm hoa Lv20 → Lò ép dầu Lv38 → **Quán ăn làng Lv92** → Xưởng hương liệu Lv130, cộng 3 nhà máy đặc sản vùng Lv10 (Bếp cổ truyền - Bắc, Xưởng duyên hải - Trung, Lò kẹo miệt vườn - Nam).

**Quán ăn làng = "bếp món mặn" cuối game** (16 món, toàn món Việt): Bánh xèo (5 nguyên liệu, 1h, +38 EXP), Gỏi mít, Phở chay (6 nguyên liệu, 1,5h, +48), Bánh bèo, Bánh khọt, Cao lầu, Mì Quảng, Rau xào mắc khén, Bún thang, Gỏi ném, Canh chua bông súng, **Mâm cỗ làng (Lv196: 5 món làm sẵn + 4h + 136 EXP)**. Điểm thiết kế đáng lấy: *món cuối cùng của chuỗi là combo các món đã làm ra* — đỉnh của dây chuyền sản xuất, không cần nguyên liệu thô.

## 3. Chợ người chơi 3 cấp (Sạp chợ Lv7)

- 3 cấp chợ: **Làng → Tỉnh → Đầu mối** (3 miền), phí chợ **2% làng / 5% tỉnh / 5% đầu mối**.
- 4→10 ô bày hàng; mở ô: 1.000v, 3.000v, rồi 10/15/20/30 xu. Mỗi ô 50 món.
- **Giá tự đặt trong dải 0,3×–3× giá chuẩn**; ngoại lệ `highCap`: 15 vật liệu + thảo quả được trần **20×** (vàng chỉ xoay giữa người chơi, game không sinh thêm).
- **Cần mua (buy order)**: tối đa 3 lệnh mở, TTL 24h, tối đa 50 món, dải giá 0,67–1,17× (game giữ vàng trước).
- Tin bán hết hạn 48h; mỗi người mua mua tối đa 5 món/ngày từ một người bán; tài khoản mới <1 ngày không bán được, người <Lv15 bị kẹp giá 0,85–1,15× (chống smash).
- Chợ phiên: 3 món chung đổi mỗi thứ Hai + phiên đặc sản theo giờ vàng cuối tuần; đơn có món phiên **+25% vàng và EXP**.
- Quảng báo chợ: 12 tin/trang, cooldown 5 phút.

## 4. Sổ sưu tập trang trí — hệ "decor có chức năng" đỉnh nhất của game

- 4 bộ vùng miền (Bắc Bộ / Trung Bộ / Nam Bộ / Tây Bắc), mỗi bộ **3 Thường + 3 Quý + 1 Hiếm + 1 Báu**.
- **Điểm vườn theo độ hiếm × số sao (1–5)**: Thường 10→20, Quý 25→50, Hiếm 60→110, Báu 150→250.
- Nhận món trùng → **mảnh** (1/2/4/10 theo độ hiếm); nâng sao tốn 4/6/10/16 mảnh (4 bậc).
- Đặt ngoài vườn đủ **2/4/6 món cùng bộ** → buff chạy được, mỗi bộ buff đúng "nhóm việc" của vùng: Bắc Bộ = cây ruộng -2%/-3% chờ; Trung Bộ = chế biến; Nam Bộ = cây ăn quả; Tây Bắc = chuồng trại; mốc 4 = +2% EXP. **Trần hiệu ứng 10%/loại, 15% tổng** (chống stack).
- Đủ 8/8 → **danh hiệu** (Lão nông Bắc Bộ, Khách quý xứ Huế, Chủ vườn miệt Nam, Già làng Tây Bắc) + vườn bay đom đóm/cánh hoa.
- Nguồn món Hiếm/Báu: **Vòng quay Lộc** — 4 kỳ × 28 ngày xoay 4 bộ; 1 quay miễn phí/ngày, vé 2 xu (gói 10+1, tối đa 10 vé/ngày), điểm quay đổi món Quý/Hiếm/Báu. Món bộ sưu tập **không được đăng bán ở chợ** (giữ giá trị sưu tầm).
- Món trùng cấp thưởng (8 mốc lớn Lv25→200 tặng decor độc quyền: Cối đá giã gạo, Guồng nước tre, Chuồng bồ câu, Trâu vàng trăm cấp, Cổng làng nhỏ, Kiệu sơn son, Thuyền rồng mini, Tượng lúa vàng).

## 5. Đơn xe tải + Ghe hàng (generator đơn hàng thông minh nhất mình từng thấy)

- **Xe tải**: 9 đơn thường trực; đơn mới sau 1 phút; bỏ đơn đợi 15 phút.
- Thuật toán chọn món (đáng học): **độ sâu dây chuyền** (món sâu hơn = tầng chế biến cao hơn) có trọng số đổi theo cấp (cấp cao thiên về món sâu/lâu); `lineTimeBudgetSeconds` — số lượng 1 dòng không vượt quá số cái làm kịp trong khoảng thời gian đó (tính trọn dây chuyền!); món quá rẻ so với cấp bị giảm trọng số; món đang có trong kho được nhân trọng số (`stockWeightMul`); món mới mở được boost; đặc sản quê chiếm tỉ lệ `homeSpecialtyShare` để 3 miền cân; sàn trọng số từng món chống "món mồ côi".
- **Ghe (Lv17)**: 9 thùng = 3 loại × 3 thùng, hạn 16h, mỗi ghe nhờ bạn 3 thùng, 20 chuyến/ngày; thùng cùng loại thứ 2/3 ×1,2/×1,5; đủ ghe +50% vàng + quà; trọng số chọn loại hàng theo "tự làm được" 1,0 / "cần mua chợ" 0,5 / "khác" 0,15, mỗi ghe tối đa 1 loại khó kiếm.
- Cản ngày: đơn có món phiên +25%; trọng số quà chuồng ×2 (xe tải) / ×1,5 (ghe).

## 6. Kinh tế EXP — chống farm máy móc

- **EXP theo lượt việc, suy giảm theo độ "cũ" của mở khoá**: khác cấp quá 3 bậc bắt đầu giảm ×0,8^k, khác 15+ cấp = 0 EXP (`noPenaltyGap 3, expDecay 0.8, zeroExpGap 15`); bán cho NPC cũng decay tương tự (×0,85) — *cây mới mở = chơi hết mình, cây cũ = chỉ còn giá trị nguyên liệu*.
- **Hái cây lâu năm 200 lần đầu/ngày đủ EXP, 201–400 còn nửa, 401+ = 0**; cây thấp hơn cấp quá 20 không EXP.
- Từ Lv60 EXP đơn xe tải giảm dần còn 1,2× EXP nguyên liệu; từ Lv74 mỗi cấp cần thêm EXP (×(1+0,05·(L−73))).
- Công thức cấp: `cumExp(L) = 4(L-1)L(L+15)` tới Lv31, sau đó `expToNext = 14520·(L/30)^0.95`.
- **Thông thạo cây**: gặt nhiều lần 1 giống lên Đồng/Bạc/Vàng (ngưỡng 200/1000/4000 với vụ <1h; 100/400/1500 vụ 1–4h; 40/150/500 vụ dài); Bạc = giống đó **-5% thời gian chờ**; Vàng = khắc hoành phi treo nhà (25.000v).
- **Luân canh**: trồng khác họ với vụ trước trên cùng luống tới +15% EXP. **Tuổi cây**: cây lâu năm càng nhiều tuổi càng nhiều EXP.
- Thưởng lên cấp Lv2–200: tổng 2.021.450 vàng + 904 xu + đồng hồ cát/vé quay + 8 decor độc quyền mốc lớn.

## 7. Mở rộng đất, nhà, kho

- Bản đồ 64×64, vùng 16×16; khởi đầu 32×32 (4 vùng), 12 vùng khoá.
- Mở 1 vùng: **vàng = 1000·k·(k+1)** (k = thứ tự vùng), 3 vật liệu (sơ đồ/cọc mốc/búa) ×k, cần cấp **4+4k**, **phải tiếp giáp** vùng đã có (cùng mô hình CS2 như Midnight Bistro — 2 game cùng xác nhận).
- **Nhà 5 cấp** (tranh → cấp 4 → truyền thống → ...): lên cấp 2 = 20.000v + 10 ván gỗ + 10 đinh + 10 sơn; cấp 3 = 50.000v + 20×3. Quyền lợi: +60/150/300/500 chỗ (cả Hầm lẫn Kho), 1/2/3/5 vật liệu rút miễn phí mỗi ngày, nhà cấp 5 tặng đồng hồ cát mỗi ngày. **Nhà theo vùng có mô tả kiến trúc riêng** (nhà ba gian / nhà rường / nhà miệt vườn chữ Đinh).
- Hầm 150 chỗ (đồ ruộng) / Kho 120 chỗ (mọi thứ khác), +30/nâng, tối đa 40 nấc; vật liệu riêng từng loại; 14 vật liệu "không tính chỗ" (không bao giờ bị kẹt kho vì vật liệu nâng cấp).

## 8. Vùng miền + khí hậu (danh tính Việt rất sâu)

- 3 vùng quê, mỗi vùng **60–80 đặc sản** riêng + 1 nhà máy đặc sản + 1 bộ decor + nhà kiểu riêng + đồ Tết riêng (mâm cỗ Tết Bắc/Trung/Nam).
- **Khí hậu theo tháng thật**: Bắc Bộ tháng 12–2 cây nhiệt đới +20% thời gian nhưng rau vụ đông -20% — lịch nông theo mùa thật.
- Nhà kính Lv40 trồng đặc sản miền khác (2→4 ô); đổi quê được nhưng chờ 30 ngày + cây/nhà máy khác miền "ngủ đông" (bán được 1/3 giá trị).
- 34 tỉnh (sau sáp nhập 2025), đua tỉnh theo **Điểm Nông bình quân** (Lv6+ mới tính — chống nick phụ), mùa 1 tháng, Hà Nội 1.925 người chơi.

## 9. Vòng hằng ngày & giữ chân

- Điểm danh 7 ngày xoay vòng, **bỏ 1 ngày KHÔNG reset** (ngày 7: 5 xu + decor Bù nhìn) — khác Midnight Bistro (reset về 1).
- Rương báu vật (rìa vườn): trọng số 30/20/20/15/10/5 → 500v/1.500v/phân nhanh/phân siêu tốc/2 bộ vật liệu/3.000v + 3 búa.
- Trần "chống cày" xuyên suốt: ghe 20 chuyến/ngày, hái trộm 10 lần/ngày, quà bạn 5→20 món/ngày theo cấp, tăng tốc ghe 10 lần/ngày, mua vé quay tối đa 10 vé/ngày.
- Giftcode giới hạn lượt (TANTHU 1.200 lượt, còn 753 lúc test) — khan hiếm tạo FOMO.
- Top góp ý (xếp hạng người góp ý tưởng cho game), Top nông dân hôm nay / Top Level / Top độ giàu — xoay sidebar liên tục.

## 10. Trải nghiệm chơi thật (Lv1)

- Onboarding: chọn tỉnh trước (bản đồ 3D 63 tỉnh + hạng + "n người đang gom"), modal chào đồng hương 3 bước, tip xoay vòng "Bạn có biết?" là nút bấm được (có nút Ẩn riêng).
- Juice: bấm luống → **menu quạt** (Gieo hạt/Nâng đất/Di chuyển) hiện ngay quanh ngón; bảng chọn giống 64 cây hiện thời gian + số thu + **"+4 EXP" ngay trên thẻ** (minh bạch phần thưởng); nhãn "Mở đất · Cấp 8" nổi trên đất khoá.
- Đơn xe tải: badge "+25%" (chợ phiên) trên món, nút ghim sao + huỷ từng đơn, thanh "0/9 đủ hàng".
- Chi tiết decor: **popup hình 3D xoay được** + footprint "đặt trên 1×1 ô đất" + "+1 kinh nghiệm" khi mua + ổ khoá vàng "Mở ở Lv N".
- Túi đồ = Sổ sưu tập (tab "Sổ sưu tập" nằm chung bảng) — một bảng duy nhất cho đồ + sưu tập.
- Chat live 4 kênh (Toàn quốc/Tỉnh/Làng/Xóm) chạy từ giây đầu vào game — cảm giác "xóm làng đông đúc" ngay cả khi vườn còn trống.
