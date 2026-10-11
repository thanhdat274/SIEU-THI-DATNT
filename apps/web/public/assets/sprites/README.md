# Spritesheet PNG cho thế giới game

Hạ tầng: `packages/game-renderer/src/sprite-atlas.ts` (+ `sprite-atlas-parse.ts`). Khóa nào có trong atlas thì ảnh PNG ghi đè hình vẽ bằng code; khóa không có vẫn dùng hình vẽ code.

## Cách thêm asset
1. Đặt PNG + JSON atlas vào thư mục con, ví dụ `characters/player.png`, `characters/player.json`.
2. Tạo/sửa `index.json` ở thư mục này: `{ "atlases": ["characters/player.json"] }`. Không có `index.json` = không dùng asset nào.
3. JSON atlas, khung đặt tên ĐÚNG khóa texture của game (vd `player_down_idle_0`, `npc_1_down_walk_2`, `tile_store_floor`):
```json
{ "image": "player.png", "resolution": 2,
  "frames": { "player_down_idle_0": { "x": 0, "y": 0, "w": 64, "h": 72 } } }
```
   Cũng nhận dạng TexturePacker/Pixi hash (`meta.image`, `frames[key].frame`).
4. `resolution` N = ảnh vẽ gấp N lần kích thước logic: ảnh 64×72 với `resolution: 2` hiển thị 32×36 như bản code nên không lệch bố cục (chi tiết pixel nhiều hơn khi zoom).

Đường dẫn chỉ tương đối, không nhận `..` hay URL ngoài.

## Nhân vật LimeZu (không nằm trong git)
`chars/` (người chơi, đối tác, NPC, khách) sinh từ gói MIỄN PHÍ LimeZu "Modern Interiors" (cấm thương mại, không phát tán lại) nên bị `.gitignore`.
Sinh lại: `python tools/sprite-atlas/build-limezu-chars.py "<Modern tiles_Free>/Characters_free" 2`. Thiếu thư mục này game vẫn chạy bằng nhân vật vẽ bằng code (console có cảnh báo 404 của `chars/chars.json`).
Các atlas khác (`city/`, `npc/`) từ Kenney (CC0).
