# Tổng hợp hiện trạng code — Tiệm Tạp Hóa Đầu Hẻm

> Cập nhật: 30/09/2026 (Asia/Saigon). Phiên bản package: 0.1.0. Đây là tài liệu hiện trạng và công việc cần làm, lấy code làm căn cứ; không xem kế hoạch hoặc checkbox là bằng chứng chức năng đã hoàn thiện.
> Phạm vi: ứng dụng web/server, bốn package dùng chung, công cụ nội dung, tài liệu thiết kế, thuế và OpenSpec UI. Đã chạy lại typecheck/test/build; bằng chứng giao diện và hiệu năng cũ được ghi riêng. Chưa chạy lại trình duyệt hay kiểm tra điện thoại thật trong lần tổng hợp này.

## 1. Dự án hiện làm được gì?

Dự án đã có bản game quản lý tiệm chạy trên trình duyệt với vòng chơi thực: di chuyển → nhập hàng bằng tiền → hàng giao sáng hôm sau → kiểm kê nhà kho → bày/cất hàng → bán → cộng tiền và XP → lên cấp → lưu và tải lại tiến trình. Có một NPC mua hàng tại một thời điểm, nhà kho vật lý đi vào được và giao diện pixel tiếng Việt cho desktop/mobile nằm ngang.

Chưa phải game quản lý siêu thị hoàn chỉnh: thiếu hàng đợi và thu ngân tương tác với khách, báo cáo lợi nhuận theo ngày, nhiệm vụ, xây dựng/mua đất, nhân viên, đăng nhập, đồng bộ cloud, PWA, sự kiện và multiplayer. Thuế mới có tài liệu nghiên cứu và registry quy tắc; chưa có tính/thu/nộp thuế trong gameplay.

### Quy ước đánh giá

| Trạng thái | Ý nghĩa |
| --- | --- |
| Đã có | Tìm thấy logic và đường nối vào ứng dụng; không đồng nghĩa mọi tình huống đã nghiệm thu |
| Một phần | Có nền hoặc luồng đơn giản, còn thiếu hành vi quan trọng |
| Chưa có | Chỉ có định hướng/tài liệu, chưa có triển khai sử dụng được |
| Cần kiểm chứng | Có code nhưng thiếu bằng chứng chạy hoặc chất lượng chưa đạt |

## 2. Bản đồ code: sửa hoặc bổ sung ở đâu?

| Khu vực | Trách nhiệm thực tế | Điểm vào chính |
| --- | --- | --- |
| `apps/web` | React, giao diện, kết nối simulation/renderer, lưu local | `src/App.tsx`, `src/main.tsx`, `src/db.ts` |
| `apps/web/src/store` | Zustand giữ dữ liệu hiển thị và trạng thái modal/toast | `useGameStore.ts` |
| `apps/web/src/components` | HUD, quầy, đại lý, kệ, kho, túi, lưu, joystick | Các file `*Modal.tsx`, `HUD.tsx`, `WarehouseDock.tsx`, `BottomBar.tsx` |
| `apps/web/src/components/pixel` | Component dùng chung, dialog/focus, nút, icon, số lượng, tiến trình | `index.tsx`; token và layout ở `apps/web/src/index.css` |
| `packages/shared` | Kiểu sản phẩm, lô, đơn, khách, fixture, save và hằng số | `src/index.ts` |
| `packages/game-data` | 36 sản phẩm/10 nhóm, giá/cấp/hạn, bản đồ và save ban đầu, mô tả pixel art | `src/products.ts`, `src/map.ts`, `src/pixel-art.ts` |
| `packages/game-core` | Logic kho/giao dịch/khách/XP/save, input, va chạm, giờ, A* | `src/simulation.ts`, `stock.ts`, `input.ts`, `collision.ts`, `clock.ts`, `pathfinding.ts` |
| `packages/game-core/src/tax` | Registry phiên bản quy tắc và ứng viên nghiên cứu, chưa tính thuế | `registry.ts`, `research.ts`, `registry.test.ts` |
| `packages/game-renderer` | Pixi, camera, sprite/texture, animation, kho, ngày/đêm | `src/viewport.ts`, `camera.ts`, `textures.ts`, `premium-textures.ts`, `warehouse-textures.ts` |
| `apps/server` | Khung class catalog và kiểm tra save rất sơ bộ | `src/main.ts`; chưa là dịch vụ HTTP |
| `tools/content-editor` | Mới có README định hướng | Chưa có editor catalog/map sử dụng được |
| `assets` | Tài liệu nguồn/anchor/license của art | `README.md`; nhiều hình được tạo bằng code procedural |
| `docs/ui` | Tài liệu UI/kho, nghiệm thu, ảnh và script QA | `VERIFICATION.md`, `WAREHOUSE.md`, `qa/*.cjs`, `qa/*.json` |
| `docs/tax` | Tám tài liệu nghiên cứu và kế hoạch hệ thống thuế | Chưa là engine chạy trong game |
| `openspec/changes/premium-vietnamese-pixel-ui` | Proposal/design/spec/tasks của thay đổi UI và kho | Cần đối chiếu kết quả nghiệm thu trước khi archive |

