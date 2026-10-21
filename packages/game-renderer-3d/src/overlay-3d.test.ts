import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import { getIconSvg, Overlay3D } from './overlay-3d';
import { CAMERA_BETA, CAMERA_FOV, cameraUp, isoAlpha, zoomRadius } from './coords';
import { ACTOR_WORLD_HEIGHT } from './actors-3d';

// 1. Kiểm tra bộ đệm SVG: sinh đúng icon 16x16, có cấu trúc SVG và cache
const coinSvg1 = getIconSvg('pixel_coin');
const coinSvg2 = getIconSvg('pixel_coin');
assert.equal(coinSvg1, coinSvg2, 'SVG icon đồng xu phải được cache cùng tham chiếu');
assert.ok(coinSvg1.includes('width="16"'), 'Icon đồng xu rộng 16');
assert.ok(coinSvg1.includes('height="16"'), 'Icon đồng xu cao 16');
assert.ok(coinSvg1.includes('#E9B95D'), 'Icon đồng xu có màu vàng #E9B95D');

const noodleSvg = getIconSvg('product:mi_hao_hao');
assert.ok(noodleSvg.includes('width="16"'), 'Icon mì Hảo Hảo rộng 16');
assert.ok(noodleSvg.includes('<rect'), 'Icon sản phẩm phải gồm các hình vuông pixel <rect>');

const fallbackSvg = getIconSvg('product:none');
assert.ok(fallbackSvg.includes('width="16"'), 'Icon fallback sản phẩm rộng 16');

// 2. Kiểm tra tính ổn định của toạ độ chiếu đầu nhân vật khi xoay camera 4 hướng (Q/R)
{
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const target = new Vector3(15, 0, 15);
  const camera = new ArcRotateCamera('test-cam', isoAlpha(0), CAMERA_BETA, zoomRadius(2), target, scene);
  camera.fov = CAMERA_FOV;
  const viewport = new Viewport(0, 0, 800, 600);
  const proj = new Vector3();

  const results: Array<{ x: number; y: number }> = [];
  for (let q = 0; q < 4; q++) {
    camera.alpha = isoAlpha(q);
    scene.render();
    const up = cameraUp(isoAlpha(q), CAMERA_BETA);
    const headPos = new Vector3(15 + up.x * ACTOR_WORLD_HEIGHT, up.y * ACTOR_WORLD_HEIGHT, 15 + up.z * ACTOR_WORLD_HEIGHT);
    Vector3.ProjectToRef(headPos, Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport, proj);
    results.push({ x: Math.round(proj.x), y: Math.round(proj.y) });
  }

  // Toạ độ chiếu x luôn ngay tâm màn hình (400), y ổn định trên đầu qua cả 4 hướng xoay
  for (let q = 0; q < 4; q++) {
    assert.equal(results[q].x, 400, `Quarter ${q} toạ độ x chiếu phải ở giữa màn hình (400)`);
    assert.equal(results[q].y, results[0].y, `Quarter ${q} toạ độ y chiếu phải khớp với quarter 0`);
  }

  engine.dispose();
}

// 2b. Kiểm phép chiếu (hệ tay phải, camera phối cảnh nhìn thẳng từ nam): ở quarter 0, điểm dời +X (đông) có toạ độ x màn hình
// lớn hơn, điểm dời +Z (nam) có toạ độ y màn hình lớn hơn — khớp bản 2D, không còn lật gương.
{
  const engine = new NullEngine();
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  const target = new Vector3(0, 0, 0);
  const camera = new ArcRotateCamera('proj-cam', isoAlpha(0), CAMERA_BETA, zoomRadius(2), target, scene);
  camera.fov = CAMERA_FOV;
  scene.render();
  const viewport = new Viewport(0, 0, 800, 600);
  const o = new Vector3(), px = new Vector3(), pz = new Vector3();
  Vector3.ProjectToRef(new Vector3(0, 0.9, 0), Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport, o);
  Vector3.ProjectToRef(new Vector3(1, 0.9, 0), Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport, px);
  Vector3.ProjectToRef(new Vector3(0, 0.9, 1), Matrix.IdentityReadOnly, scene.getTransformMatrix(), viewport, pz);
  assert.ok(px.x > o.x, `Quarter 0: +X (đông) phải ở bên phải màn hình (${px.x.toFixed(2)} > ${o.x.toFixed(2)})`);
  assert.ok(pz.y > o.y, `Quarter 0: +Z (nam) phải ở dưới màn hình (${pz.y.toFixed(2)} > ${o.y.toFixed(2)})`);
  engine.dispose();
}

