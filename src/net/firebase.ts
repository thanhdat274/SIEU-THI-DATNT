import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';

const env = import.meta.env;
export const firebaseReady = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_APP_ID);

function auth() {
  if (!firebaseReady) throw new Error('Chưa cấu hình Firebase (.env.local).');
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  const a = getAuth(app);
  a.languageCode = 'vi';
  return a;
}

export function loginGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth(), provider);
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
  if (!devId) return signOut(auth());
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
  return firebaseReady ? onAuthStateChanged(auth(), fn) : (fn(null), () => {});
};

/** Mã đăng nhập gửi kèm mỗi yêu cầu lên server. */
export const idToken = async () => {
  if (devId) return `dev:${devId}`;
  return firebaseReady ? (await auth().currentUser?.getIdToken()) ?? null : null;
};
