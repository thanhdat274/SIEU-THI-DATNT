import { useEffect, useMemo, useState } from 'react';
import { miniRand } from './seeded';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7 L1 — trò GIẢ để thử khung trên điện thoại: chạm nhanh ô sáng N lần trước khi hết giờ.
 * Đề bài (ô bắt đầu) tất định theo seed (R4). Điểm = % số lần đã chạm đúng khi kết thúc.
 */

const N = 6;
const CELLS = 9;

export function TapSpot({ seed, onFinish, onProgress }: MiniGameProps) {
  // Ô mục tiêu đầu tiên rút từ seed; mỗi lần chạm đúng lại dời tới ô khác (tất định theo nhịp).
  const [target, setTarget] = useState(() => Math.floor(miniRand(seed, 0, 1) * CELLS));
  const [hit, setHit] = useState(0);
  const next = useMemo(() => hit + 1, [hit]);

  useEffect(() => { onProgress((hit / N) * 100); }, [hit, onProgress]);

  const tap = (i: number) => {
    if (i !== target) return; // chạm nhầm: không phạt, chỉ mất giờ
    if (next >= N) { onFinish(100); return; }
    setHit(next);
    setTarget(Math.floor(miniRand(seed, next, 1) * CELLS));
  };

  return (
    <div className="minitap">
      <p className="minitap-hint">
        Chạm nhanh ô <b style={{ color: '#d35400' }}>• cam</b> — {N - hit} lần nữa là xong.
      </p>
      <div className="minitap-grid">
        {Array.from({ length: CELLS }).map((_, i) => (
          <button
            key={i}
            className={`minitap-cell ${i === target ? 'target' : ''}`}
            onClick={() => tap(i)}
            aria-label={`ô ${i + 1}`}
          />
        ))}
      </div>
      <p className="minitap-count">{hit} / {N}</p>
    </div>
  );
}
