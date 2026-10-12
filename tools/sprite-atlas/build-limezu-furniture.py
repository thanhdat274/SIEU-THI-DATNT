"""Cắt kệ hàng từ LimeZu "Modern Interiors Free" (32x32) thành atlas nội thất cho renderer.

Dùng:  python tools/sprite-atlas/build-limezu-furniture.py <đường dẫn Interiors_free_32x32.png>
Kệ 64x68 (2 ô ngang); bản 1 ô ghép nửa trái + nửa phải. Ghi ra apps/web/public/assets/sprites/furniture/ (gitignore, giấy phép LimeZu
không cho phát hành lại). Cần Pillow.
"""
import json, sys
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/furniture'
# (khóa game) -> (x, y) góc trái-trên của kệ 64x68 trong bảng 32x32
SHELF_WOOD = (382, 2188)    # kệ nóc vàng: mì, chai, lon
SHELF_GLASS = (446, 2188)   # kệ nóc vàng: lon, chai xanh
SIZE = (64, 68)


def crop(sheet, xy):
    return sheet.crop((xy[0], xy[1], xy[0] + SIZE[0], xy[1] + SIZE[1]))


def main(src: str) -> None:
    sheet = Image.open(src).convert('RGBA')
    wood = crop(sheet, SHELF_WOOD)
    single = Image.new('RGBA', (32, SIZE[1]), (0, 0, 0, 0))
    single.alpha_composite(wood.crop((0, 0, 16, SIZE[1])), (0, 0))
    single.alpha_composite(wood.crop((SIZE[0] - 16, 0, SIZE[0], SIZE[1])), (16, 0))
    items = {'fixture_shelf_wooden': wood, 'fixture_shelf_wooden_single': single, 'fixture_shelf_glass': crop(sheet, SHELF_GLASS)}
    width, x, frames = 256, 0, {}
    atlas = Image.new('RGBA', (width, SIZE[1]), (0, 0, 0, 0))
    for key, img in items.items():
        atlas.alpha_composite(img, (x, 0))
        frames[key] = {'x': x, 'y': 0, 'w': img.width, 'h': img.height}
        x += img.width + 2
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'furniture.png')
    (OUT / 'furniture.json').write_text(json.dumps({'image': 'furniture.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Furniture from LimeZu "Modern Interiors Free" (https://limezu.itch.io/moderninteriors). Non-commercial use only; do not redistribute.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung')


if __name__ == '__main__':
    main(sys.argv[1])
