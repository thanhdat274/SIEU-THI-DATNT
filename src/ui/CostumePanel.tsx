import { useGame } from '../core/store';
import { COSTUMES, PRESTIGE_COSTUMES, costumeById } from '../data/costumes';
import { formatMoney } from '../data/products';

/** Thời điểm người chơi có thể mặc bộ trang phục: cần đủ cấp VÀ đủ số lần tái sinh (nếu là NG+). */
function isAvailable(c: { unlock: number; prestige?: number }, level: number, prestige: number): boolean {
  return c.unlock <= level && (c.prestige ?? 0) <= prestige;
}

/** Panel Trang phục — chọn và đổi trang phục cho nhân vật chính. */
export function CostumePanel() {
  const { level, costume, money, setCostume, biz } = useGame();
  const prestige = biz.prestige.level;
  const allCostumes = [...COSTUMES, ...PRESTIGE_COSTUMES];
  const available = allCostumes.filter((c) => isAvailable(c, level, prestige));
  const locked = allCostumes.filter((c) => !isAvailable(c, level, prestige));
  return (
    <>
      <h2 style={{ margin: '0 0 4px' }}>👕 Trang phục</h2>
      <p style={{ margin: '0 0 12px', opacity: 0.75, fontSize: 13, maxWidth: 520 }}>
        Đổi ngoại hình nhân vật chính. Mỗi bộ trang phục mở khóa ở một cấp nhất định (một số bộ NG+ cần
        tái sinh đủ số lần). Trang phục hiện tại: <b>{costumeById(costume)?.name ?? 'Mặc định'}</b>.
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
            {locked.slice(0, 6).map((c) => (
              <LockedCostume key={c.id} costume={c} />
            ))}
            {locked.length > 6 && (
              <p style={{ opacity: 0.6, fontSize: 12 }}>...và {locked.length - 6} trang phục khác</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

/** Một bộ trang phục: hiển thị chi tiết, nút chọn nếu chưa mặc. */
function CostumeRow({ costume: c }: { costume: import('../data/costumes').Costume }) {
  const { costume: current, setCostume, level, money, biz } = useGame();
  const prestige = biz.prestige.level;
  const isEquipped = current === c.id;
  const unlocked = isAvailable(c, level, prestige);
  const canAfford = money >= c.price;
  return (
    <div style={{
      background: isEquipped ? '#3a3a4d' : '#2b2b3a',
      borderRadius: 8,
      padding: '8px 12px',
      outline: isEquipped ? '2px solid #2ecc71' : undefined,
      opacity: unlocked ? 1 : 0.4,
      border: c.prestige ? '1px solid rgba(241,196,15,0.3)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{c.icon}</span>
        <div style={{ flex: 1 }}>
          <b>{c.name}</b>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {unlocked
              ? (c.price > 0 ? `Giá: ${formatMoney(c.price)}` : 'Miễn phí')
              : (c.unlock > level ? `🔒 Cấp ${c.unlock}` : `🔒 Tái sinh ${c.prestige} lần`)}
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
          <span style={{ fontSize: 12, opacity: 0.5 }}>{c.unlock > level ? `🔒 Cấp ${c.unlock}` : `🔒 Tái sinh ${c.prestige}`}</span>
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
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {c.unlock > 60 ? 'Mở theo cấp' : ''} Mở khóa cấp {c.unlock} · {formatMoney(c.price)}
          </div>
        </div>
      </div>
    </div>
  );
}

const head: React.CSSProperties = { margin: '14px 0 8px', fontSize: 15 };
const btn: React.CSSProperties = { border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 };
