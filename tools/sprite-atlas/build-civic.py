"""Ghép các sprite công trình công cộng (civic) và NPC nghiêng ngang vào atlas riêng `civic`.

Dùng: python tools/sprite-atlas/build-civic.py [thư mục nguồn civic-art]
Nguồn mặc định: C:/Users/Admin/Downloads/civic-art/
Ghi ra: apps/web/public/assets/sprites/civic/ (civic.png + civic.json)
"""
import json, sys
from pathlib import Path
from PIL import Image

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\Admin\Downloads\civic-art")
OUT = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/civic'
INDEX_FILE = Path(__file__).resolve().parents[2] / 'apps/web/public/assets/sprites/index.json'

def main():
    if not SRC.exists():
        print(f"Lỗi: Không tìm thấy thư mục nguồn {SRC}")
        sys.exit(1)

    items = {}
    # 1. Đọc 8 sprite mặt tiền công trình (ngày + đêm)
    for p in sorted(SRC.glob('civic_*.png')):
        key = p.stem
        items[key] = Image.open(p).convert('RGBA')

    # 2. Đọc 48 sprite NPC nghiêng ngang
    for p in sorted(SRC.glob('npc_*.png')):
        key = p.stem
        items[key] = Image.open(p).convert('RGBA')

    print(f"Tìm thấy {len(items)} sprite ({len([k for k in items if k.startswith('civic_')])} công trình, {len([k for k in items if k.startswith('npc_')])} NPC)")

    # Sắp xếp để pack gọn: xếp công trình trước (chiều cao giảm dần), sau đó xếp NPC
    civic_items = [(k, im) for k, im in items.items() if k.startswith('civic_')]
    npc_items = [(k, im) for k, im in items.items() if k.startswith('npc_')]

    civic_items.sort(key=lambda x: (x[1].height, x[1].width), reverse=True)
    npc_items.sort(key=lambda x: x[0])

    all_sorted = civic_items + npc_items

    width = 1024
    padding = 2
    x, y, row_h = 0, 0, 0
    placed = []
    frames = {}

    for key, img in all_sorted:
        w, h = img.size
        if x + w > width:
            x = 0
            y += row_h + padding
            row_h = 0
        placed.append((img, x, y))
        frames[key] = {'x': x, 'y': y, 'w': w, 'h': h}
        x += w + padding
        row_h = max(row_h, h)

    atlas_height = y + row_h + padding
    atlas = Image.new('RGBA', (width, atlas_height), (0, 0, 0, 0))
    for img, px, py in placed:
        atlas.alpha_composite(img, (px, py))

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / 'civic.png')
    
    meta = {
        'image': 'civic.png',
        'resolution': 1,
        'frames': frames
    }
    (OUT / 'civic.json').write_text(json.dumps(meta, indent=2) + '\n', encoding='utf-8')
    print(f"Đã ghi atlas: {OUT / 'civic.png'} kích thước {atlas.size}, {len(frames)} khung")

    # Cập nhật index.json
    if INDEX_FILE.exists():
        index_data = json.loads(INDEX_FILE.read_text(encoding='utf-8'))
        atlas_entry = 'civic/civic.json'
        if atlas_entry not in index_data.get('atlases', []):
            index_data['atlases'].append(atlas_entry)
            INDEX_FILE.write_text(json.dumps(index_data, indent=2) + '\n', encoding='utf-8')
            print(f"Đã thêm '{atlas_entry}' vào {INDEX_FILE}")
        else:
            print(f"'{atlas_entry}' đã có sẵn trong {INDEX_FILE}")

if __name__ == '__main__':
    main()