// 3. Kiểm tra vòng đời và pooling của Overlay3D trong môi trường DOM giả lập
{
  class FakeElement {
    public className = '';
    public style: Record<string, string> = {};
    public textContent = '';
    public innerHTML = '';
    public children: FakeElement[] = [];
    public parentElement: FakeElement | null = null;

    public appendChild(child: FakeElement) {
      this.children.push(child);
      child.parentElement = this;
      return child;
    }

    public removeChild(child: FakeElement) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      child.parentElement = null;
      return child;
    }

    public remove() {
      if (this.parentElement) {
        this.parentElement.removeChild(this);
      }
    }

    public replaceChildren() {
      for (const c of this.children) c.parentElement = null;
      this.children.length = 0;
    }
  }

  const parent = new FakeElement();
  const canvas = {
    parentElement: parent,
    clientWidth: 800,
    clientHeight: 600,
  } as unknown as HTMLCanvasElement;

  // Giả lập document tối thiểu cho Overlay3D
  const globalAny = globalThis as unknown as { document?: unknown; window?: unknown };
  const prevDoc = globalAny.document;

  globalAny.document = {
    createElement(_tag: string) { return new FakeElement(); },
    addEventListener() {},
    removeEventListener() {},
  };

  const engine = new NullEngine();
  const scene = new Scene(engine);
  const target = new Vector3(10, 0, 10);
  const camera = new ArcRotateCamera('c', isoAlpha(0), CAMERA_BETA, zoomRadius(2), target, scene);
  camera.fov = CAMERA_FOV;

  const fakeSim = {
    peekCustomers: () => [
      {
        id: 'cust-1',
        position: { x: 320, y: 320 },
        stage: 'to_shelf',
        targetFixtureId: 'shelf_1',
        regularName: 'Bé Na',
      },
    ],
    getSpecialRequestCustomerIds: () => new Set<string>(['cust-1']),
    getFixtures: () => [{ id: 'shelf_1', assignedProductId: 'mi_hao_hao' }],
    getShopkeeper: () => ({ position: { x: 300, y: 300 }, visible: true, serving: true }),
  };

  const overlay = new Overlay3D(canvas, fakeSim as never, scene);
  assert.ok(overlay.containerElement, 'Container overlay phải được tạo');
  assert.equal(overlay.containerElement.className, 'game-overlay-3d');
  assert.equal(parent.children.length, 1, 'Container overlay phải được gắn vào canvas.parentElement');

  // Thêm chữ tiền bay lên
  overlay.addFloatingGain(320, 320, '+12.000 đ', 0xf4a261);

  // Cập nhật khung hình
  scene.render();
  overlay.update(0.1, 0, CAMERA_BETA, []);

  // Kiểm tra font VT323 và màu
  const container = overlay.containerElement as unknown as FakeElement;
  const floating = container.children.find(c => c.className === 'game-overlay-floating-gain');
  assert.ok(floating, 'Phải có phần tử floating gain trong container');
  assert.equal(floating.textContent, '+12.000 đ');
  assert.equal(floating.style.color, '#f4a261');
  assert.ok(floating.style.fontFamily.includes('VT323'));
  assert.equal(floating.style.display, 'block');

  // Kiểm tra khách quen "Bé Na" và icon
  const custOverlay = container.children.find(c => c.className === 'game-overlay-customer');
  assert.ok(custOverlay, 'Phải có phần tử overlay của khách');
  assert.equal(custOverlay.style.display, 'flex');
  const regTag = custOverlay.children.find(c => c.className === 'game-overlay-regular-tag');
  assert.ok(regTag, 'Phải có thẻ tên khách quen');
  assert.equal(regTag.textContent, '♥ Bé Na');
  assert.equal(regTag.style.display, 'block');

  const reqBadge = custOverlay.children.find(c => c.className === 'game-overlay-request-badge');
  assert.ok(reqBadge, 'Phải có badge "!"');
  assert.equal(reqBadge.style.display, 'flex');

  // Cho thời gian trôi > 1s để floating gain bay hết hạn và được thu hồi vào pool
  overlay.update(1.2, 0, CAMERA_BETA, []);
  assert.equal(floating.style.display, 'none', 'Floating gain đã hết hạn phải ẩn đi');

  // Thêm floating gain mới: phải tái sử dụng từ pool (không tạo thêm phần tử thừa)
  overlay.addFloatingGain(320, 320, '+24.000 đ', 0x2a7a43);
  assert.equal(floating.textContent, '+24.000 đ', 'Phần tử floating gain phải được tái sử dụng từ pool');
  assert.equal(floating.style.color, '#2a7a43');

  // Kiểm tra bong bóng thoại cư dân khu phố
  const talkBubbles = [
    { id: 'npc_1', x: 320, y: 320, text: 'Hôm nay trời đẹp ghê!', scale: 1, bubbleAge: 0.5 },
  ];
  overlay.update(0.1, 0, CAMERA_BETA, [], undefined, talkBubbles);
  const bubbleEl = container.children.find(c => c.className === 'game-overlay-talk-bubble');
  assert.ok(bubbleEl, 'Phải có phần tử bong bóng thoại cư dân');
  assert.equal(bubbleEl.textContent, 'Hôm nay trời đẹp ghê!');
  assert.equal(bubbleEl.style.display, 'block');

  // Khung hình sau không còn bong bóng: phải ẩn đi và thu hồi về pool
  overlay.update(0.1, 0, CAMERA_BETA, [], undefined, []);
  assert.equal(bubbleEl.style.display, 'none', 'Bong bóng thoại hết hạn phải ẩn đi');

  // Hủy overlay: dọn sạch container khỏi parentElement
  overlay.destroy();
  assert.equal(parent.children.length, 0, 'Sau destroy(), container overlay phải biến mất hoàn toàn khỏi DOM');

  engine.dispose();
  globalAny.document = prevDoc;
}

console.log('PASS overlay-3d: icon nhu cầu SVG, thẻ tên khách quen, số tiền bay lên, pooling và dọn sạch khi destroy');
