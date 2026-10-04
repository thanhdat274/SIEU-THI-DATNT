import { Product } from '@game/shared';
import { drawColdProductIcon } from './pixel-art-cold';

/** Original 16px product silhouettes, shared by DOM icons and world shelf stock. */
export interface PixelRect { x: number; y: number; w: number; h: number; color: string }
export function productPixels(product?: Pick<Product, 'id' | 'category'>): PixelRect[] {
  const p: PixelRect[] = [];
  const rect = (x: number, y: number, w: number, h: number, color: string) => p.push({ x, y, w, h, color });
  const ink = '#593A2B', paper = '#FFF2D6', gold = '#E9B95D', teal = '#357F72';
  const category = product?.category;
  if (drawColdProductIcon(product?.id, rect)) return p;
  if (product?.id === 'kem_que') { // que kem: thân kem + que gỗ
    rect(5, 1, 6, 9, ink); rect(6, 2, 4, 7, '#F4E4BC'); rect(6, 2, 4, 2, '#9BD0C8'); rect(7, 10, 2, 5, ink); rect(7, 10, 2, 4, '#C69464');
    return p;
  }
  if (product?.id === 'o_gap') { // ô gấp
    rect(2, 4, 12, 4, ink); rect(3, 3, 10, 2, ink); rect(4, 2, 8, 2, ink);
    rect(3, 4, 10, 3, '#B64C3D'); rect(4, 3, 8, 2, '#D95A45'); rect(7, 8, 2, 6, ink); rect(6, 13, 3, 2, ink);
    return p;
  }
  if (product?.id === 'ao_mua_bo') { // áo mưa vàng
    rect(3, 2, 10, 13, ink); rect(4, 3, 8, 11, '#E9B95D'); rect(6, 2, 4, 3, ink); rect(6, 3, 4, 2, '#C69464'); rect(7, 5, 2, 9, '#C99A3E');
    return p;
  }
  if (product?.id === 'banh_chung_tet') { // bánh chưng xanh vuông lạt rơm
    rect(2, 2, 12, 12, ink); rect(3, 3, 10, 10, '#2E6828'); rect(4, 4, 8, 8, '#418E3A');
    rect(7, 3, 2, 10, '#E5C26B'); rect(3, 7, 10, 2, '#E5C26B'); // lạt tre chữ thập
    return p;
  }
  if (product?.id === 'cau_doi_do') { // câu đối đỏ
    rect(4, 1, 8, 14, ink); rect(5, 2, 6, 12, '#B8281F');
    rect(6, 4, 4, 2, '#F8D05C'); rect(6, 7, 4, 2, '#F8D05C'); rect(6, 10, 4, 2, '#F8D05C'); // chữ vàng
    rect(4, 1, 8, 1, '#422315'); rect(4, 14, 8, 1, '#422315'); // trục gỗ cuốn
    return p;
  }
  if (product?.id === 'dua_hau_tet') { // dưa hấu khắc chữ
    rect(3, 3, 10, 10, ink); rect(4, 4, 8, 8, '#2E6828'); rect(5, 4, 2, 8, '#418E3A'); rect(9, 4, 2, 8, '#418E3A');
    rect(6, 6, 4, 4, '#D63629'); rect(7, 7, 2, 2, '#F8D05C'); // tâm khắc chữ Tài Lộc vàng
    return p;
  }
  if (product?.id === 'banh_trung_thu') { // bánh trung thu tròn nướng
    rect(3, 3, 10, 10, ink); rect(4, 3, 8, 10, '#B5651D'); rect(3, 4, 10, 8, '#B5651D');
    rect(5, 5, 6, 6, '#E29B48'); rect(7, 7, 2, 2, '#7C3B08');
    return p;
  }
  const hash = [...(product?.id ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const accent = ['#B64C3D', '#357F72', '#B58443', '#77649B'][hash % 4];
  if (category === 'soft_drinks' || category === 'bottled_water') {
    rect(6, 1, 4, 2, ink); rect(6, 3, 4, 2, teal); rect(4, 5, 8, 10, ink);
    rect(5, 6, 6, 8, category === 'bottled_water' ? '#87BEB9' : '#AD7547');
    rect(5, 8, 6, 4, paper); rect(6, 9, 4, 2, accent); rect(5, 6, 1, 2, '#D5E5CB');
  } else if (category === 'milk') {
    rect(3, 3, 10, 12, ink); rect(4, 4, 8, 10, paper); rect(4, 3, 8, 2, '#C7B8A0');
    rect(4, 8, 8, 4, accent); rect(6, 7, 4, 2, gold); rect(4, 13, 8, 1, '#C7B8A0');
  } else if (category === 'eggs') {
    rect(1, 8, 14, 7, ink); rect(2, 9, 12, 5, '#C69464');
    for (const x of [3, 7, 11]) {rect(x, 4, 2, 1, ink); rect(x-1, 5, 4, 6, ink); rect(x, 5, 2, 5, paper);}
  } else if (category === 'bread') {
    rect(2, 6, 12, 7, ink); rect(3, 4, 10, 9, ink); rect(4, 3, 8, 10, ink);
    rect(4, 4, 8, 8, gold); rect(3, 7, 10, 4, '#C69464');
    for(const x of [5,8,11]) rect(x, 5, 1, 4, paper);
  } else if (category === 'household') {
    rect(5, 1, 6, 2, ink); rect(3, 3, 10, 12, ink); rect(4, 4, 8, 10, '#87BEB9');
    rect(6, 5, 4, 6, paper); rect(7, 7, 2, 2, teal); rect(4, 12, 8, 2, accent);
  } else if (category === 'personal_care') { // chai/tuýp có nắp
    rect(6, 1, 4, 3, ink); rect(7, 2, 2, 1, gold); rect(4, 4, 8, 11, ink); rect(5, 5, 6, 9, '#E9C7D2');
    rect(6, 7, 4, 4, paper); rect(7, 8, 2, 2, accent); rect(5, 12, 6, 1, accent);
  } else if (category === 'frozen') { // hộp đông lạnh phủ sương
    rect(2, 4, 12, 11, ink); rect(3, 5, 10, 9, '#BFE3EE'); rect(3, 5, 10, 2, '#E4F4F8');
    rect(5, 8, 6, 4, paper); rect(6, 9, 4, 2, accent); rect(4, 13, 1, 1, '#FFFFFF'); rect(11, 6, 1, 1, '#FFFFFF');
  } else if (category === 'fresh_produce') { // quả/rau có cuống lá
    rect(7, 1, 2, 3, '#2E6828'); rect(9, 2, 3, 2, '#418E3A'); rect(3, 4, 10, 10, ink);
    rect(4, 5, 8, 8, accent === '#357F72' ? '#5FA84A' : '#D6593F'); rect(5, 6, 2, 2, '#F5D9C9'); rect(4, 12, 8, 1, '#8A3A2A');
  } else if (category === 'health') { // hộp thuốc chữ thập
    rect(2, 4, 12, 10, ink); rect(3, 5, 10, 8, paper); rect(7, 6, 2, 6, '#C93A32'); rect(5, 8, 6, 2, '#C93A32');
    rect(3, 12, 10, 1, '#C7B8A0');
  } else if (category === 'toys_stationery') { // khối xếp hình + bút
    rect(2, 8, 7, 7, ink); rect(3, 9, 5, 5, accent); rect(8, 3, 6, 6, ink); rect(9, 4, 4, 4, gold);
    rect(10, 5, 2, 2, paper); rect(3, 9, 5, 1, paper);
  } else if (category === 'alcohol') { // chai cổ dài
    rect(7, 1, 2, 3, ink); rect(6, 4, 4, 2, ink); rect(4, 6, 8, 9, ink);
    rect(5, 7, 6, 7, '#2E5B3A'); rect(5, 9, 6, 3, paper); rect(6, 10, 4, 1, accent); rect(7, 2, 2, 1, gold);
  } else if (category === 'candy') {
    rect(1, 5, 3, 6, ink); rect(12, 5, 3, 6, ink); rect(4, 3, 8, 10, ink);
    rect(5, 4, 6, 8, accent); rect(2, 6, 2, 4, gold); rect(12, 6, 2, 4, gold);
    rect(6, 6, 4, 4, paper); rect(7, 7, 2, 2, gold);
  } else {
    rect(2, 3, 12, 12, ink); rect(3, 4, 10, 10, accent); rect(3, 4, 10, 2, gold);
    rect(4, 7, 8, 5, paper); rect(5, 8, 6, 1, gold); rect(6, 10, 4, 1, accent);
    rect(3, 13, 10, 1, '#C69464');
    if (!product) {rect(7, 6, 2, 5, ink); rect(7, 12, 2, 1, ink);}
  }
  return p;
}
