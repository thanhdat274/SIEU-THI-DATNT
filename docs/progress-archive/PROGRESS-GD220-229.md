# PROGRESS archive — GĐ220–GĐ221 (QA toàn diện + mở rộng soi mua hàng)

Chi tiết đầy đủ từng giai đoạn. PROGRESS.md chỉ giữ dòng con trỏ gộp.

## GĐ220 — ✅ QA TOÀN DIỆN + phủ test (mỗi 10 GĐ)
`npm run test:coverage` → **branch 87.03%** (GĐ210: 86) · **function 74.49%** (GĐ210: 68.9) ·
**statement 49.11%** (GĐ210: 42.9; phần thấp còn lại là render/world/audio 3D, trước đó GĐ210 đã ghi
nhận). Chơi thật nhiều cấp do simSmoke/simGolden/economySim bao (xanh trong full suite). QA browser
@5173 bằng điều khiển trình duyệt: màn chơi load sạch (tiền / công cụ / kế hoạch hôm nay / thời tiết),
canvas 3D render cả desktop 1280×720 lẫn mobile 390×844, **không tràn ngang** (scrollW == bodyW).
tsc + build sạch. Full suite 2031/2031 (189 files). QA kế: GĐ230.

## GĐ221 — 🛒 "Lô chợ phiên đáng múc không?"
Định giá QUYẾT ĐỊNH mua lô thương lái (GĐ68, đầu tháng giảm 84% so với mua lẻ): banner chợ phiên
(OrderPanel) mới chỉ cho biết TIẾT KIỆM so với mua lẻ; giờ đối chiếu từng món TRONG lô với tồn kho +
sức bán `itemHealthList.dailyQty` → món đang bán nhanh/cầm ít thì lô là `beneficial` (múc `grab`),
món đã có đủ trên `OVERSTOCK_DAYS=7` ngày là `overstock` → `hold` (mua sẽ CHÔN thêm vốn, nối GĐ213).
`fairLotValue` (data/fairLotValue.ts) trả savings/savePct/dealPrice/lines (id,name,qty,have,dailyQty,
daysOfStock,beneficial,overstock)/beneficialCount/overstockCount/verdict (`grab`|`maybe`|`hold`).
OrderPanel thêm dòng khuyên xanh/cam ngay trong banner chợ phiên. (+5 test).

## GĐ222 — 🏭 "Bao giờ nên nâng kho?"
Mở rộng kho theo sức chứa × hàng giữ: StoragePanel vốn chỉ chìa cấp kho + nút nâng; nay
`warehouseUpgradeValue` (data/warehouseUpgrade.ts) đếm thùng (`casesFor`) vs trần (`tier.cases`),
món cần lạnh (`needsCold`) vs trần giữ lạnh (`tier.cold`), chấm điểm tràn → giá trị LẺ (~) của phần
lạnh đang hỏng nhanh (tràn lấy món chiếm nhiều nhất × `priceOf`, nối GĐ212/spoil), giá bậc kế
(WAREHOUSE_TIERS) vs tiền mặt → verdict `upgrade` (tràn/đụng trần thùng) / `soon` (lạnh hoặc thùng
≥80–85%) / `ok`. StoragePanel thêm Callout "Kho dùng %thùng · giữ lạnh %(· tràn → ~Xđ hỏng nhanh)".
(+5 test).

## GĐ223 — 🎓 "Đào tạo nhân viên có đáng không?"
Đổi hiệu quả đào tạo (`staffEff`) thành TIỀN/ngày: staffEff vốn chỉ chìa % tăng tốc của +1★ + giá
buổi; nay `trainValue` (data/trainValue.ts) lấy giá trị ngày nhân viên (`staffValueToday.value` —
doanh thu ca phủ) × % tăng tốc (`nextDeltaPct`) → mức tăng giá trị/ngày, so với tổng chi phí lên 1★
(`ceil(expNeeded/TRAIN_EXP_PER_SESSION)` buổi × `trainCost`) → SỐ NGÀY HOÀ VỐN (`ceil(cost/valueGain)`),
`worth` khi ≤14 ngày. StaffPanel thêm dòng "hoà vốn ~N ngày" cạnh nút đào tạo (xanh khi đáng / cam
khi chậm). (+5 test).

