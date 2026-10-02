# Design

## Context

Xem `proposal.md` cho mục tiêu và `research.md` cho nguồn/bằng chứng. Web dùng React + Zustand phủ lên canvas PixiJS; texture procedural 32px có thể giữ làm nền và fallback. Simulation và save offline đã tồn tại, không phải UI demo mới. Repo có nhiều sửa đổi sẵn. OpenSpec chưa có main spec; ba capability ở đây là hợp đồng UI đầu tiên.

## Goals / Non-Goals

**Goals:** tạo một hệ art áp dụng được từ bản đồ đến modal; giữ landscape, chữ Việt đọc tốt, cùng thao tác dùng được qua chuột/bàn phím/cảm ứng; mỗi chỉ số có nguồn dữ liệu thật; triển khai từng lát cắt và kiểm tra save cũ.

**Non-Goals:** đổi renderer sang Phaser, viết lại mô phỏng, thêm thuế/nhân viên/quests mới, sửa backend/cloud save, hoặc đưa số liệu giả lên HUD. Minh họa thời tiết chỉ được trang trí nếu không ám chỉ buff chưa có.

## Decisions

### 1. Art direction “Nắng Hẻm”

Tiệm nhỏ trong hẻm Việt 1990–2000: tường vàng cũ, mái hiên xanh ngọc sọc kem, bảng hiệu viết tay, nền gạch bông, kệ gỗ, tủ kính, thùng hàng, dây điện, cây trong lon và ghế nhựa. Người chơi/tủ/kệ có silhouette rõ hơn phần trang trí. Ánh sáng đi từ trên trái; dùng 3–5 sắc độ mỗi vật thể, nét biên nâu tối, bóng cứng theo ô pixel. Tránh dither dày trên chữ và đường đi.

| Token | Màu | Dùng cho |
| --- | --- | --- |
| ink | `#33251D` | Chữ/nét biên |
| wood-dark | `#593A2B` | Viền ngoài và bóng nút |
| wood | `#936044` | Khung gỗ |
| wood-light | `#C69464` | Mép sáng |
| paper | `#FFF2D6` | Panel chính |
| paper-shade | `#E7CE9F` | Ô phụ/divider |
| teal | `#357F72` | CTA thường/mái hiên |
| teal-dark | `#24584F` | Bóng CTA |
| brick | `#B64C3D` | Cảnh báo/đóng cửa |
| sun | `#E9B95D` | Đồng tiền/nhấn mạnh |
| muted | `#725A47` | Chữ phụ |

Bảng này là điểm xuất phát; đo contrast khi xây component, body text tối thiểu 4.5:1. Viền bậc thang 2–4px, shadow cứng offset 2–4px; hạn chế shadow blur trong panel. Background overlay được dùng một lớp tối phẳng để tăng khả năng đọc.

Phương án cân nhắc: dùng skin gỗ nâu cho tất cả thành phần rất nhanh nhưng thiếu phân cấp; phối giấy kem và CTA xanh ngọc giúp mắt phân biệt vùng đọc với vùng thao tác. UI bo tròn hiện đại không phù hợp bản sắc đã chọn.

### 2. Pixel pipeline và font

Giữ tile 32×32. Nhân vật target 32×48, footprint collision vẫn theo simulation; đồ nội thất bội số 16/32 và chân sprite là điểm neo để tránh sai che khuất. Product icons 16×16 và 24×24 tùy silhouette, render native grid bằng nearest; UI icons có viewBox nguyên và hình khối nằm trên lưới, không dùng emoji cho icon chủ đạo.

World render theo logical reference 960×540 và điều chỉnh camera theo vùng còn lại. Ưu tiên zoom nguyên 1×/2×/3× bằng thay đổi diện tích nhìn; bổ sung chế độ Fit khi màn hình ngắn cần nhìn bao quát, ghi rõ đây là trade-off độ đều pixel. Kiểm tra DPR 1/2, không giả định CSS `image-rendering` sẽ giải quyết fractional scale. Font body hệ thống hỗ trợ Việt 14–16 CSS px desktop, 14px mobile; tiêu đề pixel chỉ sử dụng font local đã kiểm license và đủ dấu. Fallback body không được làm mất dấu. Căn text theo baseline, số tiền tabular và không dùng text-transform làm hỏng dấu.

