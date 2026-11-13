/**
 * Góp ý của người chơi — KHÔNG cần đăng nhập (khách cũng góp ý được), định danh bằng `install`
 * (mã máy ngẫu nhiên, như telemetry). Logic thuần tách khỏi index.ts để test được.
 * Nội dung chỉ để tác giả đọc; không trả ngược cho người khác.
 */
export const FEEDBACK_KINDS = ['idea', 'bug', 'praise', 'delete', 'other'] as const;
export type FeedbackKind = typeof FEEDBACK_KINDS[number];
export const FEEDBACK_TEXT_MIN = 5;
export const FEEDBACK_TEXT_MAX = 1000;
export const FEEDBACK_CONTACT_MAX = 100;
export const FEEDBACK_TTL_DAYS = 365;

export interface FeedbackIn {
  install: string; kind: FeedbackKind; text: string; contact: string;
  tech: { ua?: string; screen?: string; day?: number; level?: number; build?: string } | null;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n) : '');

export function validateFeedback(raw: unknown): { ok: true; fb: FeedbackIn } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'not-object' };
  const r = raw as Record<string, unknown>;
  const install = typeof r.install === 'string' ? r.install : '';
  if (!/^[a-z0-9_-]{8,96}$/.test(install)) return { ok: false, reason: 'install' };
  if (!FEEDBACK_KINDS.includes(r.kind as FeedbackKind)) return { ok: false, reason: 'kind' };
  const text = clip(r.text, FEEDBACK_TEXT_MAX);
  if (text.length < FEEDBACK_TEXT_MIN) return { ok: false, reason: 'text' };
  let tech: FeedbackIn['tech'] = null;
  if (r.tech && typeof r.tech === 'object' && !Array.isArray(r.tech)) {
    const t = r.tech as Record<string, unknown>;
    const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : undefined);
    tech = {
      ua: clip(t.ua, 200) || undefined, screen: clip(t.screen, 24) || undefined, build: clip(t.build, 40) || undefined,
      day: num(t.day, 200_000), level: num(t.level, 200),
    };
  }
  return { ok: true, fb: { install, kind: r.kind as FeedbackKind, text, contact: clip(r.contact, FEEDBACK_CONTACT_MAX), tech } };
}
