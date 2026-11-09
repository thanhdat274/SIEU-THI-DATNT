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

## Git
Nhiều phiên dùng chung worktree: chỉ `git add` đúng đường dẫn file của mình.
