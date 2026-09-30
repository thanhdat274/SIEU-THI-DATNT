# Ca kiểm thử thuế

Đã tự động hóa: khóa UNVERIFIED; chọn trước/tại/sau ngày hiệu lực; lọc loại hình; cấm ghi đè phiên bản; bản sao không sửa lịch sử; khôi phục snapshot qua JSON; từ chối thiếu phiên bản, ngày không có thực, tiền lẻ, nguồn VERIFIED không hợp lệ. Chạy trong yarn test cùng regression game hiện có.

Chưa thực hiện (engine và tích hợp chưa có): doanh thu 999.999.999 / 1.000.000.000 / 1.000.000.001; tổng nhiều ngành và địa điểm; PIT doanh thu/thu nhập; miễn thuế đúng/sai/thiếu điều kiện; CIT tại 3 và 50 tỷ, năm tham chiếu dưới 12 tháng, liên kết; hóa đơn tại ngưỡng sau NĐ 254; lịch khai/nộp; sổ cái và thu tiền trùng; chuyển hộ thành công ty giữa kỳ; thuế lịch sử; migration save v1/v2 và snapshot thuế mới. Không dùng test giả lập registry để tuyên bố công thức pháp lý đã đúng.

## Kết quả chạy 30/09/2026
- yarn typecheck: đạt.
- yarn test: đạt registry mới và 10 nhóm regression hiện có (bao gồm bán hàng và lưu/tải).
- yarn build: đạt server + web; cảnh báo chunk chính 627,50 kB còn tồn tại.
- git diff --check: đạt; có cảnh báo chuẩn hóa LF/CRLF.
- Chưa có test tích hợp engine thuế với game vì engine/UI/save thuế chưa triển khai. Không tuyên bố kiểm thử pháp lý hoặc migration thuế đã hoàn tất.
