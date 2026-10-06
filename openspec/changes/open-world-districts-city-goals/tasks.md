# Tasks

Trạng thái 05/10/2026: mới có kế hoạch, chưa có code. Phụ thuộc `open-world-land-reclamation`; nên sau `open-world-building-types`.

## 1. Khu vực

- [ ] 1.1 `DistrictDef`, gán `parcel.districtId` cho W0–W4 (provisional); test mọi lô có khu.
- [ ] 1.2 `modifiers.ts`: `source: 'district'`, `when.districtId`; luật nhóm hàng và giờ cao điểm; kiểm hợp lệ dữ liệu.
- [ ] 1.3 NPC nền theo `npcMix` của khu; giao diện chủ đề khu (biển tên khu, màu vỉa hè/đèn nhẹ).
- [ ] 1.4 Mô phỏng cà phê/ăn vặt ở hai khu; kiểm tích hệ số không vượt trần.
- [ ] 1.5 Cụm theo khoảng cách (D2b): bảng cặp bổ trợ, bán kính 16 ô, trần; thay `foodClusterMultiplier`; test bằng giá trị cũ ở W0 và cụm > rải rác.

## 2. Cấp và mục tiêu thành phố

- [ ] 2.1 `CityGoalDef` + dữ liệu cấp 1–10 (provisional); tính tiến độ từ save.
- [ ] 2.2 Lệnh `claim_city_goal`, lên cấp, thưởng; `cityTier` theo cấp; điều kiện cấp thành phố cho `reclaim_wave`.
- [ ] 2.3 Đồ công cộng làm thưởng, đặt ở vị trí định sẵn, sức hút qua hệ trang trí `decor.ts`.
- [ ] 2.4 Mô phỏng tiến độ 60–90 ngày; chỉnh mục tiêu.

## 3. Ký ức thành phố

- [ ] 3.1 Biển kỷ niệm; nhật ký mốc (dùng nhật ký Bước 5).
- [ ] 3.2 Ảnh minimap nhỏ lưu IndexedDB (tối đa 10), xem trong bảng Thành phố.

## 4. Save, kiểm chứng, tài liệu

- [ ] 4.1 Schema kế tiếp + migration (cấp thành phố suy từ `cityTier` cũ); server phát lại lệnh mới; test.
- [ ] 4.2 `yarn typecheck`, `yarn test`, `yarn build` PASS (kết quả thật); Browser QA, co-op.
- [ ] 4.3 Cập nhật `tổng hợp.md`, `TASKS.md`, `ROADMAP.md`.
