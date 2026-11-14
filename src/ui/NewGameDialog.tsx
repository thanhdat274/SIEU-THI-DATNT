import { useEffect, useRef, useState } from 'react';
import { resetGame } from '../core/save';
import { t } from '../core/i18n';
import { loadPlayerName, NAME_MAX, savePlayerName, validatePlayerName } from '../data/playerName';

/**
 * Hộp thoại "Chơi mới": đặt tên tiệm ngay lúc mở ván thay vì bắt điền ô tên ở ngoài màn đăng nhập.
 * Tên lưu vào `th3d_player` (như NameField cũ) → startGame ghi vào shopName.
 * Máy đã có bản lưu thì cảnh báo: mở tiệm mới sẽ xoá bản đang có.
 */
export function NewGameDialog({ hasSave, saveDay, onStart, onClose }: {
  hasSave: boolean; saveDay?: number; onStart: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(() => loadPlayerName() || t('login.ten_tiem_mac_dinh'));
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.select();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = validatePlayerName(name);
    if (!c.ok) { setErr(c.reason); input.current?.focus(); return; }
    savePlayerName(c.name);
    if (hasSave) resetGame();
    onStart();
  };

  return (
    <div className="ng-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="ng-dialog" role="dialog" aria-modal="true" aria-labelledby="ng-title" onSubmit={submit}>
        <header className="ng-head">
          <span className="ng-icon" aria-hidden="true">🏪</span>
          <div>
            <h2 id="ng-title">{t('login.ng_tieu_de')}</h2>
            <p className="login-muted">{t('login.ng_phu_de')}</p>
          </div>
          <button type="button" className="ng-close" aria-label={t('login.dong')} onClick={onClose}>✕</button>
        </header>

        <div className="ng-story">
          <small>{t('login.ng_loi_mo_dau')}</small>
          <p>{t('login.ng_cau_chuyen')}</p>
        </div>

        <label className="ng-label" htmlFor="ng-name">{t('login.ng_ten_tiem')}</label>
        <input id="ng-name" ref={input} className="lm-input ng-input" maxLength={NAME_MAX} value={name}
          placeholder={t('login.vi_du_tiem_co_ba')} onChange={(e) => { setName(e.target.value); setErr(null); }} />
        {err ? <p className="login-error" role="alert">{err}</p> : <p className="login-muted">{t('login.ng_ten_goi_y')}</p>}

        {hasSave && (
          <p className="login-warn" role="alert">{t('login.ng_canh_bao_xoa', { day: saveDay ?? '?' })}</p>
        )}

        <div className="login-row">
          <button type="button" className="login-btn small" onClick={onClose}>{t('login.ng_huy')}</button>
          <button type="submit" className={`login-btn small${hasSave ? ' danger' : ' primary'}`}>
            {hasSave ? t('login.ng_xoa_va_mo') : t('login.ng_mo_tiem')}
          </button>
        </div>
      </form>
    </div>
  );
}
