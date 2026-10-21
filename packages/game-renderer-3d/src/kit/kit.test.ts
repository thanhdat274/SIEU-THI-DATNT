import assert from 'node:assert/strict';
import { boxOverlapsRectXY, boxesBounds } from '../box-bounds';
import { SCALE_TARGETS, DOOR_HEIGHT_D } from '../scale-spec';
import { KIT_COLORS, PALETTE_HEXES } from '../style-spec';
import { KIT_BOX_BUDGET, KIT_PIECES, acUnit, baseboard, cornerPost, cornice, doorFrame, glassDoor, parapet, plantPot, produceCrate, sandwichBoard, shopWindow, waterTank } from './index';

const K = SCALE_TARGETS.kit;
const EPS = 1e-9;
const near = (a: number, b: number, msg: string): void => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} khác ${b}`);

// Khung cửa: hộp bao đúng công thức, lối đi thông thoáng.
{
  const p = doorFrame();
  near(p.bounds.minX, -(K.doorWidth / 2 + K.frameThickness), 'khung cửa minX');
  near(p.bounds.maxX, K.doorWidth / 2 + K.frameThickness, 'khung cửa maxX');
  near(p.bounds.minY, 0, 'khung cửa đáy ở y = 0');
  near(p.bounds.maxY, K.doorHeight + K.frameThickness, 'khung cửa cao');
  near(p.bounds.maxZ - p.bounds.minZ, K.frameDepth, 'khung cửa sâu');
  assert.ok(p.opening, 'khung cửa khai báo lối đi');
  for (const box of p.boxes) assert.equal(boxOverlapsRectXY(box, p.opening!), false, 'không khối nào chắn lối cửa');
  // Tham số: cửa rộng hơn thì hộp bao rộng theo.
  near(boxesBounds(doorFrame({ width: 1.2 }).boxes).maxX, 0.6 + K.frameThickness, 'khung cửa rộng 1,2');
  // Lối cửa khớp lanh tô 0,45 của mặt tiền hiện tại (tường cao D).
  near(K.doorHeight, DOOR_HEIGHT_D - 0.45, 'cao lối cửa = D - lanh tô');
}

// Cánh cửa kính: vừa lối cửa, có kính trong suốt và tay nắm ở mặt trước.
{
  const leaf = glassDoor();
  const frame = doorFrame();
  near(leaf.bounds.minX, -K.doorWidth / 2, 'cánh cửa minX');
  near(leaf.bounds.maxX, K.doorWidth / 2, 'cánh cửa maxX');
  near(leaf.bounds.maxY, K.doorHeight, 'cánh cửa cao bằng lối cửa');
  assert.ok(leaf.bounds.minX >= frame.opening!.minX - EPS && leaf.bounds.maxX <= frame.opening!.maxX + EPS && leaf.bounds.maxY <= frame.opening!.maxY + EPS, 'cánh cửa lọt vừa khung cửa cùng kích thước');
  const glass = leaf.boxes.filter((b) => b.color === KIT_COLORS.glass);
  assert.equal(glass.length, 1, 'một tấm kính');
  assert.ok(glass[0].alpha !== undefined && glass[0].alpha > 0 && glass[0].alpha < 1, 'kính trong suốt');
  const handle = leaf.boxes.find((b) => b.color === KIT_COLORS.handle)!;
  assert.ok(handle.cz > 0 && handle.cx > 0, 'tay nắm ở mặt trước, phía +x');
  assert.ok(leaf.bounds.maxZ > 0.03 && leaf.bounds.maxZ <= 0.1, 'tay nắm nhô ra khỏi mặt cánh nhưng không quá 0,1');
}

// Cửa sổ: kính nằm trong khung, bậu nhô ra trước và rộng hơn khung, đặt trên tường vẫn dưới mái.
{
  const w = shopWindow();
  near(w.bounds.minY, 0, 'đáy bậu ở y = 0');
  near(w.bounds.maxX, K.windowWidth / 2 + 0.05, 'bậu nhô ngang 0,05 mỗi bên');
  assert.ok(w.bounds.maxZ > 0.1, 'bậu nhô ra mặt trước');
  const glass = w.boxes.find((b) => b.color === KIT_COLORS.glass)!;
  assert.ok(glass.cx - glass.sx / 2 >= -K.windowWidth / 2 + 0.05 - EPS && glass.cx + glass.sx / 2 <= K.windowWidth / 2 - 0.05 + EPS, 'kính nằm trong khung (ngang)');
  assert.ok(glass.alpha !== undefined && glass.alpha < 1, 'kính trong suốt');
  assert.ok(K.windowSillHeight + w.bounds.maxY <= DOOR_HEIGHT_D - 0.1, 'cửa sổ đặt ở độ cao chuẩn vẫn cách mép trên tường ≥ 0,1');
  assert.equal(shopWindow({ panes: 1 }).boxes.length + 1, w.boxes.length, 'hai ô kính có thêm đúng một thanh giữa');
  const mullion = w.boxes[w.boxes.length - 1];
  near(mullion.cx, 0, 'thanh giữa ở chính giữa');
}

// Phào và trụ: mặt phẳng tường ở z = 0, trụ căn giữa và đúng cao.
{
  const b = baseboard(2);
  near(b.bounds.minX, -1, 'phào chân dài 2'); near(b.bounds.maxX, 1, 'phào chân dài 2');
  near(b.bounds.minZ, 0, 'phào chân sát tường'); assert.ok(b.bounds.maxZ > 0 && b.bounds.maxZ <= 0.05, 'phào chân nhô ≤ 0,05');
  near(b.bounds.maxY, K.baseboardHeight + 0.02, 'phào chân cao');
  const c = cornice(1);
  near(c.bounds.minZ, 0, 'phào trần sát tường'); near(c.bounds.maxY, K.corniceHeight, 'phào trần cao'); near(c.bounds.maxZ, 0.08, 'phào trần nhô 0,08');
  const post = cornerPost();
  near(post.bounds.maxY, DOOR_HEIGHT_D, 'trụ cao bằng tường mặc định');
  near(post.bounds.minX, -(K.postSize / 2 + 0.02), 'trụ căn giữa x'); near(post.bounds.maxX, K.postSize / 2 + 0.02, 'trụ căn giữa x');
  near(post.bounds.minZ, post.bounds.minX, 'trụ vuông'); near(post.bounds.maxZ, post.bounds.maxX, 'trụ vuông');
  near(cornerPost({ height: 2.4 }).bounds.maxY, 2.4, 'trụ theo chiều cao truyền vào');
}

// Cửa sổ có ô kính tối nằm SAU kính (thấy như khoảng tối trong nhà) và trong khung.
{
  const w = shopWindow();
  const glass = w.boxes.find((b) => b.color === KIT_COLORS.glass)!;
  const pane = w.boxes.find((b) => b.color === KIT_COLORS.pane)!;
  assert.ok(pane.alpha === undefined, 'ô kính tối đục');
  assert.ok(pane.cz + pane.sz / 2 <= glass.cz - glass.sz / 2 + EPS, 'ô tối nằm sau kính');
  assert.ok(Math.abs(pane.cx) < EPS && pane.sx <= glass.sx + EPS, 'ô tối nằm trong khung');
}

// Cửa đôi: tay nắm hai cánh hướng vào giữa.
{
  const handleX = (side: 1 | -1) => glassDoor({ handleSide: side }).boxes.find((b) => b.color === KIT_COLORS.handle)!.cx;
  assert.ok(handleX(1) > 0 && handleX(-1) < 0 && Math.abs(handleX(1) + handleX(-1)) < EPS, 'tay nắm đối xứng qua tâm cánh');
}

// Chi tiết mái: lan can bỏ được mép trước (nhường chỗ biển), điều hòa và bồn nước đặt được lên mặt mái (đáy y = 0).
{
  const full = parapet(4, 3);
  const open = parapet(4, 3, { front: false });
  near(full.bounds.maxX, 2, 'lan can rộng 4'); near(full.bounds.maxZ, 1.5, 'lan can sâu 3 có mép trước');
  near(open.bounds.maxZ, 1.5 - 0.06, 'bỏ mép trước thì mép dưới lùi bằng bề dày gờ');
  assert.equal(open.boxes.length + 1, full.boxes.length);
  for (const p of [acUnit(), waterTank()]) {
    near(p.bounds.minY, 0, `${p.id} đặt lên mặt mái`);
    assert.ok(p.bounds.maxY < 1, `${p.id} thấp hơn D·0,6 để không che biển`);
  }
  near(acUnit().bounds.maxX - acUnit().bounds.minX, 0.5, 'điều hòa rộng 0,5');
}

// Đồ trưng trước tiệm: nhỏ hơn một ô, đáy ở y = 0, thấp hơn người (0,8·D = 1,28).
for (const p of [produceCrate(), sandwichBoard(), plantPot()]) {
  near(p.bounds.minY, 0, `${p.id} đặt lên vỉa hè`);
  assert.ok(p.bounds.maxX - p.bounds.minX <= 0.5 && p.bounds.maxZ - p.bounds.minZ <= 0.5, `${p.id} nhỏ hơn nửa ô`);
  assert.ok(p.bounds.maxY <= 0.8, `${p.id} thấp hơn nửa chiều cao người`);
}

// Mọi mảnh trong danh mục: ngân sách khối, kích thước dương, không chìm dưới sàn, màu thuộc bảng màu, kính duy nhất trong suốt.
const ids = Object.keys(KIT_PIECES);
assert.ok(ids.length >= 12, 'danh mục có đủ 12 mảnh (6 đầu tiên + mái + đồ trưng)');
for (const key of ids) {
  const piece = KIT_PIECES[key]();
  assert.equal(piece.id, key, `${key}: id khớp khóa danh mục`);
  assert.ok(piece.boxes.length > 0 && piece.boxes.length <= KIT_BOX_BUDGET, `${key}: ${piece.boxes.length} khối vượt ngân sách ${KIT_BOX_BUDGET}`);
  assert.ok(piece.bounds.minY >= -EPS, `${key}: không được chìm dưới sàn`);
  for (const box of piece.boxes) {
    assert.ok(box.sx > 0 && box.sy > 0 && box.sz > 0, `${key}: khối có kích thước không dương`);
    assert.ok(PALETTE_HEXES.has(box.color), `${key}: màu ${box.color} không thuộc bảng màu`);
    const isGlass = box.color === KIT_COLORS.glass;
    assert.equal(box.alpha !== undefined, isGlass, `${key}: chỉ kính được trong suốt`);
  }
}

console.log('PASS kit: 12 mảnh (khung cửa, cánh cửa kính, cửa sổ, phào, trụ, chi tiết mái, đồ trưng) đúng hộp bao, lối cửa thông, màu thuộc bảng màu, trong ngân sách');
