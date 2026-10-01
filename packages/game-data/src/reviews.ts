/**
 * Mẫu lời đánh giá bằng chữ của khách. Câu chứa `{product}` được thay bằng tên món liên quan; `{wait}` bằng số giây chờ.
 * Thêm câu mới chỉ cần thêm dòng ở đây (không đổi logic).
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
  ],
  4: [
    'Ổn áp, hàng đủ. Chỉ chờ tính tiền hơi lâu một chút.',
    'Tiệm sạch sẽ, mua được món cần. Giá nhỉnh hơn chút xíu.',
    'Khá tốt, lần sau chắc ghé lại.',
  ],
  3: [
    'Tạm được. Mua xong nhưng phải chờ hơi lâu.',
    'Bình thường thôi, chưa có gì nổi bật.',
    'Đồ có nhưng giá hơi cao so với chợ đầu hẻm.',
  ],
  2: [
    'Không hài lòng lắm: chờ lâu mà giá lại cao.',
    'Mua được nhưng trải nghiệm chưa tốt, hơi tiếc.',
    'Đứng đợi khá lâu mới được tính tiền, lần sau cân nhắc.',
    'Hàng thì có, nhưng cách phục vụ làm tôi hơi nản.',
  ],
  1: [
    'Tệ: chờ mãi, giá cao, mua xong còn bực. Tôi sẽ không quay lại.',
    'Quá thất vọng với lần ghé này.',
    'Chưa bao giờ phải chờ lâu như vậy ở một tiệm tạp hóa. Thôi, tạm biệt.',
    'Giá chát, phục vụ chậm. Không giới thiệu cho hàng xóm đâu.',
  ],
};

/** Câu chính khi khách bỏ về, theo lý do. */
export const REVIEW_BY_REASON: Record<string, readonly string[]> = {
  out_of_stock: [
    'Kệ {product} trống trơn, đi một vòng rồi ra về tay không.',
    'Muốn mua {product} mà hết hàng. Chủ tiệm nhớ nhập thêm nhé.',
    'Ghé đúng lúc {product} hết, tiếc ghê.',
  ],
  price: [
    '{product} giá cao hơn chỗ khác, tôi để lại kệ rồi.',
    'Thấy giá {product} là thôi, mua chỗ khác rẻ hơn.',
  ],
  wait: [
    'Đứng chờ tính tiền mãi không ai ra, tôi bỏ về.',
    'Chờ hơn {wait} giây vẫn chưa tới lượt, hết kiên nhẫn.',
  ],
  store_closed: [
    'Đi tới nơi thì tiệm đã đóng cửa, uổng công.',
  ],
  unreachable: [
    'Lối đi tới kệ {product} bị chắn, tôi không lấy được.',
    'Kệ bày chật quá, không với tới được {product}.',
  ],
};

/** Câu thêm tùy ngữ cảnh (chọn tối đa một); `tone` giới hạn câu chỉ dùng cho sao cao hoặc thấp. */
export interface ReviewDetail {
  id: string;
  tone: 'positive' | 'negative' | 'any';
  text: string;
}

export const REVIEW_DETAILS: readonly ReviewDetail[] = [
  { id: 'rain', tone: 'positive', text: 'Trời mưa mà tiệm vẫn đủ đồ, quý lắm.' },
  { id: 'rain', tone: 'negative', text: 'Trời mưa sẵn mà còn gặp chuyện này, càng bực.' },
  { id: 'guard', tone: 'positive', text: 'Có bác bảo vệ trông xe nên yên tâm vào mua.' },
  { id: 'product', tone: 'positive', text: 'Mua {product} rất ưng.' },
  { id: 'cheap', tone: 'positive', text: 'Giá mềm hơn tôi nghĩ.' },
  { id: 'pricey', tone: 'negative', text: 'Giá nhỉnh hơn chỗ khác.' },
  { id: 'weekend', tone: 'positive', text: 'Cuối tuần đông mà vẫn gọn gàng.' },
  { id: 'regular', tone: 'positive', text: 'Tôi là khách quen của tiệm này mà.' },
  { id: 'regular', tone: 'negative', text: 'Khách quen như tôi mà gặp vậy thì buồn.' },
];

/** Số lời đánh giá giữ lại trong save. */
export const REVIEW_HISTORY_CAP = 60;
