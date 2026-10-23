import { productById } from './products';
import type { CharacterArchetype, HairStyle, PropKind } from '../render/characterModel';

export type PerkEffect = 'bonus_tip' | 'extra_item' | 'frequent_visit' | 'refer_friend' | 'bulk_buy' | 'festival';

export interface RegularPerk {
  /** Mốc điểm thân thiết. */
  threshold: number;
  title: string;
  description: string;
  effect: PerkEffect;
  value: number;
}

/** Ngoại hình riêng để mỗi khách quen nhìn là nhận ra. */
export interface RegularLook {
  archetype: CharacterArchetype;
  hairStyle: HairStyle;
  hair: number;
  /** Đạo cụ nghề / dấu hiệu nhận biết. */
  props: PropKind[];
  glasses: boolean;
  /** Đội mũ màu hatColor (chỉ khi archetype không có mũ nghề riêng). */
  hat?: boolean;
}

export interface RegularDef {
  id: string;
  name: string;
  role: string;
  bio: string;
  /** Màu áo, để người chơi nhận ra từ xa. */
  color: number;
  hatColor: number;
  look: RegularLook;
  favorites: string[];
  /** 0.8 = ít nhạy giá, 1.3 = rất nhạy giá (nhân với độ nhạy của món). */
  priceSensitivity: number;
  /** Chờ ở quầy tối đa bao nhiêu phút game. */
  patienceMinutes: number;
  /** Giờ hay ghé (phút trong ngày). */
  visitFrom: number;
  visitUntil: number;
  /** Cấp tiệm để khách này bắt đầu ghé. */
  unlock: number;
  lines: { greeting: string; satisfied: string; walkout: string };
  perks: RegularPerk[];
}

/** Tiến độ thân thiết với một khách quen (được lưu). */
export interface RegularProgress {
  friendship: number;
  visits: number;
  lastVisitDay?: number;
  lastFriendshipDay?: number;
  perks: string[];
  /** Món ưa thích người chơi đã phát hiện (khách mua được). */
  discovered: string[];
}

const perks = (tipAt: number, tip: number, extraAt: number, frequent: string, extra: string, tipText: string): RegularPerk[] => [
  { threshold: 15, title: 'Ghé thường hơn', description: frequent, effect: 'frequent_visit', value: 0.2 },
  { threshold: extraAt, title: 'Mua thêm món', description: extra, effect: 'extra_item', value: 1 },
  { threshold: tipAt, title: 'Hay boa', description: tipText, effect: 'bonus_tip', value: tip },
];

