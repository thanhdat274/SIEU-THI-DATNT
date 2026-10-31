# PROGRESS ARCHIVE — GĐ154–158 (chi tiết đầy đủ)

> Dồn từ PROGRESS.md ngày 29/10/2026 theo quy tắc giữ file gọn (~30KB). Tra chi tiết bằng grep "GĐ1xx".
> Bối cảnh chung: trục "giá trị vs chi phí" — audit hộp đen tài chính 28/10 tìm ra 4 hộp đen lớn, đóng hết trong 4 giai đoạn này; sau đó GĐ159 đóng nốt 4 hộp mờ nhẹ (chi tiết GĐ159 còn ở PROGRESS.md).

### GĐ154 — 📉 Xu hướng cơ sở: lỗ không được biến mất — XONG

- Lỗi: bộ lọc `best !== null || last > 0` ẩn dòng "Chi nhánh 24/7 (lãi thô)" khi cửa sổ 14 ngày toàn lỗ — đúng lúc cần thấy xu hướng nhất thì lỗ biến mất khỏi tab Tuần.
- Fix: lọc theo "có hoạt động" (`some(d => metric !== 0)`) thay vì "có lãi"; chuỗi toàn âm vẫn hiện, `best` giữ null (đã có test riêng). File: `src/data/venueTrend.ts`, `src/__tests__/venueTrend.test.ts`.
- Kết quả: **1528/1528 test pass (142 files)** (thêm 1 test); build sạch. UI-only, không đổi save/kinh tế.

### GĐ155 — 🚪 "Chi nhánh 24/7 bỏ lỡ bao nhiêu tiền mỗi tối?" — XONG

- Lý do: audit hộp đen tài chính (sau GĐ154) xếp "khách bỏ về ở chi nhánh" là dữ liệu nghiệt còn sót lớn nhất — cơ sở doanh thu lớn nhất mà GĐ131 chưa soi tới.
- Triển khai: `VenueDay` thêm field tùy chọn `branchMissed?` (save cũ coi 0, không đổi SAVE_VERSION); `endDay` ghi `br.missedToday` vào nhật ký trước khi reset; helper thuần đọc `branchMissSummary` (tiền ước = missed × bán bình quân ngày đó, chia 0 sạch); BranchPanel tab Tình hình có card "🚪 Bỏ lỡ hôm qua & gần đây" (hôm qua / 14 ngày / tệ nhất + câu hành động). File: `src/data/venueTrend.ts`, `src/core/slices/endDay.ts`, `src/ui/BranchPanel.tsx`, `src/__tests__/branchMiss.test.ts` (8 test).
- Kinh tế/save không đổi (chỉ thêm field tùy chọn); Tester chạy round-trip save cũ qua test thiếu-field.

### GĐ156 — 🏗️ "Mở rộng thì tiền nhà tăng bao nhiêu?" — XONG

- Lý do: mở rộng là khoản tiền một-lần lớn nhất game nhưng tiền nhà tăng VĨNH VIỄN (`rentOf = 20k + tier²×30k`) không hiện ở điểm bấm — người chơi chỉ thấy "-Tiền nhà" sau khi đã nới (bậc cao: 30 ngày tiền nhà còn vượt thuê thợ).
- Triển khai: helper `rentDelta` + `spaceUsePct` (diện tích đồ đã đặt / sàn bậc) trong `src/data/shopTiers.ts`; ExpandTab hiện "Tiền nhà bây giờ Xđ/ngày", mỗi bậc phía trước hiện "lên Y (+Z — 30 ngày ~+N), chưa kể thuê thợ" + % mặt bằng đang dùng với verdict (trống/vừa đà/sắp chật), bậc kế tiếp kèm "≈ R% doanh thu bình quân 7 ngày". File + `src/ui/panels/BuildPanel.tsx`, `src/__tests__/shopTiersRent.test.ts` (11 test khóa rentOf 0–6).
- Thuần soi sáng, không đổi kinh tế.

### GĐ157 — 🐱 "Con này đáng bữa cơm không?" (thú cưng payoff) — XONG

- Lý do: mèo/chó là khoản tích lũy lớn (mua 300–500k + thức ăn hằng ngày) nhưng lợi ích chỉ là desc tĩnh — không ai biết nuôi có lời không.
- Triển khai: `src/data/petPayoff.ts` thuần đọc — mèo: đại số 0.25 (quan sát = không-mèo × 0.8 → cứu = quan sát × 0.25), chỉ cộng công vào ngày mèo ĐANG làm việc; verdict lời/vừa đủ ăn/lỗ cơm/theo tuần sạch. Chó: chỉ báo tuần từ sổ rủi ro chung, không verdict cứng (không tách riêng được). UI tab 🐾 hiện "Hôm qua cứu ~X · bữa cơm ~Y → lời/lỗ" + nhắc cho ăn khi đói + pitch nuôi khi hỏng tuần ≥ 100k.
- Leader sửa sau dev: chi phí thức ăn theo cơ chế thật `feedPet` — kho còn gói → giá thùng, hết kho → mua lẻ ×2 (mọi cấp); bỏ cổng "cấp 30" sai của audit. File: `src/data/petPayoff.ts`, `src/ui/BusinessPanel.tsx`, `src/__tests__/petPayoff.test.ts` (12 test).

### GĐ158 — 🛝 "Sân chơi: góp bao nhiêu, còn bao nhiêu, đáng không?" — XONG

- Lý do: sân chơi khu phố (GĐ40) — góp 28 lượt +6% khách tiệm chính, nhưng không ai biết đã góp hết bao nhiêu, còn thiếu bao nhiêu, +6% đáng ra bao nhiêu tiền.
- Triển khai: `src/data/landmarkPayoff.ts` thuần đọc (spentEst ước theo level hiện tại — level lúc góp không lưu; remainingCostEst mirror đúng luật charge thật: lượt 1–14 giá 8k, 15–21 giá 12k, 22–28 giá 16k, tier 3 không bao giờ bị thu); LandmarkPanel thêm card "Đã góp ~X lượt (ước ~Yđ) · còn Z lượt ≈ ~Wđ" + "khách đông thêm 6% ≈ +Gđ/ngày, hòa lại sau ~P ngày" (doanh thu quá nhỏ → đổi giọng "góp nhỏ, được cái đẹp hẻm"). File + `src/ui/panels/LandmarkPanel.tsx`, `src/__tests__/landmarkPayoff.test.ts` (18 test).
- Thuần soi sáng, không đổi kinh tế/save.

