# Tasks: Neighborhood Builder Expansion (change tổng)

Change này không có task code. Theo dõi tiến độ ở change con; đánh dấu ở đây khi change con được archive.

## 0. Tiên quyết
- [>] 0.1 `open-world-building-types`: `open_building` CÓ CODE (simulation.ts:874), command type + server replay + schema 9 migration — không thể verify "chạy thật trong game" do sandbox. Báo cáo: có code, typecheck PASS, test EPERM.
- [x] 0.2 `open-world-districts-city-goals` 1.1: **XONG 16/10/2026.** Khu của tiệm chính vào `MarketContext`; luật khu qua `modifiers.ts` (`DISTRICT_MODIFIER_RULES`, W1–W4 nhóm ưa chuộng); W0 trung tính; khóa cache có `districtId`; chỉ áp cho nhu cầu khách + giá bán. `yarn typecheck` PASS, `yarn --cwd packages/game-core test` EXIT 0 (112 pass, golden khớp). Chưa làm: giờ cao điểm W1–W4, khu theo từng tòa; chưa QA trình duyệt/co-op.
- [x] 0.3 `open-world-districts-city-goals` 2.2 + 4.1: lệnh `claim_city_goal`, `cityProgress` trong save — có code + test (game-core 112/112, `test:coop` EXIT 0, 17/10/2026); claim thành công qua server chưa có test riêng.

## 1. Change con (làm lần lượt)
- [>] 1.1 `civic-buildings-qol` — code + test + tab Xóm phố xong 16/10/2026 (test EXIT 0); còn mặt tiền riêng, QA bấm xây thật + co-op 2 client
- [>] 1.2 `civic-population-demand` — code + test xong 16/10/2026 (EXIT 0); sweep CHƯA ĐẠT (doanh thu ≈ 0% dù hệ số 1,07–1,09), chờ quyết định
- [x] 1.3 `civic-local-fees` — code + test + sweep chốt bộ E (16/10/2026); còn QA trình duyệt và co-op 2 client.
- [>] 1.4 `civic-city-goals` + Sổ góp xóm — code + test + QA Browser một client và 2 client khách dev xong 17/10/2026; còn bản tin sáng 2 client, 2 tài khoản Google thật.
- [ ] 1.5 `civic-residents-life` (sau 1.2)

## 2. Hoãn / ngoài phạm vi
- Sự kiện thành phố (ngập, mất điện, dịch bệnh): nếu làm thì mở rộng `neighborhood-events`.
- Đường do người chơi vẽ, zoning tự do, traffic sim, điện/nước, xe buýt: không làm.