export const REGULARS: RegularDef[] = [
  {
    id: 'ba_nam', name: 'Bà Năm bán xôi', role: 'Chủ gánh xôi đầu ngõ',
    bio: 'Bán xôi sáng ở góc hẻm hơn 20 năm, hay ghé mua sữa với nước cho khách ăn xôi.',
    color: 0xe6a15c, hatColor: 0x8e5b2c,
    look: { archetype: 'elder_woman', hairStyle: 'bun', hair: 0xd0d5dd, props: ['non_la', 'xoi_basket'], glasses: false }, favorites: ['sua', 'nuoc', 'caphe', 'trung'],
    priceSensitivity: 0.85, patienceMinutes: 60, visitFrom: 6 * 60, visitUntil: 10 * 60, unlock: 1,
    lines: { greeting: 'Cháu ơi, bà lấy mấy hộp sữa nghen!', satisfied: 'Cảm ơn cháu, buôn bán đắt hàng nha!', walkout: 'Hết đồ bà cần rồi, thôi bà ra chợ...' },
    perks: perks(40, 0.1, 80, 'Sáng nào cũng ghé.', 'Mua thêm một món mỗi lần ghé.', 'Boa thêm 10% hóa đơn.'),
  },
  {
    id: 'chu_ba', name: 'Chú Ba xe ôm', role: 'Tài xế hẻm quen thuộc',
    bio: 'Chạy xe ôm từ thời cub 81. Giữa các cuốc khách hay tạt vào làm chai nước mát.',
    color: 0x4876a3, hatColor: 0x2c3e50,
    look: { archetype: 'worker_driver', hairStyle: 'buzz', hair: 0x222222, props: ['phone'], glasses: false, hat: true }, favorites: ['nuoc', 'ngot', 'tangluc', 'caphe'],
    priceSensitivity: 1.0, patienceMinutes: 35, visitFrom: 10 * 60, visitUntil: 17 * 60, unlock: 2,
    lines: { greeting: 'Cho chú chai nước mát nha!', satisfied: 'Có sức chạy thêm cuốc nữa rồi!', walkout: 'Hết nước rồi hả? Chú đi cuốc khác đây.' },
    perks: perks(40, 0.1, 80, 'Hay ghé buổi trưa, buổi chiều.', 'Mua thêm gói bánh dọc đường.', 'Hào sảng boa thêm 10%.'),
  },
  {
    id: 'be_na', name: 'Bé Na học sinh', role: 'Học sinh tiểu học trong xóm',
    bio: 'Tan trường là rủ bạn vào ngắm kệ kẹo. Tiền tiêu vặt ít nhưng rất trung thành.',
    color: 0xef7998, hatColor: 0xf1c40f,
    look: { archetype: 'student_girl', hairStyle: 'pigtails', hair: 0x4e311f, props: ['lollipop'], glasses: false }, favorites: ['banh', 'snack', 'kem', 'suachua'],
    priceSensitivity: 1.3, patienceMinutes: 25, visitFrom: 16 * 60, visitUntil: 18 * 60 + 30, unlock: 3,
    lines: { greeting: 'Cô chú ơi, có bánh kẹo mới chưa ạ?', satisfied: 'Con cảm ơn, ngon quá!', walkout: 'Hết kẹo rồi, con về kẻo má la...' },
    perks: perks(80, 0.12, 40, 'Tan học rủ thêm bạn ghé.', 'Được mẹ thưởng, mua nhiều hơn.', 'Tiệm ruột tuổi thơ, boa tiền lẻ.'),
  },
  {
    id: 'bac_tam', name: 'Bác Tám tổ trưởng', role: 'Cán bộ hưu trí',
    bio: 'Lo việc tổ dân phố, đi một vòng hẻm là tiện ghé mua gia vị, gạo cho nhà.',
    color: 0x588b6b, hatColor: 0xecf0f1,
    look: { archetype: 'elder_man', hairStyle: 'plain', hair: 0xecf0f1, props: ['notebook'], glasses: true }, favorites: ['giavi', 'gao', 'dauan', 'mi'],
    priceSensitivity: 1.15, patienceMinutes: 50, visitFrom: 8 * 60, visitUntil: 11 * 60, unlock: 7,
    lines: { greeting: 'Chào cháu! Lấy giùm bác gói gia vị nhé.', satisfied: 'Hàng đầy đủ, bà con ai cũng khen.', walkout: 'Hết hàng rồi à? Nhớ nhập sớm nhé cháu.' },
    perks: perks(80, 0.15, 40, 'Khuyên hàng xóm ghé tiệm.', 'Mua số lượng nhiều hơn.', 'Thưởng thêm vì tiệm sạch đẹp.'),
  },
  {
    id: 'chi_lan', name: 'Chị Lan văn phòng', role: 'Làm việc tại nhà',
    bio: 'Mới chuyển về hẻm, hay tranh thủ giờ nghỉ trưa mua nhanh sữa chua, bánh mì.',
    color: 0x8a63b0, hatColor: 0x5b3f78,
    look: { archetype: 'office_lady', hairStyle: 'ponytail', hair: 0x6e472e, props: ['handbag'], glasses: false }, favorites: ['suachua', 'sua', 'banhmi', 'traicay'],
    priceSensitivity: 0.8, patienceMinutes: 25, visitFrom: 11 * 60 + 30, visitUntil: 13 * 60 + 30, unlock: 19,
    lines: { greeting: 'Em lấy giúp chị lốc sữa chua nha!', satisfied: 'Tiệm phục vụ nhanh ghê!', walkout: 'Đợi lâu mà không có đồ, chị về họp gấp.' },
    perks: perks(40, 0.12, 80, 'Giờ nghỉ trưa là ghé.', 'Mua thêm đồ ăn xế.', 'Boa thêm 12% khi được phục vụ nhanh.'),
  },
  {
    id: 'anh_tuan', name: 'Anh Tuấn lập trình', role: 'Kỹ sư thức đêm',
    bio: 'Cú đêm của xóm. Chiều tối là chạy ra mua mì, nước tăng lực để thức sửa lỗi.',
    color: 0x4a9388, hatColor: 0x1b2631,
    look: { archetype: 'coder_guy', hairStyle: 'spiky', hair: 0x1a1e24, props: ['laptop'], glasses: true }, favorites: ['mi', 'tangluc', 'snack', 'bia'],
    priceSensitivity: 0.9, patienceMinutes: 40, visitFrom: 19 * 60, visitUntil: 22 * 60, unlock: 16,
    lines: { greeting: 'Shop ơi, còn mì gói không?', satisfied: 'Cứu tinh của đêm nay rồi!', walkout: 'Toàn hết hàng... nhịn đói code vậy.' },
    perks: perks(80, 0.15, 40, 'Ca tối nào cũng ghé.', 'Mua thêm đồ ăn chống đói đêm.', 'Có thưởng dự án nên boa đậm.'),
  },
  {
    id: 'thang_barber', name: 'Chú Thắng cắt tóc', role: 'Thợ cắt tóc trong hẻm',
    bio: 'Mở tiệm cắt tóc cum cúp một chỗ. Nghỉ trưa hay tạt qua mua cà phê với bánh để tiếp khách.',
    color: 0x6d4c2f, hatColor: 0x2c3e50,
    look: { archetype: 'barber', hairStyle: 'side_part', hair: 0x111111, props: [], glasses: false }, favorites: ['caphe', 'banh', 'nuoc', 'x_khan_giay'],
    priceSensitivity: 0.9, patienceMinutes: 30, visitFrom: 8 * 60, visitUntil: 14 * 60, unlock: 5,
    lines: { greeting: 'Bạn ơi, cho tôi ly cà phê với ổ bánh nghen!', satisfied: 'Ngon, khách cắt tóc xong khen tiệm sao mua được đồ ngon thế!', walkout: 'Hết cà phê với bánh rồi hả? Khách chờ mãi.' },
    perks: perks(40, 0.12, 80, 'Nghỉ trưa nào cũng ghé.', 'Sang quán rủ thêm thợ cả xóm.', 'Khách đông nên boa hậu hĩnh.'),
  },
  {
    id: 'bac_hung_me', name: 'Bác Hùng thợ máy', role: 'Chủ tiệm sửa xe máy',
    bio: 'Sửa xe máy đầu hẻm. Tay bẩn, nghỉ ca nào cũng cần nước tăng lực với mì gói bỏ túi.',
    color: 0x4a4a4a, hatColor: 0x2f3640,
    look: { archetype: 'mechanic', hairStyle: 'buzz', hair: 0x8a929a, props: ['oil_can'], glasses: false }, favorites: ['tangluc', 'mi', 'nuoc', 'snack'],
    priceSensitivity: 1.1, patienceMinutes: 40, visitFrom: 11 * 60, visitUntil: 15 * 60, unlock: 6,
    lines: { greeting: 'Cậu ơi, bán cho bác lon bò húc cùng gói mì!', satisfied: 'Nhờ tiệm này mà bác sửa xe đỡ khát khô cổ.', walkout: 'Hết nước với mì rồi hả? Bác sửa tới trưa đó.' },
    perks: perks(40, 0.1, 80, 'Giữa ca nào cũng ghé.', 'Giới thiệu thợ xóm qua mua.', 'Boa thêm vì quen mặt lâu năm.'),
  },
  {
    id: 'co_mai_bar', name: 'Cô Mai pha chế', role: 'Quản quán cà phê vỉa hè',
    bio: 'Chạy quán nước đầu phố. Hết sữa đặc hay cà phê là chạy sang tiệm lấy gấp.',
    color: 0xd35a7a, hatColor: 0x5b3f78,
    look: { archetype: 'barista', hairStyle: 'ponytail', hair: 0x7b3f1d, props: [], glasses: false }, favorites: ['sua', 'caphe', 'x_ca_phe_lon', 'x_duong'],
    priceSensitivity: 0.8, patienceMinutes: 25, visitFrom: 6 * 60, visitUntil: 9 * 60, unlock: 5,
    lines: { greeting: 'Cháu bán cho cô lốc sữa đặc với túi cà phê nghen!', satisfied: 'Có hàng ngon quán cô mới đông khách được.', walkout: 'Hết sữa đặc rồi hả? Quán cô mai treo bảng hết cà phê rồi.' },
    perks: perks(15, 0.15, 40, 'Sáng nào cũng ghé trước khi mở quán.', 'Lấy hàng số lượng lớn cho quán.', 'Quán cô đông, mua thêm không kể giá.'),
  },
  {
    id: 'bac_si_hai', name: 'Bác Hải bác sĩ', role: 'Bác sĩ phòng mạch tư',
    bio: 'Mở phòng mạch trong xóm. Bệnh nhân đông, hay ghé mua khẩu trang, sữa với hoa quả cho vợ.',
    color: 0x5dade2, hatColor: 0xecf0f1,
    look: { archetype: 'doctor', hairStyle: 'side_part', hair: 0x8a929a, props: [], glasses: true }, favorites: ['sua', 'traicay', 'x_khau_trang', 'banhmi'],
    priceSensitivity: 0.85, patienceMinutes: 20, visitFrom: 12 * 60, visitUntil: 18 * 60, unlock: 8,
    lines: { greeting: 'Cho tôi lấy lốc sữa, cân trái cây, ít khẩu trang nhé!', satisfied: 'Tiệm đầy đủ đồ ngon, bệnh nhân khen phòng mạch.', walkout: 'Hết khẩu trang rồi à? Mai phòng mạch đông bệnh lắm.' },
    perks: perks(80, 0.15, 40, 'Tan ca nào cũng ghé.', 'Bảo cả đội y tá qua mua.', 'Bệnh nhân hậu tạ nên boa đậm.'),
  },
  {
    id: 'anh_giao_ngan', name: 'Anh Giao ngân hàng', role: 'Giao dịch viên chi nhánh',
    bio: 'Làm ở chi nhánh ngân hàng cuối đường. Giờ nghỉ trưa hay ghé mua cà phê với bánh qua quý.',
    color: 0x2c3e50, hatColor: 0x17202a,
    look: { archetype: 'banker', hairStyle: 'side_part', hair: 0x1a1e24, props: ['phone'], glasses: true }, favorites: ['caphe', 'banh', 'sua', 'x_khan_giay'],
    priceSensitivity: 0.75, patienceMinutes: 20, visitFrom: 12 * 60, visitUntil: 14 * 60, unlock: 9,
    lines: { greeting: 'Cho anh một ly cà phê với hộp bánh nghen!', satisfied: 'Tiệm toàn đồ ngon, đồng nghiệp khen hoài.', walkout: 'Hết hàng rồi à? Xíu anh phải lên chi nhánh họp.' },
    perks: perks(80, 0.12, 40, 'Nghỉ trưa nào cũng ghé.', 'Rủ cả nhóm nhân viên chi nhánh qua.', 'Tiết kiệm tốt nên boa ổn định.'),
  },
  {
    id: 'chu_tu_ho', name: 'Chú Tư công nhân', role: 'Công nhân lò gạch',
    bio: 'Làm lò gạch cuối làng, mồ hôi nhiều. Mỗi ca tan là cần bia mát với nước tăng lực bù sức.',
    color: 0xe67e22, hatColor: 0x3b4a5c,
    look: { archetype: 'construction_worker', hairStyle: 'buzz', hair: 0x222222, props: [], glasses: false }, favorites: ['bia', 'tangluc', 'nuoc', 'banh'],
    priceSensitivity: 1.25, patienceMinutes: 45, visitFrom: 17 * 60, visitUntil: 20 * 60, unlock: 10,
    lines: { greeting: 'Bạn ơi, bán cho chú vài lon bia với nước tăng lực!', satisfied: 'Uống phát là hết mệt, mai còn làm tiếp được.', walkout: 'Hết bia rồi hả? Tan ca mà khó khát quá.' },
    perks: perks(40, 0.12, 80, 'Tan ca nào cũng ghé.', 'Rủ cả đội thợ lò ghé mua.', 'Được thưởng ca tốt nên boa thêm.'),
  },
  {
    id: 'co_mua_hoa', name: 'Cô Mùa bán hoa', role: 'Chủ tiệm hoa đầu phố',
    bio: 'Tỉa hoa, cắm bình cả ngày. Cần chậu, phân bón với thùng xốp nên hay mua buôn theo lô.',
    color: 0xe84393, hatColor: 0x8e44ad,
    look: { archetype: 'office_lady', hairStyle: 'long', hair: 0x332219, props: ['flowers'], glasses: false }, favorites: ['nuoc', 'xaphong', 'x_tui_rac', 'x_bao_goi'],
    priceSensitivity: 0.85, patienceMinutes: 30, visitFrom: 7 * 60, visitUntil: 11 * 60, unlock: 12,
    lines: { greeting: 'Cô lấy ít xà phòng với bao gói, tiện thì lấy thêm luôn mấy thùng nước.', satisfied: 'Đủ đồ cắm hoa, quán cô thơm hẳn lên!', walkout: 'Hết bao gói rồi hả? Cô phải bó hoa cho khách.' },
    perks: [
      { threshold: 15, title: 'Ghé sớm mỗi sáng', description: 'Sáng nào cũng ghé trước khi mở quán hoa.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Mua buôn theo lô', description: 'Mua thêm 2 đơn vị mỗi món cần dùng.', effect: 'bulk_buy', value: 2 },
      { threshold: 80, title: 'Hoa nợ cả mùa', description: 'Boa thêm 15% cho tiệm thân quen.', effect: 'bonus_tip', value: 0.15 },
    ],
  },
  {
    id: 'chuong_tho_dien', name: 'Chú Thợ điện', role: 'Thợ sửa điện xóm',
    bio: 'Đi sửa điện khắp hẻm. Nhà nào cũng cần pin, bóng đèn với bật lửa nên hay mua theo cục lớn.',
    color: 0xf39c12, hatColor: 0x2c3e50,
    look: { archetype: 'electrician', hairStyle: 'spiky', hair: 0x4e311f, props: ['cable_coil'], glasses: false }, favorites: ['x_pin', 'x_bong_den', 'x_bat_lua', 'daugoi'],
    priceSensitivity: 1.1, patienceMinutes: 40, visitFrom: 9 * 60, visitUntil: 13 * 60, unlock: 14,
    lines: { greeting: 'Cậu ơi, bán cho chú mớ pin với bóng đèn! Cầm theo cho gọn công việc.', satisfied: 'Đủ đồ sửa điện, nhà nào cũng sáng.', walkout: 'Hết bóng đèn rồi hả? Khách chờ sáng đèn đây.' },
    perks: [
      { threshold: 15, title: 'Quen việc quen lối', description: 'Hay ghé giữa giờ làm.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Lấy đồ theo cục', description: 'Mua thêm 2 đơn vị mỗi món phụ kiện.', effect: 'bulk_buy', value: 2 },
      { threshold: 80, title: 'Thợ lành nghề', description: 'Rủ thêm thợ trong xóm qua mua.', effect: 'refer_friend', value: 1 },
    ],
  },
  {
    id: 'ba_ba_thit', name: 'Bà Ba bán thịt', role: 'Chủ hàng thịt chợ gần nhà',
    bio: 'Bán thịt ngoài chợ. Làm thân với chủ tiệm nên hay giới thiệu khách qua mua gia vị dầu ăn.',
    color: 0xc0392b, hatColor: 0xecf0f1,
    look: { archetype: 'elder_woman', hairStyle: 'curly', hair: 0x5a5f66, props: ['meat_bag'], glasses: false }, favorites: ['giavi', 'dauan', 'nuocmam', 'gao'],
    priceSensitivity: 0.9, patienceMinutes: 35, visitFrom: 11 * 60, visitUntil: 16 * 60, unlock: 16,
    lines: { greeting: 'Con ơi, bán cho bà lít nước mắm với gói gia vị nghen!', satisfied: 'Rau thịt trong chợ chấm gia vị này là hết sảy!', walkout: 'Hết nước mắm rồi hả? Chợ nhà bà nhiều khách hỏi lắm.' },
    perks: [
      { threshold: 15, title: 'Quen thợ chợ', description: 'Ghé tiệm mỗi buổi trưa.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Kéo khách chợ qua', description: 'Giới thiệu 1 khách lẻ ghé tiệm mỗi lần mua.', effect: 'refer_friend', value: 1 },
      { threshold: 80, title: 'Bà trùm chợ', description: 'Bảo cả dãy hàng thịt qua ủng hộ.', effect: 'refer_friend', value: 2 },
    ],
  },
  {
    id: 'anh_minh_nhau', name: 'Anh Minh quán nhậu', role: 'Chủ quán nhậu cuối hẻm',
    bio: 'Mở quán nhậu bình dân. Tối nào cũng cần bia, nước ngọt với đá; quen mặt nên giới thiệu bạn bè sang.',
    color: 0x2980b9, hatColor: 0x1b2631,
    look: { archetype: 'gentleman', hairStyle: 'spiky', hair: 0x222222, props: ['beer_crate'], glasses: false }, favorites: ['bia', 'ngot', 'x_nuoc_da', 'snack'],
    priceSensitivity: 1.15, patienceMinutes: 30, visitFrom: 15 * 60, visitUntil: 19 * 60, unlock: 18,
    lines: { greeting: 'Anh lấy mấy thùng bia với nước ngọt! Tối quán đông khách lắm.', satisfied: 'Quán có bia mát, khách ngồi tới khuya luôn.', walkout: 'Hết bia rồi à? Tối nay quán anh đóng cửa sớm mất.' },
    perks: [
      { threshold: 15, title: 'Nghiện đồ của quen', description: 'Ghé mỗi buổi chiều trước khi mở quán.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Bạn nhậu ghé theo', description: 'Rủ thêm 1 khách lẻ ghé tiệm.', effect: 'refer_friend', value: 1 },
      { threshold: 80, title: 'Kéo cả quán qua', description: 'Bảo cả dãy bàn qua mua, thêm 2 khách lẻ.', effect: 'refer_friend', value: 2 },
    ],
  },
  {
    id: 'co_nga_hoi', name: 'Cô Nga tổ chức hội', role: 'Hội trưởng hội phụ nữ phường',
    bio: 'Hay tổ chức hội họp, ngày hội đầu phố. Mỗi khi có tiệc là người cả xóm kéo nhau ra tiệm sắm đồ.',
    color: 0x9b59b6, hatColor: 0x5b3f78,
    look: { archetype: 'teacher', hairStyle: 'bun', hair: 0x1a1e24, props: ['megaphone'], glasses: true }, favorites: ['traicay', 'banh', 'sua', 'tra'],
    priceSensitivity: 0.8, patienceMinutes: 25, visitFrom: 8 * 60, visitUntil: 12 * 60, unlock: 20,
    lines: { greeting: 'Cho cô ít trái cây với bánh để cắm mâm ngày hội nha!', satisfied: 'Cả hội khen quà tiệm cô quá xá!', walkout: 'Hết trái cây rồi hả? Ngày hội sắp tới mất đồ cắm.' },
    perks: [
      { threshold: 15, title: 'Quen mặt hội', description: 'Ghé sáng sớm mỗi ngày.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Ngày hội nhỏ', description: 'Ngày cô ghé, cả khu đông khách hơn 20%.', effect: 'festival', value: 0.2 },
      { threshold: 80, title: 'Đại hội khách quen', description: 'Ngày cô ghé, cả khu đông khách hẳn lên 35%.', effect: 'festival', value: 0.35 },
    ],
  },
  {
    id: 'chu_cuong_xuong', name: 'Chú Cường chủ xưởng', role: 'Ông chủ xưởng gỗ',
    bio: 'Mở xưởng gỗ cuối làng. Công nhân đông, cần mua mì, dầu ăn với lại nhiều thứ theo lô nguyên xưởng.',
    color: 0x7f8c8d, hatColor: 0x2d3436,
    look: { archetype: 'gentleman', hairStyle: 'side_part', hair: 0x8a929a, props: ['wood_plank'], glasses: false }, favorites: ['gao', 'dauan', 'mi', 'xucxich'],
    priceSensitivity: 1.2, patienceMinutes: 40, visitFrom: 10 * 60, visitUntil: 14 * 60, unlock: 24,
    lines: { greeting: 'Cậu ơi, lấy theo lô: gạo, dầu ăn với xúc xích cho bữa cơm công nhân!', satisfied: 'Xưởng có cơm đủ chất, công nhân làm khỏe lắm.', walkout: 'Hết gạo tiêu rồi hả? Bữa nay xưởng đói bụng.' },
    perks: [
      { threshold: 15, title: 'Mua theo mùa', description: 'Ghé giữa giờ làm mỗi ngày.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Mua cả lô xưởng', description: 'Mua thêm 3 đơn vị mỗi món bữa ăn.', effect: 'bulk_buy', value: 3 },
      { threshold: 80, title: 'Giao thiệp xưởng', description: 'Giới thiệu thợ xưởng ghé mua.', effect: 'refer_friend', value: 2 },
    ],
  },
  {
    id: 'bac_doi_hoi', name: 'Bác Đôi ngày hội', role: 'Cụ tổ chức lễ hội làng',
    bio: 'Lo việc lễ hội làng cuối năm. Mỗi dịp hội là cả phường kéo nhau ra tiệm, kéo khách về cả làng.',
    color: 0xd35400, hatColor: 0xf1c40f,
    look: { archetype: 'elder_man', hairStyle: 'plain', hair: 0xd0d5dd, props: ['flag'], glasses: false }, favorites: ['gao', 'tra', 'nuoc', 'banh'],
    priceSensitivity: 0.7, patienceMinutes: 30, visitFrom: 7 * 60, visitUntil: 11 * 60, unlock: 28,
    lines: { greeting: 'Cháu ơi, hội làng sắp tới, bác nhờ tiệm lo gạo trà với bánh nha!', satisfied: 'Nhờ tiệm cháu mà hội làng năm nay ấm cúng!', walkout: 'Hết gạo trà rồi hả? Hội làng mà thiếu đồ thì phải làm sao.' },
    perks: [
      { threshold: 15, title: 'Lo lễ hằng năm', description: 'Ghé mỗi buổi sáng.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Rước cả làng qua', description: 'Ngày cô/bác ghé, cả khu đông khách hơn 20%.', effect: 'festival', value: 0.2 },
      { threshold: 80, title: 'Đại hội cả phường', description: 'Ngày ghé, cả khu đông khách hẳn 35%.', effect: 'festival', value: 0.35 },
    ],
  },
  {
    id: 'co_thao_quen', name: 'Cô Thảo quen hội', role: 'Chủ tiệm bánh ngọt',
    bio: 'Bán bánh ngọt cạnh trường. Tan học đông học trò, hay nhờ tiệm cung cấp bột, đường, sữa theo lô.',
    color: 0x16a085, hatColor: 0x0b5345,
    look: { archetype: 'chef', hairStyle: 'ponytail', hair: 0x6e472e, props: ['cake_box'], glasses: false }, favorites: ['x_duong', 'sua', 'trung', 'banh'],
    priceSensitivity: 0.85, patienceMinutes: 20, visitFrom: 6 * 60 + 30, visitUntil: 9 * 60, unlock: 22,
    lines: { greeting: 'Cô lấy ít bột đường với sữa trứng để nướng bánh!', satisfied: 'Bánh ra lò thơm phức, cả xóm qua đặt.', walkout: 'Hết đường sữa rồi hả? Nướng bánh bữa nay trễ giờ khách.' },
    perks: [
      { threshold: 15, title: 'Dậy sớm nướng bánh', description: 'Ghé sáng sớm mỗi ngày.', effect: 'frequent_visit', value: 0.2 },
      { threshold: 40, title: 'Nguyên liệu theo lô', description: 'Mua thêm 2 đơn vị nguyên liệu nướng bánh.', effect: 'bulk_buy', value: 2 },
      { threshold: 80, title: 'Tiệm bánh kén đồ', description: 'Boa thêm 12% vì quen nguyên liệu chuẩn.', effect: 'bonus_tip', value: 0.12 },
    ],
  },
];

