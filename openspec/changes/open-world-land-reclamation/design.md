# Design: Khai hoang theo đợt

## Bối cảnh (đọc code 05/10/2026)

Khu phố trang trí (`game-data/src/neighborhood.ts`) đã có bố cục thành phố trong khoảng x −44..80, y −38..44, nằm gọn trong biên thế giới 120×80 (`WORLD_BOUNDS` x −42..77, y −36..43 từ Bước 1):

- Đường ngang: chính (`main`, hàng 13–15), trường (`school`, −20), phía nam (`south`, 25). Đường dọc: tây x −7..−4, đông x 38..41; ngã tư có đèn ở giao với đường chính.
- Công viên phía tây (x −30..−8, y −6..10); chung cư phía đông (x 42..74, mặt tiền y=2) và bãi xe chung cư (x 41..76, y 3..10); dãy nhà phố `s2` (mặt tiền y=24, phía bắc đường nam); dãy nhà `n2` (mặt tiền y=−7, ngay bắc bản đồ chơi); trường học (x 8..36, y −31..−22).
- Ngân sách NPC/xe cố định (`NPC_BUDGET`, `VEHICLE_BUDGET`), chỉnh theo chất lượng, không theo tiến độ.
- Renderer (`viewport.ts`) vẽ cả thế giới vào một `RenderTexture` theo khung nhìn; ô bản đồ chơi là sprite, chưa chia khối/culling theo ô.

Mọi tòa của game đều có mặt tiền nhìn xuống phía nam, nên lô mới phải nằm **phía bắc một con đường**.

## Quyết định

### D1. Đợt khai hoang (provisional, chốt hình khi làm bằng ảnh chụp)

| Đợt | Vùng (x, y) | Đường giáp mặt | Lô mới (ước tính) | Thay thế trang trí | Mở khi |
|---|---|---|---|---|---|
| W0 | 0..35, −6..15 | chính | 4 lô hiện có | — | sẵn có |
| W1 Đông ngã tư | 36..60, 3..15 (gồm đường dọc đông x 38..41) | chính (lô x 42..47 là góc ngã tư đông) | 3 | một phần bãi xe chung cư | cấp 20, 800.000 ₫ |
| W2 Nam hẻm | 0..35, 16..24 | đường nam | 4 | dãy `s2` đoạn x 0..35 | cấp 30, 1.200.000 ₫ |
| W3 Đông xa | 61..76, 3..15 | chính | 2 | phần còn lại bãi xe | cấp 40, 2.000.000 ₫ |
| W4 Nam đông | 42..76, 16..24 | đường nam (góc ngã tư x 42..47) | 4 | dãy `s2` đoạn x 42..76 | cấp 50, 3.000.000 ₫ |

Công viên, trường, chung cư, các đường giữ nguyên: thành phố vẫn có "khung" do game kiểm soát. Hạ tầng mỗi đợt (vỉa hè, đèn, cây, chỗ đỗ, rãnh) viết tay trong dữ liệu đợt để giữ cảnh đẹp, không sinh ngẫu nhiên.

### D2. Vùng chơi = hợp các đợt đã mở

`GameTileMap` bao hộp chữ nhật nhỏ nhất chứa mọi đợt đã mở (`originTileX`, `originTileY` từ Bước 1). Ô trong hộp nhưng ngoài đợt đã mở: va chạm với người chơi/khách/nhân viên, renderer vẽ trang trí khu phố như hiện tại. Đường giữa các đợt (đường dọc đông x 38..41 giữa W0 và W1) thuộc đợt mở sau và đi bộ được qua vạch qua đường có sẵn.

### D3. Mở đợt (`reclaim_wave`)

Điều kiện cấp + tiền, tiệm đóng cửa hay không đều được (công trường ở ngoài). Đợt vào trạng thái thi công `wavesUnderConstruction[waveId] = day + 2`: vẽ rào công trường, máy xúc, 2–4 công nhân NPC (dùng hệ NPC nền, sprite có sẵn + phụ kiện), nhà trang trí trong vùng vẫn vẽ nhưng mờ dần. Đầu ngày hoàn thành: vùng chơi mở, nhà trang trí trong vùng biến mất, hạ tầng và lô của đợt xuất hiện, toast + nhật ký thành phố.

### D4. Lô phải mua

Lô W0 coi như đã sở hữu (giữ hành vi cũ: giá tòa đã gồm đất). Lô đợt mới: `buy_parcel { parcelId }`, giá = `PARCEL_BASE_PRICE × số ô × landValueMultiplier`. Đặt tòa (Bước 3) yêu cầu mọi lô được chọn đã sở hữu.

