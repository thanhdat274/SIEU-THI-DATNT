import { idToken } from './firebase';
import { apiUrl } from './serverUrl';


export interface AlleySummary {
  id: string; name: string; members: { uid: string; name: string }[];
  day: number; level: number; money: number; updatedAt: string; online: number;
}

async function api<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
  const token = await idToken();
  if (!token) throw new Error('Cần đăng nhập Google để chơi hẻm online.');
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/alleys${path}`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Không kết nối được server. Kiểm tra "npm run server" đang chạy.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Server trả lỗi ${res.status}`);
  return json as T;
}

export const listAlleys = () => api<AlleySummary[]>('GET', '');
export const createAlley = (name: string) => api<AlleySummary>('POST', '', { name });
export const joinAlley = (code: string) => api<AlleySummary>('POST', `/${encodeURIComponent(code.trim().toUpperCase())}/join`);
export const quitAlley = (id: string) => api<{ ok: true }>('POST', `/${encodeURIComponent(id)}/leave`);