export const regularById = (id: string) => REGULARS.find((r) => r.id === id);

export const emptyProgress = (): RegularProgress => ({ friendship: 0, visits: 0, perks: [], discovered: [] });

const hasPerk = (def: RegularDef, prog: RegularProgress | undefined, effect: PerkEffect) =>
  def.perks.some((p) => p.effect === effect && prog?.perks.includes(p.title));

/** Tổng giá trị các perk cùng loại đã mở. */
export const perkValue = (def: RegularDef, prog: RegularProgress | undefined, effect: PerkEffect) =>
  def.perks.filter((p) => p.effect === effect && prog?.perks.includes(p.title)).reduce((n, p) => n + p.value, 0);

/** Số bạn đi cùng (perk giới thiệu bạn bè): khách quen rủ thêm khách vãng lai vào tiệm. */
export const referFriends = (def: RegularDef, prog: RegularProgress | undefined) =>
  perkValue(def, prog, 'refer_friend');

/** Số món mua dôi ra theo lô (perk mua số lượng lớn): mỗi món khoái được mua thêm từng này chiếc. */
export const bulkExtra = (def: RegularDef, prog: RegularProgress | undefined) =>
  perkValue(def, prog, 'bulk_buy');

/** Xác suất/thời điểm sự kiện hội của khách quen: bật đúng ngày hội thì cả khu đông khách hơn. */
export const festivalVisit = (def: RegularDef, prog: RegularProgress | undefined) =>
  hasPerk(def, prog, 'festival');

