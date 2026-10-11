"""Cắt ô/sprite từ Kenney "Roguelike Modern City" (CC0) thành atlas cho hạ tầng sprite-atlas của renderer.

Dùng:  python tools/sprite-atlas/build-kenney-city.py <thư mục giải nén kenney_roguelike-modern-city>
Nguồn: https://kenney.nl/assets/roguelike-modern-city (Tilemap/tilemap_packed.png, ô 16x16 không lề).
Mọi sprite được phóng 2x (nearest) để cùng cỡ điểm ảnh với game. Ghi ra
apps/web/public/assets/sprites/city/{city.png,city.json,LICENSE.txt}. Cần Pillow.
"""
import json, re, sys
from pathlib import Path
from PIL import Image

SCALE = 2
# Ô nền lặp: khóa -> (cột, hàng), cắt đúng 1 ô 16x16.
TILES = {
    'tile_street': (10, 24),    # nhựa đường trơn
    'tile_sidewalk': (4, 20),   # gạch lát be
}
# Sprite: khóa -> (cột đầu, hàng đầu, cột cuối, hàng cuối, lật ngang?, canvas (w,h) hoặc None).
# Vùng ô được cắt theo khung chữ nhật chặt (alpha) rồi đặt giữa-đáy vào canvas, khớp neo giữa-đáy/đáy-trái của renderer.
CAR_FACE_LEFT = {'green': (31, 16, 33, 17), 'grey': (31, 20, 33, 21), 'orange': (31, 24, 33, 25)}  # xe nhìn ngang, đèn pha trắng ở đầu TRÁI = đầu xe quay về TRÁI
CAR_FACE_RIGHT = {'green': (34, 16, 36, 17), 'grey': (34, 20, 36, 21), 'orange': (34, 24, 36, 25)}  # đèn pha ở đầu PHẢI = đầu xe quay về PHẢI
CAR_UP = {'green': (31, 18, 32, 19), 'grey': (31, 22, 32, 23), 'orange': (31, 26, 32, 27)}  # nhìn từ sau (đèn đỏ) = đi lên
CAR_DOWN = {'green': (33, 18, 34, 19), 'grey': (33, 22, 34, 23), 'orange': (33, 26, 34, 27)}  # nhìn từ trước (đèn trắng) = đi xuống
# Biến thể xe trong game -> màu Kenney (0 taxi, 1 sedan trắng, 2 hatchback bạc, 3 hatchback đỏ, 4 sedan xanh, 5 SUV đen)
VARIANT_COLOR = ['orange', 'orange', 'grey', 'orange', 'green', 'grey']
# Tô lại 3 sắc thân xe (khớp đúng màu gốc) theo biến thể: (hue độ, độ bão hòa tuyệt đối, hệ số sáng); None = giữ nguyên
VARIANT_RECOLOR = [(47, 0.85, 1.22), (0, 0.04, 1.2), None, (2, 0.78, 1.0), (212, 0.62, 0.95), (0, 0.08, 0.5)]
SPRITES = {}
# Ô tô nhìn ngang đã chuyển sang atlas vehicles (build-kenney-vehicles.py); ở đây chỉ còn xe làn dọc (nhìn trước/sau).
for v in range(6):
    color = VARIANT_COLOR[v]
    SPRITES[f'vehicle_ns_car_{v}_up'] = (*CAR_UP[color], False, None)
    SPRITES[f'vehicle_ns_car_{v}_down'] = (*CAR_DOWN[color], False, None)
for k, col in enumerate((31, 33, 34)):     # cây: lục nhạt, lục đậm, lục non
    SPRITES[f'nb_tree_round_{k}'] = (col, 10, col, 12, False, None)
SPRITES['deco_lamp_pole'] = (1, 16, 1, 18, False, 'keep_x')  # cột đèn đường: giữ vị trí ngang trong ô để cột nằm giữa canvas 32 px

