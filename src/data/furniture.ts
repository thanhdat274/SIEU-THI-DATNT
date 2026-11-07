import type { Category } from './products';
import type { CookingStation } from './recipes';

export type FurnitureType =
  | 'shelf' | 'bigShelf' | 'fridge' | 'freezer' | 'produce' | 'meat_counter'
  | 'checkout' | 'cartStation' | 'plant' | 'wall'
  | 'dining_table' | 'chair'
  | 'vending_drink' | 'scale_machine' | 'claw_machine' | 'massage_chair' | 'shoe_shine' | 'cotton_candy'
  | 'toilet_squat' | 'toilet_porcelain' | 'toilet_smart'
  | 'kho_dao' | 'ke_gia_vi' | 'ke_chen' | 'thung_rac' | 'tham_chan' | 'den_long' | 'tranh_dong_ho' | 'bon_rua'
  | 'bang_hieu_bac' | 'bang_hieu_trung' | 'bang_hieu_nam' | 'bang_hieu_tay_nguyen'
  | 'binh_bat_trang' | 'trong_dong' | 'chua_mot_cot'
  | 'mam_ngu_qua' | 'den_ong_sao'
  | CookingStation;

/** Trạm nấu: id trùng tên trạm trong recipes.ts; đặt trong tiệm mới nấu được món của trạm đó. */
export const isCookStation = (type: FurnitureType): type is CookingStation =>
  type === 'hot_kettle' || type === 'food_grill' || type === 'blender' || type === 'drink_counter'
  || type === 'fryer' || type === 'sugarcane_press' || type === 'rice_station' || type === 'steamer'
  || type === 'gift_wrap';

export interface FurnitureDef {
  type: FurnitureType;
  name: string;
  price: number;
  unlock: number;
  /** Kích thước sàn [rộng, sâu] (m) khi chưa xoay; mặt trước là cạnh "rộng" phía +z. */
  size: [number, number];
  /** Số tầng bày hàng; 0 = không bày hàng. */
  tiers: number;
  /** Số ô hàng mỗi tầng: mỗi ô bày một món, nên một tầng bày được nhiều món khác nhau. */
  slots: number;
  /** Số món tối đa mỗi ô. */
  capacity: number;
  /** Ngành hàng bày được. */
  categories: Category[];
  /** Khách trả thêm bao nhiêu % khi mua từ món đồ này (vd. đồ uống lạnh). */
  priceBonus?: number;
  /** GĐ1490 — bàn ăn: số chỗ ngồi tối đa (số ghế kề bàn được tính). */
  seatSlots?: number;
  /** GĐ1495 — điểm trang trí 🩷: cộng vào decorScore kéo khách (chỉ phát huy khi danh tiếng tốt). */
  decor?: number;
  /** GĐ1513 — chỉ MUA được trong dịp lễ này (id trong calendar FESTIVALS); mua rồi giữ mãi. */
  festival?: string;
  desc: string;
}

const SHELF_GOODS: Category[] = ['dry', 'drink', 'household'];

