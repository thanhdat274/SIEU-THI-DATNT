import { useEffect, useMemo, useRef, useState } from 'react';
import { KET_COUNT, KET_KINDS, ketSequence, scoreXepKet } from '../../data/xepKetBia';
import type { MiniGameProps } from './MiniHostView';

/** Hệ 7 — trò ⑦ Xếp két lên xe đẩy: két hiện lần lượt, bấm đúng ô loại hàng. */
export function XepKetBia({ seed, onFinish, onProgress }: MiniGameProps) {
  const seq = useMemo(() => ketSequence(seed), [seed]);
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(0);
  const doneRef = useRef(false);
  const score = scoreXepKet(ok);
  useEffect(() => { onProgress(score); }, [score, onProgress]);
  useEffect(() => {
    if (i >= KET_COUNT && !doneRef.current) { doneRef.current = true; onFinish(score); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  const cur = KET_KINDS.find((k) => k.id === seq[i]);
  const tap = (id: string) => {
    if (i >= KET_COUNT) return;
    if (id === seq[i]) setOk((x) => x + 1);
    setI((x) => x + 1);
  };
  return (
    <div className="xepket">
      <p className="minitap-hint">Két {Math.min(i + 1, KET_COUNT)}/{KET_COUNT} — xếp vào đúng ô xe đẩy.</p>
      <div className="xepket-cur">{cur ? `${cur.icon} Két ${cur.name}` : '✔'}</div>
      <div className="phanuoc-tray">
        {KET_KINDS.map((k) => (
          <button key={k.id} className="phanuoc-ing" onClick={() => tap(k.id)}>
            <span>{k.icon}</span><span className="phanuoc-ing-name">{k.name}</span>
          </button>
        ))}
      </div>
      <p className="minitap-count">{score}/100</p>
    </div>
  );
}
