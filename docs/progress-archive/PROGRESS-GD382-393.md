# Mục lục GĐ382–393 (dồn từ PROGRESS.md ở GĐ414)

- GĐ382 — 🗜️ Dồn mục lục GĐ301–349 sang archive (INDEX-GD301-349.md), PROGRESS.md 30,3KB → 26,7KB (về dưới trần 30KB)
- GĐ383 — ⏳ Test nhắc hàng sắp HỎNG của `stockReminders` (+3 test, mutation 2/2): lô trên kệ/trong kho còn <1 ngày nhắc một lần/ngày, hạn dài im lặng, kho hết hàng thì không nhắc; đóng chỗ hở GĐ381
- GĐ384 — 🧭 Leader review (GĐ374–384): 245 file / 2470 test xanh (129–184s tuỳ tải máy, vẫn trên mục tiêu ~150s; không có bằng chứng do code mới — test mới đều <1s), tsc sạch, build OK, chunk chính gzip 244KB (<255), PROGRESS.md 27KB. Chỉ thêm test (slice orders/inventory/branch/regulars, biz.ts: vay-hụi-thú, truyện, đồ nhà-xe, quảng cáo, nhắc hàng) + gỡ 1 console.log sót; gameplay/ngân sách không đổi. Hở còn lại: biz.ts (surprise/arc/achievement/rival đêm), orders.ts nhánh hợp đồng, inventory.placeOrder/buy. Review kế ~GĐ394.
- GĐ385 — 🛒 Test nhập hàng `inventory.ts` buy/placeOrder/upgradeWarehouse (9 test, mutation 3/3): trừ đúng + sổ chi, món nhà làm không nhập, kho tràn (kể cả hàng chờ giao)/thiếu tiền/dưới mức tối thiểu bị chặn không mất gì, mối giao ngay vào kho còn mối trễ vào hàng chờ, nâng kho đúng cấp-tiền
- GĐ386 — 📋 Test `acceptContract` (5 test, mutation 3/3): chặn thiếu cấp/danh tiếng, không ghi đè hợp đồng đang chạy, hạn kỳ đầu = hôm nay + periodDays, chờ giao; nhánh hợp đồng của orders.ts giờ đã phủ đủ (commit/giao/chuỗi có từ trước)
- GĐ387: test checkAchievements (thưởng một lần, nhiều mốc, closeFriends), mutation 2/2 — bizAchievements.test.ts
- GĐ388: test hết hạn chào bán mặt bằng rival qua đêm (bizEndOfDay), mutation 2/2 — rivalForSaleExpiry.test.ts
- GĐ389: rà biz.ts — rival sinh đời mới (rivalGen/rivalBoss) và maybeSurprise (surpriseArc) đã có test; không còn khoảng trống lớn ở biz.ts. Gap kế: deliverPhone/restockAndAnswerPhone, rushDeliverOrder (orders.ts).
- GĐ390: test restockAndAnswerPhone (nhập bù, thiếu tiền, món nhà làm), mutation 2/2 — phoneRestock.test.ts
- GĐ391: test learnSkill (cấp, điểm kỹ năng, trùng, id lạ), mutation 3/3 — learnSkill.test.ts
- GĐ392: test setShopName/setCostume (cắt 24 ký tự, mặc định, cấp, tái sinh), mutation 4/4 — shopNameCostume.test.ts
- GĐ393: rà checkWelcomeBack/contributeLandmark (đã có test riêng). Full suite 252 file/2506 test xanh, tsc sạch, build OK, main gzip 244KB, PROGRESS 29KB. Leader review kế GĐ394.
