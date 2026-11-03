import { idToken } from './firebase';
import { apiUrl } from './serverUrl';
import { useSession } from './session';
import {
  isConsentScope, isValidConsentVersion, PRIVACY_VERSION, type ConsentScope,
} from './consentPolicy';
import { SANDBOX } from '../core/save';

/**
 * Ghi bằng chứng đồng ý xử lý dữ liệu cá nhân lên server. Chỉ gửi SAU khi người chơi thật sự tick
 * đồng ý (LoginScreen khoá nút đăng nhập tới khi tick). `recorded` chặn gọi lặp trong cùng phiên;
 * server tự ghi đè bản ghi cùng `uid:scope:version` nên đồng ý lại chỉ cập nhật thời điểm.
 */
const recorded = new Set<string>();

export async function recordConsent(scope: ConsentScope, version = PRIVACY_VERSION): Promise<boolean> {
  if (!isConsentScope(scope) || !isValidConsentVersion(version) || SANDBOX) return false;
  const account = useSession.getState().account;
  if (!account) return false;
  const key = `${account.uid}:${scope}:${version}`;
  if (recorded.has(key)) return true;
  const token = await idToken();
  if (!token) return false;
  try {
    const res = await fetch(apiUrl('/api/consent'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, version }),
    });
    if (!res.ok) return false;
    recorded.add(key);
    return true;
  } catch {
    // Server không nhận thì không chặn lối vào chơi — đồng ý vẫn ghi nhận theo phiên cục bộ.
    return false;
  }
}
