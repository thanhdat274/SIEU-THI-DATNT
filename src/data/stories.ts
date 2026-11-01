import type { StoryChapter, SurpriseDef } from './biz';

/** Mỗi khách quen 3 chương, mở khi thân thiết đạt mốc và khách ghé tiệm. Nạp lười (loadStories) — văn bản dài, không cần trong gói tải ban đầu. */
export const STORIES: Record<string, StoryChapter[]> = {
  ba_nam: [
    { at: 10, title: 'Gánh xôi đầu hẻm', text: 'Bà Năm kể đã bán xôi ở đầu hẻm 30 năm, nuôi ba đứa con ăn học.', reward: { xp: 20 } },
    { at: 30, title: 'Bà Năm bị cảm', text: 'Mấy hôm nay bà ho nhiều. Bà dặn: "Mai con mang giùm bà hộp sữa nghen." Đơn gọi điện của bà được thêm thân thiết.', reward: { xp: 40 } },
    { at: 60, title: 'Mâm xôi cảm ơn', text: 'Khỏi bệnh, bà mang tặng tiệm một mâm xôi gấc: "Tiệm con tốt bụng quá."', reward: { money: 100000, xp: 80 } },
  ],
  chu_ba: [
    { at: 10, title: 'Chiếc Dream cũ', text: 'Chú Ba chạy xe ôm bằng chiếc Dream đời 95, chú bảo "xe già mà bền".', reward: { xp: 20 } },
    { at: 30, title: 'Xe hư giữa đường', text: 'Xe chú chết máy, chú ngồi uống nước ở tiệm chờ thợ, tâm sự chuyện con gái sắp cưới.', reward: { xp: 40 } },
    { at: 60, title: 'Thiệp cưới', text: 'Chú Ba gửi thiệp cưới con gái, mời cả tiệm. Chú rủ thêm anh em xe ôm ghé mua đồ.', reward: { money: 80000, xp: 80 } },
  ],
  be_na: [
    { at: 10, title: 'Kẹo mút dâu', text: 'Bé Na kể bé để dành tiền ăn sáng mua kẹo mút dâu.', reward: { xp: 20 } },
    { at: 30, title: 'Mùa thi', text: 'Bé Na sắp thi vào lớp 10, ghé mua tập vở và hỏi bài.', reward: { xp: 40 } },
    { at: 60, title: 'Đậu trường chuyên!', text: 'Bé Na chạy vào khoe đậu trường chuyên, má Na đặt cả thùng bánh mời xóm.', reward: { money: 120000, xp: 80 } },
  ],
  chi_lan: [
    { at: 10, title: 'Dân văn phòng', text: 'Chị Lan làm kế toán, sáng nào cũng ghé mua cà phê lon.', reward: { xp: 20 } },
    { at: 30, title: 'Bị sa thải', text: 'Công ty chị cắt giảm nhân sự. Chị định mở tiệm bánh online, hỏi tiệm có bán sỉ không.', reward: { xp: 40 } },
    { at: 60, title: 'Tiệm bánh của chị Lan', text: 'Tiệm bánh online của chị Lan đắt hàng, chị nhập bột sữa ở tiệm mình và giới thiệu bạn bè.', reward: { money: 150000, xp: 80 } },
  ],
  anh_tuan: [
    { at: 10, title: 'Cú đêm', text: 'Anh Tuấn làm lập trình, tối nào cũng ghé mua mì với nước tăng lực.', reward: { xp: 20 } },
    { at: 30, title: 'Dự án khởi nghiệp', text: 'Anh đang làm app gọi đồ tạp hóa, hỏi tiệm có muốn thử không.', reward: { xp: 40 } },
    { at: 60, title: 'App chạy rồi!', text: 'App của anh Tuấn ra mắt, tiệm là đối tác đầu tiên. Anh tặng tiền thưởng cho đối tác sớm.', reward: { money: 200000, xp: 100 } },
  ],
  bac_tam: [
    { at: 10, title: 'Tổ trưởng tổ dân phố', text: 'Bác Tám lo việc chung cả hẻm, ghé tiệm là hỏi chuyện xóm.', reward: { xp: 20 } },
    { at: 30, title: 'Đèn hẻm hư', text: 'Bác than đèn đường hư, tối khách ngại đi. Bác vận động cả xóm góp tiền sửa.', reward: { xp: 40 } },
    { at: 60, title: 'Hẻm sáng đèn', text: 'Đèn hẻm sửa xong, bác Tám khen tiệm đóng góp nhiều nhất trước cuộc họp tổ.', reward: { money: 100000, xp: 80 } },
  ],
  co_mai_bar: [
    { at: 10, title: 'Trước giờ mở quán', text: 'Sáng nào Cô Mai cũng tạt qua lấy lốc sữa đặc với túi cà phê rồi mới mở quán. Cô kể quán nhỏ mà sống nhờ hàng chuẩn.', reward: { xp: 20 } },
    { at: 30, title: 'Cuối tuần cạn nguyên liệu', text: 'Quán cô cuối tuần đông bất thường, cà phê với sữa đặc cạn sạch. Cô ghé vay tạm mấy lốc của tiệm, hẹn mai trả; từ đó thân như người trong nhà.', reward: { xp: 40 } },
    { at: 60, title: 'Cà phê phin đầu ngõ', text: 'Cô Mai ghi lên menu dòng "cà phê phin đầu ngõ", nguyên liệu lấy ở tiệm mình. Khách hỏi ở đâu mua gói cà phê ngon vậy, cô chỉ thẳng qua hẻm.', reward: { money: 120000, xp: 80 } },
  ],
  chu_tu_ho: [
    { at: 10, title: 'Ca nung lò gạch', text: 'Chú Tư làm ca nung lò gạch cuối làng, mồ hôi nước gì cũng ra. Tan ca là ghé tiệm lấy bia mát với lon tăng lực bù sức.', reward: { xp: 20 } },
    { at: 30, title: 'Trật khớp vai', text: 'Chú trật khớp vai phải nghỉ vài bữa, nhờ thằng con ghé mua hộ bia với nước tăng lực cho cả đội. Tiệm gói thêm hộp bánh gửi tặng, chú nhắn cám ơn tới tận cửa hàng.', reward: { xp: 40 } },
    { at: 60, title: 'Cỗ ăn mừng của lò', text: 'Năm nay lò trả thưởng hậu, chú Tư rủ cả đội ghé tiệm mua nguyên thùng về làm cỗ. Chú chốt một câu: "Quán của anh em lò gạch đây rồi!"', reward: { money: 100000, xp: 80 } },
  ],
  co_xuan_cho: [
    { at: 10, title: 'Hết chợ mới tiện ghé', text: 'Cô Xuân đi chợ rau từ bốn giờ sáng, hết chợ mới tiện ghé mua gia vị với xà phòng về nấu cơm. Cô khen tiệm bày hàng ngay ngắn, giá "chợ thật".', reward: { xp: 20 } },
    { at: 30, title: 'Mưa lớn rau hư', text: 'Trận mưa lớn làm rau hư cả dãy. Cô Xuân rủ bà con chợ chở rau còn lành tặng xóm trũng, tiệm mình góp mấy lít nước mắm theo xe. Cô cám ơn ròng rã mấy hôm.', reward: { xp: 40 } },
    { at: 60, title: 'Cả dãy hàng ghé', text: 'Cô Xuân rủ cả dãy hàng chợ ghé mua sỉ, bảo "tiệm này tính giá thiệt, khỏi phải mặc cả". Từ đó sáng nào trước cửa tiệm cũng nghe tiếng chợ rôm rả.', reward: { money: 80000, xp: 80 } },
  ],
  suc_khanh_long: [
    { at: 10, title: 'Ly trà trước giờ tụng kinh', text: 'Sư cụ Khánh Long đi khất thực ngang hẻm, ghé lấy ít trà với chuối về chùa. Cụ kể nhà Tổ vừa sơn lại, khách thơ tới lễ ngày càng đông.', reward: { xp: 20 } },
    { at: 30, title: 'Rằm giữ hẹn', text: 'Rằm Vu Lan chùa khách đông, cụ nhờ tiệm để dành trà với chuối. Tiệm giữ đúng lời hẹn, cụ gật gù: "Giữ đúng lời hẹn cũng là một phước."', reward: { xp: 40 } },
    { at: 60, title: 'Trà của ngõ nhỏ', text: 'Sau giờ khóa tu, sư cụ mời chủ tiệm lên chùa uống trà, bảo "ngõ nhỏ mà lòng rộng". Phật tử theo cụ ghé tiệm mua trà về cúng, ai cũng khoan thai lễ phép.', reward: { money: 80000, xp: 80 } },
  ],
};

