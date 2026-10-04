# SIÊU THỊ TẠP HÓA ĐẦU HẰM

## Giới thiệu

**Siêu Thị Tạp Hóa Đầu Hằm** là bản mô phỏng quản lý cửa hàng tạp hóa với đồ họa
Pixel Art sống động. Người chơi sẽ đảm nhiệm vai trò quản lý toàn diện: từ việc
mua sắm nguyên liệu, sắp xếp kế hoạch trưng bày (Planogram), định giá, đến cân
đối sổ cái theo chuẩn GAAP. Game nổi bật với cơ chế kinh tế sâu (thị trường biến
động, thuế, kiểm tra), hệ thống thời tiết động và hỗ trợ chơi mạng (Co-op) để
cùng bạn bè điều hành siêu thị.

## Công nghệ

Dự án được xây dựng dựa trên kiến trúc Monorepo hiện đại:

- **Client:** React 19, Vite, PixiJS (đồ họa 2D), TypeScript.
- **Server:** NestJS, Firebase Authentication, MongoDB.
- **Công cụ:** Yarn Workspaces, Testing Library, ESLint.

## Hướng dẫn cài đặt & Chạy

**1. Cài đặt môi trường:** Đảm bảo máy bạn đã có **Node.js** (lưu ý: file hiện
tại có thể yêu cầu Node < 22 để chạy ổn định yarn workspaces) và **Yarn**.

**2. Cài đặt gói:**

```bash
yarn install
```

**3. Khởi chạy Server (Backend):**

```bash
cd apps/server
yarn dev
```

**4. Khởi chạy Web (Frontend):**

```bash
cd apps/web
yarn dev
```

**5. Các lệnh quan trọng:**

- `yarn typecheck`: Kiểm tra lỗi kiểu dữ liệu (TypeScript).
- `yarn test`: Chạy toàn bộ hệ thống kiểm thử (Unit & Integration).
- `yarn lint`: Kiểm tra và chỉnh sửa code style.
