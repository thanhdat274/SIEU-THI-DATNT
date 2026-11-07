"""Phan tich anh PNG de tim o sang highlight (glowing tile) trong game isometric.
Dung phat trien noi bo, khong phai du lieu ngoai. Nhan path anh lam doi so.
"""
import sys
from PIL import Image

path = sys.argv[1]
img = Image.open(path).convert("RGB")
W, H = img.size
px = img.load()

# quet cac diem co 'do sang cao' va 'am/an vang' - glow tile thuong la chu vi sang
# tim vung cuc sang (muc > threshold) roi lay bounding box + centroid
pts = []
thresh = 225
for y in range(0, H, 2):
    for x in range(0, W, 2):
        r, g, b = px[x, y]
        mx = max(r, g, b)
        # glow: rat sang, thien vang/trang (r>=g>=b-ish), khong phai xanh bau troi
        if mx > thresh and r > 180 and g > 160 and b < 235 and (r + g) > 400:
            pts.append((x, y))

if not pts:
    print("NO_GLOW pixels found; kiem tra phan bo sang nhat:")
    # in mau sang nhat de chuan doan
    best = None
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            r, g, b = px[x, y]
            mx = r + g + b
            if best is None or mx > best[0]:
                best = (mx, (x, y), (r, g, b))
    print("  brightest:", best)
    sys.exit(0)

minx = min(p[0] for p in pts); maxx = max(p[0] for p in pts)
miny = min(p[1] for p in pts); maxy = max(p[1] for p in pts)
cx = (minx + maxx) // 2; cy = (miny + maxy) // 2
print(f"W={W} H={H}")
print(f"count={len(pts)}")
print(f"bbox=({minx},{miny})-({maxx},{maxy})")
print(f"centroid={cx},{cy}")
