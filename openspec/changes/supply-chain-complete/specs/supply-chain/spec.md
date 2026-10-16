# Spec Delta

## Purpose

Chốt hiện trạng năng lực "chuỗi cung ứng" (state-documentation cho change `supply-chain-complete`): nhiều nhà cung cấp, hàng hết hạn/shelf-life, nhập sỉ theo lô — vốn đã có sẵn và chạy thật. Mô tả các yêu cầu HÀNH VI hiện hữu, không thay đổi logic đang chạy.

## ADDED Requirements

### Requirement: Multiple suppliers
Có nhiều nhà cung cấp, mỗi nhà có danh mục/giá/cấp độ riêng; người chơi đặt hàng qua nhà cung cấp, đơn chờ được giao sau một số ngày.

#### Scenario: Order from supplier
- **WHEN** người chơi đặt hàng từ một nhà cung cấp (số dương, đủ tiền, vừa sức chứa kho)
- **THEN** trừ tiền, ghi sổ nhập, tạo đơn chờ đến ngày giao, và được nhận vào lô kho sáng hôm sau khi tới

#### Scenario: Legacy orders migrated
- **WHEN** đơn cũ thiếu `supplierId` được nạp
- **THEN** được tự migrate về nhà cung cấp mặc định `dai_ly_dau_hem` và giữ `delivered=false` cho đến khi giao

#### Scenario: Reject invalid order
- **WHEN** đặt số 0, vượt tiền đang có, hoặc vượt sức chứa kho (kho thường/kho mát/khu chờ)
- **THEN** đơn bị từ chối, trạng thái không đổi

### Requirement: Expiry / shelf-life
Hàng tồn theo lô có ngày hết hạn; quá hạn bị xử lý hư hỏng/hết hạn trên kệ, và có trần lô theo hạn dùng.

#### Scenario: Lots expire
- **WHEN** một lô hàng hết hạn
- **THEN** lô hết hạn được dọn/xử lý theo `SPOILAGE_RULES`; không bán hàng quá hạn

#### Scenario: Expiry dates set on delivery
- **WHEN** đơn giao được nhận
- **THEN** lô hàng có hạn dùng (`expiryDay`) theo sản phẩm, gộp lô cùng sản phẩm/kênh nhiệt

### Requirement: Bulk / lot ordering
Có giỏ hàng nhà cung cấp nhiều dòng, đặt theo lô/bulk (case size), và nhận hàng theo đơn nhiều món gộp khu chờ khi tràn kho mát.

#### Scenario: Multi-line supplier cart
- **WHEN** người chơi thêm nhiều mặt hàng vào giỏ nhà cung cấp
- **THEN** validate hợp lệ (cấp, tối thiểu, tiền, kho, tồn, dòng trùng) và đặt được nhiều dòng

#### Scenario: Overflow to holding area
- **WHEN** hàng lạnh giao vượt sức chứa kho mát
- **THEN** phần tràn được đưa sang khu chờ (`holdingArea`) để xử lý

### Requirement: Verify evidence and docs
Change này gom bằng chứng verify thật và đồng bộ tài liệu.

#### Scenario: Existing suites pass
- **WHEN** chạy `suppliers`, `delivery`, `supplier-cart` qua harness tsc→node
- **THEN** cả ba PASS và kết quả được ghi
