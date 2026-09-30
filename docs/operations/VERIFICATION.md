# Nghiệm thu vận hành (adapt-reference-shop-operations)

## 30/09/2026 — bằng chứng thực đã chạy
| Kiểm tra | Kết quả |
| --- | --- |
| `yarn typecheck`, `yarn test`, `yarn build` (web 814.44 kB), `apps/server test:gateway` | PASS |
| `packages/game-core/src/integration.test.ts`: vòng 3 ngày headless (đặt hàng, giao, bày kệ, khách, bán, tuyển thu ngân, lương, auto-buy, xuất/nạp save) | PASS; Δtiền = tổng sổ cái (lệch 0) |
| Chrome thật (1568×744): mở Nhập hàng, Quầy, Nhiệm vụ, Sổ bán hàng, tab Nhân viên, châm kệ, khách đầu tiên vào tiệm | Hiển thị đúng |

## Lỗi đã tìm thấy và sửa
- Phí tuyển nhân viên trừ tiền nhưng không ghi sổ cái/báo cáo ngày, làm lãi ròng bị phóng đại (sửa ở `simulation.ts` `hireStaff`).
- Khối "Tự nhập hàng" dùng ô nhập trắng, chiếm đầu modal: đã gập mặc định và style pixel.
- Bong bóng "[E]" không co theo độ dài chữ; nền ngoài tiệm là gạch xám phẳng (nay là cỏ).

## Chưa nghiệm thu (không coi là PASS)
- Vòng 3 ngày trong browser: tab tự động bị throttle nên đồng hồ game chạy chậm khoảng 20 lần, không đo được thời gian thực.
- 9.4 render worker/trạng thái bận, 11.2 hiệu năng p95/mobile/thiết bị thật, 11.3 replay multiplayer.
- Test có worker làm việc, hàng hết hạn trong vòng 3 ngày.
