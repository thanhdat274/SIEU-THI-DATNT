"""Bộ công cụ sửa sprite civic: Trường tiểu học (ngày/đêm) và NPC 7 người cao tuổi nghiêng ngang.

Mục đích (QA D2, 17/10/2026): sinh lại `civic_primary_school(_night).png` (cổng 2 ô khớp `doorTiles`) và
12 khung `npc_7_left/right_*` (bỏ ô trắng trên mặt) trong thư mục nguồn civic-art, để sau đó ghép atlas.

Cách chạy (cần Pillow):
    python tools/generate_updated_civic_art.py          # GHI ĐÈ ảnh trong SRC (C:/Users/Admin/Downloads/civic-art)
    python tools/sprite-atlas/build-civic.py            # ghép lại apps/web/public/assets/sprites/civic/civic.png + .json
    yarn --cwd packages/game-renderer test              # civic-atlas.test.ts + civic-door-pixels.test.ts phải PASS
Lưu ý: ảnh nguồn bị ghi đè tại chỗ (không có bản sao lưu); `update_npc7` vẽ lên khung đang có nên sao lưu SRC trước khi chạy lại.

Quy chuẩn:
- 1 ô = 32 px
- Viền INK #3A3A50 1 px
- Không khử răng cưa
- Nền trong suốt
- Ánh sáng trên-trái
- <= 40 màu, chỉ dùng bảng màu chuẩn của game
"""
import os, sys
from PIL import Image

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


SRC = r"C:\Users\Admin\Downloads\civic-art"

# BẢNG MÀU CHUẨN GAME
INK = (58, 58, 80, 255)            # #3A3A50

# Da (warm skin)
SKIN = (240, 196, 148, 255)        # #f0c494
SKIN_LIGHT = (252, 224, 191, 255)  # #fce0bf
SKIN_DARK = (232, 182, 132, 255)   # #e8b684
EYE = (31, 22, 18, 255)            # #1f1612

# Tóc / râu bạc & đá sáng
HAIR_LIGHT = (236, 234, 228, 255)  # #eceae4
HAIR_DARK = (216, 212, 204, 255)   # #d8d4cc

# Nón lá
HAT_MAIN = (232, 217, 168, 255)    # #e8d9a8
HAT_LIGHT = (244, 235, 207, 255)   # #f4ebcf
HAT_DARK = (184, 154, 92, 255)     # #b89a5c

# Áo bà ba xanh rêu #7a8f6a
BABA_MAIN = (122, 143, 106, 255)   # #7a8f6a
BABA_DARK = (90, 111, 76, 255)     # #5a6f4c
BABA_LIGHT = (155, 176, 140, 255)  # #9bb08c

# Quần đen & gậy trúc
PANTS_DARK = (43, 43, 54, 255)     # #2b2b36
PANTS_LIGHT = (65, 65, 80, 255)    # #414150
CANE_MAIN = (138, 90, 47, 255)     # #8a5a2f
CANE_DARK = (106, 74, 58, 255)     # #6a4a3a

# CÔNG TRÌNH TRƯỜNG TIỂU HỌC - BẢNG MÀU NGÀY
WALL_MAIN = (232, 217, 168, 255)   # #e8d9a8
WALL_LIGHT = (244, 235, 207, 255)  # #f4ebcf
WALL_DARK = (201, 183, 131, 255)   # #c9b783
WALL_TRIM = (184, 154, 92, 255)    # #b89a5c

ROOF_MAIN = (168, 72, 58, 255)     # #a8483a
ROOF_LIGHT = (201, 105, 78, 255)   # #c9694e
ROOF_DARK = (127, 52, 39, 255)     # #7f3427
ROOF_RIDGE = (92, 36, 26, 255)     # #5c241a

STONE_LIGHT = (236, 234, 228, 255) # #eceae4
STONE_MAIN = (216, 212, 204, 255)  # #d8d4cc
STONE_DARK = (179, 174, 164, 255)  # #b3aea4
STONE_EDGE = (146, 139, 129, 255)  # #928b81

BRICK_LIGHT = (197, 143, 92, 255)  # #c58f5c (gạch sáng)
BRICK_MAIN = (143, 103, 63, 255)   # #8f673f (gạch chính)
BRICK_DARK = (106, 74, 58, 255)    # #6a4a3a (gạch sẫm / mạch vữa)
BRICK_RED = (176, 118, 84, 255)    # #b07654 (gạch đỏ)

GLASS_MAIN = (127, 179, 214, 255)  # #7fb3d6
GLASS_LIGHT = (169, 211, 234, 255) # #a9d3ea
GLASS_WHITE = (255, 255, 255, 255) # #ffffff

