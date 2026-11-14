import { t } from '../core/i18n';
/** GĐ651: tách khỏi Hud để menu Thêm (nạp lười) dùng chung. */
export type ToolDef = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; /** Nhóm trong menu Thêm: tiêu đề nhỏ hiện trước cụm nút cùng nhóm */ group?: string; /** Bước hướng dẫn ngày đầu đang chỉ tới nút này: viền vàng nhấp nháy */ pulse?: boolean };

export function ToolButton({ tool, level, onPicked }: { tool: ToolDef; level: number; onPicked?: () => void }) {
  const locked = tool.lock !== undefined && level < tool.lock;
  return (
    <button
      className={`hud-tool${tool.active ? ' active' : ''}${tool.pulse ? ' hud-pulse' : ''}`}
      disabled={locked}
      title={locked ? t('hud.mo_khoa_o_cap', { lock: tool.lock }) : tool.label}
      onClick={() => { onPicked?.(); tool.on(); }}
    >
      <span className="hud-tool-icon" aria-hidden="true">{locked ? '🔒' : tool.icon}</span>
      <span>{tool.label}</span>
      {locked && <span className="hud-badge muted">{t('hud.cap_4')}{' '}{tool.lock}</span>}
      {!locked && tool.badge && <span className="hud-badge">{tool.badge}</span>}
    </button>
  );
}

