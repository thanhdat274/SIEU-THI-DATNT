# Design: Khu vực và mục tiêu thành phố

## Bối cảnh (đọc code 05/10/2026)

- `game-data/src/modifiers.ts`: luật hiệu ứng có `source`, `when` (ví dụ `season`), `target.categories`, `effects.demand`; có kiểm hợp lệ nhóm hàng (`PRODUCT_CATEGORY_LABELS`).
- `game-data/src/neighborhood.ts`: 11 loại NPC nền (`NPC_TYPES`: người đi làm, học sinh, sinh viên, người già, phụ huynh...) có lịch theo giờ; chỉ là cảnh, không phải khách mua.
- `game-data/src/goals.ts`: `LONG_TERM_GOALS` (category, targetValue, thưởng tiền/danh tiếng/XP), `WEEKLY_QUESTS`; `GoalState.claimedGoalIds`; lệnh `claim_goal` có trong danh sách lệnh server.
- Sau Bước 4: `cityTier` = hàm số đợt + số tòa, chỉ đổi cảnh; bảng "Thành phố"; nhật ký thành phố (Bước 5).

## Quyết định

### D1. Khu gắn với đợt/lô

`DistrictDef { id, name, kind, npcMix, peakHours, preferredCategories, visualTheme }`; `parcel.districtId`. Gán ban đầu (provisional): W0 `hem_dan_cu` (hẻm dân cư), W1 `thuong_mai_nga_tu` (gần chung cư, thương mại), W2 `dan_cu_nam`, W3 `van_phong_logistics`, W4 `am_thuc_nam`. Lô góc có thể thuộc hai khu (lấy khu của đường giáp mặt).

### D2. Hiệu ứng khu qua modifiers

Thêm `source: 'district'` và điều kiện `when.districtId` vào `modifiers.ts`. Mỗi khu sinh luật: nhân cầu nhóm hàng ưa chuộng (1,2–1,4), nhân nhịp khách theo khung giờ cao điểm (ví dụ văn phòng 6:30–8:30 ×1,3, 11:30–13:00 ×1,2). Tòa nhận luật của khu chứa lô của nó. Nhóm NPC nền vẽ ở khu theo `npcMix` (người đi làm nhiều ở văn phòng, học sinh gần trường) để cảnh khớp với số liệu.

### D2b. Hàng xóm kéo khách cho nhau (theo khoảng cách)

Hiện `FOOD_CLUSTER_TRAFFIC_MULTIPLIER` chỉ đếm số tòa phụ đang mở, không quan tâm vị trí. Thay bằng **cụm theo khoảng cách**: mỗi cặp tòa có quan hệ bổ trợ trong dữ liệu (ví dụ tạp hóa ↔ quán ăn, cà phê ↔ văn phòng/chi nhánh, bãi giữ xe ↔ mọi tòa), tòa nhận hệ số `1 + Σ bonus_cặp` với các tòa bổ trợ trong bán kính 16 ô (cửa tới cửa), trần ×1,3 (provisional). Ở vị trí mặc định W0 hệ số mới phải bằng hệ số cụm cũ để không đổi kinh tế save cũ (kiểm bằng mô phỏng có hạt giống). Đây là lý do để người chơi đặt các tòa thành **cụm** thay vì rải rác.

### D3. Cấp thành phố và mục tiêu

`CityGoalDef { id, cityLevel, kind, targetValue, reward }` với `kind`: `daily_customers`, `building_types_open`, `waves_opened`, `infrastructure` (có bãi giữ xe, mọi lô một khu có tòa), `weekly_revenue`, `total_buildings`. Cấp thành phố 1..10; lên cấp khi xong **mọi** mục tiêu của cấp đó và nhận thưởng (`claim_city_goal`). `cityTier` của Bước 4 = `min(5, floor(cityLevel / 2))`, bỏ công thức tự động. Đợt khai hoang thêm điều kiện cấp thành phố (W1: 2, W2: 4, W3: 6, W4: 8; provisional).

Mục tiêu tính từ dữ liệu sẵn có (`DailyRecord`, placements, openedWaves), không thêm bộ đếm song song.

### D4. Thưởng là đồ công cộng

Ngoài tiền/danh tiếng: vật trang trí công cộng (đài phun nước, ghế đá, cổng chào khu) đặt ở vị trí định sẵn của khu, tăng sức hút nhẹ (dùng hệ sức hút trang trí có sẵn trong `decor.ts`, `DECOR_ATTRACTION_MAX`/`DECOR_ATTRACTION_DIVISOR`) cho tòa trong bán kính. Không chiếm lô.

### D5. Ký ức thành phố

- Biển kỷ niệm "Nơi tiệm đầu tiên mở cửa – ngày 1" trước tiệm chính, xuất hiện khi cấp thành phố ≥ 3.
- Nhật ký mốc: mở đợt, mở loại hình đầu tiên, lên cấp thành phố, kèm ngày game và người thực hiện (co-op).
- Ảnh nhỏ bản đồ (minimap render ra ảnh nhỏ, lưu cục bộ trong IndexedDB, không lưu save/cloud) mỗi lần lên cấp thành phố; xem lại trong bảng Thành phố. Không bắt buộc cho nghiệm thu nếu thiết bị không hỗ trợ.

### D6. Save

`cityProgress { level, claimedCityGoalIds, milestones[] }`; `parcel.districtId` là dữ liệu, không lưu. Schema kế tiếp; migration: cấp thành phố khởi điểm suy từ `cityTier` cũ để không tụt cảnh quan.

## Rủi ro

- **Chồng hệ số** (mùa × khu × mặt tiền × cụm ẩm thực) làm lệch kinh tế: giới hạn tích hệ số cầu ở `modifiers.ts` (đã có cơ chế gộp), mô phỏng trước/sau.
- **Mục tiêu khó quá** chặn khai hoang: mô phỏng tiến độ 60–90 ngày; mục tiêu cấp thấp đạt được bằng chơi bình thường.
- **Ảnh minimap** tốn bộ nhớ: tối đa 10 ảnh nhỏ, nén.
