import { GROCERY_FIXTURE_COLORS as GROCERY, KIT_COLORS, KIT_GLASS_ALPHA, PALETTE } from '../style-spec';
import { SCALE_TARGETS } from '../scale-spec';
import { kitBox, makePiece, type KitPiece } from './piece';

/*
 * Nội thất tạp hóa dựng từ kit. Khác các mảnh gắn tường, hệ cục bộ ở đây là hệ của fixture (`fixture-shapes`):
 * TÂM chân diện (x, z) là gốc, y hướng lên từ sàn, +z là mặt trước; w × d là kích thước chân diện chưa xoay.
 * Mọi khối nằm gọn trong [-w/2, w/2] × [-d/2, d/2].
 */

/** Tủ mát có cửa kính: thân băng, đế thép, dải biển bạc hà phía trên, cửa kính trong suốt trước nền sáng, tay nắm (2 ô: thêm cửa thứ hai). */
export function fridgeCase(w: number, d: number): KitPiece {
  const h = SCALE_TARGETS.fixtures.fridge;
  const kick = 0.08;
  const band = 0.16;
  const front = d * 0.45;
  const bodyH = h - kick - band;
  const doors = w >= 2 ? 2 : 1;
  const out = [
    kitBox(GROCERY.fridgeTop, 0, kick / 2, 0, w - 0.04, kick, d * 0.88),
    kitBox(GROCERY.fridgeBody, 0, kick + bodyH / 2, 0, w, bodyH, d * 0.9),
    kitBox(KIT_COLORS.interiorWainscot, 0, h - band / 2, 0, w, band, d * 0.92),
    // Nền sáng sau kính để thấy hàng bên trong.
    kitBox(GROCERY.fridgeBody, 0, kick + bodyH / 2, front + 0.005, w - 0.14, bodyH - 0.14, 0.01),
    kitBox(KIT_COLORS.glass, 0, kick + bodyH / 2, front + 0.02, w - 0.14, bodyH - 0.14, 0.02, KIT_GLASS_ALPHA),
  ];
  for (let i = 0; i < doors; i++) {
    const cx = doors === 1 ? w / 2 - 0.12 : (i === 0 ? 1 : -1) * 0.12;
    out.push(kitBox(KIT_COLORS.handle, cx, kick + bodyH / 2, front + 0.03, 0.04, bodyH * 0.5, 0.03));
  }
  if (doors === 2) out.push(kitBox(GROCERY.fridgeTop, 0, kick + bodyH / 2, front + 0.025, 0.05, bodyH - 0.14, 0.03));
  return makePiece(`fridge-${doors}`, out);
}

/** Quầy thu ngân: tủ gỗ có dải mặt trước bạc hà, mặt quầy cát, máy tính tiền (thân + màn hình) phía thu ngân và giỏ hàng phía khách. */
export function cashierCounter(w: number, d: number): KitPiece {
  const h = SCALE_TARGETS.fixtures.counter;
  const topT = 0.06;
  const baseH = h - topT;
  const registerX = -w / 2 + 0.3;
  const basketX = w / 2 - 0.3;
  const out = [
    kitBox(GROCERY.counterBase, 0, baseH / 2, 0, w - 0.04, baseH, d * 0.86),
    kitBox(KIT_COLORS.interiorWainscot, 0, baseH * 0.55, d * 0.43 + 0.01, w - 0.16, baseH * 0.5, 0.02),
    kitBox(GROCERY.counterTop, 0, baseH + topT / 2, 0, w, topT, d * 0.96),
    // Máy tính tiền ở phía thu ngân (sau), màn hình nghiêng về phía khách.
    kitBox(GROCERY.register, registerX, h + 0.07, -d * 0.12, 0.3, 0.14, 0.26),
    kitBox(PALETTE.mint, registerX, h + 0.22, -d * 0.12, 0.26, 0.16, 0.04),
    // Giỏ hàng ở phía khách: thân giỏ, quai và vài món bên trong.
    kitBox(KIT_COLORS.produceRed, basketX, h + 0.05, d * 0.12, 0.28, 0.1, 0.2),
    kitBox(KIT_COLORS.handle, basketX, h + 0.14, d * 0.12, 0.28, 0.03, 0.03),
    kitBox(KIT_COLORS.produceGreen, basketX - 0.06, h + 0.12, d * 0.12, 0.1, 0.06, 0.1),
    kitBox(KIT_COLORS.produceYellow, basketX + 0.07, h + 0.12, d * 0.12, 0.09, 0.05, 0.09),
  ];
  return makePiece(`cashier-counter-${w >= 2 ? 2 : 1}`, out);
}

/** Đầu dãy kệ: tủ thấp có ba bậc bày hàng, mỗi bậc một hàng thùng màu, dải biển khuyến mãi ở trên. Thấp hơn kệ gondola. */
export function endCapShelf(w: number, d: number): KitPiece {
  const baseH = 0.28;
  const step = 0.22;
  const depth = d * 0.8;
  const out = [kitBox(GROCERY.shelfWoodDark, 0, baseH / 2, 0, w, baseH, d * 0.9)];
  const goods = [KIT_COLORS.produceRed, KIT_COLORS.produceYellow, KIT_COLORS.produceGreen];
  for (let i = 0; i < 3; i++) {
    const zBack = -d / 2 + 0.04;
    const sz = depth - i * 0.2;
    const y = baseH + i * step;
    out.push(kitBox(GROCERY.shelfWood, 0, y + 0.02, zBack + sz / 2 + 0.06, w - 0.06, 0.04, sz));
    out.push(kitBox(goods[i], 0, y + 0.04 + 0.08, zBack + sz / 2 + 0.06, w - 0.16, 0.16, sz - 0.1));
  }
  out.push(kitBox(KIT_COLORS.boardTrim, 0, baseH + 3 * step + 0.06, -d / 2 + 0.06, w, 0.12, 0.06));
  return makePiece('end-cap-shelf', out);
}