Luồng dữ liệu: `game-data` tạo dữ liệu đầu → `db.ts` đọc save → `GameSimulation` giữ trạng thái nghiệp vụ → callback đồng bộ sang Zustand/React; Pixi đọc simulation để vẽ → `exportSaveData` tạo snapshot → hàng đợi lưu trong `App.tsx` → Dexie. Kho và “túi” dùng chung `inventory`, không phải hai kho độc lập.

Hiện dùng Yarn 1 workspaces và `yarn.lock`; không có package `game-ui` riêng. Core là các class/module, chưa có ECS entity/component/system đầy đủ như kiến trúc dự kiến.

## 2.1. Công nghệ đang dùng trong dự án

Phiên bản có dấu `^` dưới đây là khoảng phiên bản khai báo trong `package.json`, không phải khẳng định bản cài chính xác. `yarn.lock` quyết định phiên bản được resolve khi cài; ví dụ lần build vừa chạy báo Vite 5.4.21 dù khai báo `^5.2.11`. Không lấy phiên bản mới nhất trên mạng làm phiên bản của dự án.

| Nhóm | Công nghệ / phiên bản khai báo | Đang dùng để làm gì? | Nguồn kiểm tra |
| --- | --- | --- | --- |
| Ngôn ngữ | TypeScript `^5.4.5`, TSX | Code web/core/renderer/server, kiểu dữ liệu dùng chung; bật `strict` | Các `package.json`, `tsconfig.base.json`, `apps/web/tsconfig.json` |
| Giao diện | React và React DOM `^18.3.1` | Component, hook, render UI; root bật StrictMode | `apps/web/package.json`, `src/main.tsx` |
| Trạng thái UI | Zustand `^4.5.2` | Đồng bộ dữ liệu hiển thị và điều phối modal/toast; simulation giữ nghiệp vụ | `src/store/useGameStore.ts` |
| Đồ họa game | PixiJS `^8.1.6` | Canvas renderer, sprite, texture, ticker, layer, camera và hiệu ứng; không dùng engine game ngoài Pixi cho logic | web/renderer `package.json`, renderer `viewport.ts` |
| Tạo asset | Canvas 2D và code pixel art procedural | Tạo hình sản phẩm/nhân vật/fixture và cache thành texture; dùng chung dữ liệu art cho UI và game | game-data `pixel-art.ts`, renderer `*textures.ts`, UI `components/pixel` |
| Lưu local | Dexie `^4.0.7` + IndexedDB của trình duyệt | Transaction, revision và một slot lưu trên trình duyệt | `apps/web/src/db.ts` |
| CSS | Tailwind CSS `^3.4.3` + CSS viết riêng | Có pipeline Tailwind; layout và hệ pixel hiện dùng nhiều class/token CSS tự định nghĩa | `tailwind.config.js`, `src/index.css` |
| Xử lý CSS | PostCSS `^8.4.38`, Autoprefixer `^10.4.19` | Chạy plugin Tailwind và bổ sung prefix CSS lúc build | `postcss.config.js` |
| Dev/build web | Vite `^5.2.11`, plugin React `^4.2.1` | Dev server, React transform, bundle production; plugin nội bộ reload toàn game khi source thay đổi | `apps/web/vite.config.ts`, `package.json` |
| Monorepo/package manager | Yarn **1.22.22** workspaces | Liên kết `apps/*` và `packages/*`, chạy scripts và khóa dependency bằng `yarn.lock` | root `package.json`, `yarn.lock` |
| Runtime công cụ | Node.js | Chạy Yarn, TypeScript, Vite và test; môi trường kiểm tra có Node 20.19.0, repo chưa khai báo `engines` | Log kiểm tra và root `package.json`; `@types/node ^20.12.7` chỉ là kiểu dữ liệu |
| Kiểm tra kiểu | TypeScript CLI `tsc` | Root typecheck theo các package; server build và web kiểm tra trước Vite build | Scripts root/web/server |
| Test lõi | `tsx ^4.23.15` + runner assert tự viết | Thực thi test TypeScript về gameplay/input/kho/registry thuế | `packages/game-core/src/test-runner.ts` |
| Browser QA | Script `.cjs` dùng Playwright | Smoke UI, screenshot và metrics đã lưu; chưa là script test chuẩn của workspace | `docs/ui/qa/verify-*.cjs`; không thấy Playwright khai báo trong package.json root/web |
| API trình duyệt | Pointer/touch/keyboard events, ResizeObserver, matchMedia, canvas | Điều khiển, responsive, resize canvas, DPR và reduced-motion | web components/input/renderer |
| Thuật toán nội bộ | A*, va chạm AABB/tile, fixed timestep, Y-sort, lô theo hạn | Tự viết bằng TypeScript; chưa dùng thư viện ECS, physics hoặc pathfinding riêng | core `pathfinding.ts`, `collision.ts`, `stock.ts`, renderer `viewport.ts` |
| Quy trình đặc tả | OpenSpec | Lưu proposal/design/spec/tasks của thay đổi; không phải dependency runtime game | `openspec/`, `.agents/skills/openspec-*` |

### Dependency đã khai báo nhưng chưa thấy dùng trong source hiện tại