## GĐ224 — 🔥 "Mỗi ngày gầm bao nhiêu tiền cố định?"
Gộp các khoản chi phí cố định/ngày thành con số GỘP so với doanh thu bình quân: `dailyBurn`
(data/dailyBurn.ts) = lương (Σ `dailyWage` cả hai tiệm) + thuê (`rentOf(shopTier)`) + lãi vay
(`loanInterest`) + góp hụi (`hui.daily`) so doanh thu bình quân 7 ngày (`recentAvgRevenue`) →
`burnShare` (% chi phí cố định ăn dòng tiền), `covered`, `margin` (thừa/thiếu đệm). Nối GĐ216 (lương),
GĐ214 (nợ), GĐ217 (lãi). Sổ đầu ngày (ReportPanels) thêm Callout "Chi phí cố định/ngày Xđ = Y% doanh
thu bình quân" (cam khi >80% → kíp tăng doanh thu hoặc cắt bớt lương/nợ). (+5 test).

## GĐ225 — 🥊 "Đối thủ đang hút mất bao nhiêu khách/ngày của tôi?"
BusinessPanel vốn chỉ chìa "% khách bị rival hút" (`rivalTrafficFactor`); nay `rivalDrag`
(data/rivalDrag.ts) quy con số đó thành TIỀN: factor có-rival vs không-rival → `lostPct` (phần khách
mất, sàn factor 0.5) × doanh thu bình quân 7 ngày (`recentAvgRevenue`) → `moneyPerDay` (ước ~$).
BusinessPanel thêm "Đang hút mất X% khách → ~Yđ/ngày" (nối GĐ159 phản công + GĐ224 dòng tiền).
(+5 test).

## GĐ226 — 🔎 "Món nào đang chiếm ô kệ lép vốn?"
Sức khoẻ món (itemHealthList) và lời/m² kệ (shelfEfficiency) xếp hạng theo TỔNG lời, bỏ qua năng
suất MỖI Ô: một món vẫn lời tổng ổn nhưng bày nhiều ô, mỗi ô bán ì ạch, trong khi món bán nhanh chỉ
có ít ô. `shelfSlotValue` (data/shelfSlotValue.ts) soi GÓC "ô kệ": với món đang bày (onShelf>0),
profitPerDay=profit30/30, perSlot=profitPerDay/onShelf (lời mỗi ô/ngày); cờ 'lose' nếu profit30≤0
(món lỗ chiếm chỗ), cờ 'slow' nếu bày ≥3 ô mà perSlot < ngang nửa món khoẻ nhất (SLOT_ACTIONABLE_ON_SHELF=3,
SLOT_SLOW_RATIO=0.5). AnalyticsPanel thêm thẻ cảnh báo giới thiệu top món lép vốn + món khoẻ nhất làm mốc.
Khác profitMix (tập trung lời) và ABC (xếp hạng lời) — trả lời "đổi chỗ để món bán nhanh hơn". (+6 test)

## GĐ227 — 💸 "Bảng giá hôm nay đang để hụt bao nhiêu?"
PricePanel vốn soi TỪNG MÓN (suggestPrice + priceForecast 📈/📉/➖) nhưng không có con số TỔNG.
`priceGap` (data/priceGap.ts) gộp chênh lãi/ngày của từng món: dự phóng lãi NẾU áp đúng giá gợi ý
(`suggestPrice`) trừ lãi ở GIÁ ĐANG ĐẶT (`priceForecast`; khi giá = gốc thì lấy baseline) → chênh
dương là tiền rò rỉ/ngày vì giữ giá lệch (chỉ cộng món thực sự CÓ LỢI khi đổi — món nhạy giá như
nước suối tăng giá lại MẤT lời nên không tính). PricePanel thêm thẻ cảnh báo đầu bảng: "Đang để
hụt ~Xđ/ngày (N món chưa về đúng gợi ý)" + top món rò rỉ. THUẦN ĐỌC, dùng lại đúng công thức mô
phỏng. (+5 test)

