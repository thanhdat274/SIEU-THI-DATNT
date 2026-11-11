import { crisisDefById } from '../../data/crisis';
import { formatMoney } from '../../data/products';
import type { GameState, GetState, SetState } from '../gameTypes';

/**
 * Hệ 8 — Biến cố dài (§SPEC-CHIEU-RONG §8). Slice chứa các hành động NGƯỜI CHƠI chủ động:
 * chuẩn bị (`doCrisisPrep`), chọn cảnh (`chooseCrisisScene`). Việc mở/đóng đợt mỗi đêm do
 * `crisisNight` (data/crisis.ts, THUẦN) gọi từ endDay; slice này chỉ ghi tiêu tiền + preps/choices.
 * Cấp mở ≥ 36, autoplay không tự bấm → golden L30 không đổi (R1).
 */
export const createCrisisSlice = (set: SetState, get: GetState): Pick<GameState, 'doCrisisPrep' | 'chooseCrisisScene' | 'setCalmYears'> => ({
  doCrisisPrep: (prepId: string) => {
    const s = get();
    const st = s.biz.crisis;
    const def = st ? crisisDefById(st.defId) : undefined;
    // Yêu cầu phải có state mở (đợt chính thức đã bắt đầu qua crisisNight) + prep thuộc def.
    if (!st || !def) return;
    const prep = def.preps.find((p) => p.id === prepId);
    if (!prep) return;
    if (st.preps.includes(prep.id)) return; // đã làm
    if (s.money < prep.cost) return s.notify(`${def.icon} Không đủ tiền chuẩn bị "${prep.label}" (${formatMoney(prep.cost)})!`);
    set({
      biz: {
        ...s.biz,
        crisis: { ...st, preps: [...st.preps, prep.id] },
      },
      money: s.money - prep.cost,
      stats: { ...s.stats, spent: s.stats.spent + prep.cost },
      totals: { ...s.totals, spent: s.totals.spent + prep.cost },
    });
    s.notify(`${def.icon} Đã chuẩn bị: ${prep.label} (${formatMoney(prep.cost)}) — ${prep.effect}`);
  },
  chooseCrisisScene: (dayIndex: number, option: number, warm: boolean) => {
    const s = get();
    const st = s.biz.crisis;
    const def = st ? crisisDefById(st.defId) : undefined;
    if (!st || !def) return;
    const scene = def.scenes.find((c) => c.atDay === dayIndex);
    if (!scene) return;
    if (st.choices[dayIndex] !== undefined) return; // đã chọn cảnh này
    set({
      biz: { ...s.biz, crisis: { ...st, choices: { ...st.choices, [dayIndex]: option }, kind: st.kind + (warm ? 1 : 0) } },
    });
    s.notify(`${def.icon} ${scene.options[option] ?? 'Đã chọn.'}`);
  },
  setCalmYears: (on: boolean) => {
    const s = get();
    if ((s.biz.calmYears ?? false) === on) return;
    set({ biz: { ...s.biz, calmYears: on } });
    s.notify(on
      ? '🌿 Bật Năm yên ả: tạm ngừng biến cố dài — nhưng sẽ không nhận huy hiệu vượt khó.'
      : '🪧 Tắt Năm yên ả: biến cố dài trở lại theo mùa như thật.');
  },
});