GOLD = (244, 196, 48, 255)         # #f4c430
FLAG_RED = (198, 49, 44, 255)      # #c6312c

IRON_LIGHT = (111, 128, 151, 255)  # #6f8097
IRON_DARK = (61, 68, 72, 255)      # #3d4448

BUSH_LIGHT = (123, 173, 44, 255)   # #7bad2c
BUSH_MAIN = (64, 156, 98, 255)     # #409c62
BUSH_MID = (75, 168, 109, 255)     # #4ba86d
BUSH_SHADE = (100, 140, 50, 255)   # #648c32
BUSH_DEEP = (47, 107, 58, 255)     # #2f6b3a

SLIDE_BLUE = (58, 110, 165, 255)   # #3a6ea5
SLIDE_RED = (192, 57, 43, 255)     # #c0392b

# CÔNG TRÌNH TRƯỜNG TIỂU HỌC - BẢNG MÀU ĐÊM
NIGHT_GLOW_CORE = (255, 242, 184, 255) # #fff2b8
NIGHT_GLOW_MAIN = (243, 216, 137, 255) # #f3d889
NIGHT_GLOW_RIM = (184, 154, 92, 255)   # #b89a5c

NIGHT_WALL_MAIN = (185, 173, 141, 255) # #b9ad8d
NIGHT_WALL_LIGHT = (195, 188, 173, 255)# #c3bcad
NIGHT_WALL_DARK = (160, 146, 110, 255) # #a0926e
NIGHT_WALL_TRIM = (147, 123, 77, 255)  # #937b4d

NIGHT_ROOF_MAIN = (134, 57, 48, 255)   # #863930
NIGHT_ROOF_LIGHT = (160, 84, 65, 255)  # #a05441
NIGHT_ROOF_DARK = (101, 41, 32, 255)   # #652920
NIGHT_ROOF_RIDGE = (74, 29, 21, 255)

NIGHT_STONE_LIGHT = (188, 187, 191, 255) # #bcbbbf
NIGHT_STONE_MAIN = (172, 169, 171, 255)  # #aca9ab
NIGHT_STONE_DARK = (143, 139, 137, 255)  # #8f8b89
NIGHT_STONE_EDGE = (116, 111, 108, 255)  # #746f6c

NIGHT_BRICK_LIGHT = (157, 114, 77, 255)  # #9d724d
NIGHT_BRICK_MAIN = (114, 82, 52, 255)    # #725234
NIGHT_BRICK_DARK = (84, 59, 48, 255)     # #543b30
NIGHT_BRICK_RED = (140, 94, 67, 255)

NIGHT_BUSH_LIGHT = (98, 138, 36, 255)    # #628a24
NIGHT_BUSH_MAIN = (51, 124, 82, 255)     # #337c52
NIGHT_BUSH_MID = (60, 134, 91, 255)      # #3c865b
NIGHT_BUSH_SHADE = (80, 112, 40, 255)
NIGHT_BUSH_DEEP = (37, 85, 46, 255)

NIGHT_SLIDE_BLUE = (46, 88, 132, 255)
NIGHT_SLIDE_RED = (134, 57, 48, 255)
NIGHT_GOLD = (195, 156, 40, 255)         # #c39c28
NIGHT_IRON_DARK = (48, 54, 60, 255)      # #30363c
NIGHT_IRON_LIGHT = (88, 102, 120, 255)


