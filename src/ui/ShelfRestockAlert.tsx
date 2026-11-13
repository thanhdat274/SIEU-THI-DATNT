import { useGame, type Furniture } from '../core/store';
import { furnitureDef } from '../data/furniture';
import { unlockedProducts } from '../data/products';
import { allowedForType, fillPlanForShelf } from '../data/planogram';

/** Ô coi là cần châm khi trống hoặc còn ≤ nửa sức chứa (cùng ngưỡng Sơ đồ kệ). */
const LOW = 0.5;
/** Chỉ nhắc khi có ít nhất chừng này ô vừa cần châm vừa châm được từ kho (tránh chip nhảy liên tục). */
const MIN_SLOTS = 3;

/** Đếm ô cần châm mà kho còn món để châm (món đang gán, hoặc ô trống có kế hoạch chọn món). */
function fillableSlots(furniture: Furniture[], storage: Record<string, number>, level: number) {
  const unlocked = unlockedProducts(level);
  const out: { uid: number; i: number; id: string }[] = [];
  for (const f of furniture) {
    const def = furnitureDef(f.type);
    if (def.tiers <= 0) continue;
    const plan = fillPlanForShelf(f, storage, allowedForType(f.type, unlocked), new Set());
    f.tiers.forEach((t, i) => {
      if (t.count > def.capacity * LOW && t.productId) return;
      const id = t.productId ?? plan[i];
      if (id && (storage[id] ?? 0) > 0 && t.count < def.capacity) out.push({ uid: f.uid, i, id });
    });
  }
  return out;
}

/** Review 13/11-2 R2 — châm kệ nhanh ngay trên thẻ thông báo, khỏi mở Sơ đồ kệ giữa giờ đông. Là thẻ
 *  thông báo (không phải nút dock) nên không đụng trần nút HUD; thẻ tự biến mất khi kệ đã đầy. */
export function ShelfRestockAlert() {
  const furniture = useGame((s) => s.furniture);
  const storage = useGame((s) => s.storage);
  const level = useGame((s) => s.level);
  const shopOpen = useGame((s) => s.shopOpen);
  const stockTier = useGame((s) => s.stockTier);
  if (!shopOpen) return null;
  const slots = fillableSlots(furniture, storage, level);
  if (slots.length < MIN_SLOTS) return null;
  return (
    <div className="hud-alert info">
      🧺 {slots.length} ô kệ trống/sắp hết, kho còn hàng để châm.
      <span className="hud-alert-actions">
        <button
          className="hud-btn primary"
          onClick={() => {
            // Châm tuần tự: mỗi lần stockTier đổi kho nên tính lại từ state mới nhất cho ô kế tiếp.
            for (let guard = 0; guard < 80; guard++) {
              const g = useGame.getState();
              const next = fillableSlots(g.furniture, g.storage, g.level)[0];
              if (!next) break;
              g.stockTier(next.uid, next.i, next.id);
            }
          }}
        >
          Bày đầy
        </button>
      </span>
    </div>
  );
}
