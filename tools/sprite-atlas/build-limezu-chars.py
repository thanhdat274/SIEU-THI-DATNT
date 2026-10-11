"""Cắt nhân vật từ LimeZu "Modern Interiors" (bản FREE, CHỈ cho dự án phi thương mại) thành atlas người chơi/đối tác/NPC/khách.

Dùng:  python tools/sprite-atlas/build-limezu-chars.py <thư mục "Characters_free" đã giải nén> [scale=2]
Nguồn: https://limezu.itch.io/moderninteriors (Modern_Interiors_Free_v2.2.zip). GIẤY PHÉP BẢN FREE: không dùng trong dự án thương mại;
đổi sang bản đầy đủ nếu muốn phát hành. Không đưa asset gốc vào repo public.
Sheet: mỗi nhân vật 16x32/khung; hướng theo khối 6 khung: 0 phải, 1 lên, 2 trái, 3 xuống; `<tên>_run` 24 khung, `<tên>_idle_anim` 24 khung.
Khung game: walk 0..3 = run[0,2,3,5]; idle 0..1 = idle_anim[0,3]. Phóng `scale`x (nearest), thêm 3 điểm ảnh chân + bóng chân mềm
nên neo giữa-đáy như nhân vật vẽ bằng code. Ghi ra apps/web/public/assets/sprites/chars/. Cần Pillow.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

SCALE = int(sys.argv[2]) if len(sys.argv) > 2 else 2
TOP_TRIM = 8
DIR = {'right': 0, 'up': 1, 'left': 2, 'down': 3}
WHO = {'player': 'Adam', 'partner': 'Alex', 'npc_0': 'Amelia', 'npc_1': 'Bob', 'npc_2': 'Alex'}  # npc_1 = chủ tiệm
OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/chars'

def main(src: str) -> None:
    items = {}
    for key, name in WHO.items():
        run = Image.open(Path(src) / f'{name}_run_16x16.png').convert('RGBA')
        idle = Image.open(Path(src) / f'{name}_idle_anim_16x16.png').convert('RGBA')
        for d, di in DIR.items():
            def cell(sheet, i):
                # bỏ 8 hàng điểm ảnh gốc trong suốt phía trên (nhân vật chỉ cao ~23 hàng trong khung 32) để canvas thấp ≈ nhân vật cũ
                return sheet.crop((i * 16, TOP_TRIM, i * 16 + 16, 32)).resize((16 * SCALE, (32 - TOP_TRIM) * SCALE), Image.NEAREST)
            for f, i in enumerate((0, 3)):
                items[f'{key}_{d}_idle_{f}'] = cell(idle, di * 6 + i)
            for f, i in enumerate((0, 2, 3, 5)):
                items[f'{key}_{d}_walk_{f}'] = cell(run, di * 6 + i)
    w, h = 16 * SCALE, (32 - TOP_TRIM) * SCALE + 3
    width, x, y, frames, placed = 512, 0, 0, {}, []
    for key, img in items.items():
        if x + w > width:
            x, y = 0, y + h + 2
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        sh = ImageDraw.Draw(canvas)
        sh.ellipse([w // 2 - 10, h - 7, w // 2 + 9, h - 1], fill=(38, 25, 14, 74))  # bóng chân mềm
        canvas.alpha_composite(img, (0, 0))
        placed.append((canvas, x, y))
        frames[key] = {'x': x, 'y': y, 'w': w, 'h': h}
        x += w + 2
    atlas = Image.new('RGBA', (width, y + h), (0, 0, 0, 0))
    for img, px, py in placed:
        atlas.alpha_composite(img, (px, py))
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'chars.png')
    (OUT / 'chars.json').write_text(json.dumps({'image': 'chars.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Characters from LimeZu "Modern Interiors" FREE version (https://limezu.itch.io/moderninteriors). Non-commercial use only. Do not redistribute.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung, atlas', atlas.size, 'scale', SCALE)

if __name__ == '__main__':
    main(sys.argv[1])
