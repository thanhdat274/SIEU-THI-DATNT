import assert from 'node:assert/strict';
import { RECLAMATION_WAVES } from '@game/data';
import { computeWaveDecor, computeWaveOverlay, worldDecorKey, type WorldDecorInput } from './wave-decor';

const base: WorldDecorInput = { openedWaves: ['w0'], wavesUnderConstruction: {}, ownedParcelIds: [], day: 5, placed: [] };
const later = RECLAMATION_WAVES.slice(1);

// Chưa mở đợt nào: mọi đợt sau W0 đều là vùng khóa, không có lô/khu.
{
  const d = computeWaveDecor(base);
  assert.equal(d.locked.length, later.length);
  assert.equal(d.construction.length + d.districts.length + d.parcels.length, 0);
  assert.match(d.locked[0].sign.text, /KHÓA · CẤP \d+/);
}

// Đang thi công: biển còn N ngày (không âm), không còn là vùng khóa.
{
  const id = later[0].id;
  const d = computeWaveDecor({ ...base, wavesUnderConstruction: { [id]: 8 } });
  assert.equal(d.construction.length, 1);
  assert.equal(d.construction[0].daysLeft, 3);
  assert.equal(d.construction[0].sign.text, 'ĐANG THI CÔNG · còn 3 ngày');
  assert.equal(d.locked.length, later.length - 1);
  const overdue = computeWaveDecor({ ...base, wavesUnderConstruction: { [id]: 2 } });
  assert.equal(overdue.construction[0].daysLeft, 0);
}

// Đợt đã mở: có biển tên khu và lô; lô đã mua đổi thành "ĐẤT TRỐNG"; lô có tòa thì bỏ.
{
  const wave = later.find(w => w.parcels.length >= 2)!;
  assert.ok(wave, 'có đợt với ≥2 lô');
  const opened = computeWaveDecor({ ...base, openedWaves: ['w0', wave.id] });
  assert.equal(opened.districts.filter(x => x.waveId === wave.id).length, 1);
  assert.equal(opened.parcels.length, wave.parcels.length);
  assert.ok(opened.parcels.every(p => p.sign.text.startsWith('LÔ BÁN')));
  const [first, second] = wave.parcels;
  const owned = computeWaveDecor({ ...base, openedWaves: ['w0', wave.id], ownedParcelIds: [first.id] });
  assert.equal(owned.parcels.find(p => p.id === first.id)!.sign.text, 'ĐẤT TRỐNG');
  const built = computeWaveDecor({ ...base, openedWaves: ['w0', wave.id], placed: [{ left: second.rect.x0, right: second.rect.x1 + 1, bottom: second.rect.y1 }] });
  assert.equal(built.parcels.some(p => p.id === second.id), false);
}

// Khóa dựng lại: ngày chỉ có nghĩa khi có đợt thi công.
{
  assert.equal(worldDecorKey({ ...base, day: 5 }), worldDecorKey({ ...base, day: 9 }));
  const w = { ...base, wavesUnderConstruction: { [later[0].id]: 12 } };
  assert.notEqual(worldDecorKey({ ...w, day: 5 }), worldDecorKey({ ...w, day: 6 }));
}

// Overlay QA: một viền mỗi đợt + một ô mỗi lô, lô góc màu cam.
{
  const items = computeWaveOverlay();
  assert.equal(items.filter(i => i.kind === 'wave').length, RECLAMATION_WAVES.length);
  assert.equal(items.filter(i => i.kind === 'parcel').length, RECLAMATION_WAVES.reduce((n, w) => n + w.parcels.length, 0));
  assert.ok(items.filter(i => i.kind === 'parcel').every(i => i.color === '#ff8800' || i.color === '#3fbf5f'));
}

console.log('PASS wave-decor: khóa, thi công, lô bán/đất trống, khóa dựng lại, overlay QA');
