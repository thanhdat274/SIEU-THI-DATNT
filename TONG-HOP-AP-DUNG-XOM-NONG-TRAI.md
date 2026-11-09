# TỔNG HỢP XÓM NÔNG TRẠI (xom.farm) → ÁP DỤNG CHO TẠP HÓA ĐẦU NGÕ

> Ngày: 07/11/2026 (đợt nghiên cứu 2 — chơi thật tài khoản khách Lv1 tại Hà Nội + trích trọn bộ config v3.8.0 đang chạy từ localStorage, checksum `ff137f5d…`). Đợt 1 (29/10) nghiên cứu kỹ thuật/asset pipeline — xem `PHAN-TICH-THAM-KHAO-XOM-NONG-TRAI.md`.
> **Nguyên tắc cũ vẫn giữ:** chỉ học cơ chế + đường cong cân bằng. KHÔNG chép tên món, hình, câu chữ của họ.
> Tại sao game nông trại này đáng học cho ý tưởng "siêu thị": nó giải đúng bài toán mình đang làm — **một sạp nhỏ mở rộng thành hệ thống lớn** (sạp chợ Lv7 → chợ làng → chợ tỉnh → chợ đầu mối 3 miền) và **chuỗi nấu nướng dài nhất**: 544 vật phẩm, 304 công thức, 18 nhà máy, đỉnh là "Quán ăn làng" với món combo Mâm cỗ.

---

## A. Bức tranh vòng chơi (1 đoạn)

Gieo → thu → chế biến qua 18 nhà máy (chuỗi tới 4 tầng sâu) → giao đơn xe tải / đóng thùng ghe / bán ở chợ người chơi → vàng + EXP lên cấp 200 → mở đất 64×64 theo vùng liền kề, nâng nhà 5 cấp mở kho → sưu tập 48 decor theo 4 bộ vùng miền (mỗi món có điểm + buff chạy được) → xã hội: chat, giúp ghe, ghé thăm, đua tỉnh. Toàn bộ "nội thất/trang trí" của họ là **decor ngoài vườn có chức năng** — không có nhà interior, nhưng cơ chế "decor = điểm + buff + danh hiệu + vòng quay theo kỳ" chính là thứ khu siêu thị mình cần.

## B. 10 hệ đáng học với số liệu chốt (nguồn: config v3.8.0)

### B1. Chợ 3 cấp — bản mẫu trực tiếp cho "tạp hóa → siêu thị"
| Cấp chợ | Phí | Đặc điểm |
|---|---|---|
| Chợ làng | **2%** | gần, rẻ phí, hàng ít |
| Chợ tỉnh | 5% | rộng hơn |
| Chợ đầu mối (3 miền) | 5% | tất cả món, giá tốt nhất |

- Sạp của bạn: 4→10 ô (mua ô: 1.000v → 3.000v → 10/15/20/30 xu), 50 món/ô.
- **Giá tự đặt trong dải 0,3×–3× giá chuẩn**; 15 vật liệu + thảo quả được trần 20× (`highCap`) — vàng của vật liệu chỉ xoay giữa người chơi, game không sinh thêm → chống farm vật liệu.
- **Cần mua (buy order)**: 3 lệnh mở, TTL 24h, dải giá 0,67–1,17×, game **giữ vàng trước** khi đặt lệnh.
- Chống gian: tài khoản mới <1 ngày không bán; người <Lv15 bị kẹp giá 0,85–1,15×; mỗi người mua tối đa 5 món/ngày/người bán.
- **Chợ phiên**: 3 món chung đổi thứ Hai + phiên đặc sản giờ vàng cuối tuần; đơn có món phiên **+25% vàng & EXP** → tạo nhịp "hàng gì đáng làm tuần này".

### B2. Sổ sưu tập decor — "trang trí có chức năng" (khớp trực tiếp GĐ1495 của mình)
- 4 bộ × 8 món (3 Thường + 3 Quý + 1 Hiếm + 1 Báu), mỗi bộ gắn 1 vùng + 1 danh hiệu.
- **Điểm vườn theo độ hiếm × sao 1–5**: Thường 10→20, Quý 25→50, Hiếm 60→110, Báu 150→250.
- Món trùng → mảnh (1/2/4/10 theo hiếm); nâng sao 4/6/10/16 mảnh.
- **Mốc đặt đủ 2/4/6 món cùng bộ → buff đúng "nhóm việc" của vùng đó** (Bắc=cây ruộng -2/-3% chờ, Trung=chế biến, Nam=cây ăn quả, Tây Bắc=chuồng; mốc 4 = +2% EXP). Trần hiệu ứng **10%/loại, 15% tổng**.
- Đủ 8/8 → danh hiệu + hiệu ứng không khí (đom đóm, cánh hoa).
- Món Hiếm/Báu chỉ ra từ **Vòng quay Lộc** (4 kỳ × 28 ngày xoay 4 bộ; 1 quay miễn phí/ngày, vé 2 xu, gói 10+1, tối đa 10 vé/ngày) + không đăng bán chợ được → giá trị sưu tầm giữ vĩnh viễn.

