# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ các giai đoạn (nguồn quyết định, công thức, QA, số liệu) nằm ở `docs/progress-archive/`: PROGRESS-GD1-153.md, PROGRESS-GD154-158.md, PROGRESS-GD154-180.md — tra bằng `grep -n "GĐ1xx" docs/progress-archive/*.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive (dồn xong chạy `node dev/archiveCheck.cjs` — GĐ1157 — đối chiếu 2 chiều: 0 tham chiếu ma, 0 archive thiếu mục lục) và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh (UI 2D phủ trên thế giới 3D):** thế giới low-poly 3D màu ấm; UI (HUD, panel React, icon pixel 16×16) nền tím-than (#3a3a4d) accent vàng (#f1c40f); chữ/biển/bong bóng vẽ canvas 2D rồi dán lên vật thể 3D; icon emoji nhất quán, tiếng Việt đời thường. Tài sản 3D thủ công bằng Blender (low-poly stylized cùng bảng màu, theo mục "Tài sản 3D với Blender" trong promt_game.md). Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (07/11/2026)
- GĐ1805: thử mực khô nướng vào hot Tết dương → economySimL50 tụt 21/22, đã hoàn tác. Ghi chú: biên economySimL50 đang sát 22; thêm cầu món nấu cấp 36–50 dễ làm vỡ — đợt sau ưu tiên nội dung ngoài cầu (lời thoại, mô tả) hoặc cấp >50.
- GĐ1804: Ngày hội phụ nữ có kem dừa trong hot list; test 5479/5479.
- GĐ1803: Ngày hội xóm có mít chiên giòn trong hot list; test 5478/5478.
- GĐ1802: Giáng sinh trời lạnh có cà phê trứng trong hot list; test 5477/5477.
- GĐ1801: Lễ hội làng nấu cỗ có thịt kho trứng trong hot list; test 5476/5476.
- GĐ1800: QA trình duyệt GĐ1797–1799 (43 đơn, Đoàn từ thiện, bún bò giữa buổi, canh chua tối) — không lỗi console.
- GĐ1799: tối khách muốn canh chua cá (rhythm toi); thử chè bắp buổi chiều làm economySimL50 tụt 21/22 nên bỏ; test 5475/5475.
- GĐ1798: giữa buổi sáng khách muốn bún bò Huế (rhythm giua_sang); test 5474/5474.
- GĐ1797: đơn tiệc "Đoàn từ thiện" (cấp 42; 12 phở bò + 12 bún bò Huế), 43/45 đơn; test 5473/5473.
- GĐ1796: đơn tiệc "Họp lớp cấp 3" (bạn cũ anh Tuấn, cấp 44) — 12 gỏi cuốn + 12 bánh xèo; đơn 42/45; test + quét seed.
- GĐ1795: test trần ≤12 món nấu trong favorites khách quen (bài học GĐ1794 — vượt làm economySimL50 tụt).
- GĐ1794: anh Minh quán nhậu thích mực khô nướng. Thử thêm 3 món thích nữa (cô Nga, bác Đôi, cô Thảo) làm economySimL50 tụt 21/22 → bỏ; đợt khách quen thích món muộn dừng ở 12 người để giữ cân bằng cấp 50.
- GĐ1793: chú Thắng thích bánh bao kim sa, cô Mai thích cà phê phin sữa, bác sĩ Hải thích cháo gà, anh Giao thích bánh mì jambon (món mở muộn); test mốc cấp 90.
- GĐ1792: QA trình duyệt GĐ1789–1791 — 7 khách quen: cấp 30 giữ số món cũ, cấp 60 thêm món mới đúng tên (mi_y_sot_bo hiển thị "Mì ý sốt thịt bằm"), console 0 lỗi.
- GĐ1791: Bác Tám thích trà atiso nấu, bác Hùng thợ máy thích hủ tiếu Nam Vang, chú Tư công nhân thích gà xào sả (món mở muộn); test mở rộng.
- GĐ1790: Bé Na thích bánh flan, chị Lan thích sữa chua trái cây (món mở muộn); test describe.each mở rộng.
- GĐ1789: khách quen có món thích mở muộn — Bà Năm thích cà phê trứng, anh Tuấn thích mì Ý sốt bò (cấp 36; cấp 30 không đổi); test unlockedFavorites.
- GĐ1788: đơn tiệc "Đám giỗ ông" (bác Năm, cấp 42) — mâm cơm nhà 10 thịt kho trứng + 10 canh chua cá; đơn thứ 41/45; test riêng + quét seed.
- GĐ1787: chợ đêm hot thêm bắp ngọt nướng, Trung thu thêm bánh pía nướng; test describe.each mở rộng.
- GĐ1786: bóng đá phường hot thêm mực khô nướng, lễ 30/4 thêm tôm nướng (đi chơi biển); test describe.each mở rộng.
- GĐ1785: mùa mưa hot thêm cháo gà (mưa dầm ăn cháo nóng); test describe.each mở rộng.
- GĐ1784: QA trình duyệt GĐ1779–1783 — 6 khung giờ (5–13 món, id hợp lệ), mealFactor phở 7h = cơm cá cơm rim 12h = 2.2, console 0 lỗi.
- GĐ1783: tiện lợi 24/7 xoay ca — sáng thêm phở bò, bánh cuốn chả lụa; trưa thêm cơm chiên lạp xưởng, cơm cá cơm rim; test mealFactor.
- GĐ1782: buổi chiều thèm chè khoai môn, bánh flan (ăn vặt ngọt); test timeBandAt.
- GĐ1781: chống phình wants khung giờ — test ≤20 món/khung, không trùng, id có thật (6 khung đạt).
- GĐ1780: giữa buổi thèm phở bò, bánh cuốn chả lụa; cao điểm tối thèm cá kho tộ, thịt kho trứng (mang về ăn cơm nhà); test timeBandAt.
- GĐ1779: khung tối muộn (20–22h) khách thèm đồ nhắm — mực khô nướng, cánh gà chiên mắm; test timeBandAt.
- GĐ1778: QA trình duyệt món nấu hot GĐ1774–1777 — 17/18 lễ có món nấu, tên tra đúng (vd bóng đá → Cánh gà chiên nước mắm), console 0 lỗi.
- GĐ1777: 8/3 sữa chua trái cây, ngày hội phụ nữ sinh tố dưa hấu; test mọi lễ có ≥1 món nấu hot (trừ Sale cuối năm — dịp xả hàng tạp hóa).
- GĐ1776: thêm món nấu hot — Valentine kem dừa, ngày hội xóm chè bắp, 20/11 hộp quà trà bánh quy; test describe.each mở rộng.
- GĐ1775: thêm món nấu hot — chợ đêm bánh tráng nướng, Tết dương lẩu viên thập cẩm, tựu trường bánh mì que; test describe.each mở rộng.
- GĐ1774: lễ hội có món nấu hot — Giáng sinh gà nướng mật ong, giải bóng đá phường cánh gà chiên mắm, hội thi làm bánh bánh flan; test describe.each.
- GĐ1773: test bảo đảm mọi nghề (trừ đầu bếp — chỉ mua nguyên liệu) thích ≥1 món nấu; hiện 37/37 đạt.
- GĐ1772: QA trình duyệt like GĐ1760–1771 — 38 nghề, mọi id like tra ra sản phẩm có tên (vd sư thầy → Chè hạt sen), console 0 lỗi.
- GĐ1771: bác sĩ về hưu thích cháo yến mạch, vệ sĩ quán bar thích mực khô nướng; test it.each mở rộng.
- GĐ1770: nhân viên ngân hàng thích bánh mì jambon, tài xế bus thích cơm cá cơm rim; test it.each mở rộng.
- GĐ1769: bác sĩ thích cháo gà, HLV gym thích ức gà nướng; test it.each mở rộng.
- GĐ1768: thợ cắt tóc thích bánh bao kim sa, công an thích cơm sườn nướng (id like đã được test productById canh); test it.each mở rộng.
- GĐ1767: thợ sửa xe thích hủ tiếu Nam Vang, thợ điện thích bánh mì que; test it.each mở rộng.
- GĐ1766: bán hàng online thích cơm chiên lạp xưởng, chủ quán phở thích bún bò Huế; test it.each mở rộng.
- GĐ1765: test chặn like món nấu cấp ≤30 mới (12 món cũ đóng băng LEGACY) — giữ simGolden cấp 30 không lệch như GĐ1764.
- GĐ1764: pha chế thích cà phê phin sữa (cấp 64; bạc xỉu cấp 26 làm lệch simGolden cấp 30 nên bỏ), influencer thích bánh flan; test it.each mở rộng.
- GĐ1763: giáo viên thích phở bò, freelancer thích mì Ý sốt bò — nghề 7 món thích có món nấu; test it.each mở rộng.
- GĐ1762: phóng viên thích cà phê trứng, ngư dân thích cá kho tộ — nghề 6 món thích có món nấu; test it.each mở rộng.
- GĐ1761: thợ may thích bánh mì pate, hớt tóc vỉa hè thích bánh tráng nướng — nghề 5 món thích có món nấu; test it.each mở rộng.
- GĐ1760: nghề ít món thích được thêm món nấu — CSGT thích bánh mì thịt, sư thầy thích chè hạt sen; test it.each mở rộng.
- GĐ1759: chống phình đơn tiệc — test trần ≤45 đơn (hiện 40), id không trùng, không hai đơn một-món trùng món.
- GĐ1758: QA trình duyệt 4 đơn tiệc mới GĐ1754–1757 — tải từ dev server, tên món khớp sản phẩm, console 0 lỗi.
- GĐ1757: đơn tiệc "Cuộc nhậu xóm" (tổ dân phố, cấp 37) đặt 16 gỏi xoài tôm khô — gỏi xoài có đầu ra đơn đặt; test describe.each mở rộng.
- GĐ1756: đơn tiệc "Liên hoan cuối kỳ" (lớp 11A, cấp 39) đặt 16 mít chiên giòn — món mít có đầu ra đơn đặt; test describe.each mở rộng.
- GĐ1755: đơn tiệc "Tiệc đầy tháng" (nhà chị Tư, cấp 44) đặt 16 chè gấc — chè gấc có đầu ra đơn đặt; test describe.each mở rộng.
- GĐ1754: đơn tiệc "Tiệc tân gia" (anh Hai mới dọn về hẻm, cấp 42) đặt 16 gỏi bưởi tôm — gỏi bưởi có đầu ra đơn đặt; test describe.each mở rộng.
- GĐ1753: guard chống phình — mỗi nghề tối đa 15 món thích (dài nhất hiện 14).
- GĐ1752: y tá thích Nhãn đá xay (sau ca trực) — test trong farmOutletDishes.
- GĐ1751: bà nội trợ thích Kem sữa dê (mua cho con) — test trong farmOutletDishes.
- GĐ1750: sinh viên thích Vải đá xay — test trong farmOutletDishes.
- GĐ1749: guard chống phình — hot list lễ hội có trần (Tết ≤18, lễ khác ≤10), không lặp id.
- GĐ1748: Tết Nguyên Đán hút Chè gấc (gấc đỏ màu Tết) — test trong farmOutletDishes.
- GĐ1747: đổi tên test fruitOutletDishes → farmOutletDishes (đã gồm cả sữa dê).
- GĐ1746: Mùa hè hút Kem sữa dê — test trong fruitOutletDishes.
- GĐ1745: QA trình duyệt Chè gấc (44, 6×14k) + Kem sữa dê (45, 8×13k) — nạp đúng, không lỗi console.
- GĐ1744: món Kem sữa dê (máy xay, mở 45; sữa dê + đường → 8×13k) — lối ra bếp thứ 2 cho sữa dê (sau sữa chua dê); test trong fruitOutletDishes.
- GĐ1743: guard cropOutlets mở rộng sang 7 sản phẩm vật nuôi — mỗi loại ≥2 lối ra chế biến.
- GĐ1742: guard test cropOutlets — mỗi cây trồng (21 loại) có ≥2 lối ra chế biến (bếp + quán).
- GĐ1741: món Chè gấc (ấm nấu, mở 44; gấc + đường → 6×14k) — lối ra bếp thứ 2 cho gấc; test trong fruitOutletDishes.
- GĐ1740: QA trình duyệt đợt GĐ1734–1739 — Gỏi xoài tôm khô/Nhãn đá xay/Vải đá xay + hot Lễ 30/4 & Mùa hè nạp đúng, không lỗi console.
- GĐ1739: Mùa hè hút Vải đá xay + Nhãn đá xay (trùng mùa vải 5–7, nhãn 7–9) — test trong fruitOutletDishes.
- GĐ1738: guard test — id đồ uống quán không trùng id hàng/món (cho phép 2 trùng cũ nuoc_mia, bac_xiu; kiểm cả danh sách cũ không thừa).
- GĐ1737: món Vải đá xay (máy xay, mở 43; vải 2 + đường + đá → 8×15k) — lối ra bếp thứ 2 cho vải; tránh trùng id sinh_to_vai của quán; test trong fruitOutletDishes.
- GĐ1736: món Nhãn đá xay (máy xay, mở 41; nhãn 2 + đường + đá → 8×15k) — lối ra bếp thứ 2 cho nhãn; test trong fruitOutletDishes.
- GĐ1735: Lễ 30/4 hút Gỏi xoài tôm khô (đúng mùa xoài 3–6) — test trong fruitOutletDishes.
- GĐ1734: món Gỏi xoài tôm khô (nồi hấp, mở 37; xoài 2 + tôm khô + nước mắm → 8×15k) — lối ra bếp thứ 2 cho xoài; test trong fruitOutletDishes.
- GĐ1733: QA trình duyệt Gỏi bưởi tôm (42, 8×22k) + Mít chiên giòn (39, 10×15k) — nạp đúng, không lỗi console.
- GĐ1732: học sinh thích Mít chiên giòn (ăn vặt) — test trong fruitOutletDishes.
- GĐ1731: gộp test Gỏi bưởi tôm + Mít chiên giòn thành fruitOutletDishes (describe.each).
- GĐ1730: món Mít chiên giòn (chảo chiên, mở 39 — cấp 40 đã đủ 13 công thức; mít 3 + dầu ăn → 10×15k) — lối ra bếp thứ 2 cho mít; test mitChienGion.
- GĐ1729: Tết Nguyên Đán hút Gỏi bưởi tôm (đúng mùa bưởi 12–2) — test trong goiBuoiTom.
- GĐ1728: món Gỏi bưởi tôm (nồi hấp, mở 42; bưởi 2 + tôm tươi + nước mắm → 8×22k) — lối ra bếp thứ 2 cho bưởi trại; test goiBuoiTom.
- GĐ1727: QA trình duyệt đợt sả GĐ1719–1726 — Sả chanh đá, thực đơn trưa ×2.2, cao điểm trưa, đơn Đám hỏi đều nạp đúng; không lỗi console.
- GĐ1726: quán nước thêm Sả chanh đá (mở 41, 16k, chanh + sả) — test trong quanTraSa.
- GĐ1725: cao điểm trưa (rhythm) muốn Gà/Bò xào sả — test trong saDishes.
- GĐ1724: Gà/Bò xào sả vào thực đơn trưa tiện lợi 24/7 (mealFactor ×2.2 lúc 11h–15h) — test trong saDishes.
- GĐ1723: gộp test món xào sả thành saDishes (describe.each); Bò xào sả nay cũng được kiểm công thức duy nhất + có trong COOKED_PRODUCTS.
- GĐ1722: gộp test đơn tiệc chuỗi sả thành saPartyOrders (describe.each) + quét seed chứng minh đơn đám hỏi thật sự được mời.
- GĐ1721: lễ hội làng hút thêm Bò xào sả (hot list) — test trong tetXoiGac.
- GĐ1720: đơn tiệc Đám hỏi nhà cô Sáu — 16 Bò xào sả, mở 54, thưởng 380k — test boXaoSaOrder.
- GĐ1719: dân chạy bộ thích Bò xào sả (bữa đạm) — thêm dòng vào professionLikesSa.
- GĐ1718: QA trình duyệt Bò xào sả — công thức + món nạp đúng trong game (8 phần, 45k), không lỗi console.
- GĐ1717: món Bò xào sả (chảo chiên, mở 54; bò tươi + sả + nước mắm → 8×45k) — test boXaoSa.
- GĐ1716: guard test — danh sách thích của mỗi nghề không lặp món.
- GĐ1715: chống phình test — gộp 5 test sở thích sả thành professionLikesSa (it.each).
- GĐ1714: bộ đội thích gà xào sả (bữa no khi về phép) — test soldierGaXaoSa.
- GĐ1713: nông dân thích gà xào sả (bữa trưa ngoài đồng) — test farmerGaXaoSa.
- GĐ1712: đầu bếp thích sả (gia vị cạnh tỏi/hành khô) — test chefSa.
- GĐ1711: bà nội trợ thích sả tươi — x_sa có cầu lẻ hằng ngày (test momSa).
- GĐ1710: thợ xây thích gà xào sả — món mới có cầu hằng ngày (test constructionGaXaoSa).
- GĐ1709: đơn tiệc mới "Mâm cỗ giỗ ông" 🕯️ (cấp 52, 16 gà xào sả, thưởng 260k/170 XP) — test gaXaoSaOrder (có quét cấp 60 thấy được mời).
- GĐ1708: lễ hội làng (nấu cỗ) thêm ga_xao_sa vào hàng hot — test tetXoiGac.
- GĐ1707: QA trình duyệt 127.0.0.1:5173 — bản chạy có cây sả (5 ngày/6k/thu 6, có dáng), Trà sả đá, Gà xào sả, không còn x_nuoc_mam, hàng _tp ghi "(làm sẵn)"; console không lỗi. Không đổi code.
- GĐ1706: món mới Gà xào sả (chảo chiên, cấp 52: gà nguyên con + sả 2 + nước mắm → 8 phần × 32k) — test gaXaoSa.
- GĐ1705: FARM_ORDER_POOL nối thêm x_sa ở cuối — đơn nông trại có thể xin sả; test farmOrderPool.
- GĐ1704: nông trại trồng được Sả 🌿 (cấp 40, 5 ngày, hạt 6k, thu 6) — dáng bụi lá dài; cấp cho đậu hũ/cá basa chiên sả, trà sả đá. Test cropSa.
- GĐ1703: quán nước thêm món mát "Trà sả đá" 🌿 (cấp 40, 15k: trà + sả + đường + đá) — lối ra quán cho sả; test quanTraSa.
- GĐ1702: test tên-nguyên liệu (bếp + quán) tự kiểm mỗi luật bắt được tên mẫu và không khớp nhầm — chống regex câm với chữ Việt.
- GĐ1701: test khoá tên món quán nước khớp nguyên liệu (gừng/dừa/chanh/cam/sữa/tắc/mật ong/bạc hà) — hiện đã sạch, quanNameIngredients.
- GĐ1700: công thức recipe_kem đổi tên "Kem trái cây tự làm" khớp món nấu ra; test khoá mọi công thức bếp trùng tên món đầu ra.
- GĐ1699: test khoá tên/id công thức bếp và món quán nước duy nhất (hiện đã sạch) — recipeNamesUnique.
- GĐ1698: "Bánh tráng nướng trứng" (món nấu) và "Bánh tráng (xấp lớn)" (x_banh_trang) — hết hẳn mặt hàng trùng tên, test productNamesUnique không còn ngoại lệ.
- GĐ1697: 13 hàng làm sẵn *_tp thêm hậu tố "(làm sẵn)" để khỏi trùng tên món tự nấu; danh sách trùng cũ 10→2 (bánh tráng, bánh tráng nướng).
- GĐ1696: món nấu hot_vit_lon đổi tên "Hột vịt lộn rau răm" (tách khỏi hàng sống hotvit); danh sách trùng cũ 11→10.
- GĐ1695: tách tên 5 cặp hàng trùng tên khác hàng (Áo mưa bộ, Cá basa phi lê (ký), Lạp xưởng (ký), Chả cá thác lác (ký), Bánh pía (hộp 4 cái)) — đổi tên hiển thị, giữ mã/giá; danh sách trùng cũ 16→11.
- GĐ1694: test chặn mặt hàng trùng tên mới (16 cặp cũ khoá trong danh sách chỉ được giảm, phần lớn cố ý *_tp vs món nấu) — productNamesUnique.
- GĐ1693: test tên món mở rộng (cốt dừa/nước dừa/nước mắm/xì dầu) lộ ra x_nuoc_mam (GĐ1686) trùng nuocmam có sẵn → xoá mã trùng, cá viên chiên nước mắm dùng nuocmam; bản lưu còn mã cũ được đổi tên lúc nạp (PRODUCT_ALIASES/aliasProductIds, save.ts).
- GĐ1692: test chặn tên món ghi gia vị (sả/tỏi/gừng/mật ong) mà công thức thiếu nguyên liệu đó, công thức mở >30 — recipeNameIngredients.
- GĐ1691: bánh mì bơ tỏi nay dùng tỏi — test banhMiBoToi.
- GĐ1690: cá basa chiên sả dùng sả thay gừng — test caBasaSa.
- GĐ1689: mực khoanh chiên giòn nay dùng bột chiên giòn — test mucKhoanhBot.
- GĐ1688: cá rô phi chiên xù nay dùng bột chiên giòn, mẻ 5→6 — test caRoPhiXu.
- GĐ1687: cánh gà nướng → "Cánh gà nướng mật ong", dùng mật ong, mẻ 8→10 — test canhGaMatOng.
- GĐ1686: thêm Nước mắm chai (x_nuoc_mam, cấp 40); cá viên chiên nước mắm dùng nó, mẻ 6→9 — test caVienMam.
- GĐ1685: cá hồi hấp xì dầu nay dùng nước tương — test caHoiXiDau.
- GĐ1684: tôm hấp nước dừa nay dùng nước dừa hộp, mẻ 6→7 để vẫn lãi — test tomHapDua.
- GĐ1683: thêm Sả (x_sa, cấp 40) vào danh mục; đậu hũ chiên sả nay dùng sả — test dauHuSa.
- GĐ1682: mực hấp gừng nay dùng gừng (lối ra thêm cho gừng nông trại) — test mucHapGung.
- GĐ1681: chè khoai môn nấu thêm nước cốt dừa, mẻ 6→8 chén để vẫn lãi — test cheKhoaiMonDua.
- GĐ1680: bắp ngọt nướng mỡ hành nay dùng thêm hành lá (trước chỉ có bắp) — test bapMoHanh.
- GĐ1679: đơn xôi gấc đám cưới nâng thưởng 240k/160 XP — ngang các đơn món nấu khác (180–260k).
- GĐ1678: đơn tiệc mới 💒 Mâm xôi gấc đám cưới (cấp 43, 30 phần xôi gấc, thưởng 240k) — lối bán lớn cho gấc nhà trồng; test sweep GĐ267 chỉ xét đơn đã mở ở cấp 40.
- GĐ1677: Hội thi làm bánh hút Trứng ngỗng (nguyên liệu bánh flan, trại có ngỗng bán được giá).
- GĐ1676: test mọi giống (kể cả gấc/thơm/gừng mới) dựng được mô hình 3D ở cả 4 giai đoạn, giai đoạn chín đủ cỡ.
- GĐ1675: Tết Trung thu hút Bưởi (mâm cỗ trông trăng) + Chè bưởi.
- GĐ1674: mùa mưa hút Chè trôi nước (món ấm có gừng, cấp 38).
- GĐ1673: mùa hè hút Chè Thái (món mát, cấp 40 — không đụng sim cấp ≤30).
- GĐ1672: bếp thêm Chè chuối (cấp 44, nồi nước) — chuối nhà trồng + cốt dừa. (Trà mứt gừng giữ dùng mứt Tết: đổi sang mứt gừng bà Tám sẽ làm mứt Tết mất lối ra duy nhất.)
- GĐ1671: nhà bà Tám bán thêm Mứt gừng (cấp 45, chỉ hàng xóm) — hút hàng dịp Tết.
- GĐ1670: đơn quán xóm lấy thêm thơm/gừng/gấc nhà trồng (nối cuối pool, giữ thứ tự cũ).
- GĐ1669: test khóa mọi id hàng hot/goods của lễ hội là món có thật (gõ sai id sẽ âm thầm vô tác dụng) — hiện 0 id lỗi.
- GĐ1668: Lễ hội làng (nấu cỗ) cũng hút Xôi gấc.
- GĐ1667: Tết Nguyên Đán hút Xôi gấc (thêm vào hàng hot dịp Tết).
- GĐ1666: quán nước thêm 🔴 Nước ép gấc (cấp 43) — gấc trại có lối ra thứ hai.
- GĐ1665: nông trại thêm giống 🔴 Gấc (cấp 43, giàn trái đỏ) → tiệm xôi thêm Xôi gấc (cấp 43); mở 43 để mốc kinh tế tiệm xôi cấp 42 không đổi.
- GĐ1664: Chè trôi nước thêm gừng vào công thức (đúng món thật, gừng trại thêm lối ra) — vẫn lời.
- GĐ1663: quán nước thêm 🍊 Cam gừng đá (cấp 37) — gừng trại có món mát (trước chỉ trà gừng nóng).
- GĐ1662: bếp thêm Canh chua cá (cấp 42, nồi nước: cá + thơm trại + cà chua + nước mắm).
- GĐ1661: bếp thêm Trứng ngỗng luộc (cấp 45) — trứng ngỗng trại có lối ra thứ hai; giá giữ lời khuyên "bán lẻ hời hơn".
- GĐ1660: bếp thêm Hột vịt muối (cấp 44, nồi nước) — trứng vịt trại có lối ra thứ hai.
- GĐ1659: bếp thêm Gà Đông Tảo hấp gừng (cấp 43, nồi nước) — gà quý + gừng trại; giá giữ dưới gà nướng để lời khuyên "bán lẻ hời hơn" không đổi.
- GĐ1658: quán nước thêm 🐐 Sữa dê đá (cấp 36) — sữa dê trại có lối ra thứ hai (trước chỉ 1 công thức bếp).
- GĐ1657: mít 🍈 (trước trùng 🍍 với thơm), nếp 🍙 (trước trùng 🌾 với lúa) — test mỗi giống một icon.
- GĐ1656: lúa nếp/đậu xanh có dáng riêng trên luống (trước rơi về dáng cây ăn trái) + test mọi giống đều có dáng.
- GĐ1655: bếp thêm món "Cá kho thơm" (bếp nồi nấu, cấp 41: cá + thơm + nước mắm hàng xóm → 8 phần) — thơm nay trồng được ở trại; test caKhoThom; full xanh (longSessionLeak đỏ lẻ do tải, chạy lại xanh).
- GĐ1654: thử thách tuần "Lời từ dịch vụ"/tháng "Dịch vụ đều tay" ≤ 70% sức kiếm cả kỳ của dịch vụ đang có (truyền biz.services vào target/desc, closeWeek/closeMonth, chip HUD, PeriodTabs); test serviceQuestCap; full 589/5230 xanh.
- GĐ1653: việc ngày "Lời từ dịch vụ" ≤ 70% lời kỳ vọng của dịch vụ đang có (cấp 10 chỉ nạp tiền: 47k → ≤19k vì sức kiếm ~27k); thử thách tuần/tháng dịch vụ chưa đổi (chỉ theo cấp); test serviceQuestCap; full 589/5229 xanh.
- GĐ1652: nông trại thêm giống "🫚 Gừng" (cấp 36, 6 ngày, 4 củ) tự cung Trà gừng nóng + món bếp có gừng; test gungCrop; full 588/5225 xanh.
- GĐ1651: nông trại thêm giống "🍍 Thơm (dứa)" (cấp 34, 9 ngày, 4 trái) tự cung quán nước Trà dứa/Nước ép thơm; test thomCrop; full 587/5222 xanh.
- GĐ1650: quán nước thêm món mát "🍍 Nước ép thơm" (cấp 35, thơm + đường + đá; giữ nguyên 3 đồ nóng); sửa test nút nhập gấp theo nhãn "Thiếu X" của GĐ1649; test quanEpThom.
- GĐ1649: nút "⚡ Nhập gấp & giao" (bán sỉ) thiếu tiền ghi "Thiếu X"; đơn nhập ghi "thiếu X" thay vì "không đủ tiền"; test shortLabel.
- GĐ1648: sổ nợ — nút "Nhắc nợ" đã bấm ghi "✅ Đã nhắc"; test debtRemindLabel.
- GĐ1647: nút "Học" kỹ năng khi hết điểm ghi "Hết điểm — cấp N" (cấp có điểm kế tiếp); test skillNextPoint.
- GĐ1646: nút "📣 Đăng bài" (MXH) khi khóa nêu lý do trên nút (🔒 cấp / cần N theo dõi); test socialPromoLabel.
- GĐ1645: bước cốt truyện cấp 100 không còn gọi là "mốc cuối game" (trần cấp 200); test storyLevel100Text.
- GĐ1644: rà mục tiêu khách ở cấp 200 — khách cơ sở 20+4×cấp = 820/ngày, việc "Đón khách" 204/"Khách vui vẻ" 247 vẫn khả thi → không sửa, thêm test khóa ≤50% customersPerDay mọi cấp. Xong đợt rà mục tiêu theo cấp sau khi nâng trần 200 (GĐ1641–1644).
- GĐ1643: mục tiêu thu hoạch trại vượt sức trại (cấp 8 đòi 12 khi 4 luống chỉ ra ~10,7/ngày; cấp 200 đòi 185/ngày, 620/tuần, 3150/tháng khi trần ~32/ngày) → cắt ở 70% farmDailyCap (luống bậc đất đã mở được × cây sai nhất). 5210 test xanh.
- GĐ1642: đơn nấu qua điện thoại chỉ ~1,4–1,75 đơn/ngày (9 khung × xác suất gọi × 30%) mà việc ngày đòi 6 (cấp 21) → 12 (cấp 50), tuần đòi 4+cấp → cắt theo expectedCookOrdersPerDay (ngày ≥1, tuần 70% × 7 ngày). 5209 test xanh.
- GĐ1641: cấp tối đa 200 làm mục tiêu đơn app vượt trần đơn thật (việc ngày 45 đơn vs trần ~25; tuần 210 vs ~175) → cắt ở 70% onlineOrderCap 5★ cho việc ngày, thử thách tuần, tháng; cấp thấp giữ nguyên. QA trình duyệt GĐ1638/1640: gợi ý combo/gieo hiện trong bảng Nhiệm vụ. 581 tệp/5208 test xanh.
- GĐ1640: việc ngày "Thu hoạch trại" và thử thách tuần/tháng thu hoạch nêu "trại chưa gieo luống nào: gieo ở 🌱 Mở rộng › 🚜 Trang trại" (QuestContext.plantedPlots, không vào save).
- GĐ1639: thử thách tuần/tháng đo combo hiện "⚠️ Chưa bật combo nào: bật ở ⋯ Thêm › 🎁 Combo" khi chưa bật (periodBlocker).
- GĐ1638: việc ngày "Bán theo combo" khi chưa bật combo nào ghi chỗ bật (⋯ Thêm › 🎁 Combo); giữ chỗ, bộ việc không xáo (QuestContext.activeCombos, không vào save).
- GĐ1637: nút gieo hạt ở vườn khi thiếu tiền ghi "(Thiếu X₫)" thay cho giá. Cả bộ: 3 test hàng cuối run đỏ do việc dở dang chưa commit của phiên khác (lateGameProducts), không đụng.
- GĐ1636: nút lắp máy bán hàng tự động ở chi nhánh khóa và ghi "Thiếu X₫" khi thiếu tiền. Rà xong bảng việc còn lại của 2 tài liệu tham khảo: phần chưa làm đều chờ siêu thị nhiều khu.
- GĐ1635: nút nâng bậc quán nước khóa khi thiếu tiền và ghi "Thiếu X₫" (trước bấm mới báo); QA trình duyệt GĐ1631: bảng Xây dựng hiện "Thiếu 149.000đ". saveStore/longSessionLeak đỏ khi cả bộ chạy song song với phiên khác, chạy riêng xanh.
- GĐ1634: nhãn "Thiếu X₫" phủ nốt chi nhánh (mặt bằng, lắp nâng cấp đêm), cam kết hợp đồng, nhận lô chợ phiên, nâng kho, tiệm xôi (mở/tuyển/mở rộng), nâng sạp. 5204 test xanh.
- GĐ1633: Đào tạo/Thăng chức nhân viên, gọi Grab đơn app, mua quảng cáo cũng ghi "Thiếu X₫" khi thiếu tiền — hết nút mua xám câm trong panels. 5203 test xanh.
- GĐ1632: nút Xin cấp/Gia hạn giấy phép, Mở gian hàng online, Xin lỗi MXH, Mua nâng cấp tiệm cũng ghi "Thiếu X₫" khi thiếu tiền (shortLabel). 5202 test xanh.
- GĐ1631: bảng Xây dựng — nút "Chọn" đồ và "Thuê thợ" mở rộng khi thiếu tiền ghi "Thiếu X₫" thay vì nút xám câm (helper shortLabel + test). 580 tệp/5202 test xanh.
- GĐ1630: rà nốt playtest đợt 2 — M3 (đồ gia dụng vốn không hết hạn; tên đã gộp) và M5 (groupTools gom nhóm) đã xong từ trước, M7 màn ngang 812×375 không cuộn/không tràn → không sửa; thêm test khóa đồ gia dụng hạn vô tận.
- GĐ1629: playtest persona đợt 3 (khung 440 px, autoplay 5 ngày, 127.0.0.1) → PHAN-TICH-PLAYTEST-PERSONA-DOT3-2026-11-07.md: ngày 1 rõ, tổng kết đã nêu khách bỏ về vì hết hàng; việc tiếp: rà bảng quán nước/tiệm xôi tìm nút bị chặn câm. Save QA đã xóa.
- GĐ1628: chip la bàn HUD hiện "🔒 cấp N" thay cho "0/1" khi bước cốt truyện bị chặn cấp (storyLockLevel; không thêm nút/thông báo). Rà đơn nông sản: đã lọc theo trại làm được. QA cấp 3 chip "Kho rộng hơn 🔒 cấp 8"; save QA đã xóa.
- GĐ1627: test chặn việc ngày có mục tiêu ≤0 (tự xong) — quét 10 mốc cấp × 28 ngày × 3 thời tiết: sạch. Full suite 578 file xanh sau chỉnh câu dịch vụ GĐ1626.
- GĐ1626: thử thách tuần/tháng (tab 📊 Lãi lỗ / 📆 Tháng) thêm dòng ⚠️ lý do chưa làm được — chưa mở dịch vụ, gian hàng app chưa nhận đơn, dưới 20 người theo dõi, chưa có bếp/người giao — qua periodBlocker dùng chung điều kiện việc ngày. QA cấp 30 tuần 2 thấy "⚠️ Chưa mở dịch vụ nào"; save QA đã xóa.
- GĐ1625: việc "Lên mạng xã hội" khi dưới 20 người theo dõi (đăng quảng bá bị chặn) → "cần 20 người theo dõi (đang N): bán tốt để khách khen trên mạng"; bộ việc không đổi. QA cấp 30 thấy "(đang 0)"; save QA đã xóa.
- GĐ1624: việc "Giao đơn app" khi gian hàng app chưa mở/đang tạm ngưng → "chưa nhận đơn: mở ở 🌱 Mở rộng › 📲 Online" (giữ chỗ, không xáo bộ). Rà chương truyện (không tuần tự, không kẹt) và trại (có luống sẵn) — không cần sửa. QA cấp 30 thấy gợi ý; save QA đã xóa.
- GĐ1623: rà thành tựu — trạm nấu 9≥8, đồ nhà 5≥4, thú cưng 2, khách quen 28≥10: đều đạt được; thêm test achievementReachable chặn tái phát (không đổi gameplay, không cần QA trình duyệt).
- GĐ1622: bước "Thuê N nhân viên" nêu cấp đủ chỗ theo trần maxStaff (3 người → cấp 10, 5 → 16, 10 → 31) thay vì chỉ cấp 4; QA cấp 7 thấy "Thuê 3 nhân viên — mở từ cấp 10"; save QA đã xóa.
- GĐ1621: SỬA KẸT CỐT TRUYỆN — story_warehouse_7 đòi bậc kho 7 và story_shop_tier_7 đòi bậc mặt bằng 7 (tối đa là 6) nên không bao giờ xong, chặn mọi bước sau; sửa target thành 6, shop_tier_6 trỏ đúng Siêu thị khang trang (5). storyGateLevel nhận dạng theo id thay vì mã hàm. Test chặn bậc vượt trần; QA thấy 6/6.
- GĐ1620: mọi bước cốt truyện bị chặn cấp (kho cấp 8, mở rộng cấp 6, thuê người cấp 4, hợp đồng cấp 14…) tự ghi "— mở từ cấp N" qua storyGateLevel; QA cấp 3 thấy "Nâng cấp nhà kho 1 lần — mở từ cấp 8"; save QA đã xóa.
- GĐ1619: QA trình duyệt GĐ1618 — cấp 10, bảng nhiệm vụ hiện "Đối tác đầu tiên … hợp đồng mở từ cấp 14"; story_orders_5/20 là đơn tiệc (không cần người giao) nên không cần gợi ý; save QA đã xóa (0 DB).
- GĐ1618: bước cốt truyện "Đối tác đầu tiên" khi dưới cấp 14 ghi "hợp đồng mở từ cấp 14" (không kẹt câm); test storyContractHint.
- **GĐ1617** — QA trình duyệt GĐ1616 (cấp 10, ván mới): "Lời 47.000đ từ dịch vụ — chưa mở dịch vụ nào: mở ở 📈 Kinh doanh". Save tạm đã xoá từ trang không mở game (0 IndexedDB).
- **GĐ1616** — "Lời từ dịch vụ" hiện từ cấp 3 dù chưa mở dịch vụ nào: mô tả thêm "— chưa mở dịch vụ nào: mở ở 📈 Kinh doanh" (`hasService` tính trực tiếp từ biz.services). Đã rà hết 15 việc ngày: các việc còn lại đều làm được với tiệm ván mới. Full suite 575/5185 xanh.
- **GĐ1615** — QA trình duyệt GĐ1614: có Bếp nướng, không nhân viên → "Giao 7 đơn nấu — cần thuê 🛵 Giao hàng để khách gọi điện đặt". Bài học QA: xoá save tạm phải chạy từ trang KHÔNG mở game (vd. `/src/data/critic.ts`), nếu không game lưu lại ngay — save tạm GĐ1613 đã sót và nay đã xoá sạch (0 IndexedDB trên 127.0.0.1).
- **GĐ1614** — "Giao đơn nấu" khi có bếp nhưng chưa có người giao (điện thoại không đổ chuông → không thể có đơn): mô tả đổi thành "… — cần thuê 🛵 Giao hàng để khách gọi điện đặt" (`hasCourier` tính trực tiếp, không lưu). Full suite 575/5184 xanh.
- **GĐ1613** — QA trình duyệt GĐ1612 (save tạm 127.0.0.1, đã xoá): bảng Nhiệm vụ cấp 26 hiện "Bán 24 món nhà làm — tiệm chưa có bếp: mua ở 🛠️ Xây dựng" gọn 1 dòng (cao 16px).
- **GĐ1612** — Việc ngày "Bán món nhà làm"/"Giao đơn nấu" hiện từ cấp 21 kể cả khi tiệm chưa có bếp (không làm được). Nay giữ chỗ trong bộ (không xáo danh sách khi mua bếp giữa ngày) nhưng mô tả thêm "— tiệm chưa có bếp: mua ở 🛠️ Xây dựng" (`hasCookStation` tính trực tiếp, không lưu → save cũ an toàn; hẻm online tính trên state đồng bộ). Full suite 575/5183 xanh.
- **GĐ1611** — QA trọn vòng nhà phê bình trong ván thật (127.0.0.1, save tạm đã xoá): gọi "Bánh tráng trộn" (Bếp nướng, 10 phút) → bày lên kệ → +500.000đ, "🌟 Nhà phê bình khen…", hết lời hẹn.
- **GĐ1610** — QA nhà phê bình trong ván thật (save khách tạm trên 127.0.0.1, origin riêng — không đụng save ngày 37 ở localhost): cấp 50 + chỉ Bếp nướng → gọi "Bánh mì kẹp xà lách (Bếp nướng)" (8 phút, mở cấp 47) rồi "Bánh pía nướng nóng (Bếp nướng)"; thông báo hiện trên HUD. Save QA đã xoá.
- **GĐ1609** — Rà K2/K3 (chợ đồ cũ, tủ trao đổi): hẻm online là MỘT tiệm chung (kho/tiền dùng chung, server chỉ chuyển state/act/lock) → trao đổi trong hẻm vô nghĩa; giữa các hẻm cần kho lưu mới trên server → giữ chờ backend. Full suite 574/5181 xanh sau GĐ1608.
- **GĐ1608** — Nhà phê bình chỉ gọi món nấu xong trong 25 phút (khung 30 − 5 phút bày kệ); món 30 phút trước đây xong đúng lúc hết hẹn → phạt dù nấu ngay. Rà "trang trí nhiều lớp": sơn tường/nền cả tiệm đã có (`style`); nền riêng từng khu cần đổi tìm đường (đồ hiện chắn lối) → giữ chờ siêu thị nhiều khu.
- **GĐ1607** — QA trình duyệt GĐ1604–1606 (nạp module qua Vite, không đụng save thật ngày 37): tiệm chỉ có Bếp nướng ở cấp 50 → 5/5 lần gọi đều món nướng, câu "… (Bếp nướng) — phục vụ trong 30 phút!" gọn 1 dòng. Full suite 574/5180 xanh.
- **GĐ1606** — Thông báo nhà phê bình gọi món ghi kèm bếp đang có để nấu ("… gọi Xôi gấc (Bếp xôi) — …"); không thêm thông báo mới (`criticCallText`).
- **GĐ1605** — Nhà phê bình lọc như đơn điện thoại: chỉ gọi món nấu được bằng trạm ĐANG có trong tiệm và không trái mùa (không khớp gì thì lùi về mọi món đã mở). Rà HappyTown P0/P1: ngoại hình riêng khách quen + nhờ vả nhiều ngày đã có.
- **GĐ1604** — Sửa nhà phê bình (rà lại KE-HOACH I1): từ cấp 45 trước đây có thể gọi món khóa tới cấp 100 → không nấu được, phạt 3★1 chắc chắn. Nay nghiêm ngặt gọi mọi món ĐÃ MỞ (kể cả món mới mở); nhẹ chỉ gọi món mở từ ≥10 cấp. Chạy ở máy chạy sim như cũ → hẻm online không đổi. Đối chiếu xong 6 tài liệu tham khảo: mọi mục còn lại đều chờ siêu thị phase 2/backend.
- **GĐ1603** — Mẹo cấp 32: mốc sao món nấu 20/100/800 lượt và dòng đếm 3★ ở Sổ nấu.
- **GĐ1602** — Đầu Sổ nấu hiện "🏆 N món đã đạt 3★" (maxedDishLine). QA trình duyệt nhãn GĐ1601 hiện đúng; save QA đã xoá.
- **GĐ1601** — Sổ nấu: món đã 3★ hiện "🏆 bậc cao nhất" thay vì để trống mục tiêu (dishMaxLabel). Rà KE-HOACH I4/K1: kiên nhẫn 60%, trần vắng mặt 30+cấp×5, nút Nhập đủ đều đã có.
- **GĐ1600** — Rà soát + QA save mới: bán đầu tiên ~35s, không lỗi console. Chuỗi GĐ1591–1599 (tặng quà, gắp trúng) đều là đếm/hiển thị, không đổi kinh tế; mọi trường mới tuỳ chọn. Lưu trữ GĐ1565–1572. Save QA đã xoá.
- **GĐ1599** — QA trình duyệt nút 🎁 (save QA cấp 40): "Kho hết Sữa hộp — nhập thêm để tặng" và "Chưa quen…" hiện đúng. Save QA đã xoá.
- **GĐ1598** — Nút tặng quà khi kho trống gọi tên món khách thích đã biết ("Kho hết X — nhập thêm để tặng"); món chưa khám phá vẫn giấu.
- **GĐ1597** — Nhiệm vụ "Tặng quà khách quen" thêm dòng hướng dẫn chỗ bấm 🎁.
- **GĐ1596** — Test store cho thông báo tặng quà + QA trình duyệt: "… +3 thân thiết · hôm nay đã tặng hết". Save QA đã xoá.
- **GĐ1595** — Thông báo tặng quà kèm "còn tặng được N khách" / "đã tặng hết".
- **GĐ1594** — Mẹo máy gắp (cấp 44) chỉ chỗ xem số lần trúng.
- **GĐ1593** — Tổng kết ngày thêm dòng "🧸 Khách gắp trúng thú bông N lần" (ẩn khi 0). QA trình duyệt dòng tab Dịch vụ GĐ1592.
- **GĐ1592** — Tab Dịch vụ thêm dòng "🧸 Gắp trúng thú bông hôm nay: N lần" (stats.clawWins tuỳ chọn, chỉ đếm, không tiền/RNG).
- **GĐ1591** — QA UI chuỗi tặng quà trên trình duyệt (save QA cấp 40): tặng thành công, bảng Khách quen ghi "đã tặng 1", tổng kết ngày có dòng "🎁 Quà tặng khách quen 1 món". Save QA đã xoá.
- **GĐ1590** — Rà soát + QA save mới: bán đầu tiên ~38s, không lỗi console; chuỗi tặng quà GĐ1584–1589 gọn trong regularGift.ts (nhiệm vụ, báo cáo, XP sinh nhật). Lưu trữ GĐ1557–1564. Save QA đã xoá.
- **GĐ1589** — Mẹo cấp 38: quà sinh nhật ×2 thân thiết +30 XP.
- **GĐ1588** — Tặng quà đúng sinh nhật khách quen +30 XP.
- **GĐ1587** — Bảng Khách quen hiện thêm "đã tặng N" hôm nay.
- **GĐ1586** — Báo cáo cuối ngày thêm dòng "🎁 Quà tặng khách quen".
- **GĐ1585** — Mẹo cấp 38: nhiệm vụ ngày tặng quà khách quen.
- **GĐ1584** — Nhiệm vụ ngày "Tặng quà khách quen" (cấp 38, 2 lần; stats.gifts tuỳ chọn, an toàn save cũ).
- **GĐ1583** — Cảnh báo sàn bẩn trên HUD (cấp 18, sàn ≥30) thêm "đoàn kiểm tra ghé lúc này sẽ lập biên bản" (`dirtInspectionNote`). Thuần UI.
- **GĐ1582** — Mẹo cấp 35: sàn sạch lúc đoàn kiểm tra ghé được khen +50 XP.
- **GĐ1581** — Đoàn kiểm tra khen sàn sạch (cấp 35): +50 XP, ghi trong câu khen (`praiseXp`). Không tiền.
- **GĐ1580** — Rà soát + QA save mới: bán đầu tiên ~41s. Gom: nhắc máy Sổ đầu ngày còn 1 dòng chung (GĐ1579); thông thạo (XP, tiến độ, tổng kết) trong `sellMastery.ts`. Trình duyệt: Sổ tay hiện "Thông thạo: 🥉 1 · 🥈 1 · 🥇 0". Save QA đã xoá.
- **GĐ1579** — Gộp nhắc Sổ đầu ngày: thay dòng riêng máy đánh giày (GĐ1572) bằng 1 dòng chung "Hôm nay <các máy> thu ×1,5" cho mọi máy đang được tăng phí (mưa/cuối tuần/lễ) — `boostedMachinesToday`.
- **GĐ1578** — Máy kẹo bông (cấp 46) ×1,5 cả ngày lễ hội (ngoài cuối tuần); popup "cuối tuần & ngày lễ ×1,5". Test GĐ1549 chọn ngày thường không trùng lễ.
- **GĐ1577** — Sổ tay Tiệm (cấp 36) hiện "Thông thạo: 🥉 N · 🥈 N · 🥇 N" (`masterySummary`). Thuần UI.
- **GĐ1576** — Huy hiệu thông thạo ở bảng chọn hàng kèm tiến độ tới bậc kế ("🥉 320/1.000"; Vàng thì chỉ 🥇); mẹo thông thạo nhắc có XP.
- **GĐ1575** — Lên bậc thông thạo món (cấp 36) thưởng XP Đồng 20 / Bạc 60 / Vàng 150 (`masteryXp`), báo trong tin chúc mừng. Chỉ XP, không tiền; recordDiscovery vẫn LOCAL_ONLY.
- **GĐ1574** — Sửa: chỉ tặng quà khách đã ghé ≥1 lần (trước sổ đếm cả khách chưa gặp, lệch với Sổ đầu ngày). Lỗi "Chưa quen — chờ khách ghé lần đầu".
- **GĐ1573** — Sổ đầu ngày (cấp 38) nhắc "Còn N khách quen có thể tặng quà hôm nay" (chỉ khách đã ghé ≥1 lần; `giftableCount`).
- GĐ1394–1408 + GĐ1490–1505 (chuỗi khu ăn tại chỗ: bàn ghế, khách ngồi ăn, tip, máy thu phí, toilet, decor × sao, sao món, vắng mặt, nhà phê bình, toast ghế, tour HUD, đồ bếp decor, bảng hiệu đặc sản; khoá 1 tab): docs/progress-archive/PROGRESS-GD1490-1505.md
- GĐ1382–1393 (món mới từ nguyên liệu có sẵn, gọn PROGRESS, đổi "Ấm nước nóng" → "Bếp nồi nấu" GĐ1394 xem dòng riêng): chi tiết `docs/progress-archive/PROGRESS-GD1382-1391.md`.
- GĐ960–1005 (tách file thuần + QA trình duyệt, chi tiết): `docs/progress-archive/PROGRESS-GD960-1005.md`
- Các mục GĐ930–949 / GĐ950–959 (tách panel/Hud): `docs/progress-archive/PROGRESS-GD930-949.md` · `docs/progress-archive/PROGRESS-GD950-959.md`
- Archive giai đoạn cũ (grep "GĐxx"): PROGRESS-GD1292-1381.md · PROGRESS-GD1287-1290.md · PROGRESS-GD1282-1286.md · PROGRESS-GD1276-1280.md · PROGRESS-GD1270-1274.md · PROGRESS-GD1258-1269.md · PROGRESS-GD1249-1257.md · PROGRESS-GD1236-1248.md · PROGRESS-GD1233-1235.md · PROGRESS-GD1222-1232.md · PROGRESS-GD1214-1221.md · PROGRESS-GD1210-1213.md · PROGRESS-GD1206-1209.md · PROGRESS-GD1198-1205.md · PROGRESS-GD1187-1197.md · PROGRESS-GD1189-1190.md · PROGRESS-GD1183-1187.md · PROGRESS-GD1170-1182.md · PROGRESS-GD1056-1081.md · PROGRESS-GD1082-1090.md · PROGRESS-GD1091-1097.md · PROGRESS-GD1098-1103.md · PROGRESS-GD1104-1108.md · PROGRESS-GD1109-1113.md · PROGRESS-GD1114-1118.md · PROGRESS-GD1119-1123.md · PROGRESS-GD1124-1128.md · PROGRESS-GD1129-1133.md · PROGRESS-GD1134-1137.md · PROGRESS-GD1138-1142.md · PROGRESS-GD1143-1146.md · PROGRESS-GD1147-1149.md · PROGRESS-GD1150-1151.md · PROGRESS-GD1152-1157.md · PROGRESS-GD1159-1160.md · PROGRESS-GD1161-1163.md · PROGRESS-GD1164-1169.md · PROGRESS-GD1042-1054.md · PROGRESS-GD790-929.md · PROGRESS-GD960-1005.md (trong `docs/progress-archive/`).
## Quy ước kỹ thuật cần nhớ

