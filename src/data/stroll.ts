/**
 * Dạo phố: vài điểm quanh ngõ để tiêu hoặc kiếm tiền nhàn rỗi — vé số cô Sáu, chùa, ngân hàng,
 * tài xỉu góc ngõ, chú Tư cho vay nóng. THUẦN (không đụng store): mọi hàm nhận `roll` (0..1) để test
 * cố định; hành động trong store chỉ gọi vào đây. Điểm nào cũng có trần mỗi ngày, nên người chơi không
 * "cày" được; sim cân bằng không bao giờ gọi các hành động này nên golden không đổi.
 */
export const STROLL_UNLOCK = 3;

export interface Shark { owed: number; dueDay: number }
export interface StrollState {
  /** Ngày của các bộ đếm bên dưới; sang ngày mới thì đếm lại từ 0. */
  day: number;
  tickets: number;
  dice: number;
  incense: boolean;
  fortune: boolean;
  shark: Shark | null;
}
export const newStroll = (): StrollState => ({ day: 0, tickets: 0, dice: 0, incense: false, fortune: false, shark: null });

/** Bộ đếm hôm nay (đổi ngày thì reset, nợ vay nóng giữ nguyên). */
export const strollToday = (st: StrollState | undefined, day: number): StrollState => {
  const s = st ?? newStroll();
  return s.day === day ? s : { ...s, day, tickets: 0, dice: 0, incense: false, fortune: false };
};

// ── Vé số cô Sáu ────────────────────────────────────────────────────────────
export const TICKET_PRICE = 20_000;
export const TICKET_CAP = 5;
/** Bảng trúng: tổng kỳ vọng ≈ 69% giá vé — chơi cho vui, không phải nguồn tiền. */
export const TICKET_PRIZES: { upTo: number; prize: number }[] = [
  { upTo: 0.62, prize: 0 },
  { upTo: 0.87, prize: 20_000 },
  { upTo: 0.97, prize: 50_000 },
  { upTo: 0.998, prize: 100_000 },
  { upTo: 1, prize: 500_000 },
];
export const ticketPrize = (roll: number) => TICKET_PRIZES.find((p) => roll < p.upTo)?.prize ?? 0;

// ── Chùa ────────────────────────────────────────────────────────────────────
export const FORTUNE_DONATE = 10_000;
export interface Fortune { id: 'dai_cat' | 'cat' | 'binh'; label: string; text: string; boost: number }
export const FORTUNES: Fortune[] = [
  { id: 'dai_cat', label: 'Quẻ đại cát', text: 'Khách quen sẽ ghé đông hơn hôm nay.', boost: 0.08 },
  { id: 'cat', label: 'Quẻ cát', text: 'Buôn bán thuận lợi, khách ghé nhỉnh hơn một chút.', boost: 0.05 },
  { id: 'binh', label: 'Quẻ bình', text: 'Bình bình, cứ làm đều tay là được.', boost: 0 },
];
export const fortuneOf = (roll: number): Fortune => (roll < 0.15 ? FORTUNES[0] : roll < 0.6 ? FORTUNES[1] : FORTUNES[2]);

// ── Tài xỉu góc ngõ ─────────────────────────────────────────────────────────
export const DICE_STAKES = [10_000, 50_000, 200_000];
export const DICE_CAP = 3;
/** Thắng 47%, ăn gấp đôi tiền cược: nhà cái hơi lợi để không thành đường làm giàu. */
export const DICE_WIN = 0.47;
export const diceWin = (roll: number) => roll < DICE_WIN;

// ── Chú Tư cho vay nóng ─────────────────────────────────────────────────────
export const SHARK_DAYS = 5;
export const SHARK_RATE = 1.3;
export const SHARK_OVERDUE = 0.1;
/** Số tiền chú Tư cho vay theo cấp, làm tròn chục nghìn. */
export const sharkOffer = (level: number) => Math.round((Math.min(Math.max(level, 1), 60) * 20_000) / 10_000) * 10_000;
export const sharkDebt = (amount: number): Shark => ({ owed: Math.round(amount * SHARK_RATE), dueDay: 0 });
/** Nợ hiện tại: quá hạn mỗi ngày cộng thêm 10% (lãi kép), làm tròn nghìn. */
export const sharkOwedNow = (sk: Shark, day: number) =>
  Math.round((sk.owed * Math.pow(1 + SHARK_OVERDUE, Math.max(0, day - sk.dueDay))) / 1000) * 1000;

// ── Ngân hàng: dùng hệ vay có sẵn, không có số liệu riêng ────────────────────
export interface Spot { id: 'ticket' | 'temple' | 'bank' | 'dice' | 'shark'; icon: string; name: string; blurb: string }
export const SPOTS: Spot[] = [
  { id: 'ticket', icon: '🎟️', name: 'Vé số cô Sáu', blurb: 'Cào thử vận may, mỗi ngày tối đa 5 tờ.' },
  { id: 'temple', icon: '🛕', name: 'Chùa', blurb: 'Thắp nhang, xin quẻ đầu ngày cho yên bụng.' },
  { id: 'bank', icon: '🏦', name: 'Ngân hàng', blurb: 'Vay lãi thấp, trả sớm không mất phí.' },
  { id: 'dice', icon: '🎲', name: 'Tài xỉu góc ngõ', blurb: 'Chơi cho vui, nhà cái hơi lợi, tối đa 3 ván mỗi ngày.' },
  { id: 'shark', icon: '🕴️', name: 'Chú Tư cho vay nóng', blurb: 'Có tiền ngay, nhưng lãi nặng — cẩn thận.' },
];