### B3. Chuỗi nấu nướng 304 công thức — khu bếp của siêu thị có thể học ngay
- 18 nhà máy mở Lv1→130; mỗi nhà máy 3–44 công thức; unlock công thức bó chặt bảng 200 cấp (levels.json ghi từng cấp mở gì).
- Món cuối mỗi chuỗi là **combo của các món đã làm ra** ("Mâm cỗ làng" = 5 món làm sẵn, 4 giờ, 136 EXP) — đỉnh dây chuyền, không cần nguyên liệu thô.
- Món mặn cao cấp nhất (Quán ăn làng Lv92): **4–6 nguyên liệu/món**, 30 phút–4 giờ, EXP 27–136 — độ dài công thức tăng theo cấp.
- Thực đơn "ẩm thực Việt" phủ 10 nhóm: món ăn 90, bánh 46, chè/nước 67, mứt/khô 30, sơ chế 37, thủ công 27… — bán 0,3×–3× giá chuẩn trên chợ.

### B4. Generator đơn hàng (xe tải + ghe) — thông minh nhất trong các game đã khảo sát
- 9 đơn xe tải thường trực; đơn mới sau 1 phút; bỏ đơn đợi 15 phút.
- Chọn món theo **độ sâu dây chuyền có trọng số đổi theo cấp** (cấp cao thiên về món sâu); `lineTimeBudgetSeconds` — số lượng 1 dòng không vượt quá số cái **làm kịp trong khoảng thời gian đó, tính trọn dây chuyền** (đơn không bao giờ đòi thứ không thể làm ra); món quá rẻ so với cấp giảm trọng số; món có sẵn trong kho được nhân lên (đơn "dễ nhằn" đúng lúc); đặc sản quê giữ tỉ lệ cố định; sàn trọng số từng món chống "món mồ côi".
- Ghe Lv17: 9 thùng = 3 loại × 3, hạn 16h, nhờ bạn 3 thùng, 20 chuyến/ngày, thùng cùng loại thứ 2/3 ×1,2/×1,5, đủ ghe +50% vàng; loại hàng "tự làm" 1,0 / "cần mua chợ" 0,5 / "khó kiếm" 0,15 và tối đa 1 loại khó kiếm/ghe.

### B5. Kinh tế EXP chống farm
- EXP/suy giảm theo độ "cũ" của mở khoá: khác cấp quá 3 bậc ×0,8^k, 15+ cấp = 0; bán NPC decay ×0,85.
- Hái cây 200 lần đầu/ngày đủ EXP, 201–400 còn nửa, 401+ = 0; cây thấp hơn 20 cấp không EXP.
- **Thông thạo**: gặt 1 giống nhiều lần lên Đồng/Bạc/Vàng (ngưỡng theo độ dài vụ: 200/1000/4000 | 100/400/1500 | 40/150/500); Bạc = giống đó -5% chờ; Vàng = khắc hoành phi (25.000v).
- **Luân canh** khác họ +15% EXP; **tuổi cây** càng lâu năm EXP càng cao.
- Cấp: `cumExp = 4(L-1)L(L+15)` tới 31, sau đó `14520·(L/30)^0.95`, từ Lv74 nhân thêm `1+0.05·(L−73)`. Thưởng lên cấp cả game: 2.021.450 vàng + 904 xu + 8 decor mốc lớn (Lv25→200 mỗi 25 cấp).

### B6. Mở rộng không gian — 2 game cùng chốt một công thức
- Bản đồ 64×64 (vùng 16×16), khởi đầu 4 vùng; mở vùng: **vàng = 1000·k·(k+1)**, vật liệu ×k, cần cấp 4+4k, **phải tiếp giáp** (giống mở ô từng ô tới 39×39 của Midnight Bistro — mô hình CS2 được 2 game xác nhận).
- **Nhà 5 cấp = "kho + quyền lợi hằng ngày"**: +60/150/300/500 chỗ (cả Hầm và Kho), 1/2/3/5 vật liệu miễn phí mỗi ngày, nhà cấp 5 tặng vật phẩm tăng tốc. Nâng nhà cần vàng + 3 loại vật liệu (20k + 10×3; 50k + 20×3).
- Hầm 150 / Kho 120 chỗ, +30/nâng tối đa 40 nấc; **14 vật liệu nâng cấp không tính chỗ** → không bao giờ kẹt kho vì chính vật liệu nâng kho (lưới an toàn kiểu nhân viên miễn lương của Midnight Bistro).
- Luống ruộng giá lũy tiến: `40 + 15n + 2n²`, tối đa `6 + 2/cấp` (cap 80).

