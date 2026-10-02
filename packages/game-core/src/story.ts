import type { StoryState } from '@game/shared';
import { STORY_CHAPTERS, STORY_CHAPTER_MAP, type StoryChapterDef, type StoryObjective } from '@game/data';

/** Chỉ số mô phỏng mà điều kiện chương cần; sao chép từ trạng thái, không giữ tham chiếu. */
export interface StoryContext {
  day: number;
  level: number;
  totalCustomersServed: number;
  totalRevenue: number;
  staffCount: number;
  reputation: number;
  regularsCount: number;
  /** Tổng suất bán ra ở các quầy ăn uống từ đầu game. */
  stallServings: number;
}

export type StoryChapterStatus = 'locked' | 'available' | 'started' | 'completed' | 'claimed';

export interface StoryChapterProgress {
  chapterId: string;
  status: StoryChapterStatus;
  current: number;
  target: number;
  /** Chương siêu thị đối diện: ngày cuối của đợt cạnh tranh; chỉ có khi đã bắt đầu. */
  rivalEndsDay?: number;
}

export function createInitialStoryState(): StoryState {
  return { startedChapters: {}, claimedChapters: [] };
}

/** Dựng lại từ dữ liệu lưu: bỏ chương không còn tồn tại, ép kiểu an toàn. */
export function normalizeStoryState(state: StoryState | undefined): StoryState {
  const started: Record<string, number> = {};
  for (const [id, day] of Object.entries(state?.startedChapters ?? {})) {
    if (STORY_CHAPTER_MAP[id] && Number.isFinite(day) && day >= 1) started[id] = Math.floor(day);
  }
  const claimed = [...new Set((state?.claimedChapters ?? []).filter(id => !!STORY_CHAPTER_MAP[id]))];
  for (const id of claimed) started[id] ??= 1;
  return { startedChapters: started, claimedChapters: claimed };
}

/** Chương mở khi đủ level và chương trước đã nhận thưởng; chương đã bắt đầu thì luôn tiếp tục được. */
export function chapterUnlocked(state: StoryState, def: StoryChapterDef, level: number): boolean {
  if (state.startedChapters[def.id] !== undefined) return true;
  if (level < def.unlockLevel) return false;
  const index = STORY_CHAPTERS.findIndex(item => item.id === def.id);
  return index <= 0 || state.claimedChapters.includes(STORY_CHAPTERS[index - 1].id);
}

function measure(objective: StoryObjective, ctx: StoryContext, startedDay: number, rivalDays?: number): { current: number; target: number; met: boolean } {
  switch (objective.kind) {
    case 'customersServed': return { current: Math.min(ctx.totalCustomersServed, objective.target), target: objective.target, met: ctx.totalCustomersServed >= objective.target };
    case 'level': return { current: Math.min(ctx.level, objective.target), target: objective.target, met: ctx.level >= objective.target };
    case 'totalRevenue': return { current: Math.min(ctx.totalRevenue, objective.target), target: objective.target, met: ctx.totalRevenue >= objective.target };
    case 'stallServings': return { current: Math.min(ctx.stallServings, objective.target), target: objective.target, met: ctx.stallServings >= objective.target };
    case 'levelAndStaff': {
      const met = ctx.level >= objective.level && ctx.staffCount >= objective.staff;
      return { current: (ctx.level >= objective.level ? 1 : 0) + (ctx.staffCount >= objective.staff ? 1 : 0), target: 2, met };
    }
    case 'rival': {
      const endsDay = startedDay + (rivalDays ?? 1) - 1;
      const finished = ctx.day > endsDay;
      const met = finished && ctx.reputation >= objective.reputation && ctx.regularsCount >= objective.regulars;
      return { current: Math.min(ctx.regularsCount, objective.regulars), target: objective.regulars, met };
    }
  }
}

export function getChapterProgress(state: StoryState, def: StoryChapterDef, ctx: StoryContext): StoryChapterProgress {
  const startedDay = state.startedChapters[def.id];
  const m = measure(def.objective, ctx, startedDay ?? ctx.day, def.rivalDays);
  const rivalEndsDay = def.rivalDays && startedDay !== undefined ? startedDay + def.rivalDays - 1 : undefined;
  let status: StoryChapterStatus;
  if (state.claimedChapters.includes(def.id)) status = 'claimed';
  else if (startedDay === undefined) status = chapterUnlocked(state, def, ctx.level) ? 'available' : 'locked';
  else status = m.met ? 'completed' : 'started';
  return { chapterId: def.id, status, current: m.current, target: m.target, ...(rivalEndsDay !== undefined ? { rivalEndsDay } : {}) };
}

export function getStoryProgressList(state: StoryState, ctx: StoryContext): StoryChapterProgress[] {
  return STORY_CHAPTERS.map(def => getChapterProgress(state, def, ctx));
}

export type BeginChapterResult = { success: true; rivalDays?: number } | { success: false; reason: string };

/** Bắt đầu chương; chương siêu thị đối diện trả `rivalDays` để mô phỏng kích hoạt sự kiện tương ứng. */
export function beginChapter(state: StoryState, chapterId: string, ctx: StoryContext): BeginChapterResult {
  const def = STORY_CHAPTER_MAP[chapterId];
  if (!def) return { success: false, reason: 'Chương không tồn tại.' };
  if (state.claimedChapters.includes(chapterId) || state.startedChapters[chapterId] !== undefined) return { success: false, reason: 'Chương đã bắt đầu.' };
  if (!chapterUnlocked(state, def, ctx.level)) return { success: false, reason: 'Chương chưa mở.' };
  state.startedChapters[chapterId] = ctx.day;
  return { success: true, ...(def.rivalDays ? { rivalDays: def.rivalDays } : {}) };
}

export type ClaimChapterResult = { success: true; reward: { money: number; experience: number } } | { success: false; reason: string };

export function claimChapter(state: StoryState, chapterId: string, ctx: StoryContext): ClaimChapterResult {
  const def = STORY_CHAPTER_MAP[chapterId];
  if (!def) return { success: false, reason: 'Chương không tồn tại.' };
  if (state.claimedChapters.includes(chapterId)) return { success: false, reason: 'Đã nhận thưởng chương này.' };
  if (getChapterProgress(state, def, ctx).status !== 'completed') return { success: false, reason: 'Chương chưa hoàn thành.' };
  state.claimedChapters.push(chapterId);
  return { success: true, reward: { money: def.rewardMoney, experience: def.rewardExp } };
}
