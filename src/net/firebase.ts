import type { Auth, User } from 'firebase/auth';

const env = import.meta.env;
export const firebaseReady = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);

/** SDK Firebase (~vài chục KB) nạp bằng import() động: không nằm trong tải đầu, chỉ kéo về khi cần đăng nhập. */
let authLoad: Promise<{ a: Auth; m: typeof import('firebase/auth') }> | null = null;
function loadAuth() {
  if (!firebaseReady) return Promise.reject(new Error('Chưa cấu hình Firebase (.env.local).'));
  authLoad ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, m]) => {
    const fb = app.getApps().length ? app.getApp() : app.initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    });
    const a = m.getAuth(fb);
    a.languageCode = 'vi';
    return { a, m };
  });
  return authLoad;
}

export async function loginGoogle() {
  const { a, m } = await loadAuth();
  const provider = new m.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return m.signInWithPopup(a, provider);
}

/**
 * CHỈ KHI CHẠY DEV: mở trang với `?dev=a` (b, c…) để giả làm tài khoản thử dev_a, khỏi cần Google khi
 * test hẻm nhiều người trên một máy (mỗi tab một chữ). Server phải bật DEV_AUTH_BYPASS=true mới nhận.
 * Bản build thật bỏ hẳn đoạn này (import.meta.env.DEV = false).
 */
const devId = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('dev')?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || null
  : null;

export async function logoutGoogle() {
  if (!devId) {
    const { a, m } = await loadAuth();
    return m.signOut(a);
  }
  const url = new URL(location.href);
  url.searchParams.delete('dev');
  location.href = url.toString();
}

/** Gọi lại mỗi khi trạng thái đăng nhập đổi (kể cả lúc mở lại trang vẫn còn đăng nhập). */
export const watchUser = (fn: (user: User | null) => void) => {
  if (devId) {
    fn({ uid: `dev_${devId}`, displayName: `Thử ${devId.toUpperCase()}`, email: null, photoURL: null } as User);
    return () => {};
  }
  if (!firebaseReady) { fn(null); return () => {}; }
  let off = () => {};
  let stopped = false;
  void loadAuth().then(({ a, m }) => { if (!stopped) off = m.onAuthStateChanged(a, fn); });
  return () => { stopped = true; off(); };
};

/** Mã đăng nhập gửi kèm mỗi yêu cầu lên server. */
export const idToken = async () => {
  if (devId) return `dev:${devId}`;
  if (!firebaseReady) return null;
  const { a } = await loadAuth();
  return (await a.currentUser?.getIdToken()) ?? null;
};
