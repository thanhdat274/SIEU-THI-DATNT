import assert from 'node:assert/strict';
import { MAX_VOICE_SIGNAL_BYTES, buildVoicePeerMessage, buildVoiceSignalMessage, parseVoiceSignal } from './voice-signal.js';

// Hợp lệ: ba loại tín hiệu với payload object.
for (const kind of ['offer', 'answer', 'candidate']) {
  const parsed = parseVoiceSignal({ kind, payload: { sdp: 'v=0' } });
  assert.deepEqual(parsed, { kind, payload: { sdp: 'v=0' } });
}

// Từ chối: kind lạ, thiếu/sai kiểu payload, không phải object.
assert.equal(parseVoiceSignal({ kind: 'hangup', payload: {} }), null);
assert.equal(parseVoiceSignal({ kind: 'offer' }), null);
assert.equal(parseVoiceSignal({ kind: 'offer', payload: 'sdp' }), null);
assert.equal(parseVoiceSignal({ kind: 'offer', payload: [1] }), null);
assert.equal(parseVoiceSignal({ kind: 'offer', payload: null }), null);
assert.equal(parseVoiceSignal({ kind: 5, payload: {} }), null);
assert.equal(parseVoiceSignal(null), null);
assert.equal(parseVoiceSignal('offer'), null);

// Payload quá lớn bị bỏ; sát ngưỡng vẫn nhận.
assert.equal(parseVoiceSignal({ kind: 'offer', payload: { sdp: 'x'.repeat(MAX_VOICE_SIGNAL_BYTES) } }), null);
assert.notEqual(parseVoiceSignal({ kind: 'offer', payload: { sdp: 'x'.repeat(MAX_VOICE_SIGNAL_BYTES - 20) } }), null);
// Đếm theo byte, không theo ký tự (ký tự tiếng Việt nhiều byte).
assert.equal(parseVoiceSignal({ kind: 'offer', payload: { sdp: 'ế'.repeat(MAX_VOICE_SIGNAL_BYTES / 2) } }), null);

// Trường `from` giả của client bị bỏ; người nhận chỉ thấy `from` server gán.
const forged = parseVoiceSignal({ kind: 'offer', payload: { sdp: 'v=0' }, from: 'attacker' } as unknown);
assert.ok(forged);
const message = JSON.parse(buildVoiceSignalMessage('real-sender', forged));
assert.deepEqual(message, { event: 'voice:signal', data: { from: 'real-sender', kind: 'offer', payload: { sdp: 'v=0' } } });

assert.deepEqual(JSON.parse(buildVoicePeerMessage('a', false)), { event: 'voice:peer', data: { accountId: 'a', present: false } });

console.log('voice-signal tests passed');
