# Quy tắc cho mọi phiên làm game

## Thêm món ăn / công thức (src/data/recipes.ts)
Món phải là món **có thật ngoài đời**, đúng tên và cách chế biến:

1. **Tên món = tên người bán/người ăn thật sự gọi ngoài chợ.** Không tự ghép thêm chữ mô tả
   (sai: "Bánh căn đổ khuôn", "Bánh bò hấp" khi không có bản nướng; đúng: "Bánh căn", "Bánh bò").
   Chỉ thêm chữ phân biệt khi chính người Việt cũng phân biệt như vậy (vd. "Bánh bò nướng" ≠ "Bánh bò").
2. **Tên commit/log phải trùng đúng tên món trong game**: `GĐxxxx: <name trong recipes.ts>`.
3. **Trạm nấu theo cách nấu thật**, không chọn đại trạm còn trống:
   - `fryer` = chiên/rán/xào nhiều dầu · `food_grill` = nướng than, khuôn đất (bánh căn) · `steamer` = hấp
   - `hot_kettle` = luộc/nấu nước/kho · `rice_station` = cơm/xôi · `blender` = xay · `drink_counter` = pha.
   Nếu không trạm nào khớp → KHÔNG thêm món, ghi lại để làm trạm mới sau.
4. **Nguyên liệu chính phải đúng**; nguyên liệu nào game chưa có thì chỉ được thay bằng thứ gần nhất
   và ghi rõ trong comment (vd. "mỡ hành → hành phi nhà làm thay").
5. Comment trên công thức ghi: vùng miền + cách làm thật + thứ gì là thay thế.
6. Thêm món vào bảng `MON_THAT` trong `src/__tests__/monThat.test.ts` (tên chuẩn + trạm đúng).
   Test này chặn đổi sai tên/trạm và chặn chữ tự chế trong tên.
7. Không chắc tên/cách làm → bỏ qua món đó, chọn món khác chắc chắn hơn.
8. **Test của món = MỘT DÒNG trong bảng, KHÔNG tạo file test riêng cho món.** Thêm dòng vào
   `MON_KHUON` trong `src/__tests__/monKhuon.test.ts` (trạm + danh sách nguyên liệu); bảng tự kiểm
   đúng trạm, đúng nguyên liệu, nguyên liệu mở không trễ hơn món, mẻ lãi hơn bán thẳng nguyên liệu.
   Chỉ khi món cần khẳng định riêng (số tiền cụ thể, chuỗi cung ứng đặc biệt) mới viết thêm vào
   `src/__tests__/monRieng.test.ts` (tạo file này khi cần, gom chung, không mỗi món một file).

## Nội dung mới và test golden (kỷ nguyên nội dung — `src/data/contentEpoch.ts`)
Quy ước cũ "nội dung mới phải mở sau cấp 30 để không lệch golden" **đã bỏ đối với NỘI DUNG**:

- Món / công thức MỚI ghi thêm `since: 1` (ở dòng `RECIPES` **và** dòng `COOKED_PRODUCTS`/sản phẩm
  của nó). Khi đó được mở ở **bất kỳ cấp nào**, kể cả cấp 1–30: `simGolden` chạy ở kỷ nguyên 0
  nên không nhìn thấy dòng có `since`. Chọn cấp mở theo nhịp chơi, đừng dồn vào cấp 31–40.
- Không ghi `since` thì vẫn phải mở sau cấp 30 như trước (nếu không golden sẽ đỏ).
- Bảng nội dung khác (cây trồng, đơn tiệc, khách quen…) muốn dùng thì thêm trường `since?: number`
  và bọc mảng bằng `epochGate(...)` như `PRODUCTS`/`RECIPES`.
- **CƠ CHẾ mới** (code chạy ở cấp ≤ 30) thì kỷ nguyên KHÔNG che được: vẫn phải cổng theo cấp > 30,
  hoặc là thay đổi kinh tế có chủ ý.
- Đổi kinh tế có chủ ý → `npm run golden:update -- "<lý do>"`. Lệnh ghi mốc mới vào
  `src/__tests__/golden.json` và một mục vào `docs/GOLDEN-LOG.md`; commit cả hai. Không sửa tay số mốc.
- `simBands.test.ts` (cấp 10/30/50/65/100, nội dung đầy đủ, ±15%) là lưới bù cho nội dung mới:
  đỏ nghĩa là nội dung vừa thêm làm lệch kinh tế cả dải, xem lại giá/biên trước khi chép mốc.

## Nhắc việc cho người chơi (Sổ việc chung — `src/data/todo.ts`)
Hệ mới muốn nhắc người chơi một việc (chip trên HUD, chip giờ vắng, dòng trong Sổ đầu ngày):

- Gọi `registerTodo('<tên hệ>', (s, minutes) => TodoItem[])` **trong file data của chính hệ đó**
  (mẫu: cuối `src/data/preserve.ts`, `src/data/lifeEvent.ts`).
- **KHÔNG sửa** `src/ui/panels/MorningPanel.tsx`, `src/data/todayAgenda.ts`, `src/ui/HudAgenda.tsx`,
  `src/ui/panels/morningActions.ts` để thêm việc/thẻ cho hệ của mình. Đây là các file nhiều phiên đụng nhau.
- `at`/`until` (phút trong ngày) → lên dải "Kế hoạch hôm nay"; `urgency: 'idle'` → chip giờ vắng;
  `morning: true` → vào thẻ "Việc hôm nay" của Sổ đầu ngày. Không thêm thẻ Sổ đầu ngày mới;
  cần giao diện giàu hơn một dòng thì đặt trong bảng riêng của hệ và để việc trỏ `go: { panel }` tới đó.
- Test nguồn việc của hệ nằm trong file test của hệ; `todo.test.ts` kiểm khung chung.

## Git
Nhiều phiên dùng chung worktree: chỉ `git add` đúng đường dẫn file của mình.
