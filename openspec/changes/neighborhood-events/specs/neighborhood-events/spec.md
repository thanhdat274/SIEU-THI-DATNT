# Spec Delta

## Purpose

Nối lễ hội theo mùa và đơn tiệc xóm thành một loạt "sự kiện xóm phố": đơn tiệc ăn theo mùa, thông báo sự kiện, màn tổng quan và phần thưởng được cân bằng.

## ADDED Requirements

### Requirement: Seasonal party orders
Đơn tiệc có nhãn `seasons` SHALL chỉ xuất hiện khi một trong các mùa đó đang diễn ra; đơn không khai mùa SHALL luôn khả dụng; mỗi ngày SHALL sinh tối đa một đơn mới theo thứ tự ưu tiên đơn đúng mùa rồi đến đơn chung.

#### Scenario: Festival order appears
- **WHEN** ngày chơi thuộc Tết và có đơn `party_tat_nien_xom` khai `seasons: ['tet']` chưa hoàn thành
- **THEN** đơn tất niên được ưu tiên xuất hiện trong ngày đó

#### Scenario: General order year-round
- **WHEN** đơn đám giỗ không khai mùa và ngày không lễ
- **THEN** đơn này vẫn khả dụng khi đủ cấp và chưa hoàn thành

#### Scenario: Season expiry
- **WHEN** một mùa kết thúc
- **THEN** đơn đúng mùa đó chưa hoàn thành không còn được sinh mới (đơn cũ hết hạn theo luật `refreshAvailablePartyOrders` hiện có)

### Requirement: Event notifications
Hệ thống SHALL thông báo (toast/bản tin) khi một lễ hội bắt đầu ngày đầu tiên, khi có đơn tiệc mùa mới, và khi có mục tiêu ngày hội đạt đủ để nhận thưởng; SHALL không nhắc lại cùng một lễ hội trong cùng năm.

#### Scenario: Festival start toast
- **WHEN** bước vào ngày đầu của một lễ hội chưa từng nhắc trong năm
- **THEN** hiện một thông báo tên lễ hội và tác động

#### Scenario: No repeat within year
- **WHEN** đã nhắc lễ hội Tết năm nay rồi sang ngày sau đó của cùng Tết
- **THEN** không xuất hiện thêm thông báo lặp cho Tết năm đó

### Requirement: Neighborhood events screen
Giao diện SHALL có màn "Sự kiện xóm phố" liệt kê lễ hội đang/ sắp diễn ra, đơn tiệc đúng mùa và mục tiêu ngày hội kèm thưởng, mở từ nút trên HUD/map; SHALL cảnh báo mục đơn/ mục tiêu sắp hết hạn.

#### Scenario: Shows current event
- **WHEN** người chơi mở màn trong mùa Tết
- **THEN** thấy tên Tết, ngày còn lại, đơn tiệc đúng mùa và mục tiêu ngày hội của Tết

#### Scenario: Expiring warning
- **WHEN** một đơn tiệc hoặc mục tiêu ngày hội còn 1 ngày hết hạn
- **THEN** màn đánh dấu cảnh báo sắp hết hạn

### Requirement: Balanced rewards
Phần thưởng đơn tiệc và mục tiêu ngày hội SHALL được kiểm so với số liệu `holiday-balance-sim`; hằng số cầu và thưởng SHALL ghi số liệu thật làm bằng chứng trong change/tài liệu.

#### Scenario: Verified against sim
- **WHEN** hoàn thành một mục tiêu ngày hội trong mùa lễ diễn ra
- **THEN** phần thưởng nhận được khớp cấu hình và tỷ lệ với doanh thu kỳ vọng (bằng chứng từ `holiday-balance-sim` ghi trong tasks)

### Requirement: Save compatibility
Save cũ không chứa nhãn mùa SHALL tải và chơi bình thường; không đổi `schemaVersion`.

#### Scenario: Old save loads
- **WHEN** tải một save trước change này
- **THEN** game chạy với toàn bộ đơn coi là đơn chung và không lỗi
