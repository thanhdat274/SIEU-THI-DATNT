import { useGame } from '../core/store';
import { COSTUMES, costumeById, costumesFor } from '../data/costumes';
import { formatMoney } from '../data/products';

/** Panel Trang phục — chọn và đổi trang phục cho nhân vật chính. */
export function CostumePanel() {
  const { level, costume, money, setCostume } = useGame();
  const allCostumes = COSTUMES;
  const available = costumesFor(level);
  const locked = allCostumes.filter((c) => c.unlock > level);
  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>👕 Trang phục</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 }}>
        Đổi ngoại hình nhân vật chính. Mỗi bộ trang phục mở khóa ở một cấp nhất định.
        Trang phục hiện tại: <b>{costumeById(costume)?.name ?? 'Mặc định'}</b>.
      </p>

      <h3 style={head}>✨ Trang phục đã mở khóa</h3>
      {available.length === 0 ? (
        <p style={{ opacity: 0.75, fontSize: 13 }}>Chưa có trang phục nào.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {available.map((c) => (
            <CostumeRow key={c.id} costume={c} />
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <h3 style={head}>🔒 Trang phục khóa</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {locked.slice(0, 5).map((c) => (
              <LockedCostume key={c.id} costume={c} />
            ))}
            {locked.length > 5 && (
              <p style={{ opacity: 0.6, fontSize: 12 }}>...và {locked.length - 5} trang phục khác</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

/** Một bộ trang phục: hiển thị chi tiết, nút chọn nếu chưa mặc. */
function CostumeRow({ costume: c }: { costume: import('../data/costumes').Costume }) {
  const { costume: current, setCostume, level, money } = useGame();
  const isEquipped = current === c.id;
  const unlocked = level >= c.unlock;
  const canAfford = money >= c.price;
  return (
    <div style={{
      background: isEquipped ? '#3a3a4d' : '#2b2b3a',
      borderRadius: 8,
      padding: '8px 12px',
      outline: isEquipped ? '2px solid #2ecc71' : undefined,
      opacity: unlocked ? 1 : 0.4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{c.icon}</span>
        <div style={{ flex: 1 }}>
          <b>{c.name}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {c.unlock <= level
              ? (c.price > 0 ? `Giá: ${formatMoney(c.price)}` : 'Miễn phí')
              : `🔒 Cấp ${c.unlock}`}
          </div>
        </div>
        {unlocked ? (
          <button
            style={{ ...btn, background: isEquipped ? '#2ecc71' : '#f1c40f', color: '#222', fontWeight: 700 }}
            onClick={() => setCostume(c.id)}
          >
            {isEquipped ? '✓ Đang mặc' : 'Mặc'}
          </button>
        ) : (
          <span style={{ fontSize: 12, opacity: 0.5 }}>🔒 Cấp {c.unlock}</span>
        )}
      </div>
    </div>
  );
}

/** Trang phục chưa mở khóa — chỉ hiện thông tin khóa. */
function LockedCostume({ costume: c }: { costume: import('../data/costumes').Costume }) {
  return (
    <div style={{ background: '#2b2b3a', borderRadius: 8, padding: '8px 12px', opacity: 0.45 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🔒</span>
        <div>
          <b>{c.name}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Mở khóa cấp {c.unlock} · {formatMoney(c.price)}</div>
        </div>
      </div>
    </div>
  );
}

const head: React.CSSProperties = { margin: '14px 0 8px', fontSize: 15 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 };
