# PROGRESS — Tạp Hóa Đầu Ngõ (tap-hoa-3d)

> Đọc file này TRƯỚC TIÊN khi bắt đầu phiên mới. File được giữ GỌN: chỉ tầm nhìn, trạng thái, quy ước, quyết định, backlog và mục lục giai đoạn.
> Chi tiết đầy đủ các giai đoạn (nguồn quyết định, công thức, QA, số liệu) nằm ở `docs/progress-archive/`: PROGRESS-GD1-153.md, PROGRESS-GD154-158.md, PROGRESS-GD154-180.md — tra bằng `grep -n "GĐ1xx" docs/progress-archive/*.md`.
> Quy ước: mỗi giai đoạn một commit; test phải xanh (`npm run test`) + build sạch (`npm run build`) trước khi duyệt. Ghi GĐ mới vào mục "Giai đoạn gần đây" (≤ ~15 dòng/GĐ); khi mục đó quá ~10 GĐ, dồn bản cũ sang archive (dồn xong chạy `node dev/archiveCheck.cjs` — GĐ1157 — đối chiếu 2 chiều: 0 tham chiếu ma, 0 archive thiếu mục lục) và chỉ để lại 1 dòng ở Mục lục.

## Tầm nhìn game (mọi quyết định phải đối chiếu với phần này — KHÔNG tự ý thay đổi)

**Game là gì?** Mô phỏng quản lý **tiệm tạp hóa Việt Nam trong một con hẻm** (3D, góc nhìn thứ nhất): người chơi vừa là chủ tiệm vừa đứng quầy — nhập hàng, bày kệ, định giá, tuyển người, mở rộng sang trại/bếp/chi nhánh/quán nước/bán online, sống cùng con hẻm với khách quen, đối thủ và lễ hội.

**Cảm giác cốt lõi:** niềm tự hào của người chủ nhỏ dần thành cơ ngơi — "tiệm nhỏ đầu ngõ, mình chăm chút từng ngày, khách quen gọi đúng tên mình". Ấm áp, đời thường, đậm chất hẻm Việt Nam.

**Vòng lặp chơi chính (nesting):**
1. **Nhịp ngày (lõi):** sáng — Sổ đầu ngày (việc hôm nay + nhu cầu quầy + nhập/nấu/bày) → giữa ngày — đứng quầy, chốt deal, khách quen, đơn online → tối — chốt ngày, thu quà/nhịp.
2. **Nhịp dài:** tuần (thử thách) → tháng (mục tiêu) → mùa (sự kiện + Sổ Mùa) → năm (tổng kết) → NG+ Tái sinh.
3. **Trục tiến trình:** cấp mở khóa 10 hệ lớn × chiều sâu từng hệ (kệ, giá, nhân sự, trại→kho→bếp→quầy, chi nhánh 24/7, online) × quan hệ (khách quen, đối thủ, danh tiếng).

**Nguyên tắc thiết kế:** (a) mọi quyết định hằng ngày phải có dữ liệu phản hồi (không hộp đen); (b) phần thưởng phụ có cổng (không farming được); (c) không đổi công thức kinh tế khi thêm meta — meta chỉ soi sáng/ghi nhận; (d) UI ấm áp, gọn, rõ — dùng được khi chưa đọc hướng dẫn.