### B7. Vùng miền là danh tính (đối trọng "Bắc/Trung/Nam" của mình)
- Mỗi vùng: 60–80 đặc sản + 1 nhà máy đặc sản + 1 bộ decor + 1 kiểu nhà + mâm cỗ Tết riêng.
- **Khí hậu theo tháng**: tháng 12–2 Bắc Bộ cây nhiệt đới +20% thời gian, rau vụ đông -20% — lịch thật.
- Nhà kính Lv40 (2→4 ô) trồng cây miền khác; đổi quê chờ 30 ngày, công trình khác miền "ngủ đông" (bán 1/3 giá trị).

### B8. Vòng hằng ngày
- Điểm danh 7 ngày xoay vòng **không reset khi bỏ** (ngày 7: 5 xu + decor Bù nhìn).
- Rương miễn phí theo trọng số 30/20/20/15/10/5 (vàng nhỏ/vàng to/phân/2 bộ vật liệu/jackpot 3.000v+3 búa).
- Trần chống cày mọi nguồn: ghe 20/ngày, hái trộm 10/ngày, quà bạn 5→20/ngày, vé quay 10/ngày, tăng tốc ghe 10/ngày.
- Giftcode khan lượt (TANTHU 1.200 lượt). Quà góp ý 1.000/3.000/10.000 vàng + **bảng xếp hạng "Top góp ý"**.

### B9. Tăng tốc — 3 lớp không đụng nhau
| Lớp | Giá | Tác dụng |
|---|---|---|
| Xu | `ceil(phút còn lại / 15)` | hoàn tất NGAY (việc ngắn rẻ, việc dài đắt) |
| Xây ngay | 1 xu / 3 phút | riêng công trình xây |
| Đồng hồ cát (vật phẩm) | 1 món kho | CẮT BỚT 15p/1h… khỏi 1 mục tiêu — không tốn xu |
| Vàng | theo cấp, trần 10 lần/ngày (ghe) | tiện nghi cuối |

### B10. UX đáng bê cho khu siêu thị
- **Menu quạt trên vật thể** (Gieo/Nâng/Di chuyển) hiện quanh ngón bấm — 1 cú chạm ra đủ hành động.
- Minh bạch phần thưởng: mỗi thẻ giống/công thức in ngay **"+N EXP"**, thẻ ghe in vàng + EXP từng thùng.
- Chi tiết decor = popup **hình 3D xoay được** + footprint ("đặt trên 1×1 ô đất") + ổ khoá "Mở ở Lv N" — tò mò tự nhiên thay tutorial.
- Túi đồ = Sổ sưu tập chung một bảng; badge "+25%" chợ phiên in trên món trong đơn.
- Tip xoay vòng "Bạn có biết?" là nút bấm được (mở thẻ đầy đủ), có nút Ẩn.
- Sidebar ranking xoay: Top nông dân hôm nay / Top Level / Top độ giàu / **Top góp ý** — cảm giác "có người xung quanh" mà không cần multiplayer thật.

## C. Bản đồ áp dụng vào Tạp Hóa Đầu Ngõ

| # | Hệ | State trong repo | Việc còn lại (nếu làm) |
|---|---|---|---|
| 1 | **Chợ cấp: tạp hóa → siêu thị** (mỗi cấp mở slot + đổi phí; phí cấp nhỏ rẻ hơn) | ✅ GĐ1518–1519 | — |
| 2 | **Sổ sưu tập decor vùng** (4 bộ × 8, rarity, điểm × sao, mốc 2/4/6 buff, mảnh nâng sao) | ✅ GĐ1495 + GĐ1515 | rarity/mảnh trùng bỏ (trùng đã cộng decor gốc) |
| 3 | **Vòng quay/đổi quà theo kỳ 28 ngày** đưa món Hiếm/Báu | ✅ GĐ1528 (bản gọn) | vé mua bằng xu bỏ (chống phình) |
| 4 | **Món combo cuối chuỗi bếp** ("Mâm cỗ" = 5 món làm sẵn) | ✅ GĐ1523 | — |
| 5 | **Generator đơn/contract theo độ sâu + thời gian dây chuyền** | ✅ GĐ1527 | — |
| 6 | **"Hàng hot tuần này" +25%** (chợ phiên) | ✅ GĐ1519 (+15%) | — |
| 7 | **Mở rộng tiếp giáp từng vùng** `giá = 1000·k·(k+1)` | ✅ GĐ1944 (6 ô phía sau, giá 1tr·k·(k+1)) | — |
| 8 | **Kho = nhà 5 cấp** (+60/150/300/500 chỗ, quà vật liệu hằng ngày) | ✅ kho 7 cấp | — |
| 9 | **Vật liệu nâng cấp không tính chỗ kho** (14 loại miễn) | ✅ GĐ1945 (gạch/xi măng/thép cho kho cấp 5+) | — |
| 10 | **Trần EXP theo độ cũ** (×0,8^k sau 3 bậc, 0 sau 15) + thông thạo -5% chờ | ✅ GĐ1522 | — |
| 11 | **Điểm danh không reset** + rương trọng số | ✅ ân hạn + GĐ1533 | — |
| 12 | **Menu quạt trên vật thể + "+N EXP" minh bạch + popup 3D decor** | ✅ GĐ1529 +XP, GĐ1532 decor, GĐ1535 menu quạt (cảm ứng) | — |

