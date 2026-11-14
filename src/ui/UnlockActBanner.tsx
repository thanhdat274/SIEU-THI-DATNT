import { useGame } from '../core/store';
import { pendingUnlockAct } from '../data/unlockActs';
import { t } from '../core/i18n';

/** GĐ64 — mồi "Thử ngay" khi một hệ chính mới mở khóa: hiện trong cột alert, đóng vĩnh viễn. */
export function UnlockActBanner() {
  const level = useGame((s) => s.level);
  const biz = useGame((s) => s.biz);
  const openPanel = useGame((s) => s.openPanel);
  const act = pendingUnlockAct(biz, level);
  if (!act) return null;
  const done = () => useGame.getState().dismissUnlockAct(act.id);
  return (
    <div className="hud-alert hud-alert-unlock" style={{ background: 'rgba(39,174,96,0.95)' }}>
      <span className="hud-alert-text">{t('alerts.moi_mo')}{' '}{act.icon} {act.title} — {act.hint}</span>
      <span className="hud-alert-actions">
        <button className="hud-btn" onClick={() => { openPanel(act.panel()); done(); }}>{t('alerts.thu_ngay')}</button>
        <button className="hud-btn" onClick={done} title={t('alerts.bo_qua_khong_hien_lai')}>✕</button>
      </span>
    </div>
  );
}
