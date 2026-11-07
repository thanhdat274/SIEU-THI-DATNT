import { Component, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSaves } from './core/save';
import { acquireTabLock } from './core/tabLock';
import { useGame } from './core/store';
import { watchUser } from './net/firebase';
import { useSession } from './net/session';
import { Hud } from './ui/Hud';
import { LoginScreen } from './ui/LoginScreen';
import { TabLockScreen } from './ui/TabLockScreen';

/**
 * GĐ704 — vỏ khởi động gọn: màn đăng nhập + khung UI là TẢI BAN ĐẦU, còn cả thế giới 3D
 * (three.js + dựng cảnh + agent, `main.tsx`) nạp LƯỜI sau khi người chơi thật sự vào game.
 * Tải ban đầu rơi ~340 KB gzip (three 253 + phần dựng cảnh của index), mở lại dư địa ngân
 * sách 597 KB đã gần chạm trần từ GĐ515. Luồng giữ nguyên: initSaves → màn đăng nhập →
 * chọn ván → `screen === 'game'` → nạp `main.tsx` (tự dựng renderer/scene như cũ) → HUD.
 */

// Thời gian đứng yên cho tới khi rời màn đăng nhập
useGame.setState({ speed: 0 });
watchUser((user) => useSession.setState({
  authChecked: true,
  account: user && { uid: user.uid, name: user.displayName ?? user.email ?? 'Chủ tiệm', email: user.email, photo: user.photoURL },
  cloudStatus: user ? 'idle' : 'off',
  cloudUpdatedAt: null,
}));

function App() {
  const screen = useSession((s) => s.screen);
  const tabLock = useSession((s) => s.tabLock);
  const savesLoaded = useSession((s) => s.savesLoaded);
  const [worldReady, setWorldReady] = useState(false);
  useEffect(() => {
    if (screen !== 'game') return;
    // Nạp đúng một lần; lỗi nạp (mạng rớt giữa chừng) thì tải lại trang cho sạch trạng thái
    import('./main').then(() => setWorldReady(true), (err) => {
      console.error('[boot] nạp thế giới 3D lỗi:', err);
      location.reload();
    });
  }, [screen]);
  // GĐ713: ngồi màn đăng nhập thì rảnh CPU/mạng — tải trước thế giới 3D (import('./main') được
  // cache, trùng với hiệu ứng trên cũng chỉ chạy một lần) để bấm vào chơi là có ngay, không chờ.
  // main.tsx vẫn tự chờ screen='game' mới đếm giờ — đúng như trước GĐ704 khi nó chạy từ đầu trang.
  // GĐ1496: tab bị chặn khoá thì khỏi tải trước — tab này không được chơi.
  useEffect(() => {
    if (screen === 'game' || !savesLoaded) return;
    const ric = (window as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
      ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = ric(() => {
      import('./main').then(() => setWorldReady(true), (err) => console.error('[boot] nạp trước thế giới lỗi (sẽ thử lại khi vào chơi):', err));
    });
    return () => {
      const cic = (window as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(id); else window.clearTimeout(id);
    };
  }, [screen, savesLoaded]);
  if (tabLock === 'blocked') return <TabLockScreen onRetry={bootAfterLock} />;
  // Đang xin khoá tab hoặc nạp bản lưu: chưa được đụng LoginScreen (màn này đọc save đồng bộ)
  if (tabLock !== 'held' || !savesLoaded) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#2a2a38', color: '#f1c40f', fontFamily: 'inherit', fontSize: 16 }}>
        🏪 Đang mở tiệm…
      </div>
    );
  }
  if (screen !== 'game') return <LoginScreen />;
  if (!worldReady) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#2a2a38', color: '#f1c40f', fontFamily: 'inherit', fontSize: 16 }}>
        🏪 Đang dựng thế giới 3D…
      </div>
    );
  }
  return <Hud />;
}

/** Ranh giới lỗi React: một component sập (vd save schema cũ thiếu field) không được phép trắng
 * cả game — 3D vẫn chạy, chỉ hiện dải nhỏ kèm nút tải lại thay vì mất trắng màn hình. */
class UiBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error, info: { componentStack?: string | null }) {
    console.error('[ui] lỗi giao diện:', err.message, info.componentStack ?? '');
  }
  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 1000,
            background: '#3a3a4d', color: '#fff', border: '1px solid #f1c40f', borderRadius: 10,
            padding: '10px 14px', fontFamily: 'inherit', fontSize: 14, maxWidth: 'min(92vw, 480px)',
            boxShadow: '0 4px 16px rgba(0,0,0,.4)', lineHeight: 1.4,
          }}
        >
          ⚠️ Giao diện gặp lỗi: {this.state.err.message}
          <button
            onClick={() => location.reload()}
            style={{ marginLeft: 10, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f1c40f', fontWeight: 600, cursor: 'pointer' }}
          >
            Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Nạp bản lưu từ IndexedDB trước khi hiện màn đăng nhập (màn này đọc bản lưu đồng bộ)
// GĐ1496: TRƯỚC đó phải xin khoá một tab duy nhất — giữ được khoá mới được đụng vào bản lưu,
// tab thua chỉ đứng ngoài nhìn TabLockScreen (bấm Thử lại gọi lại đúng hàm này).
// Render ngay sau khi phân định khoá (chưa chờ initSaves) để tab bị chặn thấy màn chặn ngay.
// Vite hot-reload có thể chạy lại boot.tsx: dùng lại root cũ thay vì createRoot lần hai trên cùng container (GĐ403)
let savesReady = false;
export async function bootAfterLock() {
  const held = await acquireTabLock();
  useSession.setState({ tabLock: held ? 'held' : 'blocked' });
  if (held && !savesReady) {
    savesReady = true;
    initSaves().finally(() => useSession.setState({ savesLoaded: true }));
  }
}
const uiEl = document.getElementById('ui') as HTMLElement & { __root?: ReturnType<typeof createRoot> };
bootAfterLock().finally(() => (uiEl.__root ??= createRoot(uiEl)).render(<UiBoundary><App /></UiBoundary>));

// PWA: đăng ký service worker để game cài ra màn hình chính iPhone/iOS
// (chỉ ở bản build/run thật; dev thì tắt để không gây nhiễu khi sửa code)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => { reg.update(); })
      .catch(() => { /* không bắt buộc — chỉ bật được PWA khi server cho phép */ });
  });
}
