# Proposal

## Why

Sau change `road-cross-section-drainage` đường đã có vạch qua đường và hai làn, nhưng xe vẫn chạy xuyên vạch như không có gì và không có người băng qua. Phần "khách đi bộ qua vạch sang đường vào tiệm" trong tài liệu cũ cũng không đúng với mã: khách đi xe đỗ ngay trên vỉa hè (`STREET_PARKING_SPOTS`, hàng y = 12) và khách đi bộ xuất hiện ở cửa tiệm, nên chưa ai thật sự qua đường. Đây là hạng mục thứ 4 trong thứ tự đề xuất của `tổng hợp.md`.

## What Changes

- Đèn giao thông có chu kỳ xác định (xanh 26 s, vàng 3 s, đỏ 15 s) tại vạch qua đường, hàm thuần `trafficSignalAt`; đèn người đi bộ đi trong 9 s đầu của pha đỏ (sau 1 s trễ) rồi nhấp nháy dọn đường.
- Xe chạy trên hai làn dừng trước vạch khi đèn vàng/đỏ hoặc có người đang qua, giảm/tăng tốc êm, giữ khoảng cách và xếp hàng sau xe trước; xe quá gần vạch lúc vàng thì đi tiếp (vùng lưỡng lự).
- Người đi bộ nền (không phải khách) chờ ở mép vỉa, chỉ bắt đầu qua khi đèn đi còn đủ thời gian, qua vạch rồi rời cảnh; không xuất hiện ban đêm hay khi mưa lớn; tối đa 2 người.
- Renderer: hai cột đèn cạnh vạch (đèn xe 3 bóng, đèn người đi bộ) và sprite người đi bộ nhỏ.
- Không đổi khách thật, cân bằng, save hay multiplayer: giao thông hẻm vẫn chỉ cục bộ, không lưu.

## Capabilities

### New Capabilities

- `traffic-signal`: chu kỳ đèn xe và đèn người đi bộ.
- `crosswalk-yielding`: xe dừng/nhường tại vạch, người đi bộ qua đường.

### Modified Capabilities

- Không có spec chính sửa.

## Non-goals

- Khách thật qua đường (khách đi bộ bắt đầu ở cửa tiệm, khách đi xe bắt đầu ở ô đỗ trên vỉa hè): đổi chỗ xuất hiện/ô đỗ ảnh hưởng gameplay và cân bằng, để change riêng.
- Đèn ở ngã tư khác, nhiều làn, rẽ, va chạm giữa xe và người chơi/khách.
- Đồng bộ trạng thái đèn giữa các client (giao thông hẻm hiện là ambient cục bộ).
- Còi/âm thanh, đèn đêm phát sáng.

## Impact

`packages/game-data/src/traffic.ts`, `packages/shared/src/index.ts` (kiểu mới, `currentSpeed` tùy chọn), `packages/game-core/src/street-traffic.ts`, `traffic-signal.ts`, `simulation.ts`, `packages/game-renderer/src/street-signal.ts` và `viewport.ts`, test `traffic-signal.test.ts`, `tổng hợp.md`.
