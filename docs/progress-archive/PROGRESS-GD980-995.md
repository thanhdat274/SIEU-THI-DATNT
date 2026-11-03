# GĐ980–995 (tách file thuần, QA save trắng)

- **GĐ980 (rà 971–979)** Chỉ tách code thuần: data/bizWeeks, bizAchievements, regularsList, net/alleyApi, world/buildingTextures, core/bizAchieve, bizLoan, bizPurchases (core/biz.ts 797→592, buildings.ts 803→708, coop.ts 698→672). Không đổi hành vi, bundle chỉ chia lại module (build ok, vendor-three 261 KB gzip không do các tách này). Full test 369 file/3088. Chưa soi bằng mắt; QA save trắng kế ở ~GĐ981.
- GĐ981: QA save trắng bằng mắt (xoá localStorage, tải lại, "Chơi tiếp trong máy"): vào được ngày 1 06:00, HUD/chương 1/hướng dẫn hiện đủ, tiền 280.000đ. Console chỉ còn log HMR cũ (`createOrdersSlice`) từ lúc sửa giữa chừng, không lỗi mới sau khi tải lại. Khung nhìn nhỏ nên chưa đo FPS thật.
- GĐ982: tách data/bizFinance.ts (phản công, thẻ tích điểm, quảng cáo, vay, hụi, 211 dòng) khỏi data/biz.ts (520→312) + test `bizFinanceSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ983: tách core/dayStats.ts (DayStats, DayRecord, addHour, emptyStats…, ~100 dòng) khỏi core/gameTypes.ts (696→598) + test `dayStatsSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ984: tách render/characterTypes.ts (kiểu nhân vật + SKIN_TONES, 87 dòng) khỏi render/characterModel.ts (1062→977) + test `characterTypesSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ985: tách render/characterGear.ts (đồng phục, mũ, dụng cụ theo nghề, vật liệu dùng chung, 347 dòng) khỏi render/characterModel.ts (977→636) + test `characterGearSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ986: tách world/farmBeasts.ts (mô hình 3D 7 loài vật nuôi, 173 dòng) khỏi world/farm.ts (996→834) + test `farmBeastsSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ987: tách world/farmCrops.ts (hình cây trồng theo giống + giai đoạn, 130 dòng) khỏi world/farm.ts (834→714) + test `farmCropsSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ988: tách agents/customerEntity (lớp Customer + hằng chờ) khỏi agents/customers + test; 3101 test, tsc 0.
- GĐ989: tách ui/orderPanelStyles khỏi ui/OrderPanel + test; 3102 test, tsc 0.
- GĐ990 (review 10 giai đoạn): bundle vendor-three 261KB gzip (lớn nhất), tổng initial ~570KB < 600; 3102 test qua; chỉ tách file thuần, hành vi giữ nguyên. Lưu trữ GĐ960–979.
- GĐ991 (QA save trống bằng mắt): xóa storage, tải sạch → màn đăng nhập, chơi tiếp → ngày 1 06:00, HUD/hướng dẫn/hội thoại bà Năm bình thường; lỗi console còn lại là HMR cũ (PRICE_WAR_CUT vẫn export qua bizFinance).
- GĐ992: tách ui/HudChips (SoundToggle, MusicToggle, MoneyChip) khỏi ui/Hud + test; 3103 test, tsc 0.
- GĐ993: tách ui/panels/AchievementsTab (Achievements, PrestigeSection) khỏi ui/BusinessPanel + test; 3104 test, tsc 0.
- GĐ994: tách ui/panels/ShopLifeTabs (Pets, Services, Life, Upgrades) khỏi ui/BusinessPanel (còn 155 dòng) + test; 3105 test, tsc 0.
- GĐ995: tách world/buildingFurnish (quạt, điều hòa, quầy, máy tính tiền) khỏi world/buildings (còn 520 dòng) + test; 3107 test, tsc 0.