export const FURNITURE: FurnitureDef[] = [
  {
    type: 'shelf', name: 'Kệ gỗ', price: 150000, unlock: 1, size: [1.8, 0.5], tiers: 3, slots: 4, capacity: 6,
    categories: SHELF_GOODS, desc: '3 tầng × 4 ô × 6 món (đồ khô, đồ uống, gia dụng). Đặt cạnh cửa/lối đi thì khách để ý hơn',
  },
  {
    type: 'wall', name: 'Vách ngăn', price: 20000, unlock: 1, size: [1.0, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 2, desc: 'Vách cao 1.5m, dùng chia khu (kho, khu đồ uống...); +2 điểm trang trí',
  },
  {
    type: 'plant', name: 'Chậu cây', price: 50000, unlock: 3, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 6, desc: 'Trang trí: +6 điểm 🩷 — càng nhiều điểm trang trí càng kéo khách, nhưng chỉ phát huy khi danh tiếng tốt',
  },
  {
    type: 'fridge', name: 'Tủ mát', price: 400000, unlock: 5, size: [1.2, 0.7], tiers: 4, slots: 3, capacity: 6,
    categories: ['drink', 'cold'], priceBonus: 0.2, desc: '4 tầng, mỗi tầng 3 ô × 6 món: đồ uống, hàng mát; khách trả thêm 20% vì mát lạnh',
  },
  {
    type: 'freezer', name: 'Tủ đông', price: 500000, unlock: 14, size: [1.6, 0.8], tiers: 2, slots: 3, capacity: 8,
    categories: ['frozen'], desc: '2 ngăn, mỗi ngăn 3 ô × 8 món hàng đông lạnh (kem, thịt, cá)',
  },
  {
    type: 'checkout', name: 'Quầy thu ngân phụ', price: 300000, unlock: 15, size: [1.6, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Thêm một hàng chờ tính tiền; cần thu ngân hoặc bạn đứng quầy',
  },
  {
    type: 'cartStation', name: 'Bãi xe đẩy', price: 200000, unlock: 20, size: [1.2, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Một nửa số khách lấy xe đẩy, mua 3–7 món thay vì 1–4',
  },
  {
    type: 'bigShelf', name: 'Kệ siêu thị', price: 350000, unlock: 26, size: [2.4, 0.6], tiers: 4, slots: 5, capacity: 8,
    categories: SHELF_GOODS, desc: '4 tầng, mỗi tầng 5 ô × 8 món, kệ sắt dài',
  },
  {
    type: 'produce', name: 'Quầy rau quả', price: 300000, unlock: 21, size: [1.6, 1.0], tiers: 2, slots: 3, capacity: 8,
    categories: ['fresh'], desc: '2 tầng, mỗi tầng 3 ô × 8 món hàng tươi (rau, trái cây, bánh mì, món nấu ăn tươi)',
  },
  {
    type: 'meat_counter', name: 'Quầy thịt cá tươi', price: 650000, unlock: 32, size: [2.0, 1.0], tiers: 2, slots: 3, capacity: 6,
    categories: ['meat'], priceBonus: 0.15,
    desc: '2 tầng × 3 ô × 6 món thịt cá tươi, quầy mát giữ hàng; khách trả thêm 15% vì tươi. Hạn dùng chỉ 2 ngày, cần giấy phép an toàn thực phẩm và người bán thịt cá đứng quầy',
  },
  // ──────────────────────────────────────────────
  // TRẠM NẤU: món nấu xong về kho, bày bán như hàng thường
  // ──────────────────────────────────────────────
  {
    type: 'hot_kettle', name: 'Bếp nồi nấu', price: 220000, unlock: 21, size: [0.8, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu nồi: phở, bún, cháo, món kho, chè, trà gừng (xem Sổ nấu 🍳)',
  },
  {
    type: 'food_grill', name: 'Bếp nướng', price: 320000, unlock: 21, size: [1.2, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: bánh mì, xiên nướng, cá & gà nướng, cơm hộp (xem Sổ nấu 🍳)',
  },
  {
    type: 'blender', name: 'Máy xay sinh tố', price: 260000, unlock: 25, size: [0.7, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: sinh tố, nước ép trái cây, sữa hạt (xem Sổ nấu 🍳)',
  },
  {
    type: 'drink_counter', name: 'Quầy pha chế', price: 320000, unlock: 25, size: [1.4, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: cà phê, trà sữa, bạc xỉu, trà đào (xem Sổ nấu 🍳)',
  },
  {
    type: 'sugarcane_press', name: 'Máy ép mía', price: 240000, unlock: 25, size: [1.0, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: nước mía tươi (xem Sổ nấu 🍳)',
  },
  {
    type: 'fryer', name: 'Chảo chiên', price: 280000, unlock: 26, size: [0.9, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: món chiên, xào, áp chảo (xem Sổ nấu 🍳)',
  },
  {
    type: 'rice_station', name: 'Quầy xôi', price: 360000, unlock: 36, size: [1.2, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: xôi các loại, suất xôi đôi (xem Sổ nấu 🍳)',
  },
  {
    type: 'steamer', name: 'Nồi hấp', price: 340000, unlock: 39, size: [0.9, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm nấu: bánh bao, há cảo, hải sản hấp (xem Sổ nấu 🍳)',
  },
  {
    type: 'gift_wrap', name: 'Bàn gói quà', price: 300000, unlock: 28, size: [1.0, 0.6], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Trạm gói giỏ quà lễ: Tết, 8/3, 20/11, Trung thu — chỉ gói được trong dịp, lãi cao (xem Sổ nấu 🍳)',
  },
  // ──────────────────────────────────────────────
  // GĐ1490 — KHU ĂN TẠI CHỢ: khách mua món nấu tươi có thể ngồi lại ăn (đối chiếu khu dine-in)
  // ──────────────────────────────────────────────
  {
    type: 'dining_table', name: 'Bàn ăn', price: 120000, unlock: 30, size: [1.2, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], seatSlots: 4,
    desc: 'Khu ăn tại chỗ: khách mua món nấu tươi ngồi lại ăn ở đây (tối đa 4 ghế kề bàn)',
  },
  {
    type: 'chair', name: 'Ghế ăn', price: 40000, unlock: 30, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Đặt sát bàn ăn (trong tầm 1 ô kề) mới tính là một chỗ ngồi',
  },
  // ──────────────────────────────────────────────
  // GĐ1493 — MÁY TỰ PHỤC VỤ: khách ghé chơi/thử rồi trả phí mỗi lượt (không cần nhân viên)
  // ──────────────────────────────────────────────
  {
    type: 'vending_drink', name: 'Máy bán nước tự động', price: 120000, unlock: 30, size: [0.8, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách ghé lấy nước trả phí 1.200đ/lượt — giá máy tương đương ~100 lượt (đi cùng khu ăn uống)',
  },
  {
    type: 'massage_chair', name: 'Ghế mát-xa chân', price: 240000, unlock: 38, size: [0.8, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách ngồi mát-xa chân một lượt trả 2.400đ rồi mới đi mua hàng (GĐ1537)',
  },
  {
    type: 'shoe_shine', name: 'Máy đánh giày', price: 200000, unlock: 42, size: [0.7, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách đặt chân vào máy đánh bóng giày, trả 2.000đ/lượt (GĐ1547)',
  },
  {
    type: 'cotton_candy', name: 'Máy kẹo bông', price: 250000, unlock: 46, size: [0.7, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Bỏ tiền máy quay ra cây kẹo bông, 2.500đ/lượt — trẻ con mê (GĐ1548)',
  },
  {
    type: 'scale_machine', name: 'Máy cân sức khỏe', price: 100000, unlock: 25, size: [0.6, 0.6], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách lên cân xem kết quả trả phí 1.000đ/lượt — đặc trưng tiệm tạp hóa Việt',
  },
  {
    type: 'claw_machine', name: 'Máy gắp thú', price: 180000, unlock: 30, size: [0.8, 0.7], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách gắp thú bông trả phí 1.800đ/lượt, nhỏ con nấn ná không chịu đi (đi cùng khu ăn uống)',
  },
  // ──────────────────────────────────────────────
  // GĐ1494 — NHÀ VỆ SINH: tiện ích khu ăn tại chỗ, hoàn vốn chậm (~500 lượt); khách ăn xong cần
  // ──────────────────────────────────────────────
  {
    type: 'toilet_squat', name: 'Nhà vệ sinh ngồi xổm', price: 250000, unlock: 30, size: [0.8, 0.8], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Khách ăn xong ghé trả phí 500đ/lượt; thiếu bồn lúc siêu thị còn nhỏ thì khách chịu thôi',
  },
  {
    type: 'toilet_porcelain', name: 'Nhà vệ sinh bồn sứ', price: 1200000, unlock: 36, size: [0.9, 0.9], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Bồn sứ có bể phóng sạch sẽ hơn, khách trả 2.000đ/lượt',
  },
  {
    type: 'toilet_smart', name: 'Nhà vệ sinh thông minh', price: 4000000, unlock: 45, size: [1.0, 0.9], tiers: 0, slots: 0, capacity: 0,
    categories: [], desc: 'Bồn thông minh tự rửa, khách trả 8.000đ/lượt — tiện nghi của siêu thị lớn',
  },
  // ──────────────────────────────────────────────
  // GĐ1504 — ĐỒ DÙNG BẾP & TRANG TRÍ VIỆT: đặt kèm cộng điểm 🩷 (kéo khách theo sao
  // danh tiếng — mục 7.2 tài liệu tham khảo); giá rẻ–trung, tạp hóa nhỏ cũng trang trí được
  // ──────────────────────────────────────────────
  {
    type: 'tham_chan', name: 'Thảm chùi chân', price: 15000, unlock: 5, size: [0.8, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 3, desc: 'Đặt trước cửa cho khách chùi chân — sạch sàn, cửa tiệm nhìn ra đẹp mắt (+3 🩷)',
  },
  {
    type: 'thung_rac', name: 'Thùng rác có nắp', price: 20000, unlock: 5, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 2, desc: 'Góc tiệm sạch sẽ, khách không phải cầm rác trên tay (+2 🩷)',
  },
  {
    type: 'den_long', name: 'Đèn lồng đỏ', price: 45000, unlock: 8, size: [0.4, 0.4], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 7, desc: 'Đèn lồng đỏ treo cao phát ánh sáng ấm — đáng tiền mỗi dịp lễ (+7 🩷)',
  },
  {
    type: 'kho_dao', name: 'Giá dao nam châm', price: 60000, unlock: 10, size: [0.6, 0.2], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 6, desc: 'Giá dao gắn cạnh quầy cắt pound — gọn gàng như tiệm thịt thật (+6 🩷)',
  },
  {
    type: 'ke_gia_vi', name: 'Kệ gia vị', price: 80000, unlock: 12, size: [0.6, 0.4], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 8, desc: 'Lọ muối, tiêu, ớt, bột ngọt xếp ngay ngắn — mùi vị nhìn là thấy (+8 🩷)',
  },
  {
    type: 'ke_chen', name: 'Kệ chén bát', price: 90000, unlock: 14, size: [0.7, 0.4], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 8, desc: 'Chén đĩa xếp tầng cho khu quầy đồ nấu nhìn ra chuyên nghiệp (+8 🩷)',
  },
  {
    type: 'tranh_dong_ho', name: 'Tranh Đông Hồ', price: 120000, unlock: 15, size: [0.6, 0.1], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 10, desc: 'Tranh dân gian Đông Hồ treo tường — chữ Hán, cá chép, gà đàn: khách quý nhìn là mến (+10 🩷)',
  },
  {
    type: 'bon_rua', name: 'Bồn rửa inox', price: 150000, unlock: 18, size: [0.9, 0.6], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 5, desc: 'Bồn rửa inox cho khu quầy nấu — rửa tay, rửa rau tiện sạch (+5 🩷)',
  },
  // ──────────────────────────────────────────────
  // GĐ1505 — BẢNG HIỆU VINH DANH ĐẶC SẢN 4 MIỀN: bày đủ bộ đặc sản miền (mối lái vùng xa,
  // tham khảo hệ "cờ vinh danh ẩm thực") thì bảng sáng +4 🩷 và đặc sản miền đó +2% giá;
  // đủ bộ mà mọi loại lên 1★ → +12 🩷 (tổng 16) và +5% giá. Tính điểm ở data/regionFlags.ts
  // ──────────────────────────────────────────────
  {
    type: 'bang_hieu_bac', name: 'Bảng hiệu đặc sản miền Bắc', price: 260000, unlock: 42, size: [0.8, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 4, desc: 'Bảng vải đỏ treo cao — bày đủ Trà shan tuyết + Cốm Vòng thì sáng (+4 🩷, đặc sản miền Bắc +2% giá)',
  },
  {
    type: 'bang_hieu_trung', name: 'Bảng hiệu đặc sản miền Trung', price: 260000, unlock: 42, size: [0.8, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 4, desc: 'Bảng vải vàng ruộm — bày đủ Mè xửng + Nem chua thì sáng (+4 🩷, đặc sản miền Trung +2% giá)',
  },
  {
    type: 'bang_hieu_nam', name: 'Bảng hiệu đặc sản miền Nam', price: 260000, unlock: 42, size: [0.8, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 4, desc: 'Bảng vải xanh lá — bày đủ 5 loại đặc sản miền Nam thì sáng (+4 🩷, đặc sản miền Nam +2% giá)',
  },
  {
    type: 'bang_hieu_tay_nguyen', name: 'Bảng hiệu đặc sản Tây Nguyên', price: 260000, unlock: 42, size: [0.8, 0.15], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 4, desc: 'Bảng vải nâu đất — bày đủ Khô bò + Mắc khén thì sáng (+4 🩷, đặc sản Tây Nguyên +2% giá)',
  },
  // ──────────────────────────────────────────────
  // GĐ1510 — TRANG TRÍ "KHOE" TẦNG 2–3 (mục 2.3/D6 tài liệu tham khảo: landmark đắt cuối game,
  // điểm/đồng THẤP hẳn đồ rẻ — đồ rẻ hiệu quả trên từng đồng, đồ đắt để tự hào cơ ngơi).
  // Đồ bếp GĐ1504 ≈ 84 🩷/triệu; bình gốm ≈ 13; trống đồng ≈ 7; chùa Một Cột 5.
  // ──────────────────────────────────────────────
  {
    type: 'binh_bat_trang', name: 'Bình gốm Bát Tràng', price: 900000, unlock: 36, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 12, desc: 'Bình men lam vẽ tay cao ngang hông — góc tiệm sang hẳn lên (+12 🩷)',
  },
  {
    type: 'trong_dong', name: 'Trống đồng Đông Sơn', price: 2500000, unlock: 45, size: [0.9, 0.9], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 18, desc: 'Bản sao trống đồng đặt bệ gỗ — món khoe của siêu thị có tiếng (+18 🩷)',
  },
  {
    type: 'chua_mot_cot', name: 'Mô hình chùa Một Cột', price: 6000000, unlock: 55, size: [1.2, 1.2], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 30, desc: 'Mô hình chùa trên hồ sen thu nhỏ — niềm tự hào của cơ ngơi lớn (+30 🩷)',
  },
  // GĐ1513 — ĐỒ TRANG TRÍ THEO DỊP (mục festival-gated decor tài liệu Midnight, Việt hoá): chỉ bán
  // trong cửa sổ lễ của lịch game → lý do ghé lại mỗi mùa lễ; mua rồi giữ mãi. Unlock > golden 30.
  {
    type: 'mam_ngu_qua', name: 'Mâm ngũ quả ngày Tết', price: 700000, unlock: 32, size: [0.6, 0.6], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 10, festival: 'tet', desc: 'Chỉ bán dịp Tết Nguyên Đán — mâm ngũ quả bày quầy, giữ không khí Tết quanh năm (+10 🩷)',
  },
  {
    type: 'den_ong_sao', name: 'Đèn ông sao Trung thu', price: 500000, unlock: 32, size: [0.5, 0.5], tiers: 0, slots: 0, capacity: 0,
    categories: [], decor: 8, festival: 'trung_thu', desc: 'Chỉ bán dịp Tết Trung thu — đèn ông sao năm cánh treo cột (+8 🩷)',
  },
];

export const furnitureDef = (type: FurnitureType) => FURNITURE.find((f) => f.type === type)!;

/** Tổng số ô hàng (tầng × ô mỗi tầng); `Furniture.tiers` có đúng chừng này phần tử, ô i nằm ở tầng i / slots. */
export const slotCount = (type: FurnitureType) => furnitureDef(type).tiers * furnitureDef(type).slots;

/** Kích thước sàn sau khi xoay rot × 90°. */
export function footprint(type: FurnitureType, rot: number): [number, number] {
  const [w, d] = furnitureDef(type).size;
  return rot % 2 === 0 ? [w, d] : [d, w];
}

/** Hướng mặt trước (rot 0 = quay ra cửa, trục +z). */
export function frontDir(rot: number): [number, number] {
  return [[0, 1], [1, 0], [0, -1], [-1, 0]][((rot % 4) + 4) % 4] as [number, number];
}
