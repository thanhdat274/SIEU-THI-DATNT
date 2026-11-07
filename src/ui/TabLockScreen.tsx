import { useSession } from '../net/session';

/**
 * GĐ1496 — Màn chặn khi game đang mở ở tab khác (tham khảo Midnight Bistro "Game is open
 * in another tab"). Không cho tab này đụng vào bản lưu; bấm Thử lại thì xin khoá lại —
 * tab kia đóng là vào được ngay.
 */
export function TabLockScreen({ onRetry }: { onRetry: () => void }) {
  const retry = () => {
    useSession.setState({ tabLock: 'checking' });
    onRetry();
  };
  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: '#23232e', fontFamily: 'inherit', padding: 16,
      }}
    >
      <div
        style={{
          background: '#fdf9ec', borderRadius: 18, border: '2px solid #2b3a42',
          boxShadow: '0 10px 30px rgba(0,0,0,.45)', padding: '28px 30px 24px',
          maxWidth: 420, textAlign: 'center', lineHeight: 1.45,
        }}
      >
        <div style={{ fontSize: 46 }}>🎮</div>
        <h1 style={{ color: '#d64541', fontSize: 22, margin: '8px 0 10px' }}>
          Game đang mở ở tab khác
        </h1>
        <p style={{ color: '#4a4a55', fontSize: 14.5, margin: '0 0 18px' }}>
          Tạp Hóa 3D chỉ chạy được trong một tab mỗi trình duyệt để khỏi ghi đè tiến trình
          của nhau. Hãy đóng tab đang chơi, rồi bấm thử lại.
        </p>
        <button
          onClick={retry}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 12, border: '2px solid #0d3d47',
            background: '#1899b6', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', boxShadow: '0 3px 0 #0d3d47',
          }}
        >
          ↻ Thử lại
        </button>
      </div>
    </div>
  );
}
