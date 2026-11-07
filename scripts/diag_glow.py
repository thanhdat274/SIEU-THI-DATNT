"""Chuan doan anh PNG cua game de tim o highlight khi dang dat do.
Chay trong moi truong noi bo, doc file anh rieng. Nhan path anh lam doi so.
"""
import sys
from PIL import Image

path = sys.argv[1]
img = Image.open(path).convert("RGB")
W, H = img.size
px = img.load()

def cluster(cond, tag):
    pts = []
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            r, g, b = px[x, y]
            if cond(r, g, b):
                pts.append((x, y))
    if not pts:
        print(tag, ": 0")
        return
    minx = min(p[0] for p in pts); maxx = max(p[0] for p in pts)
    miny = min(p[1] for p in pts); maxy = max(p[1] for p in pts)
    print(f"{tag}: n={len(pts)} bbox=({minx},{miny})-({maxx},{maxy}) center=({(minx+maxx)//2},{(miny+maxy)//2})")

# vang sang (glow vang)
cluster(lambda r,g,b: r>235 and g>200 and b<140, "yellow")
# cam
cluster(lambda r,g,b: r>230 and 120<g<200 and b<110, "orange")
# trang tinh khiet (highlight trang)
cluster(lambda r,g,b: r>235 and g>235 and b>230, "white")
# xanh luc sang (valid tile xanh)
cluster(lambda r,g,b: g>180 and r<140 and b<140, "green")

# thep: do sang theo cot  (tim bien trang/glow theo cot)
print("--- brightness profile (rows, sum bright>210) ---")
for y in range(0, H, 20):
    c = 0
    for x in range(0, W, 2):
        r, g, b = px[x, y]
        if max(r, g, b) > 210:
            c += 1
    print(f"y={y}: {c}")
