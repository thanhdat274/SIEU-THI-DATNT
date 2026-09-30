import type { ModifierChannel, ModifierRule, ModifierTarget } from '@game/shared';

export type MarketEventKind = 'weather' | 'local' | 'holiday' | 'supply' | 'infrastructure';

export interface MarketEventEffect {
  label: string;
  target?: ModifierTarget;
  effects: Partial<Record<ModifierChannel, number>>;
}

/**
 * Sự kiện thị trường tạm thời. Mọi hiệu ứng là bộ chỉnh dữ liệu (không có nhánh code theo tên sự kiện).
 * Kênh `supplierStock`, `wholesalePrice`, `spoilage` được khai báo sẵn và dùng ở các đợt nhà cung cấp/hạn dùng.
 */
export interface MarketEventDef {
  id: string;
  kind: MarketEventKind;
  label: string;
  notice: string; // nội dung thông báo cho người chơi
  durationDays: number;
  trigger: {
    climates?: string[]; // chỉ kích hoạt trong mùa khí hậu này
    seasons?: string[]; // hoặc trong mùa sự kiện này
    weekdays?: number[]; // ngày bắt đầu phải rơi vào các thứ này (0 = Thứ Hai)
    chancePerDay: number; // xác suất bắt đầu mỗi ngày đủ điều kiện (xác định theo hạt giống)
    minGapDays: number; // khoảng cách tối thiểu giữa hai lần bắt đầu
  };
  warnDaysBefore: number; // báo trước bao nhiêu ngày (0 = báo khi bắt đầu)
  weatherOverride?: string; // ép thời tiết trong thời gian sự kiện (cần báo trước >= 2 ngày để dự báo khớp)
  powerOutage?: boolean; // đợt hạn dùng: tủ mát mất điện
  effects: MarketEventEffect[];
}

