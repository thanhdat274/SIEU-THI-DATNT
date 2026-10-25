import type { Product } from './products';

/** Hình chữ nhật trong ô 16x16: [x, y, rộng, cao, màu]. */
export type Px = [number, number, number, number, string];
type Shape = (c: string, d: string) => Px[];

const INK = '#3a3a50';
const PAPER = '#fff2d6';
const WHITE = '#ffffff';

/** Tô tối màu đi một chút để làm bóng. */
const shade = (hex: number, k: number) => {
  const r = Math.round(((hex >> 16) & 255) * k), g = Math.round(((hex >> 8) & 255) * k), b = Math.round((hex & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Mỗi hình vẽ viền mực rồi tô màu hàng (c) và màu bóng (d), kiểu pixel-art 16px.
const SHAPES: Record<string, Shape> = {
  can: (c, d) => [[4, 1, 8, 14, INK], [5, 2, 6, 12, c], [5, 2, 6, 1, '#c8cdd6'], [5, 13, 6, 1, '#c8cdd6'], [5, 6, 6, 3, PAPER], [9, 3, 1, 10, d]],
  bottle: (c, d) => [[6, 0, 4, 3, INK], [7, 1, 2, 1, '#e9b95d'], [5, 3, 6, 2, INK], [4, 5, 8, 11, INK], [5, 6, 6, 9, c], [5, 9, 6, 3, PAPER], [6, 10, 4, 1, d], [5, 6, 1, 3, WHITE]],
  carton: (c, d) => [[3, 3, 10, 13, INK], [4, 4, 8, 11, PAPER], [4, 1, 8, 3, INK], [5, 2, 6, 2, '#c7b8a0'], [4, 8, 8, 5, c], [10, 4, 2, 11, '#00000022'], [6, 9, 4, 2, d]],
  cup: (c, d) => [[3, 3, 10, 2, INK], [4, 5, 8, 11, INK], [5, 5, 6, 10, c], [5, 6, 6, 2, WHITE], [9, 0, 1, 5, '#e74c3c'], [7, 10, 2, 3, d]],
  noodle: (c, d) => [[1, 3, 14, 10, INK], [2, 4, 12, 8, c], [4, 6, 8, 4, PAPER], [5, 7, 2, 1, '#e9b95d'], [8, 8, 3, 1, '#e9b95d'], [2, 11, 12, 1, d]],
  sack: (c, d) => [[4, 1, 8, 2, INK], [5, 2, 6, 2, d], [3, 4, 10, 12, INK], [4, 5, 8, 10, c], [5, 8, 6, 4, PAPER], [6, 9, 4, 1, d]],
  snack: (c, d) => [[3, 1, 10, 2, INK], [2, 3, 12, 11, INK], [3, 4, 10, 9, c], [3, 13, 10, 2, INK], [5, 6, 6, 4, '#ffd166'], [6, 7, 2, 2, '#e9b95d'], [3, 4, 10, 1, d]],
  egg: () => [[1, 9, 14, 6, INK], [2, 10, 12, 4, '#c69464'], [2, 5, 4, 6, INK], [3, 5, 2, 5, PAPER], [6, 4, 4, 7, INK], [7, 4, 2, 6, PAPER], [10, 5, 4, 6, INK], [11, 5, 2, 5, PAPER]],
  fruit: (c, d) => [[7, 0, 2, 3, '#6d4c41'], [9, 1, 3, 2, '#418e3a'], [3, 3, 10, 12, INK], [2, 5, 12, 8, INK], [4, 4, 8, 10, c], [3, 6, 10, 6, c], [5, 5, 2, 2, WHITE], [10, 8, 2, 4, d]],
  grape: (c, d) => [[7, 0, 2, 2, '#6d4c41'], [9, 1, 3, 2, '#418e3a'], ...[[3, 3], [7, 3], [11, 3], [5, 7], [9, 7], [7, 11]].flatMap(([x, y]): Px[] => [[x - 1, y, 4, 4, INK], [x, y + 1, 2, 2, c], [x, y + 1, 1, 1, d]])],
  banana: (c, d) => [[11, 1, 2, 3, '#6d4c41'], [2, 9, 4, 4, INK], [4, 11, 8, 4, INK], [10, 4, 4, 9, INK], [3, 10, 2, 2, c], [5, 12, 6, 2, c], [11, 5, 2, 7, c], [10, 11, 2, 2, d]],
  leafy: (c, d) => [[2, 1, 12, 10, INK], [3, 2, 10, 8, c], [7, 2, 2, 8, d], [4, 4, 2, 1, d], [10, 4, 2, 1, d], [5, 10, 6, 6, INK], [6, 10, 4, 5, '#e8e1d9']],
  root: (c, d) => [[6, 0, 2, 3, '#418e3a'], [8, 0, 2, 3, '#5fa84a'], [4, 3, 8, 4, INK], [5, 7, 6, 4, INK], [6, 11, 4, 3, INK], [7, 14, 2, 2, INK], [5, 4, 6, 3, c], [6, 7, 4, 4, c], [7, 11, 2, 3, c], [9, 5, 1, 6, d]],
  bread: (c, d) => [[1, 6, 14, 8, INK], [2, 4, 12, 3, INK], [2, 5, 12, 8, c], [3, 4, 10, 2, c], [4, 6, 1, 4, PAPER], [7, 6, 1, 4, PAPER], [10, 6, 1, 4, PAPER], [2, 12, 12, 1, d]],
  cake: (c, d) => [[1, 4, 14, 11, INK], [2, 5, 12, 9, c], [2, 5, 12, 3, PAPER], [4, 6, 3, 1, d], [9, 6, 3, 1, d], [5, 10, 6, 2, d]],
  candy: (c, d) => [[1, 5, 3, 6, INK], [12, 5, 3, 6, INK], [4, 3, 8, 10, INK], [5, 4, 6, 8, c], [2, 6, 2, 4, d], [12, 6, 2, 4, d], [6, 6, 4, 4, PAPER], [7, 7, 2, 2, d]],
  lolly: (c) => [[7, 9, 2, 7, '#e8e1d9'], [4, 1, 8, 8, INK], [5, 2, 6, 6, c], [6, 3, 4, 4, PAPER], [7, 4, 2, 2, c]],
  meat: (c, d) => [[2, 3, 12, 10, INK], [3, 4, 10, 8, c], [5, 6, 3, 2, PAPER], [9, 8, 2, 2, PAPER], [3, 11, 10, 1, d], [12, 12, 3, 3, INK], [13, 13, 1, 1, PAPER]],
  sausage: (c, d) => [[1, 5, 14, 6, INK], [2, 6, 12, 4, c], [3, 6, 9, 1, WHITE], [2, 9, 12, 1, d], [0, 7, 1, 2, INK], [15, 7, 1, 2, INK]],
  fish: (c, d) => [[1, 5, 11, 7, INK], [12, 4, 3, 9, INK], [2, 6, 9, 5, c], [13, 5, 1, 7, d], [3, 7, 1, 1, INK], [5, 9, 5, 1, d]],
  icecream: (c, d) => [[5, 0, 6, 10, INK], [6, 1, 4, 8, c], [6, 1, 4, 2, WHITE], [8, 3, 1, 5, d], [7, 10, 2, 6, INK], [7, 10, 2, 5, '#c69464']],
  cone: (c) => [[4, 1, 8, 6, INK], [5, 2, 6, 4, c], [6, 2, 2, 1, WHITE], [4, 7, 8, 2, INK], [5, 9, 6, 2, INK], [6, 11, 4, 3, INK], [7, 14, 2, 2, INK], [5, 7, 6, 2, '#e0a24a'], [6, 9, 4, 2, '#e0a24a'], [7, 11, 2, 3, '#e0a24a']],
  tub: (c, d) => [[2, 3, 12, 3, INK], [3, 6, 10, 9, INK], [3, 4, 10, 1, d], [4, 6, 8, 8, c], [5, 8, 6, 3, PAPER]],
  tube: (c, d) => [[1, 6, 3, 4, INK], [2, 7, 1, 2, WHITE], [4, 5, 11, 6, INK], [5, 6, 9, 4, c], [7, 7, 5, 2, PAPER], [13, 4, 2, 8, INK], [5, 9, 9, 1, d]],
  roll: (c) => [[2, 2, 12, 13, INK], [3, 3, 10, 11, c === '#fdfefe' ? '#eef2f5' : c], [3, 3, 10, 2, WHITE], [6, 6, 4, 4, INK], [7, 7, 2, 2, '#c7b8a0']],
  box: (c, d) => [[2, 3, 12, 12, INK], [3, 4, 10, 10, c], [3, 4, 10, 2, d], [4, 7, 8, 5, PAPER], [5, 8, 6, 1, d], [6, 10, 4, 1, c]],
  battery: (c) => [[6, 0, 4, 2, INK], [4, 2, 8, 14, INK], [5, 3, 6, 6, c], [5, 9, 6, 6, '#3a3a50'], [7, 4, 2, 3, WHITE]],
  bulb: (c) => [[4, 1, 8, 9, INK], [5, 2, 6, 7, '#ffe680'], [6, 3, 2, 2, WHITE], [5, 10, 6, 5, INK], [6, 10, 4, 3, '#c8cdd6'], [6, 13, 4, 1, c]],
  lighter: (c, d) => [[5, 0, 6, 4, INK], [6, 1, 4, 2, '#c8cdd6'], [4, 4, 8, 12, INK], [5, 5, 6, 10, c], [5, 5, 2, 10, d], [7, 0, 2, 1, '#f39c12']],
  card: (c, d) => [[1, 3, 14, 10, INK], [2, 4, 12, 8, c], [3, 5, 4, 3, '#e9b95d'], [3, 10, 10, 1, d], [9, 5, 4, 1, PAPER]],
  book: (c, d) => [[3, 1, 11, 14, INK], [4, 2, 9, 12, c], [4, 2, 2, 12, d], [7, 4, 5, 3, PAPER], [12, 13, 2, 3, INK]],
  pot: (c, d) => [[3, 3, 10, 2, INK], [7, 1, 2, 2, INK], [2, 5, 12, 9, INK], [3, 6, 10, 7, c], [3, 6, 10, 1, '#c8cdd6'], [0, 6, 2, 2, INK], [14, 6, 2, 2, INK], [3, 12, 10, 1, d]],
  appliance: (c, d) => [[2, 1, 12, 14, INK], [3, 2, 10, 12, c], [4, 3, 8, 5, '#87beb9'], [5, 10, 2, 2, d], [9, 10, 2, 2, '#e74c3c']],
  umbrella: (c, d) => [[2, 4, 12, 4, INK], [3, 3, 10, 2, INK], [4, 2, 8, 2, INK], [3, 4, 10, 3, c], [4, 3, 8, 2, c], [7, 4, 2, 3, d], [7, 8, 2, 6, INK], [5, 13, 3, 2, INK]],
  jar: (c, d) => [[4, 1, 8, 3, INK], [5, 2, 6, 1, '#e9b95d'], [3, 4, 10, 12, INK], [4, 5, 8, 10, c], [5, 8, 6, 4, PAPER], [4, 5, 1, 3, WHITE], [11, 5, 1, 10, d]],
};

/** Từ khoá (theo tên, viết thường) → hình. Duyệt theo thứ tự, khớp trước thắng. */
const RULES: [RegExp, string][] = [
  [/kẹo mút/, 'lolly'],
  [/kem que|^kem$/, 'icecream'],
  [/ốc quế/, 'cone'],
  [/kem hộp|sữa chua(?! uống)|phô mai|đậu hũ/, 'tub'],
  [/kem đánh răng|kem chống nắng|tuýp/, 'tube'],
  [/^ly |\(ly\)|mì ly|trà sữa|sinh tố$|cà phê sữa đá|trà tắc$|nước mía|trà đá/, 'cup'],
  [/ lon|^bia|coca|pepsi|sprite|7up|mirinda|fanta|sting|red bull|schweppes|milkis|tăng lực/, 'can'],
  [/sữa|yakult|yomost|probi|betagen|nước dừa hộp|hộp$/, 'carton'],
  [/chai|nước|dầu|mắm|giấm|tương|aquafina|la vie|revive|pocari|tea\+|fuze|twister|soda|dầu gội|sữa tắm/, 'bottle'],
  [/mì|phở|hủ tiếu|cháo|miến|bún khô|nui/, 'noodle'],
  [/trứng|hột vịt/, 'egg'],
  [/nho/, 'grape'],
  [/chuối/, 'banana'],
  [/rau|hành lá|cải|giá đỗ|mùi|lá chuối/, 'leafy'],
  [/cà rốt|khoai|gừng|tỏi|hành khô|bí|củ|khổ qua|dưa leo|bắp ngọt/, 'root'],
  [/táo|cam$|bưởi|xoài|ổi|^bơ$|^na$|măng cụt|chôm|vải$|mít$|đu đủ|thơm|thanh long|chanh dây|cà chua|trái cây|dưa hấu|dừa nạo/, 'fruit'],
  [/bánh mì|bánh bao|há cảo/, 'bread'],
  [/thịt|cánh gà|chả|bò viên/, 'meat'],
  [/xúc xích|lạp xưởng/, 'sausage'],
  [/cá|tôm|mực/, 'fish'],
  [/kẹo/, 'candy'],
  [/snack|bim bim|que cay|bắp rang|cơm cháy|rong biển|khô|sấy|hạt|đậu phộng|mứt/, 'snack'],
  [/bánh/, 'cake'],
  [/gạo|đường|muối|bột|nêm|ngọt|nếp|đậu|tiêu|ớt|gia vị|cà phê|trà/, 'sack'],
  [/giấy vệ sinh|khăn giấy|tã|băng vệ sinh/, 'roll'],
  [/pin/, 'battery'],
  [/bóng đèn/, 'bulb'],
  [/bật lửa|diêm|gas/, 'lighter'],
  [/thẻ|sim|lì xì/, 'card'],
  [/vở|học tập|bút/, 'book'],
  [/nồi|chảo/, 'pot'],
  [/điện/, 'appliance'],
  [/ô dù|áo mưa|^ô /, 'umbrella'],
  [/xà phòng|nước rửa|bột giặt|mỹ phẩm|xả vải/, 'jar'],
];

const shapeCache = new Map<string, string>();
function shapeOf(p: Product) {
  let s = shapeCache.get(p.id);
  if (!s) {
    const name = p.name.toLowerCase();
    s = RULES.find(([re]) => re.test(name))?.[1] ?? (p.category === 'drink' ? 'bottle' : p.category === 'fresh' ? 'fruit' : 'box');
    shapeCache.set(p.id, s);
  }
  return s;
}

/** Các ô pixel 16x16 của ảnh sản phẩm, dùng chung cho icon giao diện và nhãn hàng trên kệ 3D. */
export function productPixels(product: Product): Px[] {
  const c = `#${product.color.toString(16).padStart(6, '0')}`;
  return SHAPES[shapeOf(product)](c, shade(product.color, 0.7));
}
