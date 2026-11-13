/**
 * Mã chuyển máy: biến bản lưu thành MỘT chuỗi chữ để chép sang máy khác rồi dán vào.
 * Dạng: `TH3D1.<kiểm-tra 8 hex>.<gzip → base64url>`. Kiểm tra bắt mã bị cắt/dán thiếu trước khi đụng vào ván đang chơi.
 * Thuần (không đụng store/IndexedDB): nạp vào ván là việc của `importSaveCode` trong save.ts.
 */
import type { SaveData } from './save';

const PREFIX = 'TH3D1';

function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

function toB64Url(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(t: string): Uint8Array {
  const s = atob(t.replace(/-/g, '+').replace(/_/g, '/'));
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

export async function encodeSaveCode(data: SaveData): Promise<string> {
  const body = toB64Url(await pipe(new TextEncoder().encode(JSON.stringify(data)), new CompressionStream('gzip')));
  return `${PREFIX}.${fnv(body)}.${body}`;
}

export type DecodeResult = { ok: true; data: SaveData } | { ok: false; error: string };

/** Đọc mã; trả lỗi tiếng Việt thay vì ném. Chỉ kiểm cấu trúc cốt lõi — phần còn lại `applySnapshot` tự bù. */
export async function decodeSaveCode(raw: string): Promise<DecodeResult> {
  const parts = raw.trim().replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, error: 'Đây không phải mã chuyển máy của game.' };
  if (fnv(parts[2]) !== parts[1]) return { ok: false, error: 'Mã bị thiếu hoặc sai chữ — hãy chép lại đủ toàn bộ.' };
  try {
    const json = new TextDecoder().decode(await pipe(fromB64Url(parts[2]), new DecompressionStream('gzip')));
    const d = JSON.parse(json) as SaveData;
    const okCore = d && typeof d === 'object' && Number.isInteger(d.day) && d.day >= 1
      && Number.isFinite(d.money) && Number.isInteger(d.level) && d.level >= 1 && Array.isArray(d.furniture);
    return okCore ? { ok: true, data: d } : { ok: false, error: 'Mã đọc được nhưng không phải bản lưu hợp lệ.' };
  } catch {
    return { ok: false, error: 'Không giải mã được — mã có thể bị hỏng.' };
  }
}
