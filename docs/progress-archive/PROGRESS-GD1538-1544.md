# Lưu trữ GĐ1538–1544

- **GĐ1544** — Chơi máy xong mua thêm: cấp ≥40, khách ghé máy 30% thêm 1 món muốn mua (`machineImpulse`) — máy kéo thêm doanh thu bán lẻ. Test machines.test.ts. (Kèm lưu trữ GĐ1528–1532.)
- **GĐ1543** — QA trình duyệt bù cho GĐ1540 (save khách mới, IndexedDB trống trước/sau): bán món đầu sau ~46 giây game kể từ mở cửa (tự mở cửa do vòng lặp main.tsx); ghế mát-xa cấp 40 lúc 19h thu 3.600đ/lượt (giá tối ×1,5), ghi vào sổ theo máy. Không lỗi.
- **GĐ1542** — Sổ thu theo máy: phí máy ghi vào `biz.serviceLife[loại máy]` (đã lưu sẵn trong save); dòng thông tin khi đặt máy hiện "đã thu Xđ". Test machines.test.ts.
- **GĐ1541** — Gắp thú cuối tuần: cấp ≥35, thứ 7/CN máy gắp thú ×1,5 phí/lượt (`machineFeeAt(..., day)`). Test machines.test.ts.
- **GĐ1540** — Audit 1531–1539: không trùng tính năng (máy thu phí gom đủ ở machines.ts: loại, phí giờ tối, dòng thông tin). QA bằng trình duyệt **chưa chạy**: dev server :5173 không bật (luật cấm tự bật) → chỉ kiểm bằng economySim (nhịp bán đầu, 7/7 qua) + toàn bộ 5112 test. Lần tới server bật thì QA save mới + xem ghế mát-xa.
- **GĐ1539** — Dòng thông tin máy khi cầm/dời ở chế độ xây: phí/lượt, số lượt hoàn vốn, ghi chú "tối ×1,5" (`machinePopupLine`). Test machines.test.ts.
- **GĐ1538** — Phí máy giờ tối: từ 18h (cấp ≥35) máy bán nước + ghế mát-xa ×1,5 phí/lượt (`machineFeeAt`). Test machines.test.ts.