- `lucide-react ^0.378.0`: có trong dependency web, chưa tìm thấy import ở `apps/web/src`; UI hiện dùng `PixelIcon` tự xây. Cần kiểm tra trước khi quyết định gỡ.
- `@types/react ^18.3.3`, `@types/react-dom ^18.3.0`, `@types/node ^20.12.7`: hỗ trợ TypeScript trong phát triển, không phải framework chạy trong game.

### Công nghệ mới nằm trong kế hoạch, chưa tích hợp chạy thật

| Công nghệ / mô hình | Hiện trạng |
| --- | --- |
| NestJS | Chưa cài và bootstrap thành server; `GameApiController` hiện là class TypeScript thường |
| MongoDB Atlas / Mongoose | Chưa có kết nối, model hoặc lưu cloud |
| Firebase Authentication / Firebase Admin | Chưa có login Google, SDK hoặc xác thực token |
| PWA / service worker | Chưa có manifest và cơ chế offline shell/cài ứng dụng hoàn chỉnh |
| ECS đầy đủ | Kiến trúc dự kiến; core hiện dùng class/module |
| Engine tính thuế | Registry tự viết mới là nền; chưa có engine kế toán/thuế sử dụng trong gameplay |
| ESLint / formatter / CI | Chưa có pipeline lint/format/CI được cấu hình trong các file dự án đã rà soát |
| pnpm | Tài liệu cũ có nhắc, nhưng cấu hình hiện hành dùng Yarn |

Khi đổi dependency, cập nhật bảng này theo package.json/lockfile và source import thực tế; ghi rõ dependency được thêm mới, gỡ, chỉ phục vụ dev hay đã nối vào gameplay.

## 3. Chức năng đã triển khai và giới hạn cụ thể

### 3.1. Bản đồ, nhân vật và thời gian — Đã có

- Bản đồ tổng 26×22 ô, origin Y = −6; gian bán ban đầu 8×8 cùng đường hẻm/vỉa hè; nhà kho có vùng sàn 6×5 phía trên tiệm và cửa hậu.
- Hai kệ gỗ, một quầy, một tủ mát; kho có giá khô, góc lạnh và bàn nhận hàng.
- WASD/mũi tên; E hoặc Space tương tác, I mở túi, Escape đóng modal; joystick/nút cảm ứng và cảnh báo xoay ngang.
- Va chạm tile/fixture, chuẩn hóa tốc độ đi chéo, xóa held keys khi mất focus hoặc khóa input.
- Mô phỏng bước 1/60 giây trong ticker renderer; giới hạn thời gian khung hình và số bước để tránh vòng lặp bù vô hạn.
- Camera theo nhân vật, kéo/pinch/zoom nguyên 1×–3×, định vị nhà kho bằng camera, không teleport người chơi.
- Mặc định 1 giây thật = 1 phút game; nút 1×/2× đổi tốc độ đồng hồ. Khi tới 22:00 chuyển sang ngày kế lúc 07:00; có nút qua ngày và đóng/mở cửa.
- Lưu ý: đóng cửa làm đồng hồ dừng; qua ngày giữ trạng thái mở/đóng hiện tại. Tốc độ 2× chưa nhân tốc độ di chuyển hoặc bộ đếm kiên nhẫn NPC.

Nguồn: `game-data/src/map.ts`, core `input.ts`/`collision.ts`/`clock.ts`, renderer `camera.ts`/`viewport.ts`, `App.tsx`.

### 3.2. Sản phẩm, nhập hàng và tồn kho — Đã có

- 36 mặt hàng thuộc 10 nhóm; dữ liệu dùng chung cho đại lý/kho/kệ/quầy, gồm giá nhập, giá bán, sức chứa sản phẩm, cấp mở khóa, loại bảo quản và hạn theo ngày game.
- Đặt từng mặt hàng với số lượng nguyên dương; core chặn hàng không tồn tại, cấp chưa đủ, thiếu tiền và vượt chỗ lạnh. Trừ tiền ngay lúc đặt.
- Đơn lưu `unitCost`, `arrivalDay` và được lưu/tải; sáng hôm sau tự giao vào kho và gỡ khỏi pending, không cần bấm nhận lần hai.
- Kho lạnh 40 món tính cả chỗ dành cho đơn lạnh đang chờ; tủ mát bán hàng 12 món. Hàng lạnh chỉ được bày trong tủ mát, hàng khô vào kệ thường.
- Bày/cất hàng bảo toàn lô và số lượng; một kệ chỉ chứa một sản phẩm; giới hạn theo số nhỏ hơn giữa capacity kệ và sản phẩm.
- Lô sắp hết hạn được dùng trước. Đầu ngày loại lô có `expiresOnDay <= day` ở cả kho/kệ, tăng `totalSpoiled` và có toast.
- Kho vật lý, WarehouseDock, InventoryModal và WarehouseModal đọc cùng nguồn tồn; có lọc khô/lạnh, hạn từng lô, pending và châm kệ.
- “Châm các kệ” chỉ bổ sung sản phẩm đã được gán trên kệ; không tự chọn sản phẩm mới cho kệ trống. Kho khô chưa có giới hạn tổng sức chứa nghiệp vụ.
- Chưa có hủy đơn/hoàn tiền, giỏ nhiều hàng xác nhận một lần, nhiều nhà cung cấp, vận chuyển trễ, tăng cấp kho, hoặc đặt giá bán tùy chỉnh.

