# Design: Chuỗi chi nhánh

## Hiện trạng đã kiểm tra

- `GameSimulation` (`packages/game-core/src/simulation.ts`, ≈3.800 dòng) là một cơ sở: một `playerData.money` (34 chỗ dùng trong `game-core`), một kho + `warehouse` (≈45 chỗ), một sổ cái qua `recordLedger` (≈20 chỗ), `staff`, `fixtures`, `dailyRecords`, `stalls`, `regulars`. Không có khái niệm nhiều cơ sở.
- `SaveGameData` là một cơ sở; `CURRENT_SAVE_SCHEMA_VERSION = 4`. Local lưu theo ô (`db.ts`, `SAVE_SLOT_IDS`); server `cloud_saves` và `worlds` giới hạn thân JSON 2 MB, file nhập tối đa 5 MB.
- Online: `GameWorld.businessIds` và `BusinessState { id, ownerAccountIds, save }` đã cho phép nhiều business, nhưng code chỉ dùng `businesses[0]`; mọi lệnh co-op đi qua `world-runtime.ts` + danh sách replay ở `apps/server/src/bootstrap.ts`.
- Tiệm xôi (`game-data/buildings.ts`) là tòa nhà trên bản đồ hub, quyền sở hữu qua `building-xoi` trong `storeLayout.unlockedPlotIds`; kho, ví, sổ cái dùng chung với hub.
- Quầy vỉa hè tính theo lô ngày (`stalls.ts` `planStallDay`, xác định theo ngày + uy tín + tồn kho) là tiền lệ cho mô hình chạy nền.
- Thuế khoán 1% tính ở `closeDailyRecord` (`tax/annual-revenue.ts` `taxDueOnClose`), theo doanh thu năm của **một** save.
- Hệ trạm đồ uống đã `functional` (03/10/2026): `drink_counter`, `blender`, `sugarcane_press` + 3 công thức, nhưng `drink_table_2` chưa; catalog đồ uống tự làm mới có 3 món.
- Game gốc: `branches.json` (bố cục nhỏ theo chi nhánh), `internalSupply.ts` (luân chuyển hàng nội bộ) chỉ để tham chiếu số liệu.

## Quyết định thiết kế

### D1. Mỗi chi nhánh là một save và một `GameSimulation`, chỉ một cái hoạt động

Lý do: chạm vào mọi chỗ giả định "một kho/một sổ cái" trong simulation là rủi ro lớn nhất và khó test. Dùng nguyên `GameSimulation` cho từng chi nhánh tái dùng toàn bộ bán hàng, khách, nhân viên, bố cục, lưu/nạp, test đã có. Đánh đổi: phải đồng bộ ví/kho/sổ cái giữa các save (D2–D4) và chạy nền cho các chi nhánh còn lại (D5).

Tại một thời điểm chỉ một `GameSimulation` chạy `update` (chi nhánh đang điều khiển). Chuyển chi nhánh = lưu trạng thái chi nhánh cũ, dựng simulation từ save chi nhánh mới (có màn tải ngắn, không chuyển màn kiểu game gốc ở tiệm xôi; người chơi chọn từ HUD/bản đồ chuỗi).

### D2. Hub làm ví chung và kho tổng; chi nhánh là trường tùy chọn của save hub

`SaveGameData.chain?: ChainState` (tùy chọn, không nâng schema bắt buộc; thiếu = chuỗi một cơ sở):

```
ChainState {
  branches: BranchSave[]            // không gồm hub
  activeBranchId: string            // 'hub' hoặc id chi nhánh
  nextBranchSeq: number
}
BranchSave {
  id: string; storeType: 'drink_shop' | ...; name: string; openedDay: number
  save: BranchSimSave               // fixtures, tileMap/plots, staff, dailyRecords, back stock, rng seed, closedDayIds
  lastBackgroundDay: number         // ngày cuối đã chạy nền
}
```

`player.money` của save hub **là** ví chung; kho/`warehouse` của hub **là** kho tổng; sổ cái hub là sổ cái chuỗi (thêm `branchId?` vào `LedgerEntry`, thiếu = hub). Nhờ vậy save hiện có là chuỗi hợp lệ và các hệ ở hub (nhà cung cấp, giao hàng, thuế, nhiệm vụ) không đổi.

Phương án đã loại: (a) tách save thành `ChainSave { wallet, warehouse, branches[] }` với hub cũng là chi nhánh (sạch hơn nhưng migration toàn bộ save, cloud, co-op và test); (b) nhân đôi kho/ví trong một simulation (xem D1). Chỉ xét lại (a) nếu kích thước save vượt ngân sách ở D8.

