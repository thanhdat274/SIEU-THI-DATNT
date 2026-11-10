import { dayOfYear, festivalOn } from '../../data/calendar';
import { RECIPE_MAP } from '../../data/recipes';
import { miniDefById, miniInFestival, miniTargetRecipe, miniUnlocked, type MiniMode } from '../../data/festivalMini';
import type { GameState, GetState, SetState } from '../gameTypes';

/**
 * Hệ 7 — Trò khéo tay dịp lễ (SPEC-CHIEU-RONG §7). Slice chứa hành động người chơi ghi điểm
 * khi chơi xong một trò: `scoreFestivalMini(id, score, mode)`.
 *
 * Luật (spec §7.3):
 *   - Thưởng 1 lần MỖI NGÀY LỄ (R7) — chơi lại cho vui không thưởng thêm;
 *   - điểm 0–100 do client tính, action kẹp lại 0–100 rồi tra bảng thưởng (người sửa điểm cũng
 *     chỉ hoà tối đa phần thưởng vốn nhỏ);
 *   - thưởng SỐ LƯỢNG cộng vào mẻ KẾ TIẾP của công thức trong ngày (`biz.miniBonus`, startCook/clock
 *     đọc và xoá); thưởng ĐIỂM TRANG TRÍ cộng vào `biz.festivalFlair` (đọc ở chuỗi decorScoreOf, L4);
 *   - luôn bỏ qua được (không gọi action này là hết).
 * Co-op: một trò là một chỗ chung — GUARDED khoá `mini:${id}`.
 */
export const createMiniSlice = (set: SetState, get: GetState): Pick<GameState, 'scoreFestivalMini'> => ({
  scoreFestivalMini: (id: string, score: number, mode: MiniMode) => {
    const s = get();
    const def = miniDefById(id);
    const fest = festivalOn(s.day);
    if (!def) return;
    if (miniUnlocked(def, s.level) === false) return s.notify(`${def.icon} Trò "${def.name}" mở từ cấp ${def.unlock}.`);
    if (def.id !== 'tap_test' && !miniInFestival(def, fest?.id)) {
      return s.notify(`${def.icon} Trò "${def.name}" chỉ chơi được đúng dịp lễ của nó.`);
    }
    if ((s.biz.miniPlayed ?? {})[id] === s.day) {
      return s.notify(`${def.icon} Hôm nay đã nhận thưởng trò "${def.name}" rồi — chơi lại cho vui, không thưởng thêm nhé.`);
    }

    const sc = Math.max(0, Math.min(100, Math.round(score)));
    const r = def.reward(sc, mode);
    const b = s.biz;

    // Thưởng số lượng → mẻ kế tiếp của công thức (giỏ quà chọn công thức theo dịp).
    const recipeId = miniTargetRecipe(def, fest?.id);
    let miniBonus = b.miniBonus ?? {};
    if (r.bonusQty && recipeId) {
      miniBonus = { ...miniBonus, [recipeId]: (miniBonus[recipeId] ?? 0) + r.bonusQty };
    }

    // Thưởng điểm trang trí → tới hết dịp (mâm ngũ quả / đèn ông sao).
    const t = def.target;
    let festivalFlair = b.festivalFlair ?? [];
    if (r.flair && t.kind === 'decor' && fest) {
      const until = s.day + (fest.to - dayOfYear(s.day)); // ngày hết dịp (fest.to là ngày-trong-năm)
      festivalFlair = [
        ...festivalFlair.filter((f) => f.furniture !== t.furniture || f.until < s.day),
        { furniture: t.furniture, bonus: r.flair, until },
      ];
    }

    set({
      biz: {
        ...b,
        miniPlayed: { ...(b.miniPlayed ?? {}), [id]: s.day },
        miniBonus,
        festivalFlair,
      },
    });
    if (r.xp > 0) s.addXp(r.xp);

    let msg = `${def.icon} Khéo tay "${def.name}" đạt ${sc}/100`;
    if (r.bonusQty && recipeId) msg += ` → mẻ ${RECIPE_MAP[recipeId]?.name ?? ''} hôm nay +${r.bonusQty}`;
    else if (r.flair && def.target.kind === 'decor') msg += ` → điểm trang trí +${r.flair} tới hết dịp`;
    s.notify(msg + (r.xp > 0 ? ` · +${r.xp} XP` : ''));
  },
});
