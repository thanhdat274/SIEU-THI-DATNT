import { useEffect, useMemo, useState } from 'react';
import {
  DEN_SECTIONS, STAR_EDGES, STAR_TIPS, STAR_TIP_ORDER, connectEdges, scoreDenOngSao, scoreDenPaste,
  scoreStarConnect, starCorrectEdges,
} from '../../data/denOngSao';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7-L5 — trò ④ Phất đèn ông sao (SPEC-CHIEU-RONG §7.5).
 *
 * Hai bước làm đèn thật: (1) nối các nan theo đúng thứ tự để thành ngôi sao MỘT NÉT
 * (bấm tip theo [0,2,4,1,3]); (2) dán giấy màu vào 5 cánh + tâm. Điểm = 60 (nối) + 40 (dán).
 */

type Phase = 'connect' | 'paste';

const CX = 60;
const CY = 60;
const R = 44;
const tipPt = (i: number): { x: number; y: number } => {
  const a = ((-90 + i * (360 / STAR_TIPS)) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
};

export function DenOngSao({ onFinish, onProgress }: MiniGameProps) {
  const [phase, setPhase] = useState<Phase>('connect');
  const [seq, setSeq] = useState<number[]>([]);
  // 6 vùng: 0–4 = 5 cánh, 5 = tâm. Phần tử đúng = đã dán.
  const [covers, setCovers] = useState<boolean[]>(Array(DEN_SECTIONS).fill(false));

  const tipsByIndex = useMemo(() => STAR_TIP_ORDER.map((tipIdx) => tipPt(tipIdx)), []);
  const coveredCount = covers.filter(Boolean).length;

  const connectScore = scoreStarConnect(seq);
  const pasteScore = scoreDenPaste(coveredCount);
  const total = scoreDenOngSao(seq, coveredCount);

  useEffect(() => {
    onProgress(phase === 'connect' ? connectScore : total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectScore, total, phase, pasteScore]);

  const allConnected = seq.length >= STAR_TIPS;
  useEffect(() => {
    if (phase === 'connect' && allConnected) setPhase('paste');
  }, [phase, allConnected]);

  const allPasted = coveredCount >= DEN_SECTIONS;
  useEffect(() => {
    if (phase === 'paste' && allPasted) onFinish(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, allPasted, total]);

  const tapTip = (idx: number) => {
    if (seq.includes(idx)) return;
    setSeq((s) => (s.length >= STAR_TIPS ? s : [...s, idx]));
  };

  const markPasted = (i: number) => {
    setCovers((c) => (c[i] ? c : c.map((v, k) => (k === i ? true : v))));
  };

  const edges = connectEdges(seq);

  return (
    <div className="denong">
      <p className="minitap-hint">
        {phase === 'connect' ? (
          <>
            Nối 5 nan theo đúng thứ tự để thành <b>ngôi sao một nét</b> — đã nối{' '}
            <b>{Math.min(STAR_TIPS, seq.length)}/5</b>.
          </>
        ) : (
          <>
            Dán giấy màu vào <b>5 cánh + tâm</b> — đã dán <b>{coveredCount}/6</b>.
          </>
        )}
      </p>

      {phase === 'connect' ? (
        <>
          <svg className="denong-star" viewBox="0 0 120 120" role="img" aria-label="Khung đèn ông sao">
            {seq.length >= 2 &&
              edges.map((e, k) => {
                const [a, b] = e.split('-').map(Number);
                const p1 = tipsByIndex[a];
                const p2 = tipsByIndex[b];
                return (
                  <line
                    key={`${e}-${k}`}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    className={`denong-edge ${STAR_EDGES.has(e) ? 'ok' : ''}`}
                  />
                );
              })}
            {STAR_TIP_ORDER.map((tipIdx) => {
              const isTapped = seq.includes(tipIdx);
              return (
                <circle
                  key={tipIdx}
                  cx={tipsByIndex[tipIdx].x} cy={tipsByIndex[tipIdx].y} r={6}
                  className={`denong-tip ${isTapped ? 'tapped' : ''}`}
                  onClick={() => tapTip(tipIdx)}
                >
                  <title>Nan {tipIdx + 1}</title>
                </circle>
              );
            })}
          </svg>
        </>
      ) : (
        <div className="denong-paste">
          {/* 5 cánh xếp quanh + tâm ở giữa */}
          {STAR_TIP_ORDER.map((_, i) => (
            <PastePanel
              key={`canh_${i}`}
              label={`Cánh ${i + 1}`}
              pasted={covers[i]}
              position={(i % 5) as 0 | 1 | 2 | 3 | 4}
              onTap={() => markPasted(i)}
            />
          ))}
          <PastePanel key="tam" label="Tâm" pasted={covers[5]} position="center" onTap={() => markPasted(5)} />
        </div>
      )}

      <p className="minitap-count">
        {phase === 'connect' ? (
          <>Nối đúng {starCorrectEdges(seq)}/5 cạnh · {connectScore}/100</>
        ) : (
          <>
            Dán {coveredCount}/6 · {total}/100
          </>
        )}
      </p>
    </div>
  );
}

function PastePanel({
  label, pasted, position, onTap,
}: { label: string; pasted: boolean; position: 0 | 1 | 2 | 3 | 4 | 'center'; onTap: () => void }) {
  return (
    <button
      className={`denong-sheet ${pasted ? 'pasted' : ''} pos-${position}`}
      onClick={onTap}
      title={label}
    >
      <span className="denong-sheet-icon">{pasted ? '🟥' : '🍃'}</span>
      <span className="denong-sheet-name">{label}</span>
    </button>
  );
}