## GĐ228 — ⛔ "Khách tìm không mua được đang bỏ lỡ bao nhiêu/ngày?"
analyticsAdvice đã có dòng "🚶 X% lượt tìm không mua được — bày đầy kệ", nhưng dừng ở TỈ LỆ.
`lostSalesValue` (data/lostSalesValue.ts) đổi ra TIỀN: lostDay = dailyQty×lostShare/(1−lostShare)
(ước lượt khách mất/ngày) × unitProfit = profit30/qty30 → moneyLostDay (đồng lỡ mỗi ngày). Cờ
`stockout` (daysLeft ≤ 1.5) phân biệt "thiếu hàng → nên nhập" vs "còn hàng mà vẫn mất → do giá, xem
Bảng giá (GĐ227)". AnalyticsPanel thêm thẻ danger ngay sau thẻ lép vốn (GĐ226) — cùng chỗ "Sức khoẻ
món", xếp thứ tự theo ĐỒNG chứ không theo %. Lọc nhiễu qty30≤5 / lostShare<0.1. (+6 test)

## GĐ229 — ⭐ "Danh tiếng đang kéo thêm / làm mất bao nhiêu đồng mỗi ngày?"
repPayoff (GĐ148) đã quy danh tiếng ra KHÁCH/ngày (extraKhach, nextStarKhach) nhưng dừng ở "khách".
`repMoney` (data/repMoney.ts) đổi sang ĐỒNG: nhân phí chi tiêu bình quân mỗi khách ghé
(avgPerVisit = doanh thu/khách) → moneyPerDay (doanh thu thêm/mất mỗi ngày ở danh tiếng hiện tại) +
nextStarMoney (doanh thu mỗi 0.5★ tới). Thẻ ⭐ Danh tiếng ở Sổ đầu ngày thêm dòng "≈ Xđ doanh thu/ngày
vì có/thiếu danh tiếng · nâng 0.5★ ≈ +Yđ/ngày". Cùng mô-típ rivalDrag (GĐ225) đổi khách → đồng, khép
trục "danh tiếng = tiền". THUẦN ĐỌC. (+4 test)

## GĐ230 — ✅ QA TOÀN DIỆN
- test:coverage 2055/2055 (195 files, bỏ 3 file sim nặng): branch 86.96% · function 74.77% ·
  statement 49.38% (ngang/không thụt so GĐ220: 87.03/74.49/49.11 — function nhích nhẹ).
- Full suite (GĐ229 trước QA) 2077/2077 (198 files) xanh; build sạch (chỉ bundle-size warning).
- Browser @5173 (save máy ngày 4): Sổ đầu ngày / Sức khoẻ món / Nhập hàng / Kho / Sơ đồ kệ mở
  đủ, render không lỗi; không tràn ngang @1280 / 390 / 320 (scrollWidth == clientWidth); dev 200.
- Loạt soi mới GĐ226–229 (shelfSlotValue / priceGap / lostSalesValue / repMoney) là thẻ điều kiện —
  trên save ngày 4 (level 1, <10 mẫu) ẩn sạch, đúng thiết kế; logic phủ bằng test riêng.

## GĐ231 — 🤝 "Cam kết kỳ hợp đồng đáng cọc không?"
Commit kỳ ở panel Hợp đồng: cọc 10% giá trị kỳ (hoàn khi giao) + trữ riêng hàng kỳ này → thưởng tin
cậy +6%. ContractsPanel hiện cọc/thưởng nhưng chưa nói ĐÁNG KHÔNG về dòng tiền. `commitTry`
(data/commitTry.ts) gộp: deposit (cọc), bonus (thưởng), reservedValue (vốn khóa = Σ món × giá mua),
depositShareOfCash → verdict. skip khi không đủ cọc; tight khi cọc ≥25% tiền mặt hoặc vốn khóa ≥50%;
worth khi tiền dư giả (cọc hoàn, thưởng thuần lợi) — khớp trục solvency/dailyBurn (GĐ214/224). Row
commit thêm dòng chấm xanh/cam/đỏ. THUẦN ĐỌC. (+6 test)

