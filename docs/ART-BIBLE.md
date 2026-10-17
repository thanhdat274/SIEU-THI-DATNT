# ART BIBLE — Tiệm Tạp Hóa Đầu Hẻm

Phiên bản 1 — 17/10/2026. Áp dụng cho mọi sprite/atlas/hình vẽ bằng code mới hoặc vẽ lại. Ảnh tham chiếu trong `docs/art-bible/` là ảnh chụp thật của game (Chrome headless, `?qa` → Chơi Thử (Local), dev server riêng không HMR).

Game chơi cá nhân, phi thương mại (xem `tổng hợp.md`): được dùng Kenney (CC0) và LimeZu bản free (cấm thương mại). Nếu sau này phát hành phải mua bản đầy đủ và ghi credit.

---

## 0. Hiện trạng: ảnh đang lấy từ đâu

| Nhóm | Nguồn | Mật độ điểm ảnh khi hiện ở zoom 1 | Ghi chú |
|---|---|---|---|
| Đường, vỉa hè, cây, đèn đường, hàng rào, xe (`city`, `vehicles`) | Kenney Roguelike Modern City (16 px) | 1 điểm ảnh gốc = 2 px | Viền tối 1 điểm ảnh, ít sắc độ, phẳng |
| Người chơi, đối tác, NPC 0–5 (`chars`, `npc`) | LimeZu free (16×32) | 1 = 2 px | Có bóng đổ trên thân, 3–4 sắc độ |
| Kệ, tủ mát, quầy (`furniture`) | LimeZu Modern Interiors free (32 px) | 1 = 1 px | Mịn hơn nhân vật một bậc |
| Tường/sàn tiệm, mái hiên, biển, sản phẩm, nhà khu phố cũ, đồi, mây | Vẽ bằng code (`textures.ts`, `premium-textures.ts`, `neighborhood-textures.ts`, `product-sprites.ts`) | lẫn lộn 1 và 2 px (regex "chunky" chỉ áp một phần) | Màu đặc, thiếu sắc độ trung gian |
| Mặt tiền công trình civic, nhà dân 3 bậc, NPC look 6–9 (`civic`, `residents`) | Ảnh do model sinh, ghép bằng `build-civic.py`, `build-residents.py` | 1 = 1 px | Chi tiết mịn, nét kiểu vector, nhìn thẳng mặt đứng (không phải 3/4 từ trên) |

**Lệch phong cách lớn nhất:** ba mật độ điểm ảnh cùng xuất hiện trên một màn hình (2 px Kenney/nhân vật, 1 px nội thất, 1 px rất mịn của civic). Góc nhìn cũng lệch: bản đồ chơi nhìn từ trên xuống, nhà civic nhìn thẳng mặt đứng nên trông như bìa dán đứng trên cỏ.

## 1. Kiểm kê 6 cảnh (375×812 và 1280×800)

Ảnh: `ref-01…06`. Cảnh civic dựng tạm bằng `__viewport.updateTileMap` thêm `clinic-1` ở ô 24–29 × 3–10 (chỉ để chụp, không đổi save).

1. **Trong tiệm chính** (`ref-01-tiem-375.jpg`). Sàn gạch kem một màu, không tối ở góc tường. Kệ LimeZu 1 px đặt cạnh tường code 2 px. Quầng sáng quầy thu ngân khá mạnh nhưng phẳng (một vòng tròn cộng màu). Biển nhãn chữ trắng nền tối (`58 món`, `0/96`) là UI, không phải đồ vật nên lấn vào cảnh. *Nguồn: code + LimeZu.*
2. **Ngoài phố ban ngày** (`ref-02-pho-ngay-375.jpg`). Vỉa hè Kenney và mặt đường đều một màu, không tối ở mép bó vỉa. Trước khi sửa, tiệm và nhà không có bóng đổ xuống đất (chỉ cây có). Cột đèn Kenney xám nhạt, không viền tối nên chìm vào vỉa hè. Lớp phủ quy hoạch (`w2-3`, vạch xanh) đè lên cảnh làm rối. *Nguồn: Kenney + code.*
3. **Ngoài phố ban đêm** (`ref-03-pho-dem-375.jpg`). Quầng đèn đường rõ nhưng tròn đều, không có vệt sáng hắt xuống mặt đường. Trước khi sửa, cửa tòa civic không hắt sáng. Bản đêm của civic chỉ là bản ngày tối đi, cửa sổ không sáng. *Nguồn: code (`shop-lighting.ts`) + model sinh.*
4. **Góc xóm có công trình civic** (`ref-04-civic-1280.jpg`). Trạm y tế 1 px mịn, viền đen đều, nhìn thẳng mặt đứng, không có bóng chân tường, đặt cạnh cây Kenney 2 px. Đây là chỗ lệch phong cách nặng nhất. *Nguồn: model sinh + Kenney.*
5. **Có mưa** (`ref-05-mua-375.jpg`). Vũng nước và hạt mưa ổn. Mặt đường không phản chiếu đèn/biển và không đổi độ bóng. Bóng cây nhạt đúng (mưa che nắng). *Nguồn: code thời tiết.*
6. **Nhiều NPC** (`ref-06-npc-375.jpg`, zoom xa). NPC LimeZu và NPC model sinh khác độ dày viền. Ở zoom xa, nhà dân model sinh rất mịn còn đường Kenney thô, nhìn như hai game ghép lại. Không có lớp sương xa/giảm tương phản cho nền xa nên mọi tầng có độ đậm như nhau. *Nguồn: LimeZu + model sinh + Kenney.*

