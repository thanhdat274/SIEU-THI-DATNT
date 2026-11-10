# Nhật ký chép lại mốc cân bằng

Mỗi lần mốc trong `src/__tests__/golden.json` đổi là một mục ở đây, do lệnh sau tự ghi:

```bash
npm run golden:update -- "<lý do đổi kinh tế>"
```

- `golden30`: sim cấp 30, 3 ngày, seed 169, chạy ở **kỷ nguyên nội dung 0** (chỉ nội dung gốc), sai số ±5%.
- `bands`: sim cấp 10/30/50/65/100, 3 ngày, **nội dung đầy đủ**, sai số ±15%.

Các lần chép lại trước 10/11/2026 nằm trong chú thích đầu `src/__tests__/simGolden.test.ts`.

## 2026-11-10 — Lập mốc dải cân bằng lần đầu (SPEC-TOI-UU §T4)

`golden30` giữ nguyên số cũ sau khi chuyển sang kỷ nguyên 0 (chưa có nội dung nào ghi `since`).

| Mốc | Tiền cuối kỳ | Tổng lãi vận hành | Cấp cuối |
|---|---|---|---|
| dải cấp 10 | 12.022.196 | −6.533.000 | 13 |
| dải cấp 30 | 24.363.320 | −31.305.000 | 31 |
| dải cấp 50 | 36.373.312 | −61.348.000 | 51 |
| dải cấp 65 | 65.739.041 | −69.486.000 | 66 |
| dải cấp 100 | 76.681.632 | −161.361.000 | 100 |
