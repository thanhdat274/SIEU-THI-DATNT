# Khách thay món khi hết hàng (shelf-substitution)

## Why

Review người chơi khó tính (đợt 08/11/2026, góp ý R2) đo được: ngày 1 với vốn 360k và chơi tối ưu, vẫn **lỡ 17/94 lượt mua vì "hết hàng"** — và đo 5 mức vốn 360→480k cho thấy **tăng vốn không phải đòn bẩy** (phi tuyến: 16/17/12/9/25). Nguyên nhân thật: khách muốn món A, kệ hết A thì bỏ về, dù kệ đó vẫn còn món B cùng loại.

Mọi game bán hàng cùng thể loại đều có thay-món (Hay Day: khách nhận món thay thế; Stardew Valley: đơn tuần vẫn hoàn thành khi thiếu một món) vì nó giữ đúng bài học "châm kệ" mà không phạt người chơi bằng khách bỏ về oan. Việt hoá thành hành vi rất đời: **"hết mì thì lấy gói khác trên kệ"** — khách không bỏ về vì một món thiếu.

Mục tiêu định lượng: đưa lỡ-bán ngày 1 (chỉ tiêu `missed.stock` của guard `reviewR2Day1.test.ts`) từ mốc 17 xuống ≤ ~8, mà không tăng vốn, không đổi cầu.

## What Changes

- Khi khách muốn món X mà kệ (kệ khách đang đứng) hết X: khách **nhìn trên chính kệ đó** — nếu còn món khác **giá không cao hơn món muốn** thì với xác suất cố định (hằng số tune trong `src/data/`, mặc định ~60%) lấy món đó thay; không có ứng viên hoặc không qua cổng xác suất thì bỏ món như hiện tại.
- Ứng viên thay thế chọn **tất định** (simRng, không Math.random): ưu tiên cùng phân loại → món hot/dịp lễ → món đầu tiên còn hàng trên kệ.
- Đếm phản hồi: `stats.substituted` (trường lưu tuỳ chọn, không đổi SAVE_VERSION); Sổ tổng kết "Vì sao khách không mua · nên làm gì" thêm 1 dòng "🔄 Đã cứu X lượt nhờ khách nhận món thay — vẫn nên châm kệ đủ".
- Không đổi: giá bán (món thay tính theo giá kệ của chính nó), quy tắc bỏ cả giỏ của giỏ lớn, `noteMiss` cho trường hợp không thay được, mọi công thức kinh tế khác.

## Capabilities

### New Capabilities
- `shelf-substitution`: khách nhận món thay thế trên cùng kệ khi món muốn hết hàng — ứng viên, cổng xác suất, tính tất định và đồng bộ 2 chế độ.

### Modified Capabilities
<!-- none: không sửa spec có sẵn -->

## Impact

- `src/agents/customers.ts`: nhánh `takeFromShelf(want) === null` gọi helper thay món.
- `src/data/` (file hằng số phù hợp, vd `pricing.ts` hoặc file mới nhỏ): helper thuần `chooseSubstitute(...)` + hằng số `SUBSTITUTE_CHANCE`.
- `src/core/gameTypes.ts` / `store.ts`: trường tuỳ chọn `stats.substituted` (merge an toàn, không bump SAVE_VERSION).
- `src/ui/panels/ReportPanels.tsx`: 1 dòng phản hồi trong thẻ "Vì sao khách không mua".
- Test: unit helper; test customer thay món; re-đo + khoá lại guard `reviewR2Day1.test.ts`; economySim (L1 ngày 1, L5 30 ngày, golden L50) phải xanh với số liệu mới.

## Non-goals

- Không làm khách đi sang kệ khác tìm món (chỉ kệ đang đứng — giữ thao tác và mô phỏng nhẹ).
- Không đổi giá/bán kèm giảm giá cho món thay thế.
- Không đổi cầu ngày đầu hay danh sách "hàng hút" — đó là bài toán cầu-mix khác.
- Không thêm nút HUD hay tuỳ chọn bật/tắt cho người chơi.

## Cách chạy ở hẻm online

- Toàn bộ logic nằm trong agent khách, chỉ chạy trên **máy chủ đò** (nguồn chân lý) như mọi mô phỏng hiện tại; máy khách nhận kết quả qua đồng bộ sẵn có.
- Không có thao tác mới của người chơi → không có GUARDED/LOCAL_ONLY mới cho coopGuard.
- Không dựa vị trí người chơi; kết quả tất định theo simRng của máy chạy → chơi đơn và hẻm ra kết quả giống nhau (Luật 4).

## Ngân sách chống phình

- Nút HUD: +0. Thông báo: +0 (bong bóng thoại khách "🔄 Lấy món này thay" là bubble sẵn có, không phải ô thông báo).
- Bundle: +~1–2 KB code thuần, không tài sản mới.
- Thời gian test: không thêm test mô phỏng nặng mới — guard `reviewR2Day1` đã có (1 ngày ~1 s); chỉ cập nhật trần.
- Chỉ số thông báo ngày đầu: không đổi (không có thông báo mới).

## Tham khảo

- Hay Day: khách chấp nhận món thay thế thay vì bỏ về — giữ nhịp bán liền mạch. Lấy ý tưởng "giảm khách bỏ về oan", điều chỉnh: chỉ thay trên cùng kệ, giá không cao hơn, có cổng xác suất để vẫn giữ bài học châm kệ của game mình.
