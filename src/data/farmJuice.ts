/**
 * GĐ1255 — Juice thu hoạch trại kiểu game nông trại (tham khảo PHAN-TICH-THAM-KHAO-XOM-NONG-TRAI.md
 * mục "Juice kiểu thu hoạch", dùng lại dòng coinPop GĐ173): khi thu hoạch luống / lấy trứng / vắt sữa,
 * một bong bóng "+3 🥬" bay lên tại LUỐNG/CHUỒNG đó trong thế giới 3D — phản hồi bằng mắt ngay "vừa
 * thu được bao nhiêu, ở đâu", thay vì chỉ có toast chữ.
 * THUẦN ĐỌC: helper chỉ soi chênh lệch `garden.homegrown` giữa hai bản chụp state và trả toạ độ neo
 * (luống/chuồng) — không đổi state, không rút rng; watchers gọi mỗi lần store đổi (xem farmSync).
 */
import { ANIMALS, ANIMAL_ORDER, CROPS, type AnimalKind, type GardenState } from './garden';
import { penCenter, plotBedPos } from '../world/farm';

/** Icon emoji của một sản phẩm nhà trồng/nhà nuôi (theo productId) — không rõ thì lá cây trung tính. */
export const farmPopIcon = (productId: string): string =>
  CROPS.find((c) => c.productId === productId)?.icon
  ?? ANIMAL_ORDER.map((k) => ANIMALS[k]).find((a) => a.productId === productId)?.icon
  ?? '🌿';

/** Chữ trên bong bóng: "+3 🥬" (số thu thêm + icon sản phẩm). */
export const farmPopLabel = (productId: string, qty: number): string => `+${qty} ${farmPopIcon(productId)}`;

export interface FarmPop {
  productId: string;
  /** Số sản phẩm thu thêm trong lần soi này (đã gộp nếu cùng sản phẩm nhiều nguồn). */
  qty: number;
  label: string;
  /** Toạ độ cục bộ trong trại (farm group ở FARM_CENTER); null = không xác định → neo cổng trại. */
  x: number | null;
  z: number | null;
  source: 'plot' | 'pen' | 'farm';
}

/** Luống vừa được thu hoạch: giống trên luống cho đúng `productId`, lúc trước đã chín, lúc sau trống
 *  hoặc quay về giai đoạn non (cây lâu năm regrow). Nhiều giống có thể cùng productId (traicay /
 *  traicay_nam) → khớp theo GIỐNG ĐANG TRỒNG trên từng luống, không khớp productId chung chung. */
const plotAnchor = (prev: GardenState, next: GardenState, productId: string): number | null => {
  for (let i = 0; i < next.plots.length; i++) {
    const before = prev.plots[i];
    if (!before?.crop || after(next, i) === before) continue;
    const def = CROPS.find((c) => c.id === before.crop);
    if (def?.productId !== productId) continue;
    if (before.growth < def.days) continue; // chưa chín → không phải thu hoạch
    const afterPlot = after(next, i);
    if (!afterPlot?.crop) return i; // thu xong luống trống
    if (afterPlot.crop === before.crop && afterPlot.growth < def.days) return i; // lâu năm regrow
  }
  return null;
};

const after = (next: GardenState, i: number) => next.plots[i];

/**
 * Soi chênh lệch homegrown giữa hai bản chụp → các bong bóng cần sinh. Mỗi sản phẩm một pop (qty
 * gộp), tối đa 4 pop mỗi lần soi — thu dồn dập vẫn có phản hồi nhưng không spam.
 * Neo: sản phẩm của cây trồng → luống vừa thu (chín → trống/regrow); sản phẩm của vật nuôi → tâm sân
 * thả loài đó; sản phẩm lạ → null (caller neo ở cổng trại).
 */
export function harvestPops(prev: GardenState, next: GardenState): FarmPop[] {
  const out: FarmPop[] = [];
  const ids = new Set([...Object.keys(prev.homegrown ?? {}), ...Object.keys(next.homegrown ?? {})]);
  for (const id of ids) {
    const d = (next.homegrown?.[id] ?? 0) - (prev.homegrown?.[id] ?? 0);
    if (d <= 0) continue;
    const plot = plotAnchor(prev, next, id);
    if (plot !== null) {
      const p = plotBedPos(plot);
      out.push({ productId: id, qty: d, label: farmPopLabel(id, d), x: p.x, z: p.z, source: 'plot' });
      continue;
    }
    const kind = ANIMAL_ORDER.find((k) => ANIMALS[k].productId === id);
    if (kind) {
      const c = penCenter(kind);
      out.push({ productId: id, qty: d, label: farmPopLabel(id, d), x: c.x, z: c.z, source: 'pen' });
      continue;
    }
    out.push({ productId: id, qty: d, label: farmPopLabel(id, d), x: null, z: null, source: 'farm' });
  }
  return out.slice(0, 4);
}
