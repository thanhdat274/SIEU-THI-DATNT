"""Sinh `packages/game-data/src/product-icons-food.ts` từ Kenney "Pixel Platformer Food Expansion" (CC0).

Dùng:  python tools/sprite-atlas/build-food-icons.py <thư mục giải nén kenney_pixel-platformer-food-expansion>
Nguồn: https://kenney.nl/assets/pixel-platformer-food-expansion (Tilemap/tilemap_packed.png, ô 18x18 không lề, 16 cột).
Mỗi icon: lấy ô 18x18, bỏ viền ngoài 1 điểm ảnh còn 16x16 (khớp `productPixels` và viewBox 16 của ProductIcon), gộp điểm ảnh
cùng màu liền nhau theo hàng thành hình chữ nhật. Chỉ những sản phẩm có trong FOOD_BY_PRODUCT mới dùng icon này; còn lại giữ icon theo loại.
Cần Pillow.
"""
import sys
from pathlib import Path
from PIL import Image

TILE = 18
# tên icon -> (cột, hàng) trong tilemap_packed.png
ICONS = {
    'donut_plain': (13, 0), 'donut_pink': (14, 0), 'donut_choc': (15, 0), 'bun': (9, 0), 'cracker': (10, 3),
    'candy_corn': (11, 2), 'burger_small': (10, 5), 'sauce_bottle': (10, 2), 'icecream': (11, 6),
}
# id sản phẩm -> icon (chọn những món thực sự hợp hình; còn lại giữ icon theo loại hàng)
FOOD_BY_PRODUCT = {
    'banh_quy': 'cracker', 'banh_quy_oreo': 'cracker', 'banh_cracker': 'cracker', 'banh_xop': 'cracker',
    'banh_chocopie': 'donut_choc', 'banh_socola': 'donut_choc', 'banh_mochi': 'icecream',
    'banh_pia': 'bun', 'banh_dau_xanh': 'bun', 'banh_bong_lan': 'donut_pink', 'banh_mi_que': 'burger_small',
    'keo_deo': 'candy_corn', 'keo_cao_su': 'candy_corn', 'keo_mut': 'candy_corn', 'keo_lac': 'candy_corn',
    'keo_bac_ha': 'candy_corn', 'keo_big_babol': 'candy_corn',
    'tuong_ot': 'sauce_bottle', 'nuoc_tuong': 'sauce_bottle', 'tuong_ca': 'sauce_bottle',
}
OUT = Path(__file__).resolve().parents[2] / 'packages/game-data/src/product-icons-food.ts'

def rects(img: Image.Image):
    out = []
    for y in range(16):
        x = 0
        while x < 16:
            r, g, b, a = img.getpixel((x, y))
            if a < 128:
                x += 1
                continue
            col = (r, g, b)
            x2 = x
            while x2 + 1 < 16 and img.getpixel((x2 + 1, y))[3] >= 128 and img.getpixel((x2 + 1, y))[:3] == col:
                x2 += 1
            out.append((x, y, x2 - x + 1, 1, '#%02X%02X%02X' % col))
            x = x2 + 1
    return out

def main(src: str) -> None:
    sheet = Image.open(Path(src) / 'Tilemap/tilemap_packed.png').convert('RGBA')
    lines = [
        '// TỰ SINH bởi tools/sprite-atlas/build-food-icons.py từ Kenney "Pixel Platformer Food Expansion" (CC0). Không sửa tay.',
        '// Mỗi icon là danh sách hình chữ nhật [x, y, rộng, cao, màu] trong ô 16x16, dùng bởi `productPixels` (pixel-art.ts).',
        '',
        'export const FOOD_ICON_RECTS: Record<string, ReadonlyArray<readonly [number, number, number, number, string]>> = {',
    ]
    for name, (c, r) in ICONS.items():
        tile = sheet.crop((c * TILE + 1, r * TILE + 1, c * TILE + 17, r * TILE + 17))
        lines.append(f"  {name}: [" + ', '.join(f"[{x}, {y}, {w}, {h}, '{col}']" for x, y, w, h, col in rects(tile)) + '],')
    lines += ['};', '', '/** Sản phẩm dùng icon thực phẩm Kenney (còn lại giữ icon theo loại hàng). */', 'export const FOOD_ICON_BY_PRODUCT: Readonly<Record<string, string>> = {']
    for pid, name in FOOD_BY_PRODUCT.items():
        lines.append(f"  {pid}: '{name}',")
    lines += ['};', '']
    OUT.write_text('\n'.join(lines), encoding='utf8')
    print('wrote', OUT.name, len(ICONS), 'icons,', len(FOOD_BY_PRODUCT), 'products')

if __name__ == '__main__':
    main(sys.argv[1])
