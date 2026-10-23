# Proposal: Mục tiêu thành phố + Sổ góp xóm

Change con 4/5 của `neighborhood-builder-expansion`. Cần `civic-population-demand` và `open-world-districts-city-goals` (2.2 lệnh `claim_city_goal`, 4.1 `cityProgress` trong save) chạy thật.

Cập nhật 16/10/2026: thay "thưởng mở khóa thuần" bằng **Sổ góp xóm** (cảm hứng Community Center của Stardew Valley, bảng quyên góp công trình của Animal Crossing).

## Why
Mở công trình bằng cách chờ chỉ số rồi bấm nhận thưởng thì khô, và không dính tới phần hay nhất của game là kinh doanh hàng hóa. Sổ góp xóm bắt người chơi dùng chuỗi cung ứng, bếp và mùa vụ để đóng góp cho xóm, có đánh đổi thật (hàng đem góp thì không bán được), hợp vai chủ tiệm và vui hơn khi co-op.

## What Changes
- **Mục tiêu thành phố** thêm loại điều kiện `civic_building_count`, `district_qol_at_least`, `total_population_at_least`; chèn vào cấp 4–10 hiện có, mỗi cấp tối đa 1 mục tiêu xóm phố. Không mặc định kéo dài lên cấp 15.
- **Sổ góp xóm**: mỗi loại công trình công cộng có một trang sổ gồm 3–4 ô. Mỗi ô yêu cầu hàng hóa (một trong vài loại được chấp nhận) hoặc tiền (chỉ ô "Quỹ xây dựng").
  - **Chỉ số mở sổ**: một mục tiêu/cấp thành phố làm *hiện* trang sổ kế tiếp.
  - **Hàng hóa mở công trình**: góp đủ mọi ô thì loại công trình được mở, phí xây giảm theo phần đã góp.
- Lệnh `donate_to_bundle`, trừ kho theo FIFO, ghi sổ cái `civic_donation`, ghi ai góp ô nào (co-op: quỹ chung, thành tích theo người — quyết định 6c).
- Khánh thành: thông báo + nhật ký mốc thành phố; trang sổ đóng dấu hoàn thành.
- UI tab "Sổ góp xóm" trong tab Xóm phố (mobile-first).

## Đã chốt với chủ dự án (16/10/2026)
1. **Hàng theo mùa**: mỗi ô hàng nhận 1 trong ≥ 2 loại thay thế, không phải chờ cả mùa.
2. **Hàng sắp hết hạn**: chỉ nhận lô còn hạn ≥ 1 ngày.
3. **Tiền thay hàng**: không. Tiền chỉ vào ô "Quỹ xây dựng".

## Không làm
Không đổi luật lên cấp, không đổi `cityTierFromCityLevel`. Không chợ trao đổi giữa người chơi.

## Impact
`game-data/world/civic-bundles.ts` (mới), `game-data/world/city-goals.ts`, `game-core/civic-bundles.ts` (mới), `commands.ts` + server replay, `shared/index.ts` (LedgerEntryType, save), `apps/web` tab Sổ góp xóm.
