// GĐ559: dữ liệu arc bất ngờ (chữ dài) tách khỏi gói tải ban đầu; nạp cùng loadStories().
import type { SurpriseArcDef } from './surpriseArcs';

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
  // ═══════════ GĐ Hệ2-L5 (SPEC §2.6) — NGƯỜI KHẮC KHẨU ═══════════
  // Ba cạnh khắc khẩu trong regularTies (chu_ba×bac_ba_xe_om, ba_ba_thit×chu_sau_ca,
  // chi_be_live×vy_live) mỗi cạnh một arc 3 cảnh theo đúng §2.6:
  //   1) chạm mặt lời qua tiếng lại → bênh A / bênh B / mời cả hai ly trà (good).
  //   2) hôm sau người phật ý không ghé, người kia kể → nhắn lời / mặc kệ / mang quà sang (good).
  //   3) hoà giải: ngồi chung bàn quán nước, bắt tay làm lành → cạnh khắc khẩu thành Bạn bè
  //      (ghi tieKey vào biz.tiesMended qua `healsTie` — good mới hoà, "mặc kệ" khép sớm không hoà).
  // unlock = 32 (R1: ≥32 giữ golden L30) — đây là nội dung Hệ 2, mở sau khi hẻm bắt đầu có quan hệ.
  // needRegulars: chỉ vào pool khi CẢ HAI đã từng ghé — kể chuyện hai người mình từng gặp.
  {
    id: 'arc_kk_xe_om', baseEventId: 'x_khac_khau_xe_om', icon: '🛵', title: 'Hai bác tài giành cuốc', unlock: 32, days: 3,
    needRegulars: ['chu_ba', 'bac_ba_xe_om'], healsTie: { a: 'chu_ba', b: 'bac_ba_xe_om' },
    // Chú Ba × Bác Ba xe ôm: giành chỗ đầu hẻm đón cuốc (note cạnh: "hai người giành cuốc đầu hẻm").
    scenes: [
      {
        id: 'kk-xe-1',
        teaser: 'hai bác tài cãi nhau ngay trước quầy',
        text: 'Sáng sớm, Chú Ba xe ôm và Bác Ba xe ôm cùng vọt tới quầy, ai cũng xưng mình "chủ cuốc sớm" chỗ đầu hẻm. Lời qua tiếng lại ngay trước quầy nước.',
        options: [
          { label: '🛵 Đứng về phía Chú Ba', result: 'Chú Ba gật gù, Bác Ba hầm hầm bỏ đi: "Được rồi, mai mốt đừng gọi ông!".', friendship: { id: 'chu_ba', delta: 2 } },
          { label: '🛺 Đứng về phía Bác Ba', result: 'Bác Ba vểnh mặt, Chú Ba lắc đầu: "Xóm này giờ kỵ nhau rồi."', friendship: { id: 'bac_ba_xe_om', delta: 2 } },
          { label: '🍵 Mời cả hai ly trà xanh xoa dịu', result: 'Hai bác uống trà, còn hờn nhau nhưng ít nhất chịu ngồi cạnh nhau.', needStock: { productId: 'x_tra_xanh', qty: 2 }, xp: 10, good: true },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'kk-xe-2a',
        teaser: 'Bác Ba không ghé hôm nay, Chú Ba kể chuyện',
        text: 'Hôm nay Bác Ba không ghé như mọi khi. Chú Ba ghé, giọng chùng: "Tui có hơi quá tay hôm qua... mà ổng cũng vậy mà." Nói xong nhìn trông chờ.',
        options: [
          { label: '💬 Nhắn lời với Bác Ba giùm chú', result: 'Chú Ba gật: "Vậy nhờ cậu nói ổng nghe là tui không giận."', xp: 10, good: true },
          { label: '🎁 Mang quà sang nhà Bác Ba', result: 'Rót chai nước ngọt, Chú Ba cầm sang bên kia đầu hẻm.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, chuyện của hai người', result: 'Chú Ba ậm ừ rồi ra về, chuyện giấu trong bụng.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-xe-2b',
        teaser: 'Chú Ba không ghé, Bác Ba kể chuyện',
        text: 'Chú Ba hôm nay biệt tăm. Bác Ba ghé, cười gượng: "Ông Bà ổng còn giận hả? Tui cũng... hơi lỡ lời."',
        options: [
          { label: '💬 Nhắn lời với Chú Ba giùm bác', result: 'Bác Ba gật gù: "Cậu nói giùm là tui gác chuyện lại."', xp: 10, good: true },
          { label: '🎁 Mang quà sang nhà Chú Ba', result: 'Cầm chai nước ngọt, Bác Ba sang bên kia cắm đầu.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, chuyện của hai người', result: 'Bác Ba thở dài rồi rảo bước, chuyện để đấy.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-xe-2c',
        teaser: 'hai bác chịu ngồi lại, còn hờn nhẹ',
        text: 'Ly trà hôm qua phá băng: sáng nay Chú Ba và Bác Ba cùng ghé, còn né mặt nhau nhưng chịu ngồi hai chỗ cạnh nhau.',
        options: [
          { label: '🫖 Rót thêm trà, để hai người nói chuyện', result: 'Trà thêm ấm, hai bác bắt đầu bàn chuyện cuốc xe — lời qua lại nhẹ bẫng.', xp: 10, good: true },
          { label: '🙂 Để tự nhiên', result: 'Hai bác ngồi yên một hồi rồi ai đi nấy, chưa ngã ngũ.', xp: 3 },
        ],
        nextByChoice: [4, -1],
      },
      {
        id: 'kk-xe-3',
        teaser: 'hai bác tài ngồi chung bàn làm lành',
        text: 'Hôm nay cả hai bác tài ngồi chung bàn ở quán nước, mặt giãn ra hẳn. Bác Ba chìa tay: "Ông thù dai ghê! Thôi, mình chia ca, sáng ông chiều tui — chứ giành nhau làm gì."',
        options: [
          { label: '🤝 Vui lòng bắt tay làm lành cho cả hai', result: 'Hai bác tài bắt tay, từ nay xóm không còn tiếng cãi nhau đầu hẻm. Khách chứng kiến khen tiệm "lo chuyện xóm mát tay".', good: true },
        ],
        reward: { base: 45000, perLevel: 2200, perGood: 8000, rating: 5, xp: 30 },
      },
    ],
  },
  {
    id: 'arc_kk_cho', baseEventId: 'x_khac_khau_cho', icon: '🥩', title: 'Quầy thịt với mớ cá', unlock: 32, days: 3,
    needRegulars: ['ba_ba_thit', 'chu_sau_ca'], healsTie: { a: 'ba_ba_thit', b: 'chu_sau_ca' },
    // Bà Ba bán thịt × Chú Sáu chài lưới: thịt với cá giành khách chợ (note cạnh: "thịt với cá giành khách chợ").
    scenes: [
      {
        id: 'kk-cho-1',
        teaser: 'Bà Ba với Chú Sáu cãi nhau trước quầy',
        text: 'Chú Sáu chài lưới mang mớ cá lên chợ, ghé quầy tiệm nghe Bà Ba đang mách khách "cá chợ này không bằng thịt nhà bà". Hai người cãi vã ngay trước quầy.',
        options: [
          { label: '🥩 Đứng về phía Bà Ba', result: 'Bà Ba tỏ vẻ thắng thế, Chú Sáu hậm hực: "Bà kia coi chừng cá tui ngon hơn!".', friendship: { id: 'ba_ba_thit', delta: 2 } },
          { label: '🐟 Đứng về phía Chú Sáu', result: 'Chú Sáu vểnh mặt, Bà Ba bĩu môi bỏ đi: "Thịt bà vẫn hơn!".', friendship: { id: 'chu_sau_ca', delta: 2 } },
          { label: '🍵 Mời cả hai ly trà xanh cho nguội', result: 'Cả hai uống trà, còn căng nhưng bớt nóng, khách chợ đứng xem cũng cười.', needStock: { productId: 'x_tra_xanh', qty: 2 }, xp: 10, good: true },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'kk-cho-2a',
        teaser: 'Chú Sáu không ghé, Bà Ba buồn bực',
        text: 'Hôm nay Chú Sáu không ghé mua mì nước như mọi khi. Bà Ba ghé, giọng tự ái: "Chả lẽ tui nói quá lời hả cậu? Mà cá ổng cũng ngon thật đấy."',
        options: [
          { label: '💬 Nhắn lời với Chú Sáu giùm bà', result: 'Bà Ba gật: "Vậy nhờ cậu nói giùm, chợ này đủ chỗ cho cả thịt lẫn cá."', xp: 10, good: true },
          { label: '🎁 Mang quà sang cho Chú Sáu', result: 'Chai nước ngọt cùng lời chào, Bà Ba mang sang bến sông.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, chợ ai nấy bán', result: 'Bà Ba thở dài, chuyện thịt cá cứ để đấy.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-cho-2b',
        teaser: 'Bà Ba không ghé, Chú Sáu kể chuyện',
        text: 'Chú Sáu ghé mua mì, thấy Bà Ba vắng mặt thì ngập ngừng: "Hôm qua tui có hơi nóng... Bà ấy bán thịt ngon thiệt, khách trả giá là tại tui khó ở."',
        options: [
          { label: '💬 Nhắn lời với Bà Ba giùm chú', result: 'Chú Sáu gật: "Nhờ cậu nói giùm là chú không giận."', xp: 10, good: true },
          { label: '🎁 Mang quà sang cho Bà Ba', result: 'Cầm chai nước ngọt, Chú Sáu sang quầy thịt.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, chợ ai nấy bán', result: 'Chú Sáu lẳng lặng mua mì rồi ra bến.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-cho-2c',
        teaser: 'hai người chịu ngồi xuống chén trà',
        text: 'Ly trà hôm qua có tác dụng: sáng nay Bà Ba và Chú Sáu cùng ghé, ngồi cách nhau một bàn nhưng không cãi nữa.',
        options: [
          { label: '🫖 Rót thêm trà, để hai người nói chuyện', result: 'Trà nguội dần, hai người bắt đầu bàn "thịt kho với cá kho món nào đãi khách".', xp: 10, good: true },
          { label: '🙂 Để tự nhiên', result: 'Hai người ngồi im một lúc rồi ai đi nấy.', xp: 3 },
        ],
        nextByChoice: [4, -1],
      },
      {
        id: 'kk-cho-3',
        teaser: 'Bà Ba với Chú Sáu ngồi chung bàn làm lành',
        text: 'Hôm nay Bà Ba và Chú Sáu ngồi chung bàn quán nước. Bà Ba cười: "Thôi, mình phụ nhau — khách chợ muốn thịt lẫn cá." Chú Sáu gật đầu đưa tay bắt.',
        options: [
          { label: '🤝 Vui lòng bắt tay làm lành cho cả hai', result: 'Hai người bắt tay, quầy thịt quầy cá từ nay giới thiệu khách qua lại. Tiệm được tiếng "dàn hoà việc chợ".', good: true },
        ],
        reward: { base: 45000, perLevel: 2200, perGood: 8000, rating: 5, xp: 30 },
      },
    ],
  },
  {
    id: 'arc_kk_live', baseEventId: 'x_khac_khau_live', icon: '📱', title: 'Sóng ai hot hơn', unlock: 32, days: 3,
    needRegulars: ['chi_be_live', 'vy_live'], healsTie: { a: 'chi_be_live', b: 'vy_live' },
    // Chị Bé live sale × Chị Vy livestream: giành người xem (note cạnh: "giành người xem"). Vy unlock 34.
    scenes: [
      {
        id: 'kk-live-1',
        teaser: 'hai chị livestream cãi nhau về lượt xem',
        text: 'Chị Bé live sale ghé lấy trái cây quay clip, chị Vy livestream cũng vừa tới. Chị Bé chê "sóng của em khô quá", chị Vy bảo "sóng chị đông lượt hơn". Hai chị cãi nhau ngay cạnh quầy.',
        options: [
          { label: '📱 Đứng về phía Chị Bé', result: 'Chị Bé hả hê, chị Vy bĩu môi: "Được rồi, xem ai giữ khán giả!".', friendship: { id: 'chi_be_live', delta: 2 } },
          { label: '🎥 Đứng về phía Chị Vy', result: 'Chị Vy cười tươi, chị Bé quay đi: "Sóng em chưa sợ ai!".', friendship: { id: 'vy_live', delta: 2 } },
          { label: '🍵 Mời cả hai ly trà xanh ngồi xuống', result: 'Hai chị uống trà, còn sừng sộ nhưng chịu ngồi lại.', needStock: { productId: 'x_tra_xanh', qty: 2 }, xp: 10, good: true },
        ],
        nextByChoice: [1, 2, 3],
      },
      {
        id: 'kk-live-2a',
        teaser: 'Chị Vy không ghé, Chị Bé kể chuyện',
        text: 'Hôm nay chị Vy không ghé săn đồ hot. Chị Bé ghé, giọng hối lỗi: "Tui hơi quá lời với chị Vy... mà sóng cũng cần nhau thiệt."',
        options: [
          { label: '💬 Nhắn lời với chị Vy giùm chị Bé', result: 'Chị Bé gật: "Nhờ cậu nói giùm, mình cùng đẩy hàng cho tiệm."', xp: 10, good: true },
          { label: '🎁 Mang quà sang cho chị Vy', result: 'Chai nước ngọt cùng lời chào, Chị Bé cầm sang.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, sóng ai nấy lo', result: 'Chị Bé thở dài rồi ra về.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-live-2b',
        teaser: 'Chị Bé không ghé, Chị Vy kể chuyện',
        text: 'Chị Vy ghé săn đồ quay đêm, thấy chị Bé vắng thì cười gượng: "Tui với chị Bé giận nhau hoài cũng chán. Hai đứa chạy sóng khác giờ mà."',
        options: [
          { label: '💬 Nhắn lời với chị Bé giùm chị Vy', result: 'Chị Vy gật: "Nhờ cậu nói giùm là hết giận."', xp: 10, good: true },
          { label: '🎁 Mang quà sang cho chị Bé', result: 'Cầm chai nước ngọt, Chị Vy sang bên kia.', needStock: { productId: 'x_nuoc_ngot', qty: 1 }, xp: 10, good: true },
          { label: '🙇 Thôi, sóng ai nấy lo', result: 'Chị Vy lẳng lặng ra về.', xp: 3 },
        ],
        nextByChoice: [4, 4, -1],
      },
      {
        id: 'kk-live-2c',
        teaser: 'hai chị chịu ngồi lại chén trà',
        text: 'Ly trà hôm qua có tác dụng: chiều nay hai chị cùng ghé, ngồi cạnh nhau, còn nhìn nhau nhưng bớt gay hẳn.',
        options: [
          { label: '🫖 Rót thêm trà, để hai người nói chuyện', result: 'Trà thêm ấm, hai chị bắt đầu bàn "qua sóng nhau đẩy hàng chung cho tiệm".', xp: 10, good: true },
          { label: '🙂 Để tự nhiên', result: 'Hai chị ngồi im một lúc rồi ai về nấy.', xp: 3 },
        ],
        nextByChoice: [4, -1],
      },
      {
        id: 'kk-live-3',
        teaser: 'hai chị ngồi chung bàn làm lành',
        text: 'Hôm nay Chị Bé và Chị Vy ngồi chung bàn quán nước. Chị Bé cười: "Thôi mình hợp sức, khách theo chị Vy đêm thì theo em trưa — tiệm mình thành quán quay luôn." Chị Vy gật đầu.',
        options: [
          { label: '🤝 Vui lòng bắt tay làm lành cho cả hai', result: 'Hai chị bắt tay, từ nay qua sóng nhau livestream cho tiệm — khán giả kéo về ầm ầm. Bớt một mối khắc khẩu trong hẻm.', good: true },
        ],
        reward: { base: 45000, perLevel: 2200, perGood: 8000, rating: 5, xp: 30 },
      },
    ],
  },
];
