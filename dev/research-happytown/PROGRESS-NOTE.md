# Trạng thái nghiên cứu HappyTown (myhappy.town) — 07/11/2026

## Tài khoản nghiên cứu
- Tên hiển thị: **Nghien Cuu Tap Hoa** · Username: `NghienCuuTapHoa26` · Mật khẩu: `TapHoa2026!`
- Nông trại: "Tạp Hóa Đầu Ngõ" · Hero: Cư dân (+5% giá bán) · Mã HAPPYTOWN25 đã nhập (+50.000 xu, +5💎)
- Tab trình duyệt IAB còn mở: `iab-tab:99e75c6c-d7db-48b5-a969-fe118d108692` — game đang ở màn ca phục vụ Bếp Quán Ăn.

## Đã làm
1. ✅ Đọc 15 bài cẩm nang (text trong thư mục này: *.txt)
2. ✅ Vào game, qua tutorial, mở Cửa hàng (8 tab), Nội thất (415 món UI / 5.398 entry data), Xóm Nghề, chơi 1 ca mini-game Bếp Quán Ăn (90s, 8⚡, chọn đơn → chạm nguyên liệu → Phục vụ; sai mất 2s; 3★ tặng món thật)
3. ✅ Trích xuất data gốc từ globalThis của game → thư mục `data/`:
   - `craft.json` — CRAFT: 66+ công thức 5 trạm (kitchen/bakery/drinks/forge/jewel) + 12 món brew (Lò Ủ, lv100+, bán 73.400→457.300 xu) + 5 dụng cụ (TOOLS) + SLOT_MAX 8 + slotCost
   - `data-core.json` — ECON, 58 CROPS (gồm Giống Vàng lv60→500 và Giống Kim Cương 100k+ xu), 26 ANIMALS, 256 PRODUCTS (71 craft), 68 BUILDINGS (gồm lux_* landmark tới 800tr), BARN 12 cấp, 16 ZONES, LEVEL_UNLOCKS (Giống Vàng cần giấy phép), CHAPTERS 7, P3V/P4B chứng chỉ
   - `furniture.json` — 5.398 FURNITURE (14 cat: living 1443, kitchen 1220, bed 607, garden 575, fun 518, bar 138, wall 168, bath 131, office 131, store 227, bakery 49, tools 94, holiday 63, reward 34) + FURNISH catalog 95 + ROOMS + WALLS (6 loại vách 700–1.400 xu) + VARS màu (156 vbase × biến thể, 15 màu vải × 8 màu gỗ)
   - `extras.json` — MARKET_PLACES (village/city/metro rate + đơn thu mua ×1.8/×2), STAFF_DEFS (25 phụ việc có sở trường), PET_DEFS 30, TOPUP_PACKS (9K→? VND), BUFFS_KINDS (xp/energyCost/cropSpeed/fishLuck/sell, cap 1.3–1.6), VENUES_ITEMS (đồ ăn quán trả buff), STATION_CFG, FISH/RODS/BAITS, EGGS, CONTENT2
   - `gamestate.json` — save tài khoản nghiên cứu (để đối chiếu con số)

## Số liệu sống đã đo (live)
- Giá bán món tại trạm = PRODUCTS.sell (vd Trứng ốp la 480); khách ngồi trong quán trả ~1,9× + boa (chú Hạnh trả 912 xu)
- Chỗ nấu: 2 miễn phí → chỗ 3 = 1.200 xu → … SLOT_MAX 8
- Shop hiện banner "giá vàng +50%" theo ngày 0:00 + đơn thu mua ×1.8–×2 (Chợ làng/FarmMart/Metro Mart)
- Kho ban đầu 150; lên cấp hồi đầy năng lượng; XP cấp 2 = 80

## Việc còn lại (lần sau)
1. Lên cấp 4 → map vào **Thành phố**: Siêu thị FarmMart (kệ hàng, giỏ, thanh toán, deal -30%), Quán Ăn Việt/sushi/ramen/pizza/burger/cà phê (đồ ăn + buff), Văn phòng, Ngân hàng
2. Mở **Nhà (H)**: mua nội thất, Thử trước mua, chia phòng, vách ngăn, nhiều tầng — quan sát UX đặt đồ
3. Tab **Trang trí** cửa hàng nông trại + YARD (catalog sân vườn) — bấm từng tab chụp UI
4. Chợ làng (cấp 2): bán hàng, Bảng tin, sạp; Khu Phát Triển (cấp 5, ESTATE 100 căn BĐS!) — điểm rất giống siêu thị của mình
5. Viết 3 file: PHAN-TICH-THAM-KHAO-HAPPYTOWN-2026-11-07.md, PHU-LUC-DU-LIEU-HAPPYTOWN.md, TONG-HOP-AP-DUNG-HAPPYTOWN.md
   (tổng hợp từ data/*.json + số liệu chơi thật; KHÔNG chép tên/asset)