def update_npc7():
    """Vẽ lại đầu của 12 frame NPC 7 người cao tuổi nghiêng ngang."""
    # Thiết kế đầu chuẩn (hướng left, độ dịch y=0):
    # - nón lá che phía trên, rìa nón lá ở row 16
    # - mặt tông da ấm: mắt #1f1612, mũi nhô ra rõ ở row 18-19, cằm rõ ở row 20-21
    # - ria mép/râu bạc nhỏ ở dưới mũi và cằm: #eceae4 / #d8d4cc
    # - tóc bạc nhỏ ở thái dương và sau gáy: #eceae4 / #d8d4cc
    # - KHÔNG CÓ Ô VUÔNG TRẮNG
    # - gáy nối tự nhiên vào lưng hơi còng và cổ áo bà ba
    base_head = {
        16: {x: HAT_DARK for x in range(6, 11)} | {11: SKIN_LIGHT, 12: SKIN, 13: SKIN, 14: HAIR_LIGHT, 15: HAIR_LIGHT, 16: HAIR_LIGHT, 17: HAIR_DARK, 18: HAIR_DARK} | {x: HAT_DARK for x in range(19, 25)},
        17: {10: INK, 11: SKIN_LIGHT, 12: EYE, 13: SKIN, 14: SKIN, 15: HAIR_LIGHT, 16: HAIR_LIGHT, 17: HAIR_DARK, 18: HAIR_DARK, 19: INK},
        18: {8: INK, 9: SKIN_LIGHT, 10: SKIN, 11: SKIN, 12: SKIN, 13: SKIN, 14: SKIN_DARK, 15: HAIR_LIGHT, 16: HAIR_DARK, 17: HAIR_DARK, 18: INK},
        19: {8: INK, 9: SKIN, 10: HAIR_LIGHT, 11: HAIR_LIGHT, 12: SKIN, 13: SKIN_DARK, 14: SKIN_DARK, 15: SKIN_DARK, 16: HAIR_DARK, 17: INK},
        20: {9: INK, 10: HAIR_LIGHT, 11: HAIR_LIGHT, 12: SKIN_DARK, 13: SKIN_DARK, 14: SKIN_DARK, 15: SKIN_DARK, 16: INK, 17: INK, 18: BABA_DARK, 19: BABA_DARK, 20: BABA_DARK, 21: INK},
        21: {10: INK, 11: HAIR_DARK, 12: SKIN_DARK, 13: SKIN_DARK, 14: INK, 15: INK, 16: BABA_DARK, 17: BABA_DARK, 18: BABA_DARK, 19: BABA_DARK, 20: BABA_DARK, 21: INK},
        22: {11: INK, 12: SKIN_DARK, 13: SKIN_DARK, 14: INK, 15: BABA_MAIN, 16: BABA_MAIN, 17: BABA_MAIN, 18: BABA_DARK, 19: BABA_DARK, 20: BABA_DARK, 21: INK},
    }

    shifts = {
        'idle_0': 0,
        'idle_1': 1,
        'walk_0': 0,
        'walk_1': -1,
        'walk_2': 0,
        'walk_3': -1,
    }

    written = []
    for act_key, dy in shifts.items():
        fn_left = f'npc_7_left_{act_key}.png'
        fn_right = f'npc_7_right_{act_key}.png'
        fp_left = os.path.join(SRC, fn_left)
        fp_right = os.path.join(SRC, fn_right)

        orig = Image.open(fp_left).convert('RGBA')
        new_left = orig.copy()

        # Xóa vùng đầu cũ (x=6..25, y=16+dy..22+dy)
        for y_base in sorted(base_head.keys()):
            y = y_base + dy
            for x in range(6, 26):
                # Chỉ xóa nếu không phải là phần áo bà ba ở hàng cuối
                if y < 22 + dy:
                    new_left.putpixel((x, y), (0, 0, 0, 0))
                else:
                    orig_p = orig.getpixel((x, y))
                    if orig_p[:3] not in [(122, 143, 106), (90, 111, 76), (155, 176, 140)]:
                        new_left.putpixel((x, y), (0, 0, 0, 0))

        # Đặt lại các pixel đầu mới
        for y_base, row in base_head.items():
            y = y_base + dy
            for x, col in row.items():
                new_left.putpixel((x, y), col)

        # Đảm bảo viền nón lá 2 đầu vẫn là INK
        hat_rim_y = 16 + dy
        new_left.putpixel((5, hat_rim_y), INK)
        new_left.putpixel((25, hat_rim_y), INK)

        # Lưu bản left
        new_left.save(fp_left)
        c_left = len(set(new_left.getdata()))
        written.append((fn_left, new_left.size, c_left))

        # Bản right là lật ngang tuyệt đối từ bản left (đúng chuẩn của toàn bộ NPC nghiêng ngang)
        new_right = new_left.transpose(Image.FLIP_LEFT_RIGHT)
        new_right.save(fp_right)
        c_right = len(set(new_right.getdata()))
        written.append((fn_right, new_right.size, c_right))

    return written


