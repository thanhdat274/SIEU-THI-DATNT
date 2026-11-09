---
name: agent-browser
description: Điều khiển trình duyệt bằng agent-browser (CLI Rust của Vercel Labs, đã cài tại máy này) trên DeepSeek Harness — mở trang, lấy snapshot accessibility tree tiết kiệm token, click theo ref, fill/type, screenshot, get state. Dùng khi cần browser automation chi tiết theo kiểu ref-based, giữ browser mở giữa các lệnh, hoặc dùng cloud provider/video/network mà dsh-browser (Playwright) không có. agent-browser là CLI gọi qua tool pwsh, KHÁC với các tool browser_* tích hợp sẵn của harness.
allowed-tools: Read, Glob, Grep, Pwsh, Bash
---

<objective name="drive_browser_via_agent_browser">
Vận hành trình duyệt bằng CLI `agent-browser` qua tool pwsh: mở trang, đọc snapshot (accessibility tree dạng text gọn với ref), thao tác theo ref, đọc lại để xác nhận kết quả, và lặp lại — vòng lặp agent-first "open → snapshot → act → verify".
</objective>

<context name="installed_environment">
- Đã cài **agent-browser 0.41.2** (npm global) + **Chrome for Testing 157** (tại `C:\Users\Admin\.agent-browser\browsers\chrome-157.0.8103.38`).
- Gọi được nhờ thêm npm bin vào PATH: `$env:PATH += ";$env:APPDATA\npm"` trước khi chạy lệnh (hoặc dùng `npx agent-browser ...`).
- Đã chạy thử thành công: `open`, `snapshot -i`, `click @ref`, `get url`, `screenshot`, `close`. `doctots`: 9 pass / 0 fail.
- Chrome chạy headless; daemon giữ browser mở giữa các lệnh (~1h idle rồi tự đóng).
</context>

<constraint name="quote_refs_in_pwsh">
**BẮT BUỘC**: ref (ví dụ `@e1`) phải được **bọc dấu nháy** khi truyền qua tool pwsh: `agent-browser click "@e1"`. Nếu không, PowerShell hiểu `@` là toán tử splatting và lệnh báo "Missing arguments for: click". Đây là khác biệt lớn nhất so với chạy trong bash. Đọc ref động từ output snapshot nếu ref không đoán trước được.
</constraint>

<constraint name="fresh_snapshot_before_ref">
Ref mô tả trang tại thời điểm snapshot. Sau khi điều hướng hoặc DOM thay đổi, **chụp snapshot mới trước khi dùng ref lại** — nếu không ref cũ có thể trỏ sai hoặc lệnh fail.
</constraint>

<constraint name="act_then_verify">
Sau mỗi hành động (click/fill/type/submit), dùng `agent-browser get url`, `agent-browser read`, hoặc `agent-browser snapshot -i` để **xác nhận kết quả** trước khi bước tiếp — giống vòng lặp agent-first chuẩn.
</constraint>

<anti_pattern name="avoid_refs_and_pwsh_pitfalls">
| Anti-Pattern | Why |
|--------------|-----|
| Gọi `click @e1` (không quote) qua pwsh | PowerShell splatting → "Missing arguments", hành động không chạy |
| Dùng ref cũ sau khi trang điều hướng/DOM đổi | Refs lỗi thời, trỏ sai phần tử |
| Click rồi không verify kết quả | Tưởng thành công nhưng thực ra fail (banner che, element ẩn…) |
| Để daemon mở mãi | Daemon tự đóng sau ~1h; gọi `close` khi xong cho gọn |
</anti_pattern>

<process_flow>
```
1. Chuẩn bị PATH:  $env:PATH += ";$env:APPDATA\npm"
2. agent-browser open <url>          # launch + navigate (https:// tự prepend nếu thiếu)
3. agent-browser snapshot -i         # accessibility tree, mỗi element có ref như @e1 (gọn, ít token)
4. Lấy ref (nhớ QUOTE "@e1" qua pwsh); thao tác:
     click/fill/type/press/select/check/hover/scroll...
5. Verify: agent-browser get url | agent-browser read | snapshot lại
6. Lặp 3→5 cho tới xong task
7. agent-browser close               # đóng browser
Khi cần danh sách lệnh đầy đủ: agent-browser skills get core --ref commands
```
</process_flow>

<lệnh-chính>
```
open <url>            mở + điều hướng (goto/navigate)
read [url]            đọc text trang dạng agent-readable; --outline, --filter
snapshot -i           chụp accessibility tree (interactive) — dùng nhiều nhất
snapshot -c           compact; snapshot -s "#main" phạm vi theo selector
click @ref            click theo ref (quote qua pwsh); --new-tab để mở tab mới
fill @ref "text"      xóa + gõ;   type @ref "text" gõ thêm không xóa
press Enter           phím;  press Control+a tổ hợp
get url|title|value|html   đọc trạng thái trang
screenshot file.png   chụp ảnh màn hình;  pdf file.pdf
cookies / storage / network   dùng cho state & network
tab                   quản lý tab;  frame;  dialog
sessions / auth       phiên & đăng nhập lưu trạng thái
close                 đóng browser (quit/exit)
skills get core       lấy skill/hướng dẫn đầy đủ của CLI
mcp                   chạy MCP server (nếu cần tích hợp MCP)
doctor / install / upgrade   chẩn đoán, tải/cập nhật Chrome
```
</lệnh-chính>
