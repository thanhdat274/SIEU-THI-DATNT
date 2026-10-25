import { create } from 'zustand';

export interface Account {
  uid: string;
  name: string;
  email: string | null;
  photo: string | null;
}

/** Tóm tắt một bản lưu để người chơi chọn khi máy và cloud khác nhau. */
export interface SaveSummary {
  updatedAt: string;
  day: number;
  level: number;
  money: number;
}

/** 'runner' = máy này chạy tiệm cho cả hẻm; 'player' = nhận trạng thái từ máy chạy. */
export type CoopRole = 'runner' | 'player';
export interface AlleyPeer { id: number; name: string }

interface SessionState {
  /** 'login' = đang ở màn đăng nhập; 'game' = đã vào chơi. */
  screen: 'login' | 'game';
  account: Account | null;
  /** Đã biết trạng thái đăng nhập lúc mở trang chưa (tránh nháy nút). */
  authChecked: boolean;
  /** `updatedAt` của bản cloud mới nhất mà máy này đã thấy. */
  cloudUpdatedAt: string | null;
  cloudStatus: 'off' | 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  /** Cloud có bản khác máy này đã ghi: hỏi người chơi giữ bản nào. */
  conflict: SaveSummary | null;
  /**
   * Đang ở hẻm online: mã hẻm, tên, mã kết nối của mình, phòng của mình trong nhà chung
   * (theo thứ tự vào hẻm, 0–3) và những ai đang online (gồm cả mình).
   */
  coop: { role: CoopRole; alley: string; name: string; selfId: number; room: number; peers: AlleyPeer[] } | null;
  /** Có thao tác đã gửi cho máy chạy mà chưa có kết quả (làm mờ nút để khỏi bấm lặp). */
  netBusy: boolean;
  /** Chỗ đang bị khoá trong hẻm (vd. 'build' = có người đang sửa bố cục). */
  alleyLocks: { key: string; id: number; name: string }[];
}

export const useSession = create<SessionState>(() => ({
  screen: 'login',
  account: null,
  authChecked: false,
  cloudUpdatedAt: null,
  cloudStatus: 'off',
  conflict: null,
  coop: null,
  netBusy: false,
  alleyLocks: [],
}));
