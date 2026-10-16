# Spec Delta

## Purpose

Chốt hiện trạng năng lực "khách quen" (state-documentation cho change `regulars-complete`): thiện cảm theo khách, sổ nợ/mua chịu theo khách, thu hồi nợ và nợ xấu — vốn đã có sẵn và chạy thật. Mô tả các yêu cầu HÀNH VI hiện hữu để làm nền cho tài liệu/QA, không thay đổi logic đang chạy.

## ADDED Requirements

### Requirement: Regular customers tracked per customer
Mỗi khách quen có hồ sơ riêng (`RegularCustomerProgress`) gồm điểm thân thiết, món đã khám phá, perk đã mở, số lượt ghé và ngày ghé gần nhất; lưu theo khách trong save.

#### Scenario: Friendship grows on visit
- **WHEN** khách quen thanh toán có món ưa thích trong giỏ
- **THEN** điểm thân thiết tăng (≤ +2/ngày), món ưa thích mới được ghi vào đã khám phá

#### Scenario: Perks unlock by threshold
- **WHEN** điểm thân thiết đạt ngưỡng perk
- **THEN** perk đó được mở khóa và phát huy tác dụng (ghé thường xuyên hơn / boa thêm) và thông báo

#### Scenario: Saved per customer
- **WHEN** lưu/tải game
- **THEN** tiến độ từng khách quen được giữ nguyên (không đổi schemaVersion)

### Requirement: Credit (mua chịu/sổ nợ) per regular customer
Một khách quen có thể mua chịu khi đủ thân thiết; mỗi khoản mua chịu là một tài khoản phải thu (mở → quá hạn → đã trả hoặc nợ xấu), có hạn mức theo thân thiết và dừng khi từng nợ xấu.

#### Scenario: Eligible regular buys on credit
- **WHEN** khách quen đủ thân thiết và chưa vượt hạn mức
- **THEN** được mua chịu, ghi tài khoản phải thu kèm ngày đáo hạn

#### Scenario: Ineligible or over limit rejected
- **WHEN** khách thường (không phải khách quen), chưa đủ thân thiết, vượt hạn mức hoặc đã nợ xấu
- **THEN** không được mua chịu, trạng thái không đổi

#### Scenario: Overdue then default
- **WHEN** quá ngày đáo hạn chưa trả
- **THEN** chuyển quá hạn (toast), sau đó thành nợ xấu với khoản xóa nợ ghi vào sổ cái `bad_debt`

#### Scenario: Repay collects
- **WHEN** người chơi thu hồi một khoản phải thu đang mở/quá hạn
- **THEN** tiền vào quỹ, tài khoản đóng (đã trả), ghi sổ cái `credit_repayment`, toast thông báo

### Requirement: Verify evidence and docs
Change này cũng yêu cầu gom bằng chứng verify thật (chạy suite `regulars` + `wave-a` qua harness) và đồng bộ tài liệu.

#### Scenario: Existing suites pass
- **WHEN** chạy `regulars` và `wave-a` qua harness tsc→node
- **THEN** cả hai PASS và kết quả được ghi
