import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PHA_INGREDIENTS, PHA_ROUNDS, PHA_SHOW_MS, phaOrder, phaRoundScore, scorePhaNuoc,
} from '../../data/phaNuoc';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7 — trò ⑥ Pha nước theo đơn (Mùa hè): nhớ thứ tự đơn hiện vài giây rồi bấm lại đúng thứ tự.
 * 3 vòng, đơn dài dần 3 → 4 → 5 nguyên liệu. Đề tất định theo seed.
 */
export function PhaNuoc({ seed, mode, onFinish, onProgress }: MiniGameProps) {
  const [round, setRound] = useState(0);
  const [showing, setShowing] = useState(true);
  const [input, setInput] = useState<string[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const doneRef = useRef(false);

  const order = useMemo(() => phaOrder(seed, Math.min(round, PHA_ROUNDS - 1)), [seed, round]);
  const total = scorePhaNuoc(scores);

  useEffect(() => {
    if (!showing) return;
    const t = setTimeout(() => setShowing(false), PHA_SHOW_MS[mode === 'calm' ? 'calm' : 'fast']);
    return () => clearTimeout(t);
  }, [showing, mode, round]);

  useEffect(() => { onProgress(total); }, [total, onProgress]);
  useEffect(() => {
    if (scores.length >= PHA_ROUNDS && !doneRef.current) { doneRef.current = true; onFinish(total); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.length]);

  const tap = (id: string) => {
    if (showing || scores.length >= PHA_ROUNDS) return;
    const next = [...input, id];
    setInput(next);
    if (next.length >= order.length) {
      setScores((s) => [...s, phaRoundScore(order, next)]);
      setInput([]);
      setRound((r) => r + 1);
      setShowing(true);
    }
  };

  const byId = (id: string) => PHA_INGREDIENTS.find((x) => x.id === id);

  return (
    <div className="phanuoc">
      <p className="minitap-hint">
        {showing ? <>Nhớ đơn nước — <b>sắp ẩn!</b></> : <>Bấm lại đúng thứ tự ({input.length}/{order.length}).</>}
        {' '}Đơn {Math.min(PHA_ROUNDS, round + 1)}/{PHA_ROUNDS}.
      </p>
      <div className="phanuoc-order">
        {order.map((id, i) => (
          <span key={i} className="phanuoc-slot">
            {showing ? byId(id)?.icon : i < input.length ? byId(input[i])?.icon : '？'}
          </span>
        ))}
      </div>
      <div className="phanuoc-tray">
        {PHA_INGREDIENTS.map((ing) => (
          <button key={ing.id} className="phanuoc-ing" onClick={() => tap(ing.id)} disabled={showing} title={ing.name}>
            <span>{ing.icon}</span>
            <span className="phanuoc-ing-name">{ing.name}</span>
          </button>
        ))}
      </div>
      <p className="minitap-count">{total}/100</p>
    </div>
  );
}
