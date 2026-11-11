import { useEffect, useMemo, useState } from 'react';
import {
  emptyGioGrid, gioFreeSpots, gioPlace, pickGioGifts, scoreGioQua,
  type GioGift, type GioGrid, type GioPlacement,
} from '../../data/gioQua';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7-L2 — trò ① Xếp giỏ quà (SPEC §7.5): chọn món quà rồi đặt vào giỏ 4×4 cho khít, không chồng,
 * món cao ở sau (điểm). Đề món quà tất định theo seed; điểm do scoreGioQua (thuần) tính.
 */
export function GioQua({ seed, onFinish, onProgress }: MiniGameProps) {
  const gifts = useMemo(() => pickGioGifts(seed), [seed]);
  const [grid, setGrid] = useState<GioGrid>(emptyGioGrid);
  const [placed, setPlaced] = useState<GioPlacement[]>([]);
  const [sel, setSel] = useState<GioGift | null>(null);

  const remaining = gifts.filter((g) => !placed.some((p) => p.gift.id === g.id));
  const score = scoreGioQua(placed);

  useEffect(() => { onProgress(score); }, [score, onProgress]);
  useEffect(() => {
    if (remaining.length === 0) onFinish(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining.length]);

  const freeSpots = sel ? gioFreeSpots(grid, sel) : [];
  const freeKey = new Set(freeSpots.map((s) => `${s.row},${s.col}`));

  const place = (row: number, col: number) => {
    if (!sel || !freeKey.has(`${row},${col}`)) return;
    setGrid(gioPlace(grid, sel, row, col));
    setPlaced([...placed, { gift: sel, row, col }]);
    setSel(null);
  };

  return (
    <div className="gioqua">
      <p className="minitap-hint">
        Chọn món quà rồi đặt vào giỏ <b>cho khít, không chồng</b> — món cao ở sau, thấp ở trước.
      </p>
      <div className="gioqua-grid">
        {grid.map((row, r) => (
          <div className="gioqua-row" key={r}>
            {row.map((cell, c) => {
              const g = cell ? gifts.find((x) => x.id === cell) : undefined;
              const keyy = `${r},${c}`;
              return (
                <button
                  key={keyy}
                  className={`gioqua-cell ${g ? 'filled' : ''} ${freeKey.has(keyy) ? 'spot' : ''}`}
                  onClick={() => place(r, c)}
                  aria-label={`ô ${r}-${c}`}
                >
                  {g?.icon ?? ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="gioqua-tray">
        {remaining.map((g) => (
          <button
            key={g.id}
            className={`gioqua-gift ${sel?.id === g.id ? 'sel' : ''}`}
            onClick={() => setSel(sel?.id === g.id ? null : g)}
            title={g.name}
          >
            <span className="gioqua-gift-icon">{g.icon}</span>
            <span className="gioqua-gift-name">{g.name}</span>
          </button>
        ))}
      </div>
      <p className="minitap-count">Đã xếp {placed.length}/6 · {score}/100</p>
    </div>
  );
}
