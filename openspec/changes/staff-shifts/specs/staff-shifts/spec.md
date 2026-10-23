# Spec Delta

## Purpose

Quy định ca làm việc của nhân viên (gồm ca đêm vắt qua nửa đêm), tiền lương theo ca, và việc nhân viên chỉ hiện/làm việc trong ca của mình — tương thích save cũ, bảng lương và các hành vi nhân viên đã có.

## ADDED Requirements

### Requirement: Four shift windows

Hệ thống SHALL có bốn ca với khung giờ cố định: sáng **07:00–14:00**, chiều 14:00–22:00, đêm 22:00–06:00, cả ngày **07:00–22:00** (khớp ngày bán bắt đầu 07:00). Ca đêm SHALL là ca hợp lệ khi đặt ca, khi lưu và khi tải save, kể cả khi khung giờ vắt qua nửa đêm.

#### Scenario: Night wraps midnight

- **WHEN** xét một nhân viên ca đêm lúc 22:00, 23:30, 00:30 và 05:59
- **THEN** cả bốn thời điểm đều tính là đang trong ca

#### Scenario: Outside night window

- **WHEN** xét nhân viên ca đêm lúc 06:00 hoặc 21:59
- **THEN** không tính là đang trong ca

#### Scenario: Morning starts at 07:00

- **WHEN** xét nhân viên ca sáng lúc 06:59, 07:00 và 13:59
- **THEN** 06:59 ngoài ca; 07:00 và 13:59 trong ca

#### Scenario: Unknown shift in save

- **WHEN** save có nhân viên mang giá trị ca không thuộc bốn ca
- **THEN** nhân viên đó được nạp với ca cả ngày, không bị xoá và không mất lương đã lưu

#### Scenario: Schedule entries after normalize

- **WHEN** tải save có `staffSchedule` trỏ tới nhân viên không còn tồn tại hoặc ca không hợp lệ
- **THEN** chỉ các mục còn nhân viên và ca hợp lệ được giữ, ca đêm hợp lệ được giữ nguyên

#### Scenario: Hired on a later day

- **WHEN** nhân viên được tuyển ở ngày N và bị xét lúc ngày N−1
- **THEN** không tính là đang trong ca

### Requirement: Wage by shift

Mỗi ca SHALL có hệ số lương riêng; lương một ngày của nhân viên SHALL bằng `dailyWage × hệ số ca` (làm tròn tới đồng). Ca đêm SHALL có phụ cấp cao hơn nửa ngày thường. Lương SHALL được trả một lần mỗi ngày qua bảng lương hiện có; thiếu tiền SHALL ghi nợ và giữ tiền không âm.

#### Scenario: Night wage

- **WHEN** nhân viên có `dailyWage` 30.000 đ chọn ca đêm rồi chốt ngày
- **THEN** lương ghi cho ngày đó bằng 30.000 × hệ số ca đêm và lớn hơn lương ca sáng cùng người

#### Scenario: Payroll once after reload

- **WHEN** tải lại save ngay sau khi chốt lương
- **THEN** không trả lương lần hai

#### Scenario: Insufficient cash

- **WHEN** lương phải trả 30.000 đ mà tiền còn 10.000 đ
- **THEN** tiền còn 0, đã trả 10.000 đ và ghi nợ 20.000 đ

### Requirement: Present and working only during shift

Nhân viên ngoài ca SHALL không được vẽ trên bản đồ và SHALL không nhận hay chạy việc châm hàng, dọn bàn, thanh toán, tuần tra. Nhân viên đang làm dở khi hết ca SHALL dừng việc, nhả claim và hoàn hàng đang mang về kho (tổng hàng không đổi). Không có thay đổi nào ở save khi nhân viên ngoài ca (họ vẫn nằm trong danh sách, giữ lương và cấu hình).

#### Scenario: Off-shift hidden

- **WHEN** màn hình đang ở 21:00 và chỉ có nhân viên ca sáng/cả ngày
- **THEN** không nhân viên nào được vẽ ngoài tiệm

