# Tạp Hóa 3D

Game 3D mở tiệm tạp hóa kiểu Stardew: sáng ở nhà, ra tiệm bán hàng, tối về ngủ. Tiệm lớn dần thành siêu thị, có chi nhánh tiện lợi 24/7, trang trại, chơi chung theo "hẻm" (2–4 người).

Công nghệ: React 19 + Three.js + Zustand, build bằng Vite. Server (Express + WebSocket) lo lưu cloud và hẻm online.

## Chạy thử

```bash
npm install
npm run dev      # game, mặc định http://localhost:5173
npm run server   # server cloud + hẻm online (cổng 3002), cần server/.env
npm test         # vitest
npm run build    # tsc + vite build ra dist/
```

Triển khai: xem [DEPLOY.md](DEPLOY.md).

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `src/core` | Trạng thái game (store Zustand chia slice), lưu/đọc, âm thanh |
| `src/data` | Dữ liệu và hàm thuần: sản phẩm, nhân viên, chi nhánh, thăng chức… |
| `src/ui` | HUD và các bảng (nhân viên, kho, giá bán, tiện lợi 24/7…) |
| `src/render`, `src/world`, `src/shop` | Cảnh 3D, tiệm, nhân vật |
| `src/net` | Cloud save, đăng nhập Google, chơi chung |
| `server` | Server lưu cloud và phòng hẻm online |
| `src/__tests__` | Test logic game |

## Nhân viên hai tiệm

Bảng **Nhân viên** gom cả tiệm chính và tiện lợi 24/7:

- Danh sách chia hai mục, tiện lợi xếp theo ca sáng, chiều, đêm, có cảnh báo thiếu thu ngân hoặc bảo vệ đêm.
- **Điều quân**: nút 🔀 trên từng người chuyển sang tiệm kia. Giữ nguyên tay nghề, kinh nghiệm, chức vụ, lương; không tốn phí; mỗi người một lần mỗi ngày.
  - Tiện lợi chỉ nhận thu ngân, xếp hàng, giao hàng, bảo vệ, quản lý.
  - Ca tự chỉnh cho hợp nơi mới (ca cả ngày thành ca sáng; ca đêm về tiệm chính khi chưa mở ca đêm thành ca chiều).
  - Số người tối đa được kiểm tra ở cả hai đầu.
- **Dồn hết sang tiệm chính**: chỉ khi chi nhánh đang đóng; chuyển tới khi tiệm chính đầy.
- Tab **Tuyển dụng** cho thuê ứng viên vào tiệm chính hoặc tiện lợi (chọn ca).

Code: `src/data/transfer.ts` (luật điều quân), `src/core/slices/staff.ts` (`transferStaff`, `evacuateBranch`), `src/ui/panels/StaffPanel.tsx`.

## Chơi chung

Hẻm có một máy chạy (runner) giữ trạng thái thật. Mọi hàm thao tác trong store của người chơi khác được gửi sang máy chạy rồi trạng thái đồng bộ lại (`src/net/coop.ts`). Hàm chỉ có tác dụng giao diện nằm trong `LOCAL_ACTIONS`.

## Quy ước

- Giao diện và thông báo bằng tiếng Việt.
- Thêm tính năng kèm test trong `src/__tests__`; chạy `npx tsc --noEmit` và `npm test` trước khi commit.
