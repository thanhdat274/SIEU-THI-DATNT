/**
 * Âm thanh sinh trực tiếp bằng WebAudio, không cần file nhạc.
 * Trình duyệt chỉ cho phát tiếng sau tương tác đầu tiên, nên `initAudio` được gọi lại ở mỗi cú click.
 * TiengAmbient mưa chạy nền theo cường độ mưa; mọi hiệu ứng đều im lặng khi đang tắt tiếng.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let rainGain: GainNode | null = null;

let muted = false;
try { muted = localStorage.getItem('th3d_muted') === '1'; } catch { /* private mode */ }

const lastPlay: Record<string, number> = {};
/** Chống dội: hiệu ứng phát dồn trong khoảng này thì bỏ bớt. */
const MIN_GAP: Partial<Record<Sfx, number>> = { door: 0.2, sale: 0.5, ring: 2, thunder: 6 };

export type Sfx = 'door' | 'sale' | 'ring' | 'ding' | 'levelup' | 'thunder' | 'achieve' | 'gift' | 'quest';

export const isMuted = () => muted;

export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('th3d_muted', m ? '1' : '0'); } catch { /* private mode */ }
  if (master) master.gain.value = m ? 0 : 1;
  if (rainGain) rainGain.gain.value = 0;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    startMusicIfEnabled();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  startMusicIfEnabled();
}

/** Một nốt ngắn tắt dần theo hàm mũ. */
function blip(freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ctx.currentTime + at;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** Tiếng ồn trắng lọc thấp — mưa rơi hoặc sấm. */
function noiseBuffer(seconds: number) {
  if (!ctx) return null;
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let v = 0;
  for (let i = 0; i < data.length; i++) {
    v = v * 0.94 + (Math.random() * 2 - 1) * 0.06;
    data[i] = v * 8;
  }
  return buf;
}

export function playSfx(name: Sfx) {
  if (!ctx || !master || muted) return;
  const now = ctx.currentTime;
  if (now - (lastPlay[name] ?? -9) < (MIN_GAP[name] ?? 0)) return;
  lastPlay[name] = now;
  switch (name) {
    case 'door': // Chuông cửa "kinh cong"
      blip(1318, 0, 0.4, 'sine', 0.05);
      blip(1760, 0.07, 0.5, 'sine', 0.04);
      break;
    case 'sale': // "Ka-ching" thu tiền
      blip(1568, 0, 0.09, 'square', 0.03);
      blip(2093, 0.09, 0.22, 'square', 0.035);
      blip(2637, 0.12, 0.25, 'sine', 0.03);
      break;
    case 'ring': // Chuông điện thoại cũ
      for (const burst of [0, 0.5]) {
        for (let i = 0; i < 6; i++) {
          blip(i % 2 ? 1100 : 900, burst + i * 0.05, 0.045, 'square', 0.03);
        }
      }
      break;
    case 'ding': // Nấu xong, đồ ra lò
      blip(1568, 0, 0.5, 'sine', 0.05);
      blip(2093, 0.01, 0.4, 'sine', 0.02);
      break;
    case 'levelup':
      blip(523, 0, 0.15, 'triangle', 0.05);
      blip(659, 0.12, 0.15, 'triangle', 0.05);
      blip(784, 0.24, 0.15, 'triangle', 0.05);
      blip(1046, 0.36, 0.4, 'triangle', 0.06);
      break;
    case 'achieve': // Thành tựu / danh hiệu: hợp âm sáng lên, lấp lánh
      blip(784, 0, 0.16, 'triangle', 0.05);
      blip(988, 0.09, 0.16, 'triangle', 0.05);
      blip(1175, 0.18, 0.18, 'triangle', 0.05);
      blip(1568, 0.26, 0.34, 'triangle', 0.05);
      break;
    case 'gift': // Nhận quà / quay vòng: hai nốt leng keng vui tai
      blip(1319, 0, 0.1, 'sine', 0.05);
      blip(1760, 0.07, 0.2, 'sine', 0.05);
      blip(2637, 0.12, 0.28, 'sine', 0.045);
      break;
    case 'quest': // Xong nhiệm vụ: chuỗi nốt leo lên gọn gàng
      blip(587, 0, 0.12, 'square', 0.035);
      blip(740, 0.08, 0.12, 'square', 0.035);
      blip(880, 0.16, 0.26, 'sine', 0.05);
      break;
    case 'thunder': {
      const buf = noiseBuffer(1.6);
      if (!buf) return;
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buf;
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      src.connect(filter).connect(g).connect(master);
      src.start(now);
      break;
    }
  }
}

let rainOn = false;

/** Mưa nền: cường độ 0–1 từ vòng render; 0 thì tắt dần rồi dừng hẳn cho nhẹ máy. */
export function setRain(intensity: number) {
  if (!ctx || !master) return;
  if (!rainOn) {
    if (intensity <= 0.02) return;
    const buf = noiseBuffer(2);
    if (!buf) return;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const out = ctx.createGain();
    rainGain = out;
    src.buffer = buf;
    src.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    out.gain.value = 0;
    src.connect(filter).connect(out).connect(master);
    src.start();
    rainOn = true;
  }
  if (rainGain) rainGain.gain.value = muted ? 0 : intensity * 0.06;
  if (intensity <= 0.02 && rainGain) {
    // Cơn mưa đã tạnh: bỏ node để không tích mồi âm thanh
    rainGain.gain.value = 0;
    rainOn = false;
    rainGain = null;
  }
}

// ───────────────────────── Nhạc nền nhẹ ─────────────────────────
// Giai điệu ngũ cung (đô re mi sol la) tự sinh ngẫu nhiên, chậm và khẽ như tiếng radio đầu hẻm.
// Không dùng file nhạc; mỗi nốt là một tiếng đàn mộc tắt dần, hợp âm đệm đổi chậm.

let musicOn = false;
try { musicOn = localStorage.getItem('th3d_music') !== '0'; } catch { /* private mode */ }
let musicTimer: ReturnType<typeof setTimeout> | undefined;

const PENTATONIC = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]; // C4 D4 E4 G4 A4 C5 D5 E5
const CHORDS = [130.8, 146.8, 174.6, 196.0]; // C3 D3 F3 G3 — nốt đệm trầm đổi mỗi đoạn
let chordIdx = 0;
let noteCount = 0;

