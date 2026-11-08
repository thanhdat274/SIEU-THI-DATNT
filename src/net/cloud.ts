import { applySnapshot, SANDBOX, snapshot, type SaveData } from '../core/save';
import { useGame } from '../core/store';
import { idToken } from './firebase';
import { apiUrl } from './serverUrl';
import { useSession, type SaveSummary } from './session';

async function api(method: 'GET' | 'PUT', body?: object) {
  const token = await idToken();
  if (!token) throw new Error('Chưa đăng nhập');
  return fetch(apiUrl('/api/save'), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Tải bản lưu cloud của tài khoản; null nếu chưa có. */
export async function fetchCloudSave(): Promise<(SaveSummary & { data: SaveData }) | null> {
  if (SANDBOX) return null;
  const res = await api('GET');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Server trả lỗi ${res.status}`);
  const save = await res.json();
  useSession.setState({ cloudUpdatedAt: save.updatedAt });
  return save;
}

type CloudSave = Awaited<ReturnType<typeof fetchCloudSave>>;
let prefetched: { uid: string; promise: Promise<CloudSave> } | null = null;

/**
 * GĐ1822 — Tải trước bản cloud ngay khi màn đăng nhập biết tài khoản (trước khi bấm "Vào tiệm"):
 * token Firebase + server (có thể đang cold start) + JSON bản lưu chạy song song lúc người chơi
 * còn đọc màn hình, bấm vào là gần như có ngay. Gọi lại cùng uid thì dùng chung một lượt tải.
 */
export function prefetchCloudSave(uid: string): Promise<CloudSave> {
  if (prefetched?.uid !== uid) {
    const promise = fetchCloudSave();
    promise.catch(() => { if (prefetched?.promise === promise) prefetched = null; });
    prefetched = { uid, promise };
  }
  return prefetched.promise;
}

/** Lấy bản cloud (dùng lượt tải trước nếu có), quá `ms` thì báo 'timeout' để vào bằng bản máy. */
export function cloudSaveWithin(uid: string, ms: number): Promise<CloudSave | 'timeout'> {
  return Promise.race([prefetchCloudSave(uid), new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), ms))]);
}

/**
 * Đẩy bản lưu hiện tại lên cloud. Máy khác đã ghi sau lần cuối máy này thấy → không ghi đè,
 * chuyển sang trạng thái 'conflict' để người chơi chọn. `force` = ghi đè dù có xung đột.
 */
export async function pushCloudSave(force = false): Promise<boolean> {
  const session = useSession.getState();
  // Ở hẻm online thì tiến trình hẻm lưu riêng trên server, không đè bản cloud cá nhân
  // Chế độ chơi thử không bao giờ đè bản cloud thật
  if (!session.account || session.coop || SANDBOX) return false;
  useSession.setState({ cloudStatus: 'saving' });
  try {
    const res = await api('PUT', { data: snapshot(), expectedUpdatedAt: session.cloudUpdatedAt, force });
    const body = await res.json();
    if (res.status === 409) {
      useSession.setState({ cloudStatus: 'conflict', conflict: body.cloud });
      return false;
    }
    if (!res.ok) throw new Error(body.error);
    useSession.setState({ cloudStatus: 'saved', cloudUpdatedAt: body.updatedAt, conflict: null });
    return true;
  } catch (err) {
    console.warn('[cloud]', err);
    useSession.setState({ cloudStatus: 'error' });
    return false;
  }
}

/** Xung đột: lấy bản trên cloud thay cho bản đang chơi. */
export async function takeCloudSave() {
  const save = await fetchCloudSave();
  if (save) applySnapshot(save.data);
  useSession.setState({ cloudStatus: 'saved', conflict: null });
  useGame.getState().notify(`☁️ Đã tải bản cloud: ngày ${useGame.getState().day}`);
}
