/**
 * Online không đồng bộ — Hệ 6 (SPEC-CHIEU-RONG §6.5). Client API, mô hình theo alleyApi.ts: fetch có
 * token Firebase, gọi thẳng các route trong server/social.ts. Mọi hàm đều requires đăng nhập; chưa
 * đăng nhập thì throw để panel báo lời mời. Module NHẸ: chỉ chứa fetch, không kéo UI.
 */
import { idToken } from './firebase';
import { apiUrl } from './serverUrl';

async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: object): Promise<T> {
  const token = await idToken();
  if (!token) throw new Error('Cần đăng nhập Google để chơi cộng đồng (bạn bè, chợ, thi đua, hội chợ).');
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api${path}`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Không kết nối được server. Kiểm tra "npm run server" đang chạy.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Server trả lỗi ${res.status}`);
  return json as T;
}

/* ── Danh thiếp tiệm (§6.4a) ── */
export interface PublicCard {
  uid: string; code: string;
  shopName: string; ownerName: string;
  level: number; day: number; shopTier: number;
  titles: string[]; stance?: string; brandName?: string; alleyBond?: number;
  topDishes: { id: string; stars: number }[];
  layout: { type: string; x: number; z: number; rot: number }[];
}
export const putCard = (body: object) => api<{ ok: true; code: string }>('PUT', '/card', body);
export const deleteCard = () => api<{ ok: true }>('DELETE', '/card');
export const getCardByCode = (code: string) => api<PublicCard>('GET', `/card/${encodeURIComponent(code)}`);

/* ── Bạn bè bằng mã (§6.4a/b) ── */
export interface FriendRow { uid: string; shopName?: string; ownerName?: string; level?: number; code?: string; closed?: boolean }
export const addFriend = (code: string) => api<{ ok: true; code: string; already?: boolean }>('POST', `/friends/${encodeURIComponent(code)}`);
export const removeFriend = (uid: string) => api<{ ok: true }>('DELETE', `/friends/${encodeURIComponent(uid)}`);
export const listFriends = () => api<{ friends: FriendRow[] }>('GET', '/friends');

/* ── Thư + lẵng hoa + lời khen (§6.4b) ── */
export interface InboxItem { id: string; kind: string; from: string; payload: { lotId?: string; productId?: string; qty?: number; unit?: number; money?: number } | null; createdAt: number }
export const gift = (uid: string, kind: 'flower' | 'praise', payload?: object) => api<{ ok: true }>('POST', `/gift/${encodeURIComponent(uid)}`, { kind, payload });
export const listInbox = () => api<{ items: InboxItem[] }>('GET', '/inbox');
export const claimInbox = (ids: string[]) => api<{ ok: true; claimed: number }>('POST', '/inbox/claim', { ids });

/* ── Chợ liên hẻm (§6.4c) ── */
export interface MarketLot { id: string; seller: string; productId: string; qty: number; unit: number; price: number; band: string; createdAt: number }
export const getMarket = (level: number) => api<{ mine: MarketLot[]; fromFriends: MarketLot[]; others: MarketLot[] }>('GET', `/market?level=${level}`);
export const postMarket = (body: { productId: string; qty: number; unit: number; level: number; suggestPrice: number }) =>
  api<{ ok: true; id: string }>('POST', '/market', body);
export const buyMarket = (id: string, level: number) => api<{ ok: true; money: number }>('POST', `/market/${encodeURIComponent(id)}/buy`, { level });

/* ── Thi đua tuần + bảng xếp hạng (§6.4d/e/f) ── */
export interface ScoreRow { uid: string; band: string; score: number; flagged?: boolean }
export interface WeekRes { week: string; band: string; group: string; mine: ScoreRow | null; cohort: ScoreRow[] }
export const postWeekScore = (level: number, parts: Record<string, number>) =>
  api<{ ok: true; week: string; band: string; group: string; score: number }>('POST', '/week/score', { level, parts });
export const getWeek = (level: number) => api<WeekRes>('GET', `/week?level=${level}`);

export interface BoardRes {
  scope: string; band: string; period: string;
  top: { rank: number; uid: string; name?: string; score: number; flagged?: boolean }[];
  self: { rank: number; score: number; percent: number } | null; total: number;
}
export const getBoard = (opts: { scope?: string; band?: string; period?: string; level?: number }) =>
  api<BoardRes>('GET', `/board?scope=${opts.scope ?? 'friends'}&period=${opts.period ?? 'week'}&band=${opts.band ?? ''}&level=${opts.level ?? 30}`);
export interface AlleyBoardRes { week: string; band: string; rows: { rank: number; key: number; name?: string; band: string; score: number; together: number }[] }
export const getAlleyBoard = (opts: { scope?: string; band?: string }) =>
  api<AlleyBoardRes>('GET', `/board/alleys?scope=${opts.scope ?? 'server'}&band=${opts.band ?? '1-29'}`);

export const report = (kind: 'card' | 'board', target: string, reason: string) =>
  api<{ ok: true }>('POST', '/report', { kind, target, reason });

/* ── Hội chợ (§6.4e) ── */
export interface FairRes { fair: { id: string; name: string; metric: string; target: number; milestones: number[]; total: number; from: string; to: string; icon?: string } | null; mine: number }
export const getFair = () => api<FairRes>('GET', '/fair');
export const contributeFair = (level: number, n: number) => api<{ ok: true; accepted: number; total: number; milestones: number[] }>('POST', '/fair/contribute', { level, n });

/* ── Danh thiếp hẻm (§6.4f) ── */
export const putAlleyCard = (id: string, body: object) => api<{ ok: true }>('PUT', `/alleys/${encodeURIComponent(id)}/card`, body);
export const alleyCardConsent = (id: string, show: boolean) => api<{ ok: true }>('POST', `/alleys/${encodeURIComponent(id)}/card/consent`, { show });