Phương án cân nhắc: canvas cho mọi chữ tạo khó khăn focus/đọc và tăng chi phí layout; chọn DOM cho UI, PixiJS cho thế giới. Không dùng ảnh AI như sprite cuối vì khó giữ grid nhất quán; asset giai đoạn đầu vẽ procedural và sửa có kiểm soát.

### 3. Bố cục màn hình

Desktop từ 1024px: HUD cao 72–88px theo nội dung, thanh thao tác dưới 56px; bản đồ ở vùng giữa. Kho rộng 280–320px chỉ chiếm cột layout khi mở, có nút thu gọn; canvas resize theo cột còn lại để người chơi không bị che. Popup vừa tối đa 760px, cao tối đa vùng dùng được, header/footer cố định và nội dung cuộn.

```text
┌──────────────────────────────────────────────────────────┐
│ Ngày · Giờ · Mở cửa     Tiền · Cấp/XP      Kho · Sổ · Lưu │
├───────────────────────────────────────────────┬──────────┤
│                                               │ Kho      │
│        TIỆM + HẺM + NHÂN VẬT PIXEL             │ tồn thật │
│                                               │ Châm kệ  │
│                [E] Xem kệ                     │ Nhập hàng│
├───────────────────────────────────────────────┴──────────┤
│ WASD di chuyển · E tương tác     Túi · Đại lý · +/- zoom  │
└──────────────────────────────────────────────────────────┘
```

Mobile landscape dưới 1024px hoặc chiều cao dưới 500px: HUD gọn một hàng ưu tiên ngày/giờ, tiền và mở cửa; cấp/XP vào sổ. Kho mặc định đóng, mở dạng overlay có nội dung cuộn, không duy trì cột desktop. Joystick trái dưới, tương tác phải dưới; mỗi nút hit area ≥44×44 CSS px, cách nhau ≥8px. Kho/đại lý/túi/lưu vào nhóm quản lý gọn. Padding dùng safe-area. Test điện thoại ngang 844×390 và 667×375, desktop 1366×768 và 1920×1080, tablet 1024×768. Portrait tiếp tục có hướng dẫn xoay theo định hướng đã thống nhất; không tạo UI portrait mới.

Phương án cân nhắc: thu nhỏ nguyên desktop làm chữ/nút quá nhỏ; bố cục riêng mobile giữ các thao tác cần thiết. Các độ cao do CSS layout xác định; không đặt kho `top-14` dựa trên giả định HUD một hàng.

### 4. Component chung và modal coordinator

Tạo `apps/web/src/components/pixel/` cho PixelPanel, PixelButton, PixelIcon, PixelStat, PixelProgress, ProductSlot và QuantityStepper; token dùng CSS variables trong stylesheet. Props typed; button là HTML button thật, aria-label tiếng Việt, disabled có lý do nhìn thấy được.

Modal coordinator quản lý duy nhất một panel tương tác: mở đại lý sẽ đóng kệ/túi/thu ngân, tránh supplier state riêng chồng Zustand. Khi modal mở, chặn input movement và tương tác thế giới, đặt joystick vector về 0, đặt focus trong dialog; Escape đóng và trả focus về nút gọi. Đồng hồ tiếp tục theo cơ chế hiện tại; không thêm pause ngầm. Focus không thoát dialog, danh sách có thể cuộn bằng touch/wheel/keyboard. Nút reset save cần bước xác nhận riêng, đóng modal không reset game.

### 5. Dữ liệu thật và thiết kế từng panel