/** Món ưa thích đã mở khóa ở cấp hiện tại. */
export const unlockedFavorites = (def: RegularDef, level: number) => def.favorites.filter((id) => productById(id).unlock <= level);

function hash(seed: number, day: number, id: string) {
  // Hạt giống thời tiết là số nguyên 32 bit
  let h = (Math.imul(seed >>> 0, 31) + day * 101) & 0x7fffffff;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) & 0x7fffffff;
  return h;
}

/**
 * Hôm nay khách quen có ghé không: tính từ hạt giống ván + ngày nên hai máy chơi chung luôn khớp.
 * Chưa có perk "ghé thường hơn" thì không ghé hai ngày liền.
 */
export function visitsToday(def: RegularDef, day: number, seed: number, level: number, prog?: RegularProgress): boolean {
  if (level < def.unlock || !unlockedFavorites(def, level).length) return false;
  const frequent = hasPerk(def, prog, 'frequent_visit');
  if (!frequent && prog?.lastVisitDay !== undefined && day - prog.lastVisitDay < 2) return false;
  if (prog?.lastVisitDay === day) return false;
  return (hash(seed, day, def.id) % 100) / 100 < 0.35 + (frequent ? 0.2 : 0);
}

/** Khách quen hợp lệ để ghé ngay lúc này (đúng giờ, chưa có mặt trong tiệm). */
export function pickRegular(day: number, minutes: number, seed: number, level: number, progress: Record<string, RegularProgress>, inStore: string[]) {
  return REGULARS.find((def) =>
    !inStore.includes(def.id) && minutes >= def.visitFrom && minutes < def.visitUntil
    && visitsToday(def, day, seed, level, progress[def.id]),
  );
}