### D5. Giá trị vị trí (provisional)

`parcel.frontage = { roadId, corner }`:

| Loại | Hệ số giá | Hệ số khách |
|---|---|---|
| Góc ngã tư đường chính | 1,6 | 1,25 |
| Mặt đường chính | 1,0 | 1,0 |
| Góc ngã tư đường nam | 1,0 | 0,9 |
| Mặt đường nam | 0,6 | 0,75 |

Nhịp sinh khách mỗi tòa phụ (`BUILDING_TRAFFIC_SHARE`) nhân với hệ số khách của lô tòa đó đứng. Tiệm chính và W0 hệ số 1 nên golden các bước trước không đổi. Cập nhật `*-balance-sim.ts` để so ba vị trí.

### D6. Ngân sách mở rộng theo đất

Ngân sách ô (Bước 2) = mốc theo cấp + `WAVE_EXPANSION_BONUS[waveId]` cho mỗi đợt đã mở (ví dụ +24 ô mỗi đợt, provisional). Ô mở rộng vẫn phải nằm trong lô đã sở hữu của tòa.

### D7. Thành phố lớn dần

`cityTier = f(số đợt đã mở, số tòa đã mở)` (0..5). Áp vào:
- `NPC_BUDGET`, `VEHICLE_BUDGET` nhân hệ số theo tier (ví dụ 0,6 → 1,4), vẫn chịu trần chất lượng.
- Dãy nhà trang trí `n2`, `s2`, `n1*`: số tầng tối thiểu tăng theo tier (nhà 1 tầng → 2–3 tầng), deterministic theo seed.
- Khách vãng lai NPC nền ghé quầy vỉa hè đông hơn (đã có `setStallStops`).
Không đổi kinh tế ngoài D5; tier chỉ là cảnh quan.

### D8. Hiệu năng

- Chia lớp ô bản đồ chơi thành khối 16×16; chỉ dựng sprite cho khối giao khung nhìn + lề; khối tĩnh cache texture.
- Pathfinding: A* trên hộp lớn nhất (≈ 77×31 ở W0–W4) vẫn nhỏ; giữ, thêm giới hạn nút và đo thời gian trong test.
- Khách: điểm sinh theo đường/vỉa hè gần tòa đích (không luôn từ mép tây/đông bản đồ), để khách không phải đi bộ cả trăm ô.
- Đo FPS trước/sau bằng hook dev hiện có; ghi số vào `tổng hợp.md`.

### D9. Quan hệ với `branch-chain`

`branch-chain` (chưa có code) thiết kế mỗi chi nhánh là một bản đồ/snapshot riêng chạy nền. Hướng thế giới mở đặt mọi tòa trên **cùng một thành phố**. Đề xuất: sau change này, thay ý "chi nhánh = bản đồ riêng" bằng "chi nhánh = tòa ở đợt khai hoang xa", giữ phần còn dùng được của `branch-chain` (kho tổng, sổ cái gắn nhãn, chương 7 đếm chi nhánh). **Đã quyết 05/10/2026: chủ dự án đồng ý.** Chi nhánh = tòa ở đợt khai hoang xa trên cùng thành phố; `branch-chain` tạm dừng, sẽ viết lại phạm vi (kho tổng, chuyển kho, sổ cái nhãn tòa, chương 7) sau khi change này xong. Đã ghi ở đầu `branch-chain/design.md` và `tasks.md`.

### D10. Save schema 7

`world.openedWaves: string[]`, `world.wavesUnderConstruction`, `storeLayout.ownedParcelIds: string[]`. Migration 6→7: `openedWaves = ['w0']`, lô W0 vào `ownedParcelIds`.

## Rủi ro

- **Cảnh vật đổi đột ngột** khi xóa nhà trang trí: hoạt cảnh thi công 2 ngày che chuyển đổi; QA ảnh trước/sau mỗi đợt.
- **Hiệu năng trên mobile**: đo riêng; nếu tụt, giảm tier NPC theo chất lượng `low`.
- **Cân bằng** hệ số vị trí và giá đợt: provisional, ghi rõ, có mô phỏng so sánh trước khi playtest.
- **Co-op**: một người mở đợt, người kia đang đứng ở vùng sắp thành công trường: công trường ở ngoài vùng chơi cũ nên không kẹt; test.
