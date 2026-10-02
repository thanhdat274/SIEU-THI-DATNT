import { nullProto } from './safe-map';
export type DecorSlot = 'sign' | 'wall' | 'floor' | 'counter';

export interface DecorDef {
  id: string;
  name: string;
  icon: string;
  slot: DecorSlot;
  cost: number;
  /** Điểm thu hút khách; cộng dồn, tối đa `DECOR_ATTRACTION_MAX`. */
  attraction: number;
  unlockLevel: number;
  /** Đồ độc quyền (thưởng sự kiện/mốc), không mua được bằng tiền. */
  exclusive?: boolean;
  cat?: boolean;
}

/** Đồ trang trí, bê từ game tham khảo tap-hoa-dau-hem (`src/data/decor.json`). */
export const DECOR: DecorDef[] = [
  { id: 'bien_led', name: 'Biển hiệu đèn LED', icon: '💡', slot: 'sign', cost: 120_000, attraction: 20, unlockLevel: 8 },
  { id: 'day_den', name: 'Dây đèn nháy', icon: '✨', slot: 'wall', cost: 60_000, attraction: 10, unlockLevel: 8 },
  { id: 'chau_cay', name: 'Chậu cây', icon: '🪴', slot: 'floor', cost: 40_000, attraction: 8, unlockLevel: 8 },
  { id: 'lich_treo', name: 'Lịch treo tường', icon: '📅', slot: 'wall', cost: 20_000, attraction: 5, unlockLevel: 8 },
  { id: 'than_tai', name: 'Bàn thờ Thần Tài', icon: '🏮', slot: 'wall', cost: 150_000, attraction: 25, unlockLevel: 8 },
  { id: 'may_quat', name: 'Quạt trần', icon: '🌀', slot: 'wall', cost: 90_000, attraction: 12, unlockLevel: 9 },
  { id: 'tien_tai', name: 'Mèo thần tài vẫy tay', icon: '🐈', slot: 'wall', cost: 0, attraction: 15, unlockLevel: 1, exclusive: true },
  { id: 'meo_muop', name: 'Mèo mướp nằm quầy', icon: '🐱', slot: 'counter', cost: 0, attraction: 5, unlockLevel: 1, exclusive: true, cat: true },
  { id: 'mai_vang', name: 'Cây mai vàng', icon: '🌼', slot: 'wall', cost: 0, attraction: 18, unlockLevel: 21, exclusive: true },
  { id: 'den_mau_mua_he', name: 'Dây đèn mùa hè', icon: '🎐', slot: 'wall', cost: 0, attraction: 12, unlockLevel: 21, exclusive: true },
  { id: 'long_den_mua', name: 'Dây lồng đèn', icon: '🏮', slot: 'wall', cost: 0, attraction: 16, unlockLevel: 21, exclusive: true },
  { id: 'bang_khai_giang', name: 'Bảng khai giảng', icon: '🎒', slot: 'wall', cost: 0, attraction: 10, unlockLevel: 21, exclusive: true },
  { id: 'co_bong_da', name: 'Cờ mùa bóng đá', icon: '⚽', slot: 'wall', cost: 0, attraction: 15, unlockLevel: 22, exclusive: true },
  { id: 'bang_khen_thue', name: 'Bằng khen nộp thuế gương mẫu', icon: '🏅', slot: 'wall', cost: 0, attraction: 12, unlockLevel: 10, exclusive: true },
];

export const DECOR_ATTRACTION_MAX = 100;
/** Hệ số khách = 1 + điểm thu hút / DIVISOR (tối đa +25%). */
export const DECOR_ATTRACTION_DIVISOR = 400;
export const DECOR_MAP: Record<string, DecorDef> = nullProto(Object.fromEntries(DECOR.map(item => [item.id, item])));
