/** GĐ651: tách khỏi Hud để menu Thêm (nạp lười) dùng chung. */
export type ToolDef = { icon: string; label: string; on: () => void; badge?: string; lock?: number; active?: boolean; /** Nhóm trong menu Thêm: tiêu đề nhỏ hiện trước cụm nút cùng nhóm */ group?: string; /** Bước hướng dẫn ngày đầu đang chỉ tới nút này: viền vàng nhấp nháy */ pulse?: boolean };

export function ToolButton({ tool: t, level, onPicked }: { tool: ToolDef; level: number; onPicked?: () => void }) {
  const locked = t.lock !== undefined && level < t.lock;
  return (
    <button
      className={`hud-tool${t.active ? ' active' : ''}${t.pulse ? ' hud-pulse' : ''}`}
      disabled={locked}
      title={locked ? `Mở khóa ở cấp ${t.lock}` : t.label}
      onClick={() => { onPicked?.(); t.on(); }}
    >
      <span className="hud-tool-icon" aria-hidden="true">{locked ? '🔒' : t.icon}</span>
      <span>{t.label}</span>
      {locked && <span className="hud-badge muted">Cấp {t.lock}</span>}
      {!locked && t.badge && <span className="hud-badge">{t.badge}</span>}
    </button>
  );
}

