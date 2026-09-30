# Khảo sát game tham khảo — 30/09/2026

Nguồn: `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem`. Đích: `C:/Users/Admin/Desktop/SIEU-THI-DATNT`. Khảo sát đọc source/data/tests, chưa chạy UI hay test nguồn. Tìm thấy code và test không đồng nghĩa gameplay đã nghiệm thu. Không đọc `.env.local`, không thay đổi dự án nguồn.

## Kết luận chọn lọc

| Phần | Bằng chứng ở nguồn | Hiện trạng đích | Cách dùng / ưu tiên |
| --- | --- | --- | --- |
| Catalog | `src/data/products.json`, `src/core/data.ts`: 335 món; dry 62, snack 47, household 42, drink 72, fresh 68, frozen 23, counter 21 | 36 món, 10 nhóm cụ thể | Dùng danh sách/tên làm nguyên liệu nội dung; mapping thủ công từng món, không đưa đủ 335 ngay; P1 |
| Bày/châm/cất | `stock.ts`: assignSlot/refillSlot/clearSlot/autoArrange, lô giữ hạn; `autorestock.ts`: lockPlanogram/applyPlanogram | Một fixture một món; core đã có FEFO; toast châm hàng có sai số | Dùng sơ đồ theo fixture ID và lượng thực; không port ma trận shelf/slot hay thuật toán tự đổi khu phức tạp; P0/P1 |
| Mối nhập | `suppliers.json`, stock.ts checkCart/buyStock/receiveDeliveries/stowHolding | Một mối, mỗi lệnh một món, sáng hôm sau | Dùng nhiều mối, cart validation, giao đúng một lần và phần dư vào hàng chờ; P1 |
| Gợi ý nhập | stock.ts recentDailySales/suggestedTarget/suggestRestockCart; `tests/restockSuggest.test.ts` | Chưa có lịch sử sức bán theo ngày | Dùng ý tưởng bán 3/7 ngày và tồn/đơn chờ; không port phụ thuộc review/xôi chưa có; P2 |
| Tự nhập | autorestock.ts stockLevel/runRestockRules: threshold, qty, mối, ưu tiên, gom đơn tối thiểu | Nút châm kệ hiện tại không phải đặt mua tự động | Tách rõ châm từ kho và mua bằng tiền; tự nhập opt-in, ngân sách, thông báo lý do bỏ qua; P2 |
| Nhân viên | staff.json: 9 vai trò, 5 tính cách; staff.ts tuyển/lương/EXP/mood; schedule.ts hai ca | Chưa có | Đầu tiên cashier/refill, speed/stamina, ca/lương; accuracy/friendly/mood/EXP để đợt sau; P2 |
| Chống tranh việc | tasks.ts TaskQueue claim/claimKey/releaseAgent; day.ts nối worker/lane/queue vào session; `tests/phase3.test.ts` | Người chơi và NPC vẫn có thể bán cùng kệ thiếu giữ món | Tham khảo claim và bàn giao; phải bổ sung revalidate khi commit, không chỉ sao chép Map; P0/P2 |
| Khách/thu ngân | customers.ts, day.ts: shoppers, lanes, patience, giỏ/thanh toán; tests phase3/queueSecurity | Một NPC tự bán sau 2,5s; bán tay chưa cần khách | Giỏ lấy hàng tại kệ, queue và command thanh toán chung; P0, phụ thuộc nhân viên |
| Báo cáo | analytics.ts recordDay/avgSold/topSellers; day.ts summary | totalRevenue tích lũy; chưa có cost basis | Lấy cấu trúc lịch sử ngày; tự làm unitCost theo lô. ledger.ts nguồn là sổ nợ khách, không phải sổ giá vốn; P1 |
| Building/kho | layout.ts, furniture.json, land.json | Kho vật lý có sẵn; layout migration còn cố định | Tham khảo cho change building riêng, không buộc nhân viên MVP chờ mua đất |
| Nhiệm vụ/sự kiện | quests.ts/weeklyQuests.ts/calendar.ts/eventScheduler.ts và JSON | XP/unlock đã có | Phù hợp phát triển sau kinh tế; không dồn vào bản vận hành đầu |
| Âm thanh/backup/PWA | ui/sound.ts, ui/backupCode.ts, core/compress.ts, vite.config.ts | Chưa có audio/export/PWA | Tham khảo riêng, tránh thay pipeline hiện tại trong change này |
| Cloud/multiplayer | services/liveShop.ts/liveSession.ts/auth/cloudSave và functions | Change shared-alley-multiplayer đã có | Chỉ tham khảo command/reconnect; theo spec world/server của đích, không sao chép Firebase/config/service account |
| Thuế/quán xôi/chi nhánh/offline | tax.ts/stickyRice.ts/branches.ts/offline.ts | Chưa có nền phù hợp, thuế chỉ registry | Hoãn; không bê quy tắc pháp lý hoặc offline income vào world vốn pause khi tất cả offline |

