import { useEffect, useState } from 'react';
import { useGame } from '../core/store';
import { closeChapter } from '../core/biz';
import { chapterById } from '../data/chapters';
import { formatMoney } from '../data/products';

/** Hội thoại chương cốt truyện: hiện từng câu, bấm để qua câu kế; game tạm dừng trong lúc đọc.
 *  Khi panel đang mở thì ẩn — chapterPending vẫn giữ trong state, đóng panel là hiện lại
 *  (tránh đè nội dung panel trên màn hẹp, che khuất chức năng). */
export function ChapterDialogue() {
  const id = useGame((s) => s.biz.chapterPending);
  const panelOpen = useGame((s) => s.panel !== null);
  const [line, setLine] = useState(0);
  useEffect(() => setLine(0), [id]);
  const ch = id ? chapterById(id) : undefined;
  if (!ch) {
    // Save cũ mang id chương đã bị xoá/đổi tên: ChapterDialogue từng return null → chapterPending
    // vẫn treo, đồng hồ dừng 0× VĨNH VIỄN mà không có thoại nào hiện. Hiện thẻ tối thiểu để đóng.
    if (!id || panelOpen) return null;
    return (
      <div className="hud-dialogue" role="dialog" aria-label="Cốt truyện">
        <div className="hud-dialogue-title">📖 Cốt truyện</div>
        <div className="hud-dialogue-line">
          <span className="hud-dialogue-avatar" aria-hidden="true">📖</span>
          <span>
            <b>Truyện hẻm</b>
            <p>Một chuyện đã kể rồi — chạm để đón chuyện tiếp theo.</p>
          </span>
        </div>
        <div className="hud-dialogue-foot">
          <button className="hud-btn primary" onClick={closeChapter}>✔ Xong</button>
        </div>
      </div>
    );
  }
  if (panelOpen) return null;
  const l = ch.lines[Math.min(line, ch.lines.length - 1)];
  const last = line >= ch.lines.length - 1;
  const reward = [ch.reward?.money && formatMoney(ch.reward.money), ch.reward?.xp && `${ch.reward.xp} XP`].filter(Boolean).join(', ');
  return (
    <div className="hud-dialogue" role="dialog" aria-label={ch.title}>
      <div className="hud-dialogue-title">📖 {ch.title}</div>
      <div className="hud-dialogue-line">
        <span className="hud-dialogue-avatar" aria-hidden="true">{l.icon}</span>
        <span>
          <b>{l.speaker}</b>
          <p>{l.text}</p>
        </span>
      </div>
      <div className="hud-dialogue-foot">
        <small>{line + 1}/{ch.lines.length}{last && reward ? ` · Thưởng: ${reward}` : ''}</small>
        <button className="hud-btn primary" onClick={() => (last ? closeChapter() : setLine(line + 1))}>
          {last ? '✔ Xong' : 'Tiếp ▶'}
        </button>
      </div>
    </div>
  );
}
