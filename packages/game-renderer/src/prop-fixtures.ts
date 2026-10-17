/**
 * Bản vẽ 2.5D chuẩn cho trạm bếp, bàn, máy phát điện, kệ kho và đồ trang trí (cùng bảng màu và kỹ thuật với kệ/quầy trong
 * `premium-textures.ts`: viền gỗ tối, mặt trên sáng, bóng đổ dưới sàn). Khóa texture: `fixture_prop_<shopId>`.
 * Cao 48px như kệ; sprite đặt lệch -16 nên mép dưới trùng mép dưới ô.
 */
type Draw = (r: (x: number, y: number, w: number, h: number, c: string) => void, w: number) => void;

// Bảng màu LimeZu (viền xanh đen 2 px, gỗ cam vàng, thép xám tím) để đồ bếp nằm cạnh kệ/quầy LimeZu không lệch tông.
const OUT = '#3A3A50', WOOD = '#CA8854', WOOD_DK = '#B5754D', WOOD_LT = '#E0B870', WOOD_HI = '#F1D188', BRASS = '#F1D188';
const STEEL = '#B0B0A0', STEEL_DK = '#787878', STEEL_HI = '#E8E1D9', GLASS = 'rgba(183, 255, 238, 0.45)', GLASS_HI = 'rgba(255, 255, 255, 0.55)';

/** Món trong danh mục dùng bản vẽ này, kèm bề rộng (ô). */
const PROP_WIDTH: Record<string, number> = {
  food_grill: 2, hot_kettle: 1, food_table_2: 1, food_table_4: 2, drink_counter: 2, blender: 1, sugarcane_press: 2,
  drink_table_2: 1, generator: 2, thung_ngam: 1, xung_hap: 1, quay_xoi: 1, chao_xao: 1, chao_chien: 1, storage_rack: 1,
  ghe_nghi_khach: 1, cay_kieng_lon: 1, be_ca_koi: 1, chau_cay: 1,
};
export const PROP_FIXTURE_IDS: readonly string[] = Object.keys(PROP_WIDTH);
export const isPropFixture = (shopId?: string): boolean => !!shopId && shopId in PROP_WIDTH;

