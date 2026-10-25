import { useEffect, useState } from 'react';
import { formatMoney } from '../data/products';
import { createAlley, enterAlley, joinAlley, listAlleys, quitAlley, type AlleySummary } from '../net/coop';
import { useSession } from '../net/session';

/** Mục "Hẻm online" ở màn hình chính: danh sách hẻm của mình, tạo hẻm, gia nhập bằng mã. */
export function AlleyPanel({ busy, run, onEnter }: {
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  onEnter: () => void;
}) {
  const { account } = useSession();
  const [alleys, setAlleys] = useState<AlleySummary[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  /** Mã hẻm vừa sao chép, để đổi nút thành "Đã chép" vài giây. */
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (alleyId: string) => run(async () => {
    await navigator.clipboard.writeText(alleyId);
    setCopied(alleyId);
    setTimeout(() => setCopied((c) => (c === alleyId ? null : c)), 1500);
  });

  const refresh = () => run(async () => setAlleys(await listAlleys()));
  useEffect(() => {
    if (account) void refresh();
    else setAlleys(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.uid]);

  const enter = (id: string) => run(async () => {
    await enterAlley(id);
    onEnter();
  });
  const create = () => run(async () => {
    const alley = await createAlley(name);
    setName('');
    await enterAlley(alley.id);
    onEnter();
  });
  const join = () => run(async () => {
    const alley = await joinAlley(code);
    setCode('');
    await enterAlley(alley.id);
    onEnter();
  });
  const quit = (a: AlleySummary) => {
    const last = a.members.length === 1;
    if (!confirm(last ? `Bạn là thành viên cuối của "${a.name}". Rời hẻm sẽ xoá luôn hẻm và tiến trình. Tiếp tục?` : `Rời hẻm "${a.name}"? Muốn quay lại phải có mã ${a.id}.`)) return;
    void run(async () => {
      await quitAlley(a.id);
      setAlleys(await listAlleys());
    });
  };

  return (
    <>
      <div className="login-divider" />
      <h2>Hẻm online (2–4 người)</h2>
      {!account ? (
        <p className="login-muted">Đăng nhập Google để mở tiệm chung với bạn bè. Tiến trình hẻm lưu trên server, ai cũng sửa được như nhau, lần sau vào lại chơi tiếp.</p>
      ) : (
        <>
          <p className="login-muted">Tiệm chung lưu trên server. Gửi mã hẻm cho bạn bè để cùng vào, tối đa 4 người, ai cũng có quyền như nhau.</p>
          {alleys?.map((a) => (
            <div key={a.id} className="login-alley">
              <button className="login-save" disabled={busy} onClick={() => enter(a.id)}>
                <strong>{a.name} · {a.id}</strong>
                <span>Ngày {a.day} · cấp {a.level} · {formatMoney(a.money)}</span>
                <span>{a.members.map((m) => m.name).join(', ')} ({a.members.length}/4)</span>
                {a.online > 0 && <span>🟢 {a.online} đang chơi</span>}
              </button>
              <button className="login-copy" disabled={busy} onClick={() => copyCode(a.id)} title="Sao chép mã hẻm để gửi cho bạn bè">
                {copied === a.id ? '✅ Đã chép' : '📋 Sao chép mã'}
              </button>
              <button className="login-link" disabled={busy} onClick={() => quit(a)}>Rời hẻm</button>
            </div>
          ))}
          <div className="login-row">
            <input
              className="login-code login-name"
              aria-label="Tên hẻm mới"
              placeholder="Tên hẻm mới"
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="login-btn small" disabled={busy} onClick={create}>Tạo hẻm</button>
          </div>
          <div className="login-row">
            <input
              className="login-code login-name"
              aria-label="Mã hẻm"
              placeholder="Mã hẻm (6 ký tự)"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && code.trim().length === 6 && join()}
            />
            <button className="login-btn small" disabled={busy || code.trim().length !== 6} onClick={join}>Gia nhập</button>
          </div>
        </>
      )}
    </>
  );
}
