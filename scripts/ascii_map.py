"""In ban do ASCII do sang vung trung tam de 'nhin' o highlight.
Doc anh PNG rieng. Nhan path anh lam doi so.
"""
import sys
from PIL import Image

path = sys.argv[1]
img = Image.open(path).convert("RGB")
px = img.load()

# vung quet: y tu 250 den 520, x tu 360 den 920 (vung quay camera)
X0, X1 = 360, 920
Y0, Y1 = 250, 525
cols = 80
rows = 44
chars = " .:-=+*#%@"
for yi in range(rows):
    y = Y0 + int((Y1 - Y0) * yi / rows)
    line = []
    for xi in range(cols):
        x = X0 + int((X1 - X0) * xi / cols)
        r, g, b = px[x, y]
        lum = (r + g + b) / 3
        # mark bright/yellow strongly
        v = lum / 255
        idx = min(len(chars) - 1, int(v * (len(chars) - 1)))
        # if strongly yellow, use 'Y'
        c = chars[idx]
        if r > 220 and g > 200 and b < 160:
            c = "Y"
        elif lum > 230:
            c = "H"
        line.append(c)
    print("".join(line))