def draw_school(is_night=False):
    """Vẽ lại trường tiểu học (256x256) theo quy chuẩn."""
    orig_fn = 'civic_primary_school_night.png' if is_night else 'civic_primary_school.png'
    orig = Image.open(os.path.join(SRC, orig_fn)).convert('RGBA')

    img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))

    # 1. Giữ nguyên nửa trên của tòa nhà: y = 0..101 (tháp đồng hồ, cờ, mái ngói đỏ, tầng 2)
    for y in range(102):
        for x in range(256):
            img.putpixel((x, y), orig.getpixel((x, y)))

    # 2. Tầng 1 của tòa nhà: y = 102..134
    # Giữ nguyên 4 cửa sổ ở hai bên (x=0..103 và x=152..255)
    for y in range(102, 135):
        for x in range(256):
            if x < 104 or x >= 152:
                img.putpixel((x, y), orig.getpixel((x, y)))
            else:
                # Nền tường vàng tầng 1
                img.putpixel((x, y), NIGHT_WALL_MAIN if is_night else WALL_MAIN)

    # Vẽ CỬA TÒA NHÀ TRƯỜNG ở giữa tầng 1 (x=112..143, y=104..134):
    c_wood = NIGHT_BRICK_MAIN if is_night else BRICK_MAIN
    c_wood_dark = NIGHT_BRICK_DARK if is_night else BRICK_DARK
    c_wood_light = NIGHT_BRICK_LIGHT if is_night else BRICK_LIGHT
    c_step = NIGHT_STONE_LIGHT if is_night else STONE_LIGHT
    c_step_dark = NIGHT_STONE_DARK if is_night else STONE_DARK

    # Mái vòm / đà cửa gỗ trên (y=104..107, x=112..143)
    for x in range(112, 144):
        img.putpixel((x, 104), INK)
        img.putpixel((x, 105), c_wood_light)
        img.putpixel((x, 106), c_wood)
        img.putpixel((x, 107), INK)
    img.putpixel((112, 105), INK)
    img.putpixel((112, 106), INK)
    img.putpixel((143, 105), INK)
    img.putpixel((143, 106), INK)

    # Ô kính lấy sáng vòm trên cửa (y=108..112, x=114..141)
    for y in range(108, 113):
        img.putpixel((114, y), INK)
        img.putpixel((141, y), INK)
        img.putpixel((127, y), INK)
        img.putpixel((128, y), INK)
        for x in range(115, 141):
            if x not in (127, 128):
                if is_night:
                    img.putpixel((x, y), NIGHT_GLOW_CORE if (118 <= x <= 124 or 131 <= x <= 137) else NIGHT_GLOW_MAIN)
                else:
                    img.putpixel((x, y), GLASS_WHITE if y == 109 and x in (118, 132) else (GLASS_LIGHT if y <= 109 else GLASS_MAIN))
    for x in range(114, 142):
        img.putpixel((x, 113), INK)

    # Cửa gỗ đôi 2 cánh (y=114..130, x=114..141):
    # Khung cửa và trụ giữa
    for y in range(114, 131):
        img.putpixel((114, y), INK)
        img.putpixel((141, y), INK)
        img.putpixel((127, y), INK)
        img.putpixel((128, y), INK)

        # Cánh trái (x=115..126) & Cánh phải (x=129..140)
        for x in list(range(115, 127)) + list(range(129, 141)):
            # Đố cửa gỗ trên/dưới/giữa
            if y in (114, 121, 130) or x in (115, 126, 129, 140):
                img.putpixel((x, y), c_wood if x not in (115, 129) else c_wood_light)
            else:
                # Kính ô cửa
                if is_night:
                    img.putpixel((x, y), NIGHT_GLOW_CORE if (y in (117, 118, 125, 126) and x in (119, 120, 121, 122, 133, 134, 135, 136)) else NIGHT_GLOW_MAIN)
                else:
                    img.putpixel((x, y), GLASS_WHITE if y in (116, 123) and x in (118, 132) else (GLASS_LIGHT if x in (117, 131) else GLASS_MAIN))

    # Tay nắm cửa mạ đồng ở giữa
    for y in (122, 123):
        img.putpixel((125, y), NIGHT_GLOW_CORE if is_night else GOLD)
        img.putpixel((130, y), NIGHT_GLOW_CORE if is_night else GOLD)

    # Bậc thềm cửa dẫn xuống sân (y=131..135, x=110..145)
    for x in range(112, 144):
        img.putpixel((x, 131), c_step)
        img.putpixel((x, 132), c_step_dark)
    img.putpixel((111, 131), INK)
    img.putpixel((111, 132), INK)
    img.putpixel((144, 131), INK)
    img.putpixel((144, 132), INK)

    for x in range(110, 146):
        img.putpixel((x, 133), c_step)
        img.putpixel((x, 134), c_step)
        img.putpixel((x, 135), INK)
    img.putpixel((109, 133), INK)
    img.putpixel((109, 134), INK)
    img.putpixel((146, 133), INK)
    img.putpixel((146, 134), INK)

    # 3. SÂN TRƯỜNG PHÍA DƯỚI (y = 136..223):
    # Quy chuẩn: SÂN GẠCH SÁNG ở hai bên, LỐI ĐI THẲNG TỪ CỔNG LÊN CỬA (x=96..159)
    # Lối đi rộng đúng 2 ô liền nhau (64 px, x=96..159), dẫn thẳng từ cổng lên cửa
    c_b_light = NIGHT_BRICK_LIGHT if is_night else BRICK_LIGHT
    c_b_main = NIGHT_BRICK_MAIN if is_night else BRICK_MAIN
    c_b_dark = NIGHT_BRICK_DARK if is_night else BRICK_DARK
    c_b_red = NIGHT_BRICK_RED if is_night else BRICK_RED

    c_walk_light = NIGHT_STONE_LIGHT if is_night else STONE_LIGHT
    c_walk_main = NIGHT_STONE_MAIN if is_night else STONE_MAIN
    c_walk_dark = NIGHT_STONE_DARK if is_night else STONE_DARK

    # Lát sân gạch sáng (x=16..95 và x=160..239)
    for y in range(136, 224):
        for x in range(16, 240):
            if x < 96 or x >= 160:
                # Gạch sáng với họa tiết sole 8x4 px
                bx = (x - 16) % 8
                by = (y - 136) % 4
                row_idx = (y - 136) // 4
                col_offset = 4 if (row_idx % 2 == 1) else 0
                bx_eff = (bx + col_offset) % 8

                if by == 0 or bx_eff == 0:
                    img.putpixel((x, y), c_b_dark)  # Mạch vữa
                elif by == 1 or bx_eff == 1:
                    img.putpixel((x, y), c_b_light) # Cạnh sáng gạch
                elif (x + y) % 11 == 0:
                    img.putpixel((x, y), c_b_red)   # Điểm xuyết gạch đỏ
                else:
                    img.putpixel((x, y), c_b_main)  # Thân gạch

    # Lát LỐI ĐI TRUNG TÂM (x=96..159, y=136..223):
    # Lát đá sáng sạch sẽ với viền gạch hai bên
    for y in range(136, 224):
        # Viền gạch hai bên lối đi
        img.putpixel((96, y), c_b_dark)
        img.putpixel((97, y), c_b_light)
        img.putpixel((158, y), c_b_light)
        img.putpixel((159, y), c_b_dark)

        # Lòng lối đi đá sáng (x=98..157)
        for x in range(98, 158):
            wx = (x - 98) % 12
            wy = (y - 136) % 8
            w_row = (y - 136) // 8
            w_off = 6 if (w_row % 2 == 1) else 0
            wx_eff = (wx + w_off) % 12

            if wy == 0 or wx_eff == 0:
                img.putpixel((x, y), c_walk_dark) # Rãnh đá
            elif wy == 1 or wx_eff == 1:
                img.putpixel((x, y), c_walk_light)# Cạnh sáng
            else:
                img.putpixel((x, y), c_walk_main) # Thân đá sáng

    # 4. ĐỒ VẬT TRÊN SÂN: CẦU TRƯỢT & HAI BỤI CÂY (đặt hai bên lối đi, trên sân, không dính tường)
    # Tường kết thúc ở y=134. Đồ vật đặt ở y=162..214 -> cách tường >= 27 px!
    # A. Cầu trượt bên trái (x=34..78, y=162..214):
    c_s_red = NIGHT_SLIDE_RED if is_night else SLIDE_RED
    c_s_blue = NIGHT_SLIDE_BLUE if is_night else SLIDE_BLUE
    c_s_gold = NIGHT_GOLD if is_night else GOLD

    # Mái vòm cầu trượt (x=36..50, y=162..174)
    for y in range(162, 175):
        for x in range(36, 51):
            dx = abs(x - 43)
            dy = y - 162
            if dy == 0 and dx <= 1:
                img.putpixel((x, y), c_s_gold) # Chóp vàng
            elif dy == 1 and dx <= 3:
                img.putpixel((x, y), INK if dx == 3 else ROOF_LIGHT)
            elif dy >= 2 and dx <= dy + 2 and dx <= 7:
                if dx == 7 or dy == 12 or (dy < 6 and dx == dy + 2):
                    img.putpixel((x, y), INK)
                elif x < 43:
                    img.putpixel((x, y), ROOF_LIGHT if not is_night else NIGHT_ROOF_LIGHT)
                else:
                    img.putpixel((x, y), c_s_red)

    # Thang leo đứng (x=38..46, y=175..210)
    for y in range(175, 211):
        img.putpixel((38, y), INK)
        img.putpixel((39, y), c_s_gold)
        img.putpixel((45, y), c_s_gold)
        img.putpixel((46, y), INK)
        if y % 5 == 0:
            for x in range(40, 45):
                img.putpixel((x, y), c_s_gold)
                img.putpixel((x, y + 1), INK)

    # Máng trượt dốc màu xanh (bắt đầu từ sàn ở x=46, y=182 xuống x=76, y=212)
    for i in range(30):
        sx = 46 + i
        sy = 182 + i
        if sy <= 212:
            img.putpixel((sx, sy), INK)
            img.putpixel((sx, sy + 1), c_s_blue)
            img.putpixel((sx, sy + 2), GLASS_LIGHT if not is_night else NIGHT_STONE_LIGHT)
            img.putpixel((sx, sy + 3), c_s_blue)
            img.putpixel((sx, sy + 4), INK)
    # Đoạn lượn ngang đáy máng trượt (x=75..80, y=211..214)
    for x in range(75, 81):
        img.putpixel((x, 211), INK)
        img.putpixel((x, 212), c_s_blue)
        img.putpixel((x, 213), c_s_blue)
        img.putpixel((x, 214), INK)

    # B. Hai bụi cây bên phải (x=175..200 và x=206..231, y=172..208)
    # Trích xuất pixel cây chuẩn và vẽ lên sân gạch bên phải lối đi
    c_bush_l = NIGHT_BUSH_LIGHT if is_night else BUSH_LIGHT
    c_bush_m = NIGHT_BUSH_MAIN if is_night else BUSH_MAIN
    c_bush_mid = NIGHT_BUSH_MID if is_night else BUSH_MID
    c_bush_s = NIGHT_BUSH_SHADE if is_night else BUSH_SHADE
    c_bush_d = NIGHT_BUSH_DEEP if is_night else BUSH_DEEP

    for cx, cy in [(188, 186), (218, 186)]:
        r = 13
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 <= r ** 2:
                    if d2 >= (r - 1) ** 2:
                        img.putpixel((x, y), INK)
                    elif (x - cx) < -3 and (y - cy) < -3:
                        img.putpixel((x, y), c_bush_l)   # Nắng trên-trái
                    elif (x - cx) < 2 and (y - cy) < 2:
                        img.putpixel((x, y), c_bush_m)   # Thân cây chính
                    elif (x - cx) >= 2 or (y - cy) >= 2:
                        img.putpixel((x, y), c_bush_s if (x - cx) + (y - cy) < 14 else c_bush_d)
                    else:
                        img.putpixel((x, y), c_bush_mid)

        # Chậu / viền gạch bao quanh gốc cây (y=200..208, cx-10..cx+10)
        c_pot = NIGHT_ROOF_MAIN if is_night else (181, 101, 74, 255)
        c_pot_d = NIGHT_ROOF_DARK if is_night else (138, 86, 54, 255)
        for y in range(201, 207):
            for x in range(cx - 8, cx + 9):
                if y in (201, 206) or x in (cx - 8, cx + 8):
                    img.putpixel((x, y), INK)
                elif x < cx:
                    img.putpixel((x, y), c_pot)
                else:
                    img.putpixel((x, y), c_pot_d)

    # 5. TƯỜNG RÀO, CỘT CỔNG, MÁI CỔNG & NGƯỠNG CỔNG Ở ĐÁY (y = 178..224)
    # A. Tường rào hai bên:
    # Rào trái: x=16..87, y=217..223
    # Rào phải: x=168..239, y=217..223
    c_iron_l = NIGHT_IRON_LIGHT if is_night else IRON_LIGHT
    c_iron_d = NIGHT_IRON_DARK if is_night else IRON_DARK
    c_w_main = NIGHT_WALL_MAIN if is_night else WALL_MAIN
    c_w_trim = NIGHT_WALL_TRIM if is_night else WALL_TRIM

    for fence_range in [range(16, 88), range(168, 240)]:
        for x in fence_range:
            # Chân tường gạch rào (y=221..223)
            img.putpixel((x, 221), c_w_trim)
            img.putpixel((x, 222), c_w_main)
            img.putpixel((x, 223), INK)
            # Thanh sắt ngang rào (y=217, 220)
            img.putpixel((x, 217), c_iron_d)
            img.putpixel((x, 220), INK)
            # Nan sắt đứng cứ mỗi 4 px
            if (x - 16) % 4 == 0:
                for y in range(214, 221):
                    img.putpixel((x, y), INK)
                img.putpixel((x + 1, 215), c_iron_l)
                img.putpixel((x + 1, 216), c_iron_l)
                img.putpixel((x + 1, 218), c_iron_l)
                img.putpixel((x + 1, 219), c_iron_l)

    # B. HAI CỘT CỔNG TRƯỜNG (Cột trái x=88..95, Cột phải x=160..167, y=186..223):
    # Mỗi cột rộng 8 px, xây gạch vàng kem vững chãi, đế đá và mũ đá
    for col_x in (88, 160):
        # Mũ cột đá (y=186..188, x=col_x-1..col_x+8)
        for x in range(col_x - 1, col_x + 9):
            img.putpixel((x, 186), INK)
            img.putpixel((x, 187), c_step)
            img.putpixel((x, 188), INK)
        img.putpixel((col_x - 1, 187), INK)
        img.putpixel((col_x + 8, 187), INK)

        # Thân cột (y=189..220, x=col_x..col_x+7)
        for y in range(189, 221):
            img.putpixel((col_x, y), INK)
            img.putpixel((col_x + 7, y), INK)
            for x in range(col_x + 1, col_x + 7):
                if x in (col_x + 1, col_x + 2):
                    img.putpixel((x, y), c_w_trim if y in (190, 205, 220) else (WALL_LIGHT if not is_night else NIGHT_WALL_LIGHT))
                else:
                    img.putpixel((x, y), c_w_trim if y in (190, 205, 220) else c_w_main)

        # Đế chân cột đá (y=221..223, x=col_x-1..col_x+8)
        for x in range(col_x - 1, col_x + 9):
            img.putpixel((x, 221), c_step)
            img.putpixel((x, 222), c_step_dark)
            img.putpixel((x, 223), INK)
        img.putpixel((col_x - 1, 221), INK)
        img.putpixel((col_x - 1, 222), INK)
        img.putpixel((col_x + 8, 221), INK)
        img.putpixel((col_x + 8, 222), INK)

        # ĐÈN CỘT CỔNG TRÊN ĐẦU MỖI CỘT (x=col_x+2..col_x+5, y=178..185)
        # Chân đèn
        for x in range(col_x + 2, col_x + 6):
            img.putpixel((x, 185), INK)
            img.putpixel((x, 184), c_iron_d)
        # Quả cầu đèn (x=col_x+1..col_x+6, y=179..183)
        for y in range(179, 184):
            for x in range(col_x + 1, col_x + 7):
                if y in (179, 183) or x in (col_x + 1, col_x + 6):
                    img.putpixel((x, y), INK)
                else:
                    if is_night:
                        # Bản đêm: ĐÈN CỘT CỔNG SÁNG RỰC #fff2b8 và #f3d889
                        img.putpixel((x, y), NIGHT_GLOW_CORE if (y in (180, 181) and x in (col_x + 3, col_x + 4)) else NIGHT_GLOW_MAIN)
                    else:
                        img.putpixel((x, y), GLASS_WHITE if (y == 180 and x == col_x + 3) else GLASS_LIGHT)

    # C. MÁI CỔNG NHỎ MÀU ĐỎ (x=84..171, y=178..191):
    # Bắc ngang qua hai cột cổng và mở ra khoảng thông giữa 64 px
    c_r_main = NIGHT_ROOF_MAIN if is_night else ROOF_MAIN
    c_r_light = NIGHT_ROOF_LIGHT if is_night else ROOF_LIGHT
    c_r_dark = NIGHT_ROOF_DARK if is_night else ROOF_DARK
    c_r_ridge = NIGHT_ROOF_RIDGE if is_night else ROOF_RIDGE

    # Đỉnh mái bờ nóc (y=178..180, x=86..169)
    for x in range(86, 170):
        img.putpixel((x, 178), INK)
        img.putpixel((x, 179), c_r_light if x % 4 in (1, 2) else c_r_ridge)
        img.putpixel((x, 180), INK)
    img.putpixel((85, 179), INK)
    img.putpixel((170, 179), INK)

    # Thân dốc ngói đỏ (y=181..187, x=84..171)
    for y in range(181, 188):
        # Mở rộng dần dốc mái ra hai bên
        w_offset = (y - 181)
        x_start = max(84, 86 - w_offset)
        x_end = min(171, 169 + w_offset)
        img.putpixel((x_start, y), INK)
        img.putpixel((x_end, y), INK)
        for x in range(x_start + 1, x_end):
            # Vân ngói đỏ
            if y == 181 or x % 4 == 0:
                img.putpixel((x, y), c_r_dark)
            elif (x + y) % 3 == 0:
                img.putpixel((x, y), c_r_light)
            else:
                img.putpixel((x, y), c_r_main)

    # Mép mái hiên cổng (y=188..189, x=84..171)
    for x in range(84, 172):
        img.putpixel((x, 188), c_r_light)
        img.putpixel((x, 189), INK)
    img.putpixel((83, 188), INK)
    img.putpixel((172, 188), INK)

    # Xà ngang gỗ cổng trường dưới mái (y=190..194, x=96..159)
    # Bắc ngang giữa hai cột cổng, dưới là khoảng không cổng mở hoàn toàn
    for y in range(190, 195):
        img.putpixel((96, y), INK)
        img.putpixel((159, y), INK)
        for x in range(97, 159):
            if y in (190, 194):
                img.putpixel((x, y), INK)
            elif y == 191:
                img.putpixel((x, y), c_wood_light)
            elif 118 <= x <= 137:
                # Bảng tên cổng trường ở giữa xà ngang
                img.putpixel((x, y), NIGHT_GLOW_MAIN if is_night else GOLD)
            else:
                img.putpixel((x, y), c_wood)

    # D. KHOẢNG KHÔNG CỔNG TRƯỜNG MỞ RỘNG 2 Ô LIỀN NHAU (64 px, x=96..159):
    # Từ y=195 đến y=219: Lối đi trung tâm mở toang, người chơi nhìn xuyên vào sân trường!
    # (Đã lát đá sáng ở bước 3, không bị chặn bởi bất kỳ thanh chắn nào)

    # E. NGƯỠNG CỔNG SÁNG VÀ RÕ (x=96..159, y=220..224):
    # Nằm ngay trên dải vỉa hè 32 px ở đáy, phẳng phiu, sáng rực rỡ chào đón người chơi
    for y in range(220, 225):
        # Mép viền hai bên ngưỡng cổng
        img.putpixel((96, y), INK)
        img.putpixel((159, y), INK)
        for x in range(97, 159):
            if y == 220:
                img.putpixel((x, y), INK) # Ranh giới mặt sân và ngưỡng
            elif y in (221, 222):
                if is_night:
                    # Bản đêm: ánh đèn từ cột cổng hắt xuống ngưỡng cửa sáng rõ
                    img.putpixel((x, y), NIGHT_GLOW_CORE if (98 <= x <= 104 or 151 <= x <= 157) else NIGHT_STONE_LIGHT)
                else:
                    img.putpixel((x, y), STONE_LIGHT if (x % 8 != 0) else STONE_MAIN)
            elif y == 223:
                img.putpixel((x, y), NIGHT_STONE_DARK if is_night else STONE_DARK) # Gờ thềm
            elif y == 224:
                img.putpixel((x, y), INK) # Mép tiếp giáp vỉa hè

    # 6. DẢI VỈA HÈ 32 PX Ở ĐÁY (y = 224..255):
    # Giữ đúng các ô vỉa hè của game từ file gốc, NHƯNG tại x=96..159 không có hàng rào chắn
    for y in range(225, 256):
        for x in range(256):
            img.putpixel((x, y), orig.getpixel((x, y)))

    # Lưu file
    out_fn = 'civic_primary_school_night.png' if is_night else 'civic_primary_school.png'
    out_path = os.path.join(SRC, out_fn)
    img.save(out_path)
    colors = len(set(img.getdata()))
    return out_fn, img.size, colors