Nguồn: core `simulation.ts`/`stock.ts`, data `products.ts`, UI `SupplierModal.tsx`, `ShelfModal.tsx`, `WarehouseModal.tsx`, `InventoryModal.tsx`.

### 3.3. Bán hàng, khách NPC, XP và uy tín — Một phần

- Quầy có nút bán từng món đang ở kệ khi tiệm mở; giảm một món/lô, cộng giá bán, doanh thu tích lũy, một lượt phục vụ và 5 XP.
- XP đạt ngưỡng sẽ lên cấp; XP dư được giữ, ngưỡng tiếp theo tăng 1,5 lần lấy phần nguyên. Sản phẩm có khóa cấp 1/2 và được mở khi đạt cấp tương ứng.
- A* tìm đường tới kệ/quầy/cửa; NPC không đi mua trong kho. Một NPC tại một thời điểm, lựa kệ có hàng luân phiên theo số lượt đã phục vụ.
- Khách đi tới kệ → quầy → tự thanh toán sau 2,5 giây → rời tiệm; lưu cả trạng thái đang đi và khôi phục đường.
- Kiên nhẫn ban đầu 45 giây mô phỏng; có giảm uy tín khi hết kiên nhẫn, tiệm đóng trong luồng cập nhật khách hoặc thanh toán thất bại. Có ba biến thể ngoại hình, không phải ba NPC đồng thời.
- Chưa có hàng đợi, giỏ nhiều món, giữ chỗ hàng cho khách, thao tác thu ngân phục vụ khách đang chờ, tính tiền/thối tiền, hoặc hiển thị độ hài lòng chi tiết.
- `demandProfile.basePopularity` có trong catalog nhưng chưa tham gia lựa hàng; uy tín chưa thành hệ thống ảnh hưởng sức mua/nhịp khách.
- Nút bán thủ công chưa yêu cầu NPC đang chờ, vì vậy có thể bán liên tục để kiếm tiền/XP; lượt này vẫn tăng `totalCustomersServed`.

Nguồn: `simulation.ts` (`updateCustomer`, `routeCustomer`, `checkoutShelf`, `addExperience`), shared `CustomerState`, `CashierModal.tsx`, renderer `viewport.ts`.

### 3.4. Giao diện và đồ họa — Đã có, còn nghiệm thu

- UI pixel tiếng Việt, HUD tiền/ngày/giờ/cấp/XP/khách, panel kho, footer, modal đại lý/kệ/kho/quầy/túi/lưu, toast tối đa ba mục.
- Điều phối một modal, dialog semantics, focus trap/restore, Escape, khóa và xóa world input; nút reset có xác nhận và trạng thái chờ/thành công/thất bại.
- Texture procedural nguyên bản, fallback sản phẩm, cache, animation nhân vật bốn hướng, Y-sort, badge tồn kho, tiền nổi, môi trường chuyển động và overlay tối theo giờ.
- DPR cap 2, nearest sampling/camera nguyên, reduced-motion giảm hoạt ảnh. ArtLab chỉ mở ở DEV bằng `/?art-lab`.
- Có ảnh/script QA nhiều viewport và kiểm tra kho trước/sau giá ở DPR1/2; xem mục kiểm thử để phân biệt bằng chứng cũ và kiểm tra vừa chạy.
- Chưa đủ kết luận về điện thoại thật, toàn bộ tổ hợp lỗi/layout và startup failure có kiểm soát. Headless trước đây có frame time cao hơn mục tiêu.

### 3.5. Lưu tiến trình — Đã có, chỉ local

- Dexie/IndexedDB một slot `local_save_default`; schema dữ liệu game 2. Version bảng Dexie vẫn là 1 vì cấu trúc index chưa đổi.
- Lưu tiền/XP/cấp/uy tín/vị trí/giờ/layout/kho/lô/đơn chờ/khách/thống kê; tự lưu mỗi 30 giây và lúc sang ngày, có lưu tay và reset về ban đầu.
- Ghi tuần tự, kiểm tra revision trong transaction; chỉ tăng revision và thời gian thành công sau persist thành công. Bản lưu cũ bị từ chối nếu revision không nối tiếp.
- Load cũ bổ sung lô, tủ mát và fixture kho; xử lý vị trí bị kẹt; hàng cũ thiếu hạn được cấp hạn mới, không phục hồi được ngày nhận vốn không tồn tại.
- Chưa có export/import file, nhiều slot, backup, đồng bộ nhiều thiết bị hoặc xử lý xung đột nhiều tab thân thiện.
- Chưa có validator runtime đầy đủ cho toàn bộ save. Khi đọc DB lỗi, `loadOrCreateSave` hiện fallback về save mặc định và thử ghi lại; cần bổ sung màn lỗi/khôi phục để phân biệt lỗi đọc với chưa từng có save.

### 3.6. Backend và thuế — Nền ban đầu

**Backend:** `apps/server/src/main.ts` chỉ khai báo `ApiResponse` và class `GameApiController` với `getCatalog`/`validateSave`. Các URL trong comment chưa là route HTTP. Không có bootstrap NestJS, controller decorator, middleware xác thực, MongoDB/Mongoose, Firebase Admin hay lệnh chạy server. Build thành công chỉ xác nhận TypeScript biên dịch.