## GĐ232 — 📲 "Bán online hôm nay thực lời bao nhiêu sau phí giao?"
OnlinePanel hiện riêng revenueToday ("💵 Hôm nay") + grabFeesToday dòng nhỏ, chưa ghép ra LỜI RÒNG.
`onlineNet` (data/onlineNet.ts) gộp: net = revenue − grabFees, grabShare = phí Grab/doanh thu, và
savingsIfOwn = grabFees (cận trên tự chở bằng người giao rảnh). Verdict: low khi lời âm (chọn đơn lời /
tự chở), warn khi Grab ăn ≥15% doanh thu (OnlinePanel thẻ cam, mách tự chở giữ lại ~Xđ/ngày), good còn
lại. OnlinePanel thêm thẻ "Online hôm nay: lời ròng Xđ (Grab −Yđ)". Nối GĐ59 (lời ròng/đơn) lên tầm
NGÀY. THUẦN ĐỌC. (+6 test)

## GĐ233 — 🔧 "Kệ đang mòn bao nhiêu nguy cơ, sửa có đáng?"
Kệ hao mòn mỗi đêm; từ mòn ≥ 60% mới có thể HOẢN, xác suất = (mòn−60)×0.008/đêm (đúng công thức
endDay), hỏng thì khách không lấy được hàng tới khi sửa (25% giá mới, tối thiểu 20k). WearRow chỉ hiện
"Độ mòn X%" + nút Sửa/Bảo trì — CHƯA nói xác suất hỏng hay rủi ro tiền. `wearRisk` (data/wearRisk.ts)
bóc tách: breakChance (xác suất hỏng/đêm), serviceable, repairCost, expectedRepairExposure =
breakChance×repairCost (rổ rủi ro tiền sửa/đêm). Verdict: broken / danger (chance≥10%) / watch (đủ bảo
trì) / ok. WearRow thêm dòng cảnh báo nguy cơ + rủi ro tiền, hoặc nhắc "đủ điều kiện bảo trì, về trắng
phí sửa". THUẦN ĐỌC. (+6 test)

## GĐ234 — 📋 "Chùm hợp đồng đang đóng góp bao nhiêu/ngày + vốn cột?"
contractAcceptRoi (GĐ151) soi TỪNG hợp đồng; chưa có con số TỔNG cho cả chùm active. `contractPortfolio`
(data/contractPortfolio.ts) gộp các hợp đồng đang hoạt động: netPerDayTotal = Σ netPerDay (lời ròng/ngày
cả chùm), capitalPerPeriod = Σ costOfGoods (vốn hàng phải trữ cho một kỳ giao của cả chùm), giveUpPeriod
(lời nhượng lại khách sỉ), anyLosing (có hợp đồng lỗ thật). Verdict ok/warn/empty. ActiveContracts thêm
thẻ đầu danh sách "N hợp đồng đang đóng góp ~Xđ/ngày · mỗi kỳ cần trữ ~Yđ vốn". Nối GĐ213/224 dòng vốn.
THUẦN ĐỌC. (+5 test)

## GĐ235 — ⏳ "Tồn kho quay bao lâu một vòng / món nào chôn lâu nhất?"
stockCapital (GĐ213) đếm kho chôn BAO NHIÊU vốn; chưa trả lời "BAO LÂU xoay hết" theo GIÁ TRỊ.
`stockTurn` (data/stockTurn.ts) gộp theo giá trị (số món đang có kệ+kho × giá mua):
avgDays = Σ(value×daysLeft)/Σvalue (ngày xoay vòng trung bình), topStale = món daysLeft null (không
bán) hoặc ≥ 20 ngày, xếp theo vốn chôn. StoragePanel thêm thẻ cạnh stockCapital: "⏳ Tồn kho quay
~N ngày/lần · chôn lâu nhất: X (Yđ) — xả sớm / giảm nhập". Nối GĐ211 (xả sỉ) / GĐ213 (vốn chôn) thêm
chiều THỜI GIAN. THUẦN ĐỌC. (+6 test)

