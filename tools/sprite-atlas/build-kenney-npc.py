"""Cắt nhân vật từ Kenney "RPG Urban Pack" (CC0) thành atlas NPC/khách cho hạ tầng sprite-atlas.

Dùng:  python tools/sprite-atlas/build-kenney-npc.py <thư mục giải nén kenney_rpg-urban-pack>
Nguồn: https://kenney.nl/assets/rpg-urban-pack (Tilemap/tilemap_packed.png, ô 16x16 không lề, nhân vật 3 hàng x 4 cột:
cột 23 trái, 24 xuống, 25 lên, 26 phải; hàng 0 = đứng, hàng 1/2 = hai nhịp bước).
Mỗi khung phóng 2x (nearest) vào canvas 32x48 như `character()` của premium-textures (neo giữa-đáy, chân ở y≈45) kèm bóng chân mềm.
Khóa: npc_<biến thể 0..3>_ / player_ / partner_ + <up|down|left|right>_<idle 0..1|walk 0..3>. Ghi ra apps/web/public/assets/sprites/npc/. Cần Pillow.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

SCALE = 2
COL = {'left': 23, 'down': 24, 'up': 25, 'right': 26}
# tiền tố khóa + biến thể -> hàng đầu của nhân vật trong sheet (mỗi người 3 hàng)
# NPC/khách dùng 4 kiểu (renderer lấy idx % 4); người chơi và đối tác co-op có kiểu RIÊNG để không trùng khách.
CHAR_ROW = {
    ('npc', 0): 0,       # bé gái áo xanh
    ('npc', 1): 6,       # cụ tóc bạc (chủ tiệm là npc_1)
    ('npc', 2): 3,       # bé gái áo đỏ
    ('npc', 3): 15,      # cô tóc đen băng đỏ
    ('player', None): 12,   # người hói (nam) — người chơi là con trai
    ('partner', None): 9,   # thợ nón vàng (đối tác co-op)
}
IDLE_ROWS = [(0, 0), (0, -1)]            # (hàng lệch, nhấp nhô px): khung 1 nhích lên 1 điểm ảnh gốc
WALK_ROWS = [1, 0, 2, 0]                 # nhịp bước: chân A, đứng, chân B, đứng
OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/npc'

def frame(sheet, col, row, bob=0):
    tile = sheet.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16)).resize((16 * SCALE, 16 * SCALE), Image.NEAREST)
    canvas = Image.new('RGBA', (32, 48), (0, 0, 0, 0))
    shadow = Image.new('RGBA', (32, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    d.ellipse([6, 41, 25, 47], fill=(38, 25, 14, 74))   # bóng chân mềm như bản vẽ code
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(tile, (0, 13 + bob * SCALE))  # đáy ô ở y=45 (chân)
    return canvas

def main(src: str) -> None:
    sheet = Image.open(Path(src) / 'Tilemap/tilemap_packed.png').convert('RGBA')
    items = {}
    for (prefix, v), r0 in CHAR_ROW.items():
        name = prefix if v is None else f'{prefix}_{v}'
        for d, col in COL.items():
            for f, (dr, bob) in enumerate(IDLE_ROWS):
                items[f'{name}_{d}_idle_{f}'] = frame(sheet, col, r0 + dr, bob)
            for f, dr in enumerate(WALK_ROWS):
                items[f'{name}_{d}_walk_{f}'] = frame(sheet, col, r0 + dr)
    width, x, y, frames, placed = 512, 0, 0, {}, []
    for key, img in items.items():
        if x + 32 > width:
            x, y = 0, y + 50
        placed.append((img, x, y))
        frames[key] = {'x': x, 'y': y, 'w': 32, 'h': 48}
        x += 34
    atlas = Image.new('RGBA', (width, y + 48), (0, 0, 0, 0))
    for img, px, py in placed:
        atlas.alpha_composite(img, (px, py))
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'npc.png')
    (OUT / 'npc.json').write_text(json.dumps({'image': 'npc.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Characters from Kenney "RPG Urban Pack" (https://kenney.nl/assets/rpg-urban-pack), CC0 1.0.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung, atlas', atlas.size)

if __name__ == '__main__':
    main(sys.argv[1])