HUD đọc player/worldTime/statistics từ simulation/store. XP dùng định nghĩa level thực tế sau khi đối chiếu mô phỏng; không `% 100` mặc định. Khách hiển thị số đang có, không `/11` nếu chưa có capacity. Xóa chip buff giả; thay bằng tình trạng actionable tính từ stock như “2 kệ hết hàng”, nếu có dữ liệu đủ.

| Màn | Bố cục | Trạng thái bắt buộc |
| --- | --- | --- |
| Kho | Danh sách icon/tên/tồn/hạn, CTA châm kệ và đại lý | Trống, không có hàng phù hợp, đầy kho |
| Đại lý | Tabs danh mục có dữ liệu, danh sách giá/level, stepper, tổng tiền và ngày giao | Chưa mở khóa, thiếu tiền, kho lạnh thiếu chỗ, đặt thành công |
| Kệ | Preview loại kệ, sản phẩm, stock/capacity, số lấy từ túi, bày/cất | Kệ trống, túi hết hàng, đầy kệ, điều kiện cất bị chặn |
| Thu ngân | Hàng bán thực tế, mở/đóng cửa, thống kê hiện có, sang ngày | Tiệm đóng, kệ hết, bán thành công |
| Túi | Grid sản phẩm + số lượng, chi tiết khi chọn | Trống, hạn sử dụng |
| Lưu | Thời gian lưu/revision, lưu thủ công, xác nhận reset | Đang lưu, thành công, lỗi, xác nhận hủy được |
| Khởi động | Biển hiệu tiệm, trạng thái tải và nút thử lại khi lỗi | Đang khởi tạo, lỗi rõ; không fake phần trăm |

Giữ callback mua/bày/cất/bán/lưu hiện có; UX chỉ báo thành công sau kết quả simulation/persist. Icon dùng chung giữa product slot và shelf sprite theo bảng mapping productId, có fallback được vẽ cùng palette.

### 6. Chuyển động và môi trường

Lát cắt đầu: đồng bộ panel/icon và làm hoàn chỉnh một vòng đặt hàng → nhận hàng ngày sau → bày → bán → lưu. Sau đó bổ sung player walk 4 hướng ×4 frames, idle 2 frames, khách 3 silhouette nguyên bản; chỉ thay art, không thêm số khách ngoài simulation. Quạt/mái hiên 2–4 frames, cây 2 frames, ánh sáng chiều đêm theo worldTime. Stock trên kệ phản ánh quantity thật; chỉ dùng 3 mức empty/low/full để giảm redraw.

Toast xếp tối đa ba dòng thông báo nhìn thấy, lịch sử phụ nếu cần; tiền nổi 0.6–0.9s sau bán thật, pressed state dịch 2px. Tôn trọng `prefers-reduced-motion`: tắt bounce, rung và đồ trang trí lặp, vẫn báo trạng thái bằng chữ. Texture cache và atlas có fallback; không generate lại toàn bộ texture mỗi frame.

## Risks / Trade-offs

### Bổ sung phạm vi: nhà kho vật lý của cửa hàng

Nhà kho liền phía trên gian bán hàng, cùng mép trái/phải x6..13 và chung tường sau y3. Map 26×22 có originTileY=-6, giữ nguyên tọa độ kệ/quầy/spawn cũ. Lòng kho 6×5 tại x7..12/y−2..2, tường y−3..3; cửa hậu giữa x9..10/y3 rộng 2 tile. Geometry, cửa, nội thất và camera kho suy ra từ STORE_BOUNDS để bố trí không vướng hướng mở rộng ngang sau này. Cơ chế mua/nâng cấp diện tích là feature phase sau, chưa thêm trong change này. NPC chỉ mua ở gian bán; chi tiết migration từ kho bên phải và sơ đồ mới ở docs/ui/WAREHOUSE.md.

