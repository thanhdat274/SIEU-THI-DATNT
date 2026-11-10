import { create } from 'zustand';
import type { MiniMode } from '../../data/festivalMini';

/**
 * Hệ 7 — cửa sổ trò khéo tay đang mở (UI-layer, KHÔNG lưu vào save).
 *
 * `MiniHost` đọc store này rồi vẽ lớp phủ chứa trò đang chơi. Tách khỏi `useGame` vì trò là
 * một lớp phủ "chợt hiện" như thoại chương (SurpriseAlert), không phải một panel `useGame.panel`.
 * Đồng hồ game vẫn chạy khi chơi trò (đã chốt — Hệ 7 không tạm dừng thế giới).
 */
export interface MiniActive {
  defId: string;
  /** Ngày game lúc mở trò (chỉ thưởng 1 lần mỗi ngày lễ — R7). */
  day: number;
  /** "Nhanh tay" (có đếm giờ, thưởng tối đa) / "Thong thả" (không đếm giờ, thưởng 2/3). */
  mode: MiniMode;
}

interface MiniHostState {
  active: MiniActive | null;
  openMini: (defId: string, day: number, mode?: MiniMode) => void;
  closeMini: () => void;
}

export const useMiniHost = create<MiniHostState>((set) => ({
  active: null,
  openMini: (defId, day, mode = 'fast') => set({ active: { defId, day, mode } }),
  closeMini: () => set({ active: null }),
}));
