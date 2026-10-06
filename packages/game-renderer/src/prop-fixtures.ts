/**
 * Bản vẽ 2.5D chuẩn cho trạm bếp, bàn, máy phát điện, kệ kho và đồ trang trí (cùng bảng màu và kỹ thuật với kệ/quầy trong
 * `premium-textures.ts`: viền gỗ tối, mặt trên sáng, bóng đổ dưới sàn). Khóa texture: `fixture_prop_<shopId>`.
 * Cao 48px như kệ; sprite đặt lệch -16 nên mép dưới trùng mép dưới ô.
 */
type Draw = (r: (x: number, y: number, w: number, h: number, c: string) => void, w: number) => void;

const OUT = '#2B1B12', WOOD = '#A2693E', WOOD_DK = '#7A4822', WOOD_LT = '#D6A870', WOOD_HI = '#F3D09E', BRASS = '#EAD0A0';
const STEEL = '#B7C0C4', STEEL_DK = '#4B4F52', STEEL_HI = '#E3E9EC', GLASS = 'rgba(190, 226, 238, 0.4)', GLASS_HI = 'rgba(255, 255, 255, 0.4)';

/** Món trong danh mục dùng bản vẽ này, kèm bề rộng (ô). */
const PROP_WIDTH: Record<string, number> = {
  food_grill: 2, hot_kettle: 1, food_table_2: 1, food_table_4: 2, drink_counter: 2, blender: 1, sugarcane_press: 2,
  drink_table_2: 1, generator: 2, thung_ngam: 1, xung_hap: 1, quay_xoi: 1, chao_xao: 1, chao_chien: 1, storage_rack: 1,
  ghe_nghi_khach: 1, cay_kieng_lon: 1, be_ca_koi: 1, chau_cay: 1,
};
export const PROP_FIXTURE_IDS: readonly string[] = Object.keys(PROP_WIDTH);
export const isPropFixture = (shopId?: string): boolean => !!shopId && shopId in PROP_WIDTH;

/** Mặt bàn tròn 2.5D: mặt trên, mép dày và chân. */
const table = (top: string, topHi: string, edge: string): Draw => (r, w) => {
  const x0 = 3, tw = w - 6;
  r(x0, 20, tw, 11, OUT);
  r(x0 + 1, 21, tw - 2, 7, top);
  r(x0 + 1, 21, tw - 2, 2, topHi);
  r(x0 + 1, 28, tw - 2, 2, edge);
  r(x0 + 3, 31, 3, 12, WOOD_DK); r(x0 + 3, 31, 1, 12, WOOD);
  r(w - x0 - 6, 31, 3, 12, WOOD_DK); r(w - x0 - 6, 31, 1, 12, WOOD);
  r(x0 + 3, 42, 3, 2, OUT); r(w - x0 - 6, 42, 3, 2, OUT);
};

/** Quầy gỗ có mặt trên sáng: dùng cho quầy nước, quầy xôi. */
const counterBody = (r: (x: number, y: number, w: number, h: number, c: string) => void, w: number, y: number, front: string) => {
  r(1, y, w - 2, 44 - y, OUT);
  r(2, y + 1, w - 4, 8, WOOD_LT);
  r(2, y + 1, w - 4, 2, WOOD_HI);
  r(2, y + 9, w - 4, 2, '#8E5830');
  r(2, y + 11, w - 4, 43 - y - 11, front);
  r(3, y + 12, w - 6, 2, WOOD_DK);
};

