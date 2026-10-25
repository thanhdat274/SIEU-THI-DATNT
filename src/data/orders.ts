import { festivalOn } from './calendar';
import { productById } from './products';
import { regularById, type RegularProgress } from './regulars';
import { orderTotal, supplierById, supplierSells } from './suppliers';

/** Đơn tiệc/đơn đặt trước: hàng xóm đặt số lượng lớn, giao từ kho trước hạn thì được thưởng. */
export interface PartyOrderDef {
  id: string;
  icon: string;
  title: string;
  /** Người đặt (khớp tên khách quen cho có hồn). */
  from: string;
  description: string;
  unlock: number;
  /** Số ngày được giao, tính cả hôm nhận. */
  days: number;
  items: Record<string, number>;
  /** Thưởng thêm (ngoài tiền hàng theo giá gợi ý). */
  bonus: number;
  xp: number;
  /** Đơn riêng của một khách quen: chỉ mời khi đã thân, giao xong tăng thân thiết. */
  regular?: string;
  /** Đơn theo dịp lễ (vd. giỏ quà Tết): chỉ mời khi đúng dịp trên lịch. */
  festival?: string;
}

/** Thân thiết tối thiểu để khách quen nhờ đơn riêng (mốc perk đầu tiên). */
export const STORY_ORDER_FRIENDSHIP = 15;
/** Giao đúng hẹn được cộng, lỡ hẹn bị trừ ngần này điểm thân thiết. */
export const STORY_ORDER_FRIEND_GAIN = 8;
export const STORY_ORDER_FRIEND_LOSS = 5;

