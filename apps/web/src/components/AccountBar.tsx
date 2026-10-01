import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

interface AccountBarProps {
  onlineWorldName?: string;
  isOnlineOwner?: boolean;
  onInvite?: () => void;
  onLeaveOnline?: () => void;
  onReturnHome?: () => void;
}

export function AccountBar({ onlineWorldName, isOnlineOwner, onInvite, onLeaveOnline, onReturnHome }: AccountBarProps = {}) {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Tiến trình hiện lưu an toàn trên máy này.');

  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    void Promise.all([import('../services/firebase'), import('firebase/auth')])
      .then(([service, sdk]) => {
        if (!stopped) unsubscribe = sdk.onAuthStateChanged(service.gameAuth(), setUser);
      })
      .catch(() => {
        if (!stopped) setMessage('Chưa cấu hình tài khoản cloud. Bạn vẫn chơi được trên máy.');
      });
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, []);

  async function toggleAccount() {
    setBusy(true);
    try {
      const service = await import('../services/firebase');
      if (user) await service.logoutGoogle();
      else await service.loginGoogle();
      setMessage('Tiến trình hiện lưu an toàn trên máy này.');
    } catch (error) {
      const code = (error as { code?: string }).code;
      setMessage(
        code === 'auth/unauthorized-domain'
          ? 'Thêm tên miền này vào Authorized domains của Firebase.'
          : code === 'auth/operation-not-allowed'
          ? 'Bật Google trong Firebase Authentication.'
          : code === 'auth/popup-closed-by-user'
          ? 'Đã hủy đăng nhập. Bạn vẫn chơi được trên máy.'
          : 'Chưa đăng nhập được. Kiểm tra cấu hình hoặc cho phép cửa sổ bật lên.'
      );
    } finally {
      setBusy(false);
    }
  }

  const displayName = user?.displayName || user?.email || (user ? 'Chủ Tiệm' : 'Chơi trên máy');
  const avatarLetter = (user?.displayName || user?.email || 'N').slice(0, 1).toUpperCase();

  return (
    <aside className="account-bar" aria-label="Thông tin tài khoản">
      <div className="account-bar-info">
        <div className="account-bar-avatar" title={displayName}>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{avatarLetter}</span>
          )}
        </div>

        <div className="account-bar-user">
          <strong className="account-bar-name" title={displayName}>
            {displayName}
          </strong>
          {onlineWorldName ? (
            <span className="account-bar-badge badge-online">Hẻm: {onlineWorldName}</span>
          ) : user ? (
            <span className="account-bar-badge badge-owner">Chủ Tiệm</span>
          ) : (
            <span className="account-bar-badge badge-local">Chơi Trên Máy</span>
          )}
        </div>

        <span className="account-bar-divider" aria-hidden="true">·</span>

        <div className="account-bar-status" role="status">
          <span className="account-bar-dot" />
          <span>{onlineWorldName ? 'Quỹ & kho chung trực tuyến' : message}</span>
        </div>
      </div>

      <div className="account-bar-actions">
        {onReturnHome && (
          <button
            type="button"
            className="account-bar-btn btn-home"
            onClick={onReturnHome}
            title="Lưu tiến trình và quay về màn hình chính"
          >
            <span className="btn-home-icon" aria-hidden="true">🏠</span>
            <span className="btn-home-text">Về màn hình chính</span>
          </button>
        )}
        {onlineWorldName && isOnlineOwner && onInvite && (
          <button
            type="button"
            className="account-bar-btn btn-invite"
            onClick={onInvite}
            title="Mời bạn bè cùng kinh doanh"
          >
            👥 Mời bạn
          </button>
        )}
        {onlineWorldName && onLeaveOnline && (
          <button
            type="button"
            className="account-bar-btn"
            onClick={onLeaveOnline}
            title="Rời hẻm online về lại tiệm trên máy"
          >
            ⎋ Về tiệm riêng
          </button>
        )}
        <button
          type="button"
          className={`account-bar-btn ${user ? 'btn-logout' : 'btn-login'}`}
          disabled={busy}
          onClick={() => void toggleAccount()}
          title={user ? 'Đăng xuất tài khoản Google' : 'Đăng nhập Google'}
        >
          {busy ? 'Đang xử lý…' : user ? 'Đăng xuất' : 'Đăng nhập Google'}
        </button>
      </div>
    </aside>
  );
}

export default AccountBar;
