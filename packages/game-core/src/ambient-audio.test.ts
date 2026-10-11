import assert from 'node:assert/strict';
import { ambientMix, DEFAULT_AUDIO_SETTINGS, FOOTSTEP_RULES, FootstepTracker, footstepCue, masterGain, sanitizeAudioSettings } from './ambient-audio';

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

  // Gió: kẹp 0..1, bỏ trống = lặng
  assert.equal(ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true }).wind, 0);
  assert.ok(ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true, windIntensity: 1 }).wind > ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true, windIntensity: 0.3 }).wind);
  assert.equal(ambientMix({ rainIntensity: 0, hour: 12, isStoreOpen: true, windIntensity: 9 }).wind, 0.7);

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

/** Bước chân bảo vệ: hướng trái/phải, suy giảm theo khoảng cách, đếm bước theo quãng đường. */
export function runFootstepTests(): void {
  const me = { x: 100, y: 100 };
  const near = footstepCue(me, { x: 100, y: 100 });
  assert.ok(near && near.gain === 1 && near.pan === 0, 'Đứng cùng chỗ: nghe to, giữa');
  assert.ok((footstepCue(me, { x: 160, y: 100 })?.pan ?? 0) > 0, 'Nguồn bên phải thì lệch phải');
  assert.ok((footstepCue(me, { x: 40, y: 100 })?.pan ?? 0) < 0, 'Nguồn bên trái thì lệch trái');
  assert.equal(footstepCue(me, { x: 100 + FOOTSTEP_RULES.hearRange, y: 100 }), null, 'Ngoài tầm nghe thì không phát');
  assert.equal(footstepCue(me, { x: Number.NaN, y: 100 }), null, 'Toạ độ lỗi thì bỏ qua');
  const far = footstepCue(me, { x: 200, y: 100 });
  assert.ok(near && far && far.gain < near.gain && far.gain > 0, 'Xa hơn thì nhỏ hơn nhưng vẫn nghe');
  assert.equal(footstepCue(me, { x: 1000, y: 100 }, { hearRange: 2000, panRange: 96 })?.pan, 1, 'Lệch bị kẹp về 1');

  const t = new FootstepTracker();
  const step = FOOTSTEP_RULES.stepDistance;
  assert.equal(t.advance('g', { x: 0, y: 0 }), 0, 'Lần đầu chỉ ghi vị trí');
  assert.equal(t.advance('g', { x: step, y: 0 }), 1, 'Đi đúng một bước');
  assert.equal(t.advance('g', { x: step + step / 2, y: 0 }), 0, 'Nửa bước chưa phát');
  assert.equal(t.advance('g', { x: step * 2, y: 0 }), 1, 'Phần dư được cộng sang lần sau');
  assert.equal(t.advance('g', { x: step * 2 + step * 4, y: 0 }), FOOTSTEP_RULES.maxStepsPerSample, 'Giới hạn số bước mỗi lần lấy mẫu');
  assert.equal(t.advance('g', { x: 9999, y: 0 }), 0, 'Nhảy quá xa không tính là đi bộ');
  assert.equal(t.advance('g', { x: 9999 + step, y: 0 }), 1, 'Sau khi nhảy vẫn đếm tiếp bình thường');
  t.retain([]);
  assert.equal(t.advance('g', { x: 0, y: 0 }), 0, 'Nguồn đã bỏ thì coi như mới xuất hiện');
}
