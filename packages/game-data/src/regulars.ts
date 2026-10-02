import { nullProto } from './safe-map';
export interface RegularCustomerPerk {
  threshold: number; // Mốc điểm thân thiết (ví dụ: 15, 40, 80)
  title: string;
  description: string;
  effectType: 'bonus_tip' | 'extra_item' | 'frequent_visit';
  value: number;
}

export interface RegularCustomerDefinition {
  id: string;
  name: string;
  roleTitle: string;
  bio: string;
  avatarColor: number; // Màu đại diện pixel
  favoriteProductIds: string[];
  patienceSeconds: number; // Thời gian kiên nhẫn tối đa (giây)
  priceSensitivity: number; // 0.8 = ít nhạy giá, 1.3 = rất nhạy giá
  dialogues: {
    greeting: string;
    satisfied: string;
    walkout: string;
  };
  perks: RegularCustomerPerk[];
}

export const REGULAR_CUSTOMERS: RegularCustomerDefinition[] = [
  {
    id: 'ba_nam',
    name: 'Bà Năm Bán Xôi',
    roleTitle: 'Chủ gánh xôi đầu ngõ',
    bio: 'Bà Năm bán xôi sáng ở góc hẻm đã hơn 20 năm. Rất quý tiệm tạp hóa vì hay ghé mua trà và sữa đặc pha cà phê cho khách ăn xôi.',
    avatarColor: 0xe6a15c,
    favoriteProductIds: ['beverage_tea', 'instant_coffee_vinacafe', 'condensed_milk_ong_tho', 'mineral_water_lavie'],
    patienceSeconds: 45,
    priceSensitivity: 0.85,
    dialogues: {
      greeting: 'Ủa cháu, cho bà lấy mấy hộp sữa đặc với gói trà thơm nghen!',
      satisfied: 'Cảm ơn cháu nhé, buôn bán đắt hàng nha con!',
      walkout: 'Tiệm hết mấy thứ bà cần rồi, thôi để bà ghé chợ vậy...',
    },
    perks: [
      { threshold: 15, title: 'Tình làng nghĩa xóm', description: 'Ghé tiệm thường xuyên hơn khi mở cửa buổi sáng.', effectType: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Hộp xôi lót dạ', description: 'Bà Năm hay gửi tiền boa +10% giá trị hóa đơn.', effectType: 'bonus_tip', value: 0.1 },
      { threshold: 80, title: 'Khách ruột thân thiết', description: 'Mua nhiều hơn 1 món mỗi lần ghé mua hàng.', effectType: 'extra_item', value: 1 },
    ],
  },
  {
    id: 'chu_ba',
    name: 'Chú Ba Xe Ôm',
    roleTitle: 'Tài xế hẻm quen thuộc',
    bio: 'Chú Ba chạy xe ôm từ thời xe cub 81 đến giờ. Giữa các cuốc khách, chú thích tạt vào tiệm làm lon nước tăng lực hoặc chai nước mát.',
    avatarColor: 0x4876a3,
    favoriteProductIds: ['energy_drink_redbull', 'mineral_water_lavie', 'instant_coffee_vinacafe', 'soft_drink_coca'],
    patienceSeconds: 30,
    priceSensitivity: 1.0,
    dialogues: {
      greeting: 'Cho chú một lon bò húc mát lạnh với chai nước nha!',
      satisfied: 'Tuyệt vời, có sức chạy thêm cuốc khách ra bến xe rồi!',
      walkout: 'Hết nước ướp lạnh rồi hả bay? Chán ghê, chú đi cuốc khác đây.',
    },
    perks: [
      { threshold: 15, title: 'Bạn đường tin cậy', description: 'Thường ghé tiệm vào buổi trưa và chiều.', effectType: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Tiền thối làm tròn', description: 'Chú Ba hào sảng boa thêm +10% tiền thừa.', effectType: 'bonus_tip', value: 0.1 },
      { threshold: 80, title: 'Ghé ủng hộ đều đặn', description: 'Luôn mua thêm gói bánh hoặc kẹo nhai dọc đường.', effectType: 'extra_item', value: 1 },
    ],
  },
  {
    id: 'be_na',
    name: 'Bé Na Học Sinh',
    roleTitle: 'Học sinh tiểu học trong xóm',
    bio: 'Tan trường là Na cùng bạn rủ nhau vào tiệm ngắm nghía kệ kẹo và tủ kem mát lạnh. Tiền tiêu vặt có hạn nhưng rất trung thành.',
    avatarColor: 0xef7998,
    favoriteProductIds: ['bubblegum_big_babol', 'snack_oishi', 'yogurt_vinamilk', 'fresh_milk_vinamilk'],
    patienceSeconds: 22,
    priceSensitivity: 1.25,
    dialogues: {
      greeting: 'Cô chú ơi! Có kẹo thổi bong bóng Big Babol mới về chưa ạ?',
      satisfied: 'Dạ con cảm ơn cô chú, kẹo ngon quá!',
      walkout: 'Hết kẹo với sữa chua rồi, con về má kẻo trễ cơm ạ...',
    },
    perks: [
      { threshold: 15, title: 'Ríu rít tan trường', description: 'Tan học ghé tiệm rủ thêm bạn bè.', effectType: 'frequent_visit', value: 0.25 },
      { threshold: 40, title: 'Được mẹ thưởng', description: 'Mua nhiều món ăn vặt hơn mỗi lần ghé.', effectType: 'extra_item', value: 1 },
      { threshold: 80, title: 'Tiệm ruột tuổi thơ', description: 'Nhận được sự tin tưởng tuyệt đối, boa thêm tiền lẻ.', effectType: 'bonus_tip', value: 0.12 },
    ],
  },
  {
    id: 'chi_lan',
    name: 'Chị Lan Văn Phòng',
    roleTitle: 'Chuyên viên làm việc tại nhà',
    bio: 'Chị Lan chuyển về hẻm năm ngoái, hay đặt hàng nhanh để tranh thủ giờ nghỉ trưa. Chuộng đồ uống bổ dưỡng và sữa tươi.',
    avatarColor: 0x8a63b0,
    favoriteProductIds: ['fresh_milk_vinamilk', 'bird_nest_drink_sanest', 'stick_bread', 'yogurt_vinamilk'],
    patienceSeconds: 25,
    priceSensitivity: 0.8,
    dialogues: {
      greeting: 'Em lấy giúp chị lốc sữa tươi với hộp yến sào nha!',
      satisfied: 'Cảm ơn em nhiều, tiệm phục vụ nhanh và chu đáo ghê!',
      walkout: 'Đợi hơi lâu mà lại không thấy đồ cần mua, chị về họp online gấp.',
    },
    perks: [
      { threshold: 15, title: 'Khách hàng hiện đại', description: 'Ưu tiên ghé tiệm vào giờ nghỉ trưa.', effectType: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Ủng hộ dịch vụ tốt', description: 'Luôn boa thêm +12% khi được phục vụ nhanh.', effectType: 'bonus_tip', value: 0.12 },
      { threshold: 80, title: 'Giỏ hàng tươm tất', description: 'Mua thêm đồ ăn kèm cho bữa xế.', effectType: 'extra_item', value: 1 },
    ],
  },
  {
    id: 'bac_tam',
    name: 'Bác Tám Tổ Trưởng',
    roleTitle: 'Cán bộ hưu trí gương mẫu',
    bio: 'Bác Tám lo việc tổ dân phố, đi kiểm tra trật tự hẻm là tiện ghé tiệm mua gia vị, gạo, nước mắm cho gia đình.',
    avatarColor: 0x588b6b,
    favoriteProductIds: ['fish_sauce_nam_ngu', 'cooking_oil_simply', 'seasoning_knorr', 'instant_noodle_hao_hao'],
    patienceSeconds: 40,
    priceSensitivity: 1.15,
    dialogues: {
      greeting: 'Chào cháu! Xem giùm bác chai nước mắm Nam Ngư với bịch hạt nêm nhé.',
      satisfied: 'Tốt lắm cháu! Hàng hóa đầy đủ, bà con lối xóm ai cũng khen.',
      walkout: 'Hết gia vị rồi à? Tiệm nhớ dặn mối nhập sớm nhé cháu.',
    },
    perks: [
      { threshold: 15, title: 'Uy tín khu phố', description: 'Khích lệ hàng xóm ghé tiệm thường xuyên hơn.', effectType: 'frequent_visit', value: 0.15 },
      { threshold: 40, title: 'Ủng hộ kinh tế hẻm', description: 'Ghé mua định kỳ số lượng nhiều hơn.', effectType: 'extra_item', value: 1 },
      { threshold: 80, title: 'Lời khen danh dự', description: 'Tặng thêm khoản thưởng khuyến khích tiệm sạch đẹp.', effectType: 'bonus_tip', value: 0.15 },
    ],
  },
  {
    id: 'anh_tuan',
    name: 'Anh Tuấn Lập Trình',
    roleTitle: 'Kỹ sư công nghệ thức đêm',
    bio: 'Cú đêm chính hiệu của xóm. Cứ tầm chiều tối hoặc đêm là chạy ra mua mì gói, xúc xích và nước tăng lực để nạp năng lượng fix bug.',
    avatarColor: 0x4a9388,
    favoriteProductIds: ['instant_noodle_hao_hao', 'sausage_vissan', 'energy_drink_redbull', 'canned_fish_three_ladies'],
    patienceSeconds: 32,
    priceSensitivity: 0.9,
    dialogues: {
      greeting: 'Shop ơi, còn xúc xích Vissan với mì Hảo Hảo chua cay không?',
      satisfied: 'Cứu tinh của đêm nay rồi, cảm ơn shop!',
      walkout: 'Toàn đồ hết hàng... thôi đành nhịn đói code tiếp vậy.',
    },
    perks: [
      { threshold: 15, title: 'Cú đêm làm bạn', description: 'Thường xuyên ghé mua đồ vào các ca tối muộn.', effectType: 'frequent_visit', value: 0.25 },
      { threshold: 40, title: 'Combo tăng ca', description: 'Luôn mua thêm đồ ăn nhẹ chống đói đêm.', effectType: 'extra_item', value: 1 },
      { threshold: 80, title: 'Dự án thành công', description: 'Nhận thưởng dự án nên thường xuyên boa đậm.', effectType: 'bonus_tip', value: 0.15 },
    ],
  },
];

export const REGULAR_CUSTOMERS_MAP: Record<string, RegularCustomerDefinition> = nullProto(Object.fromEntries(
  REGULAR_CUSTOMERS.map((c) => [c.id, c])
));