**Lỗi chung khiến hình "phẳng":** (a) đồ vật không có bóng tiếp xúc với mặt đất, (b) không có lớp tối ở chân tường hay dưới mái, (c) mỗi vật liệu chỉ có 1–2 sắc độ, (d) nguồn sáng không đổ màu lên vật xung quanh, (e) nền xa và nền gần đậm như nhau.

## 2. Kích thước ô và độ phân giải

- **Giữ `TILE_SIZE = 32`** làm đơn vị thế giới (px logic).
- **Chuẩn mật độ: 16 px nghệ thuật × 2**, tức một điểm ảnh gốc hiện thành 2×2 px ở zoom 1. Đây là mật độ của Kenney và nhân vật LimeZu, tức phần lớn màn hình hiện nay. Asset 1 px (nội thất 32 px, civic, residents) phải vẽ lại theo lưới 16 px rồi nhân 2, hoặc cho qua bước giảm mẫu + làm sạch tay. Không được chỉ thu nhỏ rồi phóng to vì nét sẽ vỡ.
- **Có nên nâng ô lên 48/64 px? Đề xuất: không.**
  - Tác động lên code: `TILE_SIZE` xuất hiện 345 lần trong 21 file (renderer, core, server, web). Riêng `game-renderer` có 229 số `32` gõ thẳng (vị trí biển, mái hiên, bóng…) phải rà từng chỗ. Tọa độ px trong save, đường đi, va chạm, xe, NPC, test golden 384 bản đồ đều đổi theo, phải nâng phiên bản schema hoặc thêm lớp quy đổi.
  - Tác động lên atlas: mọi atlas (`city` 512×260, `chars` 512×952, `npc`, `vehicles`, `furniture`, `civic` 1024×616, `residents`) phải làm lại ở 1.5× hoặc 2×. Kenney Roguelike chỉ có 16 px nên phải bỏ.
  - Lợi ích: thêm chi tiết khi zoom gần. Nhưng trên điện thoại 375 px, ô 48 px chỉ còn khoảng 7,8 ô ngang ở zoom 1, ít hơn hẳn 11,7 ô hiện nay, nên thấy ít thế giới hơn. Trái với chuẩn mobile của dự án.
  - Chỉ cân nhắc lại khi đổi hẳn sang một bộ asset 32 px gốc (ví dụ LimeZu bản 32×32/48×48 đầy đủ, kích thước cụ thể phải kiểm trên trang gói). Khi đó cách đúng là đổi **mật độ** (32 px nghệ thuật × 1) và vẫn giữ `TILE_SIZE = 32`.
- **Hiển thị:** Pixi `roundPixels`/`scaleMode: nearest` cho mọi atlas. Mức zoom chỉ dùng số nguyên hoặc 0,5 (`ZOOM_LEVELS`). Zoom 1,25× trên điện thoại làm điểm ảnh to nhỏ không đều; nên đổi mặc định sang 1× hoặc 1,5× (việc riêng, cần QA).

## 3. Bảng màu chung

**Nguồn:** rút từ chính game (lượng tử hóa median-cut 20 màu trên `ref-02` và hằng màu đang dùng trong `viewport.ts`/`shop-lighting.ts`), rồi sắp lại thành dải theo vật liệu. Không lấy bảng màu ngoài để khỏi đổi tông game hiện tại. Mọi sprite mới chỉ dùng các màu dưới đây cộng tối đa 4 màu nhấn cho riêng sprite đó (biển hiệu, sản phẩm).

