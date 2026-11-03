import { idToken } from './firebase';
import { apiUrl } from './serverUrl';
import { SANDBOX } from '../core/save';

/**
 * Xoá dữ liệu cloud của tài khoản trên server: cloud_saves, các hẻm tham gia, bằng chứng đồng ý
 * (quyền chủ thể dữ liệu — Luật 91/2025). Tài khoản Firebase do `deleteAccount()` trong firebase.ts xoá.
 */
export async function deleteAccountData(): Promise<void> {
  if (SANDBOX) return;
  const token = await idToken();
  if (!token) throw new Error('Chưa đăng nhập');
  const res = await fetch(apiUrl('/api/save'), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Server trả lỗi ${res.status}`);
  }
}
