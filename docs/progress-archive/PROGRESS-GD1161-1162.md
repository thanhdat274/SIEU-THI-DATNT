# PROGRESS — archive GĐ1161–1162 (bảo trì dồn archive + audit 10-GĐ lần 5)

> Đây là chi tiết các giai đoạn đã rút khỏi PROGRESS.md (giữ file chính gọn <30KB). Tra nhanh bằng grep -n "GĐ11xx" docs/progress-archive/*.md khi cần.

- **GĐ1161 (bảo trì: dồn GĐ1159–1160 sang archive)**: PROGRESS.md 30,8 → 30,2 KB; tạo `docs/progress-archive/PROGRESS-GD1159-1160.md` (2 GĐ: bảo trì, audit 10-GĐ lần 5); bổ sung dòng mục lục GĐ1159 (tool archiveCheck có giới hạn: khoảng GĐ xuất hiện trong text entry khác cũng tính "có" — kiểm bằng grep thủ công cho chắc); dòng trỏ cập nhật "GĐ1074–1159". Verify: GĐ1159 đủ trong archive, 0 tham chiếu ma (archiveCheck). Không đổi mã/test — full suite & build bất đổi (445 file/3468 test xanh).
- **GĐ1162 (bảo trì: dồn GĐ1160–1161 sang archive)**: PROGRESS.md 30,2 → ~28 KB; gộp archive GĐ1159–1161 (audit 10-GĐ lần 5 + bảo trì); `archiveCheck.cjs` xác nhận 0 ma / 0 thiếu. Không đổi mã/test — full suite & build bất đổi (445 file/3468 test xanh). (Entry tái dựng ở GĐ1163 — bản gốc mất trong lần chạy script hụt; nội dung khớp commit f31ac3f3.)
