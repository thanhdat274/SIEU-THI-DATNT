import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { BUILDING_VISUALS } from '@game/data';
import { MATERIAL_COLOR_MODELS, MODEL_CATALOG, ModelLibrary, cloneTemplateMesh, type ModelKind } from './model-library';

test('model-library: C1 - Mọi modelId trong BUILDING_VISUALS phải có trong MODEL_CATALOG', () => {
  const visualEntries = Object.entries(BUILDING_VISUALS);
  let countWithModel = 0;
  for (const [typeId, visual] of visualEntries) {
    if (visual.modelId) {
      countWithModel++;
      assert.ok(
        visual.modelId in MODEL_CATALOG,
        `Tòa ${typeId} có modelId "${visual.modelId}" không tồn tại trong MODEL_CATALOG`
      );
    }
  }
  assert.ok(countWithModel >= 3, 'Ít nhất 3 tòa civic có modelId được ánh xạ vào MODEL_CATALOG');
});

test('model-library: Bảng ánh xạ loại vật -> đường dẫn model + tỉ lệ', () => {
  assert.ok(MODEL_CATALOG.tree, 'Đã cấu hình model cây');
  assert.equal(MODEL_CATALOG.tree.url, '/assets/models/nature-kit/tree_default.glb');
  assert.ok(MODEL_CATALOG.tree.scale > 0, 'Tỉ lệ cây hợp lệ');

  assert.ok(MODEL_CATALOG.street_lamp, 'Đã cấu hình model đèn đường');
  assert.equal(MODEL_CATALOG.street_lamp.url, '/assets/models/city-kit-roads/light-curved.glb');
  assert.ok(MODEL_CATALOG.street_lamp.scale > 0, 'Tỉ lệ đèn đường hợp lệ');

  assert.ok(MODEL_CATALOG.construction_barrier, 'Đã cấu hình rào chắn');
  assert.equal(MODEL_CATALOG.construction_barrier.url, '/assets/models/city-kit-roads/construction-barrier.glb');

  assert.ok(MODEL_CATALOG.traffic_cone, 'Đã cấu hình cọc tiêu');
  assert.equal(MODEL_CATALOG.traffic_cone.url, '/assets/models/city-kit-roads/construction-cone.glb');

  assert.ok(MODEL_CATALOG.dumpster, 'Đã cấu hình thùng rác');
  assert.equal(MODEL_CATALOG.dumpster.url, '/assets/models/city-kit-roads/dumpster.glb');

  assert.ok(MODEL_CATALOG.bush, 'Đã cấu hình bụi cây');
  assert.equal(MODEL_CATALOG.bush.url, '/assets/models/nature-kit/plant_bush.glb');

  assert.ok(MODEL_CATALOG.building_civic_clinic, 'Đã cấu hình trạm y tế');
  assert.equal(MODEL_CATALOG.building_civic_clinic.url, '/assets/models/city-kit/building-c.glb');

  assert.ok(MODEL_CATALOG.building_civic_police, 'Đã cấu hình công an phường');
  assert.equal(MODEL_CATALOG.building_civic_police.url, '/assets/models/city-kit/building-d.glb');

  assert.ok(MODEL_CATALOG.building_civic_school, 'Đã cấu hình trường học');
  assert.equal(MODEL_CATALOG.building_civic_school.url, '/assets/models/city-kit/building-e.glb');

  assert.ok(MODEL_CATALOG.building_low_detail_wide_a, 'Đã cấu hình low-detail building wide a');
  assert.equal(MODEL_CATALOG.building_low_detail_wide_a.url, '/assets/models/city-kit/low-detail-building-wide-a.glb');

  // Furniture Kit models
  assert.ok(MODEL_CATALOG.furniture_fridge, 'Đã cấu hình kitchenFridge');
  assert.ok(MODEL_CATALOG.furniture_fridge_large, 'Đã cấu hình kitchenFridgeLarge');
  assert.ok(MODEL_CATALOG.furniture_fridge_small, 'Đã cấu hình kitchenFridgeSmall');
  assert.ok(MODEL_CATALOG.furniture_kitchen_bar, 'Đã cấu hình kitchenBar');
  assert.ok(MODEL_CATALOG.furniture_computer_screen, 'Đã cấu hình computerScreen');
});

test('model-library: Cho phép nhóm material-color (giữ màu gốc, specular = 0, unlit = false)', () => {
  assert.ok(MATERIAL_COLOR_MODELS.has('furniture_fridge'), 'kitchenFridge thuộc material-color');
  assert.ok(MATERIAL_COLOR_MODELS.has('furniture_fridge_large'), 'kitchenFridgeLarge thuộc material-color');
  assert.ok(MATERIAL_COLOR_MODELS.has('furniture_fridge_small'), 'kitchenFridgeSmall thuộc material-color');
  assert.ok(MATERIAL_COLOR_MODELS.has('furniture_kitchen_bar'), 'kitchenBar thuộc material-color');
  assert.ok(MATERIAL_COLOR_MODELS.has('furniture_computer_screen'), 'computerScreen thuộc material-color');
});