- **🧰 Sổ tay bảo trì (GĐ1167):** `npm run test` / `npm run build` / `npx tsc --noEmit` (cổng duyệt) · `npm run check:bundle` (ngân sách 538/597 KB) · `npm run audit:notify` (thông báo ≤90) · `npm run test:coverage` (độ phủ định kỳ) · `node dev/archiveCheck.cjs` (đối chiếu 2 chiều archive sau khi dồn — exit 1 khi lệch) · `dev/covrank.cjs` / `dev/covlines.cjs` (xếp hạng coverage) · `node dev/mutate_sw.cjs` (mutation SW). Chu kỳ: audit 10-GĐ · độ phủ ~30 GĐ · dồn archive ~5 GĐ · vệ sinh mã + làm mới nợ bảo mật khi tới hạn.

- **Khung modal cố định (GĐ662):** mọi panel dùng chung khung `styles.panel` cứng (desktop 760×min(688,100dvh−108), mobile 100vw−24 × 100dvh−96); KHÔNG đặt kích thước riêng cho panel nào, nội dung dài cuộn bên trong. Chuyển tab trong hub không được làm khung co giãn — test khoá `panelFrame.test.ts`.

- Thay đổi "soi sáng" (helper thuần đọc + thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.) **GĐ258 quét lại toàn bộ src/ui: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt** — `#e17055`→`#e67e22`, `#fdcb6e`→`#f1c40f`, `#00b894`→`#2ecc71`, `#d63031`→`#e74c3c`, `#ff8a7a`/`#ff8f7a`→`#ff7675` (buy-tone), `#c0392b` StaffPanel→`#e74c3c`; grep còn 0 (trừ màu NHẬN DIỆN được giữ: ArrangePanel màu loại đồ, GardenPanel họ riêng GĐ178, art SVG login/BuildPanel).
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim dùng **seed cố định** (`setSimSeed`/`simRng()` — GĐ27/28), không mock `Math.random`.
- **Hạ tầng test:** sim seed TẤT ĐỊNH — logic qua `simRng()`, không Math.random/Date.now (chỉ hình ảnh 3D còn). `simGolden.test.ts` bắt tất định vỡ + lệch ±5% — đổi kinh tế CÓ CHỦ Ý thì chép số vào `GOLDEN` + ghi lý do. `test:coverage` mỗi ~10 GĐ (ưu tiên core/data/agents/save). `saveStore`/`staffAgent` đã mutation-check.
- **Co-op = chơi đơn (30/10):** máy khách nhận `true` tạm cho mọi thao tác → lời báo kết quả nằm TRONG thao tác (`notify`), cần kết quả thật thì `lastActionResult()`, cần dữ liệu thì ghi state chung (vd. `wheelLastPrize`). Không `useGame.setState` cả object lớn từ UI (thành PATCH đè máy chạy) → làm thao tác (vd. `dismissUnlockAct`); trường máy chạy tự tính mỗi khung → `NO_PATCH` (`atBranch`). Câu hỏi quầy gửi kèm gói state (`sharedAsk`/`applyRemoteAsk`), ai trong hẻm đứng quầy cũng được hỏi, ai bấm trước thì chốt. `coopClient.test.ts` (26 test, mutation 16/16). Checklist 5 câu ở promt_game.md mục Tester.
- QA live trên `localhost:5173`; kiểm 0 tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console. **GĐ297:** phép so `scrollWidth == clientWidth` KHÔNG đủ — `html/body` là `overflow: hidden` nên nút lòi ra bị cắt mà vẫn báo 0 tràn. Từ nay chạy thêm `game.layoutAudit()` (dev tool `src/dev/layoutAudit.ts`) ở mỗi cỡ màn: `clipped: []` mới là đạt; `overBy` dương là số px bị cắt.
- **GĐ719 — mẹo QA thời gian trong IAB:** tab nền bị đóng băng rAF → đồng hồ game đứng (GĐ665). Chạy `window.game.useGame.getState().tick(1)` thủ công trong evaluate để đẩy thời gian từng nhịp (MPS ≈ 2 phút game/tick ở 1×; dùng speed cao sẽ nhảy cả ngày). updateOnline chạy trong tick — đơn mới xuất hiện giữa các tick và hết hạn sau 20′, phải đọc state SAU MỖI tick, không đọc cuối vòng. Thao tác bấm nút trong panel có thể mất vì React vẽ lại liên tục khi đồng hồ chạy — gọi thẳng action store (`acceptOnline(...)`) khi cần chắc chắn.
- Nhiều phiên song song trên cùng worktree → commit theo đường dẫn.