export interface RegularCheckout {
  progress: RegularProgress;
  points: number;
  newPerks: RegularPerk[];
  tip: number;
}

/** Thanh toán: có món ưa thích +2 điểm, không có +1; mỗi ngày tính điểm một lần; mở perk và tính tiền boa. */
export function regularCheckout(def: RegularDef, prev: RegularProgress | undefined, basket: { id: string; price: number }[], day: number): RegularCheckout {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  prog.visits++;
  prog.lastVisitDay = day;
  for (const it of basket) if (def.favorites.includes(it.id) && !prog.discovered.includes(it.id)) prog.discovered.push(it.id);
  const points = prog.lastFriendshipDay === day ? 0 : basket.some((it) => def.favorites.includes(it.id)) ? 2 : 1;
  prog.friendship += points;
  if (points) prog.lastFriendshipDay = day;
  const newPerks = def.perks.filter((p) => prog.friendship >= p.threshold && !prog.perks.includes(p.title));
  prog.perks.push(...newPerks.map((p) => p.title));
  const total = basket.reduce((n, it) => n + it.price, 0);
  const tip = Math.round((total * perkValue(def, prog, 'bonus_tip')) / 100) * 100;
  return { progress: prog, points, newPerks, tip };
}

/** Cộng/trừ thân thiết ngoài lần ghé (vd. giao đơn riêng); không bao giờ âm. */
export function regularFriendship(def: RegularDef, prev: RegularProgress | undefined, delta: number) {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  prog.friendship = Math.max(0, prog.friendship + delta);
  const newPerks = def.perks.filter((p) => prog.friendship >= p.threshold && !prog.perks.includes(p.title));
  prog.perks.push(...newPerks.map((p) => p.title));
  return { progress: prog, newPerks };
}

/** Bỏ về tay không hoặc chờ quá lâu: vẫn tính là đã ghé, mất một điểm thân thiết. */
export function regularWalkout(prev: RegularProgress | undefined, day: number): RegularProgress {
  const prog: RegularProgress = prev ? { ...prev, perks: [...prev.perks], discovered: [...prev.discovered] } : emptyProgress();
  prog.visits++;
  prog.lastVisitDay = day;
  prog.friendship = Math.max(0, prog.friendship - 1);
  return prog;
}

/** Mốc perk kế tiếp (để hiện thanh tiến độ). */
export const nextPerk = (def: RegularDef, prog?: RegularProgress) => def.perks.find((p) => !prog?.perks.includes(p.title));