| Dải | Tối nhất → sáng nhất | Dùng cho |
|---|---|---|
| Bóng/viền ấm | `#26190e` `#342d20` `#4a3327` `#524b3d` | bóng đổ, viền, khe |
| Gỗ/đất | `#4a2b16` `#8b5a2b` `#917c5b` `#c69464` | cửa, kệ gỗ, hàng rào, ghế |
| Gạch/tường kem | `#bfa993` `#dac499` `#eed6a4` `#f5ecd8` | tường tiệm, vỉa hè, sàn |
| Cỏ | `#3c7535` `#447f37` `#5a9234` `#6e9152` `#7e9f64` | cỏ, tán cây, bụi |
| Nhựa đường/đá | `#342d20`→`#3a3935` `#3e3d39` `#6b6f73` `#8f959b` | mặt đường, cột, mái tôn |
| Mái ngói/đỏ | (dải civic) đỏ đất 4 sắc, lấy từ `civic_clinic` khi vẽ lại | mái nhà, biển đỏ |
| Ánh sáng | `#ffd980` `#ffdfa8` `#ffe9b0` `#fff3c4` | đèn đường, cửa, cửa sổ đêm |
| Nhấn | `#f2c230` (vàng biển/rào) `#f4a261` `#d9f4ff` (kính) | biển, kính, đèn giao thông |

Luật: bóng không bao giờ là đen thuần hay xám lạnh. Bóng ngoài trời dùng `#26190e` với alpha 0,1–0,26. Ban đêm, lớp nhân màu (`ShopLighting`) làm việc đổi tông nên sprite không cần bản đêm riêng, trừ cửa sổ sáng.

## 4. Ánh sáng và bóng

- **Nguồn sáng chính:** mặt trời theo `getLightingState` (phương vị, độ cao). Bóng ngả theo `shadowDir` và dài theo `chiều cao / tan(độ cao)`, kẹp tối đa 3,5 ô. Mưa hoặc mây che làm nhạt bóng đến khoảng 12%.
- **Trong sprite:** ánh sáng vẽ sẵn (baked) luôn đến từ **trên-trái**. Mặt trên và mặt trái sáng hơn một sắc độ, mặt phải và đáy tối hơn một sắc độ. Không vẽ bóng đổ xuống đất trong sprite; bóng đổ do code vẽ (`depth-effects.ts`, `tree-shadow`, bóng chân nhân vật).
- **Bóng tiếp xúc:** mọi vật chạm đất (tòa nhà, kệ, ghế, xe đậu, nhân vật) có dải tối 2–7 px sát chân, alpha 0,06–0,26.
- **Dưới mái hiên/ban công:** dải tối 9 px, alpha 0,1, đúng bề ngang mái.
- **Ánh sáng nhân tạo:** quầng cộng màu (`blendMode: add`) dùng chung `glowTexture`, màu ấm `#ffdfa8`. Cửa có đèn phải hắt một vệt hình elip ra vỉa hè. Cửa sổ ban đêm sáng `#ffd980` và vẽ trong sprite `_night`.

## 5. Viền

- Viền ngoài 1 điểm ảnh gốc (tức 2 px ở zoom 1), màu **tối hơn 2 sắc độ của chính vật liệu**, không dùng đen thuần. Kenney đang theo luật này, LimeZu gần đúng.
- Viền trong (chia mảng: khung cửa sổ, ván gỗ) dùng màu tối hơn 1 sắc độ.
- Mặt tiền civic hiện có viền đen đều 1 px mịn, sai luật. Khi vẽ lại phải đổi.
- Nhân vật: viền tối như trên, phần tóc/áo được bỏ viền ở mặt sáng (selective outline) như LimeZu.

## 6. Số sắc độ cho mỗi vật liệu

| Vật liệu | Số sắc độ | Ghi chú |
|---|---|---|
| Tường, gạch, vỉa hè | 4 | tối (khe), nền, sáng (mép trên), nhấn (vết bẩn/rêu) |
| Gỗ | 4 | thêm vân bằng sắc độ tối |
| Kim loại, kính | 3 + 1 điểm bóng | điểm bóng gần trắng |
| Cỏ, tán cây | 5 | 2 sắc độ cho bóng trong tán |
| Vải (mái hiên, quần áo) | 3 | sọc dùng 2 màu × 3 sắc độ |
| Da người | 3 | theo LimeZu |
| Mái ngói | 4 | hàng ngói dùng sắc độ tối ở mép dưới |

## 7. Mật độ chi tiết tối thiểu

| Loại | Tối thiểu |
|---|---|
| Ô nền (16×16 gốc) | 3 cụm chi tiết/ô (vết nứt, sỏi, cỏ), không lặp hình rõ khi ghép 4×4 ô |
| Mặt tiền tòa nhà | mỗi ô ngang có ít nhất một chi tiết: cửa sổ, ống nước, biển, máy lạnh, chậu cây; chân tường có gờ 1 điểm ảnh |
| Đồ nội thất | 2 vật nhỏ trên mặt (hàng hóa, giấy, cốc) |
| Nhân vật | 4 khung đi, 2 khung đứng, đủ 4 hướng; phụ kiện nhận diện (mũ, túi) |
| Xe | bánh có 2 sắc độ, kính có điểm bóng, đèn có bản bật |
| Vật trang trí đường | cột đèn có bóng đèn riêng (để code thắp sáng), ghế có chân và bóng |

