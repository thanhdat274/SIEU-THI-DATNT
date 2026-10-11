"""Cắt xe buýt/xe tải/xe van nhìn NGANG từ Kenney "Pixel Vehicle Pack" (CC0) thành atlas cho renderer.

Dùng:  python tools/sprite-atlas/build-kenney-vehicles.py <thư mục giải nén pixelCarPack_kenney (có PNG/Cars)>
Nguồn: https://opengameart.org/content/pixel-vehicle-pack (pixelCarPack_kenney.zip). Xe trong pack quay đầu sang PHẢI;
hướng trái là lật ngang. Phóng 3x (nearest). Ghi ra apps/web/public/assets/sprites/vehicles/{vehicles.png,vehicles.json,LICENSE.txt}. Cần Pillow.
"""
import json, sys
from pathlib import Path
from PIL import Image

SCALE = 3
# khóa texture của game -> tên file trong PNG/Cars. Xe buýt (minibus) 4 kiểu; xe tải theo TRUCK_KINDS (game-data neighborhood.ts).
MINIBUS = ['bus', 'bus_school', 'van_large', 'van']
TRUCK = {'dry_goods': 'truck', 'beverage_sweets': 'truckdark', 'refrigerated': 'truckdelivery', 'fresh_produce': 'van_flat'}
OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/vehicles'


def main(src: str) -> None:
    items = {}
    def add(key_fmt, name):
        img = Image.open(Path(src) / 'PNG/Cars' / f'{name}.png').convert('RGBA')
        img = img.resize((img.width * SCALE, img.height * SCALE), Image.NEAREST)
        items[key_fmt.format(d='right')] = img
        items[key_fmt.format(d='left')] = img.transpose(Image.FLIP_LEFT_RIGHT)
    for v, name in enumerate(MINIBUS):
        add(f'vehicle_minibus_{v}_{{d}}', name)
    for kind, name in TRUCK.items():
        add(f'truck_{kind}_{{d}}', name)
    width, x, y, row_h, frames, placed = 512, 0, 0, 0, {}, []
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
    atlas.save(OUT / 'vehicles.png')
    (OUT / 'vehicles.json').write_text(json.dumps({'image': 'vehicles.png', 'resolution': 1, 'frames': frames}, indent=1) + '\n', encoding='utf8')
    (OUT / 'LICENSE.txt').write_text('Vehicles from Kenney "Pixel Vehicle Pack" (https://kenney.nl / https://opengameart.org/content/pixel-vehicle-pack), CC0.\n', encoding='utf8')
    print('ghi', OUT, len(frames), 'khung, atlas', atlas.size)


if __name__ == '__main__':
    main(sys.argv[1])