```text
┌──────────── NHÀ KHO SAU TIỆM ────────────┐
│ Giá hàng khô       │ Góc bảo quản lạnh  │
│ mì · gia vị · bánh │ tủ mát / hàng lạnh │
│                                        │
│ Khu nhận hàng     LỐI ĐI     Bàn kiểm kê │
├────────────── CỬA KHO ──────────────────┤
│            GIAN BÁN HÀNG                │
│       Kệ hàng             Thu ngân      │
└────────────────────────────────────────┘
```

Art giữ palette Nắng Hẻm: tường vôi cũ, nền xi măng ít chi tiết hơn gạch bông gian bán, giá gỗ/kim loại, thùng carton có nhãn pixel, đèn trần và biển “NHÀ KHO”. Hàng khô, lạnh và khu nhận phân biệt bằng silhouette, nhãn và icon; đồ trang trí không che hàng hoặc cửa. Thùng/giá biểu diễn empty/low/full từ stock thật; không tạo hàng trang trí khiến kho trống trông như vẫn có hàng.

`inventory` hiện tại là nguồn duy nhất của hàng dự trữ trong nhà kho. WarehouseDock và màn Túi hiện tại đọc cùng dữ liệu này; không tạo bản sao inventory cho phòng kho hoặc trừ hàng khi chỉ mở xem. Màn Túi giữ tương thích trong đợt này, giải thích đây là hàng dự trữ; túi mang theo có sức chứa riêng chỉ thuộc một change gameplay sau. Góc lạnh dùng sức chứa 40 hiện có, bao gồm đơn chờ giữ chỗ; tủ mát bán hàng vẫn 12. Nhà kho không thêm sức chứa hàng khô giả, phí xây kho hoặc nâng cấp chưa có luật.

Đơn đại lý đến hạn được chuyển vào inventory theo cơ chế ngày mới hiện tại; khu nhận hàng hiển thị đơn chờ/ngày giao và thông báo hàng đã nhập kho. Không cần bấm nhận lần hai. Đi tới bàn kiểm kê/giá hàng và E hoặc nút tương tác mở một WarehouseModal: nhóm hàng khô/lạnh, tồn, hạn gần nhất, chỗ lạnh đã dùng/giữ chỗ; có xem chi tiết, châm các kệ hợp lệ và ghé đại lý. Kệ trong gian bán tiếp tục bày/cất qua callback hiện có, cùng nguyên tắc bảo toàn tổng hàng. HUD Kho mở bảng xem nhanh; bảng có hành động “Xem nhà kho” đưa camera nhìn cửa kho và đánh dấu đường tới, không teleport nhân vật.

Các điểm kho có id ổn định (`warehouse_dry_rack`, `warehouse_cold_storage`, `warehouse_receiving_desk`) và loại tương tác riêng, không lọt vào danh sách kệ bán hoặc target NPC. Fixture kho không tự chứa stock thứ hai. Camera theo người chơi qua cửa không reset game, giữ zoom nguyên và vị trí; pan không ảnh hưởng collision. Kho vẫn vào được khi tiệm đóng. World input khóa trong WarehouseModal như các modal khác, một dialog, Escape/focus restore, cảm ứng ≥44px và body ≥14px.

Migration: bổ sung map và fixture kho idempotent khi load save cũ, giữ fixture bán hàng, money/XP/inventory/lots/pending orders. Giữ vị trí cũ nếu hợp lệ; nếu vị trí nằm trong collision do map thay đổi, đưa tới điểm đứng an toàn cạnh cửa kho với giải thích, không xóa save. Không đổi schema chỉ để lưu layout/art; nếu cần dữ liệu gameplay mới, phải bổ sung migration có test trước khi sửa schema.

Nghiệm thu nhà kho gồm đi vào/ra bốn hướng trên PC/mobile; collision cửa/giá; camera và occlusion; stock trống/đầy/lạnh giữ chỗ/hết hạn; đặt → giao vào kho → châm kệ → cất về kho → bán → save/reload; save cũ không mất hàng; NPC không đi vào kho hoặc mắc cửa. Đo lại hiệu năng với phòng kho hiện diện.

