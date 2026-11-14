import { useEffect, useRef, useState } from 'react';
import { initAudio, isMuted, isMusic, setMuted, setMusic } from '../core/audio';
import { formatMoney } from '../data/products';
import { t } from '../core/i18n';

/** Nút tắt/bật tiếng: âm thanh lưu riêng trong máy, không nằm trong bản lưu game. */
export function SoundToggle() {
  const [muted, setLocal] = useState(isMuted());
  return (
    <button
      className="hud-chip hud-sound"
      title={muted ? t('hud.bat_am_thanh') : t('hud.tat_am_thanh')}
      onClick={() => { initAudio(); const next = !muted; setMuted(next); setLocal(next); }}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
    </button>
  );
}

/** Nút nhạc nền: giai điệu nhẹ tự sinh, bật riêng khỏi hiệu ứng tiếng. */
export function MusicToggle() {
  const [on, setLocal] = useState(isMusic());
  return (
    <button
      className="hud-chip hud-sound"
      title={on ? t('hud.tat_nhac_nen') : t('hud.bat_nhac_nen')}
      onClick={() => { const next = !on; setMusic(next); setLocal(next); }}
    >
      <span aria-hidden="true">{on ? '🎵' : '🎶'}</span>
    </button>
  );
}

/** Tiền "pop" mỗi khi đổi: xanh khi kiếm, đỏ khi chi, kèm số +/− nổi lên rồi tan. */
export function MoneyChip({ money }: { money: number }) {
  const [bump, setBump] = useState(0);
  const [delta, setDelta] = useState<{ v: number; dir: 1 | -1 } | null>(null);
  const prev = useRef(money);
  useEffect(() => {
    if (money === prev.current) return;
    const diff = money - prev.current;
    prev.current = money;
    if (Math.abs(diff) >= 100) {
      setDelta({ v: diff, dir: diff >= 0 ? 1 : -1 });
      setBump((n) => n + 1);
    }
    const t = setTimeout(() => setDelta(null), 1300);
    return () => clearTimeout(t);
  }, [money]);
  return (
    <div className="hud-chip hud-money" title={t('hud.tien_hien_co')}>
      <span aria-hidden="true">💰</span>
      <b key={bump} className={delta ? (delta.dir === 1 ? 'money-up' : 'money-down') : undefined}>{formatMoney(money)}</b>
      {delta && <span className={`hud-delta ${delta.dir === 1 ? 'up' : 'down'}`}>{delta.dir === 1 ? '+' : '−'}{formatMoney(Math.abs(delta.v))}</span>}
    </div>
  );
}