## 8. Quy ước tên file và atlas

- Khóa sprite = khóa texture trong game: `<nhóm>_<tên>[_<biến thể>][_<hướng>][_<trạng thái>][_<khung>]`, chữ thường, gạch dưới. Ví dụ `civic_clinic_night`, `npc_6_left_walk_2`, `fixture_shelf_wooden`. Thiếu khóa thì game tự rơi về hình vẽ code.
- Ảnh nguồn để ở `C:\Users\Admin\Downloads\<pack>\` (không vào repo). Script cắt/ghép ở `tools/sprite-atlas/build-<nhóm>.py` (Python + Pillow), chạy lại được.
- Atlas: `apps/web/public/assets/sprites/<nhóm>/<nhóm>.png` + `.json`, liệt kê trong `index.json`. Mỗi atlas ≤ 1024×1024, nền trong suốt, alpha chỉ 0 hoặc 255, cách nhau ít nhất 1 px.
- Mỗi atlas mới phải có test kiểm khóa/kích thước kiểu `civic-atlas.test.ts`.
- Ghi nguồn và giấy phép từng pack vào `tổng hợp.md` (mục asset).

## 9. Hiệu ứng chiều sâu bằng code (đã làm, tắt được)

`packages/game-renderer/src/depth-effects.ts`, bật/tắt bằng nút **"Bóng & chiều sâu"** trong menu Quản lý (`WeatherFxSettings.depthFx`). Chất lượng "Thấp" luôn tắt.

| Hiệu ứng | Trạng thái | Chi phí đo được (375×812, DPR 1, Chrome headless) | Lợi ích nhìn thấy |
|---|---|---|---|
| Bóng đổ tòa nhà theo giờ | **mới** | `DepthEffects.update` trung vị < 0,05 ms (đồng hồ chỉ chính xác 0,1 ms), p99 0,1 ms, tối đa 2,5 ms ở lần vẽ lại đầu. Render: chênh trong nhiễu (2,6 → 2,6 ms ngày; 2,9 → 3,2 ms đêm) | Tòa nhà "đứng" trên đất, bóng dài lúc sáng/chiều |
| Tối chân tường + dưới mái hiên | **mới** (tĩnh, dựng 1 lần) | gộp trong dòng trên (1 Graphics) | Mặt tiền tách khỏi vỉa hè, nhìn rõ hơn ở zoom 1 |
| Quầng sáng cửa ban đêm (tòa chưa có quầng riêng) | **mới** | gộp trong dòng trên (1 sprite/tòa) | Công trình civic sống động ban đêm |
| Parallax đồi xa | có sẵn | render tắt/bật 2,3/2,4 ms (ngày), 2,7/3,1 ms (đêm) | Nền có lớp sâu khi kéo ngang |
| Bóng cây theo giờ | có sẵn | trong nhiễu | đã có |
| Quầng đèn + cửa sổ khu phố | có sẵn | render 2,4/2,8 ms (ngày), 2,0/2,0 ms (đêm) | đã có |

Ngân sách dự án cho hiệu ứng nền là **≤ 2,0 ms/khung**. Cả ba hiệu ứng mới cộng lại dưới mức đo được, nằm trong ngân sách. Số tick tổng dao động khoảng ±1 ms giữa các lần đo (6,2–7,8 ms) dù cấu hình giống nhau, nên các chênh lệch tick trong bảng **không** dùng làm bằng chứng. Đây là số đo định hướng trên WebGL headless, chưa phải đo trên điện thoại thật.

Đề xuất chưa làm (đo sau): phản chiếu đèn trên mặt đường ướt (một sprite lật mờ theo độ ướt, ước tính rẻ); sương/giảm tương phản cho nền xa ở zoom 0,5 (một lớp nhân màu, rẻ).

## 10. Lát cắt thử

Góc: tiệm chính + vỉa hè + trạm y tế (dựng tạm) + NPC/xe đi qua, cùng góc máy (khóa camera, zoom 1), 16:30 và 21:00.

- `slice-truoc-sau-chieu-1280.jpg`: trên = tắt, dưới = bật. Bóng tòa ngả đông phủ cỏ cạnh tiệm và trạm y tế, chân tường tối.
- `slice-truoc-sau-dem-1280.jpg`: dưới có quầng cửa trạm y tế hắt xuống vỉa hè.
- `slice-truoc-chieu-375.jpg` / `slice-sau-chieu-375.jpg`: cùng cảnh trên điện thoại.

Giới hạn: lát cắt chỉ áp phần **code** của art bible. Sprite chưa được vẽ lại, nên lệch mật độ điểm ảnh (mục 0) vẫn còn nguyên.
