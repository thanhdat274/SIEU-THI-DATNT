# Spec Delta

## Purpose

Xe dừng, xếp hàng và nhường người đi bộ tại vạch qua đường; người đi bộ chỉ qua khi an toàn.

## ADDED Requirements

### Requirement: Vehicles stop at the crosswalk
Xe SHALL dừng trước vạch khi đèn đỏ hoặc vàng (trừ xe quá gần để dừng êm), giữ khoảng cách với xe phía trước cùng làn, và đi tiếp khi đèn xanh.

#### Scenario: Red light
- **WHEN** đèn đỏ và một xe đang tiến tới vạch
- **THEN** xe dừng hẳn mà đầu xe chưa vào vạch, và xe sau không chồng lên xe đầu

#### Scenario: Green light
- **WHEN** đèn xanh và không có người qua đường
- **THEN** xe không giảm tốc

#### Scenario: Yellow dilemma
- **WHEN** đèn vừa vàng và xe còn chạy tốc độ thường ở quá gần vạch để dừng êm
- **THEN** xe đi qua; còn xe ở xa thì dừng trước vạch

### Requirement: Yield to pedestrians
Xe chưa vào vạch SHALL dừng nhường khi có người đang qua đường, kể cả khi đèn xe xanh, và đi tiếp khi người đó qua xong.

#### Scenario: Pedestrian on crosswalk
- **WHEN** có người đang qua đường và xe còn trước vạch
- **THEN** xe dừng trước vạch, và sau khi người qua xong xe đi tiếp

### Requirement: Pedestrians cross only when safe
Người đi bộ SHALL chờ ở mép vỉa, chỉ bắt đầu qua khi đèn đi và thời gian còn lại đủ để qua hết đường, rồi rời cảnh ở mép bên kia.

#### Scenario: Waiting on green for cars
- **WHEN** đèn xe xanh
- **THEN** người đi bộ vẫn chờ

#### Scenario: Late in the walk phase
- **WHEN** pha đi sắp hết, không đủ thời gian qua đường
- **THEN** người chờ không bắt đầu qua

### Requirement: Safe long-run behaviour
Trong mô phỏng dài SHALL không có xe nằm trong vạch khi có người đang qua và không có hai xe cùng làn chồng nhau.

#### Scenario: Thirty-minute simulation
- **WHEN** chạy 30 phút mô phỏng giờ cao điểm
- **THEN** không có xung đột xe với người, không có xe chồng nhau và có xe đã dừng chờ đèn đỏ

### Requirement: Ambient pedestrians are limited
Người đi bộ nền SHALL không xuất hiện ban đêm hoặc khi mưa lớn, và không vượt số tối đa cùng lúc.

#### Scenario: Night and storm
- **WHEN** giờ ban đêm hoặc mưa lớn
- **THEN** không có người đi bộ nào được sinh ra