## Dữ liệu chuyển đổi

`catalog-source.csv` là snapshot đủ 335 dòng gồm ID/tên/giá/cấp/hạn/kho của nguồn, phục vụ duyệt nội dung; không được import trực tiếp làm catalog production.

- `cost → purchasePrice`, `price → baseSellingPrice`, `shelfLifeDays → expirationRules.daysToSpoil`: chỉ là mapping trường; giá/cấp/hạn cần cân bằng theo nhịp ngày đích và không ghi đè món cũ.
- `dry` tách mì/gia vị; `snack` tách snacks/candy/bread; `drink` tách water/soft_drinks/milk. Không có ánh xạ một-một cho category.
- `size` là ô kho cho mỗi 10 món, không phải `shelfCapacity`. Capacity đích do sản phẩm và fixture quyết định; `requiresCold=freezer` chưa tương thích `ambient|cold`.
- `icon/color` chỉ gợi ý hình ảnh; tạo spriteId và fallback theo renderer đích. `behindCounter`, recipeOnly/eventOnly cần loại hoặc module riêng.
- Một số tên/ID nguồn có thể khác món hiện có (`mi_goi` và `mi_hao_hao`): cần bảng alias và so sánh nghĩa, không chỉ so sánh ID.
- 20 ứng viên đợt đầu ưu tiên gia dụng/gia vị/snack khô chưa có trong đích: nước rửa tay, nước lau kính, nước tẩy bồn cầu, màng bọc thực phẩm, khăn ướt, thức ăn chó/mèo, mayonnaise, cá mòi hộp, bột ca cao, bột cà ri, ngũ vị hương, sa tế, đậu đỏ, bánh pía, kẹo dừa, bánh mochi, hạt bí rang, đậu Hà Lan sấy, khoai tây que. Đây là shortlist cần đối chiếu trùng nghĩa, không khẳng định tất cả đều mới; thay ứng viên trùng bằng món tương thích từ snapshot để đủ 20.

## Không sao chép nguyên module

Nguồn dùng Phaser 3, state mutable toàn game, data singleton, ma trận kệ/slot và local/cloud persistence riêng. Đích là monorepo React/PixiJS với Simulation, fixture ID, Dexie revision. Chép stock.ts/day.ts/staff.ts nguyên file sẽ kéo theo nhiều module thuế, review, recipes, branches và balance chưa tồn tại. Cách chuyển: dữ liệu được duyệt → hàm/quy tắc nghiệp vụ nhỏ → command đích → test invariants → UI đích. Chuyển các test tình huống, không sao chép assertions gắn schema nguồn.

## Giới hạn khảo sát

Đã đọc các điểm vào stock/autorestock/staff/schedule/tasks/day/customers/analytics/save và test liên quan; không audit toàn bộ 335 món, renderer/asset nguồn, mọi nhánh day.ts hay dịch vụ online. Cần test ở đích để kiểm chứng sau port. Không dùng giá mẫu/lương/ca của nguồn làm tiêu chuẩn cân bằng hay kết luận pháp lý.
