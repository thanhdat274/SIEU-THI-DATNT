"""Cắt kệ hàng từ LimeZu "Modern Interiors Free" (32x32) thành atlas nội thất cho renderer.

Dùng:  python tools/sprite-atlas/build-limezu-furniture.py <đường dẫn Interiors_free_32x32.png>
Kệ hàng, tủ mát và quầy thu ngân (monitor đặt lên quầy gỗ); bản 1 ô ghép nửa trái + nửa phải của bản 2 ô. Ghi ra apps/web/public/assets/sprites/furniture/ (gitignore, giấy phép LimeZu
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


FRIDGE = (128, 592, 192, 658)         # tủ mát kính trắng có nước ngọt/đồ ăn, 64x66
FRIDGE_SINGLE = (64, 592, 96, 658)    # nguyên một ngăn (32x66)
COUNTER = (160, 1770, 224, 1814)      # quầy gỗ có ngăn kéo 64x44
MONITOR = (96, 276, 128, 301)         # màn hình máy tính tiền 32x25


# Đạo cụ 1-2 ô (`fixture_prop_<mã>`): (khung cắt, bề rộng ô vẽ); ảnh được cắt sát rồi đặt giữa, sát đáy.
PROPS = {
    'chau_cay': ((384, 1440, 416, 1492), 32),          # chậu cây nhỏ
    'cay_kieng_lon': ((332, 1422, 374, 1492), 36),     # cây cảnh lớn trong hộp gỗ
    'storage_rack': ((0, 1896, 34, 1944), 32),         # tủ gỗ thấp
    'food_table_2': ((32, 1832, 64, 1878), 32),        # bàn gỗ nhỏ có ngăn kéo
    'drink_table_2': ((32, 1832, 64, 1878), 32),
    'food_table_4': ((158, 1896, 226, 1944), 64),      # quầy gỗ dài dùng làm bàn
}


def prop(sheet, box, width):
    art = sheet.crop(box)
    art = art.crop(art.getbbox())
    out = Image.new('RGBA', (width, art.height), (0, 0, 0, 0))
    out.alpha_composite(art, ((width - art.width) // 2, 0))
    return out


def splice(img):
    """Bản 1 ô (32 px) từ bản 2 ô: nửa trái + nửa phải."""
    out = Image.new('RGBA', (32, img.height), (0, 0, 0, 0))
    out.alpha_composite(img.crop((0, 0, 16, img.height)), (0, 0))
    out.alpha_composite(img.crop((img.width - 16, 0, img.width, img.height)), (16, 0))
    return out


def main(src: str) -> None:
    sheet = Image.open(src).convert('RGBA')
    wood = crop(sheet, SHELF_WOOD)
    fridge = sheet.crop(FRIDGE)
    counter = sheet.crop(COUNTER)
    floor = Image.open(Path(src).with_name('Room_Builder_free_32x32.png')).convert('RGBA').crop((352, 224, 448, 416))
    cashier = Image.new('RGBA', (64, counter.height + 14), (0, 0, 0, 0))
    cashier.alpha_composite(counter, (0, 14))
    cashier.alpha_composite(sheet.crop(MONITOR), (6, 1))
    items = {
        'fixture_shelf_wooden': wood, 'fixture_shelf_wooden_single': splice(wood), 'fixture_shelf_glass': crop(sheet, SHELF_GLASS),
        'fixture_refrigerator': fridge, 'fixture_freezer': fridge, 'fixture_refrigerator_single': sheet.crop(FRIDGE_SINGLE),
        'fixture_warehouse_dry': crop(sheet, (382, 2285)), 'fixture_warehouse_cold': fridge, 'fixture_warehouse_receiving': cashier,
        'tile_store_floor': floor.crop((32, 0, 64, 32)), 'warehouse_floor': floor.crop((32, 128, 64, 160)),
        'fixture_cashier': cashier, 'fixture_cashier_single': splice(cashier),
    }
    for pid, (box, w) in PROPS.items():
        items[f'fixture_prop_{pid}'] = prop(sheet, box, w)
    width, x, y, row_h, frames = 256, 0, 0, 0, {}
    placed = []
    for key, img in items.items():
        if x + img.width > width:
            x, y, row_h = 0, y + row_h + 2, 0
        placed.append((img, x, y))
        frames[key] = {'x': x, 'y': y, 'w': img.width, 'h': img.height}
        x += img.width + 2
        row_h = max(row_h, img.height)
    atlas = Image.new('RGBA', (width, y + row_h), (0, 0, 0, 0))
    for img, px, py in placed:
        atlas.alpha_composite(img, (px, py))
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'furniture.png')
    (OUT / 'furniture.json').write_text(json.dumps({'image': 'furniture.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Furniture from LimeZu "Modern Interiors Free" (https://limezu.itch.io/moderninteriors). Non-commercial use only; do not redistribute.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung')


if __name__ == '__main__':
    main(sys.argv[1])