### D3. Ví chung: đồng bộ theo mốc, không đồng thời

Chi nhánh đang hoạt động đọc/ghi tiền như bình thường trên `playerData.money` của simulation của nó; ngay khi dựng, simulation nhận `money = ví chung`; khi chuyển chi nhánh, lưu bản lưu, hoặc commit lệnh, ví chung = tiền simulation. Vì chỉ một simulation chạy tại một thời điểm và chạy nền chỉ chạy lúc không có simulation chi nhánh đó hoạt động, không có ghi song song. Phần chênh lệch sinh ra bởi chạy nền ghi bằng dòng sổ cái có `branchId`, áp lên ví chung. Hệ quả cần test: tổng ví = tổng thay đổi sổ cái chuỗi; đổi chi nhánh nhanh liên tục không mất/nhân đôi tiền.

### D4. Kho tổng và lệnh chuyển kho

Hàng từ nhà cung cấp luôn vào **kho tổng** (hub). Chi nhánh không đặt hàng nhà cung cấp trực tiếp. Lệnh mới `transfer_stock { branchId, items: [{ productId, quantity }] }`: lấy khỏi kho tổng theo FEFO (tái dùng `takeLots`/`mergeLots` trong `stock.ts`), thêm vào kho/hậu cần của chi nhánh với **giữ nguyên lô, hạn dùng, `unitCost`**; từ chối toàn bộ nếu thiếu hàng hoặc vượt sức chứa chi nhánh (không chuyển một phần). Hàng trong chi nhánh bày lên kệ bằng các lệnh restock sẵn có. Chiều ngược (`return_stock` từ chi nhánh về kho tổng) là tùy chọn để không kẹt hàng; mặc định có, cùng quy tắc.
Chi phí vận chuyển và thời gian chuyển: **không** có ở bản đầu (chuyển tức thì, miễn phí); ghi là giả định để playtest.

### D5. Chạy nền theo lô ngày

Khi người chơi không điều khiển một chi nhánh, mỗi lần qua ngày hub chạy `runBranchDay(branch, day)` thuần, xác định theo `(seed chi nhánh, day)`, theo mô hình của `planStallDay`:

- Cầu theo loại hình, uy tín chi nhánh, ngày mùa, thời tiết (đã có hàm nhu cầu), số kệ đang bày và tồn kho từng món.
- Bán tối đa `min(cầu, tồn trên kệ, công suất thu ngân/nhân viên)`; doanh thu, giá vốn theo lô, hao hụt/hết hạn, lương nhân viên (chỉ khi còn tiền trong ví chung), bảo trì.
- Hết hàng thì dừng bán và ghi "bán hụt" để người chơi thấy cần chuyển kho; không tự đặt hàng, không tự chuyển kho (tự động hóa là ngoài phạm vi).
- Không có khách, không đi bộ, không gian lận/trộm; hệ số chạy nền ≤ hệ số khi người chơi điều hành (đề xuất ≈ 70%) để việc ghé qua điều hành có giá trị. Hệ số là **ước lượng, chưa playtest**.
- Idempotent: `lastBackgroundDay` và `closedDayIds` ngăn tính trùng khi nạp lại/server replay.
- Chi nhánh vừa điều khiển xong bắt đầu chạy nền từ ngày kế tiếp; khi quay lại, simulation dựng từ save và "bắt kịp" các ngày vắng đã được chạy nền trong `dailyRecords`.

### D6. Loại hình cửa hàng theo dữ liệu

`game-data/src/store-types.ts`: `StoreTypeDef { id; name; unlockLevel; openCost; maxBranches?; map template; defaultLayout; allowedFixtures; sellableCategories; demand profile }`. `drink_shop` đầu tiên: nền bản đồ nhỏ, bố cục mặc định (quầy thu ngân, `drink_counter`, `blender`, `sugarcane_press`, vài bàn), danh mục bán là đồ uống (sản phẩm `soft_drinks`/`bottled_water`/`milk` + 3 đồ uống tự làm). Thêm loại hình sau = thêm một mục dữ liệu, không đổi lõi. Cần bật `drink_table_2` (hoặc dùng `food_table_*` có sẵn) để quán có chỗ ngồi; đề xuất dùng bàn ăn sẵn có, không thêm cơ chế.

### D7. Thuế và danh tiếng