## Quyết định lớn đã chốt

- Tiệm xôi (người dùng chọn b, 2026-10-31): giữ Quây xôi cấp 36 trong tạp hóa (tạp hóa lớn thành siêu thị); Tiệm xôi là cơ sở riêng cấp 40, nấu xôi số lượng lớn rẻ 40% bù kho chung mỗi đêm. Còn lại: lô 3D đầu hẻm, Sổ đầu ngày, xu hướng cơ sở.
- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo hôm nay bám bộ "việc chính" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 45s tự chốt — GĐ122); sim có seed đếm theo tick.
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- Ngoại lệ "đủ 2 chế độ" (30/10): ở hẻm online đi lại tiệm/trại tốn 0 phút (chơi đơn 10–15 phút) — đồng hồ dùng chung, một người đi không được tua giờ cả hẻm.
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ: gộp về một sắc info `#3498db` (GĐ178); ngoại lệ duy nhất: buy-tone `#55efc4`/`#ff7675`; GardenPanel giữ họ riêng. GĐ258 quét nốt 6 màu cũ — src/ui chỉ còn bảng duyệt + màu nhận diện.

## Cần theo dõi / nợ mở
> Ghi chú 05/11/2026: đã rà lại + kiểm chứng số liệu thật. Các mục ✅ đã xong (giữ lại vết để đối chiếu); các mục ⏳/🕳️ còn mở là vì **chờ điều kiện NGOÀI tầm dev** (bản vá upstream / tab trình duyệt thật) — không phải nợ thiếu trách nhiệm.