const DRAW: Record<string, Draw> = {
  food_grill: (r, w) => {
    r(4, 16, w - 8, 26, OUT);
    r(6, 14, w - 12, 2, OUT);
    r(6, 16, w - 12, 8, STEEL_DK);
    r(6, 16, w - 12, 2, STEEL_HI);
    r(8, 18, w - 16, 6, '#8E2018');
    r(10, 19, w - 20, 4, '#D64527');
    for (let x = 12; x < w - 14; x += 8) {
      r(x, 20, 4, 2, '#F29E38');
      r(x + 2, 20, 2, 2, '#FFE27A');
    }
    for (let x = 10; x < w - 10; x += 4) r(x, 18, 2, 6, '#242430');
    r(6, 24, w - 12, 18, STEEL);
    r(6, 24, w - 12, 2, STEEL_HI);
    r(6, 40, w - 12, 2, STEEL_DK);
    for (let x = 10; x < w - 24; x += 6) {
      r(x, 28, 4, 8, '#3A3A50');
      r(x, 28, 4, 2, '#242430');
    }
    r(14, 38, 20, 2, STEEL_DK);
    r(w - 20, 26, 12, 14, STEEL_DK);
    r(w - 18, 28, 8, 4, '#F1D188');
    r(w - 16, 28, 4, 2, '#B5754D');
    r(w - 18, 34, 8, 4, '#F1D188');
    r(w - 16, 34, 4, 2, '#B5754D');
    r(8, 42, 6, 2, OUT);
    r(w - 14, 42, 6, 2, OUT);
    r(16, 8, 2, 4, 'rgba(255,255,255,0.4)');
    r(32, 6, 4, 6, 'rgba(255,255,255,0.45)');
    r(46, 8, 2, 4, 'rgba(255,255,255,0.35)');
  },
  hot_kettle: (r, w) => {
    r(4, 32, 24, 12, OUT);
    r(6, 30, 20, 2, OUT);
    r(6, 32, 20, 4, WOOD_LT);
    r(6, 32, 20, 2, WOOD_HI);
    r(6, 36, 20, 6, WOOD);
    r(6, 40, 20, 2, WOOD_DK);
    r(10, 28, 12, 4, OUT);
    r(12, 28, 8, 2, STEEL_DK);
    r(10, 14, 12, 14, OUT);
    r(12, 12, 8, 2, OUT);
    r(12, 14, 8, 14, STEEL);
    r(12, 14, 2, 14, STEEL_HI);
    r(18, 14, 2, 14, STEEL_DK);
    r(15, 18, 2, 8, GLASS);
    r(15, 22, 2, 4, '#76B5DB');
    r(6, 16, 4, 4, OUT);
    r(8, 16, 2, 2, STEEL_HI);
    r(22, 16, 4, 10, OUT);
    r(22, 18, 2, 6, 'rgba(0,0,0,0)');
    r(12, 10, 8, 4, OUT);
    r(14, 10, 4, 2, STEEL_HI);
    r(15, 8, 2, 2, OUT);
    r(11, 26, 2, 2, '#D64527');
    r(6, 6, 2, 6, 'rgba(255,255,255,0.45)');
    r(8, 4, 2, 4, 'rgba(255,255,255,0.3)');
  },
  food_table_2: (r, w) => {
    r(2, 22, 28, 8, OUT);
    r(4, 20, 24, 2, OUT);
    r(4, 22, 24, 4, WOOD_LT);
    r(4, 22, 24, 2, WOOD_HI);
    r(4, 26, 24, 2, WOOD_DK);
    r(6, 28, 4, 14, OUT);
    r(8, 28, 2, 14, WOOD);
    r(22, 28, 4, 14, OUT);
    r(22, 28, 2, 14, WOOD_DK);
    r(10, 36, 12, 2, WOOD_DK);
    r(6, 42, 4, 2, OUT);
    r(22, 42, 4, 2, OUT);
  },
  food_table_4: (r, w) => {
    r(2, 22, w - 4, 8, OUT);
    r(4, 20, w - 8, 2, OUT);
    r(4, 22, w - 8, 4, WOOD_LT);
    r(4, 22, w - 8, 2, WOOD_HI);
    r(4, 26, w - 8, 2, WOOD_DK);
    r(6, 28, 4, 14, OUT);
    r(8, 28, 2, 14, WOOD);
    r(w - 10, 28, 4, 14, OUT);
    r(w - 10, 28, 2, 14, WOOD_DK);
    r(10, 36, w - 20, 2, WOOD_DK);
    r(6, 42, 4, 2, OUT);
    r(w - 10, 42, 4, 2, OUT);
  },
  drink_table_2: (r, w) => {
    r(2, 22, 28, 8, OUT);
    r(4, 20, 24, 2, OUT);
    r(4, 22, 24, 4, '#4FA3C7');
    r(4, 22, 24, 2, '#9EE2F5');
    r(4, 26, 24, 2, '#2C7294');
    r(14, 28, 4, 12, OUT);
    r(15, 28, 2, 12, STEEL);
    r(8, 40, 16, 4, OUT);
    r(10, 40, 12, 2, STEEL_HI);
  },
  drink_counter: (r, w) => {
    r(2, 20, w - 4, 24, OUT);
    r(4, 18, w - 8, 2, OUT);
    r(4, 20, w - 8, 4, WOOD_LT);
    r(4, 20, w - 8, 2, WOOD_HI);
    r(4, 24, w - 8, 2, WOOD_DK);
    r(4, 26, w - 8, 16, '#28465C');
    r(8, 28, 22, 12, '#1E3547');
    r(18, 33, 4, 2, BRASS);
    r(34, 28, 22, 12, '#1E3547');
    r(44, 33, 4, 2, BRASS);
    r(8, 6, 12, 14, OUT);
    r(10, 4, 8, 2, BRASS);
    r(10, 6, 8, 12, GLASS);
    r(10, 9, 8, 9, '#F29E38');
    r(10, 6, 2, 12, GLASS_HI);
    r(12, 18, 4, 2, STEEL);
    r(26, 6, 12, 14, OUT);
    r(28, 4, 8, 2, BRASS);
    r(28, 6, 8, 12, GLASS);
    r(28, 9, 8, 9, '#6BB347');
    r(28, 6, 2, 12, GLASS_HI);
    r(30, 18, 4, 2, STEEL);
    r(46, 10, 8, 10, OUT);
    r(48, 10, 4, 8, '#FFF2D6');
    r(48, 12, 4, 2, '#4FA3C7');
    r(48, 16, 4, 2, '#4FA3C7');
  },
  blender: (r, w) => {
    r(6, 28, 20, 14, OUT);
    r(8, 26, 16, 2, OUT);
    r(8, 28, 16, 14, '#383D48');
    r(8, 28, 16, 2, '#5C6370');
    r(13, 33, 6, 6, OUT);
    r(14, 34, 4, 4, '#F1D188');
    r(15, 34, 2, 2, '#B5754D');
    r(21, 35, 2, 2, '#D64527');
    r(8, 42, 4, 2, OUT);
    r(20, 42, 4, 2, OUT);
    r(8, 10, 16, 16, OUT);
    r(10, 10, 12, 16, GLASS);
    r(10, 14, 12, 12, '#72B543');
    r(10, 14, 12, 2, '#9FE06E');
    r(10, 10, 2, 16, GLASS_HI);
    r(24, 12, 4, 12, OUT);
    r(24, 14, 2, 8, 'rgba(0,0,0,0)');
    r(8, 6, 16, 4, OUT);
    r(10, 6, 12, 2, '#5C6370');
    r(14, 4, 4, 2, OUT);
  },
  sugarcane_press: (r, w) => {
    r(4, 16, 40, 26, OUT);
    r(6, 14, 36, 2, OUT);
    r(6, 16, 36, 24, STEEL);
    r(6, 16, 36, 2, STEEL_HI);
    r(8, 16, 32, 12, OUT);
    r(10, 18, 28, 8, GLASS);
    for (const x of [12, 20, 28]) {
      r(x, 18, 6, 8, STEEL_DK);
      r(x + 1, 18, 4, 8, STEEL_HI);
      r(x + 2, 19, 2, 6, '#434854');
    }
    r(10, 18, 2, 8, GLASS_HI);
    r(18, 28, 12, 3, STEEL_DK);
    r(23, 31, 2, 3, OUT);
    r(10, 34, 12, 6, OUT);
    r(12, 36, 3, 3, '#D64527');
    r(17, 36, 3, 3, '#5CB85C');
    r(8, 42, 6, 2, OUT);
    r(34, 42, 6, 2, OUT);
    r(44, 24, 16, 18, OUT);
    r(46, 24, 12, 16, WOOD);
    r(46, 24, 12, 2, WOOD_HI);
    r(48, 8, 3, 16, '#5C8C2E');
    r(48, 12, 3, 1, '#D4B84B');
    r(53, 6, 3, 18, '#72A838');
    r(53, 11, 3, 1, '#D4B84B');
    r(47, 28, 8, 10, OUT);
    r(48, 29, 6, 8, GLASS);
    r(48, 32, 6, 5, '#A6D943');
    r(51, 25, 1, 6, '#D64527');
  },
  thung_ngam: (r, w) => {
    r(4, 14, 24, 28, OUT);
    r(6, 12, 20, 2, OUT);
    r(6, 42, 20, 2, OUT);
    r(6, 14, 20, 28, WOOD);
    r(8, 14, 4, 28, WOOD_LT);
    r(18, 14, 4, 28, WOOD_DK);
    r(4, 20, 24, 3, OUT);
    r(6, 21, 20, 1, STEEL_HI);
    r(4, 34, 24, 3, OUT);
    r(6, 35, 20, 1, STEEL_HI);
    r(6, 12, 20, 6, OUT);
    r(8, 13, 16, 4, '#EBE6DA');
    r(10, 14, 12, 2, '#FFFDF8');
  },
  xung_hap: (r, w) => {
    r(4, 32, 24, 10, OUT);
    r(6, 30, 20, 2, OUT);
    r(6, 32, 20, 10, STEEL);
    r(6, 32, 4, 10, STEEL_HI);
    r(22, 32, 4, 10, STEEL_DK);
    r(2, 34, 2, 4, OUT);
    r(28, 34, 2, 4, OUT);
    r(5, 20, 22, 10, OUT);
    r(7, 20, 18, 10, '#C9974B');
    r(7, 20, 18, 2, '#E2B86E');
    for (let x = 8; x < 24; x += 3) r(x, 22, 1, 6, '#946628');
    r(7, 14, 18, 6, OUT);
    r(9, 12, 14, 2, OUT);
    r(9, 14, 14, 4, '#B8853B');
    r(9, 14, 14, 1, '#D8A758');
    r(14, 10, 4, 2, OUT);
    r(15, 8, 2, 2, '#946628');
    r(11, 4, 2, 4, 'rgba(255,255,255,0.45)');
    r(18, 2, 3, 5, 'rgba(255,255,255,0.35)');
  },
  quay_xoi: (r, w) => {
    r(2, 24, 28, 18, OUT);
    r(4, 22, 24, 2, OUT);
    r(4, 24, 24, 4, WOOD_LT);
    r(4, 24, 24, 2, WOOD_HI);
    r(4, 28, 24, 14, WOOD);
    r(7, 31, 18, 9, WOOD_DK);
    r(15, 34, 4, 2, BRASS);
    r(3, 8, 26, 15, OUT);
    r(5, 10, 22, 11, GLASS);
    r(6, 10, 2, 10, GLASS_HI);
    r(23, 10, 2, 10, GLASS_HI);
    r(6, 15, 9, 6, '#38732E');
    r(7, 14, 7, 6, '#D64527');
    r(8, 14, 5, 2, '#F07842');
    r(17, 15, 9, 6, '#38732E');
    r(18, 14, 7, 6, '#E5B338');
    r(19, 14, 5, 2, '#FBE482');
  },
  chao_xao: (r, w) => {
    r(4, 26, 24, 16, OUT);
    r(6, 24, 20, 2, OUT);
    r(6, 26, 20, 16, STEEL_DK);
    r(6, 26, 20, 2, STEEL);
    r(10, 34, 4, 4, OUT);
    r(11, 35, 2, 2, '#D64527');
    r(7, 24, 18, 2, '#242430');
    r(10, 22, 12, 3, '#3288D8');
    r(12, 21, 8, 2, '#76CEFF');
    r(14, 22, 4, 1, '#FFF58A');
    r(6, 15, 18, 8, OUT);
    r(8, 16, 14, 6, '#383D48');
    r(8, 16, 14, 2, '#5C6370');
    r(10, 17, 3, 2, '#E5B338');
    r(14, 18, 3, 2, '#5CB85C');
    r(17, 17, 3, 2, '#D64527');
    r(24, 16, 6, 3, OUT);
    r(25, 17, 5, 1, WOOD);
  },
  chao_chien: (r, w) => {
    r(4, 20, 24, 22, OUT);
    r(6, 18, 20, 2, OUT);
    r(6, 20, 20, 22, STEEL);
    r(6, 20, 4, 22, STEEL_HI);
    r(22, 20, 4, 22, STEEL_DK);
    r(9, 28, 4, 4, '#D64527');
    r(17, 29, 2, 2, '#5CB85C');
    r(6, 14, 20, 8, OUT);
    r(8, 15, 16, 6, '#E5B338');
    r(8, 15, 16, 2, '#F6D77A');
    r(11, 17, 2, 2, '#FFFDF0');
    r(18, 18, 2, 1, '#FFFDF0');
    r(22, 8, 2, 10, OUT);
    r(16, 7, 8, 2, OUT);
    r(17, 8, 6, 1, '#242430');
  },
  generator: (r, w) => {
    r(4, 14, w - 8, 28, OUT);
    r(6, 12, w - 12, 2, OUT);
    r(6, 14, w - 12, 28, '#D64527');
    r(6, 14, w - 12, 2, '#F07865');
    r(10, 18, w - 20, 22, '#2C3038');
    r(12, 12, 26, 7, OUT);
    r(14, 13, 22, 5, '#E5B338');
    r(14, 13, 22, 2, '#FBE482');
    r(22, 10, 6, 3, OUT);
    for (let y = 22; y < 36; y += 3) r(14, y, 16, 1, '#4E5564');
    r(34, 22, 18, 16, OUT);
    r(36, 24, 14, 12, STEEL);
    r(38, 25, 4, 4, '#FFFDF0');
    r(39, 26, 2, 2, '#D64527');
    r(44, 25, 4, 3, '#242430');
    r(38, 31, 3, 3, '#5CB85C');
    r(44, 31, 3, 3, '#D64527');
    r(52, 12, 4, 8, OUT);
    r(53, 14, 2, 4, STEEL_DK);
    r(8, 42, 6, 2, OUT);
    r(w - 14, 42, 6, 2, OUT);
  },
  storage_rack: (r, w) => {
    r(4, 4, 3, 40, '#4A5060');
    r(4, 4, 1, 40, STEEL_HI);
    r(25, 4, 3, 40, '#4A5060');
    r(25, 4, 1, 40, STEEL_HI);
    for (const y of [16, 28, 40]) {
      r(4, y, 24, 3, STEEL);
      r(4, y, 24, 1, STEEL_HI);
      r(4, y + 2, 24, 1, STEEL_DK);
    }
    const box = (bx: number, by: number, bw: number, bh: number) => {
      r(bx, by, bw, bh, OUT);
      r(bx + 1, by + 1, bw - 2, bh - 2, '#C79B55');
      r(bx + 1, by + 1, bw - 2, 1, '#E0BC7A');
      r(bx + Math.floor(bw / 2), by + 1, 2, bh - 2, '#B5754D');
      r(bx + 2, by + bh - 4, 3, 2, '#FFFDF0');
    };
    box(7, 6, 9, 10);
    box(18, 8, 7, 8);
    box(7, 18, 10, 10);
    box(19, 20, 6, 8);
    box(7, 30, 8, 10);
    box(17, 31, 9, 9);
    r(4, 42, 3, 2, OUT);
    r(25, 42, 3, 2, OUT);
  },
  ghe_nghi_khach: (r, w) => {
    r(6, 12, 20, 12, OUT);
    r(8, 10, 16, 2, OUT);
    r(8, 12, 16, 12, WOOD);
    r(11, 13, 2, 9, OUT);
    r(15, 13, 2, 9, OUT);
    r(19, 13, 2, 9, OUT);
    r(5, 24, 22, 8, OUT);
    r(7, 24, 18, 6, '#D67D42');
    r(7, 24, 18, 2, '#F0A167');
    r(7, 30, 3, 14, WOOD_DK);
    r(7, 30, 1, 14, WOOD);
    r(22, 30, 3, 14, WOOD_DK);
    r(22, 30, 1, 14, WOOD);
    r(10, 38, 12, 2, WOOD_DK);
    r(7, 42, 3, 2, OUT);
    r(22, 42, 3, 2, OUT);
  },
  cay_kieng_lon: (r, w) => {
    r(8, 34, 16, 10, OUT);
    r(7, 32, 18, 3, OUT);
    r(9, 32, 14, 2, '#4A3222');
    r(9, 35, 14, 7, '#C26346');
    r(9, 35, 14, 2, '#E0866A');
    r(15, 22, 3, 12, '#5C3E28');
    r(15, 22, 1, 12, '#7C563A');
    const clusters: readonly [number, number, number, number, string, string, string][] = [
      [4, 12, 10, 8, '#265630', '#3D8249', '#66B272'],
      [18, 8, 10, 8, '#265630', '#3D8249', '#66B272'],
      [10, 4, 12, 9, '#265630', '#3D8249', '#66B272'],
      [3, 18, 9, 7, '#1C4224', '#2F6838', '#4F9659'],
      [20, 16, 9, 7, '#265630', '#3D8249', '#66B272'],
      [11, 14, 10, 8, '#3D8249', '#549E62', '#86D193'],
    ];
    for (const [x, y, cw, ch, c_dk, c_mid, c_hi] of clusters) {
      r(x, y, cw, ch, OUT);
      r(x + 1, y + 1, cw - 2, ch - 2, c_mid);
      r(x + 1, y + 1, cw - 2, 2, c_hi);
      r(x + 1, y + ch - 3, cw - 2, 2, c_dk);
    }
  },
  be_ca_koi: (r, w) => {
    r(2, 38, 28, 6, OUT);
    r(4, 38, 24, 4, WOOD);
    r(4, 38, 24, 2, WOOD_HI);
    r(2, 14, 28, 24, OUT);
    r(4, 12, 24, 2, STEEL_DK);
    r(4, 14, 24, 24, '#4894BD');
    r(4, 14, 24, 3, '#78C4E6');
    r(4, 33, 24, 5, '#D8C48A');
    r(6, 25, 2, 10, '#2D6B35');
    r(8, 22, 2, 12, '#3E8E49');
    r(24, 24, 2, 10, '#3E8E49');
    r(8, 20, 6, 3, '#E85A2A');
    r(10, 20, 2, 1, '#FFFDF0');
    r(14, 21, 2, 2, '#E85A2A');
    r(17, 28, 6, 3, '#FFFDF0');
    r(19, 28, 2, 1, '#D64527');
    r(23, 29, 2, 2, '#FFFDF0');
    r(5, 14, 2, 22, GLASS_HI);
    r(25, 14, 2, 22, 'rgba(255,255,255,0.25)');
  },
  chau_cay: (r, w) => {
    r(10, 34, 12, 10, OUT);
    r(9, 32, 14, 2, OUT);
    r(10, 32, 12, 2, '#4A3222');
    r(11, 34, 10, 8, '#C26346');
    r(11, 34, 10, 2, '#E0866A');
    r(15, 25, 2, 8, '#3E8E49');
    const flowers: readonly [number, number, number, number, string, string][] = [
      [8, 20, 8, 7, '#3E8E49', '#6EC47B'],
      [16, 18, 8, 8, '#3E8E49', '#6EC47B'],
      [12, 14, 8, 8, '#52A85F', '#8AE097'],
    ];
    for (const [x, y, cw, ch, c_mid, c_hi] of flowers) {
      r(x, y, cw, ch, OUT);
      r(x + 1, y + 1, cw - 2, ch - 2, c_mid);
      r(x + 1, y + 1, cw - 2, 2, c_hi);
    }
    r(15, 16, 3, 3, '#F1D188');
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
  // Mọi khối chữ nhật bám lưới 2 px (viền 1 px thành 2 px) như pixel art LimeZu phóng 2×.
  const r = (x: number, y: number, a: number, b: number, c: string) => {
    const x0 = Math.floor(x / 2) * 2, y0 = Math.floor(y / 2) * 2;
    ctx.fillStyle = c;
    ctx.fillRect(x0, y0, Math.max(2, Math.ceil((x + a) / 2) * 2 - x0), Math.max(2, Math.ceil((y + b) / 2) * 2 - y0));
  };
  // Bóng đổ phẳng xám tím dưới chân đồ, giống bóng của đồ LimeZu
  r(2, 44, w - 4, 4, 'rgba(167, 151, 150, 0.7)');
  draw(r, w);
  return canvas;
}
