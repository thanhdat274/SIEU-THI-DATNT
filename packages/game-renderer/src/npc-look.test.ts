import assert from 'node:assert/strict';
import { deterministicResidentNpc } from '@game/core';
import { resolveNpcLook } from './sprite-atlas-parse';

// QA D2: cư dân khu phố gửi `spriteVariant` = MÃ LOOK; renderer phải ra đúng look theo vai trò, không qua chỉ số walker
// (lỗi cũ: `walkerLook(6)` = 7 → học sinh hiện hình cụ già, cụ già hiện công sở, công sở hiện trẻ em, trẻ em hiện look 0).
const WALKER_LOOKS_9 = [0, 2, 3, 4, 5, 6, 7, 8, 9];
const oldWalker = (i: number) => WALKER_LOOKS_9[Math.abs(Math.floor(i)) % WALKER_LOOKS_9.length];
const fullAtlas = (key: string) => /^npc_[0-9]_down_idle_0$/.test(key);
const noAtlas = () => false;

const ROLE_LOOK: Record<string, number> = { student: 6, elder: 7, office_worker: 8, child: 9 };
const found = new Set<string>();
for (let i = 0; i < 400; i++) {
  const r = deterministicResidentNpc(2018192638, 1, 'hem_dan_cu', i);
  const want = ROLE_LOOK[r.defId];
  if (want === undefined) continue;
  found.add(r.defId);
  assert.equal(resolveNpcLook(r.spriteVariant, fullAtlas, oldWalker), want, `${r.defId} phải ra look ${want}`);
}
assert.deepEqual([...found].sort(), Object.keys(ROLE_LOOK).sort(), 'đủ 4 vai trò');

// Look 0,2..9 có trong atlas → dùng thẳng; look cũ của đường không theo dân số (0,2..8) ra đúng như walkerLook(i) trước đây.
for (const look of [0, 2, 3, 4, 5, 6, 7, 8, 9]) assert.equal(resolveNpcLook(look, fullAtlas, oldWalker), look);
[0, 2, 3, 4, 5, 6, 7, 8].forEach((look, i) => assert.equal(resolveNpcLook(look, fullAtlas, oldWalker), oldWalker(i), `đường cũ chỉ số ${i} giữ hình`));
// Atlas chưa có khung → rơi về fallback (hình vẽ code).
assert.equal(resolveNpcLook(7, noAtlas, (v) => v % 3), 1);

console.log('PASS npc-look: cư dân học sinh 6, cụ già 7, công sở 8, trẻ em 9 ra đúng look');
