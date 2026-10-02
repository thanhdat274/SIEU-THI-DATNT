/**
 * Mẫu lời đánh giá bằng chữ của khách. Câu chứa `{product}` được thay bằng tên món liên quan; `{wait}` bằng số giây chờ.
 * Thêm câu mới chỉ cần thêm dòng ở đây (không đổi logic).
 * Cập nhật 02/10/2026: mở rộng từ ~38 lên ~80 câu chính + ~20 câu ngữ cảnh để tránh lặp.
 */

/** Tên khách vãng lai; khách quen dùng tên riêng của họ. */
export const REVIEW_AUTHORS: readonly string[] = [
  'Cô Hoa', 'Chú Tư', 'Chị Mai', 'Anh Long', 'Bác Sáu', 'Dì Ba', 'Anh Quân', 'Cô Lan', 'Chú Hải', 'Chị Thảo', 'Cậu Phúc', 'Bà Út',
];

/** Câu chính theo số sao khi khách mua xong (không có lý do bỏ đi). */
export const REVIEW_BY_STARS: Record<number, readonly string[]> = {
  5: [
    'Tiệm gọn gàng, cần gì cũng có, tính tiền nhanh. Sẽ ghé lại.',
    'Mua một lèo là xong, chủ tiệm niềm nở. Năm sao!',
    'Hàng đủ, giá phải chăng, đi ngang hẻm là tôi ghé.',
    'Kệ sắp ngăn nắp, tìm đồ không mất công. Rất ưng.',
    'Tiệm nhỏ nhưng đủ thứ, tôi mua quà cho cả nhà.',
    'Ghé mỗi lần đi làm, cái gì cũng có, hết chê.',
    'Chủ nhà dễ thương, hàng hóa tươi mới. Sẽ ủng hộ dài dài.',
    'Mua nhanh lắm, không phải chờ đợi. Tiệm rất đáng tin.',
  ],
  4: [
    'Ổn áp, hàng đủ. Chỉ chờ tính tiền hơi lâu một chút.',
    'Tiệm sạch sẽ, mua được món cần. Giá nhỉnh hơn chút xíu.',
    'Khá tốt, lần sau chắc ghé lại.',
    'Hàng hóa đa dạng, chỉ tiếc hàng nóng nhanh hết.',
    'Mua sắm vui vẻ, nhân viên dễ gần. Trừ chút ít vì chờ đợi.',
    'Tiệm này tiện lắm, gần nhà lại có đủ đồ ăn uống.',
    'Có khá nhiều món tôi không tìm thấy, nhưng tổng thể ổn.',
  ],
  3: [
    'Tạm được. Mua xong nhưng phải chờ hơi lâu.',
    'Bình thường thôi, chưa có gì nổi bật.',
    'Đồ có nhưng giá hơi cao so với chợ đầu hẻm.',
    'Hàng hóa ổn nhưng tiệm hơi tối, cần thêm đèn.',
    'Mua được món cần, nhưng không khí hơi ngột ngạt.',
    'Tiệm nhỏ nên đi lại hơi khó chịu, nhưng đồ thì đủ.',
    'Phục vụ ổn nhưng giá đồ uống hơi chát so với vỉa hè.',
  ],
  2: [
    'Không hài lòng lắm: chờ lâu mà giá lại cao.',
    'Mua được nhưng trải nghiệm chưa tốt, hơi tiếc.',
    'Đứng đợi khá lâu mới được tính tiền, lần sau cân nhắc.',
    'Hàng thì có, nhưng cách phục vụ làm tôi hơi nản.',
    'Tiệm nhỏ mà khách đông thì đông luôn, không chịu nổi.',
    'Giá tiền không tương xứng với chất lượng dịch vụ.',
    'Tôi mong nhập thêm hàng tươi ngon hơn, đồ khô quá.',
  ],
  1: [
    'Tệ: chờ mãi, giá cao, mua xong còn bực. Tôi sẽ không quay lại.',
    'Quá thất vọng với lần ghé này.',
    'Chưa bao giờ phải chờ lâu như vậy ở một tiệm tạp hóa. Thôi, tạm biệt.',
    'Giá chát, phục vụ chậm. Không giới thiệu cho hàng xóm đâu.',
    'Hết tiền và hết kiên nhẫn. Không đáng để quay lại lần nữa.',
    'Tiệm nào cũng tệ hơn tiệm này. Chán lắm.',
    'Mua hàng không phải là trải nghiệm khó thế này. Rất bực mình.',
    'Tôi đã từng mua hàng nhanh hơn chờ ở đây. Không hài lòng.',
  ],
};