- ✅ **GĐ1265 phần NÂNG dep patch an toàn — ĐÃ XONG** (verify lại 05/11: installed `dexie` 4.4.7 · `ws` 8.22.1 · `mongodb` 7.8.0 · `@types/node` 26.6.6 — khớp mục tiêu; full suite 466/3808 + tsc/build/bundle không đổi + co-op 110 xanh). Không nâng major (`firebase` 12→13, `three` 0.186→0.187, `dotenv` 17→18 — phá tương thích, chưa có lý do chơi, Luật 3). **Phần còn lại** (firebase-admin advisory) đã dồn về GĐ1073 bên dưới để không trùng dấu vết.
- ✅ **GĐ1263 followup — lập phiên hẻm qua automation ĐÃ THÀNH CÔNG** (hẻm 8BX6AP, tab a runner/tab b player; bằng chứng parity farm homegrown **16=16** trên host đồng bộ sang máy khách). Phiên rớt khi tab về nền → đúng thiết kế GĐ665, không phải lỗi parity. Vết tích user-fix (`AlleyPanel.tsx` + `login.css`: danh sách hẻm cuộn riêng 300px/38vh) đã ghi nhận — nội dung đúng, gates xanh.
- ✅ **GĐ330 — QA lưu máy khách ĐÃ CHỐT KHÔNG PHẢI LỖI** (127.0.0.1:5173 tải lại vào đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới). **Đóng.**
- 📦 **GĐ515 — MỤC TIÊU ĐẠT, không còn là nợ**: tải ban đầu 356/597 KB gzip (từ 538), dư ~241 KB; chunk lớn 101/255; tải đầu bất biến nhờ tách three/WebGPU+TSL + bỏ Draco (GĐ1196–1197). Chỉ còn "theo dõi headroom" — khi gần chạm trần 597/255 lại tách tiếp. Không phải việc treo.
- ⏱️ **GĐ675 — phần chính ĐÃ XONG**: render CPU cấp 10/18/24/34/41 đều đạt biên 4× throttle (cấp 41: 5,1 ms trung vị ⇒ ~20–31 ms < 33 ms). **Còn thiếu đúng 1 mảnh**: FPS thật máy yếu — cần môi trường chạy thật. Chi tiết: archive `PROGRESS-GD715-788-summaries.md`.
- ⏳/🕳️ **GĐ1263 (parity thu ngân GĐ1253 + juice GĐ1255 2 tab) + GĐ665/668 (vòng ngày 2 tab)** — chờ **2 tab trình duyệt THẬT** (artifact môi trường: tab nền đóng băng timer → server ngắt WS → reload, `coop.ts:339`). Parity 2 tính năng này **bảo đảm bằng kiến trúc + test**, không cần QA live: (1) GĐ1253 quyết định thu ngân nằm trong `counterDeal` phía MÁY CHẠY, không tạo `sharedAsk` → máy khách không thể thấy câu hỏi lệch; (2) GĐ1255 bong bóng sinh từ `farmSync.subscribe` trên state ĐỒNG BỘ — máy khách tự vẽ pop giống hệt; (3) không thao tác mới → `coopGuard` không đổi. Làm khi có QA tab thật (GĐ670); không tính là lỗi game.
- 🔐 **GĐ1073 (làm mới GĐ1142) — còn MỞ, chờ UPSTREAM** (khảo sát lại 05/11/2026): `npm audit --omit=dev` **10 cảnh báo (6 vừa/4 cao)**. Truy gốc chính xác:
  - **4 cao** = `@firebase/firestore@4.17.2 → @grpc/grpc-js@1.9.16` (nhánh **client** `firebase@12.19.0`); trong khi 2 bản `@grpc/grpc-js@1.14.6` phía **server** (`firebase-admin→@google-cloud/firestore`) **đã vá** (advisory nhắm ≤1.13.5). 
  - **6 vừa** = `minimatch@9.0.9` + `glob/rimraf` dưới `firebase-admin→firestore-api→google-gax` — chỉ **tooling build/server**, không ship vào bundle trình duyệt.
  - Đã thử `npm audit fix --omit=dev` (không `--force`) — **KHÔNG đổi gì** (cha chốt semver hẹp). Hết 10 cảnh báo buộc ép bump major transitive → vi phạm Luật 3. **Giữ chờ upstream** (firebase-admin 14.5.0 đã là bản mới nhất). Khi nâng firebase/firestore sau này: sạch cao nhờ grpc-js mới, cân lại vừa.

