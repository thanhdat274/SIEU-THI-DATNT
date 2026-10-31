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

/** Câu hỏi gửi qua mạng cho máy khách hẻm online: không có hàm resolve, kèm mã câu hỏi và số giây khách đã chờ. */
export type SharedAsk = Omit<CounterAsk, 'resolve'> & { id: number; elapsed: number };

export const useCounterAsk = create<{ ask: CounterAsk | null }>(() => ({ ask: null }));

export const askPending = () => useCounterAsk.getState().ask !== null;

// GĐ122 — thang thời gian THỰC (wall-clock) cho khách đang bị treo câu hỏi: thế giới dừng (GĐ102)
// nhưng khách này vẫn mất kiên nhẫn theo giây thật để phá 'pause AFK vô hạn'. Chỉ Date.now() thuần
// ứng — transient (không nằm trong state game / SaveState → không đụng SAVE_VERSION).
let askStartedWall = 0;
// Sim có seed (test/bot): đồng hồ chờ đếm theo LẦN GỌI (mỗi lần ~ 1 tick 0.1s) thay vì giây thật —
// không thì kết quả phụ thuộc máy nhanh/chậm và cùng seed ra số khác nhau. Game thật không đổi.
let askSimCalls = 0;
/** Mã câu hỏi đang treo (máy chạy cấp), để máy khách không trả lời nhầm câu đã đổi. */
let askId = Date.now() % 1_000_000_000; // mỗi máy một dải mã: đổi máy chạy không trùng mã câu cũ
/** Máy khách hẻm online: số giây chờ do máy chạy báo (null = câu hỏi của chính máy này). */
let remoteElapsed: number | null = null;
let remoteId = 0;
/** Câu đã bấm trả lời ở máy khách: gói state kế tiếp có thể còn mang nó (máy chạy chưa xử lý xong) — đừng hiện lại. */
let answeredRemoteId = 0;

export function askWallElapsed(): number {
  if (remoteElapsed !== null) return remoteElapsed;
  if (!askStartedWall) return 0;
  if (isSimSeeded()) return askSimCalls++ * 0.1;
  return (Date.now() - askStartedWall) / 1000;
}

export function askAtCounter(ask: CounterAsk) {
  askStartedWall = Date.now();
  askSimCalls = 0;
  askId++;
  useCounterAsk.setState({ ask });
}

export function answerAsk(choice: number) {
  const ask = useCounterAsk.getState().ask;
  if (!ask) return;
  askStartedWall = 0;
  remoteElapsed = null;
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
  remoteElapsed = null;
  useCounterAsk.setState({ ask: null });
};

/** Máy chạy: câu hỏi đang treo dạng gửi được qua mạng (null nếu không có). */
export function sharedAsk(): SharedAsk | null {
  const ask = useCounterAsk.getState().ask;
  if (!ask || remoteElapsed !== null) return null;
  const { resolve: _resolve, ...rest } = ask;
  return { ...rest, id: askId, elapsed: askWallElapsed() };
}

/** Máy chạy: trả lời câu hỏi do máy khách gửi — chỉ khi vẫn đúng câu đang treo (không trả lời nhầm câu mới). */
export function answerAskById(id: number, choice: number): boolean {
  const ask = useCounterAsk.getState().ask;
  if (!ask || remoteElapsed !== null || id !== askId) return false;
  if (!Number.isInteger(choice) || choice < 0 || choice >= ask.options.length) return false;
  answerAsk(choice);
  return true;
}

/**
 * Máy khách: hiện câu hỏi máy chạy gửi sang (null = không còn câu hỏi). Bấm trả lời thì gọi `send(id, choice)`
 * để máy chạy chốt; HUD dùng chung CounterAskAlert như chơi đơn.
 */
export function applyRemoteAsk(shared: SharedAsk | null, send: (id: number, choice: number) => void) {
  if (!shared) {
    if (remoteElapsed !== null) clearAsk();
    return;
  }
  if (shared.id === answeredRemoteId) return;
  remoteElapsed = shared.elapsed;
  const current = useCounterAsk.getState().ask;
  if (current && shared.id === remoteId) return;
  remoteId = shared.id;
  const { id, elapsed: _elapsed, ...rest } = shared;
  useCounterAsk.setState({
    ask: {
      ...rest,
      resolve: (choice) => {
        answeredRemoteId = id;
        send(id, choice);
      },
    },
  });
}