## GĐ236 — 🦹 "Rò tiền vì trộm vặt — camera có đáng không?"
Camera (📹 800k, unlock 15) là nâng cấp đắt nhưng tính tới GĐ235 chưa nơi nào cho con số "mỗi ngày trộm
rút ~bao nhiêu hàng" — người chơi chỉ thấy thỉnh thoảng 🚨/🦹, không thấy payoff. `theftRisk`
(data/theftRisk.ts) đọc thuần hằng số cơ chế thật: RISK_RULES.theft.chance (0.015) × chó trông tiệm
(×0.45, khớp theftFactor) × camera (×0.7, khớp agents/customers.ts); giỏ bán lẻ TB = revenue/customers
hôm nay → trộm kỳ vọng/ngày × giỏ = giá trị hàng "lộ ra" mỗi ngày. Camera được ước lượng tiết kiệm
×0.3 mức lộ ra (kìm còn 70%) → số ngày hoàn vốn. Verdict low/moderate/high; locked khi chưa đủ cấp 15.
BusinessPanel thẻ camera thêm Callout cạnh nút mua: "🦹 Mỗi ngày trộm rút ~Xđ hàng · lắp camera tiết
kiệm ~Yđ/ngày, hoàn vốn ~Z ngày". UỚC LƯỢNG trung bình, deterministic (không RNG/seed). THUẦN ĐỌC.
(+6 test)

## GĐ237 — 🧑🍳 "Giờ nào đông mà vắng người bán? (xếp ca)"
staffValue (GĐ141) gán doanh thu/giờ cho TỪNG nhân viên; chưa ai trả lời "GIỜ nào đông nhưng vắng người
trực kịp" — quyết định xếp ca sáng/chiều/nguyên ngày. `serveCoverage` (data/serveCoverage.ts) đọc THUẦN
state: stats.byHour (khách/giờ 6–22) × staff[].shift (dùng shiftHourWindow, trùng cách staffValue). Mỗi
giờ: onDuty = số người trực, load = khách/onDuty, crowdedVacant = giờ ≥ 25 khách (SERVE_CROWD_MIN) mà
không ai trực → rủi ro bỏ về vì chờ. peak = giờ đông nhất; busiestStaffed = top 3 giờ đông còn người
trực; verdict warn khi có giờ đông-vắng. StaffPanel thêm Callout: "🍳 giờ Xh (~N khách) đông mà vắng
người bán · đông nhất còn người trực: … — cân nhắc xếp ca nguyên ngày". THUẦN ĐỌC, deterministic.
(+5 test)

## GĐ238 — 📈 "Lên 4,5⭐ app được thêm bao nhiêu đơn/ngày ≈ tiền?"
Giao đúng hẹn để điểm app lên 4,5⭐ là lời khuyên lặp đi lặp lại trong OnlinePanel/online.ts, nhưng
chưa ai cho con số "lên 4,5⭐ được THÊM ~N đơn/ngày ≈ Xđ" — quyết định bỏ công giao đúng hạn so với
nghỉ sớm. `onlineRatingValue` (data/onlineRatingValue.ts) đọc THUẦN: onlineOrderCap(rating, level) =
span/orderGap (khớp hằng số orderGap: ×1 ở 4,5⭐, ×1.4 ≥4⭐, ×2.2 ≥3⭐, ×4 dưới 3⭐) · revenueToday/done
= tiền/đơn thật hôm nay · grabFeesToday → phần trăm phí giao (ước lời ròng/đơn). So capNow với cap 4,5⭐
→ ordersToBest × avgNet = moneyBestPerDay; ngược lại ordersToFloor × avgNet khi rớt về 3⭐. Verdict
best/upside/nice/noData. OnlinePanel thêm Callout sau onlineNet: "📈 Lên 4,5⭐ thêm ~N đơn/ngày ≈ Xđ lời ·
rớt về 3⭐ mất ~Yđ". deterministic, không RNG/seed. THUẦN ĐỌC. (+5 test)

