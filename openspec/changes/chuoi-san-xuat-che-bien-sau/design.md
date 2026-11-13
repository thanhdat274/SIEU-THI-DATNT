# Design

## Context
- Mọi GĐ thêm nội dung gần nhất (GĐ2369-2385) là data-only vào recipes.ts + 3 file test — chuỗi chế biến sâu đi đúng khuôn này, không đụng store/co-op/UI.
- Nông sản vườn dùng productId catalog (`x_chuoi` 10k/14k mở 22, `x_xoai` 12k/18k mở 22, `x_vai` 22k/32k mở 31, `x_mit` 16k/24k mở 27, khoai lang vườn dùng id `x_khoai_lang`).
- Hàng xóm đã có bản "sấy giòn" riêng (hx_chuoi_say 90...) — hàng `cb_*` của người chơi là bản dẻo/khô khác (vị + thời điểm mở khác, không đè): chuối sấy DẺO (Nam Định), xoài sấy DẺO Cao Lãnh... khác bản giòn của hàng xóm.

## Decisions
- **Chỉ 3 sản phẩm mới + 2 tái dùng hàng catalog có sẵn** (anti-bloat): mít sấy và khoai lang sấy đã là hàng `x_mit_say` (20) / `x_khoai_lang_say` (24) KHÔNG có công thức — thêm recipe output thẳng hàng đó (người chơi tự chế thay mua mối); chỉ chuối/xoài/vải cần hàng mới `cb_*` (bản DẺO khác bản giòn hx_* hàng xóm). Unlock rải 36→40 (tránh dồn mốc 36; band 31-40 283→293 < trần 320).
- **Trạm food_grill** cho cả 5 (sấy lửa nhỏ trên bếp than — comment ghi rõ realism; không thêm trạm).
- **Kinh tế**: mẻ 2 đơn vị nông sản → 5 gói đặc sản; bán gói phải > bán tươi thẳng 2 unit (luật monKhuon, test tự bắt).
- **since: CONTENT_EPOCH_NOW** cho cả product + recipe (kỷ nguyên 0 không thấy — chuẩn GĐ2369-85).
- Test: MON_KHUON +5 dòng (luật mẻ), MON_THAT +5 (tên/trạm/mô tả thật), unlockPacing band(31,40) 283→293.
- monThat mô tả cách chế biến nêu đúng địa phương đặc sản (chuối sấy dẻo Nam Định, xoài sấy dẻo Cao Lãnh, vải sấy Bắc Giang, mít sấy, khoai lang sấy).

## Open Questions
(none — phạm vi nhỏ, data-only, tiền lệ GĐ2369-85 đầy đủ)
