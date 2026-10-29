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
