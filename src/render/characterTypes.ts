import type * as THREE from 'three';

export type CharacterGender = 'male' | 'female';
export type CharacterArchetype =
  | 'gentleman'     // Thanh niên công sở / thư sinh lịch lãm (như hình mẫu)
  | 'student_boy'   // Học sinh nam / thiếu niên năng động (áo đồng phục, balo, tóc ngắn)
  | 'student_girl'  // Học sinh nữ / bé gái đáng yêu (tóc 2 chùm/cột nơ, váy/yếm)
  | 'elder_man'     // Cụ ông / Bác tổ trưởng (tóc bạc, râu ria, áo sơ mi/gile lớn tuổi, dáng hơi khom)
  | 'elder_woman'   // Cụ bà / Bà Năm bán xôi (khăn rằn/búi tóc bà già, áo bà ba/hoa văn, tóc muối tiêu)
  | 'worker_driver' // Chú xe ôm / thợ lao động (áo khoác bảo hộ/áo gió, nón lưỡi trai/mũ bảo hiểm)
  | 'office_lady'   // Chị gái văn phòng / hiện đại (váy công sở, tóc uốn nữ tính)
  | 'coder_guy'     // Anh lập trình viên / Cú đêm (áo hoodie/phông, tai nghe trùm đầu, dép/sneaker)
  | 'construction_worker' // Công nhân xây dựng (áo phản quang cam, mũ bảo hộ, cầm bay xây)
  | 'nurse'         // Y tá (áo blouse trắng, mũ y tá, khẩu trang, cầm bìa hồ sơ)
  | 'shipper'       // Shipper (áo khoác giao hàng, mũ bảo hiểm, thùng hàng sau lưng)
  | 'chef'          // Đầu bếp quán ăn (mũ đầu bếp cao, tạp dề, cầm muôi)
  | 'young_mom'     // Mẹ bỉm sữa (áo hồng, bế em bé, túi đồ trẻ em)
  | 'security_guard' // Bảo vệ (đồng phục xanh rêu, mũ kê-pi, dùi cui)
  | 'teacher'       // Giáo viên (áo dài trắng, cầm sách)
  | 'farmer'        // Người bán chợ (áo bà ba nâu, nón lá, quang gánh)
  | 'athlete'       // Dân chạy bộ (đồ thể thao, băng đô, bình nước)
  | 'barber'        // Thợ cắt tóc (áo choàng, lược, tông đơ)
  | 'mechanic'      // Thợ sửa xe (quần yếm, mũ lưỡi trai, chìa khóa ống)
  | 'electrician'   // Thợ điện (mũ bảo hộ, kìm cách điện)
  | 'police'        // Công an (đồng phục xanh, mũ kê-pi, còng tay)
  | 'soldier'       // Bộ đội (quân phục xanh lá, mũ cối)
  | 'barista'       // Pha chế quán nước (tạp dề, cốc pha cà phê)
  | 'doctor'        // Bác sĩ (blouse trắng, ống nghe, cặp thuốc)
  | 'banker'        // Nhân viên ngân hàng (vest, cà vạt, cặp táp)
  | 'monk'         // Sư thầy (áo vàng sa môn, đầu trần, cầm tràng hạt)
  | 'fisherman'    // Ngư dân (áo mưa vàng, mũ rộng vành, cần câu)
  | 'influencer'   // Influencer (đồ trendy, mũ lưỡi trai, điện thoại selfie)
  | 'taxi_driver'  // Tài xế công nghệ (áo xanh lá đặc trưng, mũ lưỡi trai, điện thoại nhận cuốc)
  | 'bus_driver'   // Tài xế xe bus (đồng phục xanh dương, mũ kê-pi, sổ tuyến)
  | 'online_seller'// Chị bán hàng online (tạp dề, băng đô, thùng hàng bọc màng co)
  | 'tailor'       // Thợ may (thước dây quàng cổ, kéo cắt)
  | 'player';      // Người chơi chính

/** Kiểu tóc; mặc định suy ra từ archetype. */
export type HairStyle = 'side_part' | 'spiky' | 'pigtails' | 'bun' | 'long' | 'ponytail' | 'buzz' | 'curly' | 'plain';

/** Đạo cụ riêng của khách quen (cầm tay, đội đầu hoặc vác vai). */
export type PropKind =
  | 'non_la' | 'xoi_basket' | 'phone' | 'lollipop' | 'notebook' | 'handbag' | 'laptop' | 'oil_can'
  | 'flowers' | 'cable_coil' | 'meat_bag' | 'beer_crate' | 'megaphone' | 'wood_plank' | 'flag' | 'cake_box'
  | 'stethoscope';

export interface CharacterMeshOptions {
  archetype?: CharacterArchetype;
  hairStyle?: HairStyle;
  /** Ép màu áo, kể cả khi archetype có đồng phục. */
  topColor?: number;
  props?: PropKind[];
  gender?: CharacterGender;
  profession?: 'player' | 'customer' | 'cashier' | 'stocker';
  bodyColor?: THREE.ColorRepresentation;
  hatColor?: number;
  hasGlasses?: boolean;
  skinColor?: number;
  hairColor?: number;
  scale?: number;
}

export interface CharacterParts {
  root: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftShin: THREE.Group;
  rightShin: THREE.Group;
  faceGroup: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  archetype: CharacterArchetype;
}

// Bảng màu da phong phú
export const SKIN_TONES = {
  fair: 0xffe6d5,
  natural: 0xfcd8be,
  tanned: 0xdfa980,
  elder: 0xe8ba97,
};
