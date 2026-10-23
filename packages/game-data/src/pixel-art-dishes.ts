type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

const INK = '#3A2A22';
const GLASS = '#E8EEF2';
const PLATE = '#F4F0E8';
const PLATE_SHADE = '#CFC8BA';

/** Ly thủy tinh thấp: viền, thân và phần đồ uống bên trong. */
function glass(rect: Rect, liquid: string, top?: string): void {
  rect(3, 3, 10, 1, INK);
  rect(3, 4, 1, 9, INK); rect(12, 4, 1, 9, INK); rect(4, 13, 8, 1, INK);
  rect(4, 4, 8, 9, GLASS);
  rect(4, top ? 7 : 5, 8, top ? 6 : 8, liquid);
  if (top) rect(4, 4, 8, 3, top);
  rect(5, 5, 1, 7, '#FFFFFF'); // vệt sáng
}

/** Đĩa cơm tròn nhìn từ trên xuống nghiêng: đĩa, phần cơm và món ăn kèm. */
function plate(rect: Rect, draw: () => void): void {
  rect(2, 5, 12, 1, INK); rect(1, 6, 1, 6, INK); rect(14, 6, 1, 6, INK); rect(2, 12, 12, 1, INK);
  rect(2, 6, 12, 6, PLATE); rect(2, 11, 12, 1, PLATE_SHADE);
  draw();
}

const DRAWERS: Record<string, (rect: Rect) => void> = {
  // Cà phê đen đá: đen đặc, vài viên đá nổi, ống hút.
  ca_phe_den_da_tp: rect => {
    glass(rect, '#3B2417');
    rect(5, 5, 3, 2, '#B9D9E6'); rect(8, 6, 3, 2, '#D6ECF4'); // đá
    rect(10, 1, 1, 6, '#D63629'); rect(9, 1, 2, 1, '#D63629'); // ống hút
  },
  // Bạc xỉu: nhiều sữa, lớp cà phê mỏng phía dưới.
  bac_xiu_tp: rect => {
    glass(rect, '#9A6B45', '#F2E3C4');
    rect(5, 4, 6, 1, '#FFF8E6');
    rect(10, 1, 1, 6, '#2E8B57'); rect(9, 1, 2, 1, '#2E8B57');
  },
  // Cà phê trứng: lớp kem trứng vàng dày trên cà phê nâu.
  ca_phe_trung_tp: rect => {
    glass(rect, '#4A2A18', '#F3CF63');
    rect(5, 4, 3, 1, '#FBE8A0'); rect(9, 5, 2, 1, '#FBE8A0');
    rect(4, 7, 8, 1, '#E3B63F');
  },
  // Cơm sườn: cơm trắng, miếng sườn nướng cháy cạnh, rau.
  com_suon_nuong_tp: rect => plate(rect, () => {
    rect(3, 7, 5, 4, '#FFFFFF'); rect(3, 10, 5, 1, '#E3DCCD'); // cơm
    rect(8, 6, 5, 5, INK); rect(9, 7, 3, 3, '#9B4A22'); rect(9, 7, 1, 1, '#C77A3A'); rect(11, 9, 1, 1, '#6B2E14'); // sườn
    rect(12, 5, 2, 1, '#4C9A4A'); rect(13, 6, 1, 1, '#4C9A4A'); // rau
  }),
  // Cơm chiên trứng: cơm vàng lổn nhổn, mảnh trứng và hành lá.
  com_chien_trung_tp: rect => plate(rect, () => {
    rect(3, 6, 10, 5, '#E9C25A');
    rect(4, 7, 2, 1, '#FFF1B8'); rect(8, 8, 2, 1, '#FFF1B8'); rect(6, 9, 2, 1, '#FFF1B8'); rect(11, 7, 1, 1, '#FFF1B8'); // trứng
    rect(5, 8, 1, 1, '#4C9A4A'); rect(9, 7, 1, 1, '#4C9A4A'); rect(10, 10, 1, 1, '#4C9A4A'); rect(7, 6, 1, 1, '#4C9A4A'); // hành
  }),
  // Canh rau thịt: bát sứ, nước canh, rau xanh và thịt bằm.
  canh_rau_thit_tp: rect => {
    rect(2, 4, 12, 1, INK); rect(1, 5, 1, 3, INK); rect(14, 5, 1, 3, INK);
    rect(2, 5, 12, 2, '#B7D88A'); rect(4, 5, 2, 1, '#3F8F3A'); rect(8, 6, 3, 1, '#3F8F3A'); rect(11, 5, 2, 1, '#D8A07A'); // nước canh, rau, thịt
    rect(2, 7, 12, 3, '#E9E2D3'); rect(1, 8, 1, 1, INK); rect(14, 8, 1, 1, INK);
    rect(3, 10, 10, 1, '#E9E2D3'); rect(4, 11, 8, 1, '#CFC8BA'); rect(5, 12, 6, 1, INK); rect(2, 9, 12, 1, INK); rect(4, 11, 1, 1, INK); rect(11, 11, 1, 1, INK);
    rect(6, 7, 4, 1, '#3F7FB5'); // họa tiết xanh
  },
};

export function drawDishProductIcon(productId: string | undefined, rect: Rect): boolean {
  const draw = productId ? DRAWERS[productId] : undefined;
  if (!draw) return false;
  draw(rect);
  return true;
}

export const DISH_PRODUCT_ICON_IDS: readonly string[] = Object.keys(DRAWERS);