**Thuế:** có tám tài liệu `docs/tax` và `TaxRuleRegistry` đăng ký snapshot không trùng phiên bản, kiểm tra trường dữ liệu, clone chống chỉnh trực tiếp và resolve theo ngày/chủ thể/hoạt động. Quy tắc `UNVERIFIED` bị loại khỏi resolve. `research.ts` chứa ứng viên nghiên cứu chưa xác minh, không dùng khấu trừ tiền người chơi.

Chưa có hồ sơ chủ thể kinh doanh trong save, `taxRuleVersion`/năm pháp lý, engine VAT/PIT/CIT, sổ kế toán, hóa đơn, kê khai/thanh toán thuế, UI thuế hay backend cố vấn. Tài liệu này chỉ ghi trạng thái triển khai, không xác nhận nội dung pháp luật trong hồ sơ nghiên cứu là đúng hoặc đang có hiệu lực.

## 4. Những chức năng chưa làm và nơi nên bổ sung

| Hạng mục | Phần thiếu cụ thể | Nơi triển khai gợi ý |
| --- | --- | --- |
| Khách và thu ngân | Mảng khách, queue, basket/reservation, checkout bằng thao tác người chơi, feedback | shared `CustomerState`, core module khách/giao dịch, `CashierModal`, renderer |
| Báo cáo cuối ngày | Doanh thu từng ngày, giá vốn đã bán, phí, hàng hỏng, lợi nhuận và lịch sử | shared ledger/lots, core kế toán, save migration, modal báo cáo |
| Nhiệm vụ/cốt truyện | Định nghĩa nhiệm vụ, tiến độ, thưởng, NPC hội thoại | game-data quests, shared quest state, core quest engine, UI |
| Phần thưởng cấp | Thông báo lên cấp, mốc mở đồ đạc/khu vực, cân bằng XP | core progression, catalog/fixtures, HUD/UI |
| Xây dựng và mua đất | Đặt/xoay/cất/mua đồ, vùng hợp lệ, update collision/A* và save | core building, game-data map, renderer preview, UI build |
| Mở rộng kho | Mua/nâng cấp kho và capacity; kho hiện tại là phòng dựng sẵn | shared layout/capacity, core economy, kho UI |
| Nhân viên | Tuyển/lương/ca, AI thu ngân và châm hàng | shared employee state, core employee systems, UI |
| Cloud và đăng nhập | Server HTTP, auth token, quyền save, DB, đồng bộ revision | apps/server, web auth/sync, shared runtime schemas |
| PWA | Manifest/service worker, precache/offline shell, cập nhật phiên bản | apps/web build/public và luồng cập nhật |
| Sự kiện Việt Nam | Lịch sự kiện, hàng/nhiệm vụ/trang trí và cân bằng | game-data events, core calendar, renderer/UI |
| Quầy ăn uống | Công thức/nguyên liệu/chế biến/sản phẩm và bán hàng riêng | shared/data/core/UI |
| Multiplayer | Có proposal/design/3 delta specs/tasks `shared-alley-multiplayer`; chưa có transport, server world hoặc gameplay online | shared schema world/business, core headless/giao dịch, apps/server auth/realtime/persistence, web/renderer adapter |
| Âm thanh | Nhạc/hiệu ứng, mute/volume và lifecycle | Asset audio, module âm thanh web; chưa thấy hệ phát âm thanh |
| Content editor | Công cụ chỉnh catalog/map, validation và export | tools/content-editor; hiện chỉ README |
| Hệ thống thuế | Thẩm định nguồn → hồ sơ chủ thể → engine → ledger/hóa đơn → UI/save | docs/tax, core/tax, shared, web, server |

## 5. Chỗ cần chỉnh sửa hoặc kiểm chứng trước khi mở rộng

Các mục dưới là kết luận từ đọc code hoặc bằng chứng đã lưu; các tình huống chưa chạy lại được ghi rõ. Không tự sửa gameplay trong đợt tạo tài liệu này.

