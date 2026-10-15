import assert from 'node:assert/strict';
import { TILE_SIZE } from '@game/shared';
import { ZOOM_MAX, ZOOM_MIN } from '@game/data';
import { PixelCamera } from './camera';

console.log('--- Testing PixelCamera ---');

// Zoom mặc định theo khung nhìn
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(390, 844);
  assert.equal(cam.zoom, 1.25, 'điện thoại dọc: 1.25');
  cam.setViewportSize(740, 360);
  assert.equal(cam.zoom, 1.5, 'điện thoại ngang: 1.5');
  cam.setViewportSize(1024, 768);
  assert.equal(cam.zoom, 2, 'desktop nhỏ: 2');
  cam.setViewportSize(1920, 1080);
  assert.equal(cam.zoom, 3, 'desktop lớn: 3');
  assert.deepEqual(cam.viewSize(), { w: 1920 / 3, h: 1080 / 3 }, 'viewSize = khung / zoom');
}

// Zoom bị kẹp trong [ZOOM_MIN, ZOOM_MAX]; giá trị lỗi bị bỏ qua
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(1024, 768);
  cam.setZoom(1000);
  assert.equal(cam.zoom, ZOOM_MAX);
  cam.setZoom(0.0001);
  assert.equal(cam.zoom, ZOOM_MIN);
  const before = cam.zoom;
  cam.setZoom(NaN);
  assert.equal(cam.zoom, before, 'NaN không đổi zoom');
  cam.setZoom(-3);
  assert.equal(cam.zoom, before, 'zoom âm không đổi zoom');
  const target = cam.targetZoom;
  cam.zoomBy(0);
  cam.zoomBy(Infinity);
  assert.equal(cam.targetZoom, target, 'hệ số không hợp lệ bị bỏ qua');
}

// zoomIn / zoomOut đi qua các nấc và dừng ở biên
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(1024, 768);
  let prev = cam.targetZoom;
  for (let i = 0; i < 20; i++) { const z = cam.zoomIn(); assert.ok(z >= prev); prev = z; }
  assert.equal(cam.targetZoom, prev);
  const top = prev;
  assert.equal(cam.zoomIn(), top, 'zoomIn ở nấc cao nhất đứng yên');
  for (let i = 0; i < 20; i++) { const z = cam.zoomOut(); assert.ok(z <= prev); prev = z; }
  assert.equal(cam.zoomOut(), prev, 'zoomOut ở nấc thấp nhất đứng yên');
  assert.ok(prev < top);
}

// updateZoom trượt về đích và dừng
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(1024, 768);
  cam.zoomTo(3);
  assert.equal(cam.updateZoom(0.016), true);
  for (let i = 0; i < 600; i++) cam.updateZoom(0.016);
  assert.equal(cam.zoom, cam.targetZoom);
  assert.equal(cam.updateZoom(0.016), false, 'đã tới đích thì không đổi');
}

// Kéo màn hình: đảo dấu, chia zoom, kẹp theo khoảng tối đa, resetPan
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(1024, 768);
  cam.pan(40, -20);
  assert.equal(cam.panOffsetX, -40 / cam.zoom);
  assert.equal(cam.panOffsetY, 20 / cam.zoom);
  cam.pan(-1e9, 1e9);
  assert.equal(cam.panOffsetX, cam.maxPanDistance());
  assert.equal(cam.panOffsetY, -cam.maxPanDistance());
  cam.resetPan();
  assert.equal(cam.panOffsetX, 0);
  assert.equal(cam.panOffsetY, 0);
}

// Giới hạn vùng chơi: camera không rời hộp + lề; khung rộng hơn hộp thì căn giữa
{
  const cam = new PixelCamera(20, 16);
  cam.setViewportSize(1024, 768);
  cam.setPlayBounds(0, 0, 100, 80, undefined, 0);
  cam.follow({ x: -5000, y: -5000 }, 10);
  assert.ok(cam.x >= 0 && cam.y >= 0, 'không vượt biên trái/trên');
  cam.follow({ x: 1e6, y: 1e6 }, 10);
  const { w, h } = cam.viewSize();
  assert.ok(cam.x <= 100 * TILE_SIZE - w + 1e-6 && cam.y <= 80 * TILE_SIZE - h + 1e-6, 'không vượt biên phải/dưới');

  const small = new PixelCamera(20, 16);
  small.setViewportSize(1024, 768);
  small.setPlayBounds(0, 0, 2, 2, undefined, 0);
  small.follow({ x: 100, y: 100 }, 10);
  const v = small.viewSize();
  assert.ok(Math.abs(small.x - (2 * TILE_SIZE - v.w) / 2) < 1e-6, 'hộp nhỏ hơn khung: căn giữa');
}

console.log('PASS camera');
