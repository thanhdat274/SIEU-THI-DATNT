import { Product } from '@game/shared';

/** Original 16px product silhouettes, shared by DOM icons and world shelf stock. */
export interface PixelRect { x: number; y: number; w: number; h: number; color: string }
export function productPixels(product?: Pick<Product, 'id' | 'category'>): PixelRect[] {
  const p: PixelRect[] = [];
  const rect = (x: number, y: number, w: number, h: number, color: string) => p.push({ x, y, w, h, color });
  const ink = '#593A2B', paper = '#FFF2D6', gold = '#E9B95D', teal = '#357F72';
  const category = product?.category;
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
