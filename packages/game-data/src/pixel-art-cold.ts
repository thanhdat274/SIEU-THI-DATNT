type Rect = (x: number, y: number, w: number, h: number, color: string) => void;

const INK = '#593A2B';
const PAPER = '#FFF2D6';
const FOIL = '#9BB7C4';

/** Cốc nhựa có nắp màng nhôm: thân thuôn xuống, nhãn một dải màu. */
function cup(rect: Rect, band: string, extra?: () => void): void {
  rect(3, 2, 10, 2, INK); rect(4, 2, 8, 1, FOIL); // nắp màng nhôm
  rect(4, 4, 8, 9, INK); rect(5, 4, 6, 8, PAPER); rect(5, 13, 6, 1, INK);
  rect(5, 7, 6, 3, band);
  extra?.();
}

/** Khay nhựa trong có nắp: ruột nhìn xuyên qua. */
function tray(rect: Rect, inner: string, fill: () => void): void {
  rect(1, 5, 14, 2, INK); rect(2, 5, 12, 1, '#DCEBEF'); // nắp trong
  rect(2, 7, 12, 7, INK); rect(3, 7, 10, 6, inner);
  fill();
  rect(3, 12, 10, 1, '#B9CFD6'); // đáy khay
}

/** Chai nhựa có nắp: thân màu nước + nhãn. */
function bottle(rect: Rect, cap: string, liquid: string, label: string, mark: string): void {
  rect(6, 1, 4, 2, INK); rect(7, 1, 2, 1, cap);
  rect(5, 3, 6, 1, INK); rect(4, 4, 8, 11, INK);
  rect(5, 4, 6, 10, liquid); rect(5, 7, 6, 4, label); rect(7, 8, 2, 2, mark);
  rect(5, 4, 1, 3, '#FFFFFF');
}