SPRITES['deco_fence'] = (22, 16, 22, 16, False, ('low', 10))  # hàng rào gỗ thấp: chỉ lấy 10 hàng điểm ảnh trên (cao 20 px sau khi phóng), đặt sát đáy ô 32x32
SPRITES['nb_bench'] = (17, 16, 18, 16, False, None)         # ghế băng gỗ
SPRITES['nb_bin'] = (17, 13, 17, 13, False, None)           # thùng rác xám
SPRITES['nb_hedge'] = (31, 4, 33, 4, False, None)           # luống cây xanh trong khung gỗ
for k, c in enumerate((31, 33, 34)):                          # bụi cây nhỏ: lục nhạt, lục đậm, lục non
    SPRITES[f'nb_bush_{k}'] = (c, 13, c, 13, False, None)
for k, c in enumerate((31, 33)):                              # bụi cây nền khu chơi (32x32 theo ô)
    SPRITES[f'deco_bush_{k}'] = (c, 13, c, 13, False, (32, 32))

# Trạm xe buýt: Kenney không có nhà chờ, ghép từ băng ghế + cột biển xanh có tấm trắng (biển trạm).
COMPOSITES = {
    # Luống hoa: khung gỗ (31,5)-(33,5) làm nền, ba bụi cây nhỏ mọc phía trên (pack không có hoa). Canvas 84x40.
    **{f'nb_flowerbed_{k}': {'canvas': (84, 40), 'parts': [((31, 5, 33, 5), 0, 'bottom', 0), ((c0, 13, c0, 13), 4, 'bottom', 10), ((c1, 13, c1, 13), 32, 'bottom', 8), ((c2, 13, c2, 13), 60, 'bottom', 10)]}
       for k, (c0, c1, c2) in enumerate(((31, 34, 33), (34, 31, 34), (33, 33, 31)))},
    # Nhà chờ công viên: mái bạt sọc xanh-trắng (3x2 ô) trên hai cột gỗ (vẽ lại bằng màu lấy từ ô cột gỗ của pack), băng ghế dưới mái. Canvas 96x104.
    'nb_pavilion': {'canvas': (96, 104), 'posts': (6, 90), 'parts': [((17, 16, 18, 16), 30, 'bottom', 0), ((23, 10, 25, 11), 0, 'top', 0)]},
    'nb_bus_stop': {'canvas': (80, 64), 'parts': [((17, 16, 18, 16), 8, 'bottom', 0), ((9, 14, 9, 15), 56, 'bottom', 0)]},  # (vùng ô, x trái trong canvas, căn đáy)
}

OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/city'

