# Spec Delta

## ADDED Requirements

### Requirement: Civic city goals
Mục tiêu thành phố SHALL hỗ trợ điều kiện về số công trình công cộng, chỉ số sống khu và tổng dân số, tính từ dữ liệu save; thưởng của mục tiêu xóm phố SHALL là làm hiện một trang sổ góp.

#### Scenario: Goal reveals a bundle
- **WHEN** người chơi đạt và nhận mục tiêu "QoL khu dân cư ≥ 40"
- **THEN** trang sổ góp "Trạm y tế phường" hiện ra, công trình chưa được mở

#### Scenario: No retroactive lock
- **WHEN** tải save đã ở cấp 6
- **THEN** mục tiêu xóm phố cấp 4–5 không làm mất cấp, và các trang sổ của cấp đã qua hiện ngay

### Requirement: Neighborhood donation book
Mỗi loại công trình công cộng SHALL có một trang sổ gồm các ô hàng hóa và đúng một ô tiền; người chơi SHALL góp từ kho qua lệnh `donate_to_bundle`, và công trình SHALL chỉ mở khi mọi ô đủ.

#### Scenario: Donate goods
- **WHEN** góp 20 hộp sữa vào ô cần 20 hộp sữa
- **THEN** kho giảm 20 theo FIFO, ô đủ, sổ cái có dòng `civic_donation` theo giá vốn

#### Scenario: Partial over-donation
- **WHEN** ô còn thiếu 5 và người chơi góp 8
- **THEN** chỉ 5 bị trừ khỏi kho

#### Scenario: Wrong or expiring goods
- **WHEN** góp sản phẩm không thuộc danh sách nhận, hoặc lô còn hạn dưới mức tối thiểu
- **THEN** lệnh bị từ chối với thông báo tiếng Việt, kho không đổi

#### Scenario: Bundle completes
- **WHEN** ô cuối cùng của trang được góp đủ
- **THEN** loại công trình được mở cho `open_building` với phí xây đã giảm, và nhật ký thành phố có mốc khánh thành

#### Scenario: Co-op shared bundle
- **WHEN** hai người chơi cùng góp vào một trang
- **THEN** cả hai client thấy cùng tiến độ, và sổ ghi ai đã góp ô nào

### Requirement: Co-op donation safety
Server SHALL xử lý lệnh góp theo thứ tự nhận, ghi người góp từ phiên server, và góp tiền vượt 30% quỹ SHALL cần phiếu chi lớn.

#### Scenario: Simultaneous donation to the same slot
- **WHEN** hai người cùng góp 10 hộp sữa vào ô chỉ còn thiếu 10
- **THEN** lệnh đến trước được nhận đủ, lệnh sau bị từ chối và kho chung không bị trừ thêm

#### Scenario: Large cash donation
- **WHEN** thành viên góp vào ô Quỹ xây dựng số tiền > 30% quỹ
- **THEN** tạo phiếu, chỉ trừ tiền khi phiếu được đồng ý