## Risks / Trade-offs bổ sung nhà kho

- [Thêm phòng làm map/save position/pathfinding sai] → audit tọa độ, điểm spawn và A*, migration idempotent, test đường khách và vị trí người chơi cũ.
- [Inventory bị nhân đôi giữa túi và kho] → một nguồn inventory, chuyển số lượng chỉ qua simulation; kho chỉ là vùng vật lý và các view của nguồn này.
- [Mở rộng world khó nhìn trên mobile] → camera theo người chơi, cửa có biển/lối rõ, panel cuộn; không thu nhỏ cả thế giới để vừa màn hình.

- [Chữ pixel thiếu dấu Việt] → fixture chữ “Đầu Hẻm, Cô Năm, sữa, hạn sử dụng, 150.000 ₫”; dùng font body nếu pixel font không đạt.
- [Camera mất độ rõ khi Fit/fractional DPR] → zoom nguyên mặc định, test grid và camera di chuyển ở DPR 1/2; giới hạn Fit và không hứa mọi tỷ lệ đều pixel-perfect.
- [Đổi layout làm viewport resize/lifecycle lỗi] → giữ cleanup/serialization Pixi trong App, test mở/đóng kho và resize lặp.
- [Modal vẫn điều khiển nhân vật] → khóa world input theo coordinator và reset held keys/vector khi đổi context.
- [Art che hàng/lối đi] → layer/anchor theo chân, giữ footprint và đặt đồ trang trí ngoài vùng collision cũ.
- [Tăng tải GPU/mobile] → giới hạn DPR tối đa 2 nếu profiling cho thấy cần, atlas/cache, effects có thể tắt; so với baseline cùng máy.
- [Thay đổi đang dở của người dùng] → rà diff từng file và không reset checkout hay ghi đè module không liên quan.

## Migration Plan

1. Chụp baseline bản hiện tại, ghi typecheck/build/test và flow save/load; dùng profile thử riêng cho các phép reset.
2. Thêm token/component rồi áp dụng HUD + kho + modal đại lý thành lát cắt đầu. Cho fallback texture hiện có tiếp tục hoạt động.
3. Chuyển các modal còn lại sang cùng hệ; kiểm tra logic và keyboard/mobile trước khi làm world art.
4. Thay sprite/tiles và animation từng nhóm, giữ productId/fixtureId/collision/save schema.
5. Verify ba specs, build và smoke flow trên các kích thước đã nêu; cập nhật TASKS/ROADMAP đúng phần làm xong.
6. Nếu regression, hoàn tác từng thay đổi UI/renderer của change này bằng patch đối ứng, không rollback save và không đụng sửa đổi có trước. Chỉ archive OpenSpec khi tasks triển khai hoàn tất.

## Acceptance and visual QA

- Screenshot cùng trạng thái: tiệm có stock, kho mở/đóng, đại lý thiếu tiền, modal dài, loading/error và ánh sáng tối; review ở desktop/mobile.
- Không overlap HUD/kho/action, không chữ cắt dấu hay số tiền tràn, tất cả close/CTA chạm được, vùng bản đồ idle còn ≥60% chiều cao trên mobile target.
- Render pan/zoom không làm nhân vật rung tại zoom nguyên; icon không lẫn emoji; mọi sản phẩm có fallback.
- Smoke test đặt/nhận/bày/bán/tiền/XP/lưu/reload; inventory trên kệ và túi giữ đúng quantity, không nhân đôi giao dịch.
- Chạy scripts hiện có `yarn typecheck`, `yarn test`, `yarn build`; không thêm lệnh lint nếu repo chưa cấu hình. Ghi lỗi baseline riêng nếu có.
- Mục tiêu hiệu năng desktop p95 frame time ≤20ms và mobile ≤33ms trên thiết bị thử được ghi tên, sau warm-up 30s; nếu chưa có máy thật, ghi rõ chỉ kiểm viewport giả lập, không công bố mobile FPS đã đạt.
