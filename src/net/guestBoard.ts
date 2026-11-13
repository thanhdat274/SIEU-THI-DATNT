/**
 * Bảng xếp hạng cho người CHƯA đăng nhập — cùng bảng với người đăng nhập (server ghi vào chung `week_scores`).
 * Điểm tính từ chỉ số trong ván lưu ở máy rồi gửi lên; server tự kẹp trần nên khách không bơm quá 100 điểm.
 */
import { installId } from '../core/dayReport';
import { readLocalSave } from '../core/save';
import { weekParts } from '../data/socialWeek';
import { loadPlayerName } from '../data/playerName';
import { apiUrl } from './serverUrl';
import type { AlleyBoardRes, BoardRes } from './socialApi';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new Error('Không kết nối được máy chủ xếp hạng.'); }
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `Lỗi ${res.status}`);
  return j as T;
}

/** Gửi điểm tuần của ván trong máy (nếu có). Không có ván thì bỏ qua, không phải lỗi. */
export async function submitGuestScore(): Promise<void> {
  const l = readLocalSave();
  if (!l) return;
  const d = l.data as unknown as {
    level: number; shopName?: string; history?: { customers?: number; unhappy?: number }[];
    biz?: { cleanBest?: number; lifeEventsDone?: unknown[] }; ordersDone?: number;
  };
  const recent = (d.history ?? []).slice(-7);
  const customers = recent.reduce((n, r) => n + (r.customers ?? 0), 0);
  const happy = recent.reduce((n, r) => n + ((r.customers ?? 0) - (r.unhappy ?? 0)), 0);
  const wp = weekParts({ cleanBest: d.biz?.cleanBest ?? 0, happy, customers, ordersRecent: d.ordersDone ?? 0, lifeDone: d.biz?.lifeEventsDone?.length ?? 0 });
  await call('POST', '/guest/score', { install: installId(), name: loadPlayerName() || d.shopName || '', level: d.level, parts: wp.parts });
}

export const getGuestBoard = (level: number) =>
  call<BoardRes>('GET', `/guest/board?install=${encodeURIComponent(installId())}&level=${level}`);

export const localLevel = (): number => readLocalSave()?.data.level ?? 1;

/** Bảng co-op (hẻm) công khai: xem được cả khi chưa đăng nhập. */
export const getPublicAlleyBoard = (level: number) => call<AlleyBoardRes>('GET', `/guest/board/alleys?level=${level}`);
