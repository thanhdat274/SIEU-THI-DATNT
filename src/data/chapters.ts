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
];

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id);

/** Chương kế tiếp đủ điều kiện mở (theo thứ tự), chưa xem. */
export function nextChapter(seen: readonly string[], c: ChapterContext): Chapter | undefined {
  const done = new Set(seen);
  return CHAPTERS.find((ch) => !done.has(ch.id) && ch.when(c));
}
