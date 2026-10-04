import { DIALOGUE_TOPICS, type DialoguePhase, type DialoguePlace, type DialogueWeather, type NeighborNpcType } from '@game/data';

export type ChatPlace = DialoguePlace;

export interface ChatContext {
  phase: DialoguePhase;
  weather: DialogueWeather;
  place: ChatPlace;
  typeA: NeighborNpcType;
  typeB: NeighborNpcType;
}

const FALLBACK: readonly string[] = ['Chào bạn!', 'Chào bạn nhé.'];

/** Số điều kiện cụ thể mà chủ đề khớp với ngữ cảnh; -1 nếu có điều kiện không khớp (loại). */
export function topicScore(topic: (typeof DIALOGUE_TOPICS)[number], ctx: ChatContext): number {
  let score = 0;
  if (topic.phases) { if (!topic.phases.includes(ctx.phase)) return -1; score++; }
  if (topic.weather) { if (!topic.weather.includes(ctx.weather)) return -1; score++; }
  if (topic.places) { if (!topic.places.includes(ctx.place)) return -1; score++; }
  if (topic.types) { if (!topic.types.includes(ctx.typeA) && !topic.types.includes(ctx.typeB)) return -1; score++; }
  return score;
}

/**
 * Chọn đoạn hội thoại theo ngữ cảnh (thời tiết, buổi, nơi, loại NPC). Chủ đề khớp nhiều điều kiện hơn nặng ký hơn nhiều
 * (mưa to thì gần như luôn nói chuyện mưa); `rand` trả [0,1) để kiểm thử xác định.
 */
export function pickConversation(ctx: ChatContext, rand: () => number): readonly string[] {
  const pool: Array<{ lines: readonly string[]; weight: number }> = [];
  for (const topic of DIALOGUE_TOPICS) {
    const score = topicScore(topic, ctx);
    if (score < 0) continue;
    const weight = (score + 1) ** 3 * (topic.boost ?? 1);
    for (const lines of topic.lines) pool.push({ lines, weight: weight / topic.lines.length });
  }
  const total = pool.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return FALLBACK;
  let pick = rand() * total;
  for (const p of pool) { pick -= p.weight; if (pick <= 0) return p.lines; }
  return pool[pool.length - 1].lines;
}