test('model-library: Tải lỗi thì tự động rơi về fallback (không throw, game không treo)', async () => {
  ModelLibrary.resetInstance();
  const lib = ModelLibrary.getInstance();
  const engine = new NullEngine();
  const scene = new Scene(engine);

  // Thử tải model không tồn tại hoặc lỗi mạng
  const invalidKind = 'invalid_kind' as unknown as ModelKind;
  const result = await lib.loadModel(scene, invalidKind);

  assert.equal(result, null, 'Khi tải model lỗi phải trả về null');
  assert.equal(lib.isFailed(scene, invalidKind), true, 'Model lỗi được đánh dấu failed');

  // Lần tải tiếp theo không gọi lại mạng mà trả ngay về null
  const cachedResult = await lib.loadModel(scene, invalidKind);
  assert.equal(cachedResult, null, 'Cache trạng thái lỗi');

  engine.dispose();
});

test('model-library: Cache qua nhiều scene - scene cũ dispose không được trả mesh cho scene mới', () => {
  ModelLibrary.resetInstance();
  const lib = ModelLibrary.getInstance();
  const engine = new NullEngine();

  const sceneA = new Scene(engine);
  const dummyMesh = { name: 'dummy_tree', isDisposed: false } as any;
  const container = { kind: 'tree' as ModelKind, root: dummyMesh, renderMeshes: [dummyMesh] };

  // Lưu container vào sceneA
  (lib as any).sceneTemplates.set(sceneA, new Map([['tree', container]]));

  assert.equal(lib.getLoadedModel(sceneA, 'tree'), container, 'sceneA lấy được template đã nạp');

  // Dispose sceneA
  sceneA.dispose();

  // Tạo sceneB
  const sceneB = new Scene(engine);

  // Kiểm tra getLoadedModel với sceneA đã dispose -> phải trả về null
  assert.equal(lib.getLoadedModel(sceneA, 'tree'), null, 'Scene đã dispose không được trả mesh cũ');

  // Kiểm tra getLoadedModel với sceneB mới -> phải trả về null (không lấy nhầm của sceneA)
  assert.equal(lib.getLoadedModel(sceneB, 'tree'), null, 'Scene mới chưa nạp không được trả mesh của scene cũ');

  sceneB.dispose();
  engine.dispose();
});

test('model-library: cloneTemplateMesh - không nhân bản mesh con, giữ nút trung gian, bỏ nút gốc __root__', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);

  // Dựng cây nút giống file glTF đã nạp: __root__ (lật z + xoay 180°) > nút cha dịch (0,-0.05,0) > thân > mesh con dịch (0.5,0,0).
  const root = new TransformNode('__root__', scene);
  root.scaling = new Vector3(1, 1, -1);
  root.rotationQuaternion = new Quaternion(0, 1, 0, 0);
  const node = new TransformNode('node', scene);
  node.parent = root;
  node.position = new Vector3(0, -0.05, 0);
  const body = CreateBox('body', { size: 1 }, scene);
  body.parent = node;
  const lid = CreateBox('lid', { size: 0.2 }, scene);
  lid.parent = body;
  lid.position = new Vector3(0.5, 0, 0);
  const loaded = { kind: 'dumpster' as ModelKind, root: root as any, renderMeshes: [body, lid] };

  const before = scene.meshes.length;
  const bodyCopy = cloneTemplateMesh(loaded, body, 'body_copy');
  assert.equal(scene.meshes.length, before + 1, 'Nhân bản thân không được kéo theo bản sao của mesh con (bản thừa đứng ở gốc tọa độ)');
  const lidCopy = cloneTemplateMesh(loaded, lid, 'lid_copy');
  assert.equal(scene.meshes.length, before + 2);

  for (const copy of [bodyCopy, lidCopy]) {
    assert.equal(copy.parent, null, 'Bản sao không có cha');
    assert.equal(copy.isEnabled(), true, 'Bản sao bật sẵn dù template bị ẩn');
  }

  // Đóng băng lại không tham số như cuối buildCityMap: không được làm mất phép biến đổi đã gán.
  bodyCopy.freezeWorldMatrix();
  lidCopy.freezeWorldMatrix();

  // Vị trí = chuỗi biến đổi bỏ nút gốc: thân ở (0,-0.05,0); mesh con ở (0.5,-0.05,0). Nút gốc (lật z, xoay 180°) không được ảnh hưởng.
  const at = (m: typeof bodyCopy) => m.computeWorldMatrix(true).getTranslation();
  const close = (a: Vector3, b: Vector3) => Vector3.Distance(a, b) < 1e-5;
  assert.ok(close(at(bodyCopy), new Vector3(0, -0.05, 0)), `Thân phải giữ dịch chuyển của nút cha, nhận ${at(bodyCopy).toString()}`);
  assert.ok(close(at(lidCopy), new Vector3(0.5, -0.05, 0)), `Mesh con phải giữ dịch chuyển của cha và của chính nó, nhận ${at(lidCopy).toString()}`);

  scene.dispose();
  engine.dispose();
});