Chủ dự án chưa chốt ngưỡng thuế theo chuỗi hay từng cơ sở. **Mặc định đề xuất (cần xác nhận): tính trên tổng doanh thu chuỗi** (một hộ kinh doanh, một ví), nộp ở hub khi đóng ngày; chạy nền cộng doanh thu vào bản ghi ngày của hub (có `branchId`). Danh tiếng: mỗi chi nhánh có `reputation` riêng; danh tiếng hub dùng cho chương/quest hiện có; thống kê "khách phục vụ" tổng chuỗi = tổng các chi nhánh (chạy nền cộng số lượng bán ước tính, ghi rõ không phải khách thật).

### D8. Kích thước save và cloud/co-op

Mỗi `BranchSave` nên < 150 KB (bố cục nhỏ, không lưu ledger riêng, `dailyRecords` tối đa 30 ngày gần nhất + tổng tích lũy). Ngân sách: hub + 3 chi nhánh dưới 1,5 MB để còn dưới giới hạn 2 MB của server; giới hạn `maxBranches = 3` ở bản đầu. Chuyển/nhập/xuất file và cloud save dùng nguyên save hub (đã chứa chuỗi). Co-op: `BusinessState` hiện chỉ có một save hub; chuỗi nằm trong save đó nên không đổi `GameWorld`. Mọi lệnh mới (`open_branch`, `switch_branch`, `transfer_stock`, `return_stock`) phải vào `ALLOWED_COMMAND_TYPES` và `serverReplayedCommands`, `isGameCommand`, `world-runtime.ts` (bài học I-01: lệnh không được phát lại thì server tin save client). `switch_branch` là trạng thái theo từng người chơi chứ không theo thế giới (hai người chơi có thể ở hai chi nhánh): đề xuất lưu vị trí/nhánh đang xem trong avatar (`GameAvatar`), không trong `activeBranchId` dùng chung; ở bản đầu co-op **chỉ cho phép chi nhánh khi hẻm có một thành viên** (xem câu hỏi mở).

### D9. Giao diện

Thêm bộ chọn chi nhánh (HUD/`BottomBar`), màn tổng quan chuỗi (ví chung, kho tổng, trạng thái từng chi nhánh: doanh thu hôm qua, hàng sắp hết, bán hụt), hộp thoại chuyển kho (nhiều món, xem FEFO/hạn), hộp thoại mở chi nhánh. Chế độ "ghé qua" mở sẵn công cụ bố cục/mua đất của chi nhánh đó (tái dùng `StoreLayoutModal`, nhưng nhận save chi nhánh). Báo cáo ngày có bộ lọc theo chi nhánh.

## Kiểm kê chỗ gắn cứng cần xử lý (khảo sát thêm ở nhiệm vụ 1)

`playerData.money` (34), `warehouse` (45), `recordLedger` (20) trong `simulation.ts`; `STORE_BOUNDS`/`ENTRANCE_TILE` trong `customers.ts`, `store-layout.ts`, `viewport.ts`; `buildings.ts` (tiệm xôi là tòa của hub); `useOnlineSync`/`App.tsx` giả định một `simulationRef`; `goals`/`quests`/`story` đọc chỉ số từ một simulation (cần định nghĩa chỉ số chuỗi).

## Rủi ro

- **Kinh tế:** chi nhánh nền dễ làm game quá dễ; giảm nhẹ bằng hệ số nền, giới hạn số chi nhánh, chi phí mở/lương, cần playtest.
- **Ví/sổ cái lệch tiền** khi chuyển chi nhánh; giảm nhẹ bằng bất biến test (D3) và `save-invariants`.
- **Kích thước save** và thời gian dựng simulation khi chuyển; đo ở nhiệm vụ 1 và 7.
- **Co-op:** hai người ở hai chi nhánh phức tạp; hoãn bằng giới hạn ở D8.
- **Test hiện có đỏ/ngoài phạm vi** (xem `tổng hợp.md`): không coi PASS build là nghiệm thu.

## Câu hỏi mở (cần chủ dự án quyết trước khi apply)

1. Ngưỡng thuế 100 triệu tính **tổng chuỗi** (đề xuất) hay từng cơ sở?
2. Chi nhánh có chi phí vận chuyển/thời gian chuyển kho không (đề xuất: không ở bản đầu)?
3. Co-op: cho phép chi nhánh khi có 2 thành viên, và ai sở hữu chi nhánh (đề xuất: hoãn, chỉ một thành viên)?
4. Giá mở chi nhánh quán nước, cấp mở khóa, số chi nhánh tối đa (đề xuất tạm: cấp 32, 1.500.000 ₫, tối đa 3; **chưa cân bằng**).
5. Có cho đóng/bán chi nhánh không (đề xuất: ngoài phạm vi bản đầu)?
