"""Tạo các icon PWA cho game Tạp Hóa 3D bằng Pillow (chạy offline, không cần mạng)."""
from PIL import Image, ImageDraw

# Màu sắc chủ đạo của game (theme-color #1d1f2b, nền trời #87b5e0)
BG_TOP = (38, 42, 64)      # #262a40 - xanh than
BG_BOTTOM = (15, 17, 28)   # #0f111c - tối hơn
ROOF = (194, 60, 54)       # mái đỏ
WALL = (240, 224, 178)     # tường vàng nhạt
DOOR = (94, 140, 86)       # cửa xanh lá
DOOR_LIGHT = (214, 232, 201)
AWNING = (240, 148, 60)    # mái hiên cam
SIGN = (255, 214, 92)      # biển hiệu vàng


def make_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Tỷ lệ vẽ theo đơn vị 100 (gốc trái-trên)
    def s(px: float) -> float:
        # bản vẽ dùng hệ toạ độ 0..100, nhân scale khi vẽ.
        # nếu maskable: thu nhỏ để chừa vùng an toàn 40% tâm.
        pass

    # Trả về hàm quy đổi (về hướng vẽ)
    return img


def draw_logo(d: ImageDraw, L, T, Wd, Ht):
    """Vẽ biểu tượng cửa hàng trong khung (L,T) rộng Wd cao Ht (đơn vị % của cạnh)."""
    # mái (tam giác + diềm)
    d.polygon(
        [(L, T + 0.18 * Ht), (L + Wd / 2, T), (L + Wd, T + 0.18 * Ht)],
        fill=ROOF,
    )
    d.polygon(
        [(L + 0.04 * Wd, T + 0.18 * Ht), (L + 0.96 * Wd, T + 0.18 * Ht),
         (L + 0.96 * Wd, T + 0.24 * Ht), (L + 0.04 * Wd, T + 0.24 * Ht)],
        fill=ROOF,
    )
    # tường
    d.rectangle([L + 0.08 * Wd, T + 0.24 * Ht, L + 0.92 * Wd, T + 0.86 * Ht], fill=WALL)
    # ô cửa sổ
    d.rectangle([L + 0.15 * Wd, T + 0.34 * Ht, L + 0.38 * Wd, T + 0.52 * Ht], fill=DOOR_LIGHT, outline=DOOR, width=max(1, int(Wd * 0.01)))
    # cửa chính giữa
    d.rectangle([L + 0.42 * Wd, T + 0.30 * Ht, L + 0.58 * Wd, T + 0.86 * Ht], fill=DOOR, outline=(60, 90, 52), width=max(1, int(Wd * 0.012)))
    # mái hiên ngang trên cửa
    d.rectangle([L + 0.36 * Wd, T + 0.26 * Ht, L + 0.64 * Wd, T + 0.32 * Ht], fill=AWNING)
    # biển hiệu
    d.rectangle([L + 0.52 * Wd, T + 0.36 * Ht, L + 0.85 * Wd, T + 0.52 * Ht], fill=SIGN, outline=(180, 140, 40), width=max(1, int(Wd * 0.008)))


def build(size: int, maskable: bool) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Nền dốc trên-xuống
    for y in range(size):
        t = y / size
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Khung vẽ logo; maskable chừa vùng an toàn (~40% tâm), bình thường rộng hơn
    if maskable:
        margin = size * 0.14
    else:
        margin = size * 0.02
    box = [margin, margin, size - margin, size - margin]
    # vùng logo nằm giữa khung
    logo_w = box[2] - box[0]
    logo_h = box[3] - box[1]
    # điều chỉnh để nội dung vào chính giữa
    draw_logo(d, box[0], box[1], logo_w, logo_h)
    return img


import os
out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out_dir, exist_ok=True)

manifest = []
jobs = [
    (512, "icon-512.png", False),
    (512, "icon-maskable-512.png", True),
    (192, "icon-192.png", False),
    (180, "apple-touch-icon.png", False),
]
for size, name, mask in jobs:
    img = build(size, mask)
    path = os.path.join(out_dir, name)
    img.save(path, "PNG")
    print("saved", path, img.size)

# favicon 48x48 và 64x64
for size in (48, 64):
    img = build(size, False)
    path = os.path.join(out_dir, f"favicon-{size}.png")
    img.save(path, "PNG")
    print("saved", path, img.size)
print("done")
