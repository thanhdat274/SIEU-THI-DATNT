# Export telemetry ẩn danh (đầu vào cho `npm run telemetry:report`)

Khi không kết nối được MongoDB, script `scripts/telemetry-report.mjs` đọc các file `.json`
trong thư mục này. Mỗi file là một **mảng bản ghi ngày** (DayReport), định dạng giống đúng
`validateReport` phía server (`server/telemetry.ts`):

```json
[
  {
    "v": 1,
    "install": "ab12cd34ef56",
    "build": "dev",
    "day": 47,
    "level": 30,
    "prestige": 0,
    "mode": "solo",
    "realSec": 1280,
    "sessions": 3,
    "moneyBand": 2,
    "customers": 214,
    "unhappy": 9,
    "walkouts": 2,
    "fainted": false,
    "shortfall": false,
    "inspectFail": false,
    "panels": { "shelf": 3, "orders": 2 },
    "used": ["shelf", "orders"],
    "unlockedToday": 12,
    "fps": 55,
    "gfx": "medium",
    "device": "phone"
  }
]
```

- `install` = id ẩn danh (khoá cố định của một „người chơi"), không chứa tên/tài khoản/vị trí.
- Có thể có khoá `_install` / `day` thay cho `install` nếu file xuất từ client.
- Script chỉ tính 5 bảng; không dựng dashboard (SPEC-TOI-UU §T1 L4).
