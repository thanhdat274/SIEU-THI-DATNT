# Rà thông báo (GĐ826) — ứng viên cần duyệt viết lại

Ước lượng mỗi ${…} dài 12 ký tự; ~23 câu có thể vượt 90 khi chạy thật. CHƯA sửa câu nào — chờ duyệt từng câu (bài học GĐ803–808: không rút gọn khi chưa đo đúng, không làm mất nghĩa).
Chạy lại: `node scripts/audit-notify.mjs`.

- 113 83 src\core\slices\garden.ts | ${def.icon} Đã trồng ${def.name} (${formatMoney(def.seedCost)}): ~${def.days} ngày nữa thu được, nhớ tưới mỗi sáng${extra}
- 106 82 src\core\slices\garden.ts | Cần ${cost.wood} gỗ + ${cost.stone} đá (đang có ${s.garden.wood} gỗ, ${s.garden.stone} đá) — dọn trại mỗi sáng là có
- 103 73 src\core\slices\garden.ts | 🧺 Thu hoạch ${qty} ${productById(def.productId).name} nhà trồng${doubled ? ' — bù nhìn trúng: thu gấp đôi!' : inSeason(def, s.day) && def.season ? ' (đúng mùa vụ, trái sai)' : ''}: bán được giá hơn ${Math.round(HOMEGROWN_PREMIUM * 100)}%${note}
- 101 89 src\core\biz.ts | ${v.icon} Có ${v.name}: ngoài đường đi nhanh hơn, đi lại nhà ↔ tiệm đỡ tốn giờ, giao hàng nhanh
- 101 65 src\core\slices\garden.ts | ${def.icon} Xuất chuồng ${readyCount} ${def.name.toLowerCase()} (${meat} ${productById(def.productId).name} vào kho)${late ? 
- 100 76 src\core\slices\garden.ts | ${def.icon} Mua một con ${def.name.toLowerCase()} (${formatMoney(def.price)}): cho ăn cám mỗi ngày là có sản phẩm${late ? ' — mua giữa kỳ vỗ béo: con này xuất chuồng chỉ nhận lại giá giống' : ''}
- 100 70 src\core\slices\garden.ts | 🧹 Dọn ${debris} đống: nhặt ${wood} gỗ, ${stone} đá (có ${s.garden.wood + wood} gỗ, ${s.garden.stone + stone} đá)
- 100 88 src\ui\OrderPanel.tsx | ⚠️ Sau đơn này chỉ còn ${formatMoney(Math.max(0, moneyLeft))}, chưa đủ ${formatMoney(wages)} lương cuối ngày. Bấm lần nữa nếu vẫn nhập.
- 98 86 src\core\biz.ts | 🍜 Ăn tô phở sáng (${BREAKFAST.price.toLocaleString('vi-VN')}đ): hôm nay đi nhanh hơn, thức khuya thêm ${BREAKFAST.lateMinutes} phút mới ngất
- 98 62 src\core\slices\regulars.ts | 🎂 Sinh nhật ${def.name}: +${BIRTHDAY_BONUS} thân thiết${tip}${resNote}${giftNote}${arcNote}
- 97 67 src\core\slices\staff.ts | ${chk.def.icon} ${st.name} được thăng ${chk.def.name}! Thưởng ${formatMoney(chk.def.cost)}, lương mới ${formatMoney(next.wage)}/ca
- 96 90 src\main.tsx | 🎨 Máy hơi nặng nên game tự giảm đồ họa xuống "${GFX_LABEL[gfx.step.level]}" cho mượt hơn. Đổi ở ⋯ Thêm → Đồ họa.
- 95 71 src\core\biz.ts | 🤝 Vào hụi ${formatMoney(o.daily)}/ngày, ${o.members} chân. Ngày ${turn} tới lượt bạn hốt ${formatMoney(o.daily * o.members)}
- 94 76 src\core\biz.ts | 🛒 Đã nhận lô chợ phiên tháng ${offer.month}: ${ls} — tiết kiệm ${formatMoney(offer.totalBuy - offer.dealPrice)} so với mua lẻ
- 93 81 src\core\slices\progress.ts | 🎯 TRÚNG KÈO! Làm trọn việc chính hôm nay ở mục tiêu ×${bet.tier} — thưởng thêm +${formatMoney(bonus)}
- 93 63 src\core\slices\quanNuoc.ts | ${r.icon} Tự pha ${QUAN_HAND_CUPS} ly ${r.name}: +${formatMoney(b.revenue)} (còn ${left - 1} mẻ hôm nay)
- 92 74 src\core\biz.ts | 🏢 Mua lại ${offer.name}: khách cũ ghé đông ${RIVAL_BUY_DAYS} ngày, chi nhánh nhận ${moved} món
- 92 80 src\core\biz.ts | ${def.icon} Đã mở dịch vụ ${def.name}: khách sẽ ghé quầy dùng dịch vụ, nhiều người mua kèm
- 92 74 src\core\slices\garden.ts | Máng còn ${feedKg.toFixed(1)} kg, kho hết cám — mua lẻ cần ${formatMoney(cost)} hoặc nhập ${productById(def.feedProduct).name} trước
- 92 74 src\core\slices\garden.ts | 📦 Giao đơn cho ${order.from}: thu ${formatMoney(pay)} (giá hời ×${order.bonus} cho nông sản nhà trồng)
- 92 68 src\core\slices\orders.ts | 🤝 Cam kết "${def.title}": trữ ${Object.values(def.items).reduce((n, q) => n + q, 0)} món, cọc ${formatMoney(deposit)}. Giao đủ hạn +${formatMoney(commitBonusValue(def))}.
- 92 74 src\core\slices\regulars.ts | 🤝 Đã hẹn giữ ${qty} ${productById(productId).name} cho ${regularById(regularId)?.name} — mai khách ghé lấy, nhớ bày đầy kệ!
- 91 55 src\core\slices\regulars.ts | 💛 ${def.name} thân thiết hơn: ${r.newPerks.map((p) => p.description).join(' ')}${tip}${resNote}${giftNote}${arcNote}
- 90 72 src\core\slices\garden.ts | ${def.icon} Xây xong ${def.name} (sao 1/3): ${def.note}. Dọn trại lấy gỗ đá mà nâng sao
- 89 77 src\core\slices\orders.ts | 🍳 Đang nấu ${r.name} (${r.durationMin} phút) — nguyên liệu đã trừ kho, nấu xong tự vào kho
- 89 65 src\core\slices\orders.ts | 🎉 Cả hẻm hoàn thành mục tiêu ${goal.festival.name}! +${formatMoney(goal.reward.money)}, +${goal.reward.xp} XP${host ? 
- 88 82 src\core\slices\garden.ts | 💧 Đã tưới ${todo} luống: tưới đủ mỗi ngày cây lớn nhanh gấp rưỡi, mưa thì khỏi tưới
- 88 88 src\core\slices\online.ts | 📲 Đã mở gian hàng trên app! Đơn sẽ đổ về khi tiệm mở cửa — giao đúng hẹn để giữ điểm cao
- 88 76 src\core\slices\progress.ts | 🎯 Chốt "${def.name}": làm trọn việc chính ×${def.tier} là trúng kèo, hụt không mất gì!
- 87 69 src\core\biz.ts | ${item.icon} Đã sắm ${item.name} cho nhà: ngủ ngon hơn, sáng đi nhanh hơn ${Math.round(item.rest * 100)}%
- 87 75 src\core\slices\inventory.ts | 📦 Kho thiếu chỗ: cần ${qty} thùng, trống ${Math.max(0, cap - storageUsed(s.storage))}. Nâng kho hoặc nhập ít lại.
- 86 68 src\core\biz.ts | 🏦 Vay gấp ${formatMoney(amount)} để nhập hàng, lãi ${(LOAN_DAILY_RATE * 100).toFixed(1)}%/ngày, hạn trả ngày ${s.day + LOAN_DAYS}

## Đề xuất viết lại (GĐ833) — CHỈ ĐỀ XUẤT, chờ duyệt; giữ đủ nghĩa, tách mỗi câu một ý, không rút bằng cách bỏ ý
Nguyên tắc: không cắt chữ để đủ 90; nếu một câu cần 2 ý thì để ý thứ hai ở panel/tooltip, hoặc tách 2 thông báo.

| Hiện tại (file) | Vấn đề | Đề xuất |
|---|---|---|
| `⚠️ Sau đơn này chỉ còn ${tiền}, chưa đủ ${lương} lương cuối ngày. Bấm lần nữa nếu vẫn nhập.` (OrderPanel) | 2 ý: cảnh báo + hướng dẫn | Giữ nguyên (cảnh báo xác nhận cần cả hai; độ dài thật ≈ 80) |
| `${icon} Đã mở dịch vụ ${tên}: khách sẽ ghé quầy dùng dịch vụ, nhiều người mua kèm` (biz.ts) | ý thứ hai lặp ý đầu | `${icon} Đã mở dịch vụ ${tên}: khách dùng dịch vụ hay mua kèm hàng` |
| `Máng còn X kg, kho hết cám — mua lẻ cần ${tiền} hoặc nhập ${cám} trước` (garden.ts) | 3 ý | Giữ (là cảnh báo hành động, cần đủ cả hai lối ra) |
| `${icon} Đã trồng ${cây} (${giá}): ~${n} ngày nữa thu được, nhớ tưới mỗi sáng${extra}` (garden.ts) | `${extra}` không giới hạn | Chuyển phần `${extra}` sang dòng riêng/panel vườn |
| `🧺 Thu hoạch ... bán được giá hơn X%${note}` (garden.ts) | 2 nhánh phụ cộng dồn | Đặt `note` vào panel, chỉ để câu chính |
| `🎂 Sinh nhật ...${tip}${resNote}${giftNote}${arcNote}` (regulars.ts) | 4 đoạn nối, độ dài không chặn | Chỉ giữ 1 đoạn ưu tiên cao nhất, phần còn lại vào Sổ khách quen |

Cần bạn chọn câu nào duyệt viết lại; tôi sẽ sửa theo từng câu và chạy lại `scripts/audit-notify.mjs` + `featureBudget.test.ts`.
