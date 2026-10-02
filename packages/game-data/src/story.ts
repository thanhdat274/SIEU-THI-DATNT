import { nullProto } from './safe-map';
/** Điều kiện hoàn thành chương; đo từ chỉ số mô phỏng, không có nhánh code theo id chương. */
export type StoryObjective =
  | { kind: 'customersServed'; target: number }
  | { kind: 'level'; target: number }
  | { kind: 'levelAndStaff'; level: number; staff: number }
  | { kind: 'totalRevenue'; target: number }
  | { kind: 'rival'; reputation: number; regulars: number }
  | { kind: 'stallServings'; target: number }
  /** Số cơ sở đang có (tiệm chính + các tòa nhà đã mở trên dải đất, hiện chỉ có tiệm xôi). */
  | { kind: 'buildingsOpened'; target: number };

export interface StoryChapterDef {
  id: string;
  chapter: number;
  title: string;
  unlockLevel: number;
  portrait: string;
  dialog: string[];
  goal: string;
  objective: StoryObjective;
  rewardMoney: number;
  rewardExp: number;
  /** Có giá trị = bắt đầu chương sẽ kích hoạt sự kiện siêu thị đối diện trong chừng này ngày. */
  rivalDays?: number;
}

/** Id sự kiện thị trường do chương kích hoạt (xem market-events.ts, không tự xuất hiện ngẫu nhiên). */
export const RIVAL_EVENT_ID = 'supermarket_rival';

/**
 * Chương cốt truyện, chuyển thể từ game gốc "tap-hoa-dau-hem". Chương 4 và 7 gốc phụ thuộc thuế theo quý và chuỗi chi nhánh,
 * chưa có thuế theo quý nên điều kiện chương 4 là doanh thu tích lũy. Chương 7 "mở chuỗi" gốc đo chi nhánh; ở đây chưa có chi nhánh nên chương 7 đo việc mở tiệm xôi (cơ sở thứ hai trên cùng dải đất).
 */
export const STORY_CHAPTERS: readonly StoryChapterDef[] = [
  { id: 'homecoming', chapter: 1, title: 'Về quê giữ tiệm', unlockLevel: 1, portrait: '👵',
    dialog: ['Bà gửi lại cho cháu tiệm tạp hóa nhỏ này.', 'Mở cửa đều đặn, chăm khách quen rồi tiệm sẽ lớn lên.'],
    goal: 'Mở cửa hàng và phục vụ khách', objective: { kind: 'customersServed', target: 1 }, rewardMoney: 50000, rewardExp: 100 },
  { id: 'growing_shop', chapter: 2, title: 'Tiệm lớn dần', unlockLevel: 10, portrait: '🧑',
    dialog: ['Khách đông hơn rồi, cháu cần sắp xếp hàng hóa cho gọn.', 'Thử mở rộng quầy và theo dõi mặt hàng bán chạy.'],
    goal: 'Đạt cấp 10', objective: { kind: 'level', target: 10 }, rewardMoney: 100000, rewardExp: 250 },
  { id: 'first_helper', chapter: 3, title: 'Có thêm người phụ', unlockLevel: 15, portrait: '👩‍💼',
    dialog: ['Bé Lan muốn xin làm thu ngân phụ tiệm.', 'Xếp ca hợp lý để cả chủ lẫn nhân viên đều có ngày nghỉ.'],
    goal: 'Đạt cấp 15 và thuê ít nhất 1 nhân viên', objective: { kind: 'levelAndStaff', level: 15, staff: 1 }, rewardMoney: 150000, rewardExp: 350 },
  { id: 'tax_officer', chapter: 4, title: 'Chị Hạnh bên thuế', unlockLevel: 16, portrait: '🧑‍💼',
    dialog: ['Chị Hạnh cán bộ thuế ghé chơi: tiệm lớn rồi thì nhớ ghi sổ và khai thuế đàng hoàng nghe em.', 'Hộ kinh doanh bán hàng mà doanh thu năm vượt 1 tỷ là phải nộp GTGT với thuế thu nhập cá nhân rồi đó, em theo dõi doanh thu sát vào.'],
    goal: 'Đạt tổng doanh thu 50.000.000 ₫', objective: { kind: 'totalRevenue', target: 50_000_000 }, rewardMoney: 200000, rewardExp: 500 },
  { id: 'rival_supermarket', chapter: 5, title: 'Siêu thị đối diện', unlockLevel: 24, portrait: '🏬',
    dialog: ['Siêu thị mới khai trương bên kia đường, khách vãng lai giảm thấy rõ.', 'Trong 10 ngày, giữ danh tiếng cao và xây cộng đồng khách quen.'],
    goal: 'Hết 10 ngày: danh tiếng ≥ 75 và có 10 khách quen', objective: { kind: 'rival', reputation: 75, regulars: 10 }, rewardMoney: 300000, rewardExp: 800, rivalDays: 10 },
  { id: 'grandma_visit', chapter: 6, title: 'Bà về thăm tiệm', unlockLevel: 28, portrait: '👵',
    dialog: ['Bà ghé thăm và thấy góc đồ ăn đông vui quá.', 'Bà nhờ cháu chuẩn bị vài món quen cho xóm mình.'],
    goal: 'Bán 10 suất ở các quầy ăn uống', objective: { kind: 'stallServings', target: 10 }, rewardMoney: 250000, rewardExp: 600 },
  { id: 'open_second_shop', chapter: 7, title: 'Mở thêm cơ sở', unlockLevel: 29, portrait: '👵',
    dialog: ['Tiệm đứng vững rồi, bà muốn cháu nghĩ xa hơn một gian hàng.', 'Mở thêm tiệm xôi sát bên: thêm một cơ sở là thêm một nguồn thu cho cả xóm.'],
    goal: 'Mở tiệm xôi (cơ sở thứ hai)', objective: { kind: 'buildingsOpened', target: 2 }, rewardMoney: 500000, rewardExp: 1000 },
];

export const STORY_CHAPTER_MAP: Record<string, StoryChapterDef> = nullProto(Object.fromEntries(STORY_CHAPTERS.map(chapter => [chapter.id, chapter])));
