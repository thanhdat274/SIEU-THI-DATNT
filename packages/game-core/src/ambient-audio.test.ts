import assert from 'node:assert/strict';
import { ambientMix, DEFAULT_AUDIO_SETTINGS, masterGain, sanitizeAudioSettings } from './ambient-audio';

export function runAmbientAudioTests(): void {
  // Mix theo giờ: ban ngày có tiếng phố (mở cửa to hơn), ban đêm có côn trùng
  const open = ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true });
  const closed = ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: false });
  const night = ambientMix({ rainIntensity: 0, hour: 23, isStoreOpen: false });
  assert.ok(open.street > closed.street, 'Mở cửa ồn hơn đóng cửa');
  assert.equal(open.night, 0);
  assert.ok(night.night > 0 && night.street < closed.street);
  assert.equal(ambientMix({ rainIntensity: 0, hour: 6, isStoreOpen: false }).night, 0, '6 giờ là ban ngày');
  assert.ok(ambientMix({ rainIntensity: 0, hour: 19, isStoreOpen: false }).night > 0, '19 giờ là ban đêm');

  // Mưa: kẹp 0..1, NaN/Infinity về 0
  assert.equal(ambientMix({ rainIntensity: 5, hour: 12, isStoreOpen: true }).rain, 0.8);
  assert.equal(ambientMix({ rainIntensity: -1, hour: 12, isStoreOpen: true }).rain, 0);
  assert.equal(ambientMix({ rainIntensity: Number.NaN, hour: 12, isStoreOpen: true }).rain, 0);
  assert.equal(ambientMix({ rainIntensity: Number.POSITIVE_INFINITY, hour: 12, isStoreOpen: true }).rain, 0);

  // Âm lượng chung
  const ok = { userGestured: true, pageVisible: true };
  assert.equal(masterGain(DEFAULT_AUDIO_SETTINGS, ok), 1);
  assert.equal(masterGain(DEFAULT_AUDIO_SETTINGS, { ...ok, userGestured: false }), 0, 'Chưa có user gesture thì im');
  assert.equal(masterGain({ ...DEFAULT_AUDIO_SETTINGS, muted: true }, ok), 0);
  assert.equal(masterGain({ muted: false, hiddenBehavior: 'pause' }, { ...ok, pageVisible: false }), 0);
  assert.equal(masterGain({ muted: false, hiddenBehavior: 'duck' }, { ...ok, pageVisible: false }), 0.15);

  // Chuẩn hóa cài đặt từ dữ liệu bẩn
  assert.deepEqual(sanitizeAudioSettings(null), DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(sanitizeAudioSettings('x'), DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(sanitizeAudioSettings({ muted: 'yes', hiddenBehavior: 'weird' }), DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(sanitizeAudioSettings({ muted: true, hiddenBehavior: 'duck' }), { muted: true, hiddenBehavior: 'duck' });
}
