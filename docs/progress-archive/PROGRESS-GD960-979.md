# Archive GĐ960–979

- GĐ974: tách data/regularsList.ts (REGULARS + hàm perks, 333 dòng) khỏi data/regulars.ts (615→288) bằng re-export + test `regularsListSplit.test.ts`. tsc exit 0, full test đạt (363 file khác + test mới 3/3). Chưa soi bằng mắt.
- GĐ975: tách net/alleyApi.ts (REST danh sách hẻm, 28 dòng) khỏi net/coop.ts (698→672) bằng re-export + test `alleyApiSplit.test.ts`. tsc exit 0, full test đạt (364 file khác + test mới). Chưa soi bằng mắt.
- GĐ976: tách world/buildingTextures.ts (5 hàm canvas texture, 97 dòng) khỏi world/buildings.ts (803→708) + test `buildingTexturesSplit.test.ts`. tsc exit 0, full test đạt (366 file, 3085 test).
- GĐ977: tách core/bizAchieve.ts (achievementCtx, checkAchievements, stockReminders, 78 dòng) khỏi core/biz.ts (797→722) + test `bizAchieveSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ978: tách core/bizLoan.ts (takeLoan, repayLoan, joinHui, 52 dòng) khỏi core/biz.ts (722→673) + test `bizLoanSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ979: tách core/bizPurchases.ts (pay, thú cưng, thiết bị, đồ nhà, dịch vụ quầy) khỏi core/biz.ts (673→592) + test `bizPurchasesSplit.test.ts`. tsc exit 0, full test đạt.
- GĐ973: tách data/bizAchievements.ts (thú cưng, thành tựu, thanh tra, 139 dòng) khỏi data/biz.ts (652→520) bằng `export *` + test `bizAchievementsSplit.test.ts`. tsc exit 0, full test đạt (363/3080). Chưa soi bằng mắt.
- GĐ972: tách data/bizWeeks.ts (báo cáo + thử thách tuần/tháng, 347 dòng) khỏi data/biz.ts (999→652) bằng `export *` + test `bizWeeksSplit.test.ts`. tsc exit 0, full test đạt (362/3077). Chưa soi bằng mắt.
- GĐ969: tách `locationLabel` (tên vị trí người chơi) khỏi updateStatus sang core/interactHints.ts + test. tsc exit 0, full test đạt (361/3075). Chưa soi bằng mắt.
- GĐ968: tách `mopPlan` (quyết định lau nhà) khỏi mopFloor trong main.tsx sang core/interactHints.ts + test. tsc exit 0, full test đạt (361/3074). Chưa soi bằng mắt.
- GĐ967: tách `sapLotHint` + `deliveryHint` (gợi ý tương tác) khỏi main.tsx sang core/interactHints.ts + test. tsc exit 0, full test đạt (361/3070). Chưa soi bằng mắt.
- GĐ966: gom công thức độ sáng đèn (17h–5h30) lặp ở main/compoundWarm/storefrontLantern vào render/lampLevel.ts + test; sửa lỗi tsc sót ở GĐ965 (chapterPending string|null). tsc exit 0, full test đạt (360/3066). Chưa soi bằng mắt.
- GĐ965: tách `effectiveSpeed` (dừng giờ khi tổng kết/cốt truyện/câu hỏi quầy; ở hẻm không dừng) khỏi renderFrame sang core/routine.ts + test. tsc sạch, full test đạt (359/3064). Chưa soi bằng mắt.
- GĐ964: tách marker hướng dẫn ngày đầu khỏi main.tsx sang render/tutorialMarker.ts (createTutorialMarker, markerGlow) + test. tsc sạch, full test đạt (358 file/3059). Chưa soi bằng mắt trong game.
- GĐ963: tách `stocktakeMessage` khỏi main.tsx sang core/routine.ts (hàm thuần) + test `stocktakeMessage.test.ts`. tsc sạch, full test đạt. Chưa soi bằng mắt trong game.
- GĐ962: tách core/bizStory.ts (sự kiện bất ngờ, chuyện khách quen, chương, REGULAR_NAMES) khỏi core/biz.ts (973→~800), biz re-export nên import cũ giữ nguyên + test. Full 356 file/3055 test, tsc sạch.