def main():
    print("=== BẮT ĐẦU CẬP NHẬT SPRITE CIVIC ===")
    results = []

    # 1. Cập nhật NPC 7 người cao tuổi nghiêng ngang (12 files)
    npc_res = update_npc7()
    results.extend(npc_res)

    # 2. Cập nhật Trường tiểu học (ngày + đêm, 2 files)
    school_day_res = draw_school(is_night=False)
    results.append(school_day_res)

    school_night_res = draw_school(is_night=True)
    results.append(school_night_res)

    print("\n=== KẾT QUẢ ĐÃ GHI FILE VÀO C:\\Users\\Admin\\Downloads\\civic-art\\ ===")
    failed = []
    for fn, size, colors in results:
        status = "ĐẠT"
        if colors > 40:
            status = "CHƯA ĐẠT (> 40 màu)"
            failed.append(fn)
        if size not in [(32, 48), (256, 256)]:
            status = "CHƯA ĐẠT (sai kích thước)"
            failed.append(fn)
        print(f"  * {fn:32s}: {size[0]}x{size[1]}, {colors:2d} màu -> {status}")

    if not failed:
        print("\n=> TẤT CẢ 14 SPRITE ĐỀU ĐẠT CHUẨN!")
    else:
        print(f"\n=> Có {len(failed)} sprite chưa đạt: {failed}")

if __name__ == '__main__':
    main()
