---
name: feedback-panel
description: Chạy "bảng góp ý người dùng ảo" (player persona feedback panel) cho game Tạp Hóa 3D — dựng ~30 persona tính cách khác nhau, mô phỏng họ chơi + góp ý bám trạng thái game có thật, rồi tổng hợp thành báo cáo ưu tiên có đối chiếu luật cứng. Dùng khi muốn xin góp ý để bổ sung game, hoặc khi cần "người chơi thử" trong lúc chưa có playtest thật.
allowed-tools: Read, Glob, Grep, Bash
---

<objective name="player_feedback_panel">
Dựng một buổi "lấy ý kiến người chơi" bằng persona mô phỏng: nhiều nhân khẩu/tính cách khác nhau "chơi thử" game dựa trên trạng thái thật (đọc từ PROGRESS.md), đưa ra góp ý chân thực, rồi gộp trùng, phân loại hạng mục, và chấm mức ưu tiên có **đối chiếu luật cứng** — để đội/quản lý quyết định bổ sung gì.
</objective>

<context name="this_project">
Game **Tạp Hóa 3D** (React + Three.js, mobile-first, có PWA). "Luật cứng" và "ngân sách chống phình" nằm trong `promt_game.md`; tầm nhìn + trạng thái hiện tại + backlog nằm trong `PROGRESS.md` (nguồn chân lý của trạng thái game).

Hai công cụ nền:
- `npm run persona:digest` → `scripts/persona-digest.mjs`: đọc `PROGRESS.md` + `promt_game.md`, trích bản tóm tắt tất định (GĐ hiện tại, vài GĐ gần nhất, tầm nhìn, luật cứng, ngân sách). **Bắt buộc chạy trước** để persona góp ý không bịa.
- `references/persona-roster.md` trong skill này: 30 archetype + thang tính cách (thiết bị / thói quen / mục tiêu) để các lần chạy nhất quán.
</context>

<constraint name="ground_in_real_state">
Persona phải góp ý **bám tính năng/trạm/cơ chế có thật** trong PROGRESS.md — không bịa tính năng không tồn tại. Trước khi trích dẫn, spot-check rằng tính năng đó quả thực xuất hiện trong PROGRESS.md.
</constraint>

<constraint name="honest_limits">
Ghi rõ trong báo cáo: đây là **mô phỏng định tính**, không phải playtest thật; không dùng làm bằng chứng định lượng. Không nâng/ chấp nhận mọi góp ý mù quáng — mỗi đề xuất phải đối chiếu luật cứng (Luật 1 giữ chân · 6 có test · 4 đủ 2 chế độ · 8 hiệu năng máy yếu · 9 chống phình).
</constraint>

<constraint name="never_write_to_backlog_automatically">
Tuyệt đối **KHÔNG tự động thêm góp ý vào backlog PROGRESS.md**. Báo cáo đưa bảng đề xuất "nên bổ sung / để sau / không nên" kèm lý do luật cứng; việc nào vào backlog do Leader/người dùng chốt.
</constraint>

<anti_pattern name="avoid_hallucinated_features">
| Anti-Pattern | Why |
|--------------|-----|
| Persona "đòi" tính năng không có trong game | Góp ý thành bịa, làm lệch backlog |
| Chấp nhận mọi góp ý, không chiếu luật cứng | Phình game, phá "chiều sâu-trước" |
| Tự động viết vào PROGRESS.md | Rối backlog đội quản lý cẩn thận |
| Trình bày mô phỏng như playtest thật | Oan sai quyết định |
| Dựng trang trí khác từng lần kém tái lặp | Kết quả không so sánh được qua các GĐ |
</anti_pattern>

<process_flow>
```
Chạy npm run persona:digest  (lấy "sàn" tất định trạng thái game)
        ↓
Đọc references/persona-roster.md (30 archetype) + PROGRESS.md (chi tiết tính năng)
        ↓
Dựng 30 persona (id, tên, thiết bị, thói quen, giai đoạn, mục tiêu); bố trí cân bằng thiết bị & giai đoạn
        ↓
Với từng persona: mô phỏng hành trình ngắn + góp ý 4 nhãn (thích / khó hiểu / bực / ước có), trích tính năng thật
   └─ spot-check trích dẫn: tính năng nhắc đến PHẢI có trong PROGRESS.md
        ↓
Gộp trùng → nhóm hạng mục → đếm số persona đồng tình
        ↓
Bảng đề xuất ưu tiên: từng đề xuất — vì sao giữ chân + đối chiếu luật cứng → nên/để sau/không nên
        ↓
Ghi báo cáo file mới có ngày: PHAN-TICH-FEEDBACK-NGUOI-DUNG-AO-<YYYY-MM-DD>.md (repo root)
        ↓
Báo ngắn cho người dùng: tóm tắt điều hành + điểm cần Leader chốt
```
</process_flow>

