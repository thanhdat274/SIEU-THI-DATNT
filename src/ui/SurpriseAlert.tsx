import { useGame } from '../core/store';
import { productById } from '../data/products';
import { findSurprise } from '../data/surpriseArcs';
import { chooseSurprise } from '../core/biz';

/** Sự kiện bất ngờ trong ngày: chọn một cách xử lý. GĐ164: tra ARC trước rồi mới tới
 *  pool một-phát — cảnh arc resolve theo lựa chọn đã chốt; lựa chọn cần hàng kho mà
 *  kho thiếu thì xám kèm chữ "kho hết {món} rồi" (core chooseSurprise chặn lại lần nữa). */
export function SurpriseAlert() {
  const active = useGame((s) => s.biz.surprise);
  const storage = useGame((s) => s.storage);
  const ev = active && findSurprise(active.id, useGame.getState().biz.surpriseArc?.choices);
  if (!ev) return null;
  return (
    <div className="hud-alert phone">
      {ev.icon} <b>{ev.title}</b>: {ev.text}
      <span className="hud-alert-actions">
        {ev.choices.map((c, i) => {
          const short = c.needStock && (storage[c.needStock.productId] ?? 0) < c.needStock.qty;
          return (
            <button key={i} disabled={short} className={`hud-btn${i === 0 && !short ? ' primary' : ''}`}
              onClick={() => chooseSurprise(i)}
              title={short ? `Kho hết ${productById(c.needStock!.productId).name} rồi` : undefined}>
              {c.label}{short && <small> (kho hết {productById(c.needStock!.productId).name} rồi)</small>}
            </button>
          );
        })}
      </span>
    </div>
  );
}