- ⏱️ (GĐ296–298) npm run test nhạy tải máy: 1 test đỏ lẻ không liên quan thay đổi vừa làm → chạy lại đúng file trước khi kết luận; máy rảnh mà vẫn >10 phút thì đo file chậm nhất rồi tối ưu.

## Backlog tiếp theo
- P2 T6 THỬ RỒI HOÀN TÁC (06/11): khóa cám heo→cấp 20, cám bò→24 làm sim cấp 5 (economySimL5, seed cố định) tụt lãi bán +189.800→−10.067đ/ngày — bot xoay vòng hàng theo danh sách mở khóa, cám bao 5kg là món giá cao bán được ở cấp thấp. Muốn làm phải thay món tạp hóa giá tương đương ở cấp 1 trước. T9 ĐÃ SỬA: Ra tiệm/Ra trại camera nhảy thẳng (snapTo), không lia qua cảnh — test cameraSnap. T7 ĐÃ SỬA: tab mối nhập chỉ hiện mối mở + 1 mối khóa gần nhất, còn lại gộp "+N mối nữa" (test visibleSuppliers). T8 ĐÃ SỬA: chơi đơn mở Nhập hàng lúc tua nhanh → hạ về 1× (hẻm online không đụng) — test orderSlowdown.
- ◐ **P0 M1 (ĐÃ GIẢM, test gfxLowShield):** mức Thấp hạ độ nét tới 0.6 (trước 0.75) khi < 45 FPS — không bớt NPC ở mức chọn tay (giữ quyết định GĐ1235). Còn: đo lại trên Chrome thật cấp 29; nếu vẫn < 30 thì soi CPU (9 NV + đám đông), không phải GPU.
- ✅ **Người dùng ĐÃ TRẢ LỜI (GĐ1076): CHƯA mở Ngõ 3 — chiều sâu chưa khai thác hết.** Hướng chiều sâu do người dùng chỉ định, làm TRƯỚC mở rộng: (1) thêm sản phẩm/công thức mới ở tạp hóa, nông trại, quán nước, tiệm xôi; (2) cơ chế nhập hàng NGOÀI tạp hóa để đa dạng hàng bán; (3) liên kết thị trường/quan hệ hàng xóm: nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm. Chiều rộng để SAU (người dùng liệt kê làm hướng tương lai): cùng đầu tư, chuỗi sản xuất chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu. Ngõ 3 chỉ làm khi người dùng chốt lại.
- 🆕 **Phần Midnight Bistro còn lại (rà GĐ1510):** (1) ✅ GĐ1511 tip 2 nấc; (2) ✅ GĐ1512 K1; (3) ✅ GĐ1513. Vách ngăn biến thể: BỎ (đã có vách, chỉ thêm hình).
- Lịch sử backlog đã xong: docs/progress-archive/BACKLOG-DONE-2026-11-07.md

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` (nay còn 550 dòng ở `src/ui/panels/`, GĐ898 đo lại — nợ ĐÃ HẾT; từng là 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` (ĐÃ tách GĐ876 → 573 dòng). BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)

