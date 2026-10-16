# Tasks: civic-residents-life

- [x] 1.1 Dữ liệu lịch sinh hoạt + hằng số NPC theo dân số (`RESIDENTS_PER_NPC = 4`, `NPC_CAP_DESKTOP = 40`, `NPC_CAP_MOBILE = 20`).
- [x] 1.2 Mở rộng `NeighborhoodLife`: số NPC theo dân số `min(pop / RESIDENTS_PER_NPC, NPC_CAP)`, trần di động thấp hơn desktop, sinh tất định theo `(seed, day, districtId, index)`, đích là công trình; test tất định + trần đạt chuẩn.
- [x] 1.3 Bậc nhà dân theo dân số `houseFloorTier(pop, capacity)`; renderer đổi sprite tương ứng (1, 2, 3 tầng) với atlas `residents/residents.json`.
- [x] 1.4 Test hiệu năng (0.061 ms/khung ở 375×812, ngân sách ≤ 2 ms); QA trình duyệt (375×812, 667×375, desktop 1280×800) không lỗi console.
- [x] 1.5 `yarn typecheck` (PASS), `yarn test` (game-core 112/0 PASS, web 9/0 PASS); ghi `tổng hợp.md`.

- [ ] 1.6 Co-op: seed thế giới chung; QA 2 client thấy cùng cư dân.
