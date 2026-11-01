import { dayEffects } from './calendar';

/**
 * GĐ184 — Hôm nay con đường trước hẻm có đang sửa không? Đây là sự kiện thị trường `roadworks`
 * của `dayEffects` (đã làm giảm lượt khách đi ngang ×0.8 ngay trong kinh tế ngày — xem calendar.ts).
 * Helper thuần đọc, cùng nguồn chân lý với sim: dùng nó để dựng cảnh báo bằng hình (rào chắn công
 * trình ở mép vỉa hè) cho đúng ngày "đường đang sửa". Không đổi SAVE_VERSION/kinh tế/persist.
 */
export const isRoadworks = (seed: number, day: number, level: number): boolean =>
  dayEffects(seed, day, level).market?.kind === 'roadworks';
