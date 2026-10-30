// ============================================================================
// Data: "Sự kiện bất ngờ" thành chuyện kể — mini-arc 2–3 ngày (GĐ164)
// ----------------------------------------------------------------------------
// Audit trải nghiệm 28/10: hệ sự kiện bất ngờ (SURPRISES, core/biz.ts
// maybeSurprise) mật độ ổn nhưng MỖI LẦN LÀ MỘT PHÁT quay số — không kéo dài
// thành chuyện kể. GĐ164 thay 4 def một-phát (mua_roi · bong_da_kinh · mua_dai ·
// livestream) bằng 4 arc 2–3 ngày: mỗi ngày 1 cảnh, hệ quả hôm qua hiện trong
// văn cảnh hôm nay, chọn ấm (good) cộng thưởng cuối. Pattern nhịp theo GĐ80
// (regularArc: def thuần + state khép khi quá hạn, hết hạn không phạt) nhưng
// KHÔNG dùng biz.regularArcs (vòng khép cuối ngày của hệ đó xoá entry lạ, nhịp
// tiến khác hẳn) — arc có state riêng `biz.surpriseArc`, MỘT slot duy nhất.
//
// File này THUẦN dữ liệu + helper thuần (không import store). `EventChoice`
// mượn type-only từ biz.ts — xoá sạch khi compile, không tạo vòng import.
// ============================================================================

import type { EventChoice } from './biz';
import { productById } from './products';
import { SURPRISES } from './biz';

/** Trạng thái arc sự kiện đang/đã chạy trong ván (lưu trong BizState, một slot). */
export interface SurpriseArcState {
  arcId: string;
  /** Số cảnh đã chốt (bằng choices.length — giữ cho dễ đọc ở UI/log). */
  step: number;
  /** Lựa chọn (index option) đã chốt cho từng cảnh, theo đúng thứ tự cảnh. */
  choices: number[];
  /** Ngày phát cảnh đầu (arc mở). */
  startedDay: number;
  /** Ngày cuối cảnh vẫn có thể phát (startedDay + days − 1); quá hạn → khép nhẹ. */
  expiresDay: number;
  /** Đã khép (trả thưởng xong / chọn nhánh khép sớm / để dở quá hạn) — không phát nữa. */
  done?: boolean;
}

/** Thưởng của CẢNH CUỐI: tiền = base + perLevel × cấp + perGood × số lựa chọn ấm cả arc. */
export interface ArcReward {
  base: number;
  perLevel: number;
  perGood: number;
  /** Đánh giá 5★ tặng kèm khi khép (như def một-phát cũ: rating 5 = 1 review 5★). */
  rating?: number;
  xp?: number;
}

/** Một cảnh trong arc: phát đúng MỘT ngày, chốt bằng 1 lựa chọn. */
export interface Scene {
  id: string;
  text: string;
  /** Gợi ý ngắn một mệnh đề cho tin sáng (endDay) — để lời kể không lặp nguyên câu. */
  teaser?: string;
  options: EventChoice[];
  /** Có → cảnh CUỐI: chốt là trả thưởng và arc done. */
  reward?: ArcReward;
  /** Chỉ số scene kế tiếp trong def.scenes theo lựa chọn (index trong options);
   *  −1 = nhánh khép NGAY không thưởng ("khép sớm"); thiếu = hết cảnh, arc khép. */
  nextByChoice?: number[];
}

export interface SurpriseArcDef {
  id: string;
  /** Id def một-phát cũ mà arc này thay thế (pool lọc id này khi arc đang chiếm slot). */
  baseEventId: string;
  title: string;
  icon: string;
  unlock: number;
  /** Số ngày tối đa (mỗi ngày 1 cảnh); expiry = startedDay + days − 1. */
  days: number;
  scenes: Scene[];
}

