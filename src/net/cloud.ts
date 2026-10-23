import { applySnapshot, snapshot, type SaveData } from '../core/save';
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
  const res = await api('GET');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Server trả lỗi ${res.status}`);
  const save = await res.json();
  useSession.setState({ cloudUpdatedAt: save.updatedAt });
  return save;
}

/**
 * Đẩy bản lưu hiện tại lên cloud. Máy khác đã ghi sau lần cuối máy này thấy → không ghi đè,
 * chuyển sang trạng thái 'conflict' để người chơi chọn. `force` = ghi đè dù có xung đột.
 */
export async function pushCloudSave(force = false): Promise<boolean> {
  const session = useSession.getState();
  // Ở hẻm online thì tiến trình hẻm lưu riêng trên server, không đè bản cloud cá nhân
  if (!session.account || session.coop) return false;
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
