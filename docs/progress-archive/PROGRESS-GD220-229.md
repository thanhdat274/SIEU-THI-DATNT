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