export const MARKET_EVENTS: readonly MarketEventDef[] = [
  {
    id: 'heat_wave', kind: 'weather', label: 'Nắng nóng kéo dài', notice: 'Đợt nắng nóng kéo dài: khách đông, đồ uống mát và kem đắt hàng, nhà cung cấp giữ hàng mát.',
    durationDays: 4, trigger: { climates: ['clim_hot'], chancePerDay: 0.08, minGapDays: 12 }, warnDaysBefore: 2, weatherOverride: 'hot',
    effects: [
      { label: 'khách ghé mua nước nhiều hơn', effects: { traffic: 1.2 } },
      { label: 'đồ uống mát cháy hàng', target: { tags: ['cold_drink'] }, effects: { demand: 1.5, supplierStock: 0.6, wholesalePrice: 1.3 } },
      { label: 'kem bán rất chạy', target: { tags: ['ice_cream'] }, effects: { demand: 1.6, supplierStock: 0.6, wholesalePrice: 1.3 } },
    ],
  },
  {
    id: 'heavy_rain_spell', kind: 'weather', label: 'Đợt mưa to', notice: 'Mưa to kéo dài: ít người ra đường nhưng ô, áo mưa, mì gói cần nhiều.',
    durationDays: 2, trigger: { climates: ['clim_rainy'], chancePerDay: 0.1, minGapDays: 10 }, warnDaysBefore: 2, weatherOverride: 'heavy_rain',
    effects: [
      { label: 'khách ra đường ít hơn', effects: { traffic: 0.85 } },
      { label: 'đồ che mưa khan hiếm', target: { tags: ['rain_gear'] }, effects: { demand: 1.3, supplierStock: 0.7, wholesalePrice: 1.25 } },
      { label: 'tích trữ đồ ăn liền', target: { tags: ['instant_food'] }, effects: { demand: 1.2 } },
    ],
  },
  {
    id: 'local_festival', kind: 'local', label: 'Lễ hội trong xóm', notice: 'Lễ hội trong xóm: khách đông, bánh kẹo và nước uống bán chạy.',
    durationDays: 2, trigger: { weekdays: [5], chancePerDay: 0.18, minGapDays: 20 }, warnDaysBefore: 2,
    effects: [
      { label: 'người đi lễ hội ghé tiệm', effects: { traffic: 1.5 } },
      { label: 'ăn vặt, nước uống', target: { tags: ['snack', 'cold_drink'] }, effects: { demand: 1.3 } },
    ],
  },
  {
    id: 'school_event', kind: 'local', label: 'Sự kiện trường học', notice: 'Trường gần hẻm có sự kiện: học sinh và phụ huynh ghé mua đồ ăn vặt.',
    durationDays: 1, trigger: { weekdays: [1, 2, 3], chancePerDay: 0.08, minGapDays: 14 }, warnDaysBefore: 1,
    effects: [
      { label: 'phụ huynh, học sinh ghé mua', effects: { traffic: 1.2 } },
      { label: 'bánh kẹo, đồ ăn sáng', target: { tags: ['snack', 'sweet', 'breakfast'] }, effects: { demand: 1.3 } },
    ],
  },
  {
    id: 'sports_event', kind: 'local', label: 'Trận đấu thể thao', notice: 'Có trận đấu trong xóm: khách ghé mua nước và đồ nhậu nhẹ.',
    durationDays: 1, trigger: { weekdays: [5, 6], chancePerDay: 0.1, minGapDays: 15 }, warnDaysBefore: 1,
    effects: [
      { label: 'cổ động viên ghé mua', effects: { traffic: 1.25 } },
      { label: 'nước uống', target: { tags: ['cold_drink', 'water'] }, effects: { demand: 1.4 } },
      { label: 'đồ ăn vặt', target: { tags: ['snack'] }, effects: { demand: 1.2 } },
    ],
  },
  {
    id: 'public_holiday', kind: 'holiday', label: 'Ngày nghỉ lễ', notice: 'Ngày nghỉ lễ: bà con ở nhà nấu ăn, khách mua thực phẩm tươi và bánh kẹo.',
    durationDays: 1, trigger: { chancePerDay: 0.03, minGapDays: 30 }, warnDaysBefore: 2,
    effects: [
      { label: 'mọi người nghỉ, đi lại nhiều', effects: { traffic: 1.3 } },
      { label: 'thực phẩm tươi', target: { tags: ['fresh', 'meat', 'vegetable'] }, effects: { demand: 1.2 } },
      { label: 'bánh kẹo', target: { tags: ['sweet'] }, effects: { demand: 1.2 } },
    ],
  },
  {
    id: 'neighborhood_gathering', kind: 'local', label: 'Tụ họp xóm', notice: 'Xóm tụ họp buổi tối: nước uống và đồ nhậu nhẹ được mua nhiều.',
    durationDays: 1, trigger: { weekdays: [5, 6], chancePerDay: 0.1, minGapDays: 15 }, warnDaysBefore: 0,
    effects: [
      { label: 'bà con kéo ra ghé tiệm', effects: { traffic: 1.3 } },
      { label: 'nước uống, đồ ăn vặt', target: { tags: ['cold_drink', 'snack'] }, effects: { demand: 1.25 } },
    ],
  },
  {
    id: 'power_outage', kind: 'infrastructure', label: 'Mất điện', notice: 'Mất điện: khách ít hơn, hàng lạnh và hàng tươi dễ hỏng nếu không kịp xử lý.',
    durationDays: 1, trigger: { chancePerDay: 0.04, minGapDays: 25 }, warnDaysBefore: 0, powerOutage: true,
    effects: [
      { label: 'khách ngại ghé tối tăm', effects: { traffic: 0.85 } },
      { label: 'hàng lạnh nhanh hỏng', target: { tags: ['fresh', 'frozen', 'ice_cream', 'dairy'] }, effects: { spoilage: 2.5 } },
      { label: 'đồ uống mát không còn lạnh', target: { tags: ['cold_drink'] }, effects: { demand: 0.85 } },
    ],
  },
  {
    id: 'supplier_shortage', kind: 'supply', label: 'Nhà cung cấp khan hàng', notice: 'Nhà cung cấp khan hàng: hàng nhập ít và giá sỉ nhích lên vài ngày.',
    durationDays: 3, trigger: { chancePerDay: 0.05, minGapDays: 15 }, warnDaysBefore: 0,
    effects: [
      { label: 'tồn nhà cung cấp giảm, giá sỉ tăng', effects: { supplierStock: 0.5, wholesalePrice: 1.2 } },
    ],
  },
];

export const MARKET_EVENT_MAP: Record<string, MarketEventDef> = Object.fromEntries(MARKET_EVENTS.map(item => [item.id, item]));

/** Bộ chỉnh sinh từ dữ liệu sự kiện; dùng chung cơ chế với mùa/thời tiết. */
export const MARKET_EVENT_RULES: ModifierRule[] = MARKET_EVENTS.flatMap(event =>
  event.effects.map((effect, index): ModifierRule => ({
    id: `event_${event.id}_${index}`,
    label: `${event.label}: ${effect.label}`,
    source: 'event',
    when: { event: [event.id] },
    target: effect.target,
    effects: effect.effects,
  })),
);
