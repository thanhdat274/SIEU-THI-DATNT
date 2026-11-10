// ============================================================================
// Data: SỔ VIỆC CHUNG (SPEC-TOI-UU §T6)
// ----------------------------------------------------------------------------
// Trước đây có ba cơ chế "việc tiếp theo là gì" không biết về nhau: việc sáng (dayPlan),
// dải Kế hoạch hôm nay (todayAgenda) và chip giờ vắng (idle). Mỗi hệ mới phải sửa thẳng
// MorningPanel.tsx / todayAgenda.ts / HudAgenda.tsx — ba file nhiều phiên cùng đụng.
//
// File này là MỘT danh sách việc, nhiều nguồn. QUY ƯỚC (ghi trong CLAUDE.md):
//   hệ mới muốn nhắc việc → gọi `registerTodo('<tên hệ>', nguồn)` TRONG FILE DATA CỦA HỆ ĐÓ,
//   KHÔNG sửa MorningPanel.tsx / todayAgenda.ts / HudAgenda.tsx.
// Ba bề mặt cũ chỉ còn là ba cách nhìn của cùng danh sách:
//   - dải HUD        = `timedTodos`   (việc có giờ hẹn `at`)
//   - chip giờ vắng  = `idleTodo`     (việc `idle` đầu tiên)
//   - Sổ đầu ngày    = `morningTodos` (việc đánh dấu `morning`, vào thẻ "Việc hôm nay")
// THUẦN ĐỌC: không đổi state, không RNG, không đụng save/coopGuard.
// ============================================================================

import type { GameState } from '../core/gameTypes';

/** now = đang mất tiền / sắp lỡ trong 60 phút · today = phải xong trước khi ngủ · idle = nên làm khi rảnh. */
export type TodoUrgency = 'now' | 'today' | 'idle';

export interface TodoItem {
  /** Ổn định qua các lần gọi (dùng làm key React và khử trùng). */
  id: string;
  /** Tên nguồn — `todos()` tự điền theo tên đăng ký. */
  source?: string;
  icon: string;
  text: string;
  urgency: TodoUrgency;
  /** Mốc hẹn / hết hiệu lực (phút trong ngày). Có `at` thì lên dải HUD; qua `until` thì bị lọc. */
  at?: number;
  until?: number;
  /** Ước tiền được/mất — xếp trong cùng mức gấp. */
  value?: number;
  /** Hiện trong thẻ "Việc hôm nay" của Sổ đầu ngày. */
  morning?: boolean;
  /** Bấm thì đi đâu. Không có = chỉ để đọc. */
  go?: { panel: string; focus?: string } | { act: 'mop' };
}

export type TodoSource = (s: GameState, minutes: number) => TodoItem[];

/** Bảng nguồn việc. Chỉ ghi qua `registerTodo`. */
export const TODO_SOURCES: Record<string, TodoSource> = {};

/** Mỗi hệ gọi MỘT lần ở mức module trong file data của mình. Đăng ký lại cùng tên = thay thế. */
export function registerTodo(name: string, source: TodoSource): void {
  TODO_SOURCES[name] = source;
}

const RANK: Record<TodoUrgency, number> = { now: 0, today: 1, idle: 2 };

/** Mức gấp của một việc có giờ: còn ≤ 60 phút tới mốc (hoặc đang trong khung) là `now`. */
export const urgencyAt = (minutes: number, at: number): TodoUrgency => (minutes >= at - 60 ? 'now' : 'today');

/** Gộp mọi nguồn: lọc việc đã qua giờ, khử trùng theo id, xếp theo mức gấp → hạn sớm → tiền lớn. */
export function todos(s: GameState, minutes: number): TodoItem[] {
  const seen = new Set<string>();
  const all: TodoItem[] = [];
  for (const name of Object.keys(TODO_SOURCES).sort()) {
    for (const it of TODO_SOURCES[name](s, minutes)) {
      if (seen.has(it.id)) continue;
      if (it.until !== undefined && minutes >= it.until) continue;
      seen.add(it.id);
      all.push({ ...it, source: name });
    }
  }
  return all.sort((a, b) =>
    RANK[a.urgency] - RANK[b.urgency]
    || (a.until ?? Infinity) - (b.until ?? Infinity)
    || (b.value ?? 0) - (a.value ?? 0)
    || (a.at ?? Infinity) - (b.at ?? Infinity)
    || a.id.localeCompare(b.id));
}

/** Dải HUD "Kế hoạch hôm nay": việc có giờ hẹn, tăng dần theo giờ (đúng thứ tự dải cũ GĐ162). */
export const timedTodos = (list: TodoItem[]): TodoItem[] =>
  list.filter((it) => it.at !== undefined).sort((a, b) => a.at! - b.at! || a.id.localeCompare(b.id));

/** Chip giờ vắng: việc `idle` đứng đầu. */
export const idleTodo = (list: TodoItem[]): TodoItem | undefined => list.find((it) => it.urgency === 'idle');

/** Sổ đầu ngày: việc các hệ muốn đưa vào thẻ "Việc hôm nay". */
export const morningTodos = (list: TodoItem[]): TodoItem[] => list.filter((it) => it.morning);
