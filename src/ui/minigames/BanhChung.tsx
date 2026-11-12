import { useEffect, useMemo, useState } from 'react';
import {
  BANH_CHUNG_STEPS, BANH_INGREDIENTS, banhTray, banhIngredientById, isSquareBanh, scoreBanhChung,
} from '../../data/banhChung';
import type { MiniGameProps } from './MiniHostView';

const TOTAL_CAKES = 4;

/** Chuỗi 8 bước nhưng sai thứ tự — dùng để khoá một cái bánh thành "méo" (đủ bước, không vuông). */
const WRONG_SEQUENCE = (() => [...BANH_CHUNG_STEPS].reverse())();

/**
 * Hệ 7-L3 — trò ② Gói bánh chưng (SPEC §7.5): bấm nguyên liệu theo đúng trình tự gói
 * (lót lá → nếp → đậu xanh → thịt → đậu xanh → nếp → gấp lá → buộc lạt) để mỗi cái bánh vuông vức.
 * Sai thứ tự thì cái bánh đó "méo". Gói 4 cái; điểm = tỉ lệ bánh vuông (đề tất định theo seed).
 */
export function BanhChung({ seed, onFinish, onProgress }: MiniGameProps) {
  // Từng cái bánh: chuỗi bước đã đặt (đủ 8 bước = gói xong cái đó). Một cái "méo" = chuỗi sai thứ tự.
  const [cakes, setCakes] = useState<string[][]>(Array.from({ length: TOTAL_CAKES }, () => []));
  const [idx, setIdx] = useState(0); // cái bánh đang gói

  const current = cakes[idx] ?? [];
  const expected = BANH_CHUNG_STEPS[current.length];
  const tray = useMemo(() => banhTray(seed, idx), [seed, idx]);
  const allWrapped = cakes.every((c) => c.length === BANH_CHUNG_STEPS.length);

  const squareCount = cakes.filter(isSquareBanh).length;
  const score = scoreBanhChung(squareCount, TOTAL_CAKES);

  useEffect(() => { onProgress(score); }, [score, onProgress]);
  useEffect(() => {
    if (allWrapped) onFinish(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWrapped]);

  const tap = (id: string) => {
    if (allWrapped) return;
    if (id !== expected) {
      // Sai thứ tự → cái bánh này "méo" (đủ bước, không vuông) rồi gói cái kế tiếp.
      setCakes((cs) => cs.map((c, i) => (i === idx ? WRONG_SEQUENCE : c)));
      setIdx((i) => Math.min(TOTAL_CAKES - 1, i + 1));
      return;
    }
    const filled = current.length + 1 === BANH_CHUNG_STEPS.length;
    setCakes((cs) => cs.map((c, i) => (i === idx ? [...c, id] : c)));
    if (filled) setIdx((i) => Math.min(TOTAL_CAKES - 1, i + 1));
  };

  return (
    <div className="banhchung">
      <p className="minitap-hint">
        Gói bánh chưng theo đúng trình tự — <b>sai thứ tự thì bánh méo</b>.
        Bánh {Math.min(TOTAL_CAKES, idx + 1)}/{TOTAL_CAKES}.
      </p>

      {/* Khuôn bánh đang gói */}
      <div className="banhchung-khuon">
        {BANH_CHUNG_STEPS.map((step, i) => {
          const isMéo = current.length === BANH_CHUNG_STEPS.length && current[i] !== step;
          const filled = i < current.length && !isMéo;
          const ing = banhIngredientById(step);
          return (
            <span
              key={`${step}-${i}`}
              className={`banhchung-cell ${filled ? 'filled' : ''} ${isMéo ? 'meo' : ''}`}
              title={ing?.name ?? step}
            >
              {filled ? ing?.icon ?? '✓' : isMéo ? '✕' : ''}
            </span>
          );
        })}
      </div>

      {/* Khay nguyên liệu */}
      <div className="banhchung-tray">
        {tray.map((ing) => {
          const isBase = BANH_INGREDIENTS.some((b) => b.id === ing.id);
          return (
            <button
              key={ing.id}
              className={`banhchung-ing ${isBase ? 'base' : 'decor'} ${expected === ing.id ? 'next' : ''}`}
              onClick={() => tap(ing.id)}
              disabled={allWrapped}
              title={ing.name}
            >
              <span className="banhchung-ing-icon">{ing.icon}</span>
              <span className="banhchung-ing-name">{ing.name}</span>
            </button>
          );
        })}
      </div>

      <p className="minitap-count">
        Bánh vuông {squareCount}/{TOTAL_CAKES} · {score}/100
      </p>
    </div>
  );
}
