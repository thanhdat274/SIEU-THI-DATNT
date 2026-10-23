import { useEffect, useState } from 'react';
import { applySnapshot, loadGame, readLocalSave, type SaveData } from '../core/save';
import { useGame } from '../core/store';
import { formatMoney } from '../data/products';
import { fetchCloudSave } from '../net/cloud';
import { firebaseReady, loginGoogle, logoutGoogle } from '../net/firebase';
import { useSession, type SaveSummary } from '../net/session';
import { AlleyPanel } from './AlleyPanel';
import './login.css';

/** Vào game: đóng màn đăng nhập, cho thời gian chạy. */
export function startGame() {
  useSession.setState({ screen: 'game' });
  // Vào hẻm đang có người chạy: tốc độ là của cả hẻm, không chỉnh
  if (useSession.getState().coop?.role !== 'player') useGame.setState({ speed: 1 });
}

const ago = (iso: string | number) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  if (min < 1440) return `${Math.round(min / 60)} giờ trước`;
  return `${Math.round(min / 1440)} ngày trước`;
};

function SaveButton({ title, save, onPick }: { title: string; save: SaveSummary; onPick: () => void }) {
  return (
    <button className="login-save" onClick={onPick}>
      <strong>{title}</strong>
      <span>Ngày {save.day} · cấp {save.level}</span>
      <span>{formatMoney(save.money)}</span>
      <span>Lưu {ago(save.updatedAt)}</span>
    </button>
  );
}

export function LoginScreen() {
  const { account, authChecked } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Cả máy và cloud đều có bản lưu khác nhau: cho người chơi chọn. */
  const [choice, setChoice] = useState<{ local: SaveSummary; cloud: SaveSummary & { data: SaveData } } | null>(null);

  const local = readLocalSave();
  const localSummary: SaveSummary | null = local && {
    updatedAt: new Date(local.savedAt).toISOString(), day: local.data.day, level: local.data.level, money: local.data.money,
  };

  // Đổi tài khoản thì bỏ lựa chọn cũ
  useEffect(() => setChoice(null), [account?.uid]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  /** Đã đăng nhập: lấy bản cloud, so với bản trong máy rồi vào chơi. */
  const enterWithAccount = () => run(async () => {
    let cloud: Awaited<ReturnType<typeof fetchCloudSave>> = null;
    try {
      cloud = await fetchCloudSave();
    } catch {
      throw new Error('Không kết nối được server lưu cloud. Kiểm tra "npm run server" đang chạy, hoặc chơi bằng bản trong máy.');
    }
    if (cloud && localSummary && cloud.day !== localSummary.day) {
      setChoice({ local: localSummary, cloud });
      return;
    }
    if (cloud) applySnapshot(cloud.data);
    else loadGame();
    startGame();
  });

  const enterAsGuest = () => {
    loadGame();
    startGame();
  };


  return (
    <div className="login">
      <div className="login-col">
        <header className="login-sign">
          <h1>Tạp Hóa<br />Đầu Ngõ</h1>
          <p>Mở tiệm nhỏ đầu ngõ, bán từng gói mì, nuôi lớn thành siêu thị.</p>
          <span className="login-addr">Mở cửa 6h – 22h</span>
        </header>

        <section className="login-card" aria-live="polite">
          {choice ? (
            <>
              <h2>Chọn bản lưu để chơi tiếp</h2>
              <p className="login-muted">Máy này và cloud đang có hai bản khác nhau. Bản không chọn sẽ bị ghi đè ở lần lưu sau.</p>
              <div className="login-saves">
                <SaveButton title="☁️ Trên cloud" save={choice.cloud} onPick={() => { applySnapshot(choice.cloud.data); startGame(); }} />
                <SaveButton title="💻 Trong máy này" save={choice.local} onPick={() => { loadGame(); startGame(); }} />
              </div>
            </>
          ) : account ? (
            <>
              <div className="login-user">
                {account.photo && <img src={account.photo} alt="" referrerPolicy="no-referrer" />}
                <div>
                  <strong>{account.name}</strong>
                  <span className="login-muted">Tiến trình được lưu lên cloud</span>
                </div>
                <button className="login-link" onClick={() => logoutGoogle()}>Đăng xuất</button>
              </div>
              <button className="login-btn primary" disabled={busy} onClick={enterWithAccount}>
                {busy ? 'Đang tải bản lưu…' : 'Vào tiệm'}
              </button>
            </>
          ) : (
            <>
              <h2>Đăng nhập để lưu tiến trình</h2>
              <p className="login-muted">Đăng nhập Google để chơi tiếp trên máy khác. Chơi không đăng nhập thì tiến trình chỉ nằm trong trình duyệt này.</p>
              <button
                className="login-btn primary"
                disabled={!authChecked || busy || !firebaseReady}
                onClick={() => run(async () => void (await loginGoogle()))}
              >
                <GoogleMark /> Đăng nhập bằng Google
              </button>
              <button className="login-btn" disabled={busy} onClick={enterAsGuest}>
                {localSummary ? `Chơi tiếp trong máy (ngày ${localSummary.day})` : 'Chơi không cần đăng nhập'}
              </button>
            </>
          )}

          {!choice && <AlleyPanel busy={busy} run={run} onEnter={startGame} />}
          {error && <p className="login-error">{error}</p>}
        </section>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
