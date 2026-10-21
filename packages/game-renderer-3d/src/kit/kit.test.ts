import assert from 'node:assert/strict';
import { boxOverlapsRectXY, boxesBounds } from '../box-bounds';
import { SCALE_TARGETS, DOOR_HEIGHT_D } from '../scale-spec';
import { KIT_COLORS, PALETTE_HEXES } from '../style-spec';
import { KIT_BOX_BUDGET, KIT_PIECES, baseboard, cornerPost, cornice, doorFrame, glassDoor, shopWindow } from './index';

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

// Mọi mảnh trong danh mục: ngân sách khối, kích thước dương, không chìm dưới sàn, màu thuộc bảng màu, kính duy nhất trong suốt.
const ids = Object.keys(KIT_PIECES);
assert.ok(ids.length >= 6, 'danh mục có đủ 6 mảnh đầu tiên');
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

console.log('PASS kit: khung cửa, cánh cửa kính, cửa sổ, phào, trụ đúng hộp bao, lối cửa thông, màu thuộc bảng màu, trong ngân sách');
