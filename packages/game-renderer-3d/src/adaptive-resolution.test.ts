import assert from 'node:assert/strict';
import { AdaptiveResolutionController } from './adaptive-resolution';

// Khởi tạo mặc định
const controller = new AdaptiveResolutionController();
assert.equal(controller.isDownscaled, false);
assert.equal(controller.currentFactor, 1.0);
assert.equal(controller.resolveScalingLevel(2), 2);

// 1. Chạy 60 FPS ổn định trong 5 giây: không hạ độ phân giải
for (let i = 0; i < 360; i++) {
  const changed = controller.update(1 / 60, 60);
  assert.equal(changed, false);
}
assert.equal(controller.isDownscaled, false);

// 2. Chạy 40 FPS (< 45) trong 3 giây: kích hoạt tự hạ độ phân giải (hệ số x1.5)
let triggered = false;
for (let i = 0; i < 140; i++) {
  const changed = controller.update(1 / 40, 40);
  if (changed) triggered = true;
}
assert.equal(triggered, true, 'Phải kích hoạt hạ độ phân giải sau 3s FPS < 45');
assert.equal(controller.isDownscaled, true);
assert.equal(controller.currentFactor, 1.5);
assert.equal(controller.resolveScalingLevel(2), 3.0);

// 3. Chạy 60 FPS trong 5 giây (< 10 giây): VẪN giữ nguyên hạ độ phân giải
for (let i = 0; i < 300; i++) {
  controller.update(1 / 60, 60);
}
assert.equal(controller.isDownscaled, true, 'Chưa đủ 10s nên chưa được phục hồi');

// 4. Nếu bị sụt FPS giữa chừng (ví dụ rơi về 55 sau 8s FPS cao): bộ đếm phục hồi bị reset
for (let i = 0; i < 180; i++) {
  controller.update(1 / 60, 60); // Đã tích lũy thêm 3s (tổng 8s nếu không reset)
}
controller.update(1 / 55, 55); // Sụt dưới 58 -> reset bộ đếm phục hồi
for (let i = 0; i < 300; i++) {
  controller.update(1 / 60, 60); // Chạy thêm 5s sau khi reset
}
assert.equal(controller.isDownscaled, true, 'Sau khi sụt FPS và mới chạy lại 5s thì chưa đủ 10s');

// 5. Chạy tiếp 5.5 giây nữa (> 58 liên tục đủ 10.5s từ mốc reset): PHỤC HỒI độ phân giải về mặc định
let restored = false;
for (let i = 0; i < 330; i++) {
  const changed = controller.update(1 / 60, 60);
  if (changed) restored = true;
}
assert.equal(restored, true, 'Phải phục hồi sau 10s liên tục FPS > 58');
assert.equal(controller.isDownscaled, false);
assert.equal(controller.currentFactor, 1.0);
assert.equal(controller.resolveScalingLevel(2), 2);

// 6. Tạm dừng khi mở modal / tab ẩn: không đếm và không đổi trạng thái
controller.update(1 / 30, 30, true);
assert.equal(controller.isDownscaled, false);

console.log('PASS adaptive-resolution: đo FPS 3s tự hạ độ phân giải x1.5, phục hồi sau 10s FPS > 58 liên tục');