| Ưu tiên | Vấn đề và ảnh hưởng | Hướng sửa và tiêu chí hoàn thành |
| --- | --- | --- |
| P1 | `handleAutoRestock` cộng lượng yêu cầu thay vì lượng thực chuyển. Ví dụ kệ max 24, bánh mì capacity 10, đang có 5 và kho ≥19: core chỉ chuyển 5 nhưng toast cộng 19 | Trong `App.tsx` lấy chênh stock trước/sau hoặc core trả số lượng thực. Test sản phẩm capacity thấp hơn fixture; toast và tồn phải khớp |
| P1 | Bán thủ công không gắn khách; NPC chưa giữ món đã chọn. Người chơi có thể bán món khách đang nhắm trước lúc họ tới quầy | Chốt thiết kế queue/basket/reservation và một giao dịch duy nhất, kiểm thử không bán trùng/không trừ hai lần và save/reload giữa chừng |
| P1 | Save đọc lỗi fallback như game mới; chưa validation đầy đủ. Có nguy cơ vào game mới khi dữ liệu cũ chưa đọc được | Tách “không có save” với “lỗi DB”, giữ dữ liệu hiện có, màn retry/recovery; validate/migrate theo version trước nhập; test DB lỗi và save hỏng |
| P1 | Hiệu năng chưa đạt nghiệm thu theo báo cáo headless; main bundle lớn | Profile CPU/GPU/frame và cấp phát trên máy thật trước tối ưu; chia bundle khi phù hợp; mục tiêu p95 desktop ≤20ms/mobile ≤33ms, ghi cấu hình và tải cảnh |
| P2 | Quầy tăng `totalCustomersServed` cả khi bán thủ công, nên chỉ số chưa là số NPC phục vụ thực | Tách số món/giao dịch/khách và migration; xác minh một khách mua nhiều món không tăng số khách theo từng món |
| P2 | “Vốn tồn kho” tính từ giá catalog hiện tại, chưa có cost basis từng lô; totalRevenue chưa là lợi nhuận | Lưu giá vốn lô, ledger mua/bán/hỏng và chi phí; đối chiếu báo cáo với luồng giao dịch thật |
| P2 | Modal chỉ khóa input, simulation/khách/giờ vẫn chạy; hàng hoặc khách có thể đổi lúc đang đọc modal | Chốt trải nghiệm có pause hay không; nếu pause cần điều phối ticker/clock; test mở modal qua thời điểm hết hạn hoặc khách thanh toán |
| P2 | 2× chỉ tăng đồng hồ; kiên nhẫn/di chuyển khách vẫn theo dt thường | Chốt ý nghĩa nút và nhãn; nếu tua toàn game cần tách simulation time và UI time, cân bằng spawn/patience/delivery |
| P2 | Migration kho thay fixture kho cố định khi hydrate, export layout vẫn ghi 8×8 | Khi có build/mở đất, version hóa layout và tránh ghi đè đồ người chơi; test tọa độ âm, nâng cấp và legacy |
| P2 | `getFixtures` trả reference; một số copy player/fixture khi khởi tạo còn nông | Cân nhắc snapshot chỉ đọc/deep copy ở biên; kiểm thử nhiều simulation hoặc reset không làm nhiễm save mẫu/lô/vị trí |
| P2 | Nghiệm thu startup retry, mọi lỗi lớn và điện thoại thật còn thiếu | Gây lỗi Pixi có kiểm soát, test retry/resize/input/focus; test thiết bị iOS/Android và DPR thực |
| P2 | Không có lint/CI kiểm tra trong danh mục hiện có; browser QA là script rời | Thêm lint phù hợp và CI typecheck/test/build; nối browser smoke vào quy trình riêng, tránh ghi đè tiến trình người dùng |
| P3 | Nhiều component viết dồn dòng; `simulation.ts`/`viewport.ts`/`App.tsx` gom nhiều trách nhiệm | Format và tách module theo nghiệp vụ sau khi có regression test, giữ hành vi/save tương thích |
| P3 | Tài liệu cũ lẫn kiến trúc dự kiến với code thật | Sửa các điểm lệch trong mục 6; liên kết tài liệu này từ docs/README |

P1: nên xử lý trong đợt gần nhất. P2: nên xử lý trước tính năng phụ thuộc hoặc nghiệm thu phát hành. P3: cải thiện khả năng bảo trì.

## 6. Các điểm tài liệu đang lệch hoặc dễ hiểu nhầm

1. `TASKS.md`/`ROADMAP.md` nhắc pnpm và `pnpm-workspace.yaml`, nhưng workspace hiện dùng Yarn và `yarn.lock`.
2. `ARCHITECTURE.md` có `game-ui`, ECS đầy đủ, NestJS/Mongoose/Firebase và nhiều store/DTO dự kiến; thư mục và code thật chưa có đủ các thành phần này.
3. Lên cấp và khóa mặt hàng theo cấp đã có trong core, nên không ghi toàn bộ progression là “chưa làm”. Chỉ nhiệm vụ/phần thưởng/mốc mở rộng còn thiếu.
4. Kho vật lý đã có; việc “mua đất và xây kho” trong roadmap vẫn chưa có. Phòng kho dựng sẵn không chứng minh building mode đã xong.
5. `docs/README.md` liệt kê các thư mục game-design/architecture/api/database/implementation chưa thấy trong danh mục file hiện tại; tài liệu thiết kế chính đang nằm ở root.
6. OpenSpec UI đánh dấu tất cả task `[x]`, kể cả đo hiệu năng, nhưng `docs/ui/VERIFICATION.md` vẫn ghi chưa đạt tiêu chí/thiếu bằng chứng; `[x]` đo xong không đồng nghĩa đạt FPS.
7. Bổ sung kho trong VERIFICATION đã xác minh night/reduced-motion/occlusion cho kho, trong khi bảng lịch sử bên dưới còn ghi thiếu. Cần đọc phần bổ sung mới, không suy ra toàn game đã nghiệm thu.
8. Số bundle ở báo cáo cũ ~629/638 kB; lần build hiện tại là 639,19 kB. Không khẳng định tối ưu thành công chỉ từ thay đổi nhỏ giữa các lần đo khác tải máy.
9. Version save game 2 và version Dexie 1 là hai khái niệm khác nhau, không tự coi là lỗi migration.

Những tài liệu cũ chưa được viết lại trong đợt này; danh sách trên là việc cần đồng bộ, tránh sửa mất lịch sử hoặc đánh dấu hoàn thành quá mức.

## 7. Kết quả kiểm tra và phần chưa được kiểm tra

### Vừa chạy trong lần tổng hợp 30/09/2026

