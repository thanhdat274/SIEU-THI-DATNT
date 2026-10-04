import { useLayoutEffect, useRef } from 'react';

type Handler = (...args: never[]) => unknown;

/**
 * Trả về các hàm có danh tính ỔN ĐỊNH nhưng luôn gọi bản mới nhất của hàm tương ứng (tránh đóng gói trạng thái cũ).
 * Dùng để truyền handler vào thành phần `React.memo` mà không làm nó render lại mỗi lần cha render.
 * Hàm `undefined` giữ nguyên `undefined` (thành phần con dùng việc có/không có handler để ẩn/hiện nút).
 */
export function useStableCallbacks<T extends Record<string, Handler | undefined>>(handlers: T): T {
  const latest = useRef(handlers);
  const stable = useRef<Record<string, Handler>>({});
  // Cập nhật sau mỗi lần commit: handler chỉ được gọi từ sự kiện, tức là sau commit.
  useLayoutEffect(() => { latest.current = handlers; });
  const out: Record<string, Handler | undefined> = {};
  for (const key of Object.keys(handlers)) {
    if (!handlers[key]) { out[key] = undefined; continue; }
    stable.current[key] ??= ((...args: never[]) => (latest.current[key] as Handler | undefined)?.(...args)) as Handler;
    out[key] = stable.current[key];
  }
  return out as T;
}
