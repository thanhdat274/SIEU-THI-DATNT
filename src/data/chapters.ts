/**
 * Cốt truyện theo chương: mỗi chương mở khi đủ điều kiện, hiện một đoạn hội thoại ngắn rồi trao thưởng
 * (và có thể khởi động một hệ thống như tiệm đối thủ). Chỉ có dữ liệu; hiện/đóng nằm ở `core/biz.ts`.
 */

import { RIVAL_UNLOCK } from './biz';

/** Những gì điều kiện mở chương cần đọc. */
export interface ChapterContext {
  day: number;
  level: number;
  customers: number;
  staffCount: number;
  shopTier: number;
  hasRival: boolean;
  rivalsBeaten: number;
}

export interface DialogueLine {
  icon: string;
  speaker: string;
  text: string;
}

export type ChapterEffect = 'openRival';

export interface Chapter {
  id: string;
  title: string;
  when: (c: ChapterContext) => boolean;
  lines: DialogueLine[];
  reward?: { money?: number; xp?: number };
  effect?: ChapterEffect;
}

/** Tên siêu thị đối thủ đầu tiên trong cốt truyện. */
export const STORY_RIVAL_NAME = 'Siêu thị Hưng Thịnh';

const ME: Pick<DialogueLine, 'icon' | 'speaker'> = { icon: '🧑', speaker: 'Bạn' };
const say = (icon: string, speaker: string, text: string): DialogueLine => ({ icon, speaker, text });
const me = (text: string): DialogueLine => ({ ...ME, text });

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'ch1_ve_que', title: 'Chương 1 · Về hẻm giữ tiệm',
    // Bản lưu cũ đã chơi lâu thì bỏ qua lời chào đầu
    when: (c) => c.day <= 3,
    lines: [
      say('👵', 'Bà Năm', 'Ủa, con của chủ tiệm đây hả? Tiệm đóng cửa cả tháng nay, cả hẻm phải ra chợ mua từng gói mì.'),
      me('Dạ, con về mở lại tiệm. Vốn còn ít nên con bán mấy món cần thiết trước.'),
      say('👵', 'Bà Năm', 'Vậy là tốt rồi. Nhập mì, nước, bánh kẹo trước. Bày lên kệ, mở cửa là bà con ghé liền.'),
    ],
    reward: { money: 20000 },
  },
  {
    id: 'ch2_khach_quen', title: 'Chương 2 · Hẻm nhớ tiệm',
    when: (c) => c.customers >= 40,
    lines: [
      say('🛵', 'Chú Ba xe ôm', 'Mấy bữa nay tui ghé hoài, tiệm đủ hàng, tính tiền lẹ. Anh em xe ôm đầu hẻm khen quá trời.'),
      me('Cảm ơn chú. Chú thích món gì cứ nói, con nhập sẵn cho.'),
      say('🛵', 'Chú Ba xe ôm', 'Nước suối với mì gói đó. Mà nhớ, khách quen thì đừng để kệ trống nghen.'),
    ],
    reward: { xp: 40 },
  },
  {
    id: 'ch3_nguoi_phu', title: 'Chương 3 · Một mình không xuể',
    when: (c) => c.level >= 4 && c.staffCount === 0,
    lines: [
      say('👴', 'Bác Tám tổ trưởng', 'Bác thấy con vừa đứng quầy vừa chạy châm hàng, chiều về mệt rũ.'),
      me('Dạ, khách đông lên mà con chỉ có một mình.'),
      say('👴', 'Bác Tám tổ trưởng', 'Thuê thêm người phụ đi. Nhớ chừa tiền trả lương cuối ngày, đừng nhập hàng hết sạch vốn.'),
    ],
    reward: { money: 50000 },
  },
  {
    id: 'ch4_sieu_thi', title: 'Chương 4 · Siêu thị đối diện mở cửa',
    when: (c) => c.level >= RIVAL_UNLOCK && !c.hasRival && c.rivalsBeaten === 0,
    lines: [
      say('👴', 'Bác Tám tổ trưởng', `Con hay tin gì chưa? ${STORY_RIVAL_NAME} vừa thuê mặt bằng ngay đối diện đầu hẻm, mai khai trương.`),
      say('🏪', 'Quản lý siêu thị', 'Khai trương giảm giá cả tuần! Bà con qua bên tôi, máy lạnh mát rượi, hàng gì cũng có.'),
      me('Họ to hơn mình nhiều... nhưng mình có cái họ không có: biết tên từng người trong hẻm.'),
      say('👴', 'Bác Tám tổ trưởng', 'Đúng rồi. Giữ giá phải chăng, kệ đầy, khách vui. Họ không trụ được lâu đâu.'),
    ],
    reward: { xp: 100 },
    effect: 'openRival',
  },
  {
    id: 'ch5_thang_doi_thu', title: 'Chương 5 · Hẻm vẫn chọn tiệm mình',
    when: (c) => c.rivalsBeaten >= 1,
    lines: [
      say('👵', 'Bà Năm', `Nghe nói ${STORY_RIVAL_NAME} dẹp tiệm rồi. Máy lạnh mát mấy mà không ai hỏi han thì cũng vậy thôi.`),
      me('Nhờ bà con ủng hộ đó bà.'),
      say('👵', 'Bà Năm', 'Giờ tiệm con lớn rồi, tính chuyện mở rộng mặt bằng đi chớ.'),
    ],
    reward: { money: 300000, xp: 200 },
  },
  {
    id: 'ch6_mo_rong', title: 'Chương 6 · Tiệm nhỏ hóa siêu thị',
    when: (c) => c.shopTier >= 2,
    lines: [
      say('🛵', 'Chú Ba xe ôm', 'Trời đất, tiệm giờ rộng thênh thang, có cả xe đẩy. Gọi là siêu thị mini được rồi!'),
      me('Dạ, giờ con lo cho tiệm chạy đều đã, rồi tính tiếp.'),
      say('👵', 'Bà Năm', 'Ừ, từ từ mà làm. Có gì cần cứ hỏi bà.'),
    ],
    reward: { money: 500000, xp: 300 },
  },
  {
    id: 'ch7_nguoi_giu_lua', title: 'Chương 7 · Người giữ lửa',
    when: (c) => c.staffCount >= 3 && c.level >= 15,
    lines: [
      say('👴', 'Bác Tám tổ trưởng', 'Bác thấy tiệm con giờ có hẳn nhóm người làm, đứa bưng kệ đứa đứng quầy, ai cũng góp tay. Tiệm mình thành cái cơ ngơi rồi đó.'),
      me('Dạ, con dặn họ có mỗi một điều: bán cho bà con thì chớ có làm qua loa.'),
      say('👴', 'Bác Tám tổ trưởng', 'Thằng thu ngân kỳ cựu của con làm ổn cả rồi, mạnh dạn thăng nó lên trưởng quầy đi. Có người giữ lửa ở quầy, con mới rảnh tay lo chuyện lớn.'),
      me('Dạ con đang tính vậy. Để nó đỡ quầy kẻo hụt hơi, mình mới kịp tính tiếp.'),
    ],
    reward: { money: 1500000, xp: 800 },
  },
  {
    id: 'ch8_doi_thu_ke_tiep', title: 'Chương 8 · Đối thủ kế tiếp',
    when: (c) => c.rivalsBeaten >= 2,
    lines: [
      say('🛵', 'Chú Ba xe ôm', 'Cả hẻm đang bàn tán: tiệm mình hạ được hai ông lớn rồi đó! Khách lạ nghe tiếng, tấp vô coi từng hàng một.'),
      me('Con đâu làm gì to tát, chỉ giữ đều chốn này thôi chú: kệ đầy, giá dễ chịu, khách tới là vui.'),
      say('👵', 'Bà Năm', 'Cái khó không phải thắng một trận, mà là giữ đều từng ngày. Con đừng để thảnh thơi mà hờn khách quen nghen.'),
      me('Dạ, hẻm mình thương tiệm con cỡ nào, con giữ đúng cỡ đó.'),
    ],
    reward: { money: 2500000, xp: 1200 },
  },
  {
    id: 'ch9_quan_nuoc', title: 'Chương 9 · Quán nước đầu ngõ',
    when: (c) => c.level >= 29,
    lines: [
      say('🛵', 'Chú Ba xe ôm', 'Đầu hẻm mình thiếu cái chỗ ngồi nghiêm túc luôn con ơi. Khách xuống xe muốn ly cà phê có ghế ngồi mà chạy hết cẳng.'),
      me('Chú khêu hoài mà con nhớ hoài. Vậy giờ con đủ sức rồi, tính mở quán nước đầu ngõ luôn.'),
      say('🛵', 'Chú Ba xe ôm', 'Mở liền đi! Anh em xe ôm hứa mỗi ngày tui ghé đúng ba cuốc. Nước mát đá đầy, tiền về đều tay.'),
      say('👵', 'Bà Năm', 'Mở sớm đi con. Bà con đầu hẻm chờ hoài, sáng nào bà cũng ghé uống ly cà phê cho khỏi quên đường.'),
    ],
    reward: { money: 3000000, xp: 1500 },
  },
  {
    id: 'ch10_mat_tien', title: 'Chương 10 · Mặt tiền khang trang',
    when: (c) => c.shopTier >= 4 && c.level >= 40,
    lines: [
      say('👴', 'Bác Tám tổ trưởng', 'Mặt tiền khang trang thiệt sự rồi. Bà con dãy phố bên nghe tiếng, cuối tuần xe ghé kín trước cửa.'),
      me('Con cũng không ngờ ngõ nhỏ mình đông khách tới vậy. Tủ kệ phải nhập thêm tới hai chuyến một tuần.'),
      say('👴', 'Bác Tám tổ trưởng', 'Người lạ tới càng nhiều, cái tiếng của tiệm càng đi xa. Hàng chuẩn, giá đúng, tự nhiên người quen kéo về.'),
      say('👵', 'Bà Năm', 'Hồi xưa bà bán xôi còn phải kêu con dậy. Giờ con thành ông chủ siêu thị mất rồi!'),
    ],
    reward: { money: 6000000, xp: 2200 },
  },
  {
    id: 'ch11_dem_den_sang', title: 'Chương 11 · Đêm nào cũng đèn sáng',
    when: (c) => c.level >= 55,
    lines: [
      say('💻', 'Anh Tuấn lập trình', 'Shop ơi, hồi đó 11 giờ đêm muốn mua gói mì phải đạp xe hai cây số. Nay tiệm mình thắp đèn tới sáng luôn hả?'),
      me('Dạ con mở cửa 24h rồi. Khách khuya ghé có chỗ, người làm ca đêm cũng có thêm phụ.'),
      say('👴', 'Bác Tám tổ trưởng', 'Đèn tiệm sáng cả đêm, hẻm mình an ninh hơn hẳn. Trước bác lo đèn đường, giờ tiệm con thắp sáng giùm cả ngõ.'),
      me('Cả hẻm yên giấc mà đèn tiệm vẫn sáng, con thấy ấm bụng lắm bác ơi.'),
    ],
    reward: { money: 10000000, xp: 3200 },
  },
  {
    id: 'ch12_ngo_nho_thanh_danh', title: 'Chương 12 · Ngõ nhỏ thành danh',
    when: (c) => c.level >= 75,
    lines: [
      say('👵', 'Bà Năm', 'Hồi đó cả hẻm thiếu gói mì phải xách giỏ ra chợ. Giờ tiếng tiệm con nghe tận phường bên, khách tìm tới tấp nập.'),
      say('🛵', 'Chú Ba xe ôm', 'Tui chạy xe từ thời cub 81, chưa thấy ngõ nào lên đời nhanh vậy. Tiệm mình thành địa chỉ rồi, ai nhắc tới cũng nể.'),
      say('👴', 'Bác Tám tổ trưởng', 'Cảm ơn con đã giữ cho hẻm mình sống động. Kệ đầy, giá phải chăng, ai tới cũng được hỏi han — cái vốn đó không ai mua nổi đâu.'),
      me('Tất cả là nhờ bà con hẻm mình cả. Mà chuyện con còn dài lắm, mai bà con lại ghé nghen.'),
    ],
    reward: { money: 20000000, xp: 5000 },
  },
];

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);

/** Chương kế tiếp đủ điều kiện mở (theo thứ tự), chưa xem. */
export function nextChapter(seen: readonly string[], c: ChapterContext): Chapter | undefined {
  const done = new Set(seen);
  return CHAPTERS.find((ch) => !done.has(ch.id) && ch.when(c));
}