- Mục lục đầy đủ đến GĐ1391: `docs/progress-archive/INDEX-MUC-LUC-DEN-GD1391.md` (grep "GĐxx"). GĐ1382–1391 tóm tắt ở mục Trạng thái hiện tại; GĐ1392 gọn PROGRESS 190→37KB; GĐ1393 dời mục lục để PROGRESS < 30KB.
- GĐ1409 (Sữa chua granola — lối ra đầu tiên của ngũ cốc granola ở máy xay): 14 cốc×18k, unlock 68. Dời GĐ1395–1401 sang archive. Full suite 503/4518 xanh.
- GĐ1430–1434 (catalog đợt 10–11; test ingredientOutlet + RETAIL_ONLY; Sổ nấu gộp món khóa xa; rải 45 món cấp 35→35–57): docs/progress-archive/PROGRESS-GD1430-1434.md
- GĐ1435–1439 (mô tả trạm; quán nước +3 món trái cây; tiệm xôi +2; lạp xưởng bà Tám + chà bông nhà làm kèm lối ra): docs/progress-archive/PROGRESS-GD1435-1439.md
- GĐ1440–1447 (mọi trái cây vườn có lối ra bếp; giò thủ/me dầm bà Tám, chanh muối hàng xóm 1 kèm lối ra bếp & quán): docs/progress-archive/PROGRESS-GD1440-1447.md
- GĐ1448–1462 (13 món nối hàng xóm/chanh muối/me dầm; GĐ1455 🧭 DỪNG thêm món dưới cấp 50 vì economySimL50 daily_smile sát ngưỡng 22 — món mới đặt ≥51): docs/progress-archive/PROGRESS-GD1448-1462.md
- GĐ1463–1481 (công thức cấp 59–77): docs/progress-archive/PROGRESS-GD1463-1481.md
- GĐ1482: Cháo lạp xưởng (cấp 78, nồi nước: 2 gạo + 1 lạp xưởng → 14, bán 23k).
- GĐ1483: Tôm khô nhà phơi (hàng xóm, cấp 52, 58k→90k) + lối ra Cháo tôm khô (cấp 79, nồi nước: 2 gạo + 1 tôm khô → 14, bán 22k).
- GĐ1484: Măng khô nhà phơi (hàng xóm, cấp 53, 45k→70k) + Măng khô xào lạp xưởng (cấp 80, chảo chiên: 1 măng + 1 lạp xưởng → 8, bán 25k).
- GĐ1485: Nấm mèo khô nhà phơi (hàng xóm, cấp 54, 35k→55k) + Chả giò nấm mèo (cấp 81, chảo chiên: nấm + thịt + bánh tráng → 30, bán 7k).
- GĐ1486: Mè rang nhà làm (hàng xóm, cấp 55, 32k→50k) + Xôi muối mè (cấp 82, bếp xôi: 2 nếp + 1 mè → 14, bán 12k; nhập 8.5k cho khớp biên cuối run ≤1.42).
- GĐ1487: Nem nướng bà Tám (cấp 56, 50k→80k) + Nem nướng cuốn (cấp 83, bếp nướng: nem + bánh tráng → 8, bán 20k). Ghi chú: latePremium chỉ soát biên ở mốc 82/86/91/96/100 — tránh đặt món nấu đúng các mốc này.
- GĐ1488: Cá cơm khô bà Tám (cấp 57, 40k→64k) + Cơm cá cơm rim (cấp 84, bếp xôi: 2 gạo + 1 cá → 12, bán 25k).
- GĐ1490–1505 (khu ăn tại chỗ theo tham khảo Midnight Bistro + bảng hiệu đặc sản 4 miền + khoá 1 tab): docs/progress-archive/PROGRESS-GD1490-1505.md
- GĐ1506–1513 (đoàn kiểm tra vệ sinh, sửa maybeSurprise, decor khoe, tip 2 nấc, nút Nhập đủ, decor theo dịp lễ): docs/progress-archive/PROGRESS-GD1506-1513.md
- Tham chiếu cũ dời theo GĐ1394–1408: PROGRESS-GD1404-1407.md · PROGRESS-GD1427-1429.md · PROGRESS-GD250-257.md · INDEX-GD1-250.md (trong docs/progress-archive/)