**Phong cách hình ảnh (UI 2D phủ trên thế giới 3D):** thế giới low-poly 3D màu ấm; UI (HUD, panel React, icon pixel 16×16) nền tím-than (#3a3a4d) accent vàng (#f1c40f); chữ/biển/bong bóng vẽ canvas 2D rồi dán lên vật thể 3D; icon emoji nhất quán, tiếng Việt đời thường. Tài sản 3D thủ công bằng Blender (low-poly stylized cùng bảng màu, theo mục "Tài sản 3D với Blender" trong promt_game.md). Bảng màu/biểu mẫu tập trung ở `src/ui/controls.css` + `src/ui/panels/shared.tsx`.

## Trạng thái hiện tại (04/11/2026)
- **GĐ1166 (độ phủ định kỳ lần 4 khuôn GĐ1149)**: `npm run test:coverage` = **statements/lines 63,08%** (23.630/37.457 — giữ nguyên tuyệt đối so lần đo GĐ1149: không có mã production mới nào trong kỳ, chỉ test/tài liệu/tool), branches 89,85%, functions 84,18%; 442 file/3445 test (bỏ 3 file heavy theo cấu hình); tsc 0, build ok. Vùng uncovered ổn định (audio/firebase/coop runtime gắn browser). Không sửa mã.
- **GĐ1165 (bảo trì: archiveCheck có exit code)**: `dev/archiveCheck.cjs` nay exit 1 khi có tham chiếu ma/archive thiếu mục lục (trước đây report-only exit 0) — nhịp bảo trì/automation gate được trực tiếp; sạch thì exit 0. Xác nhận: chạy sạch → exit 0 (81 file archive, 0 ma / 0 thiếu). Không đổi mã game — full 445 file/3468 test xanh, tsc 0, build ok, simGolden y nguyên 26.304.891.
- **GĐ1164 (bảo trì: dồn GĐ1163 — atomic một khối script)**: PROGRESS.md 30,8 → ~30 KB; GĐ1163 gộp vào archive đổi tên `PROGRESS-GD1161-1163.md` (áp dụng bài học atomic — mọi cập nhật trước khi write, không còn file rác); `archiveCheck.cjs` xác nhận 0 ma / 0 thiếu. Không đổi mã/test — full suite & build bất đổi (445 file/3468 test xanh).
- **GĐ1161 (bảo trì: dồn GĐ1159–1160 sang archive)**: PROGRESS.md 30,8 → 30,2 KB; tạo `docs/progress-archive/PROGRESS-GD1159-1160.md` (2 GĐ: bảo trì, audit 10-GĐ lần 5); bổ sung dòng mục lục GĐ1159 (tool archiveCheck có giới hạn: khoảng GĐ xuất hiện trong text entry khác cũng tính "có" — kiểm bằng grep thủ công cho chắc); dòng trỏ cập nhật "GĐ1074–1159". Verify: GĐ1159 đủ trong archive, 0 tham chiếu ma (archiveCheck). Không đổi mã/test — full suite & build bất đổi (445 file/3468 test xanh).
- (Đã chuyển GĐ1074–1163 sang archive: GĐ1074 + GĐ1077–1081 vào `PROGRESS-GD1056-1081.md`; GĐ1082–1090 vào `PROGRESS-GD1082-1090.md`; GĐ1091–1097 vào `PROGRESS-GD1091-1097.md`; GĐ1098–1103 vào `PROGRESS-GD1098-1103.md`; GĐ1104–1108 vào `PROGRESS-GD1104-1108.md`; GĐ1109–1113 vào `PROGRESS-GD1109-1113.md`; GĐ1114–1118 vào `PROGRESS-GD1114-1118.md`; GĐ1119–1123 vào `PROGRESS-GD1119-1123.md`; GĐ1124–1128 vào `PROGRESS-GD1124-1128.md`; GĐ1129–1133 vào `PROGRESS-GD1129-1133.md`; GĐ1134–1137 vào `PROGRESS-GD1134-1137.md`; GĐ1138–1142 vào `PROGRESS-GD1138-1142.md`; GĐ1143–1146 vào `PROGRESS-GD1143-1146.md`; GĐ1147–1149 vào `PROGRESS-GD1147-1149.md`; GĐ1150–1151 vào `PROGRESS-GD1150-1151.md`; GĐ1152–1157 vào `PROGRESS-GD1152-1157.md`; GĐ1159–1160 vào `PROGRESS-GD1159-1160.md`; GĐ1161–1163 vào `PROGRESS-GD1161-1163.md`.)
- (Đã chuyển GĐ1056–1071 sang `docs/progress-archive/PROGRESS-GD1056-1081.md`; các mốc cũ khác: GĐ1042–1054 `PROGRESS-GD1042-1054.md` · GĐ790–929 `PROGRESS-GD790-929.md` · GĐ980–1005 `PROGRESS-GD960-1005.md`)
- GĐ960–1005 (tách file thuần + QA trình duyệt, chi tiết): `docs/progress-archive/PROGRESS-GD960-1005.md`
- Các mục GĐ930–949 / GĐ950–959 (tách panel/Hud): `docs/progress-archive/PROGRESS-GD930-949.md` · `docs/progress-archive/PROGRESS-GD950-959.md`
## Quy ước kỹ thuật cần nhớ

- **Khung modal cố định (GĐ662):** mọi panel dùng chung khung `styles.panel` cứng (desktop 760×min(688,100dvh−108), mobile 100vw−24 × 100dvh−96); KHÔNG đặt kích thước riêng cho panel nào, nội dung dài cuộn bên trong. Chuyển tab trong hub không được làm khung co giãn — test khoá `panelFrame.test.ts`.

- Thay đổi "soi sáng" (helper thuần đọc + thẻ UI gọn) là mẫu mặc định — **không đổi SAVE_VERSION/kinh tế/persist** trừ khi bắt buộc.
- **Bảng màu ngữ cảnh UI (GĐ166 — KHÔNG tự chế màu mới):** accent vàng `#f1c40f` · lời `#2ecc71` · lỗ/mất-thật `#e74c3c` · cảnh báo `#e67e22` · info `#3498db` · sự kiện `#9b59b6`; chip = nền rgba cùng màu chữ. Bậc cảnh báo: đỏ = mất tiền thật, cam = cảnh báo nên xử lý, vàng = theo dõi/đang tốt. (GĐ167: grep 6 màu lệch = 0; GĐ178: họ banner guide xanh dương đã gộp về info `#3498db` — toàn bộ src/ui chỉ còn các màu ngữ cảnh + họ buy-tone được duyệt.) **GĐ258 quét lại toàn bộ src/ui: chuẩn hoá 6 màu cũ còn sót trước GĐ166 về bảng duyệt** — `#e17055`→`#e67e22`, `#fdcb6e`→`#f1c40f`, `#00b894`→`#2ecc71`, `#d63031`→`#e74c3c`, `#ff8a7a`/`#ff8f7a`→`#ff7675` (buy-tone), `#c0392b` StaffPanel→`#e74c3c`; grep còn 0 (trừ màu NHẬN DIỆN được giữ: ArrangePanel màu loại đồ, GardenPanel họ riêng GĐ178, art SVG login/BuildPanel).
- **Thẻ nhấn mạnh dùng `Callout` (shared.tsx, GĐ166):** borderLeft 3px màu ngữ cảnh, tiêu đề 13px màu tone (`styles.cardTitle`), thân 12px; `strong` + danger → nền đỏ nhạt. Thẻ mới KHÔNG tự vẽ viền/tint riêng. HUD chip/alert dùng class CSS riêng (mẫu GĐ162).
- **Pipeline Blender (GĐ172–176):** script nguồn trong `scripts/` + G LB trong `public/models/kit/` được commit để dựng lại; chạy headless `blender -b -P scripts/blender_kit_atlas.py`; xuất Draco; lazy-load trong code (`kitProps.ts`), fallback warn khi load lỗi; prop chỉ hình ảnh KHÔNG chặn lưới điều hướng. Dung lượng: kit 7 prop (baked: `chau_cay`/`thung_go`/`khom_tre`/`bon_nuoc`/`cho_nhua`/`xe_day`/`rao_chan`) ~76KB baked tổng. Ngân sách: cap tris trong `build-kit-assets.ts`. KHÔNG commit file .blend nặng. 3D Artist giữ thư mục script/tài sản; Developer chỉ tích hợp.
- Test sim dùng **seed cố định** (`setSimSeed`/`simRng()` — GĐ27/28), không mock `Math.random`.
- **Hạ tầng test:** sim seed TẤT ĐỊNH — logic qua `simRng()`, không Math.random/Date.now (chỉ hình ảnh 3D còn). `simGolden.test.ts` bắt tất định vỡ + lệch ±5% — đổi kinh tế CÓ CHỦ Ý thì chép số vào `GOLDEN` + ghi lý do. `test:coverage` mỗi ~10 GĐ (ưu tiên core/data/agents/save). `saveStore`/`staffAgent` đã mutation-check.
- **Co-op = chơi đơn (30/10):** máy khách nhận `true` tạm cho mọi thao tác → lời báo kết quả nằm TRONG thao tác (`notify`), cần kết quả thật thì `lastActionResult()`, cần dữ liệu thì ghi state chung (vd. `wheelLastPrize`). Không `useGame.setState` cả object lớn từ UI (thành PATCH đè máy chạy) → làm thao tác (vd. `dismissUnlockAct`); trường máy chạy tự tính mỗi khung → `NO_PATCH` (`atBranch`). Câu hỏi quầy gửi kèm gói state (`sharedAsk`/`applyRemoteAsk`), ai trong hẻm đứng quầy cũng được hỏi, ai bấm trước thì chốt. `coopClient.test.ts` (26 test, mutation 16/16). Checklist 5 câu ở promt_game.md mục Tester.
- QA live trên `localhost:5173`; kiểm 0 tràn ngang @320/390 (`scrollWidth == clientWidth`), 0 lỗi console. **GĐ297:** phép so `scrollWidth == clientWidth` KHÔNG đủ — `html/body` là `overflow: hidden` nên nút lòi ra bị cắt mà vẫn báo 0 tràn. Từ nay chạy thêm `game.layoutAudit()` (dev tool `src/dev/layoutAudit.ts`) ở mỗi cỡ màn: `clipped: []` mới là đạt; `overBy` dương là số px bị cắt.
- **GĐ719 — mẹo QA thời gian trong IAB:** tab nền bị đóng băng rAF → đồng hồ game đứng (GĐ665). Chạy `window.game.useGame.getState().tick(1)` thủ công trong evaluate để đẩy thời gian từng nhịp (MPS ≈ 2 phút game/tick ở 1×; dùng speed cao sẽ nhảy cả ngày). updateOnline chạy trong tick — đơn mới xuất hiện giữa các tick và hết hạn sau 20′, phải đọc state SAU MỖI tick, không đọc cuối vòng. Thao tác bấm nút trong panel có thể mất vì React vẽ lại liên tục khi đồng hồ chạy — gọi thẳng action store (`acceptOnline(...)`) khi cần chắc chắn.
- Nhiều phiên song song trên cùng worktree → commit theo đường dẫn.

## Quyết định lớn đã chốt

- Tiệm xôi (người dùng chọn b, 2026-10-31): giữ Quây xôi cấp 36 trong tạp hóa (tạp hóa lớn thành siêu thị); Tiệm xôi là cơ sở riêng cấp 40, nấu xôi số lượng lớn rẻ 40% bù kho chung mỗi đêm. Còn lại: lô 3D đầu hẻm, Sổ đầu ngày, xu hướng cơ sở.
- Thứ tự ưu tiên giữ chân: vòng ngày → dẫn đường người mới → nhịp tuần → endgame/rival → hạ tầng server.
- NG+ (GĐ14) chỉ làm sau khi có quán thứ hai; giữ bộ sưu tập, chỉ bonus doanh thu (tối đa +48%), chặn khi hẻm online.
- Vé tha thứ streak: tối đa 1 lần/7 ngày, cần chuỗi ≥3. Thử thách tuần tích vào sổ tuần.
- Sau GĐ83: ưu tiên chiều sâu UI/UX trước mở rộng hệ mới. Định hướng hiện tại: **chiều sâu-trước**.
- Kèo hôm nay bám bộ "việc chính" (GĐ107); thưởng nhiệm vụ có trần theo lãi bình quân (GĐ106); người mới không bị trần (GĐ114).
- Khách treo câu hỏi quầy tự chốt theo giây thực (30s → 😕, 45s tự chốt — GĐ122); sim có seed đếm theo tick.
- Lương trong số dư chi nhánh KHÔNG áp good_boss −10% (bảo thủ, trung thực).
- Ngoại lệ "đủ 2 chế độ" (30/10): ở hẻm online đi lại tiệm/trại tốn 0 phút (chơi đơn 10–15 phút) — đồng hồ dùng chung, một người đi không được tua giờ cả hẻm.
- 3D: Tài sản 3D mới đều qua pipeline Blender (không dựng tạm khối nguyên thủy khi Blender làm đẹp hơn), làm chậm/lười để không chặn lần tải đầu.
- Họ màu hướng dẫn/chuỗi/biểu đồ: gộp về một sắc info `#3498db` (GĐ178); ngoại lệ duy nhất: buy-tone `#55efc4`/`#ff7675`; GardenPanel giữ họ riêng. GĐ258 quét nốt 6 màu cũ — src/ui chỉ còn bảng duyệt + màu nhận diện.

## Cần theo dõi / nợ mở
- 🔐 GĐ1073 (làm mới GĐ1142): `npm audit --omit=dev` = 10 cảnh báo (4 cao/6 vừa) đều qua `firebase-admin`@14.5.0 → `google-gax` → `@grpc/grpc-js`/`glob`, phía máy chủ, KHÔNG nằm trong bundle trình duyệt; `@grpc/grpc-js` cài 1.14.6 (advisory nhắm ≤1.13.5 — bản cài đã vá). Không chạy `audit fix --force` (đổi phiên bản lớn). Xem lại khi nâng firebase-admin.
- ⏱️ GĐ675: render CPU đo ở cấp 10/18/24/34/41 đều đạt biên 4× throttle (cấp 41: 5,1 ms trung vị ⇒ ~20–31 ms < 33 ms). Còn thiếu FPS thật máy yếu. Chi tiết: archive `PROGRESS-GD715-788-summaries.md`.
- 🕳️ GĐ665/668: QA co-op vòng ngày (ngủ cả hẻm → tổng kết 2 tab) cần tab trình duyệt THẬT — tab IAB về nền bị đóng băng timer → server ngắt WS → game tự reload (`coop.ts:339`, thiết kế). Cơ chế đã chốt GĐ668; checkpoint round-trip đã khoá bằng test. Làm trong đợt QA toàn diện GĐ670; trước đó ghi "chưa chạy được vì môi trường", không tính là lỗi game.
- 📦 GĐ515 (làm mới GĐ1153): tải ban đầu 538/597 KB gzip, dư địa ~59 KB; chunk lớn nhất 253/255 (vendor-three) — code mới vào chunk lazy nên tải đầu gần như bất biến qua 40+ GĐ; khi gần chạm trần lại thì tìm chỗ tách chunk lười trước.
- GĐ330: QA lưu máy khách (127.0.0.1:5173) — tải lại trang vẫn hiện "Chơi tiếp trong máy (ngày 1)" và vào lại đúng ván; lần "mất ván" trước là bấm nhầm nút ván mới, KHÔNG phải lỗi lưu.

- ⏱️ (GĐ296–298) npm run test nhạy tải máy: 1 test đỏ lẻ không liên quan thay đổi vừa làm → chạy lại đúng file trước khi kết luận; máy rảnh mà vẫn >10 phút thì đo file chậm nhất rồi tối ưu.


## Backlog tiếp theo
- ✅ **Trục "vòng đời nông sản nhà" ĐÃ KHÉP (GĐ1088–1141, audit 10-GĐ ×4 + độ phủ ×3 + QA render sống ×8):** mọi nông sản trồng/nuôi đều có lối ra (bếp/pha/tiệm xôi — test chặn tái phạm trên dữ liệu); gợi ý theo nông sản: "Hôm nay đáng" biết giá trị pha (1104/1105), "trồng/nuôi để pha" khi thiếu (1101/1110), "nhập ngay" nguyên liệu mua ngoài (1114), nút thắt món pha (1112), báo món bị chặn sáng (1102); dòng tư vấn Vườn gộp 4 tín hiệu (pha/nấu + đơn quán xóm + hết hạn + xếp theo tác động — 1109/1111/1117). QA render sống ×3 (1099/1106/1115/1120). Việc còn mở trong trục: KHÔNG — đừng tái khám phá; hướng mới cần Leader duyệt.
- ✅ **Người dùng ĐÃ TRẢ LỜI (GĐ1076): CHƯA mở Ngõ 3 — chiều sâu chưa khai thác hết.** Hướng chiều sâu do người dùng chỉ định, làm TRƯỚC mở rộng: (1) thêm sản phẩm/công thức mới ở tạp hóa, nông trại, quán nước, tiệm xôi; (2) cơ chế nhập hàng NGOÀI tạp hóa để đa dạng hàng bán; (3) liên kết thị trường/quan hệ hàng xóm: nhiều nguồn cung nguyên liệu tự làm tại gia của hàng xóm. Chiều rộng để SAU (người dùng liệt kê làm hướng tương lai): cùng đầu tư, chuỗi sản xuất chế biến từ sản phẩm nhà/hàng xóm, chi nhánh đi lại giữa các khu. Ngõ 3 chỉ làm khi người dùng chốt lại.
- ✅ **Chiều sâu bán online (GĐ715–719) ĐÃ XONG + QA đạt; audit GĐ720 đã chạy** (chi tiết trong archive).
- ✅ **Đường đời nhân viên (GĐ727–731) ĐÃ XONG** — gồm nhân viên chi nhánh xin nghỉ mai (băm riêng, không migration, coopGuard GUARDED); chi tiết trong archive.
- ✅ **Trục tín dụng/nợ — lát cắt trả góp ĐÃ XONG (GĐ734) + QA (735).** Đánh giá bằng số (audit GĐ740): mọi trục lớn ĐỦ SÂU theo coverage 58,22/90,09 và autoplay/simGolden xanh — chuỗi GĐ741+ ưu tiên: rà backlog nợ mở (GĐ675 CPU render cuối-game, refactor UI khi đụng panel) và QA tự nhiên các trục mới trước khi tính mở rộng.
- 🧭 **Đánh giá xong (GĐ738, Leader + Designer): KHÔNG làm "nhịp tuần chủ đề"** — ý tưởng treo từ rà GĐ720 ("tuần chỉ là số"): vai trò đa dạng hoá nội dung tuần ĐÃ có sẵn bằng sự kiện thị trường 3 ngày (hàng hút + traffic) + lễ hội lịch + chợ phiên — thêm theme tuần là trùng vai trò, risk phình (Luật 9). Trục nhân sự (727–731) và tín dụng (734) đã lấp các chỗ MỎNG; landmark có dự án 2 (732). Các trục lớn hiện ĐỦ SÂU theo đánh giá GĐ720 + GĐ730 — chuỗi GĐ739+ quay lại đánh giá bằng số (coverage, autoplay) trước khi tính mở rộng mới.
- ✅ **Đã duyệt (GĐ483):** người dùng chọn (a) — tiệm xôi thành cửa hàng nhỏ có nhà. Sạp/quầy hàng rong sau này bán ở ngõ khác khi **mở rộng bản đồ** (hướng kiểu Cities: Skylines 2: thêm ngõ/khu mới mở dần) — backlog lớn.
- 🗺️ **Mở rộng bản đồ B1–B5 ĐÃ XONG (GĐ497–505); đang làm chiều sâu Ngõ 2 (món sạp GĐ507–511, nâng sạp GĐ513).** Kế hoạch gốc: B1 khung "khu" dữ liệu (id, ranh giới, cấp/tiền mở, gốc toạ độ) + save `zones?` tuỳ chọn; B2 mở "Ngõ 2" phía bắc: đường + lô đất trống, biển RAO BÁN; B3 sạp/quầy hàng rong (xôi, nước mía, bánh mì) chỉ đặt ở ngõ mới; B4 khách/NPC đi lại giữa các khu, lưới đi lại theo khu; B5 bản đồ thu nhỏ hiện khu đã mở/chưa mở. Giữ ngân sách bundle (khu tải lười).
- ✅ **Cửa hàng nước thật B1–B5 ĐÃ XONG (GĐ424–428):** nhà quán, vào trong được, khách ngồi, tự pha, Quầy→Quán→Cà phê. Chiều sâu sau đó: thời tiết, đồ nóng, thực đơn (GĐ414–494).

- 🔍 **Rà 3 cơ sở (GĐ413, theo yêu cầu người dùng trước khi mở rộng tiệm xôi):**
  - Cửa hàng tiện lợi: luật chơi SÂU (ca kíp, mệt mỏi, sự cố đêm, máy bán hàng, điện, nhóm khách đêm). Nợ: BranchPanel 297 dòng gánh hết, cần soát độ rối; QA 3D xong GĐ527.
  - Nông trại: SÂU (mùa vụ, 7 vật nuôi, công trình 3 sao, đơn đặt hàng, phụ trại; world/farm.ts 996 dòng). QA 3D xong GĐ528.
  - Quán nước: ~~MỎNG~~ **ĐÃ KHOÉT SÂU (nhận định cũ lỗi thời — hiệu chỉnh GĐ1064):** nay đủ bốn chiều từng bị chê: (1) không còn "2 nút" — có bậc cửa hàng `QUAN_TIERS` (quầy→quán→cà phê, GĐ428) + mẻ tự pha `hand` (GĐ427, QUAN_HAND_BATCHES/MAX) + menu có slot `quanMenuSlots`; (2) thực đơn không còn "tự lấy mọi đồ uống" — `clearMenu` theo slot + `varietyMul`/`quanHotMul`(nóng theo thời tiết); (3) thời tiết GIỜ CÓ ảnh hưởng — `QUAN_WEATHER_MUL` (nắng 1.25…bão 0.45) × `weatherMul` × `quanMatchMul`(ngày trận, GĐ580+) × `quanWeekendMul`; (4) CÓ sự kiện — `QUAN_EVENT` máy pha hỏng (brewer) / xe nước đối diện (cart, GĐ703) + khách đêm ngày trận. `src/data/quanNuoc.ts` áp dụng tất cả trong `quanNuocDay` (xác định, không Math.random) và **coverage 0 lệnh trống + 7 file test** (`quanNuoc.test`/`quanNuocEvents`/`quanMatchNight`/`quanNuocHealth`/`quanNuocBalance`/`quanRecipes`/`quanNuocDayAction`). Panel 230 dòng là bảng phân tích số liệu mô phỏng — không còn là gánh 2 nút. Chỗ "tiệm xôi" + chiều sâu khác giữ nguyên.
  - Thứ tự sửa: ~~(1) thời tiết~~ xong GĐ414, ~~(2) chọn món~~ thành thực đơn pha chế GĐ415, ~~(3) 3D quán dùng kit~~ (đã có setQuanDecor: chậu cây + băng ghế), ~~(4) gọn BranchPanel~~ xong GĐ417, ~~(5) QA 3D~~ GĐ419 +GĐ420 đủ cả ba. Tiệm xôi phần còn lại để sau.
  - QA 3D cần save thử riêng: không có chế độ sandbox, không được sửa save thật của người dùng.

1. 🧹 **Nợ refactor UI (đo GĐ685, làm khi đụng panel đó hoặc hết việc chơi sâu):** `ReportPanels.tsx` (nay còn 550 dòng ở `src/ui/panels/`, GĐ898 đo lại — nợ ĐÃ HẾT; từng là 1.632 dòng chứa 6 panel (history/records/analytics/dossier/roadmap/discovery) → tách theo file; `BusinessPanel.tsx` (ĐÃ tách GĐ876 → 573 dòng). BranchPanel 297 dòng — nợ cũ GĐ417 ĐÃ ỔN, gỡ khỏi backlog. Chỉ tách khi có lý do chơi (sửa tính năng trong panel đó), không refactor thuần (Luật 1).
2. **Trục đã cạn:** 3D trang trí (chỉ làm 3D mới khi đi kèm gameplay — GĐ172–198) · multi-shop supply chain (GĐ199–209, khép mạch) · bộ soi tiền/vốn (GĐ210–251) · UI nợ (GĐ183/258) · chợ phiên (GĐ182).
2. **Khoá chờ save người thật:** NG+ vòng (GĐ171) · nhiệm vụ ngày 1–5 (GĐ254 đã giảm lặp). (GĐ110/117 ĐÃ ĐÓNG GĐ280 bằng số liệu; Arc E "Hàng xóm khai trương" ĐÃ HOÀN THÀNH GĐ283, 27 test cấu trúc xanh).
3. **Ý tưởng chờ Leader duyệt (chiều sâu, chưa làm):** (a) nhịp cuối tuần đậm hơn — **ĐÃ HOÀN THÀNH GĐ291** (lô chợ phiên đầu tháng nhận biết món ăn vặt cuối tuần + gợi ý trữ hàng đặc biệt); (b) nhiệm vụ tuần/tháng biết đến thứ/ngày trong kỳ — **ĐÃ HOÀN THÀNH GĐ289** (nhịp tháng monthPace hiển thị ngày còn lại tới hết tháng + dự báo kịp/hụt và bảo vệ chuỗi tháng).
4. 👥 **Đủ 2 chế độ (ĐÃ CHỐT GĐ288):** khoá chính sách parity chơi đơn/hẻm online: Sân chơi chung tiến độ; Tái sinh NG+ chỉ chơi đơn; Chào mừng quay lại chạy cục bộ. Test: coopClient.test.ts. Chi tiết: docs/progress-archive/BACKLOG-parity-GD288.md.

## Mục lục giai đoạn đã xong (chi tiết trong archive)
- GĐ1082–1090 (đóng 3 hướng chiều sâu GĐ1076 + món kích hoạt nông sản nhà): docs/progress-archive/PROGRESS-GD1082-1090.md
- GĐ1091–1097 (món kích hoạt nông sản tiếp tục + soi sáng pha-hay-bán + QA + bảo trì): docs/progress-archive/PROGRESS-GD1091-1097.md
- GĐ1098–1103 (rà ngân sách + QA render sống + bảo trì): docs/progress-archive/PROGRESS-GD1098-1103.md
- GĐ1104–1108 (soi sáng "Hôm nay đáng" cây/vật nuôi + QA render + audit 10-GĐ + bảo trì): docs/progress-archive/PROGRESS-GD1104-1108.md
- GĐ1109–1113 (xếp dòng theo tác động + nút thắt/nhập nguyên liệu + độ phủ + bảo trì): docs/progress-archive/PROGRESS-GD1109-1113.md
- GĐ1114–1118 (nhập nguyên liệu quán + nhắc hết hạn Vườn/Bếp + độ phủ): docs/progress-archive/PROGRESS-GD1114-1118.md
- GĐ1119–1123 (QA nối việc sáng + đóng trục Backlog + audit 10-GĐ lần 2 + QA render + bảo trì): docs/progress-archive/PROGRESS-GD1119-1123.md
- GĐ1124–1128 (bảo trì + QA luồng mới + dấu 🆕 đồng bộ): docs/progress-archive/PROGRESS-GD1124-1128.md
- GĐ1129–1133 (🆕 đồng bộ 6→7 bề mặt + đồng bộ ngữ nghĩa 4 cấp + QA render): docs/progress-archive/PROGRESS-GD1129-1133.md
- GĐ1134–1137 (bảo trì + QA cửa sổ 🆕 + audit 10-GĐ lần 3 + ưu tiên cây quan-cần): docs/progress-archive/PROGRESS-GD1134-1137.md
- GĐ1138–1142 (tư vấn chỉ món nấu/pha được ngay + QA render + làm mới nợ bảo mật): docs/progress-archive/PROGRESS-GD1138-1142.md
- GĐ1143–1146 (tiêu đề khối tư vấn + QA render ưu tiên cây quan-cần và 🆕): docs/progress-archive/PROGRESS-GD1143-1146.md
- GĐ1147–1149 (bảo trì + độ phủ lần 3 + audit 10-GĐ lần 4): docs/progress-archive/PROGRESS-GD1147-1149.md
- GĐ1150–1151 (mốc 1150 + một nguồn sự thật cửa sổ "mới"): docs/progress-archive/PROGRESS-GD1150-1151.md
- GĐ1152–1157 (bảo trì + đối chiếu archive + quy ước archiveCheck + vệ sinh mã + làm mới bundle/bảo mật): docs/progress-archive/PROGRESS-GD1152-1157.md
- GĐ1159–1160 (bảo trì dồn archive + audit 10-GĐ lần 5): docs/progress-archive/PROGRESS-GD1159-1160.md
- GĐ1161–1163 (bảo trì dồn archive + audit 10-GĐ lần 5): docs/progress-archive/PROGRESS-GD1161-1163.md
- Archive cũ (đối chiếu GĐ1157, tra theo tên file trong docs/progress-archive/): GĐ181–203 · GĐ204–212 · GĐ213–219 · GĐ220–229 · GĐ352 · GĐ382–393 · GĐ691–699 · GĐ700–710 · GĐ701–709 · GĐ715–726 · GĐ763–769 · GĐ771–780 · GĐ781–788 · GĐ790–799 · GĐ980–995 · GĐ1056–1061
- GĐ640–690 (rà ngân sách định kỳ, QA người mới/co-op, sửa SW stale assets + heartbeat server; dồn chi tiết): docs/progress-archive/PROGRESS-GD662-665.md · 666-671 · 672-680 · 681-688 (+ INDEX-GD637-659.md)
- GĐ741–762 (trục tín dụng/Sổ đầu ngày/sinh nhật khách quen; dồn chi tiết): docs/progress-archive/PROGRESS-GD741-747.md · 748-758 · 759-762
- GĐ860–875 (rà định kỳ Leader+Designer + ngân sách thông báo/bundle; chi tiết): docs/progress-archive/PROGRESS-GD840-854.md
- GĐ1006–1053 (phủ test theo lệnh coverage — từng nhánh core/ui): docs/progress-archive/PROGRESS-GD1005-1041.md · PROGRESS-GD1042-1054.md
- GĐ1056–1081 (phủ test core + rà ngân sách chống phình/coverage + xôi mới + cây trồng + nguồn cung/quan hệ hàng xóm): docs/progress-archive/PROGRESS-GD1056-1081.md
- GĐ721–729 (trục chốt deal ở quầy 4 đòn + nhân viên xin nghỉ hôm nay + save trắng đồng hồ thật): docs/progress-archive/PROGRESS-GD721-729.md
- GĐ731–739 (trả góp nợ, đèn đường dự án 2 + payoff 3D, luồng cố định đồng hồ thật): docs/progress-archive/PROGRESS-GD731-739.md
- GĐ711–719 (chiều sâu bán online 4 lớp: đơn gấp/lớn, bậc gian hàng, sự kiện app, khách quen đặt app; nạp trước 3D; hoàn tất vòng sự kiện 4 cơ sở): docs/progress-archive/PROGRESS-GD711-719.md
- GĐ177–293 (3D/đèn, supply chain, bộ soi tiền/vốn, khách quen, arc A–E, nhịp tháng, co-op parity): PROGRESS-GD230-249/250-257/281-293.md + INDEX-GD251-300.md
- GĐ294–342 (bundle/lazy, thông báo, co-op ca sáng, trần thưởng, save sandbox, FPS, vàng ngày 1/2): PROGRESS-GD294-305/306-310/311-319/312-325/326-328.md + PROGRESS-GD326-342-notes.md
- GĐ400–449 (test vườn, khách quen gọi tên, Tiệm xôi, quán nước thời tiết/pha chế/bậc/tự pha, sạp xôi 3D): docs/progress-archive/PROGRESS-GD400-449.md

- GĐ1–250: xem docs/progress-archive/INDEX-GD1-250.md
- GĐ251–300: xem docs/progress-archive/INDEX-GD251-300.md
- GĐ301–349: xem docs/progress-archive/INDEX-GD301-349.md
- GĐ350–381: xem docs/progress-archive/INDEX-GD350-381.md
- GĐ450–499 (quán nước đồ nóng, tiệm xôi có nhà, khu bản đồ B1–B2): xem docs/progress-archive/INDEX-GD450-499.md
- GĐ359–399 (lẻ) + GĐ500–511 (Ngõ 2 B2–B5, món sạp): xem docs/progress-archive/INDEX-GD359-399-500-511.md

- GĐ512–534 (Ngõ 2 nâng sạp/3D/tự đứng sạp, QA 3 cơ sở, nhịp cuối tuần xôi/tiện lợi): xem docs/progress-archive/INDEX-GD512-534.md
- GĐ535–549 (đơn trại cuối tuần + theo sức trại, dấu phẩy thập phân, chữ ≥11px, biểu đồ 375px, tin đồn quán xóm): xem docs/progress-archive/INDEX-GD535-549.md
- GĐ550–564: QA người mới, ngày 1 gọn, fitList/fitJoin ≤90 → xem docs/progress-archive/INDEX-GD550-564.md
- GĐ580–599 (quán nước đêm có trận, tiệm xôi/sạp ngày cúng, tách quanNuocInsights): xem docs/progress-archive/INDEX-GD580-599.md
- GĐ600–619 (tiện lợi đêm có trận, đồ cúng tiệm chính/trang trại, Sổ đầu ngày & thẻ "Mai tiệm có gì" báo ngày cúng/trận): xem docs/progress-archive/INDEX-GD600-619.md
- GĐ565–579: gom tin một toast (đêm/sau ngủ/cùng lượt), cảnh báo chi nhánh gom khung, đo FPS/module → docs/progress-archive/INDEX-GD565-579.md

- GĐ620–636 (ngày trận cho sạp/quán/tiện lợi, nhắc ngày cúng ở Sổ đầu ngày, tách việc theo dịp sang file nạp lười, HudKeys/CounterAskAlert nạp lười giữ bundle ≤597) → docs/progress-archive/INDEX-GD620-636.md

- GĐ637–659: lịch/đếm ngược sự kiện, gợi ý nhập đồ lễ & đồ cúng, HUD gọn (chi tiết: docs/progress-archive/INDEX-GD637-659.md).
- GĐ834–839: duyệt+áp dụng viết lại 4 thông báo (docs/notify-audit.md); FPS mobile late save ~28–30, CPU render ~1 ms (chưa kết luận, đo rAF cần pane hiện); chip kế hoạch mobile 36 px; hud-alerts mobile max-height 32vh; tsc/build ok, chunk lớn nhất 252 KB.
- GĐ840–854: audit GĐ840 xanh (2943 test, thông báo ≤90, HUD ≤20 nút); thêm hudMobileCss.test.ts (chip ≥36px, dải cảnh báo có trần vh); sửa bế tắc quỹ âm: bot autoplay/playtest vay gấp, cấp <5 được vay thêm tới trần 3 gói (loanWhenBroke.test.ts); nâng timeout coop. Còn mở: FPS ≥30 gfx Low cần máy thật. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ855–859: nâng timeout coop 60 s; kiểm tsc/build/gzip bầu đầu ≈538 KB/bộ test 110 s/remote đồng bộ. Chi tiết trong docs/progress-archive/PROGRESS-GD840-854.md.

- GĐ861–865: rà độ dài thông báo kỹ hơn — rút 4 thông báo (lương khi nhập hàng, mua/xuất chuồng giữa kỳ, thu hoạch bù nhìn); audit-notify.mjs và featureBudget.test.ts tính nhánh điều kiện dài nhất (cả template lồng nhau) → 0 thông báo >90. Chi tiết: docs/progress-archive/PROGRESS-GD840-854.md.
- GĐ866–869: gọn PROGRESS.md; cả bộ xanh 107 s; thêm notifyRuntimeLen.test.ts (bot chơi 6 ngày ở cấp 3/8/15, gom toast thật, 0 vượt 90). Chi tiết trong archive.

- GĐ960–979 (tách file lớn: alleyApi, buildingTextures, bizAchieve/Loan/Purchases, regularsList…): xem docs/progress-archive/PROGRESS-GD960-979.md
