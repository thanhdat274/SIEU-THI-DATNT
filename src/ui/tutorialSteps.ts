import type { GameState } from '../core/store';

/** Playtest P0 T2: 2 bước đầu chỉ tích khi người chơi TỰ làm (hàng khai trương có sẵn trong kho/kệ không tính).
 *  5 bước hướng dẫn ngày đầu — dùng chung cho bảng hướng dẫn, nhấp nháy nút dock và marker sau quầy. */
export function tutorialSteps(s: GameState): { label: string; done: boolean }[] {
  return [
    { label: 'Nhập hàng (📦 Nhập hàng)', done: s.deliveries.length > 0 || s.totals.spent > 0 },
    // GĐ1823 (review R6): kệ không mở bằng click — phải đứng gần (≤1,2 m) bấm B (main.tsx
    // buildInteractables) hoặc mở Sơ đồ kệ; label cũ "bấm vào kệ" khiến người mới click vô ích.
    { label: 'Bày hàng lên kệ (đến gần kệ bấm B)', done: !!s.biz.tutShelved },
    { label: 'Mở cửa tiệm', done: s.shopOpen || s.totals.customers > 0 },
    // GĐ1823 (review R4): bán hàng tại quầy tự chạy — đứng quầy là để chốt kèo/mặc cả/đặt trước,
    // label phải nói đúng điều đó kẻo người mới chờ "được dạy tính tiền" mà không có gì dạy.
    { label: 'Đứng quầy chốt đơn (mặc cả, đặt hàng trước)', done: s.totals.itemsSold > 0 },
    { label: 'Tối về nhà đi ngủ', done: s.day > 1 },
  ];
}

/** Bước đang dừng của hướng dẫn (bước đầu chưa xong); -1 khi đã xong hết. */
export const tutorialStep = (s: GameState): number => tutorialSteps(s).findIndex((x) => !x.done);

/** Tutorial ngày đầu đang hiện: ngày 1, chưa bấm ẩn và còn bước chưa xong. */
export const tutorialActive = (s: GameState): boolean => s.day === 1 && !s.biz.tutorialOff && tutorialStep(s) >= 0;
