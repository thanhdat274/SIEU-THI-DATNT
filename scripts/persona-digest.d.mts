// Khai báo kiểu tối thiểu cho scripts/persona-digest.mjs (commit trước kèm test nhưng thiếu .d.mts
// làm npx tsc --noEmit đỏ — sửa cổng duyệt, không đổi logic).
export function latestGd(text: string): number | null;
export function recentMilestones(text: string, limit?: number): { gd: number; line: string }[];
export function hardRules(text: string): string[];
export function budgetsTable(text: string): string[][];
export function vision(text: string): string;
export interface GameDigest {
  gameName: string;
  generatedAt: string;
  currentGd: number | null;
  recentMilestones: { gd: number; line: string }[];
  vision: string;
  hardRules: string[];
  budgets: string[][];
}
export function buildDigest(args: { progress: string; prompt: string }): GameDigest;
export function digestFromDisk(): GameDigest | null;
