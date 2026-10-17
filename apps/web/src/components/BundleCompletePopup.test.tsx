import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BundleCardView } from '@game/core';
import { BundleCompletePopup } from './BundleCompletePopup';

console.log('--- Testing BundleCompletePopup (hiện cho cả hai máy, render phía server) ---');

const view = {
  id: 'bundle_park', buildingTypeId: 'park', revealedByCityLevel: 4, status: 'complete', slots: [], slotsDone: 4, slotsTotal: 4,
  hasDonatable: false, buildCost: 2_500_000, donatedValue: 2_048_272, remainingCost: 451_728, expectedGoodsValue: 0,
  donors: [{ playerId: 'guest_b', percent: 85 }, { playerId: 'guest_a', percent: 15 }],
} as unknown as BundleCardView;

// Giống `donorDisplayName` của core (không import giá trị từ core vì tsx không nạp được gói thật): 'Bạn' cho chính mình, còn lại tên thành viên.
const donorDisplayName = (pid: string, m: Record<string, string>, selfId: string) => (pid === selfId ? 'Bạn' : m[pid] ?? 'Thành viên cũ');
const members = { guest_a: 'Khách A (dev)', guest_b: 'Khách B (dev)' };
// Cùng một view, hai máy chỉ khác "Bạn" là ai: cả hai đều thấy tiêu đề, danh sách người góp và nút xây.
const popupFor = (selfId: string, parcels: readonly string[]) => renderToStaticMarkup(
  <BundleCompletePopup buildingName="Công viên" view={view} donorName={(pid) => donorDisplayName(pid, members, selfId)} buildableParcelIds={parcels} onBuildOnParcel={() => {}} onClose={() => {}} />,
);

for (const self of ['guest_a', 'guest_b']) {
  const out = popupFor(self, ['lot-west']);
  assert.ok(out.includes('role="dialog"') && out.includes('aria-label="Sổ góp hoàn thành"'), `${self}: có dialog`);
  assert.ok(out.includes('Trang Công viên đã hoàn thành!'), `${self}: tiêu đề`);
  assert.ok(out.includes('85%') && out.includes('15%'), `${self}: tỷ lệ người góp`);
  assert.ok(out.includes('Xây ngay (còn 451.728'), `${self}: nút Xây ngay kèm giá còn lại`);
  assert.ok(out.includes('Để sau'), `${self}: nút Để sau`);
}
assert.ok(popupFor('guest_a', ['lot-west']).includes('Bạn') && popupFor('guest_a', ['lot-west']).includes('Khách B (dev)'), 'A thấy "Bạn" và tên B');
assert.ok(popupFor('guest_b', ['lot-west']).includes('Khách A (dev)'), 'B thấy tên A');
assert.ok(!popupFor('guest_a', ['lot-west']).includes('guest_'), 'không lộ uid');

// Không có lô trống: nút xây bị khóa, chữ báo rõ
{
  const out = popupFor('guest_b', []);
  assert.ok(out.includes('Chưa có lô trống'), 'báo chưa có lô trống');
  assert.ok(out.includes('disabled'), 'nút xây bị khóa');
}

console.log('BundleCompletePopup tests passed');
