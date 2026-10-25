/** Mặc cả và thối tiền lẻ ở quầy: chuyện nhỏ mỗi ngày của tiệm tạp hóa. */

/** Khách vãng lai mặc cả: từ cấp này, hóa đơn từ mức này, tỉ lệ mỗi lần tính tiền. */
export const HAGGLE_UNLOCK = 2;
export const HAGGLE_MIN_TOTAL = 20000;
export const HAGGLE_CHANCE = 0.08;
/** Khách xin bớt chừng này phần hóa đơn (làm tròn nghìn). */
export const HAGGLE_SHARE = 0.1;
/** Không bớt thì chừng này phần khách vẫn vui vẻ mua. */
export const HAGGLE_REFUSE_OK = 0.6;

/** Thiếu tiền lẻ: tỉ lệ mỗi lần tính tiền khi hóa đơn lẻ (không tròn 5.000đ). */
export const CHANGE_UNLOCK = 1;
export const CHANGE_CHANCE = 0.06;
/** Thối bằng kẹo thì chừng này phần khách thấy phiền. */
export const CANDY_ANNOY = 0.4;

/** Ghi sổ mà bị từ chối: khách quen hơi buồn. */
export const CREDIT_REFUSE_FRIEND_LOSS = 2;

/** Hết chừng này phút game mà chưa chọn thì tự chọn mặc định. */
export const ASK_MINUTES = 15;

export const haggleOff = (total: number) => Math.max(1000, Math.round((total * HAGGLE_SHARE) / 1000) * 1000);

/** Tiền lẻ phải thối khi khách đưa tờ chẵn 5.000đ; 0 = hóa đơn tròn, không thiếu lẻ. */
export const oddChange = (total: number) => (total % 5000 === 0 ? 0 : 5000 - (total % 5000));
