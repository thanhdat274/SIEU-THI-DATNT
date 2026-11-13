/**
 * Góp ý gửi tác giả (màn đăng nhập + trong game). Không cần đăng nhập: gửi ẩn danh kèm mã máy
 * (`installId`, cùng mã dùng cho số liệu ẩn danh). Lịch sử đã gửi giữ riêng máy để người chơi
 * thấy mình đã góp ý gì; gửi lỗi mạng thì giữ bản nháp, không mất chữ đã gõ.
 */
import { installId } from '../core/dayReport';
import { apiUrl } from '../net/serverUrl';

export type FeedbackKind = 'idea' | 'bug' | 'praise' | 'delete' | 'other';
export const FEEDBACK_KINDS: [FeedbackKind, string][] = [
  ['idea', '💡 Góp ý, ý tưởng'], ['bug', '🐞 Báo lỗi'], ['praise', '💚 Lời khen'],
  ['delete', '🗑️ Yêu cầu xóa dữ liệu'], ['other', '✉️ Khác'],
];
export const TEXT_MIN = 5;
export const TEXT_MAX = 1000;
export const CONTACT_MAX = 100;

export interface FeedbackSent { at: number; kind: FeedbackKind; text: string }

/** Kiểm trước khi gửi (khớp server/feedback.ts); trả lý do tiếng Việt hoặc null nếu ổn. */
export function feedbackProblem(kind: FeedbackKind, text: string): string | null {
  if (!FEEDBACK_KINDS.some(([k]) => k === kind)) return 'Hãy chọn loại góp ý.';
  const t = text.trim();
  if (t.length < TEXT_MIN) return `Nội dung cần ít nhất ${TEXT_MIN} ký tự.`;
  if (t.length > TEXT_MAX) return `Nội dung tối đa ${TEXT_MAX} ký tự.`;
  return null;
}

const HIST_KEY = 'th3d_feedback_sent';
const DRAFT_KEY = 'th3d_feedback_draft';
const HIST_MAX = 20;

export function loadSent(): FeedbackSent[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => x && typeof x.text === 'string' && typeof x.at === 'number').slice(0, HIST_MAX) : [];
  } catch { return []; }
}
function pushSent(e: FeedbackSent) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify([e, ...loadSent()].slice(0, HIST_MAX))); } catch { /* private mode */ }
}

export function loadDraft(): { kind: FeedbackKind; text: string; contact: string } {
  try {
    const v = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    if (v && typeof v.text === 'string') return { kind: v.kind ?? 'idea', text: v.text, contact: String(v.contact ?? '') };
  } catch { /* hỏng thì bỏ */ }
  return { kind: 'idea', text: '', contact: '' };
}
export function saveDraft(d: { kind: FeedbackKind; text: string; contact: string }) {
  try {
    if (d.text || d.contact) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY);
  } catch { /* private mode */ }
}

export interface TechInfo { day?: number; level?: number }

/** Gửi lên server. Ném Error có thông điệp tiếng Việt khi lỗi. */
export async function sendFeedback(a: { kind: FeedbackKind; text: string; contact: string; withTech: boolean; tech?: TechInfo }): Promise<void> {
  const problem = feedbackProblem(a.kind, a.text);
  if (problem) throw new Error(problem);
  const tech = a.withTech
    ? { ua: navigator.userAgent.slice(0, 200), screen: `${screen.width}x${screen.height}`, build: String(import.meta.env.MODE ?? '').slice(0, 40), ...a.tech }
    : null;
  let res: Response;
  try {
    res = await fetch(apiUrl('/feedback'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ install: installId(), kind: a.kind, text: a.text.trim(), contact: a.contact.trim().slice(0, CONTACT_MAX), tech }),
    });
  } catch { throw new Error('Không kết nối được server. Bản nháp của bạn vẫn được giữ, thử lại sau nhé.'); }
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error ?? `Server trả lỗi ${res.status}`);
  }
  pushSent({ at: Date.now(), kind: a.kind, text: a.text.trim() });
  saveDraft({ kind: a.kind, text: '', contact: '' });
}
