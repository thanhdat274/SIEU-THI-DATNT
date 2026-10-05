/** Signaling voice chat: server chỉ chuyển tiếp offer/answer/candidate giữa thành viên cùng hẻm, không đọc hay lưu âm thanh. */

export const VOICE_SIGNAL_KINDS = ['offer', 'answer', 'candidate'] as const;
export type VoiceSignalKind = typeof VOICE_SIGNAL_KINDS[number];

/** SDP audio một track chỉ vài KB; ICE candidate chỉ vài trăm byte. */
export const MAX_VOICE_SIGNAL_BYTES = 8 * 1024;

export interface VoiceSignal { kind: VoiceSignalKind; payload: Record<string, unknown> }

/** Trả về tín hiệu hợp lệ hoặc null (kind lạ, payload không phải object, hoặc quá lớn). Mọi trường khác của client bị bỏ. */
export function parseVoiceSignal(body: unknown): VoiceSignal | null {
  if (!body || typeof body !== 'object') return null;
  const { kind, payload } = body as { kind?: unknown; payload?: unknown };
  if (typeof kind !== 'string' || !(VOICE_SIGNAL_KINDS as readonly string[]).includes(kind)) return null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  let size: number;
  try { size = Buffer.byteLength(JSON.stringify(payload), 'utf8'); }
  catch { return null; }
  if (size > MAX_VOICE_SIGNAL_BYTES) return null;
  return { kind: kind as VoiceSignalKind, payload: payload as Record<string, unknown> };
}

/** Thông điệp gửi tới người nhận: `from` do server gán theo tài khoản của socket gửi, không tin client. */
export function buildVoiceSignalMessage(from: string, signal: VoiceSignal): string {
  return JSON.stringify({ event: 'voice:signal', data: { from, kind: signal.kind, payload: signal.payload } });
}

export function buildVoicePeerMessage(accountId: string, present: boolean): string {
  return JSON.stringify({ event: 'voice:peer', data: { accountId, present } });
}