## GĐ239 — 🗂️ "Khu hàng nào đang gánh lời / khu nào chảy máu?" (theo danh mục)
profitMix (GĐ218) gộp lời theo TỪNG món, shelfSlotValue (GĐ226) theo ô kệ; chưa ai gộp theo KHU HÀNG
(category: khô/uống/mát/đông/gia dụng/tươi/thịt). `categoryMix` (data/categoryMix.ts) gộp ItemHealth đã
tin cậy theo category (ánh xạ qua resolver `categoryOf(id)` để tách rời, test dễ): mỗi khu = Σ profit30,
Σ revenue30, itemCount, margin; xếp giảm dần; best/worst, losing (khu lỗ 30 ngày). AnalyticsPanel thêm
Callout cạnh profitMix: "🚨 Khu hàng đang lỗ: X · Y — bớt nhập khu lỗ, đổi thêm mặt hàng khu chạy" hoặc
"🗂️ Khu gánh lời nhất: Z". THUẦN ĐỌC, deterministic. (+5 test)

## GĐ240 — ✅ QA TOÀN DIỆN (kết bộ soi tiền/vốn/risks GĐ226–239)
COVERAGE (test:coverage): statements 49.45% (16273/32906) · branches 86.85% (6127/7054) · functions
74.84% (1241/1658) · lines 49.45%. So với GĐ230: branch 86.96→86.85 (bộ helper mới thêm node rẽ nhánh,
tổng mẫu branch tăng), fn 74.77→74.84 (tăng), statements 49.38→49.45 (tăng). KHÔNG THỤT LÙI — mọi helper
mới đều có unit test deterministic (theftRisk/serveCoverage/onlineRatingValue/categoryMix: +21 test, 0
RNG/seed). FULL SUITE: 2127/2127 (207 file, xanh). BUILD: tsc + vite sạch (chỉ cảnh báo kích cỡ bundle
thường). BROWSER QA: IAB 1280px — tải game không lỗi, console không lỗi/exception nào, không tràn ngang
(overflowX=0) khi mở các panel cấp 1 (Sổ đầu ngày / Nhiệm vụ / Nhập hàng / Kho). 390/320 đã xác nhận ở
GĐ230 trên cùng vỏ UI; arc này chỉ thêm nội dung trong card responsive. LƯU Ý: 4 Callout mới đều gated
theo cấp (camera L15 / online L10 / sức khoẻ món cấp cao / phủ ca cần có nhân viên) nên không hiển thị ở
save cấp 1 — logic được test trực tiếp, giao diện nằm trong card đã mobile-validated.

## GĐ241 — 🧹 "Sàn bẩn mất bao nhiêu khách/ngày? — lau có đáng?"
Độ bẩn sàn giảm trực tiếp xác suất khách đi đường ghé: dirtVisitFactor = 1 − (dirt/100)×0.4
(staff.ts:49, nhân vào customers.ts:203) — bẩn tối đa mất tới 40% lượt ghé. HUD chỉ nhắc "bẩn, bấm [C]
lau" nhưng không cho con số thiệt hại. `dirtLoss` (data/dirtLoss.ts) THUẦN ĐỌC: dirt + level +
customers/revenue thật hôm nay → lostFraction, lostKhachPerDay = customersPerDay(level)×lostFraction
(cùng mô hình repPayoff GĐ148), moneyLostPerDay = khách mất × doanh thu TB mỗi lượt. Verdict clean/warn/
danger. HUD alert "🧹 Sàn tiệm bẩn" thêm dòng "bẩn này đang mất ~N khách/ngày (~Xđ)". THUẦN ĐỌC,
deterministic. (+5 test)

