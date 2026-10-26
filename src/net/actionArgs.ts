/** Sự kiện giao diện (click của React hay DOM) lọt vào tham số thao tác, vd. `onClick={toggleShop}`. */
const isUiEvent = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && typeof (v as { preventDefault?: unknown }).preventDefault === 'function';

/** Bỏ sự kiện giao diện khỏi tham số trước khi gửi thao tác sang máy chạy (sự kiện không chuyển được sang JSON). */
export const cleanActionArgs = (args: unknown[]): unknown[] => args.filter((a) => !isUiEvent(a));