| Kiểm tra | Kết quả | Phạm vi chứng minh |
| --- | --- | --- |
| `yarn typecheck` | PASS | TypeScript ở shared/data/core/renderer/server/web |
| `yarn test` | PASS | 10 nhóm lõi + registry thuế + input + nhà kho |
| `yarn build` | PASS có cảnh báo | Server biên dịch TypeScript, web build production |
| Main JS bundle | 639,19 kB; gzip 203,30 kB | Vượt mức cảnh báo 500 kB, chưa là kết quả FPS |

Test runner có các kiểm tra: catalog/map/collision; bày/cất; clock; export/import; đặt/giao/reload; bán; migration lô/hạn; chỗ lạnh; NPC/A*; registry version/ngày/UNVERIFIED; khóa input; migration/đường đi nhà kho và giao đúng một lần. Đây là runner assert tùy chỉnh, chưa có báo cáo coverage hoặc bộ test React/server đầy đủ.

Các lệnh ban đầu bị sandbox chặn Node đọc đường dẫn người dùng; đã chạy lại ngoài hạn chế đó và nhận kết quả trên. Không coi lỗi môi trường ban đầu là lỗi code.

### Bằng chứng có sẵn, không chạy lại lần này

- `docs/ui/VERIFICATION.md` và `qa/verify-*.cjs` ghi flow đặt → giao → bày → cất → bán → save/reload, revision conflict, focus/input, joystick, camera, nhiều viewport.
- Ảnh gồm 1920×1080, 1366×768, 1024×768, 844×390, 667×375; thêm DPR1/2 và kho night/reduced-motion.
- Báo cáo headless lịch sử có p95 khoảng 83 ms, sau bổ sung kho có mẫu 66,7 ms; đều chưa đạt mục tiêu desktop 20 ms và không so sánh trực tiếp để kết luận cải thiện.

### Còn thiếu

- Điện thoại thật/iOS/Android, FPS/CPU/GPU/memory trên thiết bị, chơi lâu và background/foreground.
- Browser smoke chạy lại tại hiện trạng code, mọi tổ hợp tiền lớn/lỗi/modal ở các viewport, lỗi khởi tạo có kiểm soát.
- Save hỏng/DB lỗi và khôi phục, nhiều tab, queue nhiều khách, cost ledger, regression lên cấp nhiều lần, test cho thông báo châm kệ thực chuyển.
- Lint, CI và backend integration/auth/cloud tests. Chưa có backend chạy để kiểm thử endpoint thật.

## 8. Thứ tự làm tiếp đề xuất

### Kế hoạch chọn lọc từ game tham khảo — 30/09/2026

Đã đọc source/data/tests tại `C:/Users/Admin/Desktop/GAME/tap-hoa-dau-hem` và tạo OpenSpec `adapt-reference-shop-operations` gồm research, snapshot catalog 335 dòng, proposal/design/7 delta specs/tasks. Nguồn dùng Phaser và schema kho/kệ khác; đề xuất chuyển dữ liệu/quy tắc vào shared/game-data/game-core/UI hiện tại, không port nguyên engine. Chưa chạy UI hoặc test game nguồn, chưa triển khai gameplay trong đợt này.

Thứ tự đề xuất cụ thể: A bảo vệ save/châm thực chuyển và giỏ khách/queue → B giữ 36 món hiện có, thêm 20 món đã duyệt, nhiều mối nhập/hàng chờ/sơ đồ kệ → C giá vốn lô/báo cáo ngày/gợi ý nhập → D thu ngân và châm kệ có ca/lương → E tự nhập opt-in và QA tích hợp. Nhân viên MVP dùng mặt bằng hiện tại; mở đất/building là đợt riêng. Phối hợp command/replay với `shared-alley-multiplayer`, world/auth/realtime vẫn theo change đó. Các chức năng trong kế hoạch vẫn Chưa có hoặc Một phần theo mục 3–5; không nâng trạng thái chỉ vì artifacts hoàn tất.

Kiểm tra mới chỉ cho tài liệu: `openspec validate adapt-reference-shop-operations --strict` hợp lệ; `openspec status` báo 4/4 planning artifacts; CSV đọc lại đủ 335 dòng. Không chạy lại typecheck/test/build hay đo FPS; kết quả mục 7 là bằng chứng của đợt tổng hợp trước, không phải kiểm chứng tính năng mới. TASKS/ROADMAP đã ghi kế hoạch và dependency; chi tiết file/module và tiêu chí trong tasks/design.

