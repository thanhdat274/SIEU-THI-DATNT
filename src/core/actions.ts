import type { FurnitureType } from '../data/furniture';
import type { Furniture } from './store';

/**
 * Thao tác của thế giới 3D mà giao diện cần gọi (nút trên màn hình cảm ứng thay cho phím).
 * main.tsx gán hàm thật lúc khởi động.
 */
export const worldActions = {
  /** Tương tác với vật gần nhất (như bấm phím của việc đó). */
  interact: () => {},
  /** Chế độ xây: xoay món đang cầm (như phím R). */
  rotate: () => {},
  /** Chế độ xây: đặt món đang cầm ở chỗ bóng mờ. */
  place: () => {},
  /** Chế độ xây: huỷ món đang cầm, hoặc thoát chế độ xây (như Esc). */
  cancel: () => {},
  /** Đi nhanh tới tiệm (đứng ở quầy) hoặc về nhà (cạnh giường), mất ít phút trong game. */
  travel: (_to: 'shop' | 'home') => {},
};

/** Cần điều khiển ảo trên màn cảm ứng: x sang phải, y xuống dưới màn hình, độ dài 0..1. */
export const joystick = { x: 0, y: 0 };

/** Mặt bằng tiệm và kiểm tra vị trí đặt cho màn sắp xếp (main.tsx gán từ GroceryShop). */
export const shopLayout = {
  plan: () => ({ width: 6, depth: 5, counter: { x: 0, z: 0, w: 0.7, d: 1.6 }, doorW: 1.4, backDoorX: 2, windows: [] as { x: number; z: number; w: number; d: number }[] }),
  check: (_type: FurnitureType, _x: number, _z: number, _rot: number, _ignoreUid: number | undefined, _list: Furniture[]): string | null => null,
  layoutCheck: (_list: Furniture[]): string | null => null,
};