const DRAWERS: Record<string, (rect: Rect) => void> = {
  sua_chua_trai_cay_cup: (rect) => cup(rect, '#E27C9B', () => { rect(6, 8, 2, 1, '#D63629'); rect(8, 9, 2, 1, '#F7C8D4'); }),
  sua_chua_nha_dam: (rect) => cup(rect, '#7DBE6B', () => { rect(6, 8, 1, 1, '#E8F6E0'); rect(8, 8, 1, 1, '#E8F6E0'); rect(7, 9, 2, 1, '#E8F6E0'); }),
  pudding_flan_cup: (rect) => {
    rect(3, 4, 10, 10, INK); rect(4, 5, 8, 8, '#F6D98A'); // thân bánh flan
    rect(4, 5, 8, 3, '#B5651D'); rect(5, 8, 1, 2, '#B5651D'); rect(9, 8, 2, 1, '#B5651D'); // caramel chảy
    rect(5, 5, 3, 1, '#D99A55'); rect(4, 13, 8, 1, '#C9A55A'); rect(6, 2, 4, 2, INK); rect(7, 3, 2, 1, '#D63629'); // cherry
  },
  pho_mai_que_lanh: (rect) => {
    for (const x of [3, 9]) {
      rect(x, 2, 4, 13, INK); rect(x + 1, 3, 2, 11, '#F4C24B'); rect(x + 1, 3, 2, 3, '#FFE08A'); rect(x, 6, 4, 1, '#D63629'); // vỏ bọc đỏ
      rect(x + 1, 11, 2, 1, '#E0A033');
    }
  },
  salad_rau_tron_khay: (rect) => tray(rect, '#E8F4E4', () => {
    rect(4, 8, 4, 3, '#4F9A3C'); rect(8, 8, 4, 3, '#7DBE6B'); rect(6, 9, 3, 2, '#2E6828');
    rect(4, 10, 1, 1, '#D63629'); rect(10, 9, 1, 1, '#D63629'); rect(11, 11, 1, 1, '#F2D16B');
  }),
  salad_trai_cay_cat_san: (rect) => tray(rect, '#FFF6E2', () => {
    rect(4, 8, 3, 3, '#F08A3C'); rect(7, 8, 3, 3, '#7DBE6B'); rect(10, 8, 2, 3, '#D63629');
    rect(5, 9, 1, 1, '#FFD59A'); rect(8, 9, 1, 1, '#2E6828'); rect(6, 11, 4, 1, '#F2D16B');
  }),
  dua_hau_cat_khay: (rect) => tray(rect, '#FFEFEF', () => {
    rect(4, 8, 8, 4, '#2E6828'); rect(4, 8, 8, 3, '#418E3A'); rect(4, 8, 8, 2, '#EAF3D4'); rect(5, 8, 6, 2, '#D63629');
    rect(6, 9, 1, 1, INK); rect(9, 9, 1, 1, INK); rect(5, 8, 6, 1, '#E8504A');
  }),
  kimchi_hop: (rect) => {
    rect(3, 2, 10, 3, INK); rect(4, 2, 8, 2, '#EDEDED'); rect(5, 2, 2, 1, '#FFFFFF'); // nắp trắng
    rect(3, 5, 10, 10, INK); rect(4, 5, 8, 9, '#C9372B');
    rect(5, 7, 3, 2, '#F2D16B'); rect(8, 9, 3, 2, '#F6E9A8'); rect(5, 11, 2, 2, '#E8504A'); rect(9, 7, 2, 1, '#8E1F18');
    rect(4, 13, 8, 1, '#8E1F18');
  },
  jambon_goi: (rect) => {
    rect(2, 4, 12, 10, INK); rect(3, 5, 10, 8, '#F2A7A7'); // gói hút chân không
    rect(3, 5, 10, 2, '#FFD9D9'); rect(5, 8, 6, 3, PAPER); rect(6, 9, 4, 1, '#C93A32');
    rect(3, 12, 10, 1, '#C77A7A'); rect(2, 3, 12, 1, INK);
  },
  com_nam_onigiri: (rect) => {
    rect(7, 2, 2, 1, INK); rect(6, 3, 4, 1, INK); rect(5, 4, 6, 1, INK); rect(4, 5, 8, 2, INK); rect(3, 7, 10, 7, INK);
    rect(7, 3, 2, 1, '#F8F4E8'); rect(6, 4, 4, 1, '#F8F4E8'); rect(5, 5, 6, 2, '#F8F4E8'); rect(4, 7, 8, 6, '#F8F4E8');
    rect(5, 9, 6, 5, '#1F2A2A'); rect(4, 10, 8, 3, '#1F2A2A'); rect(6, 10, 4, 2, '#F4C24B'); // rong biển + nhãn nhân
    rect(5, 6, 1, 1, '#FFFFFF');
  },
  sandwich_trung_lanh: (rect) => {
    rect(2, 5, 12, 9, INK); rect(3, 6, 10, 7, '#E5C289'); // vỏ bánh mì lát
    rect(3, 6, 10, 2, '#F6E2B3'); rect(3, 8, 10, 3, '#FFF6D6'); rect(5, 8, 6, 3, '#F4C24B'); rect(6, 9, 4, 1, '#FFE08A'); // nhân trứng
    rect(3, 11, 10, 2, '#E5C289');
  },
  banh_mi_kep_thit: (rect) => {
    rect(1, 6, 14, 8, INK); rect(2, 5, 12, 2, INK); rect(2, 6, 12, 7, '#D99A55');
    rect(3, 6, 10, 2, '#E8B573'); rect(2, 9, 12, 1, '#7DBE6B'); rect(2, 10, 12, 1, '#F2A7A7'); rect(2, 11, 12, 1, '#D63629'); // rau, thịt nguội, cà chua
    rect(4, 6, 1, 1, '#FFF2D6'); rect(8, 6, 1, 1, '#FFF2D6'); rect(11, 6, 1, 1, '#FFF2D6'); // mè
  },
  ca_phe_cold_brew: (rect) => bottle(rect, '#9BD0C8', '#4A2B1B', '#E9D3B4', '#4A2B1B'),
  tra_sua_tuoi_lanh: (rect) => bottle(rect, '#E27C9B', '#D9B88A', '#FFF2D6', '#B5651D'),
  nuoc_cam_ep_tuoi: (rect) => bottle(rect, '#4F9A3C', '#F59A2E', '#FFE7B0', '#F08A3C'),
  sua_chua_dong_cup: (rect) => {
    rect(3, 3, 10, 2, INK); rect(4, 3, 8, 1, '#E4F4F8'); // nắp phủ sương
    rect(4, 5, 8, 9, INK); rect(5, 5, 6, 8, '#BFE3EE'); rect(5, 5, 6, 2, '#E4F4F8');
    rect(5, 8, 6, 3, PAPER); rect(6, 9, 4, 1, '#9BB7C4');
    rect(2, 6, 1, 1, '#FFFFFF'); rect(13, 8, 1, 1, '#FFFFFF'); rect(6, 13, 1, 1, '#FFFFFF');
  },
  kem_ly_socola: (rect) => {
    rect(4, 2, 8, 4, INK); rect(5, 3, 6, 3, '#6B3A1E'); rect(6, 2, 4, 1, '#8A5230'); rect(5, 3, 2, 1, '#A8703F'); // viên kem
    rect(3, 6, 10, 8, INK); rect(4, 7, 8, 6, '#F4E4BC'); rect(4, 7, 8, 2, '#9B5A2E'); rect(5, 10, 6, 2, '#E27C9B'); // ly + nhãn
    rect(11, 1, 2, 1, INK); rect(12, 2, 1, 3, INK); rect(12, 2, 1, 2, '#C69464'); // muỗng gỗ
  },
};

/** Vẽ icon riêng cho các hàng lạnh/đông mới; trả false nếu mã món không có icon riêng. */
export function drawColdProductIcon(productId: string | undefined, rect: Rect): boolean {
  const draw = productId ? DRAWERS[productId] : undefined;
  if (!draw) return false;
  draw(rect);
  return true;
}

export const COLD_PRODUCT_ICON_IDS: readonly string[] = Object.keys(DRAWERS);
