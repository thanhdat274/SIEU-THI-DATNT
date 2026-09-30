# Đặc tả tính thuế

Chưa có công thức pháp lý được kích hoạt trong đợt đầu. Ngưỡng tham khảo không đủ để tính số thuế. Kết quả thiếu căn cứ phải là chưa xác định, tuyệt đối không thay bằng 0 đồng.

Số tiền dùng số nguyên VND an toàn; tỷ lệ lưu tử/mẫu nguyên. Khi triển khai phép nhân phải dùng BigInt trung gian, xác minh quy tắc làm tròn theo sắc thuế và chỉ chuyển về number khi trong miền an toàn. Không dùng AI tính thuế.

Đầu vào tương lai: năm pháp lý, chủ thể, doanh thu từng hoạt động/địa điểm, kỳ tham chiếu, chi phí và chứng từ, phương pháp, tình trạng liên kết và điều kiện ưu đãi. Doanh thu khác lợi nhuận; lợi nhuận khác dòng tiền; thu nhập tính thuế khác lợi nhuận kế toán.

Mỗi kết quả cần snapshot phiên bản, ruleId, dữ liệu đầu vào và căn cứ điều/khoản. Chuyển kỳ hoặc đổi loại hình phải tách kỳ và xử lý theo quy định đã xác minh. Không tính lại lịch sử khi cập nhật registry.