export const PARTY_ORDERS: PartyOrderDef[] = [
  {
    id: 'thoi_noi', icon: '🎂', title: 'Tiệc thôi nôi bé Bắp', from: 'Chị Lan', unlock: 1, days: 2,
    description: 'Thôi nôi con gái, cần nước cho khách và bánh kẹo bày mâm.',
    items: { nuoc: 12, banh: 8 }, bonus: 40000, xp: 40,
  },
  {
    id: 'sinh_nhat_na', icon: '🎈', title: 'Sinh nhật bé Na', from: 'Bé Na', unlock: 2, days: 2,
    description: 'Cả nhóm bạn tiểu học kéo tới, cần nước ngọt với bánh kẹo.',
    items: { ngot: 10, banh: 10 }, bonus: 50000, xp: 50,
  },
  {
    id: 'bong_da', icon: '⚽', title: 'Xem bóng đá đêm hẻm', from: 'Chú Ba', unlock: 4, days: 1,
    description: 'Chung kết tối nay! Anh em xe ôm cần mì ăn khuya với nước ngọt.',
    items: { mi: 15, ngot: 12 }, bonus: 70000, xp: 60,
  },
  {
    id: 'mung_tho', icon: '🧧', title: 'Mừng thọ Bác Tám', from: 'Bà Năm', unlock: 11, days: 3,
    description: 'Bà con làm cỗ mừng thọ, cần gạo, trứng và dầu ăn.',
    items: { gao: 4, trung: 6, dauan: 4 }, bonus: 150000, xp: 120,
  },
  {
    id: 'dam_cuoi', icon: '💒', title: 'Đám cưới đầu hẻm', from: 'Bác Tám', unlock: 16, days: 3,
    description: 'Nhà bên tổ chức đám cưới, cần bia và nước ngọt cho bàn tiệc.',
    items: { bia: 24, ngot: 24, nuoc: 24 }, bonus: 250000, xp: 160,
  },
  {
    id: 'cong_trinh', icon: '🏗️', title: 'Đội thợ công trình', from: 'Chú Tư', unlock: 18, days: 2,
    description: 'Đội thợ sửa đường cần nước tăng lực và mì gói cho cả tuần.',
    items: { tangluc: 20, mi: 30, nuoc: 20 }, bonus: 200000, xp: 140,
  },
  {
    id: 'tat_nien', icon: '🎆', title: 'Tất niên khu phố', from: 'Bác Tám', unlock: 24, days: 3,
    description: 'Bữa tất niên cả tổ dân phố: gia vị, dầu ăn, cà phê, bánh kẹo.',
    items: { giavi: 10, dauan: 6, caphe: 6, banh: 20 }, bonus: 350000, xp: 220,
  },
  {
    id: 'quan_com', icon: '🍚', title: 'Quán cơm mối mới', from: 'Bà Năm', unlock: 30, days: 2,
    description: 'Quán cơm đầu ngõ đặt hàng tươi cho cả tuần.',
    items: { rau: 15, thit: 6, ca: 6, gao: 4 }, bonus: 400000, xp: 260,
  },
  // Đơn tiệc cần MÓN NHÀ LÀM: chỉ mời khi đã có bếp (unlock ≥ COOK_UNLOCK), nấu xong để trong kho rồi giao như thường
  {
    id: 'com_trua_vp', icon: '🍱', title: 'Cơm trưa văn phòng', from: regularById('chi_lan')!.name, regular: 'chi_lan', unlock: 23, days: 2,
    description: 'Công ty chị Lan họp cả ngày, đặt cơm hộp gà nóng cho nhóm — nấu ở bếp rồi để kho, giao như đơn thường.',
    items: { com_hop_ga: 12, nuoc: 10 }, bonus: 200000, xp: 150,
  },
  {
    id: 'sn_trang', icon: '🎂', title: 'Sinh nhật tuổi 18', from: 'Bé Na', unlock: 26, days: 2,
    description: 'Bé Na tổ chức sinh nhật tuổi 18, nhóm bạn muốn mấy ly trà sữa với bánh mì trứng nướng của tiệm.',
    items: { tra_sua: 8, banh_mi_trung_nuong: 6 }, bonus: 180000, xp: 140,
  },
  {
    id: 'dam_hoi_hem', icon: '🎎', title: 'Đám hỏi đầu hẻm', from: 'Bác Tám', unlock: 36, days: 2,
    description: 'Nhà bên làm đám hỏi, bác đặt xôi thập cẩm với nước mía tươi đãi khách sáng sớm.',
    items: { xoi_thap_cam: 10, nuoc_mia: 12 }, bonus: 260000, xp: 180,
  },
  // Đơn theo dịp lễ: chỉ được mời khi lịch đang đúng dịp (giỏ quà phải gói đúng mùa)
  {
    id: 'gio_qua_tet_dn', icon: '🧧', title: 'Gói giỏ quà Tết cho họ hàng', from: 'Bà Năm', unlock: 28, days: 2, festival: 'tet',
    description: 'Bà Năm cần mấy giỏ bánh kẹo trà biếu họ hàng trong Nam — gói ở bàn gói quà rồi để kho, giao như đơn thường.',
    items: { gio_qua_tet: 3, tra: 2 }, bonus: 150000, xp: 130,
  },
  {
    id: 'gio_qua_2011_dn', icon: '🌸', title: 'Lớp học tặng cô giáo', from: 'Bé Na', unlock: 32, days: 2, festival: 'nha_giao',
    description: 'Cả lớp gom tiền đặt giỏ quà tặng cô nhân 20/11 — bé nhờ tiệm gói giùm cho đẹp.',
    items: { gio_qua_2011: 3 }, bonus: 130000, xp: 120,
  },
  // Đơn riêng theo câu chuyện từng khách quen
  {
    id: 'xoi_dam_gio', icon: '🍙', title: 'Mẻ xôi đám giỗ', from: regularById('ba_nam')!.name, regular: 'ba_nam', unlock: 12, days: 2,
    description: 'Nhà bên có đám giỗ, bà nấu thêm mấy mâm xôi gấc, cần gạo nếp với trứng.',
    items: { gao: 3, trung: 10, sua: 6 }, bonus: 80000, xp: 60,
  },
  {
    id: 'cuoc_xa', icon: '🛵', title: 'Cuốc xe đi tỉnh', from: regularById('chu_ba')!.name, regular: 'chu_ba', unlock: 18, days: 1,
    description: 'Chú nhận cuốc chở đoàn khách về quê, cần đồ ăn uống dọc đường. Mai đi sớm!',
    items: { nuoc: 10, tangluc: 6, banh: 6 }, bonus: 70000, xp: 60,
  },
  {
    id: 'hoc_nhom', icon: '📚', title: 'Nhóm học cuối tuần', from: regularById('be_na')!.name, regular: 'be_na', unlock: 15, days: 2,
    description: 'Cả nhóm bạn ôn thi ở nhà Na, má Na nhờ tiệm chuẩn bị đồ ăn vặt.',
    items: { snack: 8, sua: 8, banh: 6 }, bonus: 50000, xp: 50,
  },
  {
    id: 'hop_to', icon: '🏘️', title: 'Họp tổ dân phố', from: regularById('bac_tam')!.name, regular: 'bac_tam', unlock: 23, days: 2,
    description: 'Họp tổ cuối quý, bác cần trà bánh tiếp bà con.',
    items: { tra: 6, banh: 10, nuoc: 12 }, bonus: 90000, xp: 70,
  },
  {
    id: 'tiec_cong_ty', icon: '💼', title: 'Tiệc nhóm làm việc', from: regularById('chi_lan')!.name, regular: 'chi_lan', unlock: 19, days: 2,
    description: 'Cả nhóm của chị Lan họp tại nhà, cần đồ ăn nhẹ cho buổi chiều.',
    items: { suachua: 12, sua: 10, nuoc: 12 }, bonus: 100000, xp: 80,
  },
  {
    id: 'hackathon', icon: '💻', title: 'Đêm hackathon', from: regularById('anh_tuan')!.name, regular: 'anh_tuan', unlock: 18, days: 1,
    description: 'Cả đội thức trắng chạy dự án, anh cần đồ chống đói tới sáng.',
    items: { mi: 20, tangluc: 10, snack: 10 }, bonus: 120000, xp: 90,
  },
  {
    id: 'tiem_toc_dong', icon: '💈', title: 'Tiệm tóc đông khách', from: regularById('thang_barber')!.name, regular: 'thang_barber', unlock: 24, days: 2,
    description: 'Mùa cưới khách cắt tóc xếp hàng, chú cần đồ uống mời khách ngồi chờ.',
    items: { caphe: 10, banh: 10, nuoc: 10 }, bonus: 90000, xp: 70,
  },
  {
    id: 'sua_xe_dem', icon: '🔧', title: 'Ca sửa xe đêm', from: regularById('bac_hung_me')!.name, regular: 'bac_hung_me', unlock: 18, days: 1,
    description: 'Mưa ngập, xe chết máy xếp hàng. Bác với thợ làm xuyên đêm.',
    items: { tangluc: 12, mi: 12, nuoc: 10 }, bonus: 90000, xp: 70,
  },
  {
    id: 'quan_them_ban', icon: '☕', title: 'Quán nước kê thêm bàn', from: regularById('co_mai_bar')!.name, regular: 'co_mai_bar', unlock: 24, days: 2,
    description: 'Quán cô Mai mở thêm bàn vỉa hè, cần nguyên liệu pha chế gấp.',
    items: { caphe: 12, sua: 10, ngot: 10 }, bonus: 110000, xp: 80,
  },
  {
    id: 'kham_mien_phi', icon: '🩺', title: 'Ngày khám miễn phí', from: regularById('bac_si_hai')!.name, regular: 'bac_si_hai', unlock: 8, days: 2,
    description: 'Bác Hải mở buổi khám miễn phí cho người già trong xóm, cần nước với sữa mời bà con.',
    items: { sua: 10, nuoc: 20 }, bonus: 70000, xp: 60,
  },
  {
    id: 'tri_an_khach', icon: '🏦', title: 'Ngày tri ân khách hàng', from: regularById('anh_giao_ngan')!.name, regular: 'anh_giao_ngan', unlock: 15, days: 2,
    description: 'Chi nhánh làm quầy tri ân, anh Giao đặt bánh nước ở tiệm quen.',
    items: { snack: 10, ngot: 12, banh: 10 }, bonus: 100000, xp: 80,
  },
  {
    id: 'tang_ca', icon: '🧱', title: 'Tiệc tăng ca lò gạch', from: regularById('chu_tu_ho')!.name, regular: 'chu_tu_ho', unlock: 16, days: 1,
    description: 'Lò gạch chạy đơn gấp, chú Tư đãi anh em một bữa sau ca.',
    items: { bia: 12, mi: 15, nuoc: 15 }, bonus: 100000, xp: 80,
  },
  {
    id: 'hoa_cuoi', icon: '💐', title: 'Đơn hoa cưới', from: regularById('co_mua_hoa')!.name, regular: 'co_mua_hoa', unlock: 12, days: 2,
    description: 'Cô Mùa nhận kết hoa cho đám cưới, cần nước dưỡng hoa, khăn giấy và xà phòng rửa tay.',
    items: { nuoc: 15, giay: 10, xaphong: 6 }, bonus: 80000, xp: 70,
  },
  {
    id: 'dien_khu_tro', icon: '💡', title: 'Đi dây khu trọ', from: regularById('chuong_tho_dien')!.name, regular: 'chuong_tho_dien', unlock: 14, days: 2,
    description: 'Chú nhận đi dây điện cả dãy trọ, cần pin dự phòng với đồ ăn trưa cho thợ.',
    items: { x_pin: 10, mi: 10, nuoc: 15 }, bonus: 90000, xp: 70,
  },
  {
    id: 'mam_co', icon: '🍖', title: 'Mâm cỗ nhà bà Ba', from: regularById('ba_ba_thit')!.name, regular: 'ba_ba_thit', unlock: 16, days: 2,
    description: 'Nhà bà Ba làm cỗ cúng, bà lo thịt còn gia vị thì nhờ tiệm.',
    items: { nuocmam: 6, giavi: 8, dauan: 6, gao: 4 }, bonus: 120000, xp: 90,
  },
  {
    id: 'quan_khai_truong', icon: '🍻', title: 'Quán nhậu khai trương', from: regularById('anh_minh_nhau')!.name, regular: 'anh_minh_nhau', unlock: 18, days: 2,
    description: 'Anh Minh khai trương quán mới, cần đầy két bia cho tối đầu.',
    items: { bia: 24, ngot: 12, snack: 10 }, bonus: 160000, xp: 110,
  },
  {
    id: 'cho_phu_nu', icon: '🎀', title: 'Hội chợ phụ nữ', from: regularById('co_nga_hoi')!.name, regular: 'co_nga_hoi', unlock: 28, days: 3,
    description: 'Hội phụ nữ phường làm hội chợ gây quỹ, cô Nga đặt mâm quà bày gian hàng.',
    items: { traicay: 10, banh: 12, tra: 6 }, bonus: 150000, xp: 110,
  },
  {
    id: 'com_tho_xuong', icon: '🪵', title: 'Bữa cơm thợ xưởng', from: regularById('chu_cuong_xuong')!.name, regular: 'chu_cuong_xuong', unlock: 24, days: 2,
    description: 'Xưởng gỗ nhận đơn lớn, chú Cường nấu cơm trưa cho cả xưởng một tuần.',
    items: { gao: 6, dauan: 4, mi: 20, xucxich: 10 }, bonus: 170000, xp: 120,
  },
  {
    id: 'le_hoi_lang', icon: '🏮', title: 'Lễ hội làng', from: regularById('bac_doi_hoi')!.name, regular: 'bac_doi_hoi', unlock: 28, days: 3,
    description: 'Bác Đôi lo lễ hội làng năm nay, đặt đồ cúng và nước cho đội múa lân.',
    items: { gao: 6, tra: 8, traicay: 10, nuoc: 20 }, bonus: 200000, xp: 140,
  },
  {
    id: 'banh_don_lon', icon: '🎂', title: 'Mẻ bánh đơn lớn', from: regularById('co_thao_quen')!.name, regular: 'co_thao_quen', unlock: 22, days: 2,
    description: 'Tiệm bánh cô Thảo nhận đặt 100 cái bánh bông lan, cần sữa trứng đường gấp.',
    items: { sua: 12, trung: 12, x_duong: 6 }, bonus: 130000, xp: 100,
  },
];

