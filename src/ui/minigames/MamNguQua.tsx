import { useEffect, useMemo, useState } from 'react';
import {
  MAM_CORRECT_COUNT, mamFruitBig, mamFruitById, type MamPlace, mamRegionName, pickMamDeck,
  scoreMamChoice, scoreMamNguQua,
} from '../../data/mamNguQua';
import type { MiniGameProps } from './MiniHostView';

/**
 * Hệ 7-L4 — trò ③ Bày mâm ngũ quả (SPEC-CHIEU-RONG §7.5).
 *
 * Hai bước theo đúng cách bày thật: (1) chọn đúng 5 loại quả của vùng (Bắc/Nam — "cầu dừa đủ xài")
 * trong 8 loại bày ra; (2) xếp lên mâm cho cân — quả to làm đế (hàng dưới), quả nhỏ chèn quanh.
 * Điểm 0–100 = 70 (chọn đúng) + 30 (xếp quả to xuống đế). Đề tất định theo seed (R4).
 */
type Slot = { id: string; base: boolean };

/** Mâm có 5 chỗ: 2 ở hàng đế (cho quả to) + 3 ở hàng trên (quả nhỏ). */
const SLOTS: Slot[] = [
  { id: 'base_0', base: true },
  { id: 'base_1', base: true },
  { id: 'top_0', base: false },
  { id: 'top_1', base: false },
  { id: 'top_2', base: false },
];

type Phase = 'choose' | 'arrange';

export function MamNguQua({ seed, onFinish, onProgress }: MiniGameProps) {
  const deck = useMemo(() => pickMamDeck(seed), [seed]);
  const [phase, setPhase] = useState<Phase>('choose');
  const [selected, setSelected] = useState<string[]>([]);
  const [occupied, setOccupied] = useState<Record<string, string>>({}); // slotId → fruitId
  const [inHand, setInHand] = useState<string | null>(null);

  const chosenCount = selected.length;
  const choiceScore = scoreMamChoice(selected, deck.correct);

  // Điểm đang có (sống): chọn đúng + phần xếp đã đặt.
  const placements: MamPlace[] = Object.entries(occupied).map(([slotId, fruitId]) => ({
    fruitId,
    base: SLOTS.find((s) => s.id === slotId)?.base ?? false,
  }));
  const totalScore = scoreMamNguQua(selected, deck.correct, placements);

  useEffect(() => {
    onProgress(phase === 'arrange' ? totalScore : choiceScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choiceScore, totalScore, phase]);

  const allPlaced = Object.keys(occupied).length === SLOTS.length;
  useEffect(() => {
    if (phase === 'arrange' && allPlaced) onFinish(totalScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, allPlaced]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected((s) => s.filter((x) => x !== id));
      return;
    }
    if (selected.length >= MAM_CORRECT_COUNT) return; // đủ 5 rồi, phải bỏ một loại trước
    setSelected((s) => [...s, id]);
  };

  const place = (slotId: string) => {
    if (!inHand || occupied[slotId]) return;
    setOccupied((o) => ({ ...o, [slotId]: inHand }));
    setInHand(null);
  };

  const unfilledSlots = SLOTS.filter((s) => !occupied[s.id]);

  return (
    <div className="mamnguqua">
      <p className="minitap-hint">
        {phase === 'choose' ? (
          <>
            <b>{mamRegionName(deck.region)}.</b> Chọn đúng 5 loại quả của miền đó trong 8 loại —
            đã chọn <b>{chosenCount}/5</b>.
          </>
        ) : (
          <>
            Xếp quả <b>to làm đế</b> (hàng dưới), quả nhỏ chèn trên cho cân.
          </>
        )}
      </p>

      {phase === 'choose' ? (
        <>
          <div className="mamnguqua-tray">
            {deck.shown.map((f) => {
              const isSel = selected.includes(f.id);
              return (
                <button
                  key={f.id}
                  className={`mamnguqua-fruit ${isSel ? 'sel' : ''}`}
                  onClick={() => toggle(f.id)}
                  title={f.name}
                >
                  <span className="mamnguqua-fruit-icon">{f.icon}</span>
                  <span className="mamnguqua-fruit-name">{f.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mini-foot">
            <button
              className="mini-btn primary"
              disabled={chosenCount !== MAM_CORRECT_COUNT}
              onClick={() => setPhase('arrange')}
            >
              Bày mâm ({chosenCount}/5)
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mamnguqua-man">
            {/* Hàng trên — quả nhỏ */}
            <div className="mamnguqua-row top">
              {SLOTS.filter((s) => !s.base).map((s) => (
                <SlotButton key={s.id} slot={s} occupied={occupied[s.id]} inHand={inHand} onTap={place} />
              ))}
            </div>
            {/* Hàng đế — quả to */}
            <div className="mamnguqua-row base">
              {SLOTS.filter((s) => s.base).map((s) => (
                <SlotButton key={s.id} slot={s} occupied={occupied[s.id]} inHand={inHand} onTap={place} />
              ))}
            </div>
          </div>
          <div className="mamnguqua-tray">
            {selected.map((id) => {
              const f = mamFruitById(id);
              if (!f) return null;
              const used = Object.values(occupied).includes(id);
              return (
                <button
                  key={id}
                  className={`mamnguqua-fruit ${inHand === id ? 'hand' : ''} ${used ? 'used' : ''}`}
                  onClick={() => { if (!used) setInHand(id); }}
                  title={f.name}
                >
                  <span className="mamnguqua-fruit-icon">{f.icon}</span>
                  <span className="mamnguqua-fruit-name">{f.name}</span>
                </button>
              );
            })}
          </div>
          {!allPlaced && (
            <p className="minitap-count">
              Còn {unfilledSlots.length} chỗ — {inHand ? 'chọn 1 chỗ trên mâm để đặt' : 'chọn 1 quả rồi chọn chỗ'}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SlotButton({
  slot, occupied, inHand, onTap,
}: { slot: Slot; occupied: string | undefined; inHand: string | null; onTap: (slotId: string) => void }) {
  const fruit = occupied ? mamFruitById(occupied) : undefined;
  // Tô viền chỗ đế khi tay đang cầm quả to — gợi ý đặt đúng.
  const hint = inHand && mamFruitBig(inHand) ? (slot.base ? 'hint' : '') : '';
  return (
    <button
      className={`mamnguqua-slot ${slot.base ? 'base' : ''} ${occupied ? 'filled' : ''} ${hint}`}
      onClick={() => onTap(slot.id)}
      disabled={!!occupied}
      title={fruit?.name ?? (slot.base ? 'Đế (quả to)' : 'Trên (quả nhỏ)')}
    >
      {fruit ? fruit.icon : ''}
    </button>
  );
}