/** Tiếng đàn mộc: sóng sin cộng nhẹ bồi âm, tắt dần. */
function pluck(freq: number, vol: number, dur = 1.4) {
  if (!ctx || !master) return;
  for (const [f, v, type] of [[freq, vol, 'sine'], [freq * 2, vol * 0.25, 'triangle']] as const) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

function musicTick() {
  if (!musicOn) return;
  noteCount++;
  // Đổi hợp âm đệm sau mỗi 8 nốt
  if (noteCount % 8 === 0) {
    chordIdx = (chordIdx + 1) % CHORDS.length;
    pluck(CHORDS[chordIdx], 0.018, 3.2);
  }
  // Giai điệu: hay ở quanh tá, thỉnh thoảng nhảy bậc
  const step = Math.random() < 0.6 ? Math.floor(Math.random() * 3) - 1 : Math.floor(Math.random() * PENTATONIC.length);
  const idx = Math.max(0, Math.min(PENTATONIC.length - 1, 2 + step + (noteCount % 8 < 4 ? 0 : 2)));
  pluck(PENTATONIC[idx], 0.028);
  musicTimer = setTimeout(musicTick, 900 + Math.random() * 1200);
}

export const isMusic = () => musicOn;

export function setMusic(on: boolean) {
  musicOn = on;
  try { localStorage.setItem('th3d_music', on ? '1' : '0'); } catch { /* private mode */ }
  if (musicTimer) clearTimeout(musicTimer);
  musicTimer = undefined;
  if (on) {
    initAudio();
    chordIdx = 0;
    noteCount = 0;
    musicTick();
  }
}

/** Khởi động nhạc nếu đang bật — gọi sau khi AudioContext sẵn sàng (có tương tác đầu tiên). */
export function startMusicIfEnabled() {
  if (musicOn && !musicTimer) {
    musicTick();
  }
}
