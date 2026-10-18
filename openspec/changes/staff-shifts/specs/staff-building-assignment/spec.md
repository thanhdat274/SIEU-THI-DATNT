# Spec Delta

## Purpose

Quy định việc gán nhân viên vào một tòa cụ thể trong thế giới mở (theo `BuildingPlacement`), giới hạn công việc theo tòa, và đường lệnh co-op để mọi người trong hẻm thấy cùng phân công.

## ADDED Requirements

### Requirement: Assign staff to a building instance

Hệ thống SHALL cho gán mỗi nhân viên vào một tòa đang có, tham chiếu bằng id instance trong `storeLayout.buildingPlacements` (ví dụ `main`, `xoi`, `drink`, `snack` hoặc tòa mở thêm). Giá trị "không gán" SHALL có nghĩa là toàn tiệm (mọi tòa), giữ hành vi hiện tại. Gán tới tòa không tồn tại SHALL bị từ chối và không đổi dữ liệu.

#### Scenario: Assign to existing building

- **WHEN** gán nhân viên vào tòa `snack` đã mua
- **THEN** nhân viên lưu `assignedBuilding = 'snack'`, lưu/tải lại vẫn giữ và snapshot co-op thấy cùng giá trị

#### Scenario: Assign to missing building

- **WHEN** gán nhân viên vào id tòa không có trong save/bản đồ (chưa mua hoặc gõ sai)
- **THEN** bị từ chối với lý do tòa không tồn tại và `assignedBuilding` không đổi

#### Scenario: Clear assignment

- **WHEN** người chơi chọn "Toàn tiệm"
- **THEN** `assignedBuilding` bị xoá và nhân viên làm việc mọi tòa như trước change

#### Scenario: Building under construction

- **WHEN** gán nhân viên vào tòa đang thi công sau khi dời
- **THEN** nhân viên chờ ở kho như hành vi L3-C6 hiện có, không bị dời khỏi tòa

### Requirement: Work is scoped to the assigned building

Nhân viên có gán tòa SHALL chỉ làm công việc thuộc tòa đó: châm kệ chỉ nhận kệ trong tòa; thu ngân chỉ đứng quầy và nhận khách thanh toán của tòa (theo `cashierFixtureId` của khách); bảo vệ chỉ tuần tra trong tòa; dọn bàn chỉ dọn bàn của tòa. Nhân viên không gán SHALL giữ nguyên hành vi toàn tiệm hiện có.

#### Scenario: Refill scoped

- **WHEN** nhân viên châm hàng gán tòa `xoi` nhận việc tự động khi kệ tiệm chính đang thiếu hàng
- **THEN** nhân viên không nhận kệ tiệm chính; chỉ nhận kệ thuộc tòa `xoi`

#### Scenario: Manual refill job rejected

- **WHEN** giao thủ công một kệ thuộc tòa khác cho nhân viên đã gán tòa
- **THEN** bị từ chối, không chiếm claim và không lấy hàng khỏi kho

#### Scenario: Cashier scoped

- **WHEN** thu ngân gán tòa `drink` và có khách chờ ở quầy tiệm chính
- **THEN** thu ngân không nhận khách tiệm chính; nhận khách chờ đúng quầy tòa `drink`

#### Scenario: Security scoped

- **WHEN** bảo vệ gán tòa `snack` trong ca
- **THEN** bảo vệ tuần tra trong phạm vi tòa `snack`, không đi lộ trình tiệm chính

#### Scenario: Unassigned keeps old behavior

- **WHEN** nhân viên không gán tòa
- **THEN** hành vi châm hàng/thu ngân/bảo vệ/dọn bàn đúng như trước change (mọi tòa)

### Requirement: Co-op assignment command

Hệ thống SHALL có lệnh co-op `assign_staff_building` để đổi phân công tòa. Lệnh SHALL được máy chủ tự phát lại (save client gửi kèm bị bỏ qua), SHALL tăng revision đúng một lần khi thành công, và gửi lại cùng `commandId` SHALL không đổi gì thêm.

#### Scenario: Server replay

- **WHEN** một thành viên gán nhân viên vào tòa qua hẻm chung
- **THEN** máy chủ chạy lệnh trên trạng thái mới nhất, thành viên còn lại nhận thay đổi qua snapshot và revision tăng đúng một

#### Scenario: Invalid target rejected

- **WHEN** lệnh gán tới tòa không tồn tại
- **THEN** máy chủ từ chối, revision không đổi và save chung không đổi

#### Scenario: Client save ignored

- **WHEN** save client gửi kèm có thêm thay đổi phân công khác ngoài lệnh
- **THEN** máy chủ bỏ save đó, chỉ áp phần do lệnh tạo

### Requirement: Assignment UI and candidate suggestion

Giao diện nhân viên SHALL có bộ chọn tòa gồm "Toàn tiệm" và các tòa đang có, hiển thị tòa hiện tại của từng người; bộ chọn SHALL ẩn hoặc khoá khi chưa mua tòa phụ nào. Ứng viên có gợi ý tòa (bảo vệ/nhân viên quán nước) SHALL chỉ được gán đúng tòa đang có khi tuyển.

#### Scenario: Building selector options

- **WHEN** người chơi mở màn nhân viên khi đã mua tòa `xoi` nhưng chưa mua `drink`/`snack`
- **THEN** bộ chọn có "Toàn tiệm", tòa tiệm chính (`main`) và tòa `xoi`; không có `drink`/`snack` (tòa chưa mua)

#### Scenario: Candidate suggestion on hire

- **WHEN** tuyển ứng viên có gợi ý tòa đã bị bỏ/không tồn tại
- **THEN** nhân viên được tuyển với "toàn tiệm" thay vì gán tòa không tồn tại