#### Scenario: Night guard visible

- **WHEN** màn hình đang ở 23:00 và có bảo vệ ca đêm
- **THEN** bảo vệ ca đêm được vẽ trong tiệm, nhân viên ca ngày không được vẽ

#### Scenario: Shift ends while carrying goods

- **WHEN** nhân viên châm hàng đang mang hàng tới kệ mà hết ca
- **THEN** việc dừng, hàng được trả về kho, claim được nhả và tổng hàng không đổi

#### Scenario: Off-shift cannot take a job

- **WHEN** giao việc châm kệ cho nhân viên ngoài ca
- **THEN** bị từ chối với lý do không sẵn sàng (actor_unavailable)

### Requirement: Backward-compatible existing staff behavior

Qua đêm SHALL giữ nguyên các hành vi đang có: trả lương một lần mỗi ngày, hao mòn/hỏng kệ theo đêm, và nhân viên châm hàng tự bảo trì đồ đã mòn trước khi hỏng. Việc tự bảo trì qua đêm SHALL tiếp tục đếm theo vai trò `refill` (không lọc theo ca) để giữ tương thích `maintenance.test.ts`. Save cũ thiếu trường ca/lịch ca SHALL nạp được với ca cả ngày.

#### Scenario: Overnight maintenance unchanged

- **WHEN** qua đêm với nhân viên vai trò `refill` đang ở ca sáng
- **THEN** nhân viên đó vẫn tự bảo trì đúng giới hạn mỗi đêm như trước change

#### Scenario: Old save without shift fields

- **WHEN** nạp save schema cũ không có `staffSchedule` hoặc nhân viên thiếu ca
- **THEN** nhân viên làm ca cả ngày và mọi hành vi nhân viên cũ giữ nguyên

### Requirement: Schema 13 migration

Save schema 12 SHALL được nâng lên 13 khi tải. Migration SHALL: chuẩn hoá ca từng nhân viên (giá trị không hợp lệ → cả ngày), bỏ mục `staffSchedule` mồ côi hoặc không hợp lệ, bỏ `assignedBuilding` không còn tòa tương ứng (coi như toàn tiệm); SHALL giữ nguyên nhân viên, tiền, lương đã lưu và mọi trường hợp lệ khác.

#### Scenario: Migrate legacy save

- **WHEN** nạp save schema 12 có 1 nhân viên ca sáng, 1 nhân viên gán tòa `drink` đã mua, và 1 nhân viên gán tòa không tồn tại
- **THEN** save thành schema 13; nhân viên ca sáng giữ nguyên, nhân viên gán `drink` giữ gán, nhân viên gán tòa không tồn tại thành "toàn tiệm"

#### Scenario: Future schema rejected

- **WHEN** nạp save có schemaVersion 14
- **THEN** bị từ chối là bản lưu tương lai, không tự hạ cấp

### Requirement: Shift UI

Giao diện nhân viên SHALL cho chọn một trong bốn ca, SHALL hiển thị lương theo ca đã chọn và trạng thái đang trực/ngoài ca của từng người. Khi chọn ca đêm, giao diện SHALL hiện rõ ghi chú "Ca đêm chưa giảm trộm — sẽ có ở theft-and-security 4.4" để người chơi không trả phụ cấp đêm mà không biết tác dụng. Khi chơi co-op, đổi ca SHALL gửi lệnh để máy chủ giữ bản chung và máy khác thấy cùng kết quả.

#### Scenario: Select night shift

- **WHEN** người chơi chọn ca đêm cho một nhân viên
- **THEN** màn nhân viên hiện ca đêm, lương tương ứng, trạng thái theo giờ hiện tại và ghi chú "chưa giảm trộm"

#### Scenario: Co-op shift change

- **WHEN** một thành viên đổi ca trong hẻm chung
- **THEN** máy chủ phát lại lệnh, thành viên còn lại nhận cùng ca trong snapshot và revision tăng đúng một
