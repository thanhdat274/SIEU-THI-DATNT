import { isMarketDay } from './chophien';
import { isRoadworks } from './roadwork';
import { isFestivalDeco } from './festivalDeco';

/**
 * GĐ198 — "Đọc con hẻm": gộp các tín hiệu 3D mà cảnh hẻm hiện ra thành danh sách đọc được một chỗ.
 * Mỗi nhịp dùng ĐÚNG nguồn chân lý mà bên dựng cảnh đang dùng (isMarketDay gđ181, isRoadworks gđ184,
 * isFestivalDeco gđ197) — nên helper này luôn khớp với thực tế hiển thị. Thuần đọc, không đổi
 * SAVE_VERSION/kinh tế/persist. Mục đích: dạy người chơi "con hẻm đổi cảnh theo lịch" — thấy bằng hình
 * là hiểu ý nghĩa kinh tế phía sau.
 */
export interface AlleySignal {
  id: string;
  icon: string;
  name: string;
  desc: string;
  active: boolean;
}

export function alleySignalsToday(seed: number, day: number, level: number): AlleySignal[] {
  return [
    { id: 'market', icon: '🛒', name: 'Chợ phiên', desc: 'Gánh hàng + bàn ghế dọc vỉa hè, khách đông hơn.', active: isMarketDay(day) },
    { id: 'roadwork', icon: '🚧', name: 'Sửa đường', desc: 'Rào chắn trước hẻm — ít khách đi ngang hơn.', active: isRoadworks(seed, day, level) },
    { id: 'festival', icon: '🎪', name: 'Lễ hội', desc: 'Dãy cờ treo ngang hẻm — đồ của dịp bán chạy.', active: isFestivalDeco(day) },
  ];
}

/** Có ít nhất một cảnh quang hẻm đang bật hôm nay (để thẻ gọn: không thì chỉ ghi "hẻm thường vắng"). */
export const alleyBusyToday = (seed: number, day: number, level: number): boolean =>
  alleySignalsToday(seed, day, level).some((s) => s.active);
