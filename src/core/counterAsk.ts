import { create } from 'zustand';
import { isSimSeeded } from './rand';

/**
 * Câu hỏi ở quầy: khách xin ghi sổ, mặc cả, hoặc tiệm thiếu tiền lẻ.
 * Khách đứng chờ người chơi chọn; quá giờ thì tự chọn phương án mặc định.
 */
export interface CounterAsk {
  icon: string;
  who: string;
  text: string;
  options: string[];
  /** Phương án tự chọn khi hết giờ. */
  fallback: number;
  /** Hết hạn ở phút game này. */
  expiresAt: number;
  resolve: (choice: number) => void;
}

export const useCounterAsk = create<{ ask: CounterAsk | null }>(() => ({ ask: null }));

export const askPending = () => useCounterAsk.getState().ask !== null;

// GĐ122 — thang thời gian THỰC (wall-clock) cho khách đang bị treo câu hỏi: thế giới dừng (GĐ102)
// nhưng khách này vẫn mất kiên nhẫn theo giây thật để phá 'pause AFK vô hạn'. Chỉ Date.now() thuần
// ứng — transient (không nằm trong state game / SaveState → không đụng SAVE_VERSION).
let askStartedWall = 0;
// Sim có seed (test/bot): đồng hồ chờ đếm theo LẦN GỌI (mỗi lần ~ 1 tick 0.1s) thay vì giây thật —
// không thì kết quả phụ thuộc máy nhanh/chậm và cùng seed ra số khác nhau. Game thật không đổi.
let askSimCalls = 0;
export function askWallElapsed(): number {
  if (!askStartedWall) return 0;
  if (isSimSeeded()) return askSimCalls++ * 0.1;
  return (Date.now() - askStartedWall) / 1000;
}

export function askAtCounter(ask: CounterAsk) {
  askStartedWall = Date.now();
  askSimCalls = 0;
  useCounterAsk.setState({ ask });
}

export function answerAsk(choice: number) {
  const ask = useCounterAsk.getState().ask;
  if (!ask) return;
  askStartedWall = 0;
  useCounterAsk.setState({ ask: null });
  ask.resolve(choice);
}

/** Gọi mỗi khung hình: hết giờ thì chọn mặc định. */
export function expireAsk(minutes: number) {
  const ask = useCounterAsk.getState().ask;
  if (ask && minutes >= ask.expiresAt) answerAsk(ask.fallback);
}

/** Sang ngày mới / dọn khách: bỏ câu hỏi đang treo. */
export const clearAsk = () => {
  askStartedWall = 0;
  useCounterAsk.setState({ ask: null });
};
