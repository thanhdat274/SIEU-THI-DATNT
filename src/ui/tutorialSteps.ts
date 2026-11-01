import type { GameState } from '../core/store';

/** 5 bước hướng dẫn ngày đầu — dùng chung cho bảng hướng dẫn, nhấp nháy nút dock và marker sau quầy. */
export function tutorialSteps(s: GameState): { label: string; done: boolean }[] {
  return [
    { label: 'Nhập hàng (📦 Nhập hàng)', done: Object.values(s.storage).some((q) => q > 0) || s.deliveries.length > 0 || s.totals.itemsSold > 0 },
    { label: 'Bày hàng lên kệ (bấm vào kệ)', done: s.furniture.some((f) => f.tiers.some((t) => t.count > 0)) },
    { label: 'Mở cửa tiệm', done: s.shopOpen || s.totals.customers > 0 },
    { label: 'Đứng quầy tính tiền cho khách', done: s.totals.itemsSold > 0 },
    { label: 'Tối về nhà đi ngủ', done: s.day > 1 },
  ];
}

/** Bước đang dừng của hướng dẫn (bước đầu chưa xong); -1 khi đã xong hết. */
export const tutorialStep = (s: GameState): number => tutorialSteps(s).findIndex((x) => !x.done);

/** Tutorial ngày đầu đang hiện: ngày 1, chưa bấm ẩn và còn bước chưa xong. */
export const tutorialActive = (s: GameState): boolean => s.day === 1 && !s.biz.tutorialOff && tutorialStep(s) >= 0;