1. Sửa thông báo châm kệ, bảo vệ lỗi đọc/save hỏng và đồng bộ tài liệu tiến độ. Tiêu chí: số tồn/toast đúng, lỗi DB không tự bị hiểu là game mới.
2. Hoàn thiện Phase 3: nhiều NPC, hàng đợi, basket/giữ hàng, người chơi thu ngân, feedback kiên nhẫn/uy tín. Tiêu chí: không bán trùng, không nhân tiền và save/reload giữa giao dịch đúng.
3. Làm ledger và báo cáo ngày trước thuế: giá vốn theo lô, doanh thu/chi phí/hàng hỏng/lợi nhuận. Tiêu chí: báo cáo đối chiếu được từng giao dịch, không nhầm tiền mặt với lãi.
4. Đo và tối ưu trên thiết bị thật, xử lý bundle và hoàn tất nghiệm thu UI. Tiêu chí: đạt mục tiêu đã ghi hoặc điều chỉnh mục tiêu có căn cứ.
5. Nhiệm vụ và mốc thưởng cấp; tận dụng logic XP/unlock đã có, không làm lại từ đầu.
6. Building/mở rộng kho rồi nhân viên, với migration và pathfinding cho layout thay đổi.
7. Ưu tiên mới ngày 30/09/2026: kế hoạch OpenSpec `shared-alley-multiplayer` đưa schema world/cơ sở và core headless/giao dịch lên trước mở rộng building/nhân viên; sau đó backend/auth/cloud/realtime, client hai người và nghiệm thu chơi lệch giờ/reconnect. Bản đầu một tiệm/quỹ/kho chung; owner offline member vẫn chơi, tất cả offline pause; save local giữ riêng. Hiện chỉ có tài liệu, chưa có code online. TASKS/ROADMAP đã đồng bộ hướng này; các bước 1–6 vẫn là hạng mục còn mở, không phải thứ tự cứng trì hoãn multiplayer tới cuối.
8. Nhiều cơ sở độc lập trong cùng hẻm, ghé thăm/phụ việc và chuyển/gộp tiệm thuộc hướng sau, chưa triển khai trong bản hai người. PWA/sự kiện/quầy ăn uống/công cụ nội dung theo nhu cầu phát hành. Thuế tiếp tục theo chuỗi thẩm định → hồ sơ chủ thể → engine/ledger → UI/persistence; không kích hoạt quy tắc chưa xác minh.

## 9. Quy tắc cập nhật tài liệu này khi code thay đổi

`AGENTS.md` ở root yêu cầu các phiên Codex/agent làm việc trong repository cập nhật file này cùng thay đổi code có ảnh hưởng chức năng, dữ liệu, kiểm thử hoặc kiến trúc. Đây là quy tắc quy trình; file Markdown không tự quan sát và hiểu code khi người dùng hoặc công cụ khác chỉnh sửa ngoài phiên agent. Chưa thiết lập tác vụ chạy nền hay scheduler.

Mỗi lần thay đổi cần:

1. Đọc hiện trạng, xác định chức năng thay đổi và file bằng chứng; sửa ngay hàng/mục liên quan thay vì chỉ nối ghi chú cuối file.
2. Chuyển đúng trạng thái Đã có/Một phần/Chưa có/Cần kiểm chứng; đưa phần mới hoàn thành ra khỏi danh sách thiếu, nhưng không xóa giới hạn còn tồn tại.
3. Ghi ảnh hưởng tới UI/nghiệp vụ/save/schema/migration, ưu tiên và tiêu chí hoàn thành còn lại.
4. Cập nhật ngày và kết quả kiểm tra thật; ghi “chưa chạy” khi chưa chạy. Phân biệt kết quả mới với bằng chứng lịch sử.
5. Đồng bộ `TASKS.md`, `ROADMAP.md` và OpenSpec/tài liệu liên quan khi phạm vi thay đổi ảnh hưởng tiến độ; không tự archive khi nghiệm thu chưa đạt.
6. Thêm một hàng lịch sử ngắn bên dưới. Nếu chỉ thay đổi màu/chữ, chỉ cập nhật mục UI/lịch sử và kiểm tra phù hợp, không bắt buộc chạy toàn bộ test.

### Lịch sử cập nhật

| Ngày | Thay đổi | Xác minh | Việc còn lại |
| --- | --- | --- | --- |
| 30/09/2026 | Khảo sát game tham khảo, tạo plan adapt-reference-shop-operations và đồng bộ TASKS/ROADMAP; không sửa code | OpenSpec strict hợp lệ, 4/4 planning artifacts, snapshot 335 dòng | Duyệt/triển khai các task; chưa chạy UI/test nguồn hoặc nghiệm thu chức năng mới |
| 30/09/2026 | Tạo OpenSpec shared-alley-multiplayer: proposal/design/3 specs/tasks; đồng bộ TASKS/ROADMAP ưu tiên nền co-op hai người trước mở rộng nhiều cơ sở | openspec validate shared-alley-multiplayer --strict: valid; status: 4/4 planning artifacts complete. Đọc source core/shared/renderer/web/db/server; không sửa code, không chạy lại test/build/browser | Toàn bộ tasks triển khai chưa làm; chưa có multiplayer chạy thật, chưa chuyển/gộp tiệm hoặc deploy |
| 30/09/2026 | Tạo tổng hợp code, phân biệt chức năng/nền/tài liệu, liệt kê việc cần sửa và hướng mở rộng; thêm quy tắc duy trì trong AGENTS.md | Typecheck/test/build PASS; main JS 639,19 kB; tham khảo QA lịch sử | Các mục 4–8; chưa chạy browser/thiết bị thật lần này |
| 30/09/2026 | Bổ sung mục 2.1 tổng hợp công nghệ, phiên bản khai báo, mục đích, dependency chưa dùng và công nghệ còn trong kế hoạch | Đối chiếu package.json/config/source; chỉ sửa tài liệu, không chạy lại test/build | Cập nhật bảng khi dependency hoặc kiến trúc thay đổi |