const DRAW: Record<string, Draw> = {
  food_grill: (r, w) => {
    r(1, 14, w - 2, 30, OUT);
    r(2, 15, w - 4, 9, STEEL_DK);
    r(2, 15, w - 4, 2, '#7C8387');
    r(5, 17, w - 10, 5, '#C8372D');            // than hồng
    for (let x = 7; x < w - 8; x += 4) r(x, 17, 1, 5, '#1D1D1D'); // vỉ nướng
    r(10, 18, 3, 1, '#F4A261'); r(26, 19, 3, 1, '#F4A261'); r(44, 18, 3, 1, '#F4A261');
    r(2, 24, w - 4, 19, '#5C6165');
    r(2, 24, w - 4, 2, '#3A3D40');
    for (let x = 6; x < w - 8; x += 5) r(x, 30, 3, 8, '#3A3D40'); // khe thông gió
    r(w - 14, 27, 3, 3, '#E5B338'); r(w - 9, 27, 3, 3, '#E5B338'); // núm vặn
    r(4, 43, 5, 3, OUT); r(w - 9, 43, 5, 3, OUT);
    r(12, 8, 1, 4, 'rgba(255,255,255,0.35)'); r(30, 6, 1, 5, 'rgba(255,255,255,0.3)'); r(46, 8, 1, 4, 'rgba(255,255,255,0.35)'); // khói
  },
  hot_kettle: (r, w) => {
    r(3, 28, w - 6, 15, OUT);
    r(4, 29, w - 8, 5, WOOD_LT); r(4, 29, w - 8, 1, WOOD_HI);
    r(4, 34, w - 8, 8, WOOD);
    r(9, 8, 14, 21, OUT);
    r(10, 9, 12, 19, STEEL); r(10, 9, 3, 19, STEEL_HI); r(19, 9, 3, 19, '#8D979B');
    r(12, 5, 8, 4, OUT); r(13, 6, 6, 2, STEEL); r(15, 3, 2, 3, OUT);
    r(22, 14, 7, 3, OUT); r(22, 15, 6, 1, STEEL);
    r(5, 12, 4, 11, OUT); r(6, 13, 2, 9, '#6E4122');
    r(13, 16, 6, 3, '#C8372D');
    r(14, 0, 1, 3, 'rgba(255,255,255,0.4)'); r(17, 1, 1, 2, 'rgba(255,255,255,0.3)');
  },
  food_table_2: table(WOOD_LT, WOOD_HI, '#8E5830'),
  food_table_4: table(WOOD_LT, WOOD_HI, '#8E5830'),
  drink_table_2: table('#4C9BD0', '#8FD0F0', '#2F6E9A'),
  drink_counter: (r, w) => {
    counterBody(r, w, 14, '#2F7F95');
    r(6, 32, 24, 9, '#14506A'); r(34, 32, 24, 9, '#14506A');
    r(16, 35, 4, 2, BRASS); r(44, 35, 4, 2, BRASS);
    // bình nước ép và ly trên mặt quầy
    r(6, 3, 12, 13, OUT); r(7, 4, 10, 11, GLASS); r(7, 8, 10, 7, '#F2A33A'); r(8, 4, 2, 10, GLASS_HI);
    r(21, 3, 12, 13, OUT); r(22, 4, 10, 11, GLASS); r(22, 8, 10, 7, '#7CB854'); r(23, 4, 2, 10, GLASS_HI);
    r(40, 9, 6, 7, OUT); r(41, 10, 4, 5, '#FFF2D6'); r(48, 9, 6, 7, OUT); r(49, 10, 4, 5, '#FFF2D6');
    r(41, 10, 4, 1, '#8FD0F0'); r(49, 10, 4, 1, '#8FD0F0');
  },
  blender: (r, w) => {
    r(5, 28, w - 10, 15, OUT);
    r(6, 29, w - 12, 13, '#3A4A55'); r(6, 29, w - 12, 2, '#62788A');
    r(13, 34, 4, 3, '#E5B338'); r(19, 34, 3, 3, '#C8372D');
    r(9, 5, 14, 24, OUT); r(10, 6, 12, 22, GLASS); r(10, 15, 12, 13, '#7CB854'); r(10, 15, 12, 2, '#B4DB8C'); r(11, 6, 2, 21, GLASS_HI);
    r(8, 2, 16, 4, OUT); r(9, 3, 14, 2, STEEL_DK); r(14, 0, 4, 3, OUT);
  },
  sugarcane_press: (r, w) => {
    r(4, 10, 38, 34, OUT);
    r(5, 11, 36, 31, '#6B7A80'); r(5, 11, 36, 3, '#9CABB1'); r(5, 38, 36, 4, '#4B565B');
    r(9, 17, 28, 11, OUT); r(10, 18, 26, 9, STEEL); r(10, 18, 26, 2, STEEL_HI);
    r(15, 18, 1, 9, '#6B7A80'); r(22, 18, 1, 9, '#6B7A80'); r(29, 18, 1, 9, '#6B7A80'); // trục ép
    r(12, 31, 6, 4, '#C8372D'); r(20, 31, 4, 4, '#E5B338'); // đèn / núm
    r(41, 25, 21, 4, OUT); r(42, 26, 19, 2, '#8FB04C'); r(44, 24, 1, 1, '#5E7A2E'); r(52, 24, 1, 1, '#5E7A2E'); // cây mía
    r(46, 31, 11, 12, OUT); r(47, 32, 9, 10, GLASS); r(47, 36, 9, 6, '#C8D86A'); r(48, 32, 2, 9, GLASS_HI);
    r(10, 3, 8, 8, OUT); r(11, 4, 6, 6, '#8FB04C'); // phễu
    r(6, 43, 5, 3, OUT); r(w - 25, 43, 5, 3, OUT);
  },
  thung_ngam: (r, w) => {
    r(5, 12, w - 10, 31, OUT);
    r(6, 13, w - 12, 29, '#8B552F'); r(6, 13, 4, 29, '#B27B50'); r(w - 11, 13, 4, 29, '#6E4122');
    r(5, 18, w - 10, 3, '#3A2415'); r(5, 33, w - 10, 3, '#3A2415');
    r(6, 9, w - 12, 5, OUT); r(7, 10, w - 14, 3, '#D8D2B0'); r(9, 10, 6, 1, '#F7F2D8'); // nước ngâm nếp
    r(5, 42, w - 10, 2, OUT);
  },
  xung_hap: (r, w) => {
    r(4, 31, w - 8, 12, OUT); r(5, 32, w - 10, 10, STEEL); r(5, 32, w - 10, 2, STEEL_HI); r(5, 39, w - 10, 3, '#8D979B');
    r(5, 22, w - 10, 10, OUT); r(6, 23, w - 12, 8, '#C79B55'); r(6, 23, w - 12, 2, '#E0BC7A');
    for (let x = 8; x < w - 8; x += 3) r(x, 25, 1, 5, '#8E6B33'); // nan tre
    r(7, 14, w - 14, 9, OUT); r(8, 15, w - 16, 7, '#B58542'); r(8, 15, w - 16, 2, '#D6A862');
    r(13, 11, 6, 4, OUT); r(14, 12, 4, 2, '#8E6B33');
    r(11, 5, 1, 4, 'rgba(255,255,255,0.4)'); r(19, 3, 1, 5, 'rgba(255,255,255,0.35)');
  },
  quay_xoi: (r, w) => {
    r(2, 22, w - 4, 22, OUT);
    r(3, 23, w - 6, 3, WOOD_LT); r(3, 23, w - 6, 1, WOOD_HI);
    r(3, 26, w - 6, 16, WOOD); r(3, 26, w - 6, 2, WOOD_DK);
    r(5, 31, w - 10, 9, '#28180F'); r(6, 32, w - 12, 7, '#8B552F'); r(13, 35, 6, 2, BRASS);
    r(3, 6, w - 6, 17, OUT); r(4, 7, w - 8, 15, GLASS);
    r(6, 14, 8, 8, '#E9C95D'); r(6, 14, 8, 2, '#F6E394'); // xôi vàng
    r(15, 15, 7, 7, '#F7F2D8'); r(15, 15, 7, 2, '#FFFFFF'); // xôi trắng
    r(22, 16, 5, 6, '#7CB854'); // lá chuối
    r(5, 7, 3, 14, GLASS_HI);
  },
  chao_xao: (r, w) => {
    r(3, 27, w - 6, 16, OUT);
    r(4, 28, w - 8, 14, STEEL_DK); r(4, 28, w - 8, 2, '#7C8387');
    r(6, 34, 5, 4, '#E5B338'); r(14, 34, 4, 4, '#E5B338');
    r(11, 25, 10, 3, '#F4A261'); r(13, 24, 6, 2, '#E5B338'); // lửa
    r(5, 16, w - 10, 10, OUT); r(6, 17, w - 12, 8, '#262626'); r(6, 17, w - 12, 2, '#5A5A5A');
    r(9, 20, 3, 2, '#E5B338'); r(15, 21, 3, 2, '#7CB854'); r(20, 20, 2, 2, '#C8372D');
    r(w - 6, 18, 6, 4, OUT); r(w - 6, 19, 5, 2, '#6E4122');
  },
  chao_chien: (r, w) => {
    r(3, 22, w - 6, 21, OUT);
    r(4, 23, w - 8, 19, STEEL); r(4, 23, w - 8, 2, STEEL_HI); r(4, 38, w - 8, 4, '#8D979B');
    r(6, 17, w - 12, 8, OUT); r(7, 18, w - 14, 6, '#E5B338'); r(7, 18, w - 14, 2, '#F6D77A');
    r(10, 20, 2, 2, '#FFF2D6'); r(18, 21, 2, 1, '#FFF2D6'); // bọt dầu
    r(w - 11, 9, 2, 10, OUT); r(w - 17, 8, 8, 2, OUT); r(w - 16, 9, 6, 1, '#6E4122');
    r(8, 29, 6, 3, '#C8372D'); r(w - 12, 29, 4, 3, '#2F2F2F');
  },
  generator: (r, w) => {
    r(2, 18, w - 4, 26, OUT);
    r(3, 19, w - 6, 8, '#D9604E'); r(3, 19, w - 6, 2, '#F08A78');
    r(3, 27, w - 6, 15, '#B64C3D'); r(3, 27, w - 6, 2, '#8E3A2E');
    r(7, 11, 24, 8, OUT); r(8, 12, 22, 6, '#D6A03A'); r(8, 12, 22, 2, '#F0C562'); r(16, 9, 5, 3, OUT); // bình xăng
    r(35, 30, 20, 10, OUT); r(36, 31, 18, 8, '#2F2F2F');
    r(38, 33, 4, 4, '#E5B338'); r(44, 33, 4, 4, '#7CB854'); r(50, 33, 3, 4, '#C8372D');
    r(8, 31, 22, 8, '#8E3A2E'); for (let x = 10; x < 28; x += 4) r(x, 32, 2, 6, '#5E241C'); // lưới tản nhiệt
    r(52, 12, 6, 7, OUT); r(53, 13, 4, 5, STEEL_DK); // ống xả
    r(5, 43, 8, 3, OUT); r(w - 13, 43, 8, 3, OUT);
  },
  storage_rack: (r, w) => {
    r(3, 4, 3, 40, '#6F7C83'); r(3, 4, 1, 40, STEEL_HI); r(w - 6, 4, 3, 40, '#6F7C83'); r(w - 6, 4, 1, 40, STEEL_HI);
    for (const y of [14, 26, 38]) { r(3, y, w - 6, 3, STEEL); r(3, y, w - 6, 1, STEEL_HI); r(3, y + 2, w - 6, 1, '#6F7C83'); }
    const box = (x: number, y: number, bw: number, bh: number) => { r(x, y, bw, bh, OUT); r(x + 1, y + 1, bw - 2, bh - 2, '#C79B55'); r(x + 1, y + 1, bw - 2, 2, '#E0BC7A'); r(x + Math.floor(bw / 2), y + 1, 1, bh - 2, '#8E6B33'); };
    box(7, 5, 8, 9); box(17, 7, 8, 7); box(8, 17, 10, 9); box(20, 19, 6, 7); box(7, 29, 7, 9); box(16, 30, 10, 8);
    r(4, 43, 4, 3, OUT); r(w - 8, 43, 4, 3, OUT);
  },
  ghe_nghi_khach: (r, w) => {
    r(3, 14, w - 6, 10, OUT); r(4, 15, w - 8, 8, WOOD); r(4, 15, w - 8, 2, WOOD_LT);
    r(3, 24, w - 6, 8, OUT); r(4, 25, w - 8, 6, WOOD_LT); r(4, 25, w - 8, 2, WOOD_HI);
    r(5, 32, 3, 11, WOOD_DK); r(w - 8, 32, 3, 11, WOOD_DK); r(5, 42, 3, 2, OUT); r(w - 8, 42, 3, 2, OUT);
    r(3, 16, 2, 14, OUT); r(w - 5, 16, 2, 14, OUT);
  },
  cay_kieng_lon: (r, w) => {
    r(9, 33, w - 18, 10, OUT); r(10, 34, w - 20, 8, '#B64C3D'); r(10, 34, w - 20, 2, '#D9604E'); r(8, 32, w - 16, 3, '#8E3A2E');
    r(15, 22, 2, 11, '#5B3A1E');
    for (const [x, y, lw, lh, c] of [[4, 10, 10, 8, '#3F7A3E'], [17, 6, 11, 9, '#5FA04A'], [9, 2, 12, 10, '#4D9244'], [3, 18, 9, 7, '#2E5E32'], [19, 16, 10, 8, '#3F7A3E'], [11, 14, 10, 8, '#5FA04A']] as const) {
      r(x - 1, y - 1, lw + 2, lh + 2, '#1F3F24'); r(x, y, lw, lh, c); r(x + 1, y + 1, lw - 3, 2, '#8FCB74');
    }
  },
  be_ca_koi: (r, w) => {
    r(2, 38, w - 4, 6, OUT); r(3, 39, w - 6, 4, WOOD); r(3, 39, w - 6, 1, WOOD_LT);
    r(2, 14, w - 4, 25, OUT); r(3, 15, w - 6, 23, '#4FA3C7'); r(3, 15, w - 6, 3, '#8FD0F0'); r(3, 33, w - 6, 5, '#D8C48A'); // cát
    r(5, 15, 2, 22, GLASS_HI);
    r(8, 22, 6, 3, '#F26B3A'); r(13, 23, 2, 2, '#F26B3A'); r(9, 22, 2, 1, '#FFFFFF'); // koi cam
    r(18, 28, 6, 3, '#FFF2D6'); r(23, 29, 2, 2, '#FFF2D6'); r(19, 28, 2, 1, '#C8372D'); // koi trắng đốm đỏ
    r(10, 29, 2, 6, '#3F7A3E'); r(24, 25, 2, 10, '#3F7A3E'); // rong
    r(2, 12, w - 4, 3, OUT); r(3, 13, w - 6, 1, STEEL);
  },
  chau_cay: (r, w) => {
    r(10, 32, w - 20, 11, OUT); r(11, 33, w - 22, 9, '#B64C3D'); r(11, 33, w - 22, 2, '#D9604E'); r(9, 31, w - 18, 3, '#8E3A2E');
    r(15, 24, 2, 8, '#3F7A3E');
    for (const [x, y, lw, lh, c] of [[8, 20, 8, 6, '#3F7A3E'], [16, 18, 8, 7, '#5FA04A'], [12, 14, 8, 7, '#4D9244']] as const) {
      r(x - 1, y - 1, lw + 2, lh + 2, '#1F3F24'); r(x, y, lw, lh, c); r(x + 1, y + 1, lw - 3, 1, '#8FCB74');
    }
    r(14, 17, 3, 3, '#F2C94C');
  },
};

/** Canvas của món `shopId`, null nếu không thuộc nhóm này. */
export function propFixtureTexture(shopId: string): HTMLCanvasElement | null {
  const draw = DRAW[shopId];
  const tiles = PROP_WIDTH[shopId];
  if (!draw || !tiles) return null;
  const canvas = document.createElement('canvas');
  canvas.width = tiles * 32; canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const w = canvas.width;
  const r = (x: number, y: number, a: number, b: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, a, b); };
  // Bóng đổ nhẹ dưới sàn như kệ và quầy
  r(4, 42, w - 6, 5, '#26190E45');
  r(2, 44, w - 2, 3, '#26190E22');
  draw(r, w);
  return canvas;
}
