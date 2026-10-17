# Design

## 1. Mô hình dữ liệu

Mở rộng `PartyOrderDef` (shared) bằng trường tùy chọn:

```
PartyOrderDef {
  ...
  seasons?: SeasonId[]   // chỉ xuất hiện khi một trong các mùa này đang diễn ra; thiếu = đơn chung mọi mùa
}
```

Không đổi `SaveGameData.schemaVersion`. Trạng thái `PartyOrderState` giữ nguyên; chỉ thêm bộ lọc khi sinh đơn mới trong `refreshAvailablePartyOrders`.

`SeasonId` lấy từ `game-data/seasons.ts` (đã export). Đơn hiện có gắn nhãn mùa hợp lý, ví dụ:

| Order | seasons |
|-------|---------|
| `party_tat_nien_xom` (tất niên) | `['tet']` |
| đám giỗ / mừng thọ / đám cưới (đám, thôi nôi, sinh nhật, bóng đá) | không khai (đơn chung) hoặc `['mua_mua']` theo ngữ cảnh |
| (thêm nếu cần) đơn Trung thu | `['trung_thu']` |

## 2. Chọn đơn theo mùa

`refreshAvailablePartyOrders(state, day, playerLevel)`:
- Lấy `season = getSeasonForDay(day)`.
- Tập `candidates = PARTY_ORDERS.filter(o => o.minPlayerLevel <= level)`.
- Nếu `season` có: ưu tiên khối đơn `seasons` chứa `season.id` (đơn đúng mùa) xuất hiện trước; nếu không có đơn đúng mùa thì lấy từ khối đơn chung (`seasons` undefined).
- Vẫn giữ chính sách "mỗi ngày sinh tối đa 1 đơn mới" và "chưa từng hoàn thành thì có thể mở lại", đúng như hành vi hiện tại — chỉ thêm bước lọc/ưu tiên, không phá luồng hiện có.

Hàm thuần `partyOrdersForSeason(defs, day)` tách để test: trả về `{ seasonal: PartyOrderDef[], general: PartyOrderDef[] }`. `fulfillPartyOrder`/`respondPartyOrder` không đổi.

## 3. Thông báo

Trong `simulation.ts`:
- Ngày đầu của một lễ hội (dùng `getSeasonWindow`; `firstDay === day`) → `onToast("🎉 <Tên lễ hội> về xóm! Cầu <nhóm hàng> tăng, có mục tiêu ngày hội.", 'info')`.
- Khi có đơn tiệc mùa mới sinh trong `refreshAvailablePartyOrders` → toast "📋 Đơn tiệc mùa <tên>".
- Khi có mục tiêu ngày hội mới đủ điều kiện nhận thưởng (trạng thái `completed && !claimed`) → toast "🏆 Có thưởng ngày hội để nhận".
- Chống trùng: theo dõi ngày đã thông báo lễ hội qua một set `notifiedSeasonKeys` lưu trong state (reset theo năm), để không nhắc lại lễ hội cùng năm đã nhắc.

## 4. Màn "Sự kiện xóm phố"

`NeighborhoodEventsModal` (mở từ nút trên HUD/map, gần `QuestModal`):
- Phần "Lễ hội": dùng `getSeasonWindow(day)` + `getFestivalClaimWindow(day)` — tên, blurb, ngày còn lại, nhân tố cầu, nhóm hàng ưu tiên.
- Phần "Đơn tiệc mùa": `getPartyOrderState().available` lọc đơn `seasons` khớp mùa; nút Nhận/Từ chối/Giao tái dùng handler có sẵn.
- Phần "Mục tiêu ngày hội": `getFestivalGoalProgressList()` với nút nhận thưởng.
- Cảnh báo: đơn/mục tiêu sắp hết hạn (chữ đỏ "hết hạn hôm nay/ngày mai").

## 5. Cân bằng

Chạy `holiday-balance-sim.ts` trên máy thật/sandbox để có `HolidaySimMetric` (customers, revenue, preferredCategoryUnits) cho 5 lễ hội mới + Tết/Trung thu; dùng tỷ lệ `revenue / preferredUnits` để kiểm phần thưởng mục tiêu ngày hội (thưởng ≈ đáng công, không quá lớn so với doanh thu kỳ vọng). Điều chỉnh hằng số PROVISIONAL trong `seasons.ts` / `goals.ts` nếu cần, ghi số liệu thật vào change tasks + `tổng hợp.md`.

## 6. Tương thích save cũ

Field `seasons?` trên `PartyOrderDef` là optional; save cũ không có nhãn mùa vẫn chạy (toàn bộ đơn coi là đơn chung). Không đổi schema.

## 7. Rủi ro / giới hạn

- Nếu không có đơn đúng mùa nào trong danh sách hiện có, mùa đó sẽ dùng đơn chung — cần thêm 1–2 đơn Tết/Trung thu để trải nghiệm mùa rõ rệt (thêm trong phạm vi change này, PROVISIONAL).
- Toast lễ hội có thể lặp nếu người chơi mở game giữa mùa — chỉ nhắc khi `firstDay===day` hoặc dùng `notifiedSeasonKeys`.
- Màn mới trên màn hình hẹp (568–740 px) cần kiểm mobile-first.
- `yarn test`/`yarn build` có thể vẫn `spawn EPERM` trong sandbox như các giai đoạn trước; kiểm qua harness `tsc`→`node` và ghi nhận.
