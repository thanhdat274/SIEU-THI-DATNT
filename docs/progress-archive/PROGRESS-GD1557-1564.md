# PROGRESS lưu trữ GĐ1557–1564

- **GĐ1564** — Tab Dịch vụ thêm dòng "🎰 Máy thu phí hôm nay" tách từ `stats.byService` (máy vốn gộp chung tổng dịch vụ), từng máy xếp nhiều trước (`machineDayLine`). Thuần UI.
- **GĐ1563** — Sổ khách quen (cấp 38) xếp sinh nhật hôm nay lên đầu, rồi khách còn tặng quà được, đã tặng xuống cuối (`sortForGift`, ổn định trong nhóm). Thuần UI.
- **GĐ1562** — Dải "Bạn có biết?" thêm 3 mẹo: thông thạo món (36), quà cuối tuần (37), tặng quà khách quen (38). Rà Midnight #5 (máy giữ kiên nhẫn): đã đúng sẵn — kiên nhẫn chỉ trừ khi đứng hàng quầy.
- **GĐ1561** — Sổ đầu ngày nhắc sinh nhật khách quen (cấp 38) thêm "· tặng quà +6". QA UI GĐ1557–1559 trong trình duyệt: nút 🎁 bấm được → "Hôm nay đã tặng rồi", dòng đếm 21→20; save QA đã xoá.
- **GĐ1560** — Rà soát + QA save mới: bán đầu tiên ~54s. Tặng quà khách quen GĐ1557–1559 gom trong 1 file `data/regularGift.ts`, 1 action LOCAL_ONLY; QA store thật: tặng trừ 1 món kho, +3 thân thiết, lần 2 cùng ngày bị chặn. Save QA đã xoá.
- **GĐ1559** — Đầu sổ khách quen (cấp 38) hiện "🎁 Hôm nay còn tặng quà được N khách quen" (`giftableCount`).
- **GĐ1558** — Tặng quà đúng sinh nhật khách quen: +6 thân thiết thay +3 (`giftFriendship`), nút hiện số thật. Coop: `giftRegular` LOCAL_ONLY như `forgiveDebt`.
- **GĐ1557** — Tặng quà khách quen (cấp 38): nút 🎁 trong sổ khách quen tặng 1 món khách thích từ kho → +3 thân thiết, mỗi khách 1 lần/ngày (`regularGiftPlan`, `giftRegular` LOCAL_ONLY, trường tuỳ chọn `lastGiftDay`). Test `regularGift.test.ts`.
