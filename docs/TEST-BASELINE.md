# Baseline thời gian test

> Baseline **đo lần đầu** cho SPEC-TOI-UU §T5 (chạy `npm run test:times`, vitest `--reporter=json`).
> Mọi mục tiêu thời gian trong spec là ước lượng cho tới khi có số này.

## Lần đo 2026-11-10

| Chỉ số | Giá trị |
|---|---|
| File test | 738 |
| Tổng giờ chạy (tổng theo file, song song) | ~45,5 phút |
| File trên 60 s | 12 |
| File trên 30 s | 13 |
| File trên 10 s | 17 |
| Tổng khẳng định | 6703 |
| Mã thoát vitest | khác 0 (quá tải luồng đã biết — GĐ883, không phải lỗi test) |

### 30 file chậm nhất

| Thời gian | File |
|---|---|
| 564.77s | `crisisBalance.test.ts` |
| 537.99s | `stanceBalance.test.ts` |
| 258.60s | `economySimL50.test.ts` |
| 198.13s | `notifyRuntimeLen.test.ts` |
| 179.39s | `simBands.test.ts` |
| 155.11s | `economySimL10L20.test.ts` |
| 143.33s | `weeklyGoalCap.test.ts` |
| 126.53s | `economySimL5.test.ts` |
| 125.81s | `economySim.test.ts` |
| 124.49s | `contentEpoch.test.ts` |
| 63.30s | `coopClient.test.ts` |
| 62.26s | `ledger.test.ts` |
| 48.26s | `simGolden.test.ts` |
| 27.68s | `longSessionLeak.test.ts` |
| 19.69s | `saveStore.test.ts` |
| 14.95s | `reviewR2Day1.test.ts` |
| 13.25s | `playtest.test.ts` |
| 6.19s | `phoneReasons.test.ts` |
| 5.34s | `startAutosave.test.ts` |
| 4.96s | `crowdLod.test.ts` |
| 4.37s | `khacKhauArc.test.ts` |
| 3.74s | `staffAgent.test.ts` |
| 3.07s | `substituteFlow.test.ts` |
| 2.61s | `discovery.test.ts` |
| 2.05s | `giftbaskets.test.ts` |
| 1.38s | `regularGift.test.ts` |
| 1.13s | `onlineQuestCap.test.ts` |
| 0.80s | `zones.test.ts` |
| 0.66s | `economy.test.ts` |
| 0.65s | `crisis.test.ts` |

### Nhận xét cho T5-L2 (chia nhóm)

- Cụm **sim** chiếm gần hết thời gian: 13 file ≥ 30 s hầu như đều là mô phỏng kinh tế
  (`crisisBalance`, `stanceBalance`, `economySim*`, `simBands`, `simGolden`, `weeklyGoalCap`, `ledger`).
- Cụm **store** (`saveStore`, `coopClient`, `startAutosave`) ~1 phút rưỡi.
- Phần còn lại (~715 file) chạy nhanh — ứng viên cho nhóm **unit**.
