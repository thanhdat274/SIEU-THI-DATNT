# Kiến trúc hệ thống thuế

Đã triển khai TaxRuleRegistry độc lập renderer tại packages/game-core/src/tax. register sao chép sâu; cấm ghi đè phiên bản. snapshot trả bản sao JSON được; resolve yêu cầu phiên bản cụ thể, ngày hợp lệ, loại hình và hoạt động; chỉ trả VERIFIED. Khoảng hiệu lực [effectiveFrom, effectiveTo); phải chuẩn hóa từ cách diễn đạt trong văn bản pháp luật. resolve chỉ chọn ứng viên, chưa đánh giá conditions và không phải engine tính tiền.

TAX_RESEARCH_2026 gồm hai ứng viên ngưỡng UNVERIFIED. Không có quy tắc production đang hoạt động. Test VERIFIED là dữ liệu giả lập, không được xuất sang dữ liệu pháp lý.

Tích hợp tương lai: save lưu taxRuleVersion và năm pháp lý riêng, giữ tương thích v1/v2; chưa sửa save hiện hành. MongoDB lưu nguồn/quy tắc chung và dữ liệu từng người riêng. Cần collections business_entities, business_registrations, tax_rules, legal_sources, legal_rule_versions, tax_periods, tax_calculations, tax_declarations, tax_payments, financial_records, invoices. Backend xác thực chủ sở hữu dữ liệu; không đặt API key tại frontend. AI chỉ giải thích kết quả engine và nguồn đã truy xuất; mất dịch vụ dùng kho kiến thức, không tạo kết luận mới.