## GĐ242 — 🌦️ "Ngày mai trời thế nào — đông hay vắng khách? (trữ/ né nhập)"
HUD/buổi sáng chỉ hiện biểu tượng dự báo + tip mô tả, không cho con số. Mỗi thời tiết có hệ số ghé
thiết kế `WEATHER[*].traffic` (sunny 1.1 / cloudy 1.0 / rain 0.8 / storm 0.55 / fog 0.9 — khớp lời tip).
`trafficForecast` (data/trafficForecast.ts) THUẦN ĐỌC: khách đi đường ≈ customersPerDay(level)×traffic;
trả today/tomorrowTraffic, khách ước lượng, deltaPct, verdict hot (≥1.05 → trữ thêm) / slow (≤0.85 → né
nhập thêm). Sổ đầu ngày thêm dòng sau dòng "Hôm nay/mai": "Mai ⛅: khách ghé ~100% mức thường (~N khách) ·
Trời đông, trữ thêm món bán chạy / Trời vắng, đừng chất thêm hàng". deterministic (hằng số thời tiết).
THUẦN ĐỌC. (+5 test)

## GĐ243 — 📜 "Giấy phép còn thiếu/đang phạt tiền?"
Tiệm từ cấp 12 cần giấy phép (business/food/alcohol); thiếu/hết hạn bị phạt từng tờ LICENSE_FINE (200k)
và trượt thanh tra liền SUSPEND_AFTER (3) lần bị đình chỉ một ngày. Trước GĐ243 chưa có chỗ gộp "tiệm
mình đang thiếu/hết hạn những phép nào và phạt bao nhiêu". `licenseHealth` (data/licenseHealth.ts)
THUẦN ĐỌC map `licenses` + danh sách `need` (từ requiredLicenses) + `day`: liệt kê trạng thái từng phép
bắt buộc, nhóm missing (→ fineExposure = missing × 200k) và expiring (trong RENEW_WARN_DAYS → nên gia
hạn). Verdict ok/warn/danger. LicensesPanel thêm Callout đầu bảng: "🚨 Thiếu/hết hạn N phép — phạt tới
Xđ" / "⏰ N phép sắp hết hạn, nên gia hạn" / "✅ Đủ phép". THUẦN ĐỌC, deterministic. (+5 test)

---

**GĐ244 socialValue** — soi hiệu ứng buzz mạng xã hội ra khách/tiền. `socialValue` (data/socialValue.ts)
THUẦN ĐỌC: hệ số khách = `socialTraffic` (buzz.mul × promoBoost), rồi quy ra deltaKhach/ngày
(so với mức khách cơ bản customersPerDay) và tiền bằng avg giỏ hôm nay (revenue/customers). Phân loại
hype (×1.25 → thêm khách) / crisis chưa xin lỗi (×0.72 → mất khách, gợi ý xin lỗi: apologyGainKhach =
cpd × (APOLOGY_MUL−CRISIS_MUL) = 20% khách/ngày so với mặc kệ) / đã xin lỗi (×0.92) / calm. SocialPanel
thêm Callout "🔥 Buzz khen đang sinh tiền" (hype) và "🙏 Đã xin lỗi, khách đang quay lại" (crisis đã xin
lỗi); khủng hoảng chưa xin lỗi vẫn dùng thẻ chi tiết GĐ159 sẵn có. THUẦN ĐỌC, deterministic. (+5 test)

---

**GĐ245 festivalValue** — soi dịp lễ ra khách/tiền, bổ sung cho trữ hàng (GĐ70). `festivalValue`
(data/festivalValue.ts) THUẦN ĐỌC: nếu hôm nay có lễ (festivalOn) hoặc lễ sắp tới trong 3 ngày
(upcomingFestival) thì lấy hệ số khách `traffic` (Tết 1.7, mùa hè 1.1...) và hệ số giá nhập `cost`,
quy ra deltaKhách/ngày (so mức cơ bản customersPerDay) và tiền thêm/ngày theo giá giỏ ước (avg
7 ngày). Phân loại verdict huge/big/modest theo traffic. Liệt kê số món hot đã mở khóa. Sổ đầu ngày
(MorningPanel) hiện dòng định lượng ở CẢ HAI thẻ lễ: thẻ "đang diễn ra" (🎉 ước thêm ~N khách/ngày
≈ +Xđ/ngày · N món hot) và thẻ "⏳ Lễ sắp tới" (Còn N ngày: khách ×traffic (~N khách ≈ +Xđ/ngày)
· N món hot mở khóa · giá nhập +X% (bán đắt vẫn đông)). Không đụng state/save; deterministic. (+5 test)
