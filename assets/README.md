# ASSETS DIRECTORY
- `sprites/`: Pixel-art spritesheets and standalone icons.
- `maps/`: Tiled JSON compatible map files.
- `audio/`: Nostalgic background music and sound effects (sfx).

## Nắng Hẻm — asset inventory

Tác giả: bộ vẽ procedural nguyên bản tạo cho dự án này ngày 30/09/2026. Không trích sprite, font hay texture từ game tham khảo; không có asset bên thứ ba mới cần license riêng. Quyền sử dụng/sửa/phân phối theo quyền đối với mã nguồn dự án của chủ repository; không tự gán một giấy phép nguồn mở mới cho repo.

| Nguồn code | Asset/ID | Grid/anchor | Fallback |
| --- | --- | --- | --- |
| `packages/game-data/src/pixel-art.ts` | Mọi productId trong PRODUCT_MAP, silhouette theo category và accent theo ID | 16×16, góc trái trên; DOM và hàng trên kệ dùng cùng dữ liệu | Túi/gói giấy có dấu chấm khi productId không tồn tại |
| `apps/web/src/components/pixel/index.tsx` | sun,clock,coin,warehouse,bag,truck,save,book,close,plus,minus,door,person,heart,star,check,warning,speed,hand,moon,cold | 9×9 trong viewBox 11×11, shapeRendering crispEdges | IconName có type kiểm tra; icon phụ không thay thế nhãn |
| `packages/game-renderer/src/premium-textures.ts` | tile_store_floor,encaustic,yellow_wall,sidewalk,street,pavement_alley | 32×32 | Factory cũ vẫn xử lý các key không mới |
| Cùng file | signboard,awning,fan,plant,tree,crates,chair | 128×48,128×20,32×32,32×40,80×96,48×32,24×32 | Texture procedural cũ cho asset legacy |
| Cùng file | fixture_shelf_wooden/shelf_glass,cashier,refrigerator | 64×48/32×48, sprite y=-16; footprint và IDs giữ nguyên | Key không nhận diện dùng factory legacy/fallback |
| Cùng file | player_DIRECTION_walk_FRAME, player_DIRECTION_idle_FRAME | 32×48, anchor (0.5,1); 4 hướng ×4 walk +2 idle | Frame 0 khi reduced-motion |
| Cùng file | npc_VARIANT_DIRECTION_MODE_FRAME | 3 silhouette ×4 hướng ×4 walk +2 idle, 32×48, chân (0.5,1) | Variant luôn nằm trong 0..2; số khách không đổi |

Animation môi trường: fan 4 frames ở 5fps, plant 2 frames ở 1fps; walk 8fps, idle 1.5fps. Feet đứng đúng tọa độ game; chỉ phần thân/chân trong ảnh thay đổi. Source sprites generated một lần trên mỗi key rồi cache; chỉ đổi texture shelf khi product/empty-low-full thay đổi. Stock text vẫn hiển thị lượng thật.

Font body: Segoe UI/Arial của hệ điều hành, không bundle font. Biển hiệu dùng bộ glyph 5×7 vẽ tay trong code với nét dấu Việt. Không có tải font qua mạng. Palette/props và QA ở `docs/ui/PIXEL_UI.md` và `docs/ui/QA.md`.
# Asset nhà kho — 30/09/2026

Nguồn: `packages/game-renderer/src/warehouse-textures.ts`, tự vẽ bằng hình chữ nhật/glyph trên grid, license cùng mã nguồn project, không sao chép asset ngoài. Tile xi măng/tường 32×32; biển NHÀ KHO 128×24; giá khô/tủ lạnh/bàn nhận 64×48, sprite y=-16, footprint 2×1 tile và sort theo chân. Stock empty/low/full đọc inventory/pending thật, cache theo key; fallback texture factory cũ vẫn giữ. Sơ đồ/anchor/data flow: `docs/ui/WAREHOUSE.md`.