**Công thức mượn được ngay (1 dòng code):**
- Tăng tốc: `xu = ceil(phútCònLại / 15)`; xây: `1 xu / 3 phút`.
- Mở vùng: `vàng = 1000·k·(k+1)`, cấp yêu cầu `4 + 4k`.
- Giá luống/ô: `base + perOwned·n + perOwnedSquared·n²` (40+15n+2n²), trần `base + perLevel·cấp`.
- Dải giá chợ: `0,3–3× giá chuẩn`; vật liệu quý `×20`; lệnh cần mua `0,67–1,17×`, TTL 24h, giữ vàng trước.
- Điểm decor: `thuong 10–20 / quy 25–50 / hiem 60–110 / bau 150–250` × sao 1–5; mảnh trùng `1/2/4/10`; nâng sao `4/6/10/16`.
- Buff bộ sưu tập: mốc 2/4/6 món = `-2%/-3% chờ nhóm + 2% EXP`, trần 10%/loại 15% tổng.
- Chu kỳ cây/chuồng: 20 phút → 4 giờ; cây 4 chu kỳ trước héo, 3 bạn cứu.
- Rương: trọng số `30/20/20/15/10/5`.
- EXP decay: `×0,8^(cũ−3)`, 0 khi `cũ ≥ 15`; bán NPC thêm ×0,85.

## D. Bài học lớn nhất

1. **"Mở rộng sạp" của họ là tiến trình sở hữu ô chợ, không phải mua map to một lần**: sạp Lv7 → chợ làng (phí 2%) → tỉnh → đầu mối, mỗi cấp mở slot và đổi luật giá. Cho khu siêu thị mình: đừng làm "siêu thị 1 cú mở" — làm 3 cấp chợ, cấp nhỏ phí rẻ để khách "quý" thì mua ngay, cấp to phí cao nhưng đủ hàng.
2. **Decor có giá trị bền vì 3 lớp nhau**: điểm (tức thì) → buff theo mốc bộ (chạy dài) → danh hiệu + không khí (danh vọng). Mình đã có điểm 🩷; thêm 2 lớp còn lại chỉ cần mảnh trùng + mốc bộ.
3. **Đơn hàng thông minh = đơn hàng "biết mình đang có gì và làm kịp gì"**: `stockWeightMul`, `lineTimeBudgetSeconds`, sàn trọng số — ba ý tưởng này biến hệ đơn từ máy móc thành "thiên vị đúng lúc", không tốn nội dung mới.
4. **Mọi trần đều "mềm"**: hết vé quay hôm nay → quay lại bằng xu; hết chỗ kho → vật liệu vẫn vào; bỏ điểm danh → không reset. Game không bao giờ đóng cửa hoàn toàn với người chơi lười/đến muộn — khớp nguyên tắc "lưới an toàn" mình đã học ở Midnight Bistro.
5. **Config là file dữ liệu có checksum + cache localStorage + sinh từ generator** (comment trong file tự ghi "sửa bảng trong generator rồi chạy lại", còn đính cả số docs nội bộ) — cùng hướng "nội dung ngoài code" mà Midnight Bistro cũng dùng. Khi mình làm catalog 300+ món, làm generator + checksum ngay từ đầu.

## E. Không nên copy

- **Đua tỉnh / chat 4 kênh / xóm làng server-side**: game mình single-player; cảm giác "xóm giềng" lấy được bằng sidebar ranking xoay + nhân vật NPC có tên (Bác Hai của họ).
- **Battle pass / xem quảng cáo / mời bạn kiểu F2P mạnh**: phá kinh tế trong game đã cân; chỉ cân nhắc khi ra public.
- **64×64 map cho game 3D content procedural của mình**: họ có kit GLB riêng; mình không có pipeline đó thì map to = rỗng.
- **Câu cá/chó cảnh 13 giống** (vui nhưng tách dòng nội dung): chỉ làm khi khu siêu thị đã xong.