def cut(sheet, c0, r0, c1, r1, flip, canvas):
    region = sheet.crop((c0 * 16, r0 * 16, (c1 + 1) * 16, (r1 + 1) * 16))
    if isinstance(canvas, tuple) and canvas[0] == 'low':  # lấy `h` hàng trên cùng của vùng, canvas bằng vùng, dán sát đáy
        top = region.crop((0, 0, region.width, canvas[1])).resize((region.width * SCALE, canvas[1] * SCALE), Image.NEAREST)
        out = Image.new('RGBA', (region.width * SCALE, region.height * SCALE), (0, 0, 0, 0))
        out.alpha_composite(top, (0, out.height - top.height))
        return out
    if canvas == 'full':  # không cắt viền trong suốt, giữ đúng kích thước vùng ô
        img = region.resize((region.width * SCALE, region.height * SCALE), Image.NEAREST)
        return img.transpose(Image.FLIP_LEFT_RIGHT) if flip else img
    box = region.getbbox()
    if not box:
        raise SystemExit(f'vùng trống ({c0},{r0})-({c1},{r1})')
    img = region.crop(box).resize(((box[2] - box[0]) * SCALE, (box[3] - box[1]) * SCALE), Image.NEAREST)
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if canvas == 'keep_x':  # giữ nguyên vị trí ngang trong vùng ô (cột đèn có tay đòn lệch một bên)
        out = Image.new('RGBA', ((c1 - c0 + 1) * 16 * SCALE, img.height), (0, 0, 0, 0))
        out.alpha_composite(img, (box[0] * SCALE, 0))
        img = out
    elif canvas:
        out = Image.new('RGBA', canvas, (0, 0, 0, 0))
        out.alpha_composite(img, ((canvas[0] - img.width) // 2, canvas[1] - img.height))
        img = out
    return img

BODY_SHADES = {  # sắc thân gốc của từng màu xe Kenney (rgb)
    'orange': {(0xc6, 0x65, 0x27), (0x97, 0x4c, 0x1e), (0xb4, 0x5c, 0x24)},
    'green': {(0x4b, 0xa8, 0x6d), (0x30, 0x7e, 0x4d), (0x40, 0x9c, 0x62)},
    'grey': {(0x84, 0x92, 0x9a), (0x5c, 0x67, 0x6d), (0x72, 0x80, 0x87)},
}


def recolor_car(img, src_color, spec):
    import colorsys
    hue, sat, mul = spec
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in BODY_SHADES[src_color]:
                v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[2]
                nr, ng, nb = colorsys.hsv_to_rgb(hue / 360, sat, min(1.0, v * mul))
                px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return img


def main(src: str) -> None:
    sheet = Image.open(Path(src) / 'Tilemap/tilemap_packed.png').convert('RGBA')
    items = {}
    for key, (c, r) in TILES.items():
        items[key] = sheet.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)).resize((16 * SCALE, 16 * SCALE), Image.NEAREST)
    for key, spec in SPRITES.items():
        items[key] = cut(sheet, *spec)
        m = re.match(r'vehicle_(?:ns_car_(\d)_|car(?:_v(\d))?_)', key)
        if m:
            v = int(m.group(1) or m.group(2) or 0)
            if VARIANT_RECOLOR[v]:
                recolor_car(items[key], VARIANT_COLOR[v], VARIANT_RECOLOR[v])
    for key, comp in COMPOSITES.items():
        out = Image.new('RGBA', comp['canvas'], (0, 0, 0, 0))
        if 'posts' in comp:  # cột gỗ 6 px: viền tối + lõi sáng, màu lấy từ ô cột gỗ (21,12) của pack
            from PIL import ImageDraw
            wood = Image.open(Path(src) / 'Tilemap/tilemap_packed.png').convert('RGBA').crop((21 * 16, 12 * 16, 22 * 16, 13 * 16)).getcolors(300)
            wood = sorted((c for c in wood if c[1][3] == 255), reverse=True)
            dark, light = wood[0][1], wood[1][1] if len(wood) > 1 else wood[0][1]
            d = ImageDraw.Draw(out)
            for cx in comp['posts']:
                d.rectangle([cx - 3, 40, cx + 2, comp['canvas'][1] - 1], fill=dark)
                d.rectangle([cx - 1, 40, cx, comp['canvas'][1] - 1], fill=light)
        for (c0, r0, c1, r1), x, _, dy in comp['parts']:
            part = cut(sheet, c0, r0, c1, r1, False, None)
            out.alpha_composite(part, (x, 0 if _ == 'top' else comp['canvas'][1] - part.height - dy))
        items[key] = out
    # xếp kệ (shelf packing), có lề 2px giữa các khung để tránh lem
    width, x, y, row_h, frames, placed = 512, 0, 0, 0, {}, []
    for key, img in items.items():
        if x + img.width > width:
            x, y, row_h = 0, y + row_h + 2, 0
        placed.append((key, img, x, y))
        frames[key] = {'x': x, 'y': y, 'w': img.width, 'h': img.height}
        x += img.width + 2
        row_h = max(row_h, img.height)
    atlas = Image.new('RGBA', (width, y + row_h), (0, 0, 0, 0))
    for _, img, px, py in placed:
        atlas.alpha_composite(img, (px, py))
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'city.png')
    (OUT / 'city.json').write_text(json.dumps({'image': 'city.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Sprites from Kenney "Roguelike Modern City" (https://kenney.nl/assets/roguelike-modern-city), CC0 1.0.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung, atlas', atlas.size)

if __name__ == '__main__':
    main(sys.argv[1])