export const SURPRISE_ARCS: SurpriseArcDef[] = [
  {
    id: 'arc_mua_roi', baseEventId: 'mua_roi', icon: '🌧️', title: 'Mưa rào trước hiên', unlock: 1, days: 2,
    // Arc dạy pattern cho người mới: ngắn, rẻ, hậu quả rõ sau một đêm.
    scenes: [
      {
        id: 'mua-1',
        teaser: 'mưa rào, mấy bác trú trước hiên',
        text: 'Trời đổ cơn mưa rào, mấy bác hàng xóm ghé trú trước hiên tiệm.',
        options: [
          { label: '🍵 Rót trà đá mời ngồi', result: 'Trà đá cạn mấy ấm, chuyện trò rôm rả mưa vẫn đổ.', money: -8000, xp: 10, good: true },
          { label: '👋 Chào cho có, đang bận', result: 'Mưa tạnh, mấy bác ra về tay không.' },
        ],
        nextByChoice: [1, 2],
      },
      {
        id: 'mua-2a',
        teaser: 'bác Tư ghé đặt gạo, nhờ chú trà hôm qua',
        text: 'Bác Tư ghé lúc tiệm vắng: "Trà chú rót hôm qua ngon thật. Để giúp bác một bao gạo, chiều ghé lấy."',
        options: [
          { label: '🌾 Giữ sẵn bao gạo chờ bác', result: 'Bác Tư ghé đúng hẹn, dặn cả xóm "tiệm này giữ lời".', needStock: { productId: 'gao', qty: 1 } },
          { label: '📞 Hứa mai mối giao tới', result: 'Chú hẹn mối gạo mai giao tận nhà, bác gật gù ra về.', xp: 5 },
        ],
        reward: { base: 25000, perLevel: 1500, perGood: 5000, rating: 5, xp: 15 },
      },
      {
        id: 'mua-2b',
        teaser: 'mưa lại, bác Tư ghé mua gạo luôn',
        text: 'Chiều mưa lại. Bác Tư đội mưa ghé mua luôn một bao gạo, lí nhí: "Hôm qua chú có mời mà bác chưa kịp uống."',
        options: [
          { label: '🍵 Mời ngược lại chén trà', result: 'Bác Tư ngồi nhâm nhi tới mưa tạnh, ra về dắt cả cháu ghé mua kẹo.', money: 20000, good: true },
          { label: '💼 Bán giá thường', result: 'Bác Tư trả tiền gạo, chúc nhau một câu rồi đi.' , money: 15000 },
        ],
      },
    ],
  },
  {
    id: 'arc_bong_kinh', baseEventId: 'bong_da_kinh', icon: '⚽', title: 'Cái kính vỡ', unlock: 4, days: 2,
    // Ngày 1 giữ nguyên 3 lựa chọn gốc của def cũ — mỗi nhánh một cảnh ngày 2 riêng.
    scenes: [
      {
        id: 'kinh-1',
        teaser: 'trái bóng vỡ cửa kính tiệm',
        text: 'Tiếng "xoang" chói tai: trái bóng của đám trẻ bay thẳng vào vỡ cửa kính tiệm.',
        options: [
          { label: 'Thay kính mới, nhẹ nhàng với tụi nhỏ', result: 'Thợ sang thay ngay, tụi nhỏ lí nhí xin lỗi — bố mẹ chúng hẹn ghé lại mai.', money: -90000, xp: 10, friendship: { id: 'bac_tam', delta: 2 } },
          { label: 'Vá tạm băng keo, dọn mảnh vỡ', result: 'Cửa chắp vá tạm, dăm bữa khách ngắm cửa cười khúc khích.', money: -10000 },
          { label: 'Bắt đền bố mẹ thằng đá', result: 'Được đền đủ tiền kính, nhưng tiếng dèm "tiệm nhỏ mà tính kỹ" bắt đầu xì xào.', money: 60000, friendship: { id: 'bac_tam', delta: -3 } },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'kinh-2a',
        teaser: 'kính mới trong veo, phụ huynh ghé tạ lỗi',
        text: 'Sáng nay kính trong veo. Bố mẹ thằng nhỏ ghé xách một túi quà, ngại quá: "Cảm ơn chú, chuyện hôm qua đừng để bụng."',
        options: [
          { label: '💛 Nhận cho qua, mời em nào chai sữa', result: 'Em nhỏ cười tít mắt, chuyện kính vỡ hoá thành chuyện quý của cả hẻm.', money: -10000, good: true },
        ],
        reward: { base: 35000, perLevel: 2000, perGood: 10000, rating: 5 },
      },
      {
        id: 'kinh-2b',
        teaser: 'khách tò mò hỏi chuyện cái kính chắp vá',
        text: 'Cái kính chắp băng keo khiến khách tò mò: "Chuyện gì mà chắp vá thế này?"',
        options: [
          { label: '😄 Kể chuyện cười', result: 'Cả quầy cười rộ, khách mua thêm ít đồ mới về.', money: 15000, good: true },
          { label: '😶 Làm như không', result: 'Khách ngắm kính một lúc rồi thôi, chuyện trôi qua lặng lẽ.', money: 5000 },
        ],
        reward: { base: 20000, perLevel: 1500, perGood: 10000, xp: 20 },
      },
      {
        id: 'kinh-2c',
        teaser: 'xóm còn dèm chuyện bắt đền cái kính',
        text: 'Tiếng dèm hôm qua chưa tạnh: vài bà xóm ghé liếc nhìn cái kính mới, cười khẩy "tiệm nhỏ mà tính kỹ".',
        options: [
          { label: '🥛 Mời đám nhỏ ly sữa xin lỗi câu', result: 'Tụi nhỏ cười khúc khích, tiếng dèm tan như mưa nắng.', money: -15000, good: true, rating: 5 },
          { label: '😐 Thôi, tiền đền là của mình', result: 'Tiền đền đủ thay kính, còn chuyện khen chê... kệ là vừa.' },
        ],
        reward: { base: 10000, perLevel: 0, perGood: 5000 },
      },
    ],
  },
  {
    id: 'arc_mua_dai', baseEventId: 'mua_dai', icon: '⛈️', title: 'Hẻm ngập ba ngày', unlock: 6, days: 3,
    // 3 ngày 3 nhánh đầu — ngày 3 chung là cảnh dọn bùn khép arc.
    scenes: [
      {
        id: 'dai-1',
        teaser: 'đầu hẻm ngập, nửa ngày không khách',
        text: 'Mưa dầm cả đêm, đầu hẻm ngập trơn. Buổi sáng trôi qua chưa thấy bóng khách nào ghé.',
        options: [
          { label: '🛶 Lội nước giao hàng cho xóm', result: 'Giao tới từng nhà, ai cũng khen, hứa gọi điện đặt thêm.', minutes: 30, good: true, xp: 20 },
          { label: '🪵 Treo ván qua vũng', result: 'Một cây ván qua vũng lớn, khách nhè nhẹ ghé được tiệm.', money: -10000 },
          { label: '🏠 Đóng cửa sớm né mưa', result: 'Ngồi chờ mưa tạnh, hôm nay doanh thu nhẹ tênh.' },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'dai-2a',
        teaser: 'xóm gọi điện đặt thêm đơn giao',
        text: 'Bữa trưa điện thoại reo liên: xóm hôm qua được giao hàng tới nhà, giờ gọi đặt thêm cả dãy.',
        options: [
          { label: '📞 Nhận đơn giao tiếp', result: 'Chiều lội nước giao nốt, xóm hướng cả dãy ghé mua bù.', minutes: 30, money: 20000 },
          { label: '😮‍💨 Nghỉ, mệt lắm rồi', result: 'Xóm hiểu chuyện, hẹn mai đặt lại.' },
        ],
        nextByChoice: [4, 4],
      },
      {
        id: 'dai-2b',
        teaser: 'khách đi bằng ván ghé đông',
        text: 'Cây ván hôm qua thành lối đi duy nhất của khúc hẻm — khách đi bằng ván ghé đông lạ thường.',
        options: [
          { label: '☕ Pha ấm trà đón khách trên ván', result: 'Chuyện trò trên ván thành chuyện kể cả hẻm, ai cũng ghé cho biết.', money: 10000, good: true },
          { label: '🙇 Cúi chào cho khách đi nhanh', result: 'Khách qua ván ghé chợ khác cho lẹ.' },
        ],
        nextByChoice: [4, 4],
      },
      {
        id: 'dai-2c',
        teaser: 'nước rút bớt — còn kịp mở cửa bán bù',
        text: 'Sáng nay nước rút bớt, vũng đầu hẻm cạn thấy đáy — còn kịp mở cửa bán bù hôm qua.',
        options: [
          { label: '🛶 Ra giao bù hôm qua', result: 'Giao bù kịp trước trưa, xóm mừng vì tiệm giữ lời.', money: 15000, good: true },
          { label: '🏠 Vẫn đóng cửa', result: 'Nước còn ngoài kia, thôi chờ thêm một ngày.' },
        ],
        nextByChoice: [4, 4],
      },
      {
        id: 'dai-3',
        teaser: 'nước rút, dọn bùn trước cửa',
        text: 'Nước rút hết, bùn non để lại trước cửa dày một lớp. Khách ngại bước vào lắm.',
        options: [
          { label: '🧹 Cả nhà quét dọn cho khách ghé thoải mái', result: 'Sẻn sạch, khách ghé lại đông như chưa từng ngập.', minutes: 30, good: true },
          { label: '🧒 Gọi Bé Na xách nước phụ', result: 'Bé Na xách nước sệ sịnh mà vui, cả xóm khen bé ngoan.', money: -10000, friendship: { id: 'be_na', delta: 2 } },
        ],
        reward: { base: 35000, perLevel: 2000, perGood: 5000, rating: 5, xp: 25 },
      },
    ],
  },
  {
    id: 'arc_clip_hot', baseEventId: 'livestream', icon: '📱', title: 'Đoạn clip hot', unlock: 10, days: 3,
    // Ngày 1 chọn "Ngại lên hình" → arc khép sớm ngay (nextByChoice −1), không ngày 2.
    scenes: [
      {
        id: 'clip-1',
        teaser: 'tiktoker xin quay "tiệm tạp hóa hoài niệm"',
        text: 'Một bạn trẻ dựng máy quay trước tiệm: "Chú ơi, cho em quay clip "tiệm tạp hóa hoài niệm" với!"',
        options: [
          { label: '🎬 Đồng ý, pha ấm trà mời', result: 'Bạn trẻ quay say, pha trà mời cả Crew, cả quầy cười giòn tan.', money: -5000, minutes: 15 },
          { label: '😅 Ngại lên hình', result: 'Bạn ấy gạt máy đi quay tiệm khác — chuyện clip thế là thôi.' },
        ],
        nextByChoice: [1, -1],
      },
      {
        id: 'clip-2',
        teaser: 'clip lên sóng đêm qua, bình luận nổ',
        text: 'Clip lên sóng đêm qua, bình luận nổ tung: "tiệm đâu chỉ mình nuôi tuổi thơ cả phường vậy!"',
        options: [
          { label: '💬 Cảm ơn bình luận, hẹn quay tiếp', result: 'Dòng bình luận ấm áp, hàng xóm nhìn vào tiệm cười hiền.', xp: 10, good: true },
          { label: '🏷️ Treo bảng "ai xem clip giảm 5%"', result: 'Khách lạ chụp bảng giảm giá chia lên mạng, ghé đông hẳn.', money: -15000 },
        ],
        nextByChoice: [2, 2],
      },
      {
        id: 'clip-3',
        teaser: 'khách lạ lần theo clip tìm tới, đứng chụp hình',
        text: 'Khách lạ lần theo clip tìm tới, đứng chụp hình trước mặt tiền "nghe nói tiệm này hot lắm".',
        options: [
          { label: '📸 Bày góc "điểm sống ảo" + khay kẹo mời', result: 'Hình tiệm lên mạng đẹp lung linh, khách xếp hàng vô mua cho có.', minutes: 20, good: true },
          { label: '🙂 Bán bình thường', result: 'Khách chụp vài tấm rồi vô mua như thường.' },
        ],
        reward: { base: 30000, perLevel: 2000, perGood: 5000, rating: 5, xp: 30 },
      },
    ],
  },
  {
    // GĐ283 — thay def một-phát "cam_do_mo" (unlock 10): bài học hẻm — hẻm đủ chỗ cho cả hai,
    // cắn nhau chỉ mất cả hai; nối mạch 2 ngày: chúc mừng/khuyến mãi/lỡ → hậu quả sáng hôm sau.
    id: 'arc_hang_xom_khai_truong', baseEventId: 'cam_do_mo', icon: '🎊', title: 'Hàng xóm khai trương', unlock: 10, days: 2,
    scenes: [
      {
        id: 'khai-1',
        teaser: 'tiệm kế bên khai trương, băng rôn pháo giấy',
        text: 'Sáng mở cửa đã nghe tiếng pháo giấy: tiệm tạp hóa "Nhật Linh" khai trương ngay kế bên, băng rôn đỏ chót. Vài người quen ghé dò: "Chú định thế nào?"',
        options: [
          { label: '🎉 Ghé chúc mừng, biếu giỏ trà', result: 'Chủ tiệm mới trẻ lắm, cầm giỏ trà lúng túng rồi tươi cười hứa "co nhau làm ăn".', money: -20000, xp: 10, good: true },
          { label: '🏷️ Treo ngay khuyến mãi giữ khách', result: 'Giảm sâu mấy món bán chạy, bảng giá đỏ lên cạnh băng rôn bên kia.', money: -25000, xp: 5 },
          { label: '😐 Cứ lo bán hàng của mình', result: 'Cười chào cho qua rồi quay vô sắp kệ, để bên kia ồn ào của họ.', xp: 5 },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'khai-2a',
        teaser: 'chủ tiệm mới ghé trả lễ, rủ chia mặt hàng',
        text: 'Chiều, chủ "Nhật Linh" ghé trả lễ một giỏ cam: "Em bán đồ khô, chú bán đồ mát — mình đừng cắn nhau."',
        options: [
          { label: '🤝 Bắt tay chia mặt hàng luôn', result: 'Hai bên dặn khách qua hẻm "ghé cả hai" — chiều đó khách bên ấy ghé mình mua nước mát.', money: 30000, good: true },
          { label: '🙂 Cảm ơn, còn tính', result: 'Giỏ cam để trên quầy, hai bên vẫn chào nhau nhưng chuyện chia hàng thì… để mai.', xp: 5 },
        ],
        reward: { base: 25000, perLevel: 1500, perGood: 5000, rating: 5, xp: 15 },
      },
      {
        id: 'khai-2b',
        teaser: 'chiến giá xuống, cả hai lỗ',
        text: 'Cuối ngày đối chiếu sổ: giảm sâu mà khách cũng chẳng đông thêm mấy — bên kia cũng lỗ tương tự. Chủ bên ghé ngồi: "Mình cắn nhau thì ai được lợi?"',
        options: [
          { label: '🤝 Gác lại, trả giá cũ', result: 'Hai bên gỡ bảng khuyến mãi cùng lúc, khách quen thở phào: "giờ này mới giống xóm mình".', xp: 15, good: true },
          { label: '😤 Giữ khuyến mãi thêm tuần', result: 'Bảng đỏ vẫn treo, lỗ thêm mỗi ngày và khách bắt đầu quen chờ giảm mới mua.', money: -15000 },
        ],
        reward: { base: 20000, perLevel: 1200, perGood: 5000, xp: 10 },
      },
      {
        id: 'khai-2c',
        teaser: 'sáng vắng tiếng nhưng khách quen vẫn ghé',
        text: 'Sáng bên kia rộn ràng, tiệm mình vắng tiếng thật — nhưng tới giờ, khách quen vẫn lók vào "chú ơi nước mát cho con".',
        options: [
          { label: '😊 Cười: hẻm đủ chỗ cho cả hai', result: 'Chiều ghé chúc mừng bên kia, chủ tiệm mới sẵn sàng giới thiệu khách sang mua đồ khô của mình.', money: 15000, good: true },
          { label: '😕 Thì thôi, kệ', result: 'Ngày trôi qua êm, chỉ là tự dưng thấy hẻm rộng hơn một chút.', xp: 5 },
        ],
        reward: { base: 20000, perLevel: 1200, perGood: 5000, xp: 10 },
      },
    ],
  },
];

export const surpriseArcById = (id: string) => SURPRISE_ARCS.find((a) => a.id === id);
/** Arc thay thế cho def một-phát id này (core dùng khi pool trúng để mở arc thay vì một-phát). */
export const arcForEvent = (baseEventId: string) => SURPRISE_ARCS.find((a) => a.baseEventId === baseEventId);

// ───── Giờ phát cảnh arc trong ngày (tất định, không RNG runtime) ─────

/** Salt riêng của GĐ164 cho hàm hash roll (cùng kiểu phoneOrders/calendar). */
const ARC_SALT = 0x164;
function roll(seed: number, day: number, salt: number) {
  let h = Math.imul((seed >>> 0) ^ (day * 2654435761), 2246822519) ^ salt;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Giờ phát cảnh arc hôm nay: 10h–11h30, tất định theo seed ván + ngày (cùng một ngày luôn cùng giờ). */
export function arcSceneAt(seed: number, day: number): number {
  return 10 * 60 + Math.floor(roll(seed, day, ARC_SALT) * 90);
}

// ───── Đi theo đường choices: cảnh hiện tại + đếm "ấm" ─────

/**
 * Cảnh ĐANG CHỜ của arc theo những lựa chọn đã ghi: đi từ scenes[0], mỗi lựa chọn
 * rẽ theo nextByChoice (thiếu mảng → hết cảnh). Hết nhánh / choice lạ (save lệch) → null.
 * Thuần, không state — gọi bao nhiêu lần cùng kết quả.
 */
export function sceneFor(def: SurpriseArcDef, state: Pick<SurpriseArcState, 'choices'>): Scene | null {
  let cur: Scene | undefined = def.scenes[0];
  for (const c of state.choices) {
    if (!cur) return null;
    const next: number | undefined = cur.nextByChoice ? cur.nextByChoice[c] : undefined;
    if (next === undefined || next < 0 || !def.scenes[next]) return null;
    cur = def.scenes[next];
  }
  return cur ?? null;
}

/** Số lựa chọn "ấm" (good) đã chốt trên đường đã đi — cộng vào thưởng cuối của arc. */
export function arcGoodCount(def: SurpriseArcDef, state: Pick<SurpriseArcState, 'choices'>): number {
  let n = 0;
  let cur: Scene | undefined = def.scenes[0];
  for (const c of state.choices) {
    if (!cur) break;
    if (cur.options[c]?.good) n++;
    const next: number | undefined = cur.nextByChoice ? cur.nextByChoice[c] : undefined;
    if (next === undefined || next < 0 || !def.scenes[next]) break;
    cur = def.scenes[next];
  }
  return n;
}

/** Thưởng cảnh cuối (tiền phụ cấp theo cấp + lựa chọn ấm, kèm rating/xp tặng nếu def có). */
export function arcReward(scene: Scene, goodCount: number, level: number): { money: number; rating?: number; xp?: number } {
  const r = scene.reward;
  if (!r) return { money: 0 };
  return { money: r.base + r.perLevel * level + r.perGood * goodCount, rating: r.rating, xp: r.xp };
}

/** Cảnh của arc CHƯA chốt cho ngày `day` chưa: arc còn dở, trong hạn, và số cảnh đã chốt
 *  chưa vượt số ngày đã trôi (cảnh hôm nay — hoặc hôm trước bị lỡ — vẫn chờ). */
export function arcScenePending(st: SurpriseArcState, day: number): boolean {
  if (st.done || day < st.startedDay || day > st.expiresDay) return false;
  return st.choices.length <= day - st.startedDay;
}

// ───── findSurprise: tra arc TRƯỚC rồi mới tới SURPRISES (dùng bởi UI + core) ─────

/** Mặt hiển thị chung cho alert: cả arc lẫn một-phát đều có đủ icon/title/text/choices. */
export type SurpriseView =
  | { kind: 'one'; id: string; icon: string; title: string; text: string; choices: EventChoice[] }
  | { kind: 'arc'; id: string; icon: string; title: string; text: string; choices: EventChoice[]; arc: SurpriseArcDef; scene: Scene };

/**
 * Tra sự kiện đang hiện theo id lưu trong `biz.surprise.id`: id của ARC tra trước
 * (cảnh hiện tại resolve theo `choices` đã chốt), không thấy mới tới pool SURPRISES.
 * `choices` chỉ dùng cho arc — truyền `biz.surpriseArc?.choices` từ store.
 */
export function findSurprise(id: string, choices: number[] = []): SurpriseView | null {
  const arc = surpriseArcById(id);
  if (arc) {
    const scene = sceneFor(arc, { choices });
    if (!scene) return null;
    return { kind: 'arc', id, icon: arc.icon, title: arc.title, text: scene.text, choices: scene.options, arc, scene };
  }
  const ev = SURPRISES.find((e) => e.id === id);
  if (!ev) return null;
  return { kind: 'one', id, icon: ev.icon, title: ev.title, text: ev.text, choices: ev.choices };
}

/** Tên ngắn của món cho cảnh báo "kho hết {món} rồi". */
export const needStockLabel = (need: { productId: string; qty: number }) =>
  `${productById(need.productId).name} (cần ${need.qty})`;