/** Câu chính khi khách bỏ về, theo lý do. */
export const REVIEW_BY_REASON: Record<string, readonly string[]> = {
  out_of_stock: [
    'Kệ {product} trống trơn, đi một vòng rồi ra về tay không.',
    'Muốn mua {product} mà hết hàng. Chủ tiệm nhớ nhập thêm nhé.',
    'Ghé đúng lúc {product} hết, tiếc ghê.',
    'Tìm khắp tiệm mà không thấy {product}. Thôi về chợ vậy.',
    'Đang cần {product} mà tiệm hết sạch, hơi bất ngờ.',
    'Lần trước còn hàng, lần này {product} đã hết, chủ tiệm kiểm kho đi.',
    'Tôi chỉ để mua {product} mà thôi, tiếc quá.',
  ],
  price: [
    '{product} giá cao hơn chỗ khác, tôi để lại kệ rồi.',
    'Thấy giá {product} là thôi, mua chỗ khác rẻ hơn.',
    '{product} mà giá này thì mua ở siêu thị còn rẻ.',
    'Tiệm mình tốt nhưng giá {product} hơi hời hợt.',
    'Tôi định mua {product} nhưng tính lại thấy đắt quá.',
    'Nhìn giá {product} là tôi đổi ý, chỗ khác còn rẻ hơn.',
    'Muốn ủng hộ nhưng giá không chịu được.',
  ],
  wait: [
    'Đứng chờ tính tiền mãi không ai ra, tôi bỏ về.',
    'Chờ hơn {wait} giây vẫn chưa tới lượt, hết kiên nhẫn.',
    'Khách ít thế mà cũng để排队, tiếc quá.',
    'Tôi thấy chủ tiệm bận quá, tính tiền chậm nên về luôn.',
    'Đứng ngoài nhìn vào, ai cũng chờ, tôi không chịu nổi.',
    'Tiệm nhỏ thì nên chuẩn bị thêm người bán hàng.',
    'Quá lâu để tính tiền một món đồ nhỏ. Thất vọng.',
  ],
  store_closed: [
    'Đi tới nơi thì tiệm đã đóng cửa, uổng công.',
    'Tiệm đóng cửa rồi, hôm khác ghé lại vậy.',
    'Đang đói mà tiệm đã nghỉ, tiếc hùi hụi.',
    'Chạy bộ từ xa mà đến nơi đã đóng cửa.',
    'Tiệm mình mở sớm được không, hôm nào cũng đóng.',
    'Vừa lúc tôi qua thì tiệm đóng, đúng là xui xẻo.',
  ],
  unreachable: [
    'Lối đi tới kệ {product} bị chắn, tôi không lấy được.',
    'Kệ bày chật quá, không với tới được {product}.',
    'Muốn lấy {product} mà kệ bí quá, khôngwith tới.',
    'Lối đi giữa các kệ chật như nêm, khó khăn lắm.',
    'Kệ hàng chồng chất, khó lấy đồ ở tầng trên.',
    'Tiệm nhỏ mà bày nhiều quá, đi lại chật vật.',
  ],
};

/** Câu thêm tùy ngữ cảnh (chọn tối đa một); `tone` giới hạn câu chỉ dùng cho sao cao hoặc thấp. */
export interface ReviewDetail {
  id: string;
  tone: 'positive' | 'negative' | 'any';
  text: string;
}

export const REVIEW_DETAILS: readonly ReviewDetail[] = [
  // Mưa
  { id: 'rain', tone: 'positive', text: 'Trời mưa mà tiệm vẫn đủ đồ, quý lắm.' },
  { id: 'rain', tone: 'negative', text: 'Trời mưa sẵn mà còn gặp chuyện này, càng bực.' },
  { id: 'rain', tone: 'any', text: 'Trời mưa mà vẫn tiện có tiệm gần nhà.' },
  // Bảo vệ trông xe
  { id: 'guard', tone: 'positive', text: 'Có bác bảo vệ trông xe nên yên tâm vào mua.' },
  { id: 'guard', tone: 'positive', text: 'Đỗ xe có người trông, mua sắm an tâm lắm.' },
  // Món hàng
  { id: 'product', tone: 'positive', text: 'Mua {product} rất ưng.' },
  { id: 'product', tone: 'positive', text: '{product} ở đây ngon hơn chỗ khác.' },
  // Giá mềm
  { id: 'cheap', tone: 'positive', text: 'Giá mềm hơn tôi nghĩ.' },
  { id: 'cheap', tone: 'positive', text: 'Hỏi giá thì bất ngờ vì rẻ quá.' },
  // Giá chát
  { id: 'pricey', tone: 'negative', text: 'Giá nhỉnh hơn chỗ khác.' },
  { id: 'pricey', tone: 'negative', text: 'Tính lại thấy hơi mắc.' },
  // Cuối tuần
  { id: 'weekend', tone: 'positive', text: 'Cuối tuần đông mà vẫn gọn gàng.' },
  { id: 'weekend', tone: 'positive', text: 'Ngày nghỉ ghé tiệm vui lắm, tuy đông nhưng có duyên.' },
  { id: 'weekend', tone: 'negative', text: 'Cuối tuần đông quá, không chịu nổi.' },
  // Khách quen
  { id: 'regular', tone: 'positive', text: 'Tôi là khách quen của tiệm này mà.' },
  { id: 'regular', tone: 'positive', text: 'Ghé tiệm mỗi ngày như thói quen.' },
  { id: 'regular', tone: 'negative', text: 'Khách quen như tôi mà gặp vậy thì buồn.' },
  { id: 'regular', tone: 'negative', text: 'Tôi ủng hộ tiệm hoài mà lần này thất vọng.' },
  // Giao thông
  { id: 'traffic', tone: 'positive', text: 'Hẻm rộng ra, đi lại dễ chịu hơn.' },
  { id: 'traffic', tone: 'negative', text: 'Đường vào hẻm bây giờ hơi kẹt.' },
];

/** Số lời đánh giá giữ lại trong save. */
export const REVIEW_HISTORY_CAP = 60;
