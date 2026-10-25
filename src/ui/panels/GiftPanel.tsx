import { useState } from 'react';
import { useGame } from '../../core/store';
import { DAILY_GIFTS, WHEEL_PRIZES, type WheelPrize } from '../../data/gifts';
import { Footer, styles } from './shared';

/** Điểm danh quà 7 ngày + vòng quay may mắn mỗi ngày một lượt. */
export function GiftPanel() {
  const { day, giftStreak, giftLastDay, wheelLastDay, wheelBoost, claimGift, spinWheel, closePanel } = useGame();
  const claimedToday = giftLastDay === day;
  const spunToday = wheelLastDay === day;
  const nextIdx = giftStreak % DAILY_GIFTS.length;
  const claimedIdx = claimedToday ? (giftStreak - 1) % DAILY_GIFTS.length : -1;
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelPrize | null>(null);

  const doSpin = () => {
    if (spunToday || spinning) return;
    const prize = spinWheel();
    if (!prize) return;
    const i = WHEEL_PRIZES.indexOf(prize);
    const step = 360 / WHEEL_PRIZES.length;
    const jitter = (Math.random() - 0.5) * step * 0.6;
    const targetMod = (360 - (i * step + step / 2 + jitter)) % 360;
    setResult(null);
    setSpinning(true);
    setAngle((a) => a + 360 * 5 + ((targetMod - (a % 360)) + 360) % 360);
    setTimeout(() => { setSpinning(false); setResult(prize); }, 3200);
  };

  const wheelColors = WHEEL_PRIZES.map((_, i) => `${i % 2 ? '#4a4a5d' : '#3a3a4d'} ${i * (360 / WHEEL_PRIZES.length)}deg ${(i + 1) * (360 / WHEEL_PRIZES.length)}deg`).join(', ');
  const step = 360 / WHEEL_PRIZES.length;
  return (
    <>
      <h2 style={styles.title}>🎁 Điểm danh & vòng quay</h2>
      <p style={styles.sub}>
        Mỗi ngày chơi nhận một phần quà, đủ 7 ngày liên tiếp thì trúng rương vàng rồi lặp lại.
        Mỗi ngày còn một lượt vòng quay may mắn.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        {DAILY_GIFTS.map((g, i) => {
          const done = i === claimedIdx;
          const next = i === nextIdx && !claimedToday;
          return (
            <div
              key={i}
              title={g.label}
              style={{
                flex: '1 1 70px', textAlign: 'center', padding: '8px 4px', borderRadius: 8, fontSize: 12,
                background: done ? '#3d6b45' : next ? '#5a4a1d' : '#3a3a4d',
                outline: next ? '2px solid #f1c40f' : undefined,
                opacity: done ? 0.9 : 1,
              }}
            >
              <div style={{ fontSize: 22 }}>{done ? '✅' : g.icon}</div>
              <div>{g.label}</div>
              <small style={{ opacity: 0.65 }}>Ngày {i + 1}</small>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <small style={{ opacity: 0.75 }}>Chuỗi điểm danh: {giftStreak > 0 ? `${giftStreak} ngày` : 'chưa bắt đầu'}</small>
        <button style={{ ...styles.btn, marginLeft: 0, background: claimedToday ? '#666' : '#2ecc71', color: '#fff', cursor: claimedToday ? 'default' : 'pointer' }} onClick={claimGift} disabled={claimedToday}>
          {claimedToday ? '✅ Hôm nay đã điểm danh' : 'Nhận quà hôm nay'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 232, height: 232, flexShrink: 0 }}>
          {/* Kim chỉ ở đỉnh */}
          <div style={{ position: 'absolute', left: '50%', top: -4, transform: 'translateX(-50%)', fontSize: 20, zIndex: 2 }}>▼</div>
          <div
            style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: `conic-gradient(${wheelColors})`,
              transform: `rotate(${angle}deg)`,
              transition: spinning ? 'transform 3s cubic-bezier(0.15, 0.6, 0.15, 1)' : undefined,
              boxShadow: '0 0 0 5px #222, 0 6px 18px rgba(0,0,0,0.4)',
              position: 'relative',
            }}
          >
            {WHEEL_PRIZES.map((p, i) => (
              // Nhãn xoay theo ô (kiểu vòng quay thật): biểu tượng sát mép, chữ bên dưới hướng vào tâm,
              // bề ngang giới hạn trong cung của ô để không tràn sang ô bên cạnh
              <div
                key={i}
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 54, marginLeft: -27,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transform: `rotate(${i * step + step / 2}deg) translateY(-104px)`,
                  transformOrigin: '50% 0',
                  textAlign: 'center', lineHeight: 1.05, pointerEvents: 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{p.short}</span>
              </div>
            ))}
          </div>
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 40, height: 40, borderRadius: '50%', background: '#f1c40f', color: '#222',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, zIndex: 1,
          }}>🎡</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          {spinning ? (
            <p style={styles.sub}>Đang quay…</p>
          ) : result ? (
            <p style={{ ...styles.sub, fontSize: 15 }}>
              🎉 Chúc mừng: <b>{result.icon} {result.label}</b>
            </p>
          ) : spunToday ? (
            <p style={styles.sub}>Hôm nay đã quay rồi, mai quay lại nhé!</p>
          ) : (
            <p style={styles.sub}>Mỗi ngày một lượt quay. Trúng 🍀 thì cả ngày khách ghé đông thêm!</p>
          )}
          <button
            style={{ ...styles.btn, marginLeft: 0, background: spunToday || spinning ? '#666' : '#e67e22', color: '#fff', cursor: spunToday || spinning ? 'default' : 'pointer', padding: '8px 16px' }}
            onClick={doSpin}
            disabled={spunToday || spinning}
          >
            🎡 Quay ngay
          </button>
          {wheelBoost > 1 && (
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#a3e4a3' }}>🍀 Hôm nay khách ghé đông thêm {Math.round((wheelBoost - 1) * 100)}% nhờ vòng quay.</p>
          )}
        </div>
      </div>
      <Footer onClose={closePanel} />
    </>
  );
}
