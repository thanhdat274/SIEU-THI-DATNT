import { askConfirm } from './ConfirmDialog';
import { useEffect, useState } from 'react';
import { formatMoney } from '../data/products';
import { createAlley, enterAlley, joinAlley, listAlleys, quitAlley, type AlleySummary } from '../net/coop';
import { useSession } from '../net/session';

/**
 * Bảng "Hẻm online" riêng, đứng cạnh thẻ đăng nhập (chỉ hiện khi đã đăng nhập).
 * Tách khỏi thẻ đăng nhập để bao nhiêu hẻm cũng không đẩy thông tin đăng nhập —
 * danh sách cuộn trong khung riêng, hàng tạo hẻm/gia nhập luôn đứng đáy bảng.
 */
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
  const quit = async (a: AlleySummary) => {
    const last = a.members.length === 1;
    if (!await askConfirm(last ? `Bạn là thành viên cuối của "${a.name}". Rời hẻm sẽ xoá luôn hẻm và tiến trình. Tiếp tục?` : `Rời hẻm "${a.name}"? Muốn quay lại phải có mã ${a.id}.`, { danger: last, okLabel: 'Rời hẻm' })) return;
    void run(async () => {
      await quitAlley(a.id);
      setAlleys(await listAlleys());
    });
  };

  return (
    <section className="login-card login-coop" aria-label="Hẻm online">
      <header className="coop-head">
        <h2>Hẻm online <span className="coop-sub">(2–4 người)</span></h2>
        {alleys && <span className="coop-count">{alleys.length} hẻm</span>}
      </header>
      <p className="login-muted">Tiệm chung lưu trên server. Gửi mã hẻm cho bạn bè để cùng vào, tối đa 4 người, ai cũng có quyền như nhau.</p>
      {alleys == null ? null : alleys.length === 0 ? (
        <p className="coop-empty">Chưa có hẻm nào. Tạo hẻm mới bên dưới, hoặc nhập mã bạn bè gửi để vào cùng.</p>
      ) : (
        <div className="coop-list">
          {alleys.map((a) => (
            <div key={a.id} className="coop-item">
              <button className="login-save" disabled={busy} onClick={() => enter(a.id)}>
                <strong>{a.name}</strong>
                <span>Ngày {a.day} · cấp {a.level} · {formatMoney(a.money)}</span>
                <span>{a.members.map((m) => m.name).join(', ')} ({a.members.length}/4){a.online > 0 ? ` · 🟢 ${a.online} đang chơi` : ''}</span>
              </button>
              <div className="coop-side">
                <button className="login-copy" disabled={busy} onClick={() => copyCode(a.id)} title="Sao chép mã hẻm để gửi cho bạn bè">
                  {copied === a.id ? '✅ Đã chép' : `📋 ${a.id}`}
                </button>
                <button className="login-link" disabled={busy} onClick={() => quit(a)}>Rời hẻm</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="coop-form">
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
      </div>
    </section>
  );
}