<process name="steps">
1. **Chạy digest.** `npm run persona:digest` — lưu GĐ hiện tại, vài GĐ gần nhất, tầm nhìn, luật cứng, ngân sách. Đây là "sàn" không bịa.
2. **Rà trạng thái sâu hơn nếu cần.** Mở `PROGRESS.md` phần "Trạng thái hiện tại", "Tầm nhìn game", "Quyết định lớn" để nắm tính năng thật (các hệ: chuỗi trồng→nấu, nông trại, quán nước, tiệm xôi, nhân viên, khách quen, bán online, co-op/hẻm online, meta-progression, sự kiện mùa, 3 mức đồ họa…). Mục "Ngân sách chống phình" cũng nằm trong `promt_game.md`.
3. **Dựng 30 persona** theo `references/persona-roster.md`: lấy bộ archetype, gán id/tên, giữ cân bằng thiết bị (mobile/PC/tablet/máy yếu) và giai đoạn (ngày 1 / giữa / cuối / NG+ / co-op).
4. **Mô phỏng trải nghiệm + góp ý** mỗi persona: 1–3 dòng hành trình (đã thấy/đụng gì dựa trên tính năng thật) + 4 nhãn góp ý. Spot-check mọi trích dẫn tính năng.
5. **Tổng hợp**: gộp trùng, nhóm hạng mục (onboarding / UX / kinh tế / chiều sâu / co-op / hiệu năng / endgame), đếm số persona đồng tình từng góp ý.
6. **Phân loại ưu tiên** theo đúng bảng mẫu: với mỗi đề xuất ghi *vì sao giữ chân (Luật 1)* + *đối chiếu luật cứng* (chống phình nút HUD ≤20, thông báo ≤90, chiều sâu-trước, đủ 2 chế độ, có test, hiệu năng máy yếu) → kết luận **nên bổ sung / để sau / không nên**. Ghi rõ ưu tiên P0/P1/P2 nên làm trước.
6b. **Playtest chơi thật (bắt buộc cho 3–8 persona đại diện).** Mở `http://localhost:5173/` bằng built-in browser (KHÔNG tự chạy dev server — Luật 11), khung hẹp ~440 px để giả điện thoại. Chơi theo kịch bản của persona (ngày 1: mở cửa → ra tiệm → bày hàng → nhập hàng → đi ngủ → đọc tổng kết). Ghi theo giờ game: chỗ kẹt, bấm không phản hồi, panel trắng, chữ tràn, con số gây nản. Đọc state bằng `window.game.useGame.getState()`, FPS bằng `window.game.perf()`. Lưu ý: gọi `tick()` tay không sinh khách — để game tự chạy ở 8×. Không click bừa nút "Đóng" bằng selector JS (có thể thoát game). Ghi riêng `PHAN-TICH-PLAYTEST-PERSONA-<YYYY-MM-DD>.md`, đề xuất phải dẫn đúng quan sát thật. Mẫu: `PHAN-TICH-PLAYTEST-PERSONA-2026-11-06.md`. Muốn thử giữa/cuối game: `game.autoplay(N)` (mỗi lần ≤7 ngày vì công cụ có giới hạn thời gian), rồi lưu bằng `(await import('/src/core/save.ts')).saveGame()` và tải lại trang. Bấm nút bằng `find` theo tên, không bấm tọa độ trong menu Thêm (có "Chơi lại từ đầu"). Co-op cần người dùng tự đăng nhập Google. Mẫu đợt 2: `PHAN-TICH-PLAYTEST-PERSONA-DOT2-2026-11-06.md`.
7. **Ghi báo cáo** `PHAN-TICH-FEEDBACK-NGUOI-DUNG-AO-<YYYY-MM-DD>.md` ở repo root theo cấu trúc: mục đích & phương pháp & giới hạn → tóm tắt điều hành → 30 hồ sơ persona → góp ý từng persona → tổng hợp → bảng đề xuất ưu tiên → khuyến nghị → cách tái chạy.
8. **Báo cáo ngắn** cho người dùng: tóm tắt điều hành (điểm giữ chân tốt / nỗi đau / góp ý đáng làm) + nêu rõ "không tự ý vào backlog; cần chốt N1/N2…". Không viết lại toàn bộ báo cáo ra chat.
</process>

<constraint name="output_location">
Báo cáo ghi ở **repo root** (cùng chỗ `PHAN-TICH-*` / `NGHIEN-CUU-*` có sẵn), tên có ngày, KHÔNG sửa báo cáo lần trước — mỗi GĐ một báo cáo mới.
</constraint>

<constraint name="budget_awareness">
Nhắc người dùng khi đề xuất "lớn" (hệ/endgame/co-op/UI mới): việc vừa/lớn phải vào **quy trình OpenSpec** (`/opsx:propose` → `apply` → `verify` → `archive`), không merge chung với nội dung góp ý này.
</constraint>