/** Sự kiện bất ngờ (văn bản dài) — nạp lười cùng STORIES. */
export const SURPRISES: SurpriseDef[] = [
  {
    id: 'hoi_duong', icon: '🧭', title: 'Khách hỏi đường', unlock: 1,
    text: 'Một cô lạ mặt hỏi đường tới bệnh viện quận.',
    choices: [
      { label: 'Chỉ đường tận tình', result: 'Cô cảm ơn rối rít, còn mua chai nước.', xp: 10, money: 6000, minutes: 5 },
      { label: 'Đang bận, xin lỗi', result: 'Cô đi hỏi nhà khác.' },
    ],
  },
  {
    id: 've_chai', icon: '♻️', title: 'Người mua ve chai', unlock: 2,
    text: 'Chú ve chai hỏi mua đống thùng carton sau kho.',
    choices: [
      { label: 'Bán thùng carton', result: 'Kho gọn gàng hơn, có thêm ít tiền.', money: 25000, minutes: 10 },
      { label: 'Để dành đựng hàng', result: 'Chú đạp xe đi tiếp.' },
    ],
  },
  {
    id: 'xe_do', icon: '🚚', title: 'Xe tải đổ hàng trước cửa', unlock: 4,
    text: 'Xe tải chở nước ngọt va ổ gà, thùng rơi đầy đường trước tiệm.',
    choices: [
      { label: 'Ra phụ nhặt (mất 20 phút)', result: 'Tài xế cảm ơn, tặng một ít tiền cà phê. Hàng xóm khen tiệm tốt bụng.', money: 50000, minutes: 20, rating: 5 },
      { label: 'Mặc kệ, lo bán hàng', result: 'Đường kẹt một lúc, vài khách ngại ghé.' },
    ],
  },
  {
    id: 'chuot', icon: '🐭', title: 'Có chuột trong kho', unlock: 3,
    text: 'Nghe sột soạt trong kho, hình như có chuột gặm bao bánh.',
    choices: [
      { label: 'Mua bẫy chuột (40.000đ)', result: 'Bắt được con chuột, kho yên ổn.', money: -40000 },
      { label: 'Kệ nó', result: 'Mất vài gói bánh, nên nuôi mèo đi!', money: -20000 },
    ],
  },
  {
    id: 'tu_thien', icon: '🙏', title: 'Quyên góp từ thiện', unlock: 6,
    text: 'Tổ dân phố đi quyên góp cho bà con vùng lũ.',
    choices: [
      { label: 'Góp 100.000đ', result: 'Tên tiệm được đọc trên loa phường, cả xóm quý.', money: -100000, rating: 5, xp: 30, friendship: { id: 'bac_tam', delta: 3 } },
      { label: 'Góp ít hàng (20.000đ)', result: 'Bà con cảm ơn.', money: -20000, xp: 10, friendship: { id: 'bac_tam', delta: 2 } },
      { label: 'Từ chối', result: 'Bác tổ trưởng hơi buồn.', friendship: { id: 'bac_tam', delta: -2 } },
    ],
  },
  {
    id: 'kiem_tra', icon: '📋', title: 'Phường kiểm tra vệ sinh', unlock: 9,
    text: 'Cán bộ phường ghé kiểm tra vệ sinh an toàn thực phẩm.',
    choices: [
      { label: 'Đưa đi xem kho, giải thích kỹ', result: 'Đạt chuẩn, được khen trước xóm.', xp: 40, minutes: 15, rating: 5 },
      { label: 'Xin hẹn hôm khác', result: 'Bị nhắc nhở, nộp phạt hành chính nhỏ.', money: -80000 },
    ],
  },
  {
    id: 'mat_dien', icon: '🔌', title: 'Mất điện bất chợt', unlock: 7,
    text: 'Cúp điện cả khu, tủ mát tắt. Đồ lạnh khó giữ lâu.',
    choices: [
      { label: 'Chạy máy phát (60.000đ)', result: 'Tủ mát vẫn chạy, hàng an toàn.', money: -60000 },
      { label: 'Giảm giá bán gấp đồ lạnh', result: 'Bán lỗ một chút nhưng khỏi bỏ hàng.', money: -30000, xp: 10 },
    ],
  },
  {
    id: 'nhoc_an_trom', icon: '🍬', title: 'Nhóc con giấu kẹo', unlock: 2,
    text: 'Bắt gặp thằng bé nhà cuối xóm giấu gói kẹo vào cặp.',
    choices: [
      { label: 'Nhắc nhở nhẹ nhàng', result: 'Thằng bé lí nhí xin lỗi, trả lại kẹo. Xóm thấy chủ tiệm hiền mà nghiêm.', xp: 20, rating: 5, friendship: { id: 'be_na', delta: 2 } },
      { label: 'Gọi phụ huynh', result: 'Bố mẹ cuống quýt cảm ơn, mua tạ lỗi thêm ít đồ.', money: 30000, xp: 5, friendship: { id: 'be_na', delta: -2 } },
      { label: 'Làm ngơ cho nó đi', result: 'Mất một gói kẹo — nhưng nó còn nhỏ, thôi kệ.', money: -6000 },
    ],
  },
  {
    id: 'ga_sot', icon: '🐔', title: 'Gà lạc vào tiệm', unlock: 3,
    text: 'Con gà của nhà hàng xóm chạy vào tiệm, cả dãy phố rộn ràng đuổi bắt.',
    choices: [
      { label: 'Bắt giúp đem trả', result: 'Bà hàng xóm biếu chục trứng tươi để cảm ơn.', money: 25000, rating: 5, xp: 15 },
      { label: 'Đuổi thẳng cổ ra ngoài', result: 'Con gà chạy mất, bà hàng xóm lẩm bẩm cả buổi.' },
    ],
  },
  // GĐ164: def "mua_roi" chuyển thành arc "Mưa rào trước hiên" (data/surpriseArcs.ts).
  {
    id: 'buc_hoa', icon: '🖌️', title: 'Họa sĩ xin vẽ tường', unlock: 11,
    text: 'Một họa sĩ trẻ muốn vẽ bức tranh tường "tiệm tạp hóa xưa" bên hông tiệm.',
    choices: [
      { label: 'Đồng ý (góp 50.000đ sơn)', result: 'Bức tường nổi bần bật, khách lạ tò mò ghé chụp hình rồi vô mua.', money: -50000, xp: 60, rating: 5 },
      { label: 'Từ chối, để tường trống', result: 'Họa sĩ vẽ nhà người khác, không sao.' },
    ],
  },
  {
    id: 'dam_cuoi', icon: '💒', title: 'Đám cưới xóm', unlock: 5,
    text: 'Nhà đầu hẻm cưới, cô phù dâu ghé mua cả thùng nước ngọt với bánh kẹo làm quà cưới.',
    choices: [
      { label: 'Gói sỉ tính ưu đãi', result: 'Nhà cưới cảm ơn rối rít, xóm nghe tới đâu khen giá phải tới đó.', money: 85000, minutes: 15, xp: 20, rating: 5 },
      { label: 'Bán lẻ giá thường', result: 'Thùng nước với bánh kẹo bán kha khá, hôm nay khá tiền.', money: 50000 },
      { label: 'Hàng thiếu, từ chối', result: 'Nhà cưới ghé chợ lớn mua cho rồi.' },
    ],
  },
  // GĐ164: def "mua_dai" chuyển thành arc "Hẻm ngập ba ngày" (data/surpriseArcs.ts).
  {
    id: 'tan_hoc', icon: '🎒', title: 'Tan học ùa vào tiệm', unlock: 1,
    text: 'Chuông tan học vừa dứt, đám học sinh trường bên cắp cặp ùa vào mua kẹo bánh.',
    choices: [
      { label: 'Bày sẵn khay kẹo mời chọn', result: 'Tiếng cười rôm rả khắp tiệm, mỗi em một ít mà thu về cũng kha khá.', money: 35000, xp: 10 },
      { label: 'Tặng thêm em nào mua một viên kẹo', result: 'Tụi nhỏ reo lên tưng bừng, chiều mai rủ nhau ghé đông hơn.', money: 25000, xp: 15, rating: 5, friendship: { id: 'be_na', delta: 2 } },
      { label: 'Dặn mua nhanh, đừng nô đùa', result: 'Tụi nhỏ mua vội rồi tản ra, mai có khi ghé tiệm khác.', friendship: { id: 'be_na', delta: -1 } },
    ],
  },
  {
    id: 'khach_quen_vi', icon: '👛', title: 'Khách quên ví', unlock: 3,
    text: 'Cô khách vừa bày hàng lên quầy mới hét lên: "Chết rồi, quên ví ở nhà!"',
    choices: [
      { label: 'Cho nợ, mai quay lại trả', result: 'Sáng hôm sau cô mang tiền tới đủ, còn dặn dì ghé mua chung.', money: 32000, xp: 15, rating: 5, friendship: { id: 'chi_lan', delta: 3 } },
      { label: 'Gửi giỏ hàng lại, mai mua', result: 'Cô ôm giỏ ra về, món kia để tới mai không biết còn không.', friendship: { id: 'chi_lan', delta: -1 } },
    ],
  },
  {
    id: 'xe_chan_hem', icon: '🚛', title: 'Xe tải chắn hẻm', unlock: 5,
    text: 'Xe tải chở tủ lạnh ghế ngang hẻm nghỉ trưa, hai đầu kẹt cứng không qua nổi.',
    choices: [
      { label: 'Mời bác tài vô uống trà, chỉ đường vòng', result: 'Xe lùi ra nhanh gọn, chú tài chiều nào qua hẻm cũng tạt ghé mua nước.', money: -15000, minutes: 10, xp: 20, rating: 5, friendship: { id: 'chu_ba', delta: 2 } },
      { label: 'Chờ chú tài tự xoay xở', result: 'Đợi nửa tiếng hẻm mới thông, mấy chuyến khách lỡ dở đi.', minutes: 25 },
    ],
  },
  {
    id: 'ban_cu_xu', icon: '☕', title: 'Bạn cũ ghé thăm', unlock: 8,    text: 'Bạn cũ thời đi làm chung dừng xe đầu hẻm, gọi lớn: "Bữa nay làm chủ rồi hả?"',
    choices: [
      { label: 'Rót trà, ngồi chuyện chuyện xưởng cũ', result: 'Chuyện trò vui vẻ, bạn mua thùng mì về biếu, hứa dắt cả xưởng ghé.', money: 40000, minutes: 20, xp: 25 },
      { label: 'Xin lỗi, hôm nay đông khách', result: 'Bạn cười xuề xòa phóng xe đi, hẹn dịp khác.' },
    ],
  },
  {
    id: 'gioi_chua', icon: '🍚', title: 'Giỗ chùa phát cơm', unlock: 12,
    text: 'Sư cụ gửi lời: chùa giỗ lộc phụ phát cơm từ thiện, còn thiếu gạo với bánh.',
    choices: [
      { label: 'Góp 80 nghìn, chiều lên phụ phát', result: 'Phát cơm tới tối mỏi lưng mà lòng nhẹ tênh, Phật tử ghé mua nến về cúng.', money: -80000, minutes: 30, xp: 45, rating: 5, friendship: { id: 'suc_khanh_long', delta: 3 } },
      { label: 'Góp túi bánh (20 nghìn)', result: 'Sư cụ cảm ơn, niệm phước cho cả tiệm.', money: -20000, xp: 15, friendship: { id: 'suc_khanh_long', delta: 2 } },
      { label: 'Quán bận, thôi', result: 'Sư cụ gật đầu chào, nhờ nhà khác giúp.', friendship: { id: 'suc_khanh_long', delta: -1 } },
    ],
  },
  {
    id: 'meo_la', icon: '🐈', title: 'Mèo lạ vào tiệm', unlock: 2,
    text: 'Một con mèo vàng gầy len vào nằm ngay kệ bánh, kêu khàn khàn nghe thương quá.',
    choices: [
      { label: 'Mua hộp sữa cho nó (10 nghìn)', result: 'Nó cuộn tròn ngủ cạnh quầy, tụi nhỏ ghé vuốt mèo rồi mua kẹo.', money: -10000, xp: 15, rating: 5 },
      { label: 'Đuổi ra ngoài, khỏi phá hàng', result: 'Nó bỏ đi kêu la ngoài đường một lúc lâu mới lặng.' },
    ],
  },
  // GĐ283: def "cam_do_mo" chuyển thành arc "Hàng xóm khai trương" (data/surpriseArcs.ts).
  {
    id: 'ong_cu_khat', icon: '🫗', title: 'Ông cụ xin nước', unlock: 1,
    text: 'Một ông cụ quần áo cũ đứng trước cửa, giọng khàn đặc: "Cho con xin miếng nước."',
    choices: [
      { label: 'Rót nước mát, kèm gói bánh', result: 'Ông cụ cúi đầu cảm ơn mãi, bà con qua đường nhìn vào ánh mắt dịu dàng.', money: -8000, xp: 20, rating: 5 },
      { label: 'Rót nước thôi', result: 'Ông cụ uống xong cúi chào rồi đi tiếp.', xp: 5 },
      { label: 'Chỉ vô lấy nước ở vòi sau', result: 'Ông cụ lầm lũi ra đi, người ngồi uống trà liếc nhìn.' },
    ],
  },
  {
    id: 'cho_giam_gia', icon: '🛍️', title: 'Chợ xả hàng giảm giá', unlock: 9,
    text: 'Chợ phường xả hàng giảm tới nửa giá, buổi trưa tiệm mình vắng rõ.',
    choices: [
      { label: 'Treo bảng "giá xóm, hàng chuẩn"', result: 'Khách quen ghé lại, bảo tin tiệm mình hơn chợ giảm giá.', xp: 20, rating: 5, friendship: { id: 'chu_ba', delta: 2 } },
      { label: 'Cắt giá theo vài món', result: 'Bán mỏng lãi mấy hôm nhưng đỡ hụt khách.', money: -30000 },
      { label: 'Giữ nguyên giá', result: 'Vài khách xách túi chợ lướt qua, chiều nay nhẹ tênh.', friendship: { id: 'chu_ba', delta: -1 } },
    ],
  },
  // GĐ164: def "bong_da_kinh" chuyển thành arc "Cái kính vỡ" (data/surpriseArcs.ts).
  {
    id: 'bac_tai_nuoc', icon: '🧃', title: 'Bác tài khát nước', unlock: 3,
    text: 'Chú tài chở cát ghế giữa hẻm, mặt mũi lấm láp: "Cho xin chai nước với!"',
    choices: [
      { label: 'Biếu luôn thùng nước mát', result: 'Chú tài ghi mặt, sau nào xe cát qua hẻm cũng tạt ghé mua đồ.', money: -20000, xp: 20, rating: 5 },
      { label: 'Bán chai nước giá thường', result: 'Chú tài mua nhanh rồi lên xe chạy tiếp.', money: 10000 },
      { label: 'Hết nước rồi', result: 'Chú tài nhún vai lên xe, bụi cát lồng lộng trước cửa cả buổi.' },
    ],
  },
  {
    id: 'ba_ve_so', icon: '🎫', title: 'Bà bán vé số', unlock: 2,
    text: 'Bà bán vé số đứng phất phơ trước cửa, nắng trưa đổ thẳng lưng bà cháy nắng.',
    choices: [
      { label: 'Mua giúp năm tờ vé số', result: 'Mua 50 nghìn trúng về 20 nghìn — coi như quen mặt bà, từ đó bà ngồi mé cửa tiệm.', money: -30000, xp: 10, rating: 5 },
      { label: 'Mời ly trà, mua một tờ cho vui', result: 'Bà cảm ơn rối rít, dời ghế sang mé đường cho cửa tiệm thoáng.', money: -10000, xp: 5 },
      { label: 'Lắc đầu', result: 'Bà đứng nguyên chỗ cũ, vài khách ngại bước qua mới vô.' },
    ],
  },
  {
    id: 'sinh_vien_quay', icon: '🎬', title: 'Sinh viên xin quay phim', unlock: 13,
    text: 'Nhóm sinh viên môn ghi hình xin quay "một buổi ở tiệm tạp hóa" và phỏng vấn bạn mười lăm phút.',
    choices: [
      { label: 'Đồng ý, pha thêm ấm trà mời', result: 'Cuốn phim đạt điểm cao, phụ huynh lớp bên tìm tới hỏi thăm tiệm.', minutes: 15, xp: 35, rating: 5 },
      { label: 'Cho chụp nhanh vài tấm', result: 'Nhóm quay vội vài cú rồi thu dọn ra đi.', xp: 5 },
      { label: 'Từ chối, đang bận kiểm kê', result: 'Nhóm cảm ơn rồi ghé tiệm bên kia phường quay.' },
    ],
  },
  {
    id: 'anh_sang_hu', icon: '💡', title: 'Đèn cháy giữa cơn mưa', unlock: 6,
    text: 'Đèn huỳnh quang chập chờn rồi tắt ngúm giữa cơn mưa, tiệm tối thui trưa ngày.',
    choices: [
      { label: 'Thay băng đèn mới ngay', result: 'Tiệm sáng choang như thường, khách ngại gì không ghé.', money: -45000, xp: 10 },
      { label: 'Cầm đèn pin soi tạm', result: 'Soi đèn bán tạm cho vài khách quen, hẹn mai thay đèn sau.', money: 5000 },
    ],
  },
  {
    id: 'dam_hieu', icon: '🕯️', title: 'Nhà xóm có đám hiếu', unlock: 7,
    text: 'Nhà cuối hẻm có đám hiếu, người nhà ghé mua nến, băng keo với mấy thùng nước.',
    choices: [
      { label: 'Gói gọn, bớt phần tiền nước', result: 'Nhà hiếu cảm tạ, cả dãy hẻm khen tiệm mình biết điều.', money: -10000, xp: 20, rating: 5 },
      { label: 'Bán đủ giá, lo chu đáo', result: 'Đơn lớn hiếm hoi, hôm nay bù được kha khá.', money: 45000 },
      { label: 'Hàng thiếu, xin lỗi', result: 'Nhà hiếu ghé tiệm đầu phường mua cho rồi.' },
    ],
  },
  {
    id: 'bien_hieu', icon: '🪧', title: 'Hãng nước rủ treo biển', unlock: 11,
    text: 'Hãng nước ngọt rủ treo biển quảng cáo trước tiệm, trả tiền thuê mặt bằng đều tháng.',
    choices: [
      { label: 'Cho treo, nhận tiền thuê', result: 'Biển to rực rỡ, có khách chê rối mắt nhưng tiền thuê đều tay.', money: 60000, xp: 10, friendship: { id: 'ba_nam', delta: -2 } },
      { label: 'Từ chối, giữ mặt tiền xưa', result: 'Mặt tiền mộc mạc như chục năm qua, khách quen tấm tắc "tiệm vẫn y cũ".', friendship: { id: 'ba_nam', delta: 2 } },
    ],
  },
  // ───── GĐ165: 5 def một-phát cấp thấp (pool mỏng sau khi GĐ164 chuyển 4 def thành arc) ─────
  {
    id: 'chuot_kho', icon: '🐭', title: 'Chuột quấy kho hàng đêm qua', unlock: 1,
    text: 'Đêm qua nghe sột soạt trong kho, sáng ra bao mì bị gặm rách một góc.',
    choices: [
      { label: 'Đặt bẫy chuột (5.000đ)', result: 'Cài miếng bẫy gỗ sau bao mì, tối nghe "tách" một tiếng — kho lại yên ổn.', money: -5000 },
      { label: 'Mời chú mèo hàng xóm sang trông giúp', result: 'Con mèo nhà bác Tám nằm chồm hổm ngay kho, chuột lánh khỏi tới. Bác Tám ghé thấy cười tít mắt.', minutes: 10, friendship: { id: 'bac_tam', delta: 1 } },
      { label: 'Dọn lại kho', result: 'Chuyển bao đựng lên kệ gỗ, lấp kín lỗ chui — chuột hết chỗ nấp, mối lo hạ hỏa luôn.', minutes: 15 },
    ],
  },
  {
    id: 'tre_dau_cau', icon: '🎈', title: 'Bọn trẻ đá cầu vỡ chai nước trước cửa', unlock: 1,
    text: 'Quả cầu của đám trẻ trước cửa bay trúng chai nước mắm bày ngoài bục, vỡ toang dưới chân.',
    choices: [
      { label: 'Đền chai, rồi mua vui cùng bọn trẻ', result: 'Đền chai nước mắm, tiện đá vài quả cho tụi nhỏ reo hò. Bé Na hứa chiều mai rủ cả lũ ghé mua kẹo.', minutes: 5, friendship: { id: 'be_na', delta: 1 } },
      { label: 'Tính tiền chai cho xong', result: 'Trừ nhanh hai nghìn tiền chai, đám nhỏ lí nhí xin lỗi rồi dời sân đi chỗ khác.', money: -2000 },
      { label: 'Dặn dò cho đá, đừng gần quầy', result: 'Tụi nhỏ ngoan ngoãn dời sân sang đất trống cuối hẻm, tiếng cầu vẫn rộn rã bên tai.' },
    ],
  },
  {
    id: 'ban_ghe_hong', icon: '🪑', title: 'Bàn ghế trước cửa sập một chân', unlock: 2,
    text: 'Bộ bàn ghế nhỏ trước cửa sập một chân, cô khách đứng mua phải vịn vào quầy.',
    choices: [
      { label: 'Gọi thợ mộc đầu hẻm', result: 'Chú mộc sang bắt lại chân ghế chắc nịch, tiện chuyện chuyện xóm nửa buổi.', money: -15000 },
      { label: 'Tự vót tre đựa lại', result: 'Vót khúc tre già chèn chân ghế, ngồi phịch phịch vẫn vững — tự tay làm được việc vui sao.', minutes: 20, xp: 5 },
      { label: 'Để đó mai tính', result: 'Ghế nghiêng một bên, khách ghé đứng mua xong rồi ra luôn.' },
    ],
  },
  {
    id: 'mat_dien_trua', icon: '🧊', title: 'Mất điện trưa, tủ lạnh ngừng chạy', unlock: 3,
    text: 'Trưa nắng oi cúp điện, tủ lạnh ngừng ù — sữa chua với kem nằm giữa tủ nghe đáng lo.',
    choices: [
      { label: 'Chạy mua đá cứu tủ', result: 'Gánh hai bao đá từ quán nước đổ đầy khoang đá, đồ giữa tủ giữ mát tới giờ có điện lại.', money: -10000 },
      { label: 'Treo bảng giảm giá món dễ tan', result: 'Kem với sữa chua bán giá hời trước khi mềm nhũn, chị Lan ghé lấy luôn vài hộp.', money: 8000, xp: 10 },
      { label: 'Chờ có điện lại thôi', result: 'Điện có lại thì gần chiều, mở tủ kem chảy nhũn — mấy hộp sữa chua đành bỏ.', money: -20000 },
    ],
  },
  {
    id: 'xe_khach_do', icon: '🚌', title: 'Xe khách đổ cả đoàn trước hẻm', unlock: 5,
    text: 'Xe khách ghé giữa hẻm nhả cả đoàn khách xuống nghỉ chân, gói gánh la liệt trước cửa.',
    choices: [
      { label: 'Chào mồi nước mát mời nghỉ', result: 'Cà xoong trà đá mời từng người, mấy chú tài ghi mặt hẻm — chuyến sau ghé hẳn.', money: -3000, xp: 10 },
      { label: 'Bán giá thường, phục vụ nhanh', result: 'Bánh mì, nước suối, bịch sữa — đoàn mua đủ thứ, mười phút quầy đông vui như chợ.', money: 25000, xp: 5 },
      { label: 'Chào mồi rồi ghi sổ khách quen', result: 'Mời nước xong ghi sổ mấy chuyến xe, chú Ba xe ôm thấy cười: "Cả đoàn ghé thì ghi hẳn hoi đi!"', money: 15000, friendship: { id: 'chu_ba', delta: 1 } },
    ],
  },
];
