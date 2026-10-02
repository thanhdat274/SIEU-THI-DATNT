import { nullProto } from './safe-map';
import { getSeasonForDay, type SeasonId } from './seasons';
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
  // Chủ đề Việt hóa
  { id: 'non_la_treo', name: 'Nón lá treo tường', icon: '👒', slot: 'wall', cost: 25_000, attraction: 4, unlockLevel: 10 },
  { id: 'am_tra_quay', name: 'Bộ ấm trà đặt quầy', icon: '🍵', slot: 'counter', cost: 30_000, attraction: 4, unlockLevel: 10 },
  { id: 'den_long_hoi_an', name: 'Đèn lồng Hội An', icon: '🏮', slot: 'wall', cost: 35_000, attraction: 7, unlockLevel: 11 },
  { id: 'tranh_dong_ho', name: 'Tranh dân gian Đông Hồ', icon: '🖼️', slot: 'wall', cost: 45_000, attraction: 6, unlockLevel: 12 },
  { id: 'bien_go_thu_phap', name: 'Biển gỗ thư pháp', icon: '🪧', slot: 'sign', cost: 90_000, attraction: 14, unlockLevel: 12 },
  // Chủ đề retro
  { id: 'poster_xua', name: 'Áp phích quảng cáo xưa', icon: '📰', slot: 'wall', cost: 40_000, attraction: 5, unlockLevel: 13 },
  { id: 'dong_ho_cuckoo', name: 'Đồng hồ quả lắc', icon: '🕰️', slot: 'wall', cost: 70_000, attraction: 8, unlockLevel: 14 },
  { id: 'radio_cu', name: 'Radio cát-sét cũ', icon: '📻', slot: 'counter', cost: 55_000, attraction: 6, unlockLevel: 14 },
  { id: 'bien_neon_retro', name: 'Biển neon retro', icon: '🌟', slot: 'sign', cost: 160_000, attraction: 22, unlockLevel: 16 },
  // Chủ đề hiện đại
  { id: 'loa_nhac_nen', name: 'Loa nhạc nền', icon: '🔊', slot: 'wall', cost: 100_000, attraction: 10, unlockLevel: 16 },
  { id: 'den_led_hap', name: 'Đèn LED hắt tường', icon: '💠', slot: 'wall', cost: 120_000, attraction: 14, unlockLevel: 17 },
  { id: 'man_hinh_quang_cao', name: 'Màn hình quảng cáo', icon: '📺', slot: 'wall', cost: 180_000, attraction: 18, unlockLevel: 18 },
  { id: 'may_pha_ca_phe_mini', name: 'Máy pha cà phê mini', icon: '☕', slot: 'counter', cost: 150_000, attraction: 10, unlockLevel: 19 },
  { id: 'bien_neon_hien_dai', name: 'Biển hiệu hộp đèn hiện đại', icon: '✨', slot: 'sign', cost: 220_000, attraction: 26, unlockLevel: 20 },
  // Đồ sàn (mua qua cửa hàng nội thất, xem FIXTURE_SHOP)
  { id: 'ghe_nghi_khach', name: 'Ghế nghỉ cho khách', icon: '🪑', slot: 'floor', cost: 60_000, attraction: 6, unlockLevel: 11 },
  { id: 'cay_kieng_lon', name: 'Cây kiểng lớn', icon: '🌳', slot: 'floor', cost: 70_000, attraction: 10, unlockLevel: 12 },
  { id: 'be_ca_koi', name: 'Bể cá Koi mini', icon: '🐟', slot: 'floor', cost: 150_000, attraction: 14, unlockLevel: 17 },
];

export const DECOR_ATTRACTION_MAX = 160;
/** Hệ số khách = 1 + điểm thu hút / DIVISOR (tối đa +25%, ứng với điểm thu hút tối đa). */
export const DECOR_ATTRACTION_DIVISOR = 640;
export const DECOR_MAP: Record<string, DecorDef> = nullProto(Object.fromEntries(DECOR.map(item => [item.id, item])));

export interface SeasonalDecorItem {
  id: string;
  name: string;
  icon: string;
}

/**
 * Trang trí tạm theo mùa/sự kiện: chỉ hiển thị trên tường tiệm khi sự kiện đang diễn ra, tự gỡ khi hết.
 * Không phải đồ sở hữu (không vào save, không tính điểm thu hút); sức hút của sự kiện đã nằm ở hệ số `demandMultiplier`.
 */
export const SEASONAL_DECOR: Record<SeasonId, readonly SeasonalDecorItem[]> = {
  tet: [{ id: 'tet_mai', name: 'Cành mai ngày Tết', icon: '🌼' }, { id: 'tet_long_den', name: 'Đèn lồng đỏ', icon: '🏮' }],
  mua_mua: [{ id: 'mua_o', name: 'Ô che mưa treo hiên', icon: '☂️' }, { id: 'mua_ech', name: 'Ếch mùa mưa', icon: '🐸' }],
  tuu_truong: [{ id: 'tt_cap', name: 'Cặp sách ngày khai giảng', icon: '🎒' }, { id: 'tt_sach', name: 'Sách vở mới', icon: '📚' }],
  trung_thu: [{ id: 'tr_long_den', name: 'Lồng đèn ông sao', icon: '⭐' }, { id: 'tr_banh', name: 'Bánh trung thu', icon: '🥮' }],
};

export function seasonalDecorForDay(day: number): readonly SeasonalDecorItem[] {
  const season = getSeasonForDay(day);
  return season ? SEASONAL_DECOR[season.id] : [];
}
