import { miniPick } from '../ui/minigames/seeded';

/**
 * Hệ 7 — trò ⑦ Xếp két lên xe đẩy (SPEC §7.6, Giải bóng đá phường). THUẦN, test được.
 * Chuỗi két xuất hiện lần lượt; bấm đúng ô xe đẩy (bia / nước suối / nước tăng lực). Đúng +1, sai 0.
 */
export interface KetKind { id: 'bia' | 'nuoc' | 'tangluc'; name: string; icon: string }
export const KET_KINDS: KetKind[] = [
  { id: 'bia', name: 'Bia', icon: '🍺' },
  { id: 'nuoc', name: 'Nước suối', icon: '💧' },
  { id: 'tangluc', name: 'Tăng lực', icon: '⚡' },
];
export const KET_COUNT = 10;

/** Dãy loại két của ván — tất định theo seed. */
export function ketSequence(seed: number): KetKind['id'][] {
  const out: KetKind['id'][] = [];
  for (let i = 0; i < KET_COUNT; i++) out.push(miniPick(seed, i, 5, KET_KINDS).id);
  return out;
}

/** Điểm 0–100 từ số két xếp đúng (kẹp). */
export function scoreXepKet(correct: number): number {
  return Math.max(0, Math.min(100, Math.round((Math.max(0, correct) / KET_COUNT) * 100)));
}
