# Proposal: Dân số xóm theo chỉ số sống

Change con 2/5 của `neighborhood-builder-expansion`. Cần `civic-buildings-qol`.

## Why
QoL chỉ có ý nghĩa khi đổi được gameplay: xóm tốt → đông dân → nhiều khách. Đây là nửa vòng lặp còn thiếu.

## What Changes
- Mỗi khu có `population` (số nguyên), tiến dần về `targetPopulation(khu)` = sức chứa khu × hệ số QoL, đổi tối đa ±3%/ngày.
- Lưu lượng khách tiềm năng của tòa trong khu nhân `populationTrafficFactor` ∈ [0.85, 1.25], đưa vào `buildDemandTable` cạnh hệ số danh tiếng/khu/cụm, **dưới trần tổng chung** (không nhân chồng vô hạn).
- Không tạo agent mới: khách vẫn sinh như hiện tại, chỉ tần suất thay đổi.
- Save thêm `civic?: { populationByDistrict: Record<DistrictId, number> }` (tùy chọn; số schema lấy theo thứ tự merge).
- Tổng kết ngày + tab Xóm phố hiển thị dân số và xu hướng.

## Không làm
Cư dân hiển thị (change 5), phí (change 3). Không đổi trần danh tiếng hiện có.
