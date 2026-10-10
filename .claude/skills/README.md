# Skills (bổ sung từ ai-kit của VNPAY)

Bộ skill này được **bê + tùy biến** từ `C:\Users\Admin\Desktop\ai-kit\skills` (eFin AI Kit của VNPAY) để phù hợp với dự án game **"Tiệm Tạp Hóa Đầu Hẻm"** (monorepo TypeScript — game-core / game-renderer / game-data / shared / apps-web / apps-server).

> ⚠️ Bản sao chính thức nằm ở `.claude/skills/`. Bản mirror giữ nguyên trong `.agents/skills/`. Khi sửa, sửa ở `.claude/skills/` rồi mirror lại.

## Danh sách skill & mức tùy biến

### Nhóm 1 — Bê thẳng (tinh chỉnh ngữ cảnh dự án)
| Skill | Tùy biến |
|-------|----------|
| `brainstorming` | Thêm ngữ cảnh monorepo/game; bắt buộc đọc `tổng hợp.md`; lưu ý package boundaries + responsive tokens. |
| `writing-plans` (+ `references/plan-template.md`, `references/phase-strategies.md`) | Template chỉnh theo game: package boundaries, test-runner riêng, browser-QA caveat, nghĩa vụ cập nhật `tổng hợp.md`. |
| `spec-reviewer` | Thêm mục determinism/co-op, mobile UI, docs obligation; bỏ phần tenant/IDOR (game 1 người chơi). |
| `code-reviewer` | Thêm mục determinism, hot-path allocations (renderer), responsive rules, docs; bỏ mục tenant. |
| `test-strategy` | Gắn đúng test setup: `game-core` dùng custom runner `tsx src/test-runner.ts` (KHÔNG phải jest/vitest); liệt kê các hệ thống game; lưu ý determinism/seed + golden data. |
| `action-commit` | Đổi prefix Jira (`VONB-xxxxx`) → quy ước "Đợt" của dự án (`da-14d`, `feat`, `fix`, ...); bỏ GitLab. |

### Nhóm 2 — Bê có tùy biến sâu
| Skill | Tùy biến |
|-------|----------|
| `database-design` | Bỏ toàn bộ SQL dialect VNPAY (Oracle/MySQL/Cassandra/Liquibase/Flyway); thay bằng Firestore + client save model; giữ nguyên lý thiết kế (NoSQL query-first, money=dùng số nguyên, index, save-version/migration). |
| `code-secure-fixer` | Giữ quy trình parse báo cáo scan + fix theo mức 1→7; bỏ phụ thuộc GitLab cứng, mở rộng cho các format report; cảnh báo cụ thể về **Firebase service-account JSON ở root**. |
| `log-processing` | Chuyển từ Java Spring Boot → **TypeScript/Node**; quan trọng: cấm log trong hot path (renderer per-frame / game-core tick); dùng entity IDs của game. |
| `onboarding` | Mở rộng để **gom/tham chiếu** các tài liệu có sẵn (`ARCHITECTURE.md`, `GAME_DESIGN.md`, `DATABASE_SCHEMA.md`, `HIEN-TRANG-CODE.md`, `tổng hợp.md`) thay vì tạo trùng lặp; cấu trúc thin guide. |
| `entity-reader` | Bỏ Spring JPA; thêm detect format TS types / `packages/game-data` / `DATABASE_SCHEMA.md` / Firestore; bỏ sinh SQL DDL (dự án không dùng DB quan hệ). |

### KHÔNG bê (Nhóm 3 — gắn stack VNPAY, không khớp game)
`secure-dev`, `oauth2-guide`, `api-design`, `angular-form-generator`, `log-processing` (bản gốc), `sequence-diagram`, `skill-creator` (meta), và 2 rule `vnpay-developer-security` / `vnpay-oauth2-security`. Lý do: bảo mật/PCI-DSS/OAuth2/Angular/SQL Oracle không liên quan stack game; `debug-fe` cần Playwright MCP hiện chưa có.

---
Nguồn: bộ `ai-kit` VNPAY (fork nội bộ GitLab `git.vnpay.vn/dvtcdt/ai/ai-kit`). Đã tùy biến cho dự án — không phải bản sao nguyên trạng.
