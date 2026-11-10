# PERF — đo hiệu năng lặp lại được (SPEC-TOI-UU §T2-L2)

## Cách đo

Mở game (`npm run dev`), vào console trình duyệt:

```js
await game.bench()                 // cả 4 cảnh, 30 giây mỗi cảnh (~2 phút)
await game.bench(10, ['B2'])       // 10 giây, chỉ cảnh B2
```

Kết quả in một dòng `[bench] [...]` và trả về mảng. Mỗi dòng là **trung vị** của các mẫu 1 giây
(`fps`, `p95Ms`, `drawCalls`, `triangles`, `npc`, `jsMemory` MB, `hudRedraws`/giây, mức đồ hoạ `gfx`).

Lưu ý khi đo:
- Cảnh dựng lại store (`seedLevel`) → **đo xong phải tải lại trang** trước khi chơi tiếp.
- Đo ở tab đang hiện (trình duyệt hạ nhịp tab nền). Đóng tab/ứng dụng nặng khác.
- Ghi kèm tên máy/GPU/trình duyệt + mức đồ hoạ (`gfx`). So sánh chỉ có nghĩa trên CÙNG máy.

## 4 cảnh

| Mã | Cảnh |
|----|------|
| B1 | Tiệm cấp 10, 6 kệ, 9:00, nắng |
| B2 | Mini mart cấp 30, 12 kệ đầy, 17:00 (cao điểm), nhiều mây |
| B3 | Đại siêu thị cấp 75, 12 kệ đầy + 10 cây trang trí, 17:00 |
| B4 | Hẻm ban đêm (21:00) trời mưa, camera ngoài nhìn vào tiệm |

## Bảng số đo

Trạng thái: **chưa đo trên máy thật** (môi trường dựng lệnh không có GPU). Điền khi có số.

| Ngày | Máy / GPU / trình duyệt | Cảnh | FPS | p95 ms | draw calls | tam giác | NPC | JS MB | HUD/giây | gfx |
|------|-------------------------|------|-----|--------|------------|----------|-----|-------|----------|-----|
| — | — | B1 | | | | | | | | |
| — | — | B2 | | | | | | | | |
| — | — | B3 | | | | | | | | |
| — | — | B4 | | | | | | | | |

Ngưỡng tham chiếu: máy tầm trung nên giữ ≥ 30 FPS ở B2; B3/B4 là cảnh nặng nhất — nếu < 30 FPS thì
bậc đồ hoạ tự hạ (`gfx`) phải kéo lên được, ghi lại vào bảng.