export const partyOrderById = (id: string) => PARTY_ORDERS.find((o) => o.id === id);

/** Đơn đang nhận hoặc đang được mời (được lưu). */
export interface ActiveOrder {
  id: string;
  /** Ngày cuối được giao. */
  dueDay: number;
  accepted: boolean;
}

/** Tiền hàng theo giá gợi ý (khách tiệc trả đúng giá niêm yết, không mặc cả). */
export const orderValue = (def: PartyOrderDef) =>
  Object.entries(def.items).reduce((n, [id, q]) => n + productById(id).sell * q, 0);

function roll(seed: number, day: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ (day * 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Khách quen này đã đủ thân để nhờ đơn riêng chưa. */
const storyReady = (o: PartyOrderDef, level: number, regulars: Record<string, RegularProgress>) =>
  !!o.regular && o.unlock <= level && (regularById(o.regular)?.unlock ?? 99) <= level
  && (regulars[o.regular]?.friendship ?? 0) >= STORY_ORDER_FRIENDSHIP;

/**
 * Sáng nay có ai mời đặt đơn không (theo hạt giống ván nên hai máy chơi chung khớp nhau).
 * Khoảng 1/3 số ngày có lời mời; nửa số lời mời là đơn riêng của khách quen đã thân (nếu có).
 */
export function offerForDay(seed: number, day: number, level: number, regulars: Record<string, RegularProgress> = {}): ActiveOrder | null {
  // Đơn theo dịp lễ chỉ mời khi lịch đang đúng dịp (giỏ quà Tết chỉ hiện trong Tết)
  const inSeason = (o: PartyOrderDef) => !o.festival || festivalOn(day)?.id === o.festival;
  const story = PARTY_ORDERS.filter((o) => inSeason(o) && storyReady(o, level, regulars));
  const party = PARTY_ORDERS.filter((o) => inSeason(o) && !o.regular && o.unlock <= level);
  const pool = story.length && (roll(seed, day, 17) < 0.5 || !party.length) ? story : party;
  if (!pool.length || day < 2 || roll(seed, day, 7) > 0.35) return null;
  const def = pool[Math.floor(roll(seed, day, 13) * pool.length)];
  return { id: def.id, dueDay: day + def.days - 1, accepted: false };
}

/**
 * Nhập gấp phần còn thiếu của đơn ở Đại lý đầu ngõ (có hàng ngay, giá chuẩn trong ngày).
 * `ok` = false khi có món đại lý không bán (món nhà làm phải tự nấu).
 */
export function rushQuote(def: PartyOrderDef, storage: Record<string, number>, day: number) {
  const sup = supplierById('daily');
  const items = Object.fromEntries(missingForOrder(def, storage).map((m) => [m.id, m.need]));
  const ok = Object.keys(items).every((id) => supplierSells(sup, id));
  return { items, cost: ok ? orderTotal(sup, items, day) : 0, ok };
}

/** Thiếu những món nào trong kho để giao đơn. */
export function missingForOrder(def: PartyOrderDef, storage: Record<string, number>) {
  return Object.entries(def.items).filter(([id, q]) => (storage[id] ?? 0) < q).map(([id, q]) => ({ id, need: q - (storage[id] ?? 0) }));
}
