import { useEffect, useRef, useState } from 'react';
import {
  FLAN_MOLDS, FLAN_ZONE_HALF, flanGaugePos, flanMoldScore, flanZoneCenter, scoreFlanKhuon,
} from '../../data/flanKhuon';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7 — trò ⑤ Rót khuôn bánh flan (Hội thi làm bánh): chạm khi vạch rót vào đúng vùng xanh.
 * Mức "Thong thả" vạch chạy chậm hơn (không đếm giờ). Đề (vùng xanh từng khuôn) tất định theo seed.
 */
export function FlanKhuon({ seed, mode, onFinish, onProgress }: MiniGameProps) {
  const [tick, setTick] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const doneRef = useRef(false);

  const interval = mode === 'calm' ? 110 : 60;
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), interval);
    return () => clearInterval(t);
  }, [interval]);

  const idx = scores.length;
  const pos = flanGaugePos(tick);
  const center = flanZoneCenter(seed, Math.min(idx, FLAN_MOLDS - 1));
  const total = scoreFlanKhuon(scores);

  useEffect(() => { onProgress(total); }, [total, onProgress]);
  useEffect(() => {
    if (scores.length >= FLAN_MOLDS && !doneRef.current) { doneRef.current = true; onFinish(total); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.length]);

  const pour = () => {
    if (idx >= FLAN_MOLDS) return;
    setScores((s) => [...s, flanMoldScore(pos, center)]);
  };

  return (
    <div className="flankhuon">
      <p className="minitap-hint">
        Rót caramel + trứng sữa vào khuôn: <b>chạm khi vạch rơi vào vùng xanh</b>. Khuôn {Math.min(FLAN_MOLDS, idx + 1)}/{FLAN_MOLDS}.
      </p>
      <div className="flankhuon-bar" aria-label="thanh rót">
        <span
          className="flankhuon-zone"
          style={{ left: `${(center - FLAN_ZONE_HALF) * 100}%`, width: `${FLAN_ZONE_HALF * 200}%` }}
        />
        <span className="flankhuon-mark" style={{ left: `${pos * 100}%` }} />
      </div>
      <div className="flankhuon-molds">
        {Array.from({ length: FLAN_MOLDS }).map((_, i) => (
          <span key={i} className={`flankhuon-mold ${i < idx ? (scores[i] >= 1 ? 'good' : scores[i] > 0 ? 'ok' : 'bad') : ''}`}>
            {i < idx ? '🍮' : '○'}
          </span>
        ))}
      </div>
      <button className="mini-btn primary" onClick={pour} disabled={idx >= FLAN_MOLDS}>🥄 Rót!</button>
      <p className="minitap-count">{total}/100</p>
    </div>
  );
}
